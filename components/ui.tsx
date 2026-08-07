import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { AuthMount } from "@/components/auth-mount";

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

/**
 * Small monospace section label, e.g. "Coaching report".
 *
 * Pass `as="h2"` (or "h3") whenever the eyebrow is the heading for a content
 * group — panels, list sections, page groups. Kicker replaced `Panel title`
 * on several surfaces, and a bare <div> there leaves screen-reader heading
 * navigation with nothing to land on. Tailwind preflight resets heading
 * margins and size, so the tag swap is a zero-pixel change.
 *
 * Leave it a <div> only for eyebrows that decorate a nearby heading rather
 * than acting as one (the StatusBoard/GatePanel kicker above their h1).
 */
export function Kicker({
  as: Tag = "div",
  children,
  tone = "light",
}: Children & { as?: "div" | "h2" | "h3"; tone?: "light" | "dark" }) {
  return (
    <Tag
      className={`font-mono text-[11px] font-semibold tracking-[.2em] uppercase ${
        tone === "dark" ? "text-gold-500" : "text-rust-600"
      }`}
    >
      {children}
    </Tag>
  );
}

/**
 * Split auth layout: seam-stitch brand pane + cream form pane on md+.
 * Mobile keeps full-bleed seam so the true-float card sits on the brand band
 * (not a cream sheet), matching DESIGN.md shadow vocabulary.
 */
export function AuthShell({
  brandKicker = "MATCH DAY",
  brandLine = "Upload technique. Earn the scoreboard.",
  children,
}: Children & {
  brandKicker?: string;
  brandLine?: string;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-seam-stitch md:grid md:grid-cols-2 md:bg-transparent">
      <aside className="relative flex shrink-0 flex-col overflow-hidden bg-seam-stitch px-6 py-8 sm:px-10 md:min-h-dvh md:px-12 md:py-14">
        <div className="md:hidden">
          <Wordmark size="lg" tone="dark" />
        </div>
        <div className="hidden md:block">
          <Wordmark size="xl" tone="dark" />
        </div>
        <AuthMount className="relative z-10 mt-6 max-w-sm md:mt-10" variant="fade">
          <Kicker tone="dark">{brandKicker}</Kicker>
          <p className="mt-3 text-[15px] leading-relaxed text-cream-200">{brandLine}</p>
        </AuthMount>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 bg-thumb-scanlines opacity-30 md:block"
        />
      </aside>
      <div className="relative flex flex-1 items-center justify-center px-6 py-10 sm:px-12 md:bg-cream-200 md:py-14">
        <AuthMount className="relative z-10 w-full max-w-[560px]" variant="form">
          {children}
        </AuthMount>
      </div>
    </main>
  );
}

export function AuthCard({
  children,
  description,
  footer,
  kicker = "ACCOUNT",
  title,
}: Children & {
  description?: string;
  footer?: ReactNode;
  kicker?: string;
  title: string;
}) {
  return (
    <section className="relative w-full overflow-hidden rounded-xl bg-white text-ink-900 shadow-2xl shadow-black/45 md:rounded-[10px] md:border md:border-cream-400 md:shadow-none">
      <div className="p-9">
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-2.5 font-display text-[26px] leading-tight font-bold uppercase">
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
          ? "mt-4 animate-crease-rise rounded-md border border-rust-600/30 bg-rust-600/10 px-3 py-2.5 text-sm text-rust-700"
          : "mt-4 animate-crease-rise rounded-md border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm text-ink-600"
      }
    >
      {children}
    </p>
  );
}

export function PageShell({ children }: Children) {
  return <main className="mx-auto w-full max-w-[1280px] px-6 py-11 sm:px-12">{children}</main>;
}

/** Soft cream tonal band behind StatusBoard / GatePanel on role homes. */
export function StatusBand({
  children,
  className = "",
}: Children & { className?: string }) {
  return (
    <div
      className={`-mx-6 bg-cream-100/80 px-6 py-6 sm:-mx-12 sm:rounded-[12px] sm:px-12 ${className}`}
    >
      {children}
    </div>
  );
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

/* 16px on touch devices: smaller inputs trigger iOS Safari's focus auto-zoom,
   in portrait or landscape — so the 14px size is gated on a fine pointer, not
   viewport width. */
export const inputStyles =
  "rounded-md border border-cream-500 bg-cream-50 px-3 py-2.5 text-base font-normal text-ink-900 placeholder:text-ink-600 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/25 sm:pointer-fine:text-sm";

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={inputStyles} />;
}

