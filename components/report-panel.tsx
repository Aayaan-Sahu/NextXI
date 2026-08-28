import type { ReactNode } from "react";
import { ReportReviewStatus, ReportStatus } from "@/app/generated/prisma/enums";
import {
  BattingReport,
  battingConsistency,
  parseBattingReport,
} from "@/components/batting-report";
import { BowlingReport, parseBowlingReport } from "@/components/bowling-report";
import {
  DerivedMeasurements,
  MeasuredReport,
  measuredConsistency,
  parseMeasuredReport,
} from "@/components/measured-report";
import { ReportAutoRefresh } from "@/components/report-auto-refresh";
import { ReportSignoff } from "@/components/report-signoff";
import { Scoreboard, VERDICT_WORDS } from "@/components/scoreboard";
import { SeekButton } from "@/components/seek-button";
import { Kicker, Meter, SectionHeading } from "@/components/ui";
import { isFinalReportFailure } from "@/lib/report-errors";
import type { DerivedReport } from "@/lib/report-measurements";
import { readAnnotations } from "@/lib/report-moments";
import { isReportPublished } from "@/lib/report-review";
import type { VideoReport } from "@/lib/videos.server";

const KNOWN_PAYLOAD_KEYS = ["overall_score", "metrics", "feedback", "annotations"];
const LOW_SCORE_THRESHOLD = 60;

type Metric = { name: string; score: number; comment?: string };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

/** Reads a 0-100 number if present and finite. */
export function readOverallScore(payload: Record<string, unknown>): number | null {
  const raw = payload.overall_score;
  return typeof raw === "number" && Number.isFinite(raw) ? clampScore(raw) : null;
}

function readMetrics(payload: Record<string, unknown>): Metric[] {
  if (!Array.isArray(payload.metrics)) return [];
  return payload.metrics.flatMap((item) => {
    if (!isRecord(item)) return [];
    const { name, score, comment } = item;
    if (typeof name !== "string" || typeof score !== "number" || !Number.isFinite(score)) {
      return [];
    }
    return [{ name, score, comment: typeof comment === "string" ? comment : undefined }];
  });
}

export function readFeedback(payload: Record<string, unknown>): string | null {
  return typeof payload.feedback === "string" && payload.feedback.trim()
    ? payload.feedback
    : null;
}

function hasExtraKeys(payload: Record<string, unknown>) {
  return Object.keys(payload).some((key) => !KNOWN_PAYLOAD_KEYS.includes(key));
}

/**
 * The escape hatch onto the raw payload. A disclosure, not a panel — nobody
 * opens it in the normal course of reading a report.
 */
export function RawDetails({ payload }: { payload: unknown }) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-caption font-semibold text-rust-600">
        Raw report data
      </summary>
      <pre className="mt-2 overflow-x-auto rounded-md bg-cream-100 px-3 py-2.5 text-caption leading-relaxed text-ink-600">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}

/** Calibration, frame rate and model version — provenance, kept quiet. */
export function ReportMeta({ parts }: { parts: (string | null | undefined)[] }) {
  const shown = parts.filter(Boolean);
  if (!shown.length) return null;
  return <p className="mt-4 text-caption text-ink-600">{shown.join(" · ")}</p>;
}

