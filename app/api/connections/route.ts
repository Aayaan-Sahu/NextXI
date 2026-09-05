import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api";
import { createConnectionRequest, getConnectionPanelData } from "@/lib/connections";

export const runtime = "nodejs";

/** GET /api/connections → { accepted, incomingPending, outgoingPending } */
export const GET = apiHandler({ auth: "user" }, async ({ user }) => {
  return getConnectionPanelData(user.id);
});

const ConnectBody = z.object({ targetId: z.string().uuid() });

/** POST /api/connections { targetId } — send a connection request. */
export const POST = apiHandler({ auth: "user", body: ConnectBody }, async ({ user, body }) => {
  const outcome = await createConnectionRequest(user.id, body.targetId);
  if ("error" in outcome) throw new ApiError(400, outcome.error);
  return outcome;
});
