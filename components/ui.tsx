import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { AuthMount } from "@/components/auth-mount";
import { AuthStepper, type AuthStep } from "@/components/auth-stepper";

type Children = {
  children: ReactNode;
};

const WORDMARK_SIZES = {
  sm: "text-base",
  md: "text-title",
  lg: "text-4xl",
  xl: "text-7xl sm:text-8xl lg:text-9xl",
  "2xl": "text-8xl sm:text-9xl lg:text-[10.5rem]",
};

/**
 * The NextXI wordmark. `tone` picks the "Next" color for dark or light
 * surfaces; `accent` colors the XI. Amber is the product default — the
 * landing pins itself to peach so its hero and nav stay untouched.
 */
export function Wordmark({
  accent = "amber",
  size = "md",
  tone = "dark",
}: {
  accent?: "amber" | "peach";
  size?: keyof typeof WORDMARK_SIZES;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={`font-display font-bold tracking-[.08em] uppercase ${WORDMARK_SIZES[size]} ${
        tone === "dark" ? "text-cream-200" : "text-ink-900"
      }`}
    >
      Next
      <span className={accent === "amber" ? "text-amber-500" : "text-gold-500"}>XI</span>
    </span>
  );
}

/**
 * The tracked-uppercase eyebrow, and the only one in the product.
 *
 * Use it where a panel has no other heading — the report header, the
 * latest-report band, a gate that must name the state its title doesn't. Never
 * above an h1 that already says the same words: "GUARDIAN HOME / Aayaan Verma"
 * spends the rarest treatment in the system on a repeat. When everything is
 * tracked uppercase, nothing is.
 *
 * Pass `as="h2"` when the eyebrow really is the group's heading, so screen
 * reader navigation has something to land on.
 */
export function Kicker({
  as: Tag = "div",
  children,
  tone = "light",
}: Children & { as?: "div" | "h2" | "h3"; tone?: "light" | "dark" }) {
  return (
    <Tag
      className={`text-caption font-semibold tracking-[.16em] uppercase ${
        tone === "dark" ? "text-amber-500" : "text-rust-600"
      }`}
    >
      {children}
    </Tag>
  );
}

/**
 * The 15px uppercase section head — the second and last display size in the
 * system. Every content group on a product page opens with one.
 */
