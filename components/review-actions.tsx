import { holdReport } from "@/app/dashboard/coach/videos/actions";
import { ApproveForm } from "@/components/approve-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, FieldHint, Form, Notice, Panel, TextArea } from "@/components/ui";
import { relativeTime } from "@/lib/format-time";
import { MAX_HOLD_REASON_LENGTH } from "@/lib/report-review";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * The coach's sign-off panel, above the report they are reviewing: where it
 * stands, the approve form, and — folded away — the hold form. Rendered only
 * for a connected coach on a delivered, unpublished report.
 */
export function ReviewActions({
  videoId,
  playerName,
  reviewStatus,
  reportReadyAt,
  hold,
  error,
}: {
  videoId: string;
  playerName: string;
  reviewStatus: "AWAITING_REVIEW" | "HELD";
  reportReadyAt: Date;
  hold?: { reason: string; byName: string | null; bySelf: boolean; at: Date | null } | null;
  error?: string;
}) {
  const first = playerName.split(" ")[0] || playerName;
  const held = reviewStatus === "HELD" && hold;

  return (
    <Panel title="Sign-off">
      <p className="text-caption text-ink-600">
        {held
          ? `On hold · ${hold.bySelf ? "you" : (hold.byName ?? "a coach")}${
              hold.at ? ` · ${formatDate(hold.at)}` : ""
            }`
          : `Awaiting your approval · report ready ${relativeTime(reportReadyAt)}`}
      </p>
      {held ? <p className="mt-1.5 line-clamp-3 text-ui text-ink-800">{hold.reason}</p> : null}
      <p className="mt-3 text-ui leading-relaxed text-ink-800">
        Nothing reaches {first} until you approve — not the report, not your notes.
      </p>
      <div className="mt-4">
        <ApproveForm playerName={playerName} videoId={videoId} />
      </div>
      {held ? null : (
        <details className="mt-5 border-t border-cream-400 pt-4">
          <summary className="cursor-pointer text-caption font-semibold text-rust-600">
            Not ready to sign off?
          </summary>
          <Form action={holdReport} className="mt-3">
            <input name="videoId" type="hidden" value={videoId} />
            <Field>
              Why it&apos;s on hold
              <TextArea maxLength={MAX_HOLD_REASON_LENGTH} name="reason" required rows={3} />
              <FieldHint>
                Coaches see this. The player sees &ldquo;With your coach&rdquo; until you approve.
              </FieldHint>
            </Field>
            <div className="flex justify-end">
              {/* Secondary, not maroon: a hold is "not yet", nothing is lost. */}
              <SubmitButton variant="secondary">Hold report</SubmitButton>
            </div>
          </Form>
        </details>
      )}
      <Notice className="mt-3" tone="error">
        {error}
      </Notice>
    </Panel>
  );
}
