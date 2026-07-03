import { redirect } from "next/navigation";
import { MessageThread } from "@/components/messaging";
import { requireUser } from "@/lib/auth";
import { getThread } from "@/lib/messages";

type Params = Promise<{ connectionId: string }>;

export default async function ThreadPage({ params }: { params: Params }) {
  const user = await requireUser();
  const { connectionId } = await params;

  const thread = await getThread(user.id, connectionId);
  if (!thread) redirect("/dashboard/messages");

  const subtitle = [
    thread.counterpart.username ? `@${thread.counterpart.username}` : null,
    thread.counterpart.role,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <header className="flex items-center gap-3 border-b border-stone-300 px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
          {thread.counterpart.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {thread.counterpart.name}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-stone-600">{subtitle}</p>
          ) : null}
        </div>
      </header>
      <MessageThread
        connectionId={connectionId}
        currentUserId={user.id}
        initialMessages={thread.messages}
      />
    </>
  );
}
