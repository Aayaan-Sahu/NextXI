import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import { PageHeader, PageShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoSize } from "@/lib/videos";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function VideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const user = await requireUser();
  const { videoId } = await params;

  if (!isUuid(videoId)) notFound();

  const video = await prisma.playerVideo.findFirst({
    where: {
      id: videoId,
      playerId: user.id,
      status: PlayerVideoStatus.READY,
    },
    select: {
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

  const uploadedAt = (video.uploadedAt ?? video.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <PageShell>
      <Link
        className="mb-4 inline-block text-sm text-neutral-950 underline-offset-2 hover:underline dark:text-neutral-50"
        href="/dashboard/player"
      >
        ← All videos
      </Link>
      <PageHeader
        subtitle={`Uploaded ${uploadedAt} · ${formatVideoSize(video.sizeBytes)}`}
        title={video.originalFilename}
      />
      <video
        className="w-full rounded-lg border border-stone-300 bg-black dark:border-neutral-700"
        controls
        preload="metadata"
        src={data.signedUrl}
      />
    </PageShell>
  );
}
