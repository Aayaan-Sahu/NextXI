-- Restored file (the original was lost from the working tree). This migration
-- was already applied to the database; the SQL below reflects the column it
-- added and exists so Prisma's migration checksum/file check passes.
ALTER TABLE "players" ADD COLUMN "stats_profile_url" TEXT;
