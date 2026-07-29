import { notFound } from "next/navigation";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import { VideoDetail } from "@/components/video-detail";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GuardianVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const user = await requireUser();
  const { videoId } = await params;

  if (!isUuid(videoId)) notFound();

  const where = {
    id: videoId,
    player: { guardianId: user.id },
    status: PlayerVideoStatus.READY,
  };

  // "Back" returns to the dashboard with this video's child selected, so a
  // guardian with several linked children lands on the right one.
  const video = await prisma.playerVideo.findFirst({ where, select: { playerId: true } });
  if (!video) notFound();

  return (
    <VideoDetail backHref={`/dashboard/guardian?child=${video.playerId}`} where={where} />
  );
}
