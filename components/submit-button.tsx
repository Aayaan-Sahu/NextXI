"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Padding lives with the variant rather than in the base class: `quiet` has
// none, and a base `px-5` could only be undone with !important.
const VARIANT_STYLES = {
  primary: "rounded-md px-5 py-2.5 bg-gold-500 text-ink-900 hover:bg-gold-600",
  secondary: "rounded-md px-5 py-2.5 bg-cream-300 text-ink-900 hover:bg-cream-350",
  danger: "rounded-md px-5 py-2.5 bg-rust-600 text-cream-50 hover:bg-rust-700",
  /** A repeated row action — ink at rest, maroon on hover (the Suppression Rule). */
  quiet: "rounded-sm text-ink-600 hover:text-rust-700",
};

const SPINNER_STYLES = {
  primary: "border-ink-900/30 border-t-ink-900",
  secondary: "border-ink-900/30 border-t-ink-900",
  danger: "border-cream-50/40 border-t-cream-50",
  quiet: "border-ink-600/30 border-t-ink-600",
};

export type SubmitVariant = keyof typeof VARIANT_STYLES;

/**
 * PrimaryButton for server-action forms: disables and shows a spinner while
 * the action is pending, so a slow network never reads as a dead button.
 * Peach is the primary action everywhere; `danger` is only the confirming
 * button inside a destructive dialog; `quiet` is a row action that repeats
 * down a list and must not make the list about itself.
 */
export function SubmitButton({
  autoFocus = false,
  children,
  className = "",
  variant = "primary",
}: {
  /** For a confirming step that replaces the button that opened it. */
  autoFocus?: boolean;
  children: ReactNode;
  className?: string;
  variant?: SubmitVariant;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      autoFocus={autoFocus}
      className={`relative inline-flex cursor-pointer items-center justify-center text-ui font-semibold disabled:cursor-default ${VARIANT_STYLES[variant]} ${className}`}
      disabled={pending}
      type="submit"
    >
      <span className={pending ? "invisible" : undefined}>{children}</span>
      {pending ? (
        <span className="absolute inset-0 grid place-items-center">
          <span
            aria-label="Submitting"
            className={`size-[13px] motion-safe:animate-spin rounded-full border-2 ${SPINNER_STYLES[variant]}`}
            role="status"
          />
        </span>
      ) : null}
    </button>
  );
}
