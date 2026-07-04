import { redirect } from "next/navigation";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import { Badge, PageHeader, PageShell, Panel } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { VideoUpload } from "@/components/video-upload";
import { getProfile, requireUser } from "@/lib/auth";
import { formatGuardianCode } from "@/lib/guardian-code";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import { getReadyVideoGridItems } from "@/lib/videos.server";

export default async function PlayerDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect(`/dashboard/${profile.role}`);

  if (profile.player.status === PlayerStatus.PENDING_GUARDIAN) {
    return (
      <PageShell>
        <PageHeader subtitle={user.email} title={`Welcome ${profile.player.name}`} />
        <Panel title="Guardian approval needed">
          <p className="text-sm text-stone-600">
            Because you&apos;re under 18, a parent or guardian needs to approve your
            account before you can use the platform. Ask them to sign up, choose
            &ldquo;I&apos;m a parent / guardian&rdquo;, and enter this code:
          </p>
          <p className="mt-4 font-mono text-2xl tracking-widest text-neutral-950">
            {formatGuardianCode(profile.player.guardianCode ?? "")}
          </p>
        </Panel>
      </PageShell>
    );
  }

  const videos = await getReadyVideoGridItems(user.id);

  return (
    <PageShell>
      <PageHeader
        subtitle="Upload footage of your batting, bowling, and fielding for coaches and scouts to see."
        title="Your videos"
      />
      <div className="grid gap-5">
        {profile.player.roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.player.roles.map((role) => (
              <Badge key={role}>{PLAYER_ROLE_LABELS[role]}</Badge>
            ))}
          </div>
        )}
        <VideoUpload />
        <VideoGrid videos={videos} />
      </div>
    </PageShell>
  );
}
