import { redirect } from "next/navigation";
import { CoachDirectory } from "@/components/coach-directory";
import { ConnectionsPanel } from "@/components/connections";
import { Notice, PageHeader, PageShell } from "@/components/ui";
import { isAdmin, requireUser } from "@/lib/auth";
import { getCoachDirectory, getConnectionPanelData } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  connectionError?: string | string[];
  connectionMessage?: string | string[];
  q?: string | string[];
}>;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const params = await searchParams;
  const connectionError = firstParam(params.connectionError);
  const connectionMessage = firstParam(params.connectionMessage);
  const query = firstParam(params.q) ?? "";

  const player = await prisma.player.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  const [connectionData, coaches] = await Promise.all([
    getConnectionPanelData(user.id),
    player ? getCoachDirectory(user.id, query) : Promise.resolve(null),
  ]);

  return (
    <PageShell>
      <PageHeader
        subtitle="Find players and coaches by username and manage your requests."
        title="Connections"
      />
      <Notice tone="error">{connectionError}</Notice>
      <Notice>{connectionMessage}</Notice>
      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        {coaches ? <CoachDirectory coaches={coaches} query={query} /> : null}
        <ConnectionsPanel data={connectionData} />
      </div>
    </PageShell>
  );
}
