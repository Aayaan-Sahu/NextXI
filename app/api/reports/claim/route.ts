import { requireIngestAuth } from "@/app/api/reports/utils";
import { jsonError } from "@/app/api/videos/utils";
import {
  REPORT_ERROR_EXHAUSTED,
  REPORT_ERROR_UNTAGGED,
} from "@/lib/report-errors";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** How long the worker may hold a claim before it is handed out again. */
const CLAIM_STALE_MINUTES = 15;
/** Attempts after which a report is dead-lettered instead of retried. */
const MAX_REPORT_ATTEMPTS = 3;
/** TTL of the signed video URL handed to the worker. */
const VIDEO_URL_TTL_SECONDS = 60 * 60;

const EXHAUSTED_ERROR = REPORT_ERROR_EXHAUSTED;
const UNTAGGED_ERROR = REPORT_ERROR_UNTAGGED;

type ClaimedRow = { id: string; video_id: string };

/**
 * Worker claim endpoint (see docs/reports-contract.md): atomically hands the
 * AI pipeline the oldest analysable report, marks it PROCESSING, and returns
 * a signed video URL plus the metadata the analysis needs. The worker holds
 * no storage credentials — this endpoint is its only way to reach a video.
 *
 * Retry semantics live here, not in the worker: a PROCESSING claim older
 * than CLAIM_STALE_MINUTES is re-issued, and the attempt after
 * MAX_REPORT_ATTEMPTS is dead-lettered as FAILED.
 */
export async function POST(request: Request) {
  const unauthorized = requireIngestAuth(request);
  if (unauthorized) return unauthorized;

  // Housekeeping before claiming, so poison rows never cycle forever.
  // 1) Dead-letter reports that already burned every attempt.
  await prisma.$executeRaw`
    update "public"."reports" r
    set status = 'failed',
        error = ${EXHAUSTED_ERROR},
        payload = null,
        updated_at = now()
    from "public"."player_videos" v
    where v.id = r.video_id
      and v.status = 'ready'
      and r.attempts >= ${MAX_REPORT_ATTEMPTS}
      and (
        r.status = 'pending'
        or (
          r.status = 'processing'
          and r.claimed_at < now() - (${CLAIM_STALE_MINUTES} * interval '1 minute')
        )
      )
  `;

  // 2) Fail untagged videos honestly instead of leaving them "being
  //    prepared" forever (the upload UI requires a discipline, so these are
  //    legacy rows only).
  await prisma.$executeRaw`
    update "public"."reports" r
    set status = 'failed',
        error = ${UNTAGGED_ERROR},
        payload = null,
        updated_at = now()
    from "public"."player_videos" v
    where v.id = r.video_id
      and v.status = 'ready'
      and v.category is null
      and r.status = 'pending'
  `;

  // Atomic claim: oldest analysable report, skipping rows another worker is
  // claiming right now. FAILED rows with attempts left are retried too —
  // the player-facing failure copy promises an automatic retry — but only
  // after the staleness window, so a just-failed video isn't rerun at once.
  const claimed = await prisma.$queryRaw<ClaimedRow[]>`
    with candidate as (
      select r.id
      from "public"."reports" r
      join "public"."player_videos" v on v.id = r.video_id
      where v.status = 'ready'
        and v.category is not null
        and r.attempts < ${MAX_REPORT_ATTEMPTS}
        and (
          r.status = 'pending'
          or (
            r.status in ('processing', 'failed')
            and coalesce(r.claimed_at, r.updated_at)
              < now() - (${CLAIM_STALE_MINUTES} * interval '1 minute')
          )
        )
      order by r.created_at
      limit 1
      for update of r skip locked
    )
    update "public"."reports" r
    set status = 'processing',
        attempts = r.attempts + 1,
        claimed_at = now(),
        updated_at = now()
    from candidate
    where r.id = candidate.id
    returning r.id, r.video_id
  `;

  if (claimed.length === 0) {
    return new Response(null, { status: 204 });
  }

  const videoId = claimed[0].video_id;
  const video = await prisma.playerVideo.findUnique({
    where: { id: videoId },
    select: {
      storageBucket: true,
      storagePath: true,
      category: true,
      variation: true,
      handedness: true,
      player: { select: { heightCm: true } },
    },
  });

  if (!video) {
    // The video vanished between claim and load (deletion cascades the
    // report too); tell the worker to poll again.
    return new Response(null, { status: 204 });
  }

  let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    return jsonError("Storage is not configured.", 503);
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(video.storageBucket)
    .createSignedUrl(video.storagePath, VIDEO_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    // Leave the claim in place — it goes stale and is retried, and the
    // attempt counter dead-letters persistent storage failures.
    return jsonError("Could not sign the video URL.", 500);
  }

  return Response.json({
    videoId,
    signedUrl: signed.signedUrl,
    meta: {
      heightCm: video.player.heightCm,
      category: video.category,
      variation: video.variation,
      handedness: video.handedness,
    },
  });
}