export function SectionHeading({
  as: Tag = "h2",
  children,
  className = "",
}: Children & { as?: "h2" | "h3"; className?: string }) {
  return (
    <Tag
      className={`font-display font-semibold tracking-[.08em] uppercase ${
        Tag === "h2" ? "text-body" : "text-ui"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/**
 * The page title. One per page, and the only place the display face appears at
 * this size — ten pages were spelling the same six classes out by hand.
 */
export function PageTitle({ children, className = "" }: Children & { className?: string }) {
  return (
    <h1
      className={`font-display text-display font-bold tracking-[.02em] uppercase ${className}`}
    >
      {children}
    </h1>
  );
}

/** Section head with a trailing link or count on the same baseline. */
export function SectionHead({
  aside,
  children,
  className = "",
}: Children & { aside?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <SectionHeading>{children}</SectionHeading>
      {aside}
    </div>
  );
}

/**
 * Split auth layout: seam-stitch brand pane + cream form pane on md+.
 * Mobile keeps full-bleed seam so the card sits on the brand band.
 */
export function AuthShell({
  brandLine = "Film it. Understand it.",
  children,
}: Children & {
  brandLine?: string;
}) {
  return (
    <main
      className="flex min-h-dvh flex-col bg-seam-stitch md:grid md:grid-cols-[minmax(300px,37%)_1fr] md:bg-transparent"
      id="main-content"
    >
      <aside className="flex shrink-0 flex-col justify-between gap-10 bg-rust-600 px-6 py-8 sm:px-10 md:min-h-dvh md:px-9 md:py-9">
        <Wordmark size="lg" tone="dark" />
        {/* Balanced, so the line breaks between its sentences rather than
            stranding a word — no hard <br> in the copy. */}
        <AuthMount className="max-w-[290px]" variant="fade">
          <p className="font-display text-display leading-[1.1] font-semibold text-balance text-cream-50 uppercase">
            {brandLine}
          </p>
        </AuthMount>
      </aside>
      <div className="relative flex flex-1 items-center justify-center bg-cream-200 px-6 py-10 sm:px-12 md:py-14">
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
  step,
  title,
}: Children & {
  description?: ReactNode;
  footer?: ReactNode;
  step?: AuthStep;
  title: string;
}) {
  return (
    <section className="relative w-full overflow-hidden rounded-[10px] bg-cream-200 text-ink-900 shadow-float md:bg-transparent md:shadow-none">
      <div className="p-8 sm:p-9">
        {step && <AuthStepper current={step} />}
        <PageTitle>{title}</PageTitle>
        {description && (
          <p className="mt-1.5 text-ui leading-relaxed text-ink-600">{description}</p>
        )}
        {children}
      </div>
      {footer && (
        <footer className="border-t border-cream-400 px-8 py-4 text-ui text-ink-600 sm:px-9">
          {footer}
        </footer>
      )}
    </section>
  );
}

/**
 * The compact auth card: a maroon header strip carrying the wordmark and one
 * piece of context (a step label, or the signup stepper), then the form.
 * Sign-in, password reset and email verification use this; only sign-up
 * earns the full split shell.
 */
export function AuthSheet({
  children,
  context,
  description,
  footer,
  title,
  width = "sm",
}: Children & {
  context?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  title: string;
  width?: "sm" | "lg";
}) {
  const wide = width === "lg";

  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-cream-200 px-5 py-10"
      id="main-content"
    >
      <AuthMount
        className={`w-full ${wide ? "max-w-[700px]" : "max-w-[460px]"}`}
        variant="form"
      >
        <section className="overflow-hidden rounded-[10px] bg-cream-200 text-ink-900 shadow-float">
          <div
            className={`flex items-center justify-between gap-4 bg-rust-600 py-4 ${wide ? "px-8" : "px-7"}`}
          >
            <Wordmark size="sm" tone="dark" />
            {context}
          </div>
          <div className={`pt-7 pb-8 ${wide ? "px-7 sm:px-10" : "px-7 sm:px-8"}`}>
            <h1 className="font-display text-display font-bold tracking-[.02em] uppercase">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 text-ui leading-relaxed text-ink-600">{description}</p>
            ) : null}
            {children}
            {footer ? (
              <div className="mt-6 border-t border-cream-400 pt-4 text-ui text-ink-600">
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </AuthMount>
    </main>
  );
}

export function TextLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={`font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline ${className}`}
    />
  );
}

/**
 * Flash notice. A left rule and a tinted ground — never a full border, never
 * a toast. Server strings render verbatim.
 */
export function Notice({
  children,
  className = "",
  tone = "info",
}: {
  children?: ReactNode;
  className?: string;
  tone?: "info" | "error";
}) {
  if (!children) return null;

  return (
    <p
      className={`animate-crease-rise rounded-r-md border-l-[3px] px-4 py-2.5 text-ui leading-relaxed ${
        tone === "error"
          ? "border-rust-600 bg-rust-50 text-rust-800"
          : "border-amber-500 bg-cream-250 text-ink-800"
      } ${className}`}
    >
      {children}
    </p>
  );
}

export function PageShell({ children }: Children) {
  return (
    <main className="mx-auto w-full max-w-[1360px] px-6 pt-7 pb-14 sm:px-10" id="main-content">
      {children}
    </main>
  );
}

/**
 * Shell for a surface that carries a sub-bar under the nav — a roster or an
 * inbox, where the filter and the way in belong to the whole page rather than
 * to one section of it.
 */
export function BarShell({ bar, children }: Children & { bar: ReactNode }) {
  return (
    <main id="main-content">
      {bar}
      <div className="mx-auto w-full max-w-[1360px] px-6 pt-6 pb-14 sm:px-10">{children}</div>
    </main>
  );
}

/** The full-bleed band under the nav: what this page is, then how to work it. */
export function SubBar({ children, title }: Children & { title: string }) {
  return (
    <div className="border-b border-cream-400 bg-cream-100">
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-2.5 sm:min-h-[52px] sm:px-10">
        <SectionHeading>{title}</SectionHeading>
        <span aria-hidden className="h-5 w-px bg-cream-400 max-sm:hidden" />
        {children}
      </div>
    </div>
  );
}

export type TabItem = {
  active: boolean;
  /** A count that needs answering — drawn as a maroon pill, not a suffix. */
  badge?: number;
  href: string;
  label: string;
};

/** Roster/inbox tabs. The active tab is underlined in maroon, not boxed. */
export function Tabs({ items }: { items: TabItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-x-[22px] gap-y-1.5 text-ui">
      {items.map((item) => (
        <Link
          className={
            item.active
              ? "flex items-center gap-1.5 pb-[3px] font-semibold text-rust-600 no-underline shadow-[inset_0_-2px_0_var(--color-rust-600)]"
              : "flex items-center gap-1.5 pb-[3px] text-ink-600 no-underline hover:text-ink-900"
          }
          href={item.href}
          key={item.href}
        >
          {item.label}
          {item.badge ? (
            <span className="rounded-[9px] bg-rust-600 px-1.5 py-px text-micro font-semibold text-cream-50">
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
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
    <header className="mb-7 flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
      <div className="min-w-0">
        <PageTitle>{title}</PageTitle>
        {subtitle && <p className="mt-1.5 text-ui text-ink-600">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/**
 * A white card with a hairline. Reach for spacing first — a Panel is for a
 * genuinely raised surface (the report, a consistency readout), never for
 * wrapping a list that a hairline could separate.
 */
export function Panel({
  children,
  className = "",
  title,
}: Children & { className?: string; title?: string }) {
  return (
    <section
      className={`rounded-[10px] border border-cream-400 bg-cream-50 p-5 sm:p-[22px] ${className}`}
    >
      {title && <SectionHeading className="mb-3.5">{title}</SectionHeading>}
      {children}
    </section>
  );
}

export function Form({ className = "", ...props }: ComponentProps<"form">) {
  return <form {...props} className={`grid gap-4 ${className}`} />;
}

export function Field({ className = "", ...props }: ComponentProps<"label">) {
  return (
    <label
      {...props}
      className={`grid min-w-0 self-start gap-1.5 text-caption font-semibold ${className}`}
    />
  );
}

/**
 * Field styling without the <label> element, for wrapping groups of controls
 * that carry their own labels (e.g. CheckboxChip). Nesting labels breaks
 * checkbox toggling: the outer label re-activates the control the inner one
 * just toggled.
 */
export function FieldGroup({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={`grid min-w-0 self-start gap-1.5 text-caption font-semibold ${className}`}
    />
  );
}

/** The caption under a field — what the value means, or why it is required. */
export function FieldHint({
  children,
  tone = "muted",
}: Children & { tone?: "muted" | "error" | "ok" }) {
  return (
    <span
      className={`text-caption font-normal ${
        tone === "error"
          ? "font-semibold text-rust-600"
          : tone === "ok"
            ? "font-semibold text-moss-600"
            : "text-ink-600"
      }`}
    >
      {children}
    </span>
  );
}

/* 16px on touch devices: smaller inputs trigger iOS Safari's focus auto-zoom,
   in portrait or landscape — so the 14.5px size is gated on a fine pointer,
   not viewport width. Focus darkens the border to ink, the way the boards
   draw an active control. */
export const inputStyles =
  "min-w-0 rounded-md border border-cream-400 bg-cream-50 px-3 py-2.5 text-base font-normal text-ink-900 placeholder:text-ink-600 focus:border-ink-900 focus:ring-2 focus:ring-amber-500/30 focus:outline-none sm:pointer-fine:text-body [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_var(--color-cream-50)] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-ink-900)]";

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${inputStyles} ${className}`} />;
}

export function TextArea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`resize-y leading-relaxed ${inputStyles} ${className}`} />;
}

