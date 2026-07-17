import { joinWaitlist } from "@/app/actions";

export type WaitlistState = "joined" | "invalid";

/** Email capture for the pre-launch waitlist, styled for the seam-red hero. */
export function WaitlistForm({
  align = "start",
  waitlist,
}: {
  align?: "start" | "center";
  waitlist?: WaitlistState;
}) {
  const centered = align === "center";

  if (waitlist === "joined") {
    return (
      <div
        className={`w-full max-w-[460px] rounded-md border border-gold-500/40 bg-pitch-950/40 px-4 py-3.5 text-sm text-cream-200 ${
          centered ? "mx-auto text-center" : ""
        }`}
      >
        <span className="font-bold text-gold-500">You&apos;re on the list.</span>{" "}
        We&apos;ll email you when the nets open.
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[460px] ${centered ? "mx-auto" : ""}`}>
      <form action={joinWaitlist} className="flex gap-2.5 max-sm:flex-col">
        <input
          aria-label="Email address"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-md bg-cream-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-600 focus:ring-2 focus:ring-gold-500/60 focus:outline-none"
          name="email"
          placeholder="you@email.com"
          required
          type="email"
        />
        <button
          className="cursor-pointer rounded-md bg-pitch-950 px-5 py-3 text-sm font-bold text-gold-500 hover:bg-pitch-900"
          type="submit"
        >
          Join the waitlist
        </button>
      </form>
      <p className={`mt-3 text-[13px] text-sage-400 ${centered ? "text-center" : ""}`}>
        {waitlist === "invalid" ? (
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
