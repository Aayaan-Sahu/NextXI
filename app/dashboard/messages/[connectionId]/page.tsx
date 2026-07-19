import Link from "next/link";
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

  const role = thread.counterpart.role;
  const subtitle = [
    thread.counterpart.username ? `@${thread.counterpart.username}` : null,
    role ? role.charAt(0).toUpperCase() + role.slice(1) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <header className="flex items-center gap-3 border-b border-cream-400 bg-cream-100 px-4 py-3.5 md:px-6">
        <Link
          aria-label="Back to conversations"
          className="-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-lg text-ink-900 no-underline active:bg-cream-200 md:hidden"
          href="/dashboard/messages"
        >
          ←
        </Link>
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-pitch-900 text-[15px] font-bold text-gold-500">
          {thread.counterpart.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] leading-tight font-bold">
            {thread.counterpart.name}
          </p>
          {subtitle ? (
            <p className="truncate font-mono text-[11.5px] text-ink-600">{subtitle}</p>
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
