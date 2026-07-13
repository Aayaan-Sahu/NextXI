-- CreateEnum
CREATE TYPE "coach_specialty" AS ENUM ('batting', 'pace_bowling', 'spin_bowling', 'wicketkeeping', 'fielding', 'fitness');

-- AlterTable
ALTER TABLE "coaches" ADD COLUMN     "avatar_path" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "specialties" "coach_specialty"[] DEFAULT ARRAY[]::"coach_specialty"[],
ADD COLUMN     "years_experience" INTEGER;

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "avatar_path" TEXT,
ADD COLUMN     "batting_handedness" "handedness",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "bowling_handedness" "handedness";

-- Profile photos, stored alongside player videos but in their own private
-- bucket (small images, single-file-per-user, upsertable).
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
