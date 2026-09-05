/**
 * Creates one throwaway player account and connects it (already ACCEPTED,
 * no request/response round trip) to a real account, so the mobile
 * Messages screens have someone to talk to. Idempotent — safe to re-run.
 *
 * The test account's email follows the same `nextxi-demo-*@example.com`
 * convention `scripts/demo-world.ts` uses, so `isDemoEmail` recognizes it
 * and `bun run video:teardown` (DEMO_WORLD=1) will clean it up along with
 * the rest of the demo world if you ever run that.
 *
 * Usage:
 *   bun scripts/create-mobile-test-friend.ts [target-email]
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from "@supabase/supabase-js";
import { ConnectionStatus, PlayerStatus } from "@/app/generated/prisma/enums";
import { orderedPair } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import { demoEmail } from "@/scripts/demo-world";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.",
  );
}

const targetEmail = (process.argv[2] ?? "aayaansahu@gmail.com").toLowerCase();
const testEmail = demoEmail("mobile-test-friend");
const testPassword = process.env.DEMO_PASSWORD ?? "nextxi-mobile-test";
const testUsername = "test_friend";
const testName = "Test Friend";

const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserIdByEmail(email: string): Promise<string | null> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 1000) return null;
  }
}

async function ensureTestAuthUser(): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (!error) {
    console.log(`Created auth user ${testEmail}`);
    return data.user.id;
  }
  if (error.code !== "email_exists" && error.code !== "user_already_exists") throw error;

  const existingId = await findUserIdByEmail(testEmail);
  if (!existingId) throw new Error(`${testEmail} already exists but was not found via listUsers.`);
  // Re-runs generate a fresh random password elsewhere in this repo's demo
  // scripts; here the password is fixed, so just reset it to the same value
  // in case a prior run used a different DEMO_PASSWORD.
  await admin.auth.admin.updateUserById(existingId, { password: testPassword });
  console.log(`Reused existing auth user ${testEmail}`);
  return existingId;
}

const targetUserId = await findUserIdByEmail(targetEmail);
if (!targetUserId) {
  throw new Error(`No account found for ${targetEmail} — they need to have signed up already.`);
}

const targetPlayer = await prisma.player.findUnique({
  where: { id: targetUserId },
  select: { status: true },
});
if (!targetPlayer) {
  throw new Error(`${targetEmail} doesn't have a player profile — nothing to connect messaging to.`);
}
if (targetPlayer.status !== PlayerStatus.ACTIVE) {
  throw new Error(`${targetEmail}'s player account is ${targetPlayer.status}, not ACTIVE.`);
}

const testUserId = await ensureTestAuthUser();

await prisma.profile.upsert({
  where: { id: testUserId },
  create: { id: testUserId, username: testUsername },
  update: {},
});

await prisma.player.upsert({
  where: { id: testUserId },
  create: {
    id: testUserId,
    name: testName,
    dateOfBirth: new Date("2005-01-01"),
    club: "Test CC",
    country: "United Kingdom",
    heightCm: 175,
    status: PlayerStatus.ACTIVE,
    // PUBLIC so the Add connections search can find them — a PRIVATE player
    // never appears in `searchPlayersByQuery`, so once you remove the
    // connection there is no way to send a new request.
    visibility: "PUBLIC",
  },
  update: { status: PlayerStatus.ACTIVE, visibility: "PUBLIC" },
});

const [userAId, userBId] = orderedPair(testUserId, targetUserId);
await prisma.connection.upsert({
  where: { userAId_userBId: { userAId, userBId } },
  create: { userAId, userBId, requestedById: testUserId, status: ConnectionStatus.ACCEPTED },
  update: { status: ConnectionStatus.ACCEPTED },
});

console.log(`\n${testName} (@${testUsername}) is connected to ${targetEmail}.`);
console.log(`Sign in on mobile as:\n  email: ${testEmail}\n  password: ${testPassword}`);

await prisma.$disconnect();
