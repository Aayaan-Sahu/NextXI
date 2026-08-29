/**
 * Removes everything scripts/seed-demo.ts created, then proves it.
 *
 * Deleting the auth user cascades to profile, player/coach/guardian, videos,
 * reports, comments and connections (onDelete: Cascade all the way down), but
 * storage objects are not in that graph — they are removed first, by hand.
 *
 * The run ends with a residue count for every table the seeder touches plus
 * the bucket. Anything non-zero exits 1: "probably clean" is not a result.
 *
 * Usage: DEMO_WORLD=1 bun scripts/demo-teardown.ts
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { VIDEO_BUCKET } from "@/lib/videos";
import { isDemoEmail } from "@/scripts/demo-world";

const WORLD_FILE = path.join(
  fileURLToPath(new URL("..", import.meta.url)),
  "scripts",
  ".demo-world.json",
);

if (process.env.DEMO_WORLD !== "1") {
  throw new Error("Refusing to run without DEMO_WORLD=1.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.",
  );
}

const admin: SupabaseClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function demoUsers() {
  const found: { email: string; id: string }[] = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((user) => {
      if (isDemoEmail(user.email)) found.push({ email: user.email as string, id: user.id });
    });
    if (data.users.length < 1000) break;
  }

  return found;
}

/** Every object under a player's prefix: {playerId}/{videoId}/{source,thumb}. */
async function objectPaths(playerId: string) {
  const { data: folders, error } = await admin.storage.from(VIDEO_BUCKET).list(playerId);
  if (error) throw error;

  const paths: string[] = [];
  for (const folder of folders ?? []) {
    const { data: files, error: listError } = await admin.storage
      .from(VIDEO_BUCKET)
      .list(`${playerId}/${folder.name}`);
    if (listError) throw listError;
    (files ?? []).forEach((file) => paths.push(`${playerId}/${folder.name}/${file.name}`));
  }

  return paths;
}

async function countIn(table: string, column: string, ids: string[]) {
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .in(column, ids);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const users = await demoUsers();
  console.log(`Found ${users.length} demo accounts in ${new URL(supabaseUrl!).hostname}.`);

  let removedObjects = 0;
  for (const user of users) {
    const paths = await objectPaths(user.id);
    if (!paths.length) continue;
    const { error } = await admin.storage.from(VIDEO_BUCKET).remove(paths);
    if (error) throw error;
    removedObjects += paths.length;
  }
  console.log(`Removed ${removedObjects} storage objects.`);

  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  }
  console.log(`Deleted ${users.length} accounts.`);

  // Verify. The cascades are a promise the schema makes; this is the receipt.
  const ids = users.map((user) => user.id);
  const residue: Record<string, number> = { users: (await demoUsers()).length };

  if (ids.length) {
    residue.profiles = await countIn("profiles", "id", ids);
    residue.players = await countIn("players", "id", ids);
    residue.coaches = await countIn("coaches", "id", ids);
    residue.guardians = await countIn("guardians", "id", ids);
    residue.videos = await countIn("player_videos", "player_id", ids);
    residue.connections =
      (await countIn("connections", "user_a_id", ids)) +
      (await countIn("connections", "user_b_id", ids));
    residue.storageObjects = (await Promise.all(ids.map(objectPaths))).reduce(
      (total, paths) => total + paths.length,
      0,
    );
  }

  console.log(JSON.stringify(residue, null, 2));

  await rm(WORLD_FILE, { force: true });

  if (Object.values(residue).some((count) => count > 0)) {
    console.error("\nResidue left behind. The database is not clean.");
    process.exitCode = 1;
    return;
  }
  console.log("\nClean.");
}

await main();
