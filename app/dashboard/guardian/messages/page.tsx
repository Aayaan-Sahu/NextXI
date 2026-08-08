import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { GuardianChildSwitcher } from "@/components/guardian-child-switcher";
import {
  EmptyState,
  PageShell,
  Panel,
  StatusBand,
  StatusBoard,
  TextLink,
} from "@/components/ui";
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

  return (
    <PageShell>
      <DashboardReveal className="grid gap-9">
        <DashboardRevealItem index={0}>
          <div className="mb-3">
            <TextLink href={`/dashboard/guardian?child=${child.id}`}>
              ← Dashboard
            </TextLink>
          </div>
          <StatusBand>
            <StatusBoard
              kicker="GUARDIAN MESSAGES"
              note={`A read-only view of ${child.name}'s conversations.`}
              stats={[
                `${threadCount} thread${threadCount === 1 ? "" : "s"}`,
                "Read only",
              ]}
              title="Messages"
            />
          </StatusBand>
        </DashboardRevealItem>

        <DashboardRevealItem index={1}>
          <GuardianChildSwitcher
            basePath="/dashboard/guardian/messages"
            players={children}
            selectedId={child.id}
          />
          <Panel>
            {conversations?.length ? (
              <ul className="divide-y divide-cream-400">
                {conversations.map((conversation) => (
                  <li key={conversation.connectionId}>
                    <Link
                      className="flex items-center gap-3 py-3.5 no-underline hover:bg-cream-50"
                      href={`/dashboard/guardian/messages/${conversation.connectionId}?child=${child.id}`}
                    >
                      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-pitch-800 text-[15px] font-bold text-cream-200">
                        {conversation.counterpart.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink-900">
                          {conversation.counterpart.name}
                          {conversation.counterpart.username ? (
                            <span className="font-mono text-xs font-medium text-ink-600">
                              {" "}
                              @{conversation.counterpart.username}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`block truncate text-[12.5px] ${
                            conversation.lastMessage ? "text-ink-600" : "text-sage-400"
                          }`}
                        >
                          {conversation.lastMessage
                            ? `${conversation.lastMessage.fromMe ? `${child.name}: ` : ""}${conversation.lastMessage.body}`
                            : "No messages yet."}
                        </span>
                      </span>
                      {conversation.lastMessage ? (
                        <span className="shrink-0 font-mono text-[11px] text-ink-600">
                          {formatLastMessageAt(conversation.lastMessage.createdAt)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>
                No conversations yet. People {child.name} connects with will appear here.
              </EmptyState>
            )}
          </Panel>
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}
