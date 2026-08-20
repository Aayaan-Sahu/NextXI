import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageThread } from "@/components/messaging";
import { getProfile, requireUser } from "@/lib/auth";
import { getThread } from "@/lib/messages";

type Params = Promise<{ connectionId: string }>;

export default async function ThreadPage({ params }: { params: Params }) {
  const user = await requireUser();
  const { connectionId } = await params;

  const thread = await getThread(user.id, connectionId);
  if (!thread) redirect("/dashboard/messages");

  // Your own name, not "You": the thread groups by speaker, and one row
  // labelled differently from every other breaks that reading.
  const profile = await getProfile(user.id);
  const fullName =
    profile.role === "player"
      ? profile.player.name
      : profile.role === "coach"
        ? profile.coach.name
        : profile.role === "guardian"
          ? profile.guardian.name
          : "You";
  const selfName = fullName.split(" ")[0] || fullName;

  const role = thread.counterpart.role;
  const subtitle = [
    thread.counterpart.username ? `@${thread.counterpart.username}` : null,
    role ? role.charAt(0).toUpperCase() + role.slice(1) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <header className="border-b border-cream-400 px-4 py-[18px] md:px-6">
        <div className="flex items-center gap-3">
          <Link
            aria-label="Back to conversations"
            className="-ml-2.5 flex size-9 shrink-0 items-center justify-center rounded-full text-title text-ink-900 no-underline active:bg-cream-200 md:hidden"
            href="/dashboard/messages"
          >
            ←
          </Link>
          <div className="min-w-0">
            {/* The page h1 below md: the layout header (and its "Messages"
                heading) is display:none there, so this is the only heading. */}
            <h1 className="truncate text-body font-semibold text-ink-900">
              {thread.counterpart.name}
            </h1>
            {subtitle ? (
              <p className="mt-[3px] truncate text-caption text-ink-600">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </header>
      <MessageThread
        connectionId={connectionId}
        counterpartName={thread.counterpart.name}
        counterpartRole={thread.counterpart.role}
        currentUserId={user.id}
        initialMessages={thread.messages}
        selfName={selfName}
      />
    </>
  );
}