/** The shared select — one style for every dropdown, no local selectStyles. */
export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`${inputStyles} disabled:bg-cream-250 disabled:text-ink-400 ${className}`}
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
        <span className="text-caption text-ink-600 peer-checked:hidden">{offLabel}</span>
      ) : null}
      {onLabel ? (
        <span className="hidden text-caption font-semibold text-ink-900 peer-checked:inline">
          {onLabel}
        </span>
      ) : null}
      <span className="relative h-6 w-11 shrink-0 rounded-full border border-cream-400 bg-cream-250 transition-colors after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-cream-50 after:transition-transform peer-checked:border-pitch-900 peer-checked:bg-pitch-900 peer-checked:after:translate-x-5 peer-checked:after:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500/40" />
    </label>
  );
}

/** A checkbox rendered as a toggleable pill, for multi-select chip groups. */
export function CheckboxChip({ children, ...props }: ComponentProps<"input">) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-cream-400 px-3.5 py-[7px] text-ui text-ink-800 select-none has-[:checked]:border-pitch-900 has-[:checked]:bg-pitch-900 has-[:checked]:font-semibold has-[:checked]:text-cream-200">
      <input {...props} className="sr-only" type="checkbox" />
      {children}
    </label>
  );
}

/**
 * A pill. `solid` is a fact the system asserts (a role, a discipline tag);
 * `outline` is a quieter label; `quiet` sits on cream for status text.
 */
