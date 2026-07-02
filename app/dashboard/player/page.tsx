import { redirect } from "next/navigation";
import { ConnectionsPanel } from "@/components/connections";
import { ProfilePanel } from "@/components/profile";
import { Notice, PageHeader, PageShell, SignOutButton } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getConnectionPanelData } from "@/lib/connections";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  connectionError?: string | string[];
  connectionMessage?: string | string[];
}>;

export default async function PlayerDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect("/dashboard/coach");

  const connectionData = await getConnectionPanelData(user.id, "player");
  const params = await searchParams;
  const connectionError = firstParam(params.connectionError);
  const connectionMessage = firstParam(params.connectionMessage);

  return (
    <PageShell>
      <PageHeader
        action={<SignOutButton />}
        subtitle={user.email}
        title={`Welcome ${profile.player.name}, player`}
      />
      <Notice tone="error">{connectionError}</Notice>
      <Notice>{connectionMessage}</Notice>
      <div className="grid gap-5">
        <ProfilePanel profile={profile} />
        <ConnectionsPanel data={connectionData} />
      </div>
    </PageShell>
  );
}
