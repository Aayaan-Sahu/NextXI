import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { searchPlayersByQuery } from "@/lib/connections";

export const runtime = "nodejs";

const Query = z.object({ q: z.string().optional() });

/** GET /api/directory/players?q= — search-only player discovery by name or @username. */
export const GET = apiHandler({ auth: "player", query: Query }, async ({ player, query }) => {
  const players = await searchPlayersByQuery(player.id, query.q ?? "");
  return { players };
});
