import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api";
import { respondToConnection } from "@/lib/connections";

export const runtime = "nodejs";

const RespondBody = z.object({ response: z.enum(["accept", "decline"]) });

/** POST /api/connections/{connectionId}/respond { response } */
export const POST = apiHandler(
  { auth: "user", body: RespondBody },
  async ({ user, body, params }) => {
    const outcome = await respondToConnection(user.id, params.connectionId, body.response);
    if ("error" in outcome) throw new ApiError(400, outcome.error);
    return outcome;
  },
);
