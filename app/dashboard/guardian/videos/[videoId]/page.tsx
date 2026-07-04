import { notFound } from "next/navigation";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import { VideoDetail } from "@/components/video-detail";
import { requireUser } from "@/lib/auth";

export default async function GuardianVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const user = await requireUser();
  const { videoId } = await params;

  if (!isUuid(videoId)) notFound();

  return (
    <VideoDetail
      backHref="/dashboard/guardian"
      where={{
        id: videoId,
        player: { guardianId: user.id },
        status: PlayerVideoStatus.READY,
      }}
    />
  );
}
