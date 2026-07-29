import "server-only";
import { PlayerVideoStatus, ReportStatus, VideoCategory } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  battingShots,
  median,
  readPath,
  SESSION_BATTING_METRICS,
  SESSION_BOWLING_METRICS,
  type MetricPath,
} from "@/lib/session-consistency";

/**
 * Cross-session technique trends: the same normalized per-instance scalars the
 * session-consistency view pools within one session, tracked across a player's
 * practice sessions over time. Each session contributes one point per metric —
 * the median of that metric across every instance (batting: shot, bowling:
 * delivery) in the session's ready reports. The median resists the same
 * mis-detected outliers the consistency calc drops explicitly.
 *
 * The worker only emits the normalized `*_frac_height` fields for clips it
 * could calibrate; a session whose reports lack a metric simply contributes no
 * point for it (a gap), never a zero.
 */

/** Below this many sessions with a value, a metric's trend line isn't shown. */
export const MIN_SESSIONS_FOR_TRENDS = 2;

export type TrendPoint = { date: Date; value: number };

export type MetricTrend = { label: string; points: TrendPoint[] };

export type TechniqueTrendData = {
  batting: MetricTrend[];
  bowling: MetricTrend[];
  /** Sessions (any discipline) with at least one ready report. */
  analysedSessionCount: number;
};

type SessionInstances = { date: Date; instances: unknown[] };

/** One trend per metric that has values in enough sessions; session = point. */
function trendsFor(
  sessions: SessionInstances[],
  metrics: readonly MetricPath[],
): MetricTrend[] {
  return metrics.flatMap(({ path, label }) => {
    const points = sessions.flatMap(({ date, instances }) => {
      const values = instances
        .map((instance) => readPath(instance, path))
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);
      // Metric never measured in this session (e.g. uncalibrated clips) → gap.
      return values.length === 0 ? [] : [{ date, value: median(values) }];
    });
    return points.length >= MIN_SESSIONS_FOR_TRENDS ? [{ label, points }] : [];
  });
}

/**
 * Loads a player's practice sessions with their ready report payloads and
 * derives per-metric trend series, oldest session first. Batting sessions feed
 * the batting metrics; every bowling discipline (pace/off spin/leg spin) feeds
 * the shared bowling metrics, mirroring computeSessionConsistency.
 */
export async function getTechniqueTrends(playerId: string): Promise<TechniqueTrendData> {
  const sessions = await prisma.practiceSession.findMany({
    where: { playerId },
    orderBy: { createdAt: "asc" },
    select: {
      category: true,
      createdAt: true,
      videos: {
        where: { status: PlayerVideoStatus.READY },
        select: { report: { select: { status: true, payload: true } } },
      },
    },
  });

  const analysed = sessions.flatMap((session) => {
    const payloads = session.videos.flatMap((video) =>
      video.report && video.report.status === ReportStatus.READY && video.report.payload != null
        ? [video.report.payload]
        : [],
    );
    return payloads.length === 0
      ? []
      : [{ category: session.category, date: session.createdAt, payloads }];
  });

  // Batting instances are the detected shots pooled across the session's
  // videos; bowling instances are the payloads themselves (one delivery each).
  const batting = analysed
    .filter((session) => session.category === VideoCategory.BATTING)
    .map(({ date, payloads }) => ({ date, instances: payloads.flatMap(battingShots) }));
  const bowling = analysed
    .filter((session) => session.category !== VideoCategory.BATTING)
    .map(({ date, payloads }) => ({ date, instances: payloads }));

  return {
    batting: trendsFor(batting, SESSION_BATTING_METRICS),
    bowling: trendsFor(bowling, SESSION_BOWLING_METRICS),
    analysedSessionCount: analysed.length,
  };
}
