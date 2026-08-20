"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDialog, DialogActions, GhostButton } from "@/components/ui";

/**
 * Confirm before a destructive action on a video card. The trigger is a word
 * on the thumbnail, not a glyph — the system has no icon vocabulary.
 */
export function ConfirmDeleteButton({
  action,
  description,
  id,
  label,
  name,
  redirectTo,
  title,
  variant = "overlay",
}: {
  action: (formData: FormData) => Promise<void>;
  description: string;
  id: string;
  label: string;
  name: string;
  /** Where to land afterwards — required when deleting from the item's own page. */
  redirectTo?: string;
  title: string;
  /** `overlay` rides a thumbnail; `text` sits in a page header as an action. */
  variant?: "overlay" | "text";
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        aria-label={`${label} ${name}`}
        className={
          variant === "text"
            ? "cursor-pointer text-ui font-semibold text-rust-600 hover:text-rust-700"
            : "cursor-pointer rounded bg-pitch-900/[.82] px-[7px] py-[3px] text-micro font-semibold text-cream-200 hover:bg-rust-600"
        }
        onClick={() => setConfirming(true)}
        type="button"
      >
        {label}
      </button>
      {confirming ? (
        <ConfirmDialog
          description={description}
          onDismiss={() => setConfirming(false)}
          title={title}
        >
          <DialogActions>
            <GhostButton onClick={() => setConfirming(false)} type="button">
              Cancel
            </GhostButton>
            <form action={action}>
              <input name="id" type="hidden" value={id} />
              {redirectTo ? <input name="redirectTo" type="hidden" value={redirectTo} /> : null}
              <SubmitButton variant="danger">{label}</SubmitButton>
            </form>
          </DialogActions>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
