"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

const VARIANT_STYLES = {
  primary: "bg-gold-500 text-ink-900 hover:bg-gold-600",
  secondary: "bg-cream-300 text-ink-900 hover:bg-cream-350",
  danger: "bg-rust-600 text-cream-50 hover:bg-rust-700",
};

const SPINNER_STYLES = {
  primary: "border-ink-900/30 border-t-ink-900",
  secondary: "border-ink-900/30 border-t-ink-900",
  danger: "border-cream-50/40 border-t-cream-50",
};

export type SubmitVariant = keyof typeof VARIANT_STYLES;

/**
 * PrimaryButton for server-action forms: disables and shows a spinner while
 * the action is pending, so a slow network never reads as a dead button.
 * Peach is the primary action everywhere; `danger` is only the confirming
 * button inside a destructive dialog.
 */
export function SubmitButton({
  children,
  className = "",
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  variant?: SubmitVariant;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={`relative inline-flex cursor-pointer items-center justify-center rounded-md px-5 py-2.5 text-ui font-semibold disabled:cursor-default ${VARIANT_STYLES[variant]} ${className}`}
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
