/**
 * Seeds pre-confirmed load-test users into the target Supabase project and
 * writes their session cookies to load/.sessions.json (gitignored) for the
 * k6 scenario in load/core-flow.js.
 *
 * For each user: auth.admin.createUser({ email_confirm: true }), then the
 * player onboarding rows (mirroring completeOnboarding in app/auth/actions.ts,
 * with an adult date of birth so no guardian gate applies), then a password
 * sign-in whose session is encoded exactly like the @supabase/ssr auth cookie.
 *
 * Usage: bun load/seed-users.ts [--count 100]
 *
 * Required env — point at a STAGING project, never production:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *   DATABASE_URL
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createChunks, stringToBase64URL } from "@supabase/ssr";
import { createClient, type Session } from "@supabase/supabase-js";
import { PlayerRole, PlayerStatus, Visibility } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const DEFAULT_COUNT = 100;
const BATCH_SIZE = 10;
/** Adult date of birth, so seeded players are ACTIVE without a guardian. */
const ADULT_DOB = new Date("1995-06-15T00:00:00.000Z");
const SESSIONS_FILE = fileURLToPath(new URL(".sessions.json", import.meta.url));

type SeededUser = {
  cookies: { name: string; value: string }[];
  email: string;
  expiresAt: number | null;
  userId: string;
};

function loadConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !secretKey || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY), and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are required.",
    );
  }

  return {
    // Same storage key @supabase/ssr derives: sb-<project-ref>-auth-token.
    cookieName: `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`,
    emailDomain: process.env.LOAD_EMAIL_DOMAIN ?? "example.com",
    // One password per run; existing users are reset to it on re-runs.
    password: process.env.LOAD_PASSWORD ?? `load-${crypto.randomUUID()}`,
    publishableKey,
    secretKey,
    supabaseUrl,
  };
}

const config = loadConfig();

const admin = createClient(config.supabaseUrl, config.secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCount() {
  const flagIndex = process.argv.indexOf("--count");
  const raw = flagIndex === -1 ? process.env.LOAD_USER_COUNT : process.argv[flagIndex + 1];
  if (!raw) return DEFAULT_COUNT;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    throw new Error("--count must be an integer between 1 and 1000.");
  }

  return value;
}

function emailFor(index: number) {
  return `nextxi-load-${String(index).padStart(4, "0")}@${config.emailDomain}`;
}

function usernameFor(index: number) {
  return `nextxi_load_${String(index).padStart(4, "0")}`;
}

/** Lazily-built email → id map for re-runs, where createUser hits email_exists. */
let existingByEmail: Map<string, string> | null = null;

async function findExistingUserId(email: string) {
  if (!existingByEmail) {
    const map = new Map<string, string>();
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      data.users.forEach((user) => {
        if (user.email) map.set(user.email.toLowerCase(), user.id);
      });
      if (data.users.length < 1000) break;
    }
    existingByEmail = map;
  }

  return existingByEmail.get(email) ?? null;
}

async function ensureAuthUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: config.password,
  });

  if (!error) return data.user.id;
  if (error.code !== "email_exists" && error.code !== "user_already_exists") throw error;

  const id = await findExistingUserId(email);
  if (!id) throw new Error(`${email} already exists but was not found via listUsers.`);

  // Re-runs may generate a new password, so reset it to this run's value.
  const { error: updateError } = await admin.auth.admin.updateUserById(id, {
    password: config.password,
  });
  if (updateError) throw updateError;

  return id;
}

async function ensurePlayerRows(userId: string, index: number) {
  await prisma.$transaction([
    prisma.profile.upsert({
      where: { id: userId },
      update: { username: usernameFor(index) },
      create: { id: userId, username: usernameFor(index) },
    }),
    prisma.player.upsert({
      where: { id: userId },
      update: { status: PlayerStatus.ACTIVE },
      create: {
        club: "Load Test CC",
        country: "England",
        dateOfBirth: ADULT_DOB,
        guardianCode: null,
        heightCm: 175,
        id: userId,
        name: `Load Tester ${index}`,
        roles: [PlayerRole.BATTER],
        status: PlayerStatus.ACTIVE,
        visibility: Visibility.PRIVATE,
        weightKg: 70,
      },
    }),
  ]);
}

/** Encodes the session the way @supabase/ssr stores it: base64url, chunked. */
function sessionCookies(session: Session) {
  const value = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  return createChunks(config.cookieName, value);
}

async function seedUser(index: number): Promise<SeededUser> {
  const email = emailFor(index);
  const userId = await ensureAuthUser(email);
  await ensurePlayerRows(userId, index);

  // Fresh client per sign-in so parallel password grants share no auth state.
  const authClient = createClient(config.supabaseUrl, config.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password: config.password,
  });

  if (error || !data.session) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? "no session returned"}`);
  }

  return {
    cookies: sessionCookies(data.session),
    email,
    expiresAt: data.session.expires_at ?? null,
    userId,
  };
}

async function main() {
  const count = parseCount();
  console.log(`Seeding ${count} load-test users against ${config.supabaseUrl} ...`);

  const users: SeededUser[] = [];
  for (let start = 1; start <= count; start += BATCH_SIZE) {
    const batch: Promise<SeededUser>[] = [];
    for (let index = start; index <= Math.min(start + BATCH_SIZE - 1, count); index += 1) {
      batch.push(seedUser(index));
    }
    users.push(...(await Promise.all(batch)));
    console.log(`  ${users.length}/${count}`);
  }

  await writeFile(
    SESSIONS_FILE,
    `${JSON.stringify(
      {
        cookieName: config.cookieName,
        createdAt: new Date().toISOString(),
        supabaseUrl: config.supabaseUrl,
        users,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${users.length} sessions to ${SESSIONS_FILE}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
