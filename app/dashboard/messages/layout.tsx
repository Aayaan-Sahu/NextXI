import { redirect } from "next/navigation";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { MessagesRealtime } from "@/components/messages-realtime";
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
      <main className="flex h-[calc(100dvh-4rem)] w-full">
        <ConversationSidebar conversations={conversations} />
        <section className="flex min-w-0 flex-1 flex-col bg-cream-200">{children}</section>
      </main>
    </MessagesRealtime>
  );
}
