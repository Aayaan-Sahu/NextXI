import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { PersonAvatar } from "@/components/connections";
import { GuardianChildSwitcher } from "@/components/guardian-child-switcher";
import { EmptyState, PageShell, TextLink, PageTitle } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getChildConversations, getGuardianChildren, selectChild } from "@/lib/guardian";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{ child?: string | string[] }>;

function formatLastMessageAt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function GuardianMessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "guardian") redirect(`/dashboard/${profile.role}`);

  const children = await getGuardianChildren(user.id);
  const child = selectChild(children, firstParam((await searchParams).child));

  if (!child) redirect("/dashboard/guardian");

  const conversations = await getChildConversations(user.id, child.id);
  const threadCount = conversations?.length ?? 0;

  const firstName = child.name.split(" ")[0] || child.name;

  return (
    <PageShell>
      <DashboardReveal className="grid gap-6">
        <DashboardRevealItem index={0}>
          <TextLink className="text-ui" href={`/dashboard/guardian?child=${child.id}`}>
            ← Dashboard
          </TextLink>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <PageTitle>Messages</PageTitle>
              <p className="mt-1.5 text-ui text-ink-600">
                A read-only view of {firstName}&apos;s conversations · {threadCount} thread
                {threadCount === 1 ? "" : "s"} · read only
              </p>
            </div>
            <GuardianChildSwitcher
              basePath="/dashboard/guardian/messages"
              players={children}
              selectedId={child.id}
            />
          </div>
        </DashboardRevealItem>

        <DashboardRevealItem className="max-w-[640px]" index={1}>
          {conversations?.length ? (
            <ul className="border-t border-cream-400 bg-cream-100 p-2">
              {conversations.map((conversation) => (
                <li key={conversation.connectionId}>
                  <Link
                    className="flex gap-3 rounded-lg p-3 no-underline hover:bg-cream-50"
                    href={`/dashboard/guardian/messages/${conversation.connectionId}?child=${child.id}`}
                  >
                    <PersonAvatar
                      name={conversation.counterpart.name}
                      role={conversation.counterpart.role}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2">
                        <span className="truncate text-ui font-semibold text-ink-900">
                          {conversation.counterpart.name}
                        </span>
                        {conversation.lastMessage ? (
                          <span className="shrink-0 text-caption text-ink-600">
                            {formatLastMessageAt(conversation.lastMessage.createdAt)}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-caption text-ink-600">
                        {conversation.lastMessage
                          ? `${conversation.lastMessage.fromMe ? `${firstName}: ` : ""}${conversation.lastMessage.body}`
                          : "No messages yet."}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>
              No conversations yet. People {firstName} connects with will appear here.
            </EmptyState>
          )}
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}
