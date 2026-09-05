import { apiHandler, ApiError } from "@/lib/api";
import { cancelConnectionRequest } from "@/lib/connections";

export const runtime = "nodejs";

/** DELETE /api/connections/{connectionId}/request — cancel a request you sent. */
export const DELETE = apiHandler({ auth: "user" }, async ({ user, params }) => {
  const outcome = await cancelConnectionRequest(user.id, params.connectionId);
  if ("error" in outcome) throw new ApiError(400, outcome.error);
  return outcome;
});
