import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { signOut } from "@/app/auth/actions";

type Children = {
  children: ReactNode;
};

const WORDMARK_SIZES = {
  md: "text-xl",
  lg: "text-4xl",
  xl: "text-7xl sm:text-8xl lg:text-9xl",
  "2xl": "text-8xl sm:text-9xl lg:text-[10.5rem]",
};

/** The NextXI wordmark. `tone` picks the "Next" color for dark or light surfaces. */
export function Wordmark({
  size = "md",
  tone = "dark",
}: {
  size?: keyof typeof WORDMARK_SIZES;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={`font-display font-bold tracking-[.06em] uppercase ${WORDMARK_SIZES[size]} ${
        tone === "dark" ? "text-cream-200" : "text-pitch-900"
      }`}
    >
      Next<span className="text-gold-500">XI</span>
    </span>
  );
}

/** Small monospace section label, e.g. "Coaching report". */
export function Kicker({
  children,
  tone = "light",
}: Children & { tone?: "light" | "dark" }) {
  return (
    <div
      className={`font-mono text-[11px] font-semibold tracking-[.2em] uppercase ${
        tone === "dark" ? "text-gold-500" : "text-rust-600"
      }`}
    >
      {children}
    </div>
  );
}

export function AuthShell({ children }: Children) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-seam-stitch p-6 sm:p-12">
      <div className="absolute top-8 left-6 sm:top-10 sm:left-12">
        <Wordmark size="lg" tone="dark" />
      </div>
      {children}
    </main>
  );
}

export function AuthCard({
  children,
  description,
  footer,
  title,
}: Children & {
  description?: string;
  footer?: ReactNode;
  title: string;
}) {
  return (
    <section className="relative w-full max-w-[560px] overflow-hidden rounded-xl bg-white text-ink-900 shadow-2xl shadow-black/45">
      <div className="p-9">
        <h1 className="font-display text-[26px] leading-tight font-bold uppercase">
          {title}
        </h1>
        {description && <p className="mt-2 text-sm text-ink-600">{description}</p>}
        {children}
      </div>
      {footer && (
        <footer className="border-t border-cream-400 px-9 py-4 text-center text-[13.5px] text-ink-600">
          {footer}
        </footer>
      )}
    </section>
  );
}

export function TextLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className="font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
    />
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children?: ReactNode;
  tone?: "info" | "error";
}) {
  if (!children) return null;

  return (
    <p
      className={
        tone === "error"
          ? "mt-4 rounded-md border border-rust-600/30 bg-rust-600/10 px-3 py-2.5 text-sm text-rust-700"
          : "mt-4 rounded-md border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm text-ink-600"
      }
    >
      {children}
    </p>
  );
}

export function PageShell({ children }: Children) {
  return <main className="mx-auto w-full max-w-[1280px] px-6 py-11 sm:px-12">{children}</main>;
}

export function PageHeader({
  action,
  subtitle,
  title,
}: {
  action?: ReactNode;
  subtitle?: ReactNode;
  title: string;
}) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4 max-md:flex-col max-md:items-start">
      <div>
        <h1 className="font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] uppercase">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-[14.5px] text-ink-600">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({ children, title }: Children & { title?: string }) {
  return (
    <section className="rounded-[10px] border border-cream-400 bg-white p-6">
      {title && (
        <h2 className="mb-4 font-display text-xl leading-tight font-semibold uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Form({ className = "", ...props }: ComponentProps<"form">) {
  return <form {...props} className={`grid gap-4 ${className}`} />;
}

export function Field({ className = "", ...props }: ComponentProps<"label">) {
  return <label {...props} className={`grid gap-1.5 text-xs font-bold ${className}`} />;
}

/**
 * Field styling without the <label> element, for wrapping groups of controls
 * that carry their own labels (e.g. CheckboxChip). Nesting labels breaks
 * checkbox toggling: the outer label re-activates the control the inner one
 * just toggled.
 */
export function FieldGroup({ className = "", ...props }: ComponentProps<"div">) {
  return <div {...props} className={`grid gap-1.5 text-xs font-bold ${className}`} />;
}

const inputStyles =
  "rounded-md border border-cream-500 bg-cream-50 px-3 py-2.5 text-sm font-normal text-ink-900 placeholder:text-ink-600 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/25";

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={inputStyles} />;
}

export function TextArea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={`resize-y ${inputStyles}`} />;
}

/**
 * An on/off switch backed by a real checkbox — submits inside a server-action
 * form with no client JS. Optional `onLabel`/`offLabel` swap via the checked
 * state. The value is only sent to the server when the switch is on.
 */
export function Switch({
  onLabel,
  offLabel,
  className = "",
  ...props
}: ComponentProps<"input"> & { onLabel?: string; offLabel?: string }) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2.5 select-none ${className}`}
    >
      <input {...props} className="peer sr-only" type="checkbox" />
      {offLabel ? (
        <span className="text-[12.5px] font-semibold text-ink-600 peer-checked:hidden">
          {offLabel}
        </span>
      ) : null}
      {onLabel ? (
        <span className="hidden text-[12.5px] font-semibold text-pitch-900 peer-checked:inline">
          {onLabel}
        </span>
      ) : null}
      <span className="relative h-6 w-11 shrink-0 rounded-full border border-cream-500 bg-cream-200 transition-colors after:absolute after:top-[3px] after:left-[3px] after:h-4 after:w-4 after:rounded-full after:bg-cream-50 after:shadow-sm after:transition-transform peer-checked:border-pitch-900 peer-checked:bg-pitch-900 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500/40" />
    </label>
  );
}

/** A checkbox rendered as a toggleable pill, for multi-select chip groups. */
export function CheckboxChip({ children, ...props }: ComponentProps<"input">) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-cream-500 px-4 py-[7px] text-[13px] font-semibold text-ink-900 select-none has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-900 has-[:checked]:text-cream-200">
      <input {...props} className="sr-only" type="checkbox" />
      {children}
    </label>
  );
}

/** A small rounded label for tags like player roles. */
export function Badge({ children }: Children) {
  return (
    <span className="inline-flex items-center rounded-full border border-cream-400 bg-cream-100 px-3 py-1 text-xs font-semibold text-ink-900">
      {children}
    </span>
  );
}

export function PrimaryButton({
  variant = "gold",
  ...props
}: ComponentProps<"button"> & { variant?: "gold" | "rust" }) {
  return (
    <button
      {...props}
      className={
        variant === "rust"
          ? "cursor-pointer rounded-md bg-rust-600 px-4 py-2.5 text-sm font-bold text-cream-50 hover:bg-rust-700"
          : "cursor-pointer rounded-md bg-gold-500 px-4 py-2.5 text-sm font-bold text-pitch-900 hover:bg-gold-600"
      }
    />
  );
}

export function SecondaryButton(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className="cursor-pointer rounded-md border border-cream-500 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-cream-100"
    />
  );
}

export function Spinner() {
  return (
    <span
      aria-label="Loading"
      className="inline-block size-5 animate-spin rounded-full border-2 border-cream-500 border-t-pitch-900"
      role="status"
    />
  );
}

export function LoadingScreen() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Spinner />
    </div>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SecondaryButton type="submit">Sign out</SecondaryButton>
    </form>
  );
}
