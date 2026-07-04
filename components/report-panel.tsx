import { ReportStatus } from "@/app/generated/prisma/enums";
import { Panel } from "@/components/ui";
import type { VideoReport } from "@/lib/videos.server";

const KNOWN_PAYLOAD_KEYS = ["overall_score", "metrics", "feedback", "annotations"];

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

function ScoreBar({ score }: { score: number }) {
  const width = clampScore(score);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-stone-200" aria-hidden>
      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${width}%` }} />
    </div>
  );
}

function RawDetails({ payload }: { payload: unknown }) {
  return (
    <details className="mt-2 rounded-md border border-stone-200 bg-stone-50">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-stone-700">
        Raw report data
      </summary>
      <pre className="overflow-x-auto border-t border-stone-200 px-3 py-2 text-xs leading-relaxed text-stone-700">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}

function ReadyReport({ report }: { report: VideoReport }) {
  const payload = report.payload;

  // A ready report should carry an object payload; if it doesn't, fail soft.
  if (!isRecord(payload)) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-stone-600">
          Your coaching report is ready, but it arrived in an unexpected format.
        </p>
        <RawDetails payload={payload} />
      </div>
    );
  }

  const overallScore = readOverallScore(payload);
  const metrics = readMetrics(payload);
  const feedback = readFeedback(payload);
  const annotations = readAnnotations(payload);
  const showRaw = hasExtraKeys(payload) || (!overallScore && !metrics.length && !feedback && !annotations.length);

  return (
    <div className="grid gap-6">
      {overallScore !== null && (
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-semibold leading-none text-emerald-700">{overallScore}</span>
          <span className="text-sm text-stone-600">/ 100 overall</span>
        </div>
      )}

      {metrics.length > 0 && (
        <div className="grid gap-4">
          {metrics.map((metric, index) => (
            <div className="grid gap-1.5" key={`${metric.name}-${index}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-neutral-950">{metric.name}</span>
                <span className="text-sm tabular-nums text-stone-600">{Math.round(metric.score)}</span>
              </div>
              <ScoreBar score={metric.score} />
              {metric.comment && <p className="text-sm text-stone-600">{metric.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {feedback && (
        <div className="grid gap-1.5">
          <h3 className="text-sm font-semibold text-neutral-950">Coach feedback</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-950">{feedback}</p>
        </div>
      )}

      {annotations.length > 0 && (
        <div className="grid gap-1.5">
          <h3 className="text-sm font-semibold text-neutral-950">Timeline notes</h3>
          <ul className="grid gap-2">
            {annotations.map((annotation, index) => (
              <li className="flex gap-3 text-sm" key={`${annotation.timestamp_s}-${index}`}>
                <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs tabular-nums text-stone-700">
                  {formatTimestamp(annotation.timestamp_s)}
                </span>
                <span className="text-neutral-950">{annotation.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showRaw && <RawDetails payload={payload} />}

      {report.modelVersion && (
        <p className="text-xs text-stone-500">Generated by {report.modelVersion}</p>
      )}
    </div>
  );
}

/** Renders the AI coaching report for a video, defensively, in every lifecycle state. */
export function ReportPanel({ report }: { report: VideoReport | null }) {
  return (
    <Panel title="Coaching report">
      {(!report || report.status === ReportStatus.PENDING) && (
        <p className="text-sm text-stone-600">Your coaching report is being prepared.</p>
      )}

      {report?.status === ReportStatus.FAILED && (
        <p className="text-sm text-stone-600">
          We couldn&apos;t complete the analysis for this video. We&apos;ll retry automatically —
          please check back later.
        </p>
      )}

      {report?.status === ReportStatus.READY && <ReadyReport report={report} />}
    </Panel>
  );
}