export function TextArea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={`resize-y ${inputStyles}`} />;
}

/** The shared select — one style for every dropdown, no local selectStyles. */
export function Select(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`${inputStyles} disabled:bg-cream-100 disabled:text-sage-400`}
    />
  );
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
          ? "cursor-pointer rounded-md bg-rust-600 px-4 py-2.5 text-sm font-bold text-cream-50 hover:bg-rust-700 disabled:cursor-default disabled:opacity-55 disabled:hover:bg-rust-600"
          : "cursor-pointer rounded-md bg-gold-500 px-4 py-2.5 text-sm font-bold text-pitch-900 hover:bg-gold-600 disabled:cursor-default disabled:opacity-55 disabled:hover:bg-gold-500"
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

/**
 * Compact home status strip — who you are and what's live.
 * Light tone is the product default; dark is a thin match-day strip.
 */
export function StatusBoard({
  actions,
  kicker,
  note,
  stats,
  title,
  tone = "light",
}: {
  actions?: ReactNode;
  kicker: string;
  /** One human sentence under the title — voice, not machine facts. */
  note?: ReactNode;
  stats?: string[];
  title: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <section
      className={
        dark
          ? "relative overflow-hidden rounded-[12px] bg-pitch-800 px-6 py-5 text-cream-200"
          : "rounded-[10px] border border-cream-400 bg-white px-6 py-5"
      }
    >
      {dark ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-thumb-scanlines opacity-40"
        />
      ) : null}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Kicker tone={dark ? "dark" : "light"}>{kicker}</Kicker>
          <h1
            className={`mt-2 font-display text-[28px] leading-[1.05] font-bold tracking-[.02em] uppercase sm:text-[32px] ${
              dark ? "text-cream-200" : "text-ink-900"
            }`}
          >
            {title}
          </h1>
          {note ? (
            <p className={`mt-2 text-sm ${dark ? "text-cream-200/85" : "text-ink-600"}`}>
              {note}
            </p>
          ) : null}
          {stats && stats.length > 0 ? (
            <p
              className={`mt-2.5 font-mono text-[11.5px] ${
                dark ? "text-sage-400" : "text-ink-600"
              }`}
            >
              {stats.join(" · ")}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
    </section>
  );
}

/** Dashed empty-state box with optional scanline media and gold CTA. */
export function EmptyState({
  action,
  children,
  media = false,
}: {
  action?: ReactNode;
  children: ReactNode;
  media?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-cream-500 bg-cream-50/60 px-6 py-10 text-center">
      {media ? (
        <div
          aria-hidden
          className="mx-auto mb-4 grid aspect-video w-full max-w-[220px] place-items-center rounded-md bg-thumb-scanlines text-[26px] text-gold-500"
        >
          ▶
        </div>
      ) : null}
      <div className="text-sm text-ink-600">{children}</div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * Gated-account hero: large mono code (guardian approval) or review message
 * treated as a scoreboard readout rather than a footnote.
 */
export function GatePanel({
  children,
  code,
  description,
  kicker,
  title,
}: {
  children?: ReactNode;
  code?: string;
  description: ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-cream-400 bg-white">
      <div className="relative bg-pitch-800 px-6 py-7 text-cream-200 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-thumb-scanlines opacity-40"
        />
        <div className="relative">
          <Kicker tone="dark">{kicker}</Kicker>
          <h1 className="mt-2 font-display text-[28px] leading-[1.05] font-bold tracking-[.02em] uppercase sm:text-[32px]">
            {title}
          </h1>
          {code ? (
            <p className="mt-6 font-mono text-[2rem] tracking-[0.28em] text-gold-500 sm:text-[2.75rem]">
              {code}
            </p>
          ) : null}
        </div>
      </div>
      <div className="px-6 py-6 sm:px-8">
        <div className="text-sm leading-relaxed text-ink-600">{description}</div>
        {children}
      </div>
    </section>
  );
}

/** Shimmer placeholder block for skeleton loading screens; caller sets the radius. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`motion-safe:animate-pulse bg-cream-300 ${className}`} />;
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SecondaryButton type="submit">Sign out</SecondaryButton>
    </form>
  );
}