export function Chip({
  children,
  tone = "solid",
}: Children & { tone?: "solid" | "outline" | "quiet" }) {
  const styles = {
    solid: "bg-pitch-900 font-semibold text-cream-200",
    outline: "border border-cream-400 bg-cream-50 text-ink-800",
    quiet: "bg-cream-250 font-semibold text-ink-600",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-[5px] text-caption ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

/** A number and what it measures. The system's only way to show a figure. */
export function Stat({
  caption,
  size = "md",
  tone = "light",
  value,
}: {
  caption: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark" | "negative";
  value: ReactNode;
}) {
  const sizes = { sm: "text-title", md: "text-figure", lg: "text-title" };

  return (
    <div>
      <div
        className={`font-semibold tabular-nums ${sizes[size]} leading-none ${
          tone === "dark" ? "text-cream-200" : tone === "negative" ? "text-rust-600" : "text-ink-900"
        }`}
      >
        {value}
      </div>
      <div
        className={`mt-1.5 text-caption ${tone === "dark" ? "text-cream-200/60" : "text-ink-600"}`}
      >
        {caption}
      </div>
    </div>
  );
}

/**
 * A horizontal meter. Amber reads as progress; maroon marks a value that is
 * behind where it should be. A null value draws the empty track and the
 * caller explains the dash.
 */
export function Meter({
  tone = "amber",
  value,
}: {
  tone?: "amber" | "rust";
  value: number | null;
}) {
  return (
    <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-cream-350">
      {value === null ? null : (
        <div
          className={`h-full rounded-sm ${tone === "rust" ? "bg-rust-600" : "bg-amber-500"}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      )}
    </div>
  );
}

const BUTTON_BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-5 py-2.5 text-ui font-semibold disabled:cursor-default";

export function PrimaryButton({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} bg-gold-500 text-ink-900 hover:bg-gold-600 disabled:bg-cream-350 disabled:text-ink-400 disabled:hover:bg-cream-350 ${className}`}
    />
  );
}

export function SecondaryButton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} bg-cream-300 text-ink-900 hover:bg-cream-350 disabled:bg-cream-350 disabled:text-ink-400 ${className}`}
    />
  );
}

/** Outline maroon — the button that removes something. */
export function DestructiveButton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} border border-rust-300 bg-transparent text-rust-600 hover:bg-rust-50 disabled:border-cream-400 disabled:text-ink-400 disabled:hover:bg-transparent ${className}`}
    />
  );
}

/** Filled maroon. Only the confirming action inside a destructive dialog. */
export function DangerButton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} bg-rust-600 text-cream-50 hover:bg-rust-700 disabled:bg-[#e3d4cf] disabled:text-[#a8837c] disabled:hover:bg-[#e3d4cf] ${className}`}
    />
  );
}

/** The quiet cancel beside a destructive action. */
export function GhostButton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} border border-cream-400 bg-transparent text-ink-600 hover:bg-cream-100 ${className}`}
    />
  );
}

/** Dashed empty box: one sentence, an optional CTA. Never an illustration. */
export function EmptyState({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-cream-500 bg-cream-100 px-6 py-6 text-center">
      <div className="text-ui text-ink-800">{children}</div>
      {action ? <div className="mt-3.5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * Gated-account hero: the guardian approval code or a review message, read as
 * a scoreboard rather than a footnote. Centred, because a gate is the only
 * thing on its page.
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
  /** Only when it names a state the title doesn't — "Awaiting guardian". */
  kicker?: string;
  title: string;
}) {
  return (
    <section className={`mx-auto w-full ${code ? "max-w-[660px] text-center" : "max-w-[640px]"}`}>
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <h1 className={`font-display text-display font-bold tracking-[.02em] uppercase ${kicker ? "mt-3.5" : ""}`}>
        {title}
      </h1>
      <div className="mt-3 text-body leading-relaxed text-ink-800">{description}</div>
      {code ? (
        <div className="mt-8 rounded-xl bg-pitch-900 px-6 py-8">
          <p className="font-display text-[44px] leading-none font-bold tracking-[.1em] text-amber-500 sm:text-[66px]">
            {code}
          </p>
          <p className="mt-3.5 text-caption text-cream-200/60">Your guardian approval code</p>
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * The confirm dialog. The title asks the question, the body says what it
 * costs, and the two buttons sit right with the destructive one last —
 * filled maroon is the only place a maroon button appears.
 */
export function ConfirmDialog({
  children,
  description,
  onDismiss,
  title,
}: Children & {
  description?: ReactNode;
  onDismiss?: () => void;
  title: string;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-900/60 p-4"
      role="alertdialog"
    >
      {onDismiss ? (
        <button
          aria-label="Cancel"
          className="absolute inset-0 cursor-default"
          onClick={onDismiss}
          type="button"
        />
      ) : null}
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-lg border border-cream-400 bg-cream-200 shadow-float">
        <div className="px-[22px] py-5">
          <h2 className="font-display text-title leading-tight font-bold tracking-[.02em] uppercase">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-ui leading-relaxed text-ink-800">{description}</p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Right-aligned button row for a dialog footer. */
export function DialogActions({ children }: Children) {
  return <div className="mt-4 flex justify-end gap-2.5">{children}</div>;
}

/** Shimmer placeholder block for skeleton loading screens; caller sets the radius. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`motion-safe:animate-pulse bg-cream-350 ${className}`} />;
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SecondaryButton type="submit">Sign out</SecondaryButton>
    </form>
  );
}
