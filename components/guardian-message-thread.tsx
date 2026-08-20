import { PersonAvatar } from "@/components/connections";
import type { Thread } from "@/lib/messages";

/** Gap between messages after which a timestamp divider is shown. */
const TIME_DIVIDER_GAP_MS = 15 * 60 * 1000;
/** Gap after which a run of messages from one person starts a new group. */
const GROUP_GAP_MS = 5 * 60 * 1000;

function formatDivider(date: Date) {
  const today = new Date().toDateString() === date.toDateString();
  const day = today
    ? "Today"
    : date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return `${day} · ${date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

/**
 * Render-only transcript of a child's conversation for guardian review.
 * The same grouped reading as the child's own thread, minus everything
 * interactive: no composer, no read-receipt marking — a guardian reading here
 * must never alter the child's read state.
 */
export function GuardianMessageThread({
  childName,
  thread,
}: {
  childName: string;
  thread: Thread;
}) {
  const firstName = childName.split(" ")[0] || childName;

  return (
    <div className="overflow-hidden rounded-[10px] border border-cream-400 bg-cream-50">
      <div className="flex flex-col gap-[18px] px-5 py-5 md:px-6">
        {thread.messages.length ? (
          thread.messages.map((message, index) => {
            const previous = thread.messages[index - 1];
            const gap = previous
              ? new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime()
              : Infinity;
            const showDivider = gap > TIME_DIVIDER_GAP_MS;
            const startsGroup =
              showDivider || !previous || previous.fromMe !== message.fromMe || gap > GROUP_GAP_MS;

            return (
              <div className="flex flex-col gap-[18px]" key={message.id}>
                {showDivider ? (
                  <div aria-hidden className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-cream-400" />
                    <span className="text-caption text-ink-600">
                      {formatDivider(new Date(message.createdAt))}
                    </span>
                    <span className="h-px flex-1 bg-cream-400" />
                  </div>
                ) : null}
                <div className={startsGroup ? "flex gap-3" : "-mt-[18px] flex gap-3"}>
                  {startsGroup ? (
                    <PersonAvatar
                      name={message.fromMe ? firstName : thread.counterpart.name}
                      role={message.fromMe ? "player" : thread.counterpart.role}
                      size="sm"
                    />
                  ) : (
                    <span aria-hidden className="w-[34px] shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    {startsGroup ? (
                      <p className="text-ui font-semibold text-ink-900">
                        {message.fromMe ? firstName : thread.counterpart.name}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-body leading-relaxed break-words whitespace-pre-wrap text-ink-900">
                      {message.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-ui text-ink-600">No messages yet in this conversation.</p>
        )}
      </div>
      <p className="border-t border-cream-400 bg-cream-100 px-6 py-4 text-center text-caption text-ink-600">
        Read-only view — opening this never changes {firstName}&apos;s unread count.
      </p>
    </div>
  );
}
