import { apiHandler, ApiError } from "@/lib/api";
import { removeConnection } from "@/lib/connections.server";

export const runtime = "nodejs";

/**
 * DELETE /api/connections/{connectionId} — remove a connection entirely.
 *
 * Unlike `.../request` (cancel a request you sent) this works on an accepted
 * connection, and unlike the web's revoke it leaves nothing behind: the row
 * goes, and the pair's messages go with it.
 */
export const DELETE = apiHandler({ auth: "user" }, async ({ user, params }) => {
  const outcome = await removeConnection(user.id, params.connectionId);
  if ("error" in outcome) throw new ApiError(404, outcome.error);
  return outcome;
});
