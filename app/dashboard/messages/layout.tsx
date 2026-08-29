import { ConversationSidebar } from "@/components/conversation-sidebar";
import { MessagesShell } from "@/components/messages-shell";
import { PageTitle } from "@/components/ui";
import { requireUser, redirectRolelessAdmin } from "@/lib/auth";
import { getConversations } from "@/lib/messages";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  await redirectRolelessAdmin(user);

  const conversations = await getConversations(user.id);
  const unreadTotal = conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0,
  );
  const stats = [
    `${conversations.length} thread${conversations.length === 1 ? "" : "s"}`,
    unreadTotal > 0
      ? `${unreadTotal} unread`
      : conversations.length
        ? "all caught up"
        : "no threads yet",
  ];

  // The MessagesRealtime provider is mounted by the dashboard layout above,
  // so threads and the nav badge share one websocket subscription.
  return (
    <MessagesShell
      header={
        <>
          <PageTitle>Messages</PageTitle>
          <p className="mt-1.5 text-ui text-ink-600">{stats.join(" · ")}</p>
        </>
      }
      sidebar={<ConversationSidebar conversations={conversations} />}
    >
      {children}
    </MessagesShell>
  );
}
