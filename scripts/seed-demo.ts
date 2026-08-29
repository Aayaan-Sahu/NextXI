/**
 * Seeds the demo world the tutorial captures are filmed against, and writes
 * every session cookie to scripts/.demo-world.json so the capture script can
 * open a signed-in page without filming a login.
 *
 * Accounts are created through the auth admin API with email_confirm — never
 * the signup form, which would send a real confirmation email and burn the
 * project's auth rate limit. The rows those accounts need are the ones
 * completeOnboarding writes in app/auth/actions.ts.
 *
 * Why PostgREST and not Prisma: everything here already needs the Supabase
 * service key (auth admin + storage), and the service role bypasses RLS, so
 * the same key writes the tables. Prisma would add a second credential — the
 * database password — for no gain, and this script has to be runnable by
 * anyone who can already administer the project. The cost is snake_case
 * column names and the *mapped* enum values (`'active'`, not `ACTIVE`);
 * prisma/schema.prisma is the reference for both.
 *
 * Usage: DEMO_WORLD=1 bun scripts/seed-demo.ts
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */
import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createChunks, stringToBase64URL } from "@supabase/ssr";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildPlayerVideoPath,
  buildPlayerVideoThumbnailPath,
  VIDEO_BUCKET,
  VIDEO_CACHE_CONTROL,
} from "@/lib/videos";
import {
  DEMO_EMAIL_DOMAIN,
  DEMO_EMAIL_PREFIX,
  demoEmail,
  demoPersonEmail,
} from "@/scripts/demo-world";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WORLD_FILE = path.join(ROOT, "scripts", ".demo-world.json");
/** The one clip every demo video points at: 14s, 30fps, already in the repo. */
const CLIP = path.join(ROOT, "public", "hero-drive.mp4");
const DAY = 24 * 60 * 60 * 1000;

if (process.env.DEMO_WORLD !== "1") {
  throw new Error(
    "Refusing to write demo data without DEMO_WORLD=1. This seeds real rows into whatever project NEXT_PUBLIC_SUPABASE_URL points at.",
  );
}

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
    cookieName: `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`,
    password: process.env.DEMO_PASSWORD ?? `demo-${crypto.randomUUID()}`,
    publishableKey,
    secretKey,
    supabaseUrl,
  };
}

const config = loadConfig();

