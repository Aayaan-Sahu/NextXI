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
 * The player home's one primary conclusion: the newest READY report read as a
 * scoreboard. Clip name on the left, the measurements that matter across the
 * middle, the way through on the right.
 */
export function LatestReportCard({
  href,
  payload,
  tagLabel,
  title,
  updatedAt,
}: {
  href: string;
  payload: unknown;
  tagLabel: string;
  title: string;
  updatedAt: Date;
}) {
  const card = deriveCard(payload);

  return (
    <section className="rounded-[10px] bg-pitch-900 px-7 py-6 text-cream-200">
      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
        <div className="min-w-0">
          <Kicker as="h2" tone="dark">
            Latest report
          </Kicker>
          <p className="mt-2 truncate font-display text-figure font-semibold tracking-[.02em] text-cream-200 uppercase">
            {title}
          </p>
          <p className="mt-1 text-ui text-cream-200/60">
            {formatShortDate(updatedAt)} · {tagLabel}
          </p>
        </div>
        {card.stats.length > 0 ? (
          <dl className="flex flex-wrap gap-x-11 gap-y-4">
            {card.stats.map((stat) => (
              <div key={stat.label}>
                <dd className="text-figure leading-none font-semibold tabular-nums">
                  {stat.value}
                </dd>
                <dt className="mt-1.5 text-caption text-cream-200/60">{stat.label}</dt>
              </div>
            ))}
          </dl>
        ) : (
          <p className="max-w-sm text-body leading-relaxed text-cream-200/85">
            {card.headline}
          </p>
        )}
        <Link
          className="shrink-0 text-ui font-semibold text-gold-500 no-underline hover:text-gold-600"
          href={href}
        >
          View full report →
        </Link>
      </div>
    </section>
  );
}
