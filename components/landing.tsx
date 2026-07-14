import Link from "next/link";
import { joinWaitlist } from "@/app/actions";
import { ReportStatus } from "@/app/generated/prisma/enums";
import { ReportPanel } from "@/components/report-panel";
import { Kicker, Wordmark } from "@/components/ui";
import type { VideoReport } from "@/lib/videos.server";

export type WaitlistState = "joined" | "invalid";

/**
 * A real READY report rendered through the same ReportPanel players see, so
 * the marketing hero can never drift from the product. Legacy payload shape
 * (overall_score / metrics / feedback / annotations) — the richest render.
 */
const SAMPLE_REPORT: VideoReport = {
  status: ReportStatus.READY,
  schemaVersion: 3,
  payload: {
    overall_score: 78,
    metrics: [
      { name: "Release consistency", score: 78 },
      {
        name: "Front-arm drive",
        score: 58,
        comment: "Front arm collapses early through the crease.",
      },
      { name: "Follow-through", score: 84 },
    ],
    feedback:
      "Strong base and a repeatable run-up. Your head falls away at release — drive the front arm longer and hold the follow-through toward your target.",
    annotations: [
      { timestamp_s: 2, note: "Back-foot landing" },
      { timestamp_s: 3, note: "Front-knee brace holds" },
    ],
  },
  error: null,
  modelVersion: null,
  updatedAt: new Date("2026-07-12T09:30:00Z"),
};

const STEPS = [
  {
    number: "01",
    title: "Film your session",
    body: "A phone at the nets is all you need. Record your deliveries or shots and upload straight from your device.",
  },
  {
    number: "02",
    title: "The AI breaks it down",
    body: "Frame-by-frame analysis of your technique — run-up, stride, release, follow-through — measured, not guessed.",
  },
  {
    number: "03",
    title: "Get your report",
    body: "Scores you can track session to session, key moments pinned to the timeline, and one clear focus to work on next.",
  },
];

const REPORT_FEATURES = [
  {
    title: "Technique metrics",
    body: "Release, stride, and follow-through each scored 0–100, so you can watch the numbers climb as you train.",
  },
  {
    title: "Key moments",
    body: "Timestamped notes pin every piece of feedback to the exact frame it happens in your video.",
  },
  {
    title: "A focus for the week",
    body: "Every report ends with the one thing that will move your game most before the next session.",
  },
];

const TRUST_ITEMS = [
  {
    title: "Guardians see everything",
    body: "Parents and guardians get their own linked account with full visibility into reports and messages.",
  },
  {
    title: "Coaches are verified",
    body: "Every coach is reviewed and approved by NextXI before they can connect with any player.",
  },
  {
    title: "Your videos, your call",
    body: "Players control who can see their videos and coaching reports.",
  },
];

function WaitlistForm({
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
            That email didn&apos;t look right — try again?
          </span>
        ) : (
          "Early access opens soon. One email when the nets open — no spam."
        )}
      </p>
    </div>
  );
}

function LandingNav() {
  return (
    <header className="bg-rust-600">
      <nav className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-6 px-6 sm:px-12">
        <Wordmark tone="dark" />
        <div className="flex items-center gap-6">
          <Link
            className="text-sm font-semibold text-sage-400 no-underline hover:text-cream-200"
            href="/auth"
          >
            Sign in
          </Link>
          <a
            className="rounded-md bg-cream-50 px-4 py-2.5 text-sm font-bold text-rust-700 no-underline hover:bg-cream-100"
            href="#waitlist"
          >
            Join the waitlist
          </a>
        </div>
      </nav>
    </header>
  );
}

function Hero({ waitlist }: { waitlist?: WaitlistState }) {
  return (
    <section className="bg-seam-stitch">
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-14 px-6 py-16 sm:px-12 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Kicker tone="dark">AI technique coaching · youth cricket</Kicker>
          <h1 className="mt-5 font-display text-5xl leading-[0.98] font-bold text-cream-50 uppercase sm:text-6xl">
            Get coached on <span className="text-gold-500">every ball</span> you bowl.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-cream-200">
            Upload your batting or bowling videos and NextXI&apos;s AI breaks down your
            technique — what&apos;s working, what to fix, and how you&apos;re improving.
            Built for young cricketers who want to get seen.
          </p>
          <div className="mt-8 scroll-mt-24" id="waitlist">
            <WaitlistForm waitlist={waitlist} />
          </div>
        </div>
        <div className="w-full max-w-[440px] justify-self-center rounded-[12px] shadow-2xl shadow-black/45 lg:justify-self-end">
          <ReportPanel
            report={SAMPLE_REPORT}
            subtitle="front-on-delivery.mp4 · 0:42"
            tone="dark"
          />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="bg-cream-100">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-16 sm:px-12 sm:py-20">
        <Kicker>How it works</Kicker>
        <h2 className="mt-3 max-w-[24ch] font-display text-3xl leading-[1.02] font-bold uppercase sm:text-4xl">
          From the nets to a coaching report
        </h2>
        <div className="mt-10 grid gap-9 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number}>
              <div className="font-mono text-[13px] font-semibold text-rust-600">
                {step.number}
              </div>
              <h3 className="mt-2 font-display text-xl leading-tight font-semibold uppercase">
                {step.title}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InsideEveryReport() {
  return (
    <section className="bg-cream-200">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-16 sm:px-12 sm:py-20">
        <Kicker>Inside every report</Kicker>
        <h2 className="mt-3 max-w-[24ch] font-display text-3xl leading-[1.02] font-bold uppercase sm:text-4xl">
          Feedback you can act on
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {REPORT_FEATURES.map((feature) => (
            <div
              className="rounded-[10px] border border-cream-400 bg-cream-100 p-6"
              key={feature.title}
            >
              <h3 className="font-display text-xl leading-tight font-semibold uppercase">
                {feature.title}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="bg-pitch-900">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-16 sm:px-12 sm:py-20">
        <Kicker tone="dark">Built safe for youth cricket</Kicker>
        <h2 className="mt-3 max-w-[24ch] font-display text-3xl leading-[1.02] font-bold text-cream-50 uppercase sm:text-4xl">
          The adults stay in the loop
        </h2>
        <div className="mt-10 grid gap-9 sm:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-xl leading-tight font-semibold text-cream-200 uppercase">
                {item.title}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-sage-400">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ waitlist }: { waitlist?: WaitlistState }) {
  return (
    <section className="bg-seam-stitch">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-6 py-16 text-center sm:px-12 sm:py-20">
        <h2 className="max-w-[20ch] font-display text-4xl leading-[0.98] font-bold text-cream-50 uppercase sm:text-5xl">
          Be first in when the nets open.
        </h2>
        <p className="mt-4 text-[15px] text-cream-200">
          Early access is limited while we onboard the first clubs.
        </p>
        <div className="mt-8 w-full">
          <WaitlistForm align="center" waitlist={waitlist} />
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-pitch-950">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 py-8 sm:px-12">
        <Wordmark tone="dark" />
        <p className="font-mono text-[11px] text-sage-400">© 2026 NextXI</p>
      </div>
    </footer>
  );
}

/** The public marketing page rendered at `/` for signed-out visitors. */
export function LandingPage({ waitlist }: { waitlist?: WaitlistState }) {
  return (
    <main>
      <LandingNav />
      <Hero waitlist={waitlist} />
      <HowItWorks />
      <InsideEveryReport />
      <TrustStrip />
      <FinalCta waitlist={waitlist} />
      <LandingFooter />
    </main>
  );
}
