import { apiHandler } from "@/lib/api";
import { getRecentPlayerFeedback } from "@/lib/videos.server";

export const runtime = "nodejs";

/**
 * GET /api/videos/comments — the player's 5 most recent published coach
 * comments across all their videos, for the Home tab's "Coach feedback"
 * section. Same query the web dashboard's player page runs.
 */
export const GET = apiHandler({ auth: "player" }, async ({ player }) => {
  const comments = await getRecentPlayerFeedback(player.id, 5);
  return { comments };
});
