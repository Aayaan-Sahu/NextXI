import { redirect } from "next/navigation";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { MessagesRealtime } from "@/components/messages-realtime";
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

  return (
    <MessagesRealtime connectionIds={conversations.map((c) => c.connectionId)}>
      <MessagesShell sidebar={<ConversationSidebar conversations={conversations} />}>
        {children}
      </MessagesShell>
    </MessagesRealtime>
  );
}
