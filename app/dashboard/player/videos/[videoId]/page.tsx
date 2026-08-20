import { notFound } from "next/navigation";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import { deleteVideo } from "@/app/dashboard/player/videos/actions";
import { VideoDetail } from "@/components/video-detail";
import { requireUser } from "@/lib/auth";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const user = await requireUser();
  const { videoId } = await params;

  if (!isUuid(videoId)) notFound();

  return (
    <VideoDetail
      backHref="/dashboard/player"
      deleteAction={deleteVideo}
      sessionLinkBase="/dashboard/player/sessions"
      where={{
        id: videoId,
        playerId: user.id,
        status: PlayerVideoStatus.READY,
      }}
    />
  );
}
