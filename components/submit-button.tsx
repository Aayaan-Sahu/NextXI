"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

const VARIANT_STYLES = {
  rust: "bg-rust-600 text-cream-50 hover:bg-rust-700",
  gold: "bg-gold-500 text-pitch-900 hover:bg-gold-600",
};

const SPINNER_STYLES = {
  rust: "border-cream-50/40 border-t-cream-50",
  gold: "border-pitch-900/30 border-t-pitch-900",
};

/**
 * PrimaryButton for server-action forms: disables and shows a spinner while
 * the action is pending, so a slow network never reads as a dead button.
 */
export function SubmitButton({
  children,
  variant = "gold",
}: {
  children: ReactNode;
  variant?: "gold" | "rust";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={`relative cursor-pointer rounded-md px-4 py-2.5 text-sm font-bold disabled:cursor-default ${VARIANT_STYLES[variant]}`}
      disabled={pending}
      type="submit"
    >
      <span className={pending ? "invisible" : undefined}>{children}</span>
      {pending ? (
        <span className="absolute inset-0 grid place-items-center">
          <span
            aria-label="Submitting"
            className={`size-4 motion-safe:animate-spin rounded-full border-2 ${SPINNER_STYLES[variant]}`}
            role="status"
          />
        </span>
      ) : null}
    </button>
  );
}
