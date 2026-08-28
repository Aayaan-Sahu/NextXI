import { notFound } from "next/navigation";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import { deleteVideo } from "@/app/dashboard/player/videos/actions";
import { VideoDetail } from "@/components/video-detail";
import { requireUser } from "@/lib/auth";
import { parseClipTime } from "@/lib/format-time";

export default async function VideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const user = await requireUser();
  const [{ videoId }, { t }] = await Promise.all([params, searchParams]);

  if (!isUuid(videoId)) notFound();

  return (
    <VideoDetail
      backHref="/dashboard/player"
      deleteAction={deleteVideo}
      initialTime={parseClipTime(t)}
      sessionLinkBase="/dashboard/player/sessions"
      where={{
        id: videoId,
        playerId: user.id,
        status: PlayerVideoStatus.READY,
      }}
    />
  );
}
