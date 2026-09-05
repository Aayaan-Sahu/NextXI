import { apiHandler } from "@/lib/api";
import { getReadyVideoGridItems } from "@/lib/videos.server";

export const runtime = "nodejs";

/**
 * GET /api/videos — the player's standalone (non-session) READY clips, in
 * the same order the web's dashboard grid shows them
 * (`uploadedAt desc, createdAt desc`), thumbnails already signed.
 */
export const GET = apiHandler({ auth: "player" }, async ({ player }) => {
  const videos = await getReadyVideoGridItems(player.id, "player");
  return { videos };
});
