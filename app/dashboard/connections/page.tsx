import { redirect } from "next/navigation";
import { ConnectionsPanel } from "@/components/connections";
import { Notice, PageHeader, PageShell } from "@/components/ui";
import { isAdmin, requireUser } from "@/lib/auth";
import { getConnectionPanelData } from "@/lib/connections";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  connectionError?: string | string[];
  connectionMessage?: string | string[];
}>;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const connectionData = await getConnectionPanelData(user.id);
  const params = await searchParams;
  const connectionError = firstParam(params.connectionError);
  const connectionMessage = firstParam(params.connectionMessage);

  return (
    <PageShell>
      <PageHeader
        subtitle="Find players and coaches by username and manage your requests."
        title="Connections"
      />
      <Notice tone="error">{connectionError}</Notice>
      <Notice>{connectionMessage}</Notice>
      <ConnectionsPanel data={connectionData} />
    </PageShell>
  );
}
