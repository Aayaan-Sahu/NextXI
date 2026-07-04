import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { Badge, PageHeader, PageShell } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { hasAcceptedConnection } from "@/lib/connections";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { getReadyVideoGridItems } from "@/lib/videos.server";

export default async function CoachPlayerVideosPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "coach") redirect(`/dashboard/${profile.role}`);
  if (profile.coach.status !== CoachStatus.APPROVED) redirect("/dashboard/coach");

  const { playerId } = await params;

  if (!isUuid(playerId) || !(await hasAcceptedConnection(user.id, playerId))) notFound();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { name: true, roles: true },
  });

  if (!player) notFound();

  const videos = await getReadyVideoGridItems(playerId);

  return (
    <PageShell>
      <Link
        className="mb-4 inline-block text-sm text-neutral-950 underline-offset-2 hover:underline"
        href="/dashboard/coach"
      >
        ← Dashboard
      </Link>
      <PageHeader
        subtitle="All of this player's videos, including ones you have already reviewed."
        title={player.name}
      />
      {player.roles.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {player.roles.map((role) => (
            <Badge key={role}>{PLAYER_ROLE_LABELS[role]}</Badge>
          ))}
        </div>
      )}
      <VideoGrid
        emptyMessage="This player has not uploaded any videos yet."
        linkBase="/dashboard/coach/videos"
        videos={videos}
      />
    </PageShell>
  );
}
