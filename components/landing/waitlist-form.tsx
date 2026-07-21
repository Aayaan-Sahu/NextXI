"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistActionState } from "@/app/actions";

export type WaitlistState = "joined" | "invalid";

const initialState: WaitlistActionState = { status: "idle" };

/** Email capture for the pre-launch waitlist, styled for the seam-red hero. */
export function WaitlistForm({
  align = "start",
  waitlist,
}: {
  align?: "start" | "center";
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
        className={`w-full max-w-[460px] rounded-md border border-gold-500/40 bg-pitch-950/40 px-4 py-3.5 text-sm text-cream-200 ${
          centered ? "mx-auto text-center" : ""
        }`}
        role="status"
      >
        <span className="font-bold text-gold-500">You&apos;re on the list.</span>{" "}
        We&apos;ll email you when the nets open.
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[460px] ${centered ? "mx-auto" : ""}`}>
      <form action={formAction} className="flex gap-2.5 max-sm:flex-col">
        <input
          key={invalidEmail ?? "email"}
          aria-label="Email address"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-md bg-cream-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-600 focus:ring-2 focus:ring-gold-500/60 focus:outline-none"
          defaultValue={invalidEmail}
          name="email"
          placeholder="you@email.com"
          required
          type="email"
        />
        <button
          className="min-w-[9.5rem] cursor-pointer rounded-md bg-pitch-950 px-5 py-3 text-sm font-bold whitespace-nowrap text-gold-500 hover:bg-pitch-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 disabled:cursor-default disabled:opacity-70"
          disabled={pending}
          type="submit"
        >
          {pending ? "Joining…" : "Join the waitlist"}
        </button>
      </form>
      <p
        className={`mt-3 text-[13px] text-sage-400 ${centered ? "text-center" : ""}`}
        role="status"
      >
        {pending ? (
          "Adding you to the list…"
        ) : status === "invalid" ? (
          <span className="font-semibold text-gold-500">
            That email doesn&apos;t look right. Try again?
          </span>
        ) : (
          "Early access opens soon. We'll send one email when it does."
        )}
      </p>
    </div>
  );
}
