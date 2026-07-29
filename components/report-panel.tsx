import { ReportStatus } from "@/app/generated/prisma/enums";
import {
  BattingReport,
  battingConsistency,
  parseBattingReport,
} from "@/components/batting-report";
import { BowlingReport, parseBowlingReport } from "@/components/bowling-report";
import { ReportAutoRefresh } from "@/components/report-auto-refresh";
import { Kicker } from "@/components/ui";
import { isFinalReportFailure } from "@/lib/report-errors";
import type { VideoReport } from "@/lib/videos.server";

const KNOWN_PAYLOAD_KEYS = ["overall_score", "metrics", "feedback", "annotations"];
const LOW_SCORE_THRESHOLD = 60;

type Tone = "light" | "dark";
type Metric = { name: string; score: number; comment?: string };
type Annotation = { timestamp_s: number; note: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

/** Reads a 0-100 number if present and finite. */
function readOverallScore(payload: Record<string, unknown>): number | null {
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

function readAnnotations(payload: Record<string, unknown>): Annotation[] {
  if (!Array.isArray(payload.annotations)) return [];
  return payload.annotations.flatMap((item) => {
    if (!isRecord(item)) return [];
    const { timestamp_s, note } = item;
    if (typeof timestamp_s !== "number" || !Number.isFinite(timestamp_s) || typeof note !== "string") {
      return [];
    }
    return [{ timestamp_s, note }];
  });
}

function readFeedback(payload: Record<string, unknown>): string | null {
  return typeof payload.feedback === "string" && payload.feedback.trim()
    ? payload.feedback
    : null;
}

function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function hasExtraKeys(payload: Record<string, unknown>) {
  return Object.keys(payload).some((key) => !KNOWN_PAYLOAD_KEYS.includes(key));
}

function ScoreBar({ score, tone }: { score: number; tone: Tone }) {
  const width = clampScore(score);
  const low = score < LOW_SCORE_THRESHOLD;
  const fill =
    tone === "dark"
      ? low
        ? "bg-rust-500"
        : "bg-gold-500"
      : low
        ? "bg-rust-600"
        : "bg-gold-500";
  return (
    <div
      className={`overflow-hidden rounded-sm ${
        tone === "dark" ? "h-[3px] bg-black/30" : "h-1 bg-cream-300"
      }`}
      aria-hidden
    >
      <div className={`h-full rounded-sm ${fill}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function RawDetails({ payload, tone }: { payload: unknown; tone: Tone }) {
  const dark = tone === "dark";
  return (
    <details
      className={`rounded-md border ${
        dark ? "border-cream-200/15 bg-black/20" : "border-cream-400 bg-cream-50"
      }`}
    >
      <summary
        className={`cursor-pointer px-3 py-2 text-sm font-medium ${
          dark ? "text-sage-400" : "text-ink-600"
        }`}
      >
        Raw report data
      </summary>
      <pre
        className={`overflow-x-auto border-t px-3 py-2 text-xs leading-relaxed ${
          dark ? "border-cream-200/15 text-cream-200" : "border-cream-400 text-ink-600"
        }`}
      >
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}

function StatusMessage({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return (
    <p className={`pt-4 text-sm ${tone === "dark" ? "text-sage-400" : "text-ink-600"}`}>
      {children}
    </p>
  );
}

function ReadyReport({ report, tone }: { report: VideoReport; tone: Tone }) {
  const dark = tone === "dark";
  const payload = report.payload;

  // A ready report should carry an object payload; if it doesn't, fail soft.
  if (!isRecord(payload)) {
    return (
      <div className="grid gap-3 pt-4">
        <p className={`text-sm ${dark ? "text-sage-400" : "text-ink-600"}`}>
          Your coaching report is ready, but it arrived in an unexpected format.
        </p>
        <RawDetails payload={payload} tone={tone} />
      </div>
    );
  }

  const metrics = readMetrics(payload);
  const feedback = readFeedback(payload);
  const annotations = readAnnotations(payload);
  const overallScore = readOverallScore(payload);
  const showRaw =
    hasExtraKeys(payload) ||
    (overallScore === null && !metrics.length && !feedback && !annotations.length);
  const rowBorder = dark ? "border-cream-200/15" : "border-cream-400";

  if (dark) {
    return (
      <>
        {metrics.map((metric, index) => (
          <div className={`border-b py-[13px] ${rowBorder}`} key={`${metric.name}-${index}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-sm tracking-[.08em] uppercase">
                {metric.name}
              </span>
              <span
                className={`font-mono text-sm font-semibold ${
                  metric.score < LOW_SCORE_THRESHOLD ? "text-rust-500" : "text-gold-500"
                }`}
              >
                {Math.round(metric.score)}
              </span>
            </div>
            <div className="mt-[7px]">
              <ScoreBar score={metric.score} tone={tone} />
            </div>
            {metric.comment && (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-sage-400">
                {metric.comment}
              </p>
            )}
          </div>
        ))}

        {feedback && (
          <div className={`border-b py-4 ${rowBorder}`}>
            <Kicker tone="dark">Coach feedback</Kicker>
            <p className="mt-2.5 text-[13px] leading-[1.65] whitespace-pre-wrap text-cream-200">
              {feedback}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-[9px] py-4">
          {annotations.length > 0 && (
            <>
              <Kicker tone="dark">Timeline notes</Kicker>
              {annotations.map((annotation, index) => (
                <div
                  className="flex items-baseline gap-2.5"
                  key={`${annotation.timestamp_s}-${index}`}
                >
                  <span className="shrink-0 font-mono text-[11px] text-gold-500">
                    {formatTimestamp(annotation.timestamp_s)}
                  </span>
                  <span className="text-[12.5px] text-cream-200">{annotation.note}</span>
                </div>
              ))}
            </>
          )}

          {showRaw && <RawDetails payload={payload} tone={tone} />}

          {report.modelVersion && (
            <p className="mt-1.5 font-mono text-[10.5px] text-sage-400">
              Generated by {report.modelVersion}
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 pt-4">
      {metrics.map((metric, index) => (
        <div key={`${metric.name}-${index}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13.5px] font-semibold">{metric.name}</span>
            <span
              className={`font-mono text-[13.5px] font-semibold ${
                metric.score < LOW_SCORE_THRESHOLD ? "text-rust-600" : "text-ink-900"
              }`}
            >
              {Math.round(metric.score)}
            </span>
          </div>
          <div className="mt-1.5">
            <ScoreBar score={metric.score} tone={tone} />
          </div>
          {metric.comment && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{metric.comment}</p>
          )}
        </div>
      ))}

      {feedback && (
        <div className="pt-1">
          <Kicker>Coach feedback</Kicker>
          <p className="mt-2.5 text-[13px] leading-[1.65] whitespace-pre-wrap text-ink-900">
            {feedback}
          </p>
        </div>
      )}

      {annotations.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <Kicker>Timeline notes</Kicker>
          {annotations.map((annotation, index) => (
            <div className="flex items-baseline gap-2.5" key={`${annotation.timestamp_s}-${index}`}>
              <span className="shrink-0 font-mono text-[11px] text-rust-600">
                {formatTimestamp(annotation.timestamp_s)}
              </span>
              <span className="text-[12.5px] text-ink-900">{annotation.note}</span>
            </div>
          ))}
        </div>
      )}

      {showRaw && <RawDetails payload={payload} tone={tone} />}

      {report.modelVersion && (
        <p className="mt-1 font-mono text-[10.5px] text-ink-600">
          Generated by {report.modelVersion}
        </p>
      )}
    </div>
  );
}

/**
 * Renders the AI coaching report for a video, defensively, in every lifecycle
 * state. `tone="light"` (default) is the cream card used on coach/guardian
 * pages; `tone="dark"` is the pitch scoreboard used on the player detail.
 */
export function ReportPanel({
  report,
  subtitle,
  tone = "light",
}: {
  report: VideoReport | null;
  /** Optional mono line under the kicker, e.g. the video filename. */
  subtitle?: string;
  tone?: Tone;
}) {
  const dark = tone === "dark";
  const ready = report?.status === ReportStatus.READY;
  const payload = ready && isRecord(report.payload) ? report.payload : null;
  // Each analyser emits its own shape; anything unrecognised uses the legacy render.
  const batting = payload ? parseBattingReport(payload) : null;
  const bowling = !batting && payload ? parseBowlingReport(payload) : null;
  // Bowling is a single delivery, so it has no headline figure. Batting shows
  // repeatability across its shots; legacy payloads keep whatever 0-100 score
  // the pipeline sent, since we cannot recover a measurement from one.
  const consistency = batting ? battingConsistency(batting) : null;
  const legacyScore =
    !batting && !bowling && payload ? readOverallScore(payload) : null;

  return (
    <section
      className={
        dark
          ? "rounded-[12px] bg-pitch-800 bg-[repeating-linear-gradient(0deg,transparent_0_44px,rgba(0,0,0,.10)_44px_46px)] px-[26px] pt-[26px] pb-3.5 text-cream-200"
          : "rounded-[10px] border border-cream-400 bg-white p-6"
      }
    >
      <div
        className={`flex justify-between gap-4 border-b pb-4 ${
          dark ? "items-end border-cream-200/15" : "items-start border-cream-400"
        }`}
      >
        <div>
          <Kicker tone={tone}>Coaching report</Kicker>
          {subtitle && (
            <div
              className={`mt-2 font-mono text-[11px] ${dark ? "text-sage-400" : "text-ink-600"}`}
            >
              {subtitle}
            </div>
          )}
        </div>
        {consistency !== null && (
          <div className="text-right">
            <div
              className={`font-mono leading-none font-semibold ${
                dark ? "text-[44px] text-gold-500" : "text-4xl"
              }`}
            >
              {consistency}
              <span className={dark ? "text-2xl" : "text-xl"}>%</span>
            </div>
            <div
              className={`mt-0.5 font-display tracking-[.2em] uppercase ${
                dark ? "text-[11px] text-sage-400" : "text-[10px] text-ink-600"
              }`}
            >
              Consistency
            </div>
          </div>
        )}
        {legacyScore !== null && (
          <div className="text-right">
            <div
              className={`font-mono leading-none font-semibold ${
                dark ? "text-[44px] text-gold-500" : "text-4xl"
              }`}
            >
              {legacyScore}
            </div>
            <div
              className={`mt-0.5 font-display tracking-[.22em] uppercase ${
                dark ? "text-[11px] text-sage-400" : "text-[10px] text-ink-600"
              }`}
            >
              {dark ? "Overall / 100" : "/ 100 overall"}
            </div>
          </div>
        )}
      </div>

      {(!report ||
        report.status === ReportStatus.PENDING ||
        report.status === ReportStatus.PROCESSING) && (
        <>
          <StatusMessage tone={tone}>Your coaching report is being prepared.</StatusMessage>
          <ReportAutoRefresh />
        </>
      )}

      {report?.status === ReportStatus.FAILED &&
        (isFinalReportFailure(report.error) ? (
          // Dead-lettered: the pipeline has given up, so don't promise a retry.
          <StatusMessage tone={tone}>{report.error}</StatusMessage>
        ) : (
          <StatusMessage tone={tone}>
            We couldn&apos;t complete the analysis for this video. We&apos;ll retry
            automatically — please check back later.
          </StatusMessage>
        ))}

      {ready &&
        report &&
        (batting ? (
          <BattingReport parsed={batting} report={report} tone={tone} />
        ) : bowling ? (
          <BowlingReport parsed={bowling} report={report} tone={tone} />
        ) : (
          <ReadyReport report={report} tone={tone} />
        ))}
    </section>
  );
}
