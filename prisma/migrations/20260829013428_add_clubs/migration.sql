-- Clubs: an account of their own, and the coaches who run them.
--
-- A club is keyed to auth.users exactly like players, coaches and guardians,
-- so connections, messages and every video gate work on it with no new
-- machinery. club_coaches is the delegated access — the reason a coach can
-- open a club's dashboard from their own login.
--
-- Prisma also wanted to drop players.stats_profile_url and rename the
-- connections unique constraint here. Both are pre-existing drift with
-- nothing to do with clubs, and the column drop would destroy player data, so
-- neither is in this migration.

-- CreateEnum
CREATE TYPE "club_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "club_coach_role" AS ENUM ('owner', 'member');

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "status" "club_status" NOT NULL DEFAULT 'pending',
    "bio" TEXT,
    "crest_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_coaches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "role" "club_coach_role" NOT NULL DEFAULT 'member',
    "status" "connection_status" NOT NULL DEFAULT 'pending',
    "invited_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_coaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clubs_status_name_idx" ON "clubs"("status", "name");

-- CreateIndex
CREATE INDEX "club_coaches_coach_status_idx" ON "club_coaches"("coach_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "club_coaches_club_id_coach_id_key" ON "club_coaches"("club_id", "coach_id");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "club_coaches" ADD CONSTRAINT "club_coaches_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "club_coaches" ADD CONSTRAINT "club_coaches_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- A name is what a player recognises; keep it plausible and keep the bio short.
ALTER TABLE "clubs"
  ADD CONSTRAINT "clubs_name_len" CHECK (char_length("name") BETWEEN 2 AND 120),
  ADD CONSTRAINT "clubs_bio_len" CHECK ("bio" IS NULL OR char_length("bio") <= 500);

-- New public tables, so they join the lockdown: RLS on with zero policies
-- denies PostgREST everything and leaves Prisma the only door
-- (20260818000000_rls_lockdown_and_private_functions).
ALTER TABLE "public"."clubs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."club_coaches" ENABLE ROW LEVEL SECURITY;
