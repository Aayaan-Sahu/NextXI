/**
 * Creates a full cast of throwaway accounts around one real account so the
 * mobile Connections screen has enough data to see its real states: the
 * "Players 9 / Coaches 3" segment counts, the "Show N more players" roster
 * truncation, and the "N connection requests" review banner.
 *
 * Companion to `create-mobile-test-friend.ts` (which creates just the one
 * "Test Friend" player) — this adds the rest of the cast on top of it.
 * Idempotent — safe to re-run. Uses the same `nextxi-demo-*@example.com`
 * convention as `scripts/demo-world.ts`, so `isDemoEmail` recognizes these
 * accounts and `bun run video:teardown` (DEMO_WORLD=1) cleans them up too.
 *
 * Usage:
 *   bun scripts/create-mobile-test-connections.ts [target-email]
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from "@supabase/supabase-js";
import { ConnectionStatus, CoachStatus, PlayerStatus } from "@/app/generated/prisma/enums";
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
const testPassword = process.env.DEMO_PASSWORD ?? "nextxi-mobile-test";

type FriendPlayer = { key: string; username: string; name: string; club: string };
type PendingPlayer = { key: string; username: string; name: string; club: string };
type PendingCoach = { key: string; username: string; name: string; club: string };

// Accepted connections — the roster. Five past ROSTER_PAGE_SIZE (5) so the
// "Show N more players" affordance has something to reveal.
const ACCEPTED_PLAYERS: FriendPlayer[] = [
  { key: "player-minor", username: "minor", name: "Ima Minor", club: "Ealing CC" },
  { key: "player-rohanp", username: "rohanp", name: "Rohan Patel", club: "Northwood CC" },
  { key: "player-sanai", username: "sanai", name: "Sana Iqbal", club: "Harrow Town" },
  { key: "player-tomb", username: "tomb", name: "Tom Bailey", club: "Ealing 2nd XI" },
  { key: "player-elliegrant", username: "elliegrant", name: "Ellie Grant", club: "Ealing CC" },
  { key: "player-zarac", username: "zarac", name: "Zara Chen", club: "Northwood CC" },
  { key: "player-leof", username: "leof", name: "Leo Fischer", club: "Harrow Town" },
  { key: "player-mayao", username: "mayao", name: "Maya Osei", club: "Ealing 2nd XI" },
];

// Incoming pending requests — the "N connection requests" banner.
const PENDING_COACHES: PendingCoach[] = [
  { key: "coach-markellis", username: "markellis", name: "Mark Ellis", club: "Northwood CC" },
];
const PENDING_PLAYERS: PendingPlayer[] = [
  { key: "player-jayarao", username: "jayarao", name: "Jaya Rao", club: "Harrow Town" },
];

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

async function ensureAuthUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: testPassword,
    email_confirm: true,
  });
  if (!error) {
    console.log(`Created auth user ${email}`);
    return data.user.id;
  }
  if (error.code !== "email_exists" && error.code !== "user_already_exists") throw error;

  const existingId = await findUserIdByEmail(email);
  if (!existingId) throw new Error(`${email} already exists but was not found via listUsers.`);
  await admin.auth.admin.updateUserById(existingId, { password: testPassword });
  console.log(`Reused existing auth user ${email}`);
  return existingId;
}

async function ensurePlayer(userId: string, username: string, name: string, club: string) {
  await prisma.profile.upsert({
    where: { id: userId },
    create: { id: userId, username },
    update: {},
  });
  await prisma.player.upsert({
    where: { id: userId },
    create: {
      id: userId,
      name,
      dateOfBirth: new Date("2006-01-01"),
      club,
      country: "United Kingdom",
      heightCm: 172,
      status: PlayerStatus.ACTIVE,
      // PUBLIC, not PRIVATE: `searchPlayersByQuery` only surfaces players who
      // opted into discovery, so a PRIVATE test player is invisible on the
      // Add connections screen and there is no way to re-add them after a
      // remove. The update path sets it too — earlier runs seeded PRIVATE.
      visibility: "PUBLIC",
    },
    update: { status: PlayerStatus.ACTIVE, visibility: "PUBLIC" },
  });
}

async function ensureCoach(userId: string, username: string, name: string, club: string) {
  await prisma.profile.upsert({
    where: { id: userId },
    create: { id: userId, username },
    update: {},
  });
  await prisma.coach.upsert({
    where: { id: userId },
    create: { id: userId, name, club, status: CoachStatus.APPROVED },
    update: { status: CoachStatus.APPROVED },
  });
}

async function ensureConnection(otherId: string, targetId: string, status: ConnectionStatus, requestedById: string) {
  const [userAId, userBId] = orderedPair(otherId, targetId);
  await prisma.connection.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId, requestedById, status },
    update: { status, requestedById },
  });
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
  throw new Error(`${targetEmail} doesn't have a player profile — nothing to connect to.`);
}
if (targetPlayer.status !== PlayerStatus.ACTIVE) {
  throw new Error(`${targetEmail}'s player account is ${targetPlayer.status}, not ACTIVE.`);
}

for (const friend of ACCEPTED_PLAYERS) {
  const userId = await ensureAuthUser(demoEmail(friend.key));
  await ensurePlayer(userId, friend.username, friend.name, friend.club);
  // Accepted, requested by the friend so it doesn't also show as outgoing.
  await ensureConnection(userId, targetUserId, ConnectionStatus.ACCEPTED, userId);
  console.log(`Connected ${friend.name} (@${friend.username}) — accepted.`);
}

for (const pending of PENDING_COACHES) {
  const userId = await ensureAuthUser(demoEmail(pending.key));
  await ensureCoach(userId, pending.username, pending.name, pending.club);
  await ensureConnection(userId, targetUserId, ConnectionStatus.PENDING, userId);
  console.log(`Requested by ${pending.name} (@${pending.username}) — pending, coach.`);
}

for (const pending of PENDING_PLAYERS) {
  const userId = await ensureAuthUser(demoEmail(pending.key));
  await ensurePlayer(userId, pending.username, pending.name, pending.club);
  await ensureConnection(userId, targetUserId, ConnectionStatus.PENDING, userId);
  console.log(`Requested by ${pending.name} (@${pending.username}) — pending, player.`);
}

console.log(`\nDone. ${targetEmail} now has ${ACCEPTED_PLAYERS.length} new accepted player connections`);
console.log(`and ${PENDING_COACHES.length + PENDING_PLAYERS.length} incoming pending requests.`);

await prisma.$disconnect();
