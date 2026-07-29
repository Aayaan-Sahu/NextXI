"use client";

import { useState } from "react";
import { deleteAccount } from "@/app/dashboard/profile/actions";
import { Field, Panel, SecondaryButton, TextInput } from "@/components/ui";

/**
 * The account-deletion panel on /dashboard/profile: a quiet trigger button
 * and a confirm dialog that requires typing DELETE before the destructive
 * server action can run (the server re-checks the typed confirmation).
 */
export function DeleteAccountPanel() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  return (
    <Panel title="Delete account">
      <p className="text-sm text-ink-600">
        Permanently removes your profile, videos, coaching reports, messages, and
        connections. This cannot be undone.
      </p>
      <button
        className="mt-4 cursor-pointer rounded-md border border-cream-500 bg-transparent px-4 py-2.5 text-sm font-semibold text-rust-600 hover:bg-cream-100"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Delete account
      </button>
      {confirming ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-950/60 p-4"
          role="alertdialog"
        >
          <div className="w-full max-w-[380px] rounded-[10px] border border-cream-400 bg-white p-5 shadow-2xl shadow-black/40">
            <p className="font-semibold">Delete this account?</p>
            <p className="mt-2 text-sm text-ink-600">
              Everything on the account is removed for good — there is no way back.
            </p>
            <form action={deleteAccount} className="mt-4 grid gap-4">
              <Field>
                Type DELETE to confirm
                <TextInput
                  autoComplete="off"
                  name="confirm"
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder="DELETE"
                  required
                  type="text"
                  value={confirmText}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <SecondaryButton onClick={() => setConfirming(false)} type="button">
                  Cancel
                </SecondaryButton>
                <button
                  className="cursor-pointer rounded-md bg-rust-600 px-4 py-2.5 text-sm font-bold text-cream-50 hover:bg-rust-700 disabled:cursor-default disabled:opacity-60"
                  disabled={confirmText !== "DELETE"}
                  type="submit"
                >
                  Delete account
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
