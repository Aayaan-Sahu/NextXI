import { Kicker } from "@/components/ui";
import { COACH_NOTE, DISCLOSURE, DRILL, WEAKEST } from "./report-data";

type Tone = "dark" | "light";

export function DeltaChip({ delta, tone }: { delta: number; tone: Tone }) {
  const up = delta >= 0;
  const upColor = tone === "dark" ? "text-vision-300" : "text-vision-700";
  return (
    <span
      className={`font-mono text-[11px] font-semibold ${up ? upColor : "text-rust-500"}`}
      title="Change from last session"
    >
      {up ? "+" : "−"}
      {Math.abs(delta)}
    </span>
  );
}

/** Focus area + recommended drill + coach sign-off + disclosure — shared by
    every format variant so only the score/metrics visualisation differs. */
export function ReportTrailer({ tone }: { tone: Tone }) {
  const dark = tone === "dark";
  const border = dark ? "border-cream-200/15" : "border-cream-300";
  const bodyText = dark ? "text-cream-100" : "text-ink-900";
  const muted = dark ? "text-sage-400" : "text-ink-600";

  return (
    <>
      <div className={`border-b ${border} py-4`}>
        <Kicker tone={tone}>Focus area</Kicker>
        <p className={`mt-2.5 text-[13px] leading-[1.6] ${bodyText}`}>{WEAKEST}</p>
        <div
          className={`mt-3 rounded-md border px-3 py-2.5 ${
            dark ? "border-gold-500/25 bg-gold-500/10" : "border-gold-500/40 bg-gold-500/12"
          }`}
        >
          <div
            className={`font-mono text-[10px] font-semibold tracking-[.2em] uppercase ${
              dark ? "text-gold-500" : "text-gold-600"
            }`}
          >
            Recommended drill
          </div>
          <p className={`mt-1.5 text-[12.5px] leading-[1.55] ${dark ? "text-cream-200" : "text-ink-900"}`}>
            {DRILL}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 py-4">
        <span
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm ${
            dark ? "bg-vision-500/20 text-vision-300" : "bg-vision-700/15 text-vision-700"
          }`}
        >
          ✓
        </span>
        <div>
          <div className={`font-display text-[13px] font-semibold tracking-[.06em] uppercase ${bodyText}`}>
            Reviewed &amp; signed off · ECB Level 3 coach
          </div>
          <p className={`mt-1.5 text-[12.5px] leading-[1.55] italic ${muted}`}>&ldquo;{COACH_NOTE}&rdquo;</p>
        </div>
      </div>

      <p
        className={`border-t pt-3 font-mono text-[10px] tracking-[.14em] uppercase ${
          dark ? "border-cream-200/10 text-sage-400/70" : "border-cream-300 text-ink-600/70"
        }`}
      >
        {DISCLOSURE}
      </p>
    </>
  );
}
