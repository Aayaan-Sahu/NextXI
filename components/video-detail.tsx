import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { PageHeader, PageShell } from "@/components/ui";
import { VideoComments } from "@/components/video-comments";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoSize } from "@/lib/videos";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function VideoDetail({
  backHref,
  where,
}: {
  backHref: string;
  where: Prisma.PlayerVideoWhereInput;
}) {
  const video = await prisma.playerVideo.findFirst({
    where,
    select: {
      id: true,
      createdAt: true,
      originalFilename: true,
      sizeBytes: true,
      storageBucket: true,
      storagePath: true,
      uploadedAt: true,
    },
  });

  if (!video) notFound();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(video.storageBucket)
    .createSignedUrl(video.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error("Could not create a playback link for this video.");
  }

  const comments = await prisma.videoComment.findMany({
    where: { videoId: video.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      authorName: true,
      authorUsername: true,
      body: true,
      createdAt: true,
    },
  });

  const uploadedAt = (video.uploadedAt ?? video.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <PageShell>
      <Link
        className="mb-4 inline-block text-sm text-neutral-950 underline-offset-2 hover:underline"
        href={backHref}
      >
        ← All videos
      </Link>
      <PageHeader
        subtitle={`Uploaded ${uploadedAt} · ${formatVideoSize(video.sizeBytes)}`}
        title={video.originalFilename}
      />
      <div className="grid gap-5">
        <video
          className="w-full rounded-lg border border-stone-300 bg-black"
          controls
          preload="metadata"
          src={data.signedUrl}
        />
        <VideoComments comments={comments} />
      </div>
    </PageShell>
  );
}
