-- Opening the platform to real signups. Three gates come down for now; each is
-- one line away from coming back (the code that set them is commented at the
-- site that changed).
--
--   1. Under-18 players no longer wait on a guardian to use the account.
--   2. Coaches and clubs no longer wait on an admin who was not watching the
--      queue.
--   3. The video bucket is told the truth about the project's ceiling.
--
-- This migration carries no schema change — it moves the rows and the bucket
-- that the code change leaves behind. Written to survive a second run: a
-- failed `prisma migrate deploy` takes the production build down with it
-- (scripts/vercel-build.sh).

-- 1. Existing players stuck behind the consent gate. The guardian code is
-- deliberately kept: it is now an invitation a parent can still claim, not a
-- lock, and nulling it here would strand every child who has already sent it.
UPDATE "players"
SET "status" = 'active'
WHERE "status" = 'pending_guardian';

-- 2. Everyone waiting in the admin queue. Rejections are left alone — a
-- rejected account was a decision, not a backlog.
UPDATE "coaches"
SET "status" = 'approved'
WHERE "status" = 'pending';

-- Clubs cannot be approved in bulk: clubs_approved_normalized_name_key
-- (20260829070000) allows one approved club per normalised name, so a blanket
-- UPDATE aborts the whole deploy the moment two pending rows claim the same
-- name. Approve the oldest claimant of each free name and leave the rest
-- pending for an admin to settle by hand.
WITH claimable AS (
  SELECT DISTINCT ON (lower(btrim(regexp_replace(c."name", '\s+', ' ', 'g'))))
    c."id"
  FROM "clubs" c
  WHERE c."status" = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM "clubs" approved
      WHERE approved."status" = 'approved'
        AND lower(btrim(regexp_replace(approved."name", '\s+', ' ', 'g')))
          = lower(btrim(regexp_replace(c."name", '\s+', ' ', 'g')))
    )
  ORDER BY
    lower(btrim(regexp_replace(c."name", '\s+', ' ', 'g'))),
    c."created_at",
    c."id"
)
UPDATE "clubs"
SET "status" = 'approved'
WHERE "id" IN (SELECT "id" FROM claimable);

-- 3. Supabase's Free plan enforces a 50 MB per-file ceiling across the whole
-- project, and a bucket cannot raise it. The bucket has claimed 500 MB since
-- 20260702010000_add_player_videos, so an oversized upload was accepted, sent,
-- and only then refused. Matching MAX_VIDEO_SIZE_BYTES in shared/videos.ts
-- moves the refusal to the file picker. Raise both together on Pro.
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'player-videos';
