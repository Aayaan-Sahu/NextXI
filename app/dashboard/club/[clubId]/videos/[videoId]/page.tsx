import { notFound } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { VideoDetail } from "@/components/video-detail";
import { requireUser, redirectRolelessAdmin } from "@/lib/auth";
import { getClubAccess } from "@/lib/clubs.server";
import { hasAcceptedConnection } from "@/lib/connections";
import { parseClipTime } from "@/lib/format-time";
import { prisma } from "@/lib/prisma";

/**
 * A club watching one of its players' clips. Same page the player sees, with
 * the same gate: an unpublished report reads "With the player's coach", the
 * thread shows only released notes, and there is no sign-off panel — a club
 * never approves a report.
 */
export default async function ClubVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string; videoId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const user = await requireUser();

  await redirectRolelessAdmin(user);

  const [{ clubId, videoId }, { t }] = await Promise.all([params, searchParams]);

  if (!isUuid(clubId) || !isUuid(videoId)) notFound();
  if (!(await getClubAccess(user.id, clubId))) notFound();

  const video = await prisma.playerVideo.findFirst({
    where: { id: videoId, status: PlayerVideoStatus.READY },
    select: { playerId: true, player: { select: { name: true } } },
  });

  if (!video) notFound();
  // The club's own accepted connection is the only key — membership of the
  // club is not one, and neither is a member coach's separate connection.
  if (!(await hasAcceptedConnection(clubId, video.playerId))) notFound();

  return (
    <VideoDetail
      audience="observer"
      backHref={`/dashboard/club/${clubId}/players/${video.playerId}`}
      commentsFootnote="Feedback is between the player and their coaches."
      initialTime={parseClipTime(t)}
      subtitlePrefix={video.player.name}
      where={{ id: videoId, status: PlayerVideoStatus.READY }}
    />
  );
}
