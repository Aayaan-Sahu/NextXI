import type { ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";
import { addVideoComment } from "@/app/dashboard/coach/videos/actions";
import { SeekButton } from "@/components/seek-button";
import { TimestampField } from "@/components/timestamp-field";
import { Form, Notice, SectionHeading, TextArea } from "@/components/ui";

export type VideoCommentItem = {
  id: string;
  authorName: string;
  authorUsername: string;
  body: string;
  createdAt: Date;
  /** Where in the clip the note points, when the coach pinned a moment. */
  timestampSec: number | null;
  /** Null while held for the report's sign-off — only a coach's view lists those. */
  publishedAt: Date | null;
};

export const COMMENT_HINT_PUBLISHED =
  "Up to 2000 characters · the player sees this on their own report page.";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function VideoComments({
  comments,
  footnote,
  form,
  title = "Coach feedback",
}: {
  comments: VideoCommentItem[];
  /** The quiet line that explains who is allowed to post here. */
  footnote?: string;
  form?: ReactNode;
  title?: string;
}) {
  return (
    <section>
      {form ? (
        <>
          <SectionHeading>Leave feedback</SectionHeading>
          {form}
          <div className="mt-8" />
        </>
      ) : null}
      <SectionHeading>{form ? "Feedback so far" : title}</SectionHeading>
      {comments.length ? (
        <ul className="mt-3.5">
          {comments.map((comment) => (
            <li
              className="border-t border-cream-400 py-4 first:border-t-0 first:pt-0 last:pb-0"
              key={comment.id}
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-ui font-semibold text-ink-900">{comment.authorName}</span>
                <span className="text-caption text-ink-600">
                  @{comment.authorUsername} · {formatDate(comment.createdAt)}
                  {/* A fact in the meta line, not a badge: during a review every
                      note is held, and the thread shouldn't be about privacy. */}
                  {comment.publishedAt === null ? (
                    <>
                      {" · "}
                      <span className="font-semibold">Hidden until you approve</span>
                    </>
                  ) : null}
                </span>
              </div>
              <p className="mt-1 text-body leading-relaxed whitespace-pre-wrap text-ink-800">
                {comment.timestampSec !== null ? (
                  <SeekButton className="mr-2" t={comment.timestampSec} />
                ) : null}
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 text-ui text-ink-600">No feedback yet.</p>
      )}
      {footnote ? <p className="mt-4 text-caption text-ink-600">{footnote}</p> : null}
    </section>
  );
}

export function CommentForm({
  error,
  hint = COMMENT_HINT_PUBLISHED,
  videoId,
}: {
  error?: string;
  /** What happens to the note — differs while the report awaits sign-off. */
  hint?: string;
  videoId: string;
}) {
  return (
    <div className="mt-3.5">
      <Form action={addVideoComment}>
        <input name="videoId" type="hidden" value={videoId} />
        <TextArea
          aria-label="Leave feedback"
          maxLength={2000}
          name="body"
          placeholder="Leave feedback for this player…"
          required
          rows={4}
        />
        {/* Renders only once the clip's metadata has loaded. */}
        <TimestampField name="timestampSec" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-caption text-ink-600">{hint}</span>
          <SubmitButton>Post feedback</SubmitButton>
        </div>
      </Form>
      <Notice className="mt-3" tone="error">
        {error}
      </Notice>
    </div>
  );
}
