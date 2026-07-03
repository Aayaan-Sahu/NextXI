import { redirect } from "next/navigation";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { PageHeader, PageShell } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { VideoUpload } from "@/components/video-upload";
import { getProfile, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { VIDEO_BUCKET } from "@/lib/videos";

const THUMBNAIL_URL_TTL_SECONDS = 60 * 60;

export default async function PlayerDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect("/dashboard/coach");

  const videos = await prisma.playerVideo.findMany({
    where: {
      playerId: user.id,
      status: PlayerVideoStatus.READY,
    },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    select: {
      createdAt: true,
      id: true,
      originalFilename: true,
      sizeBytes: true,
      thumbnailPath: true,
      uploadedAt: true,
    },
  });

  const thumbnailPaths = videos.flatMap((video) => video.thumbnailPath ?? []);
  const { data: signedThumbnails } = thumbnailPaths.length
    ? await createSupabaseAdminClient()
        .storage.from(VIDEO_BUCKET)
        .createSignedUrls(thumbnailPaths, THUMBNAIL_URL_TTL_SECONDS)
    : { data: null };
  const thumbnailUrlByPath = new Map(
    (signedThumbnails ?? [])
      .filter((signed) => !signed.error && signed.path)
      .map((signed) => [signed.path, signed.signedUrl]),
  );

  return (
    <PageShell>
      <PageHeader
        subtitle="Upload footage of your batting, bowling, and fielding for coaches and scouts to see."
        title="Your videos"
      />
      <div className="grid gap-5">
        <VideoUpload />
        <VideoGrid
          videos={videos.map((video) => ({
            ...video,
            thumbnailUrl: video.thumbnailPath
              ? (thumbnailUrlByPath.get(video.thumbnailPath) ?? null)
              : null,
          }))}
        />
      </div>
    </PageShell>
  );
}
