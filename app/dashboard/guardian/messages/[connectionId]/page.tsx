import { redirect } from "next/navigation";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { GuardianMessageThread } from "@/components/guardian-message-thread";
import { PageShell, TextLink } from "@/components/ui";
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

  const firstName = child.name.split(" ")[0] || child.name;

  return (
    <PageShell>
      <DashboardReveal className="max-w-[860px]">
        <DashboardRevealItem index={0}>
          <TextLink
            className="text-ui"
            href={`/dashboard/guardian/messages?child=${child.id}`}
          >
            ← All conversations
          </TextLink>
          <h1 className="mt-3.5 text-body font-semibold text-ink-900">
            {firstName} &amp; {thread.counterpart.name}
          </h1>
          <p className="mt-[3px] text-caption text-ink-600">
            Read-only — only {firstName} can send messages here.
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
        </DashboardRevealItem>

        <DashboardRevealItem className="mt-5" index={1}>
          <GuardianMessageThread childName={child.name} thread={thread} />
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}