const admin: SupabaseClient = createClient(config.supabaseUrl, config.secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Every write goes through here so one failure can't pass silently. */
async function upsert(table: string, rows: Record<string, unknown>[], onConflict = "id") {
  const { error } = await admin.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

// ---------------------------------------------------------------- the cast

/** Dates of birth are fixed, so ages in the film never drift with the clock. */
type PersonKey = keyof typeof PEOPLE;

const PEOPLE = {
  maya: {
    kind: "player",
    name: "Maya Ellison",
    username: "maya_ellison",
    dateOfBirth: "2010-03-14", // 16
    club: "Riverside CC",
    country: "England",
    heightCm: 168,
    weightKg: 57,
    roles: ["batter"],
  },
  jordan: {
    kind: "player",
    name: "Jordan Blake",
    username: "jordan_blake",
    dateOfBirth: "2009-05-02", // 17
    club: "Riverside CC",
    country: "England",
    heightCm: 181,
    weightKg: 72,
    roles: ["pace", "all_rounder"],
  },
  /**
   * The one public demo player. A club's auto-match list is public profiles
   * only (lib/clubs.server.ts), so the club film cannot show that list with
   * nobody on it. Public also means briefly visible in the real coach
   * directory, which is why the club film is shot last and torn down straight
   * after.
   */
  ellis: {
    kind: "player",
    name: "Ellis Nakamura",
    username: "ellis_nakamura",
    dateOfBirth: "2011-08-22", // 15
    club: "Riverside CC",
    country: "England",
    heightCm: 172,
    weightKg: 61,
    roles: ["leg_spin"],
    visibility: "public",
  },
  tom: {
    kind: "coach",
    name: "Tom Rhodes",
    username: "tom_rhodes",
    club: "Riverside CC",
    certifications: ["ECB Level 3"],
    accomplishments: [
      "ECB Level 3 coach",
      "Riverside CC 1st XI head coach",
      "12 years coaching age-group cricket",
    ],
    specialties: ["batting"],
    bio: "Batting coach at Riverside CC. I work with age-group players on head position and shape through the ball.",
  },
  priya: {
    kind: "coach",
    name: "Priya Nair",
    username: "priya_nair",
    club: "Riverside CC",
    certifications: ["ECB Level 2"],
    accomplishments: ["ECB Level 2 coach", "County age-group pace bowling"],
    specialties: ["pace_bowling"],
    bio: "Pace bowling coach. Run-up rhythm, front arm, and landings you can repeat.",
  },
  helen: { kind: "guardian", name: "Helen Ellison", username: "helen_ellison" },
  /**
   * The club account. "Riverside CC" is what every demo player typed at
   * sign-up, which is the mechanism the club film is about: a club finds its
   * players by the text they wrote, and then has to ask them.
   */
  riverside: {
    kind: "club",
    name: "Riverside CC",
    username: "riverside_cc",
    country: "England",
    bio: "Age-group cricket in Surrey. Six sides from U11 to U17, and every one of them films.",
  },
  /**
   * An account with a handle and no role yet — what you are for the thirty
   * seconds between creating an account and choosing what you are. The
   * sign-up film uses it to reach the coach form without sending another
   * confirmation email.
   */
  newcomer: {
    kind: "none",
    name: "Sam Whitlock",
    username: "sam_whitlock",
    email: demoPersonEmail("sam.whitlock"),
  },
  newplayer: {
    kind: "none",
    name: "Ava Whitmore",
    username: "ava_whitmore",
    // The address the sign-up film types into the form. It shows again in the
    // onboarding footer, so the two have to be the same person.
    email: demoPersonEmail("ava.whitmore"),
  },
  newguardian: {
    kind: "none",
    name: "Rachel Whitmore",
    username: "r_whitmore",
    email: demoPersonEmail("rachel.whitmore"),
  },
} as const;

/** Most of the cast is nextxi-demo-<key>@example.com; the newcomers read as people. */
function emailFor(key: PersonKey): string {
  const person = PEOPLE[key] as { email?: string };
  return person.email ?? demoEmail(key);
}

/**
 * Accepted connections. Tom sees both players; Priya only Jordan; the club
 * sees Maya, so its roster has somebody with clips on it before the film
 * claims anyone. Ellis is deliberately left unconnected — he is the one the
 * club asks on camera.
 */
const CONNECTIONS: [PersonKey, PersonKey][] = [
  ["maya", "tom"],
  ["jordan", "tom"],
  ["jordan", "priya"],
  ["maya", "riverside"],
];

// -------------------------------------------------------------- the report

/**
 * A v2 batting payload matching the demo clip exactly: 14s at 30fps, so the
 * two swing peaks land at 2.7s and 13.3s — the moments the player tutorial
 * seeks to. Plausible and clearly staged, never dressed up as live analysis
 * of a real player (PRODUCT.md, anti-references).
 */
const BATTING_PAYLOAD = {
  video: { fps: 30, width: 1280, height: 720, frames: 420 },
  calibration: { height_cm: 168 },
  shots: [
    {
      frames: { swing_peak: 82 },
      head: {
        max_head_movement_cm: 3.1,
        max_head_movement_norm: 0.12,
        head_movement_label: "good",
        head_over_knee_label: "ok",
      },
      front_foot_stride: { stride_length_cm: 62.0 },
      back_foot_depth: { depth_cm: 8.0 },
      balance: {
        head_inside_base: true,
        hip_inside_base: true,
        worst_base_offset_norm: 0.18,
        balance_label: "good",
      },
      trigger: { duration_sec: 0.3, gap_to_swing_sec: 0.2 },
      swing: { swing_straightness_mean: 0.09, swing_deviation_cm: 2.6, swing_label: "good" },
    },
    {
      frames: { swing_peak: 400 },
      head: {
        max_head_movement_cm: 6.4,
        max_head_movement_norm: 0.24,
        head_movement_label: "ok",
        head_over_knee_label: "needs work",
      },
      front_foot_stride: { stride_length_cm: 55.0 },
      back_foot_depth: { depth_cm: 11.0 },
      balance: {
        head_inside_base: true,
        hip_inside_base: false,
        worst_base_offset_norm: 0.31,
        balance_label: "ok",
      },
      trigger: { duration_sec: 0.34, gap_to_swing_sec: 0.26 },
      swing: { swing_straightness_mean: 0.16, swing_deviation_cm: 4.9, swing_label: "ok" },
    },
  ],
  consistency: {
    stride_length_cv: 0.12,
    backlift_height_cv: 0.18,
    swing_straightness_mean_cv: 0.1,
  },
};

type VideoSpec = {
  key: string;
  player: PersonKey;
  filename: string;
  /** Mapped VideoCategory / Handedness values, as stored. */
  category: string;
  variation: string;
  handedness: string;
  /** Days before now the clip was uploaded, so ages read naturally on screen. */
  ageDays: number;
  review: { status: "approved"; by: PersonKey; note: string } | { status: "awaiting_review" };
  comments?: { author: PersonKey; body: string; timestampSec: number | null }[];
};

const VIDEOS: VideoSpec[] = [
  {
    key: "maya-cover-drive",
    player: "maya",
    filename: "cover-drive-nets.mp4",
    category: "batting",
    variation: "Cover drive",
    handedness: "right",
    ageDays: 9,
    review: {
      status: "approved",
      by: "tom",
      note: "Lovely shape through the ball. Keep the head still a beat longer and this is a shot you can play under pressure.",
    },
    comments: [
      {
        author: "tom",
        body: "Head is beautifully still here — this is the one to remember.",
        timestampSec: 2.7,
      },
      {
        author: "tom",
        body: "You've fallen away slightly on this one. Same drill, hips through the line.",
        timestampSec: 13.3,
      },
    ],
  },
  {
    key: "maya-straight-drive",
    player: "maya",
    filename: "straight-drive-session.mp4",
    category: "batting",
    variation: "Straight drive",
    handedness: "right",
    ageDays: 2,
    review: { status: "awaiting_review" },
  },
  {
    key: "jordan-pull",
    player: "jordan",
    filename: "pull-shot-throwdowns.mp4",
    category: "batting",
    variation: "Pull",
    handedness: "right",
    ageDays: 4,
    review: { status: "awaiting_review" },
  },
];

// --------------------------------------------------------------- auth users

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

  // Re-runs generate a new password, so reset the existing user to this one.
  const { error: updateError } = await admin.auth.admin.updateUserById(id, {
    password: config.password,
  });
  if (updateError) throw updateError;

  return id;
}

/** Encodes the session the way @supabase/ssr stores it: base64url, chunked. */
function sessionCookies(session: Session) {
  return createChunks(config.cookieName, `base64-${stringToBase64URL(JSON.stringify(session))}`);
}

async function signIn(email: string) {
  // Fresh client per sign-in so the grants share no auth state.
  const client = createClient(config.supabaseUrl, config.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: config.password,
  });

  if (error || !data.session) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? "no session returned"}`);
  }

  return data.session;
}

// ------------------------------------------------------------ profile rows

async function seedPerson(key: PersonKey, id: string) {
  const person = PEOPLE[key];
  const now = new Date().toISOString();

  // A newcomer is an account that has only just been created: an auth user
  // and nothing else, which is what the sign-up film picks up from. No
  // profile row either, so the handle it types on the sign-up form is still
  // free and the onboarding form suggests the same one back from the name.
  if (person.kind === "none") {
    for (const table of ["players", "coaches", "guardians", "profiles"]) {
      const { error } = await admin.from(table).delete().eq("id", id);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    return;
  }

  await upsert("profiles", [
    {
      consent_policy_version: "demo",
      consented_at: now,
      id,
      updated_at: now,
      username: person.username,
    },
  ]);

  if (person.kind === "player") {
    await upsert("players", [
      {
        club: person.club,
        country: person.country,
        date_of_birth: person.dateOfBirth,
        guardian_code: null,
        height_cm: person.heightCm,
        id,
        name: person.name,
        roles: person.roles,
        // Seeded straight to active: the guardian link written below is the
        // act that would have cleared the pending-guardian gate anyway.
        status: "active",
        updated_at: now,
        // Private unless the cast says otherwise: a demo player must not
        // surface in the real coach directory or anybody's search results.
        visibility: (person as { visibility?: string }).visibility ?? "private",
        weight_kg: person.weightKg,
      },
    ]);
    return;
  }

  if (person.kind === "coach") {
    await upsert("coaches", [
      {
        accomplishments: person.accomplishments,
        bio: person.bio,
        certifications: person.certifications,
        club: person.club,
        id,
        name: person.name,
        specialties: person.specialties,
        status: "approved",
        updated_at: now,
      },
    ]);
    return;
  }

  if (person.kind === "club") {
    await upsert("clubs", [
      {
        bio: person.bio,
        country: person.country,
        id,
        name: person.name,
        // Approved outright: admin verification is its own screen, and the
        // film is about what an approved club can already do.
        status: "approved",
        updated_at: now,
      },
    ]);
    return;
  }

  await upsert("guardians", [{ id, name: person.name, updated_at: now }]);
}

/**
 * Matches the `user_a_id < user_b_id` invariant the connections table relies
 * on (lib/connections.ts orderedPair — inlined so this script pulls in no
 * server module, and therefore no database client).
 */
function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function connect(aKey: PersonKey, bKey: PersonKey, ids: Record<PersonKey, string>) {
  const [userAId, userBId] = orderedPair(ids[aKey], ids[bKey]);
  await upsert(
    "connections",
    [
      {
        requested_by_id: ids[bKey],
        status: "accepted",
        updated_at: new Date().toISOString(),
        user_a_id: userAId,
        user_b_id: userBId,
      },
    ],
    "user_a_id,user_b_id",
  );
}

/**
 * Connection rows the seeder never wrote: a request the club film sent on a
 * previous take, or one a capture made through the UI. The club's claim list
 * is "players this club has never asked", so one left behind empties it and
 * the next take has nothing to film.
 */
async function pruneStrayConnections(ids: Record<PersonKey, string>) {
  const demoIds = Object.values(ids);
  const keep = new Set(CONNECTIONS.map(([a, b]) => orderedPair(ids[a], ids[b]).join("|")));

  const [asA, asB] = await Promise.all([
    admin.from("connections").select("user_a_id, user_b_id").in("user_a_id", demoIds),
    admin.from("connections").select("user_a_id, user_b_id").in("user_b_id", demoIds),
  ]);
  if (asA.error) throw new Error(`connections: ${asA.error.message}`);
  if (asB.error) throw new Error(`connections: ${asB.error.message}`);

  const seen = new Set<string>();
  for (const row of [...(asA.data ?? []), ...(asB.data ?? [])]) {
    const userAId = row.user_a_id as string;
    const userBId = row.user_b_id as string;
    const pair = `${userAId}|${userBId}`;
    if (seen.has(pair) || keep.has(pair)) continue;
    seen.add(pair);

    const { error } = await admin
      .from("connections")
      .delete()
      .eq("user_a_id", userAId)
      .eq("user_b_id", userBId);
    if (error) throw new Error(`connections: ${error.message}`);
  }

  return seen.size;
}

// ----------------------------------------------------------------- storage

/** One thumbnail, grabbed from the clip; null if ffmpeg isn't installed. */
async function thumbnailBytes(): Promise<Buffer | null> {
  const out = path.join(tmpdir(), `nextxi-demo-thumb-${crypto.randomUUID()}.jpg`);
  const result = spawnSync(
    "ffmpeg",
    ["-v", "error", "-y", "-ss", "1", "-i", CLIP, "-frames:v", "1", "-q:v", "3", out],
    { stdio: "ignore" },
  );

  if (result.status !== 0) return null;

  try {
    return await readFile(out);
  } finally {
    await rm(out, { force: true });
  }
}

/** Multi-megabyte uploads drop sockets often enough to be worth retrying. */
async function uploadObject(objectPath: string, body: Buffer, contentType: string) {
  for (let attempt = 1; ; attempt += 1) {
    const { error } = await admin.storage.from(VIDEO_BUCKET).upload(objectPath, body, {
      cacheControl: VIDEO_CACHE_CONTROL,
      contentType,
      upsert: true,
    });
    if (!error) return;
    if (attempt === 4) {
      throw new Error(`Storage upload failed for ${objectPath}: ${error.message}`);
    }
    console.warn(`  retrying upload of ${objectPath} (${error.message})`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }
}

// ------------------------------------------------------------------ videos

async function seedVideo(
  spec: VideoSpec,
  ids: Record<PersonKey, string>,
  clip: Buffer,
  thumb: Buffer | null,
) {
  const playerId = ids[spec.player];
  const { data: existing, error } = await admin
    .from("player_videos")
    .select("id")
    .eq("player_id", playerId)
    .eq("original_filename", spec.filename)
    .maybeSingle();
  if (error) throw new Error(`player_videos: ${error.message}`);

  // Re-runs reuse the row and its storage object but re-assert the review
  // state below, so a second take of a film starts from the same world the
  // first one did — filming a coach approving a report is otherwise a
  // one-shot: the second take would find it already approved.
  const videoId = (existing?.id as string) ?? crypto.randomUUID();
  const storagePath = buildPlayerVideoPath(playerId, videoId, "video/mp4");
  const thumbnailPath = buildPlayerVideoThumbnailPath(playerId, videoId);

  if (!existing) {
    await uploadObject(storagePath, clip, "video/mp4");
    if (thumb) await uploadObject(thumbnailPath, thumb, "image/jpeg");
  }

  const uploadedAt = new Date(Date.now() - spec.ageDays * DAY).toISOString();
  const approved = spec.review.status === "approved" ? spec.review : null;
  const reviewedAt = approved
    ? new Date(Date.now() - spec.ageDays * DAY + 2 * 60 * 60 * 1000).toISOString()
    : null;

  await upsert("player_videos", [
    {
      category: spec.category,
      content_type: "video/mp4",
      // Backdated so the UI reads "Uploaded 9 days ago" rather than "today".
      created_at: uploadedAt,
      handedness: spec.handedness,
      id: videoId,
      original_filename: spec.filename,
      player_id: playerId,
      size_bytes: clip.byteLength,
      status: "ready",
      storage_bucket: VIDEO_BUCKET,
      storage_path: storagePath,
      thumbnail_path: thumb ? thumbnailPath : null,
      updated_at: uploadedAt,
      uploaded_at: uploadedAt,
      variation: spec.variation,
    },
  ]);

  await upsert(
    "reports",
    [
      {
        coach_note: approved?.note ?? null,
        created_at: uploadedAt,
        model_version: "demo-world",
        payload: BATTING_PAYLOAD,
        review_status: spec.review.status,
        reviewed_at: reviewedAt,
        reviewed_by_id: approved ? ids[approved.by] : null,
        reviewed_by_name: approved ? PEOPLE[approved.by].name : null,
        schema_version: 2,
        status: "ready",
        // "Report ready {relative}" on the coach's queue reads this.
        updated_at: reviewedAt ?? uploadedAt,
        video_id: videoId,
      },
    ],
    "video_id",
  );

  // Replaced rather than upserted: comments have no natural key, so a re-run
  // would otherwise stack a second copy of every note.
  const { error: clearError } = await admin.from("video_comments").delete().eq("video_id", videoId);
  if (clearError) throw new Error(`video_comments: ${clearError.message}`);

  const comments = spec.comments ?? [];
  if (comments.length) {
    await upsert(
      "video_comments",
      comments.map((comment, index) => ({
        author_id: ids[comment.author],
        author_name: PEOPLE[comment.author].name,
        author_username: PEOPLE[comment.author].username,
        body: comment.body,
        created_at: new Date(Date.parse(uploadedAt) + (index + 1) * 60 * 1000).toISOString(),
        // Notes on an approved report went public with it; notes on a report
        // still awaiting sign-off stay held — what the coach film demonstrates.
        published_at: reviewedAt,
        timestamp_sec: comment.timestampSec,
        video_id: videoId,
      })),
    );
  }

  return videoId;
}

/**
 * Clips a previous capture uploaded through the UI. They are real uploads with
 * real reports, so they pile into the coach's queue and change what the next
 * take of a film shows — the world has to start each run at the same place.
 */
async function pruneStrayVideos(playerIds: string[], keepIds: string[]) {
  const { data, error } = await admin
    .from("player_videos")
    .select("id, player_id")
    .in("player_id", playerIds);
  if (error) throw new Error(`player_videos: ${error.message}`);

  const stray = (data ?? []).filter((video) => !keepIds.includes(video.id as string));
  if (!stray.length) return 0;

  for (const video of stray) {
    const prefix = `${video.player_id}/${video.id}`;
    const { data: files } = await admin.storage.from(VIDEO_BUCKET).list(prefix);
    if (files?.length) {
      await admin.storage.from(VIDEO_BUCKET).remove(files.map((file) => `${prefix}/${file.name}`));
    }
  }

  // The report and its comments go with the row (onDelete: Cascade).
  const { error: deleteError } = await admin
    .from("player_videos")
    .delete()
    .in(
      "id",
      stray.map((video) => video.id),
    );
  if (deleteError) throw new Error(`player_videos: ${deleteError.message}`);

  return stray.length;
}

// ---------------------------------------------------------------- progress

async function seedProgress(playerId: string) {
  const { count, error } = await admin
    .from("stat_entries")
    .select("id", { count: "exact", head: true })
    .eq("player_id", playerId);
  if (error) throw new Error(`stat_entries: ${error.message}`);
  if (count) return;

  const matches = [
    { ageDays: 42, opponent: "Ashford CC", runs: 24, balls: 31, dismissal: "Caught" },
    { ageDays: 28, opponent: "Bramley CC", runs: 41, balls: 52, dismissal: "Bowled" },
    { ageDays: 14, opponent: "Ashford CC", runs: 58, balls: 63, dismissal: "Not out" },
    { ageDays: 5, opponent: "Weyhill CC", runs: 37, balls: 40, dismissal: "LBW" },
  ];

  const { error: matchError } = await admin.from("stat_entries").insert(
    matches.map((match) => ({
      balls_faced: match.balls,
      dismissal: match.dismissal,
      match_date: new Date(Date.now() - match.ageDays * DAY).toISOString().slice(0, 10),
      opponent: match.opponent,
      player_id: playerId,
      runs: match.runs,
    })),
  );
  if (matchError) throw new Error(`stat_entries: ${matchError.message}`);

  const { error: goalError } = await admin.from("goals").insert({
    horizon_date: new Date(Date.now() + 60 * DAY).toISOString().slice(0, 10),
    metric: "Head movement",
    player_id: playerId,
    target: 4,
    title: "Keep head movement under 4 cm through the drive",
  });
  if (goalError) throw new Error(`goals: ${goalError.message}`);

  const { error: reminderError } = await admin.from("reminders").insert({
    due_at: new Date(Date.now() + 3 * DAY).toISOString(),
    player_id: playerId,
    text: "Film a set of cover drives after Thursday nets",
  });
  if (reminderError) throw new Error(`reminders: ${reminderError.message}`);
}

// -------------------------------------------------------------------- main

async function main() {
  console.log(`Seeding the demo world into ${new URL(config.supabaseUrl).hostname}.`);
  console.log(`Accounts are ${DEMO_EMAIL_PREFIX}*@${DEMO_EMAIL_DOMAIN}; teardown removes them all.`);

  const keys = Object.keys(PEOPLE) as PersonKey[];
  const ids = {} as Record<PersonKey, string>;
  const sessions = {} as Record<PersonKey, Session>;

  for (const key of keys) {
    const email = emailFor(key);
    ids[key] = await ensureAuthUser(email);
    await seedPerson(key, ids[key]);
    sessions[key] = await signIn(email);
    console.log(`  ${key.padEnd(11)} ${PEOPLE[key].name}`);
  }

  // The guardian link, written directly rather than through the code exchange:
  // that flow is UI-only, and this is the write it ends in. An update, not an
  // upsert — PostgREST upserts are full inserts on conflict, so a partial row
  // would null every column it doesn't mention.
  const { error: linkError } = await admin
    .from("players")
    .update({ guardian_id: ids.helen, updated_at: new Date().toISOString() })
    .eq("id", ids.maya);
  if (linkError) throw new Error(`players: ${linkError.message}`);

  for (const [a, b] of CONNECTIONS) await connect(a, b, ids);

  const strayLinks = await pruneStrayConnections(ids);
  if (strayLinks) console.log(`  pruned  ${strayLinks} connection(s) from a previous take`);

  // Tom runs the club as well as coaching in it: the film opens on the club's
  // own login and closes on his, and both have to reach the same dashboard.
  await upsert(
    "club_coaches",
    [
      {
        club_id: ids.riverside,
        coach_id: ids.tom,
        invited_by_id: ids.riverside,
        role: "owner",
        status: "accepted",
        updated_at: new Date().toISOString(),
      },
    ],
    "club_id,coach_id",
  );

  const [clip, thumb] = await Promise.all([readFile(CLIP), thumbnailBytes()]);
  if (!thumb) console.warn("  ffmpeg not found — videos will show the placeholder tile.");

  const videos: Record<string, string> = {};
  for (const spec of VIDEOS) {
    videos[spec.key] = await seedVideo(spec, ids, clip, thumb);
    console.log(`  video   ${spec.filename}`);
  }

  const pruned = await pruneStrayVideos(Object.values(ids), Object.values(videos));
  if (pruned) console.log(`  pruned  ${pruned} clip(s) left over from a previous take`);

  await seedProgress(ids.maya);

  await writeFile(
    WORLD_FILE,
    `${JSON.stringify(
      {
        cookieName: config.cookieName,
        createdAt: new Date().toISOString(),
        people: Object.fromEntries(
          keys.map((key) => [
            key,
            {
              cookies: sessionCookies(sessions[key]),
              email: emailFor(key),
              id: ids[key],
              name: PEOPLE[key].name,
            },
          ]),
        ),
        supabaseUrl: config.supabaseUrl,
        videos,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`\nWrote ${WORLD_FILE}`);
  console.log("Sessions last about an hour — capture soon, or re-run this.");
}

await main();
