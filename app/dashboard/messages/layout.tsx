import { redirect } from "next/navigation";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { MessagesShell } from "@/components/messages-shell";
import { isAdmin, requireUser } from "@/lib/auth";
import { getConversations } from "@/lib/messages";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const conversations = await getConversations(user.id);

  // The MessagesRealtime provider is mounted by the dashboard layout above,
  // so threads and the nav badge share one websocket subscription.
  return (
    <MessagesShell sidebar={<ConversationSidebar conversations={conversations} />}>
      {children}
    </MessagesShell>
  );
}
