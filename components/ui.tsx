import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { signOut } from "@/app/auth/actions";

type Children = {
  children: ReactNode;
};

export function AuthShell({ children }: Children) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6">
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
    <section className="relative w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-xl shadow-stone-950/10 ring-1 ring-stone-950/5">
      <div className="p-8">
        <h1 className="text-xl font-semibold leading-tight">{title}</h1>
        {description && <p className="mt-2 text-sm text-stone-600">{description}</p>}
        {children}
      </div>
      {footer && (
        <footer className="border-t border-stone-200 bg-stone-50 px-8 py-4 text-center text-sm text-stone-600">
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
      className="font-medium text-emerald-700 underline-offset-2 hover:underline"
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
          ? "mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
          : "mt-4 rounded-md border border-stone-200 bg-stone-100 px-3 py-2.5 text-sm text-stone-700"
      }
    >
      {children}
    </p>
  );
}

export function PageShell({ children }: Children) {
  return <main className="mx-auto w-full max-w-[960px] px-6 py-8">{children}</main>;
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
    <header className="mb-6 flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-stone-600">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({ children, title }: Children & { title: string }) {
  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold leading-tight">{title}</h2>
      {children}
    </section>
  );
}

export function Form({ className = "", ...props }: ComponentProps<"form">) {
  return <form {...props} className={`grid gap-4 ${className}`} />;
}

export function Field(props: ComponentProps<"label">) {
  return <label {...props} className="grid gap-2 text-sm font-medium" />;
}

const inputStyles =
  "rounded-md border border-stone-300 bg-white px-3 py-2.5 text-neutral-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={inputStyles} />;
}

export function TextArea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={`resize-y ${inputStyles}`} />;
}

/** A checkbox rendered as a toggleable pill, for multi-select chip groups. */
export function CheckboxChip({ children, ...props }: ComponentProps<"input">) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-950 select-none has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-700 has-[:checked]:text-white">
      <input {...props} className="sr-only" type="checkbox" />
      {children}
    </label>
  );
}

/** A small rounded label for tags like player roles. */
export function Badge({ children }: Children) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
      {children}
    </span>
  );
}

export function PrimaryButton(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className="cursor-pointer rounded-md bg-emerald-700 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
    />
  );
}

export function SecondaryButton(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className="cursor-pointer rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-stone-50"
    />
  );
}

export function Spinner() {
  return (
    <span
      aria-label="Loading"
      className="inline-block size-5 animate-spin rounded-full border-2 border-stone-300 border-t-neutral-950"
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
