import { Kicker } from "@/components/ui";
import { COACH_NOTE, DISCLOSURE, DRILL, WEAKEST } from "./report-data";

type Tone = "dark" | "light";

/** Focus area + recommended drill + coach sign-off + disclosure — shared by
    every format variant so only the measurement visualisation differs. */
export function ReportTrailer({ tone }: { tone: Tone }) {
  const dark = tone === "dark";
  const rule = dark ? "border-cream-200/15" : "border-cream-400";
  const bodyText = dark ? "text-cream-100" : "text-ink-800";
  const heading = dark ? "text-cream-50" : "text-ink-900";
  const muted = dark ? "text-cream-200/70" : "text-ink-600";

  return (
    <>
      <div className={`border-b ${rule} py-4`}>
        <Kicker tone={tone}>Focus area</Kicker>
        <p className={`mt-2.5 text-ui ${bodyText}`}>{WEAKEST}</p>
        {/* The info flash: a left rule and a tinted ground, per Notice — not a
            fully bordered box, and never peach (peach is the primary action). */}
        <div
          className={`mt-3 border-l-2 border-amber-500 px-3 py-2.5 ${
            dark ? "bg-cream-200/10" : "bg-cream-250"
          }`}
        >
          <div className={`text-caption font-semibold ${heading}`}>Recommended drill</div>
          <p className={`mt-1 text-caption ${bodyText}`}>{DRILL}</p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 py-4">
        {/* moss is the system's one green — a positive verdict in a report. It
            has no light step, so on the dark variants the tick goes cream. */}
        <span className={`mt-px text-ui ${dark ? "text-cream-50" : "text-moss-600"}`} aria-hidden>
          ✓
        </span>
        <div>
          <div className={`text-ui font-semibold ${heading}`}>
            Reviewed &amp; signed off · ECB Level 3 coach
          </div>
          <p className={`mt-1.5 text-caption italic ${muted}`}>&ldquo;{COACH_NOTE}&rdquo;</p>
        </div>
      </div>

      <p className={`border-t pt-3 text-caption ${rule} ${muted}`}>{DISCLOSURE}</p>
    </>
  );
}
