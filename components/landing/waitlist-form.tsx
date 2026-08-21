"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistActionState } from "@/app/actions";
import type { LandingCopy } from "@/components/landing/copy";

export type WaitlistState = "joined" | "invalid";

const initialState: WaitlistActionState = { status: "idle" };

/** Email capture for the pre-launch waitlist, styled for the seam-red hero. */
export function WaitlistForm({
  align = "start",
  copy,
  waitlist,
}: {
  align?: "start" | "center";
  copy: LandingCopy["waitlist"];
  waitlist?: WaitlistState;
}) {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);
  const centered = align === "center";

  // A fresh action result wins over the server-rendered ?waitlist= param
  // (the param path stays for old links and pre-hydration submits).
  const status = state.status === "idle" ? waitlist : state.status;
  const invalidEmail = state.status === "invalid" ? state.email : undefined;

  if (status === "joined") {
    return (
      <div
        className={`w-full max-w-[460px] border-l-2 border-amber-500 bg-pitch-950/40 px-4 py-3.5 text-ui text-cream-200 ${
          centered ? "mx-auto text-center" : ""
        }`}
        role="status"
      >
        <span className="font-semibold text-cream-50">{copy.joinedTitle}</span> {copy.joinedBody}
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[460px] ${centered ? "mx-auto" : ""}`}>
      <form action={formAction} className="flex gap-2.5 max-sm:flex-col">
        <input
          key={invalidEmail ?? "email"}
          aria-label={copy.emailLabel}
          autoComplete="email"
          className="min-w-0 flex-1 rounded-md border border-cream-400 bg-cream-50 px-3 py-2.5 text-base text-ink-900 placeholder:text-ink-600 focus:border-ink-900 focus:ring-2 focus:ring-amber-500/60 focus:outline-none sm:pointer-fine:text-body"
          defaultValue={invalidEmail}
          name="email"
          placeholder={copy.placeholder}
          required
          type="email"
        />
        <button
          className="min-w-[9.5rem] cursor-pointer rounded-md bg-gold-500 px-5 py-2.5 text-ui font-semibold whitespace-nowrap text-ink-900 hover:bg-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-default disabled:bg-cream-350 disabled:text-ink-400"
          disabled={pending}
          type="submit"
        >
          {pending ? copy.joining : copy.join}
        </button>
      </form>
      <p
        className={`mt-3 text-caption text-cream-200/70 ${centered ? "text-center" : ""}`}
        role="status"
      >
        {pending ? (
          copy.adding
        ) : status === "invalid" ? (
          <span className="font-semibold text-cream-50">{copy.invalid}</span>
        ) : (
          copy.noSpam
        )}
      </p>
    </div>
  );
}
