import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, PageShell, Panel, SignOutButton } from "@/components/ui";
import { isAdmin, requireUser } from "@/lib/auth";
import { getConversations } from "@/lib/messages";

export default async function MessagesPage() {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const conversations = await getConversations(user.id);

  return (
    <PageShell>
      <PageHeader action={<SignOutButton />} subtitle={user.email} title="Messages" />
      <Link
        className="mb-4 inline-block text-sm text-neutral-950 underline-offset-2 hover:underline dark:text-neutral-50"
        href="/dashboard"
      >
        ← Back to dashboard
      </Link>

      <Panel title="Conversations">
        {conversations.length ? (
          <ul className="grid gap-1">
            {conversations.map((conversation) => (
              <li key={conversation.connectionId}>
                <Link
                  className="flex items-center justify-between gap-3 rounded-md border border-stone-300 bg-white px-3 py-3 no-underline hover:bg-stone-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  href={`/dashboard/messages/${conversation.connectionId}`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-neutral-950 dark:text-neutral-50">
                      {conversation.counterpart.name}
                      {conversation.counterpart.username ? (
                        <span className="font-normal text-stone-600 dark:text-neutral-300">
                          {" "}
                          @{conversation.counterpart.username}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-sm text-stone-600 dark:text-neutral-300">
                      {conversation.lastMessage
                        ? `${conversation.lastMessage.fromMe ? "You: " : ""}${conversation.lastMessage.body}`
                        : "No messages yet."}
                    </span>
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-neutral-950 px-2 py-0.5 text-xs font-semibold text-white dark:bg-neutral-50 dark:text-neutral-950">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-600 dark:text-neutral-300">
            No conversations yet. Connect with someone to start messaging.
          </p>
        )}
      </Panel>
    </PageShell>
  );
}
