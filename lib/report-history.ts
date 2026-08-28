import "server-only";
import {
  PlayerVideoStatus,
  ReportStatus,
  VideoCategory,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  deriveFocus,
  deriveMeasurements,
  occasionMetricValues,
  payloadConsistency,
  reportShape,
  type DerivedReport,
  type OccasionValues,
} from "@/lib/report-measurements";
import { deriveScores, occasionScores, type OccasionScores } from "@/lib/report-scores";
import type { VideoReport } from "@/lib/videos.server";

/**
 * Loads the player's previous analysed occasions and derives the measurement
 * rows ReportPanel leads with: value, "Your range · Last N sessions", and the
 * last-session progress marker. See lib/report-measurements.ts for the rules.
 *
 * An "occasion" is a practice session (its videos pooled) or a standalone
 * video — one filming outing either way. The current video's own session is
 * excluded: same-outing videos are the session page's comparison, not
 * "previous". History is capped well above the HISTORY_WINDOW the derivation
 * actually uses.
 */

const HISTORY_VIDEO_CAP = 200;

type VideoForHistory = {
  playerId: string;
  category: VideoCategory | null;
  sessionId: string | null;
  createdAt: Date;
};

export async function getDerivedMeasurements(
  video: VideoForHistory,
  report: Pick<VideoReport, "status" | "payload"> | null,
): Promise<DerivedReport | null> {
  if (report?.status !== ReportStatus.READY) return null;
  const shape = reportShape(report.payload);
  if (!shape) return null;

  // Only occasions of the same discipline compare: batting to batting, any
  // bowling style to bowling (the measured scalars are shared across styles).
  const comparableCategories =
    shape === "batting"
      ? [VideoCategory.BATTING]
      : [VideoCategory.PACE, VideoCategory.OFF_SPIN, VideoCategory.LEG_SPIN];

  const previousVideos = await prisma.playerVideo.findMany({
    where: {
      playerId: video.playerId,
      status: PlayerVideoStatus.READY,
      category: { in: comparableCategories },
      createdAt: { lt: video.createdAt },
      ...(video.sessionId
        ? { OR: [{ sessionId: null }, { sessionId: { not: video.sessionId } }] }
        : {}),
      report: { is: { status: ReportStatus.READY } },
    },
    orderBy: { createdAt: "desc" },
    take: HISTORY_VIDEO_CAP,
    select: {
      id: true,
      sessionId: true,
      createdAt: true,
      report: { select: { payload: true } },
    },
  });

  // Group into occasions, tracking each occasion's latest video time so
  // occasions sort by when they happened, oldest first.
  const occasions = new Map<string, { date: Date; payloads: unknown[] }>();
  for (const previous of previousVideos) {
    const payload = previous.report?.payload;
    if (payload == null) continue;
    const key = previous.sessionId ?? `video:${previous.id}`;
    const occasion = occasions.get(key) ?? { date: previous.createdAt, payloads: [] };
    if (previous.createdAt > occasion.date) occasion.date = previous.createdAt;
    occasion.payloads.push(payload);
    occasions.set(key, occasion);
  }

  const ordered = [...occasions.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const history: OccasionValues[] = ordered
    .map((occasion) => occasionMetricValues(shape, occasion.payloads))
    .filter((values) => Object.keys(values).length > 0);

  // The rows need real units (a calibrated clip); the scores need only the
  // normalised judgements, so an uncalibrated clip can still score.
  const metrics = deriveMeasurements(report.payload, history) ?? [];

  const scoreHistory: { date: Date; scores: OccasionScores }[] = ordered.flatMap(
    ({ date, payloads }) => {
      const scores = occasionScores(shape, payloads);
      return scores ? [{ date, scores }] : [];
    },
  );
  const scores = deriveScores(report.payload, scoreHistory, video.createdAt);

  if (metrics.length === 0 && !scores) return null;

  // One headline-consistency point per occasion (mean of its videos'), for
  // the hero's Last session / Your best cells and the sessions chart.
  // Bowling payloads carry no per-video consistency, so bowling reports get
  // an empty trail — the hero and chart simply don't render for them.
  const consistencyHistory = ordered.flatMap(({ date, payloads }) => {
    const values = payloads
      .map(payloadConsistency)
      .filter((value): value is number => value !== null);
    if (values.length === 0) return [];
    return [
      {
        date,
        value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
      },
    ];
  });

  return { metrics, consistencyHistory, focus: deriveFocus(report.payload), scores };
}
