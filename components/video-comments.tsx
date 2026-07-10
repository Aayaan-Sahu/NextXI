import type { ReactNode } from "react";
import { addVideoComment } from "@/app/dashboard/coach/videos/actions";
import { Form, Kicker, Notice, Panel, PrimaryButton, TextArea } from "@/components/ui";

export type VideoCommentItem = {
  id: string;
  authorName: string;
  authorUsername: string;
  body: string;
  createdAt: Date;
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function VideoComments({
  comments,
  form,
}: {
  comments: VideoCommentItem[];
  form?: ReactNode;
}) {
  return (
    <Panel>
      <Kicker>Feedback</Kicker>
      {comments.length ? (
        <ul className="mt-4 grid gap-[18px]">
          {comments.map((comment) => (
            <li
              className="border-t border-cream-400 pt-[18px] first:border-t-0 first:pt-0"
              key={comment.id}
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-bold text-ink-900">{comment.authorName}</span>
                <span className="font-mono text-xs text-ink-600">@{comment.authorUsername}</span>
                <span className="text-xs text-sage-400">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm leading-[1.65] whitespace-pre-wrap text-ink-900">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-600">No feedback yet.</p>
      )}
      {form}
    </Panel>
  );
}

export function CommentForm({ error, videoId }: { error?: string; videoId: string }) {
  return (
    <div className="mt-4 border-t border-cream-400 pt-4">
      <Notice tone="error">{error}</Notice>
      <Form action={addVideoComment} className={error ? "mt-4" : ""}>
        <input name="videoId" type="hidden" value={videoId} />
        <TextArea
          aria-label="Leave feedback"
          maxLength={2000}
          name="body"
          placeholder="Leave feedback for this player…"
          required
          rows={4}
        />
        <PrimaryButton type="submit">Post feedback</PrimaryButton>
      </Form>
    </div>
  );
}