/** A "good / ok / needs work" verdict, coloured by what it says. */
export function VerdictRow({ label, value }: { label: string; value: string }) {
  const tone =
    value === "good"
      ? "text-moss-600"
      : value === "needs work"
        ? "text-rust-600"
        : "text-ink-600";

  return (
    <div className="flex justify-between border-t border-cream-250 py-[9px] text-ui">
      <span className="text-ink-800">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

/** A measured figure inside a shot's four-up stat row. */
export function ShotStat({ label, value }: { label: string; value: string }) {
  // The unit trails the number at a smaller weight, so a column of figures
  // still aligns on the digits.
  const [figure, unit] = value.split(/\s+(?=[^\s]+$)/);
  return (
    <div>
      <div className="text-lead leading-none font-semibold tabular-nums">
        {figure}
        {unit ? <span className="text-caption font-normal text-ink-600"> {unit}</span> : null}
      </div>
      <div className="mt-[5px] text-caption text-ink-600">{label}</div>
    </div>
  );
}

const LOW_CONSISTENCY_THRESHOLD = 60;

/** A labelled consistency percentage with its meter. */
export function ConsistencyRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const low = value !== null && value < LOW_CONSISTENCY_THRESHOLD;

  return (
    <div>
      <div className="flex justify-between text-ui">
        <span>{label}</span>
        <span className={`font-semibold ${value === null ? "text-ink-600" : low ? "text-rust-600" : ""}`}>
          {value === null ? "—" : `${value}%`}
        </span>
      </div>
      <Meter tone={low ? "rust" : "amber"} value={value} />
    </div>
  );
}

function ReadyReport({ report }: { report: VideoReport }) {
  const payload = report.payload;

  // A ready report should carry an object payload; if it doesn't, fail soft.
  if (!isRecord(payload)) {
    return (
      <>
        <p className="text-body leading-relaxed text-ink-800">
          Your coaching report is ready, but it arrived in an unexpected format.
        </p>
        <RawDetails payload={payload} />
      </>
    );
  }

  const metrics = readMetrics(payload);
  const feedback = readFeedback(payload);
  const annotations = readAnnotations(payload);
  const overallScore = readOverallScore(payload);
  const showRaw =
    hasExtraKeys(payload) ||
    (overallScore === null && !metrics.length && !feedback && !annotations.length);

  return (
    <>
      <div className="grid gap-3.5">
        {metrics.map((metric, index) => (
          <div key={`${metric.name}-${index}`}>
            <div className="flex items-baseline justify-between gap-3 text-ui">
              <span className="font-semibold">{metric.name}</span>
              <span
                className={`font-semibold tabular-nums ${
                  metric.score < LOW_SCORE_THRESHOLD ? "text-rust-600" : ""
                }`}
              >
                {Math.round(metric.score)}
              </span>
            </div>
            <Meter
              tone={metric.score < LOW_SCORE_THRESHOLD ? "rust" : "amber"}
              value={clampScore(metric.score)}
            />
            {metric.comment && (
              <p className="mt-1.5 text-caption leading-relaxed text-ink-600">{metric.comment}</p>
            )}
          </div>
        ))}
      </div>

      {feedback && (
        <div className="mt-6">
          <SectionHeading as="h3">Model notes</SectionHeading>
          <p className="mt-2 text-ui leading-relaxed whitespace-pre-wrap text-ink-800">
            {feedback}
          </p>
        </div>
      )}

      {annotations.length > 0 && (
        <div className="mt-6">
          <SectionHeading as="h3">Timeline notes</SectionHeading>
          <div className="mt-2.5 grid gap-2 text-ui">
            {annotations.map((annotation, index) => (
              <div className="flex gap-3" key={`${annotation.timestamp_s}-${index}`}>
                <SeekButton className="shrink-0" t={annotation.timestamp_s} />
                <span className="text-ink-800">{annotation.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRaw && <RawDetails payload={payload} />}
      <ReportMeta parts={[report.modelVersion && `Generated by ${report.modelVersion}`]} />
    </>
  );
}

/**
 * The report card: an ink header saying what was measured and the one figure
 * that summarises it, then the body. Every lifecycle state uses this shell, so
 * "Preparing" and "Analysis failed" read as the same object as a full report
 * rather than as an error page where the report should be.
 */
function ReportShell({
  children,
  figure,
  footer,
  headline,
}: {
  children: ReactNode;
  figure?: ReactNode;
  /** After the body on every shape — the coach's sign-off. */
  footer?: ReactNode;
  headline: string;
}) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-cream-400 bg-cream-50">
      <div className="flex items-end justify-between gap-4 bg-pitch-900 px-6 py-5 text-cream-200">
        <div className="min-w-0">
          <Kicker tone="dark">Coaching report</Kicker>
          <h2 className="mt-1.5 font-display text-title font-semibold tracking-[.02em] uppercase">
            {headline}
          </h2>
        </div>
        {figure}
      </div>
      <div className="px-6 pt-5 pb-6">
        {children}
        {footer}
      </div>
    </section>
  );
}

/** "Sam Carter", "Sam Carter and Priya Nair", "A, B and C". */
function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function HeadlineFigure({ caption, value }: { caption: string; value: string }) {
  return (
    <div className="shrink-0 text-right">
      <div className="text-figure leading-none font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-caption text-cream-200/60">{caption}</div>
    </div>
  );
}

/**
 * Renders the AI coaching report for a video, defensively, in every lifecycle
 * state.
 */
export function ReportPanel({
  report,
  derived,
  audience = "player",
  coachNames = [],
  viewerId,
}: {
  report: VideoReport | null;
  /**
   * Measurement rows the platform derived from the payload plus the player's
   * report history (lib/report-history.ts). Pages that can load history pass
   * it; the panel renders fine without, so a v3 payload never depends on it.
   */
  derived?: DerivedReport | null;
  /**
   * Who is reading. A player (or their guardian) sees "With your coach" until
   * a connected coach signs the report off; that coach — the reviewer — sees
   * the body regardless; a coach browsing a public player they aren't
   * connected to (an observer) waits like the player does.
   */
  audience?: "player" | "reviewer" | "observer";
  /** The player's connected coaches, for the waiting copy. */
  coachNames?: string[];
  /** The signed-in user, so a coach's own stamp reads "You signed this off". */
  viewerId?: string;
}) {
  const delivered = report?.status === ReportStatus.READY;
  const published = isReportPublished(report);
  // Everything below reads `payload` — an unpublished report's never reaches
  // a player through this component, whatever the caller passed in.
  const visible = delivered && (published || audience === "reviewer");
  const payload = visible && report && isRecord(report.payload) ? report.payload : null;
  // Prefer v3 measurements (same data the landing demo draws), then batting /
  // bowling shapes, then legacy 0-100 scores — see reports-contract.md.
  const measured = payload ? parseMeasuredReport(payload) : null;
  const batting = !measured && payload ? parseBattingReport(payload) : null;
  const bowling = !measured && !batting && payload ? parseBowlingReport(payload) : null;
  // Bowling is a single delivery, so it has no headline figure. Measured and
  // batting show repeatability; legacy payloads keep whatever 0-100 score the
  // pipeline sent, since we cannot recover a measurement from one.
  const consistency = measured
    ? measuredConsistency(measured)
    : batting
      ? battingConsistency(batting)
      : null;
  const legacyScore =
    !measured && !batting && !bowling && payload ? readOverallScore(payload) : null;

  if (!report || report.status === ReportStatus.PENDING || report.status === ReportStatus.PROCESSING) {
    return (
      <ReportShell
        figure={
          <span
            aria-hidden
            className="size-[9px] shrink-0 rounded-full bg-amber-500 motion-safe:animate-pulse"
          />
        }
        headline="Preparing"
      >
        <p className="text-body leading-relaxed text-ink-800">
          Your coaching report is being prepared.
        </p>
        <div className="mt-3.5 h-1 overflow-hidden rounded-sm bg-cream-250">
          <div className="h-full w-1/3 rounded-sm bg-amber-500 motion-safe:animate-pulse" />
        </div>
        <p className="mt-2.5 text-caption text-ink-600">
          This page updates itself — no need to reload.
        </p>
        <ReportAutoRefresh />
      </ReportShell>
    );
  }

  if (report.status === ReportStatus.FAILED) {
    const final = isFinalReportFailure(report.error);
    return (
      <ReportShell
        figure={
          final ? (
            <span className="shrink-0 rounded-full bg-rust-600 px-2.5 py-1 text-caption font-semibold text-cream-50">
              Final
            </span>
          ) : undefined
        }
        headline="Analysis failed"
      >
        <p className="text-body leading-relaxed text-ink-800">
          {/* Dead-lettered: the pipeline has given up, so don't promise a retry. */}
          {final
            ? report.error
            : "We couldn't complete the analysis for this video. We'll retry automatically — please check back later."}
        </p>
        <RawDetails payload={report.payload} />
      </ReportShell>
    );
  }

  if (delivered && !visible) {
    const waiting =
      audience === "observer"
        ? "A connected coach is checking this report before it's released."
        : coachNames.length === 0
          ? "A coach is checking this report before it's released to you."
          : `${joinNames(coachNames)} ${coachNames.length === 1 ? "is" : "are"} reviewing this report. You'll see it here once it's signed off.`;
    return (
      <ReportShell headline={audience === "observer" ? "With the player's coach" : "With your coach"}>
        {/* A human wait, not a machine one — no pulsing dot, no progress bar. */}
        <p className="text-body leading-relaxed text-ink-800">{waiting}</p>
        <p className="mt-2.5 text-caption text-ink-600">
          This page updates itself — no need to reload.
        </p>
        <ReportAutoRefresh intervalMs={60_000} />
      </ReportShell>
    );
  }

  const signoff =
    report.reviewStatus === ReportReviewStatus.APPROVED && report.reviewedByName && report.reviewedAt ? (
      <ReportSignoff
        at={report.reviewedAt}
        credential={report.reviewerCredential}
        name={report.reviewedByName}
        note={report.coachNote}
        self={viewerId !== undefined && viewerId === report.reviewedById}
      />
    ) : null;

  if (measured) {
    const declined = !measured.scored || measured.metrics.length === 0;
    return (
      <ReportShell
        footer={signoff}
        figure={
          consistency === null ? undefined : (
            <HeadlineFigure caption="Consistency" value={`${consistency}%`} />
          )
        }
        headline={
          declined
            ? "Not measured"
            : `${measured.metrics.length} measurement${measured.metrics.length === 1 ? "" : "s"}`
        }
      >
        <MeasuredReport parsed={measured} report={report} />
      </ReportShell>
    );
  }

  // A v2 payload the platform could score and measure server-side reads as
  // the home page's report: the session number and verdict in the header,
  // the scoreboard, then the measurement rows. Only reached when the worker
  // sent no `measurements`.
  if (derived && (derived.scores || derived.metrics.length > 0) && payload) {
    const scores = derived.scores;
    const rows = derived.metrics.length;
    return (
      <ReportShell
        footer={signoff}
        figure={
          scores ? (
            <HeadlineFigure caption="of 100" value={String(scores.score)} />
          ) : consistency === null ? undefined : (
            <HeadlineFigure caption="Consistency" value={`${consistency}%`} />
          )
        }
        headline={
          scores ? VERDICT_WORDS[scores.verdict] : `${rows} measurement${rows === 1 ? "" : "s"}`
        }
      >
        {scores ? (
          <Scoreboard consistency={consistency} focus={derived.focus} scores={scores} />
        ) : null}
        {rows > 0 ? (
          <>
            {scores ? (
              <div className="mt-5">
                <SectionHeading as="h3">Measurements</SectionHeading>
              </div>
            ) : null}
            <DerivedMeasurements
              metaParts={[report.modelVersion]}
              metrics={derived.metrics}
              payload={report.payload}
            />
          </>
        ) : (
          <>
            <RawDetails payload={report.payload} />
            <ReportMeta parts={[report.modelVersion]} />
          </>
        )}
      </ReportShell>
    );
  }

  if (batting) {
    const shots = batting.shots.length;
    return (
      <ReportShell
        footer={signoff}
        figure={
          consistency === null ? undefined : (
            <HeadlineFigure caption="Consistency" value={`${consistency}%`} />
          )
        }
        headline={shots === 0 ? "Not measured" : `${shots} shot${shots === 1 ? "" : "s"} detected`}
      >
        <BattingReport parsed={batting} report={report} />
      </ReportShell>
    );
  }

  if (bowling) {
    return (
      <ReportShell footer={signoff} headline="One delivery measured">
        <BowlingReport parsed={bowling} report={report} />
      </ReportShell>
    );
  }

  return (
    <ReportShell
      footer={signoff}
      figure={
        legacyScore === null ? undefined : (
          <HeadlineFigure caption="Overall" value={`${legacyScore} / 100`} />
        )
      }
      headline={legacyScore === null ? "Report ready" : "Legacy format"}
    >
      <ReadyReport report={report} />
    </ReportShell>
  );
}
