import type { ComponentProps, ReactNode } from "react";
import { signOut } from "@/app/auth/actions";

type Children = {
  children: ReactNode;
};

export function AuthShell({ children }: Children) {
  return <main className="flex min-h-dvh items-center p-6">{children}</main>;
}

export function AuthCard({
  children,
  description,
  title,
}: Children & {
  description: string;
  title: string;
}) {
  return (
    <section className="mx-auto w-full max-w-[420px] rounded-lg border border-stone-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
      <p className="mt-2 text-stone-600 dark:text-neutral-300">{description}</p>
      {children}
    </section>
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
          ? "mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-neutral-950 dark:border-red-800 dark:bg-red-950/40 dark:text-neutral-50"
          : "mt-4 rounded-md border border-stone-300 bg-stone-100 px-3 py-2.5 text-neutral-950 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
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
        {subtitle && <p className="mt-2 text-stone-600 dark:text-neutral-300">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({ children, title }: Children & { title: string }) {
  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="mb-4 text-lg font-semibold leading-tight">{title}</h2>
      {children}
    </section>
  );
}

export function Form(props: ComponentProps<"form">) {
  return <form {...props} className="grid gap-4" />;
}

export function Field(props: ComponentProps<"label">) {
  return <label {...props} className="grid gap-2 text-sm font-medium" />;
}

export function TextInput(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-neutral-950 focus:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-50 dark:focus:ring-neutral-600"
    />
  );
}

export function TextArea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className="resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-neutral-950 focus:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-50 dark:focus:ring-neutral-600"
    />
  );
}

export function PrimaryButton(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className="cursor-pointer rounded-md border border-neutral-950 bg-neutral-950 px-3.5 py-2.5 text-sm font-semibold text-white dark:border-neutral-50 dark:bg-neutral-50 dark:text-neutral-950"
    />
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        className="cursor-pointer rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}
