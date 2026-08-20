import type { ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";
import { addVideoComment } from "@/app/dashboard/coach/videos/actions";
import { Form, Notice, SectionHeading, TextArea } from "@/components/ui";

export type VideoCommentItem = {
  id: string;
  authorName: string;
  authorUsername: string;
  body: string;
  createdAt: Date;
};

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
                </span>
              </div>
              <p className="mt-1 text-body leading-relaxed whitespace-pre-wrap text-ink-800">
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

export function CommentForm({ error, videoId }: { error?: string; videoId: string }) {
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-caption text-ink-600">
            Up to 2000 characters · the player sees this on their own report page.
          </span>
          <SubmitButton>Post feedback</SubmitButton>
        </div>
      </Form>
      <Notice className="mt-3" tone="error">
        {error}
      </Notice>
    </div>
  );
}
