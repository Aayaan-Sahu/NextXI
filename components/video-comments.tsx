import type { ReactNode } from "react";
import { addVideoComment } from "@/app/dashboard/coach/videos/actions";
import { Form, Notice, Panel, PrimaryButton, TextArea } from "@/components/ui";

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
    <Panel title="Feedback">
      {comments.length ? (
        <ul className="grid gap-4">
          {comments.map((comment) => (
            <li className="grid gap-1 border-t border-stone-200 pt-3 first:border-t-0 first:pt-0" key={comment.id}>
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium text-neutral-950">{comment.authorName}</span>
                <span className="text-stone-600">@{comment.authorUsername}</span>
                <span className="text-xs text-stone-600">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-950">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">No feedback yet.</p>
      )}
      {form}
    </Panel>
  );
}

export function CommentForm({ error, videoId }: { error?: string; videoId: string }) {
  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
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
