-- Two pieces of drift that have followed every migration since, named in the
-- header of 20260829013428_add_clubs and deliberately left out of it.
--
-- `stats_profile_url` is a column no code has ever read: `statsUrl`
-- (`stats_url`) replaced it and the Prisma schema never carried it. Checked
-- against production before writing this — 0 of 11 players have a value in
-- it, so there is nothing to migrate first.
--
-- Both statements are written to survive a database that has already been
-- fixed, because a failed `prisma migrate deploy` takes the production build
-- down with it (scripts/vercel-build.sh), and the shape of the live schema is
-- the one thing a migration cannot ask about beforehand.
ALTER TABLE "players" DROP COLUMN IF EXISTS "stats_profile_url";

-- A rename only: same columns, same uniqueness, the name Prisma expects.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'connections_user_a_user_b_key') THEN
    ALTER INDEX "connections_user_a_user_b_key" RENAME TO "connections_user_a_id_user_b_id_key";
  END IF;
END $$;
