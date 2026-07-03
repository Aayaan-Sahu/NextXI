import { redirect } from "next/navigation";
import { CoachStatus, PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { CoachVideos } from "@/components/coach-videos";
import { PageHeader, PageShell, Panel } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getAcceptedCounterpartIds } from "@/lib/connections";
import { prisma } from "@/lib/prisma";

export default async function CoachDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "coach") redirect("/dashboard/player");

  if (profile.coach.status !== CoachStatus.APPROVED) {
    const rejected = profile.coach.status === CoachStatus.REJECTED;

    return (
      <PageShell>
        <PageHeader subtitle={user.email} title={`Welcome ${profile.coach.name}, coach`} />
        <Panel title={rejected ? "Account not approved" : "Account under review"}>
          <p className="text-sm text-stone-600 dark:text-neutral-300">
            {rejected
              ? "Your coach account was not approved. If you believe this is a mistake, please contact support."
              : "Thanks for signing up. To keep the platform safe for young athletes, an administrator reviews every coach before activation. You'll gain full access once you're approved."}
          </p>
        </Panel>
      </PageShell>
    );
  }

  const connectedPlayerIds = await getAcceptedCounterpartIds(user.id);
  const videos = await prisma.playerVideo.findMany({
    where: {
      status: PlayerVideoStatus.READY,
      playerId: { in: connectedPlayerIds },
    },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      originalFilename: true,
      player: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <PageShell>
      <PageHeader
        subtitle="Videos from players you are connected with."
        title={`Welcome ${profile.coach.name}, coach`}
      />
      <CoachVideos videos={videos} />
    </PageShell>
  );
}
