import { redirect } from "next/navigation";
import { DeleteAccountPanel } from "@/components/delete-account";
import { EditCoachProfilePanel, EditPlayerProfilePanel } from "@/components/edit-profile";
import { Notice, PageHeader, PageShell } from "@/components/ui";
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

  return (
    <PageShell>
      <div className="mx-auto max-w-[760px]">
        <PageHeader
          subtitle={<span className="font-mono text-[12.5px]">{user.email}</span>}
          title="Edit profile"
        />
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
      </div>
    </PageShell>
  );
}
