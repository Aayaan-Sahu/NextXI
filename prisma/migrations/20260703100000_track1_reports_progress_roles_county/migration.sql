-- Track 1 Phase 1 gaps: reports (AI slot), progress (stats/goals/reminders),
-- player roles, country -> county rename, connection revocation.
-- NOTE: coordinate applying this with Aayaan — the column rename requires the
-- updated app code to be deployed together with the migration.

-- New enums
CREATE TYPE "public"."report_status" AS ENUM ('pending', 'ready', 'failed');

CREATE TYPE "public"."player_role" AS ENUM ('batter', 'pace', 'off_spin', 'leg_spin', 'wicketkeeper', 'all_rounder');

-- Connection revocation
ALTER TYPE "public"."connection_status" ADD VALUE IF NOT EXISTS 'revoked';

-- Players: county rename + roles
ALTER TABLE "public"."players" RENAME COLUMN "country" TO "county";

ALTER TABLE "public"."players" ADD COLUMN "roles" "public"."player_role"[] NOT NULL DEFAULT '{}';

-- Reports: the AI engine's landing pad (one report slot per video)
CREATE TABLE "public"."reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "status" "public"."report_status" NOT NULL DEFAULT 'pending',
    "schema_version" INTEGER,
    "payload" JSONB,
    "error" TEXT,
    "model_version" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reports_video_id_key" ON "public"."reports"("video_id");

ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."player_videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Stat entries: manual match stats (canonical source at launch)
CREATE TABLE "public"."stat_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id" UUID NOT NULL,
    "match_date" DATE NOT NULL,
    "opponent" TEXT,
    "runs" INTEGER,
    "balls_faced" INTEGER,
    "dismissal" TEXT,
    "overs_bowled" DECIMAL(4,1),
    "wickets" INTEGER,
    "runs_conceded" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stat_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stat_entries_player_match_date_idx" ON "public"."stat_entries"("player_id", "match_date" DESC);

ALTER TABLE "public"."stat_entries" ADD CONSTRAINT "stat_entries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Goals
CREATE TABLE "public"."goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "metric" TEXT,
    "target" DECIMAL(10,2),
    "horizon_date" DATE,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "goals_player_created_at_idx" ON "public"."goals"("player_id", "created_at" DESC);

ALTER TABLE "public"."goals" ADD CONSTRAINT "goals_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Reminders (user-set coaching prompts)
CREATE TABLE "public"."reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "due_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reminders_player_due_at_idx" ON "public"."reminders"("player_id", "due_at");

ALTER TABLE "public"."reminders" ADD CONSTRAINT "reminders_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
