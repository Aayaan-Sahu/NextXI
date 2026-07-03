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
      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-6 py-8">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-stone-300 bg-white">
          <ConversationSidebar conversations={conversations} />
          <section className="flex min-w-0 flex-1 flex-col">{children}</section>
        </div>
      </main>
    </MessagesRealtime>
  );
}
