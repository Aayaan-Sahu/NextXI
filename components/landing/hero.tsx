import { ReportStatus } from "@/app/generated/prisma/enums";
import { WaitlistForm, type WaitlistState } from "@/components/landing/waitlist-form";
import { ReportPanel } from "@/components/report-panel";
import { Kicker } from "@/components/ui";
import type { VideoReport } from "@/lib/videos.server";

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
      "Strong base and a repeatable run-up. Your head falls away at release, so drive the front arm longer and hold the follow-through toward your target.",
    annotations: [
      { timestamp_s: 2, note: "Back-foot landing" },
      { timestamp_s: 3, note: "Front-knee brace holds" },
    ],
  },
  error: null,
  modelVersion: null,
  updatedAt: new Date("2026-07-12T09:30:00Z"),
};

/** Seam-red hero: headline, waitlist capture, and a real coaching report. */
export function LandingHero({ waitlist }: { waitlist?: WaitlistState }) {
  return (
    <section className="bg-seam-stitch">
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-14 px-6 py-16 sm:px-12 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Kicker tone="dark">AI technique coaching · youth cricket</Kicker>
          <h1 className="mt-5 font-display text-5xl leading-[0.98] font-bold text-cream-50 uppercase sm:text-6xl">
            Get coached on <span className="text-gold-500">every ball</span> you bowl.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-cream-200">
            Film your bowling or batting on a phone and upload it. The AI breaks down
            your technique and writes you a coaching report, like having a coach watch
            every ball back with you.
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
