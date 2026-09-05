import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { getCoachDirectory } from "@/lib/connections";

export const runtime = "nodejs";

const Query = z.object({ q: z.string().optional() });

/** GET /api/directory/coaches?q= — browsable approved-coach directory. */
export const GET = apiHandler({ auth: "player", query: Query }, async ({ player, query }) => {
  const coaches = await getCoachDirectory(player.id, query.q);
  return { coaches };
});
