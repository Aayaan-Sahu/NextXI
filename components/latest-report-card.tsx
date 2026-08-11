import Link from "next/link";
import { battingConsistency, parseBattingReport } from "@/components/batting-report";
import { parseBowlingReport } from "@/components/bowling-report";
import { measuredCardStats, parseMeasuredReport } from "@/components/measured-report";
import { isRecord, readFeedback, readOverallScore } from "@/components/report-panel";
import { Kicker } from "@/components/ui";

type CardStat = { label: string; value: string };

type CardData = {
  headline: string;
  stats: CardStat[];
};

const HEADLINE_MAX_CHARS = 140;

function firstSentence(prose: string) {
  const sentence = (prose.match(/^[^.!?]*[.!?]/)?.[0] ?? prose).trim();
  return sentence.length > HEADLINE_MAX_CHARS
    ? `${sentence.slice(0, HEADLINE_MAX_CHARS - 1).trimEnd()}…`
    : sentence;
}

/**
 * Derives the card copy from whatever the payload actually measured — the
 * shape detection and no-invented-numbers rules mirror ReportPanel: v3
 * measurements first, then batting, bowling, v1 legacy, then a bare
 * "Report ready".
 */
function deriveCard(payload: unknown): CardData {
  const measured = parseMeasuredReport(payload);
  if (measured) return measuredCardStats(measured);

  const batting = parseBattingReport(payload);
  if (batting) {
    if (batting.shots.length === 0) {
      return { headline: "Analysis ran — no clear batting shot detected.", stats: [] };
    }
    const multiShot = batting.shots.length > 1;
    const consistency = battingConsistency(batting);
    return {
      headline: `${batting.shots.length} shot${multiShot ? "s" : ""} analysed.`,
      stats: [
        ...(consistency === null ? [] : [{ label: "Consistency", value: `${consistency}%` }]),
        ...batting.shots[0].stats
          .slice(0, 2)
          .map(({ label, value }) => ({ label: multiShot ? `${label} · shot 1` : label, value })),
      ],
    };
  }

  const bowling = parseBowlingReport(payload);
  if (bowling) {
    // Mirror BowlingReport's hasContent check: a delivery with nothing
    // measured must not be headlined as analysed.
    const measuredDelivery =
      bowling.brace.label !== null ||
      bowling.brace.landingAngle !== null ||
      bowling.brace.releaseAngle !== null ||
      bowling.stats.length > 0 ||
      bowling.events.length > 0;
    if (!measuredDelivery) {
      return { headline: "Analysis ran — couldn't measure this delivery clearly.", stats: [] };
    }
    return {
      headline: bowling.brace.label
        ? `Front-knee brace: ${bowling.brace.label}.`
        : "Delivery analysed.",
      stats: bowling.stats.slice(0, 2).map(({ label, value }) => ({ label, value })),
    };
  }

  // v1 legacy payloads, via the same readers ReportPanel uses.
  if (isRecord(payload)) {
    const feedback = readFeedback(payload);
    const rawScore = readOverallScore(payload);
    const score = rawScore === null ? null : Math.round(rawScore);
    if (feedback || score !== null) {
      return {
        headline: feedback ? firstSentence(feedback.trim()) : "Report ready.",
        stats: score === null ? [] : [{ label: "Overall", value: `${score} / 100` }],
      };
    }
  }

  return { headline: "Report ready.", stats: [] };
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * The player home's compact scoreboard readout of the newest READY report,
 * linking through to the full report on the video page.
 */
export function LatestReportCard({
  href,
  payload,
  tagLabel,
  updatedAt,
}: {
  href: string;
  payload: unknown;
  tagLabel: string;
  updatedAt: Date;
}) {
  const card = deriveCard(payload);

  return (
    <section className="relative overflow-hidden rounded-[12px] bg-pitch-800 px-6 py-6 text-cream-200">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-thumb-scanlines opacity-40"
      />
      <div className="relative">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Kicker tone="dark">Latest report</Kicker>
          <p className="font-mono text-[11px] text-sage-400">
            {tagLabel} · {formatShortDate(updatedAt)}
          </p>
        </div>
        <h2 className="mt-3 font-display text-[22px] leading-tight font-bold tracking-[.02em] uppercase">
          {card.headline}
        </h2>
        {card.stats.length > 0 ? (
          <dl className="mt-4 flex flex-wrap gap-x-9 gap-y-3">
            {card.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-[11px] font-semibold tracking-[.22em] uppercase text-sage-400">
                  {stat.label}
                </dt>
                <dd className="mt-0.5 font-mono text-[22px] font-semibold text-gold-500">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        <Link
          className="mt-5 inline-block text-[13px] font-semibold text-gold-500 no-underline hover:text-gold-600"
          href={href}
        >
          View full report →
        </Link>
      </div>
    </section>
  );
}
