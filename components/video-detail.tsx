import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { ReportPanel } from "@/components/report-panel";
import { Badge, PageShell } from "@/components/ui";
import { VideoComments } from "@/components/video-comments";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoSize, formatVideoTags } from "@/lib/videos";
import { getVideoReport } from "@/lib/videos.server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function VideoDetail({
  backHref,
  reportTone = "light",
  sessionLinkBase,
  where,
}: {
  backHref: string;
  /** Report card style; the player detail uses the dark scoreboard. */
  reportTone?: "light" | "dark";
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

  const uploadedAt = (video.uploadedAt ?? video.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <PageShell>
      <Link
        className="inline-block text-[13px] font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
        href={resolvedBackHref}
      >
        ← {backLabel}
      </Link>
      <header className="mt-[18px] mb-[22px] flex items-end justify-between gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="font-display text-[28px] leading-[1.05] font-bold tracking-[.02em] uppercase">
            {video.originalFilename}
          </h1>
          <p className="mt-1.5 font-mono text-xs text-ink-600">
            Uploaded {uploadedAt} · {formatVideoSize(video.sizeBytes)}
          </p>
        </div>
        <Badge>{formatVideoTags(video.category, video.variation, video.handedness)}</Badge>
      </header>
      <div className="grid grid-cols-[1.55fr_1fr] items-start gap-7 max-lg:grid-cols-1">
        <div className="grid gap-6">
          <video
            className="aspect-video w-full rounded-[10px] bg-pitch-950"
            controls
            preload="metadata"
            src={data.signedUrl}
          />
          <VideoComments comments={comments} />
        </div>
        <ReportPanel report={report} subtitle={video.originalFilename} tone={reportTone} />
      </div>
    </PageShell>
  );
}
