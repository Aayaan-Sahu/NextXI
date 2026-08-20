"use client";

import { useState } from "react";
import { deleteAccount } from "@/app/dashboard/profile/actions";
import { SubmitButton } from "@/components/submit-button";
import {
  ConfirmDialog,
  DestructiveButton,
  DialogActions,
  Field,
  GhostButton,
  SectionHeading,
  TextInput,
} from "@/components/ui";

/**
 * The account-deletion section on /dashboard/profile: a quiet trigger and a
 * dialog that requires typing DELETE before the destructive server action can
 * run (the server re-checks the typed confirmation).
 */
export function DeleteAccountPanel() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  return (
    <section>
      <SectionHeading>Delete account</SectionHeading>
      <p className="mt-2 text-caption leading-relaxed text-ink-600">
        Immediate and permanent. Videos, reports, comments, messages and connections all go.
      </p>
      <DestructiveButton
        className="mt-3 !px-[18px] !py-2.5 !text-ui"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Delete my account
      </DestructiveButton>
      {confirming ? (
        <ConfirmDialog
          description="This happens immediately and can't be undone. Your videos, coaching reports, coach comments, messages and connections are all removed."
          onDismiss={() => setConfirming(false)}
          title="Delete your account?"
        >
          <form action={deleteAccount}>
            <Field className="mt-5">
              Type DELETE to confirm
              <TextInput
                autoComplete="off"
                className="font-semibold tracking-[.14em]"
                name="confirm"
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="DELETE"
                required
                type="text"
                value={confirmText}
              />
            </Field>
            <DialogActions>
              <GhostButton onClick={() => setConfirming(false)} type="button">
                Cancel
              </GhostButton>
              {confirmText === "DELETE" ? (
                <SubmitButton variant="danger">Delete account</SubmitButton>
              ) : (
                <button
                  className="inline-flex cursor-default items-center justify-center rounded-md bg-[#e3d4cf] px-5 py-2.5 text-ui font-semibold text-[#a8837c]"
                  disabled
                  type="submit"
                >
                  Delete account
                </button>
              )}
            </DialogActions>
          </form>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
