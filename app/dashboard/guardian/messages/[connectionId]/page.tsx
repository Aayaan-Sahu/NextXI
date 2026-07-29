import Link from "next/link";
import { redirect } from "next/navigation";
import { GuardianMessageThread } from "@/components/guardian-message-thread";
import { PageHeader, PageShell } from "@/components/ui";
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
      <Link
        className="inline-block text-[13px] font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
        href={`/dashboard/guardian/messages?child=${child.id}`}
      >
        ← All conversations
      </Link>
      <div className="mt-[18px]">
        <PageHeader
          subtitle={
            <>
              {subtitle ? (
                <span className="font-mono text-[11.5px] text-ink-600">{subtitle}</span>
              ) : null}
              {subtitle ? " — " : null}A read-only view of {child.name}&apos;s
              conversation. Only {child.name} can send messages here.
            </>
          }
          title={`${child.name} & ${thread.counterpart.name}`}
        />
      </div>
      <GuardianMessageThread childName={child.name} thread={thread} />
    </PageShell>
  );
}
