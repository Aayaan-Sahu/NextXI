-- Practice sessions: a single-discipline container a player fills with videos,
-- so cross-video consistency stats can be computed (esp. for bowling, where
-- each video is one delivery). A video belongs to at most one session; removing
-- it from a session nulls the FK (the video and its report survive).

CREATE TABLE "public"."practice_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."video_category" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "practice_sessions_player_created_at_idx" ON "public"."practice_sessions"("player_id", "created_at" DESC);

ALTER TABLE "public"."practice_sessions" ADD CONSTRAINT "practice_sessions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Each video optionally points at one session.
ALTER TABLE "public"."player_videos" ADD COLUMN "session_id" UUID;

CREATE INDEX "player_videos_session_id_idx" ON "public"."player_videos"("session_id");

ALTER TABLE "public"."player_videos" ADD CONSTRAINT "player_videos_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
