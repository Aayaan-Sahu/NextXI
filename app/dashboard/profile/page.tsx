import { redirect } from "next/navigation";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { DeleteAccountPanel } from "@/components/delete-account";
import { EditCoachProfilePanel, EditPlayerProfilePanel } from "@/components/edit-profile";
import { Notice, PageShell, StatusBand, StatusBoard } from "@/components/ui";
import { getAvatarUrl } from "@/lib/avatars.server";
import { getProfile, isAdmin, requireUser } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  error?: string | string[];
  message?: string | string[];
}>;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role === "guardian") redirect("/dashboard/guardian");

  const params = await searchParams;
  const error = firstParam(params.error);
  const message = firstParam(params.message);
  const avatarUrl = await getAvatarUrl(
    profile.role === "player" ? profile.player.avatarPath : profile.coach.avatarPath,
  );

  // The h1 names the page, not the person: a heading of "Aarav Sharma" leaves
  // a screen-reader user with nothing identifying where they've landed. The
  // identity facts belong in the mono stats line with the rest of the record.
  const displayName =
    profile.role === "player" ? profile.player.name : profile.coach.name;
  const stats = [
    displayName,
    profile.username ? `@${profile.username}` : "No username",
    profile.role === "player" ? "Player" : "Coach",
    user.email ?? "No email",
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-[760px]">
        <DashboardReveal className="grid gap-9">
          <DashboardRevealItem index={0}>
            <StatusBand>
              <StatusBoard
                kicker="PROFILE"
                note="Keep your details current — this is what coaches and connections see."
                stats={stats}
                title="Edit profile"
              />
            </StatusBand>
          </DashboardRevealItem>

          <DashboardRevealItem index={1}>
            <Notice tone="error">{error}</Notice>
            <Notice>{message}</Notice>
            {profile.role === "player" ? (
              <EditPlayerProfilePanel
                avatarUrl={avatarUrl}
                player={profile.player}
                username={profile.username}
              />
            ) : (
              <EditCoachProfilePanel
                avatarUrl={avatarUrl}
                coach={profile.coach}
                username={profile.username}
              />
            )}
            <div className="mt-5">
              <DeleteAccountPanel />
            </div>
          </DashboardRevealItem>
        </DashboardReveal>
      </div>
    </PageShell>
  );
}
