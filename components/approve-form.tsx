"use client";

import { useState } from "react";
import { approveReport } from "@/app/dashboard/coach/videos/actions";
import { SubmitButton } from "@/components/submit-button";
import { Field, FieldHint, Form, GhostButton, PrimaryButton, TextArea } from "@/components/ui";
import { MAX_COACH_NOTE_LENGTH } from "@/lib/report-review";

/**
 * The approve form with an inline second step. Approval is irreversible from
 * the coach's side but it is a positive act, so it gets a confirming row in
 * place rather than the maroon ConfirmDialog (that dialog is for loss), and
 * the note being signed stays in view while they decide.
 */
export function ApproveForm({ playerName, videoId }: { playerName: string; videoId: string }) {
  const [confirming, setConfirming] = useState(false);
  const first = playerName.split(" ")[0] || playerName;

  return (
    <Form action={approveReport}>
      <input name="videoId" type="hidden" value={videoId} />
      <Field>
        Note for {first}
        <TextArea
          maxLength={MAX_COACH_NOTE_LENGTH}
          name="note"
          placeholder="One line they'll read under your name…"
          rows={3}
        />
        <FieldHint>
          Optional, up to {MAX_COACH_NOTE_LENGTH} characters. Shown on the report under your name.
        </FieldHint>
      </Field>
      {confirming ? (
        <div className="grid gap-3">
          <p className="text-caption leading-relaxed text-ink-800">
            This publishes the report and your notes to {first} and their guardian. It can&apos;t
            be undone.
          </p>
          <div className="flex flex-wrap justify-end gap-2.5">
            <GhostButton onClick={() => setConfirming(false)} type="button">
              Keep reviewing
            </GhostButton>
            <SubmitButton autoFocus>Approve and publish</SubmitButton>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <PrimaryButton onClick={() => setConfirming(true)} type="button">
            Approve report
          </PrimaryButton>
        </div>
      )}
    </Form>
  );
}
