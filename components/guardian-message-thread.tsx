import type { Thread } from "@/lib/messages";

/** Gap between messages after which a timestamp divider is shown. */
const TIME_DIVIDER_GAP_MS = 15 * 60 * 1000;

function formatDivider(date: Date) {
  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

/**
 * Render-only transcript of a child's conversation for guardian review.
 * Mirrors MessageThread's bubbles minus everything interactive: no composer,
 * no read-receipt marking — a guardian reading here must never alter the
 * child's own read state. The child's messages sit on the right, exactly as
 * the child sees them.
 */
export function GuardianMessageThread({
  childName,
  thread,
}: {
  childName: string;
  thread: Thread;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-cream-400 bg-cream-200 p-4 md:p-6">
      {thread.messages.length ? (
        thread.messages.map((message, index) => {
          const previous = thread.messages[index - 1];
          const showDivider =
            !previous ||
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() >
              TIME_DIVIDER_GAP_MS;
          const showName = !previous || previous.fromMe !== message.fromMe;

          return (
            <div className="flex flex-col gap-3" key={message.id}>
              {showDivider ? (
                <p className="my-1 text-center font-mono text-[11px] text-sage-400">
                  {formatDivider(new Date(message.createdAt))}
                </p>
              ) : null}
              <div
                className={
                  message.fromMe
                    ? "max-w-[85%] self-end text-right md:max-w-[60%]"
                    : "max-w-[85%] self-start md:max-w-[60%]"
                }
              >
                {showName ? (
                  <p className="mb-1 font-mono text-[10.5px] text-ink-600">
                    {message.fromMe ? childName : thread.counterpart.name}
                  </p>
                ) : null}
                <div
                  className={
                    message.fromMe
                      ? "inline-block rounded-[14px] rounded-br-[4px] bg-rust-600 px-3.5 py-2.5 text-left text-sm leading-[1.55] text-cream-200"
                      : "inline-block rounded-[14px] rounded-bl-[4px] border border-cream-400 bg-cream-100 px-3.5 py-2.5 text-left text-sm leading-[1.55] text-ink-900"
                  }
                  title={formatDivider(new Date(message.createdAt))}
                >
                  <p className="m-0 break-words whitespace-pre-wrap">{message.body}</p>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-ink-600">No messages yet in this conversation.</p>
      )}
    </div>
  );
}
