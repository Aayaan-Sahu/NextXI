import { notFound } from "next/navigation";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import { VideoDetail } from "@/components/video-detail";
import { requireUser } from "@/lib/auth";
import { parseClipTime } from "@/lib/format-time";
import { prisma } from "@/lib/prisma";

export default async function GuardianVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const user = await requireUser();
  const [{ videoId }, { t }] = await Promise.all([params, searchParams]);

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
    <VideoDetail
      backHref={`/dashboard/guardian?child=${video.playerId}`}
      initialTime={parseClipTime(t)}
      where={where}
    />
  );
}
