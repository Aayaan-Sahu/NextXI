import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ReportPanel } from "@/components/report-panel";
import { Chip, PageShell, PageTitle } from "@/components/ui";
import { VideoComments } from "@/components/video-comments";
import { prisma } from "@/lib/prisma";
import { getDerivedMeasurements } from "@/lib/report-history";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoSize, formatVideoTags } from "@/lib/videos";
import { getVideoReport } from "@/lib/videos.server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function VideoDetail({
  backHref,
  deleteAction,
  sessionLinkBase,
  where,
}: {
  backHref: string;
  /** When set, the header carries a confirmed delete for this clip. */
  deleteAction?: (formData: FormData) => Promise<void>;
  /** When set and the video belongs to a session, "back" returns there instead. */
  sessionLinkBase?: string;
  where: Prisma.PlayerVideoWhereInput;
}) {
  const video = await prisma.playerVideo.findFirst({
    where,
    select: {
      id: true,
      category: true,
      createdAt: true,
      handedness: true,
      originalFilename: true,
      playerId: true,
      sessionId: true,
      sizeBytes: true,
      storageBucket: true,
      storagePath: true,
      uploadedAt: true,
      variation: true,
    },
  });

  if (!video) notFound();

  // A video reached via its session should return there; otherwise to the list.
  const sessionHref =
    video.sessionId && sessionLinkBase ? `${sessionLinkBase}/${video.sessionId}` : null;
  const resolvedBackHref = sessionHref ?? backHref;
  const backLabel = sessionHref ? "Back to session" : "All videos";

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(video.storageBucket)
    .createSignedUrl(video.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error("Could not create a playback link for this video.");
  }

  const [comments, report] = await Promise.all([
    prisma.videoComment.findMany({
      where: { videoId: video.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        authorName: true,
        authorUsername: true,
        body: true,
        createdAt: true,
      },
    }),
    getVideoReport(video.id),
  ]);

  // Value + own-range + last-session rows for the report, from prior reports.
  const derived = await getDerivedMeasurements(video, report);

  const uploadedAt = (video.uploadedAt ?? video.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <PageShell>
      <Link
        className="inline-block text-ui font-semibold text-rust-600 no-underline hover:text-rust-700"
        href={resolvedBackHref}
      >
        ← {backLabel}
      </Link>
      <header className="mt-3.5 mb-6 flex items-start justify-between gap-6 max-md:flex-col">
        <div className="min-w-0">
          <PageTitle>{video.originalFilename}</PageTitle>
          <p className="mt-1.5 text-ui text-ink-600">
            Uploaded {uploadedAt} · {formatVideoSize(video.sizeBytes)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Chip>{formatVideoTags(video.category, video.variation, video.handedness)}</Chip>
          {deleteAction ? (
            <ConfirmDeleteButton
              action={deleteAction}
              description="This clip and its coaching report are removed for good."
              id={video.id}
              label="Delete"
              name={video.originalFilename}
              redirectTo={resolvedBackHref}
              variant="text"
              title="Delete this video?"
            />
          ) : null}
        </div>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-8">
          <video
            className="aspect-video w-full rounded-lg bg-olive-950"
            controls
            preload="metadata"
            src={data.signedUrl}
          />
          <VideoComments
            comments={comments}
            footnote="Only connected coaches can leave feedback here."
          />
        </div>
        <ReportPanel derived={derived} report={report} />
      </div>
    </PageShell>
  );
}
