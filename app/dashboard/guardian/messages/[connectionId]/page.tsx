import { redirect } from "next/navigation";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { GuardianMessageThread } from "@/components/guardian-message-thread";
import {
  Kicker,
  PageShell,
  StatusBand,
  StatusBoard,
  TextLink,
} from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getChildThread, getGuardianChildren, selectChild } from "@/lib/guardian";
import { firstParam } from "@/lib/search-params";

type Params = Promise<{ connectionId: string }>;
type SearchParams = Promise<{ child?: string | string[] }>;

export default async function GuardianThreadPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "guardian") redirect(`/dashboard/${profile.role}`);

  const { connectionId } = await params;
  const children = await getGuardianChildren(user.id);
  const child = selectChild(children, firstParam((await searchParams).child));

  if (!child) redirect("/dashboard/guardian");

  const thread = await getChildThread(user.id, child.id, connectionId);
  if (!thread) redirect(`/dashboard/guardian/messages?child=${child.id}`);

  const role = thread.counterpart.role;
  const subtitle = [
    thread.counterpart.username ? `@${thread.counterpart.username}` : null,
    role ? role.charAt(0).toUpperCase() + role.slice(1) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell>
      <DashboardReveal className="grid gap-9">
        <DashboardRevealItem index={0}>
          <div className="mb-3">
            <TextLink href={`/dashboard/guardian/messages?child=${child.id}`}>
              ← All conversations
            </TextLink>
          </div>
          <StatusBand>
            <StatusBoard
              kicker="GUARDIAN THREAD"
              note={`Read-only — only ${child.name} can send messages here.`}
              stats={subtitle ? [subtitle, "Read only"] : ["Read only"]}
              title={`${child.name} & ${thread.counterpart.name}`}
            />
          </StatusBand>
        </DashboardRevealItem>

        <DashboardRevealItem index={1}>
          <div className="mb-3">
            <Kicker>Conversation</Kicker>
          </div>
          <GuardianMessageThread childName={child.name} thread={thread} />
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}
