"use client";

import { useState } from "react";
import { SecondaryButton } from "@/components/ui";

/** Confirm before a trash action on a video card (delete clip or remove from session). */
export function ConfirmDeleteButton({
  action,
  description,
  id,
  label,
  name,
  title,
}: {
  action: (formData: FormData) => Promise<void>;
  description: string;
  id: string;
  label: string;
  name: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        aria-label={`${label} ${name}`}
        className="grid size-8 cursor-pointer place-items-center rounded-md border border-cream-400 bg-white text-ink-600 hover:border-rust-600 hover:text-rust-700"
        onClick={() => setConfirming(true)}
        type="button"
      >
        <TrashIcon />
      </button>
      {confirming ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-950/60 p-4"
          role="alertdialog"
        >
          <div className="w-full max-w-[380px] rounded-[10px] border border-cream-400 bg-white p-5 shadow-2xl shadow-black/40">
            <p className="font-semibold">{title}</p>
            <p className="mt-2 text-sm text-ink-600">{description}</p>
            <div className="mt-4 flex justify-end gap-2">
              <SecondaryButton onClick={() => setConfirming(false)} type="button">
                Cancel
              </SecondaryButton>
              <form action={action}>
                <input name="id" type="hidden" value={id} />
                <button
                  className="cursor-pointer rounded-md bg-rust-600 px-4 py-2.5 text-sm font-bold text-cream-50 hover:bg-rust-700"
                  type="submit"
                >
                  {label}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 5v6m4-6v6" />
    </svg>
  );
}
