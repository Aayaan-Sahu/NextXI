import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api";
import { sendMessage } from "@/app/dashboard/messages/actions";
import { getThread } from "@/lib/messages";

export const runtime = "nodejs";

/** GET /api/messages/{connectionId} — full thread, oldest first. */
export const GET = apiHandler({ auth: "user" }, async ({ user, params }) => {
  const thread = await getThread(user.id, params.connectionId);
  if (!thread) throw new ApiError(404, "Conversation not found.");
  return thread;
});

const SendBody = z.object({ body: z.string().min(1).max(4000) });

/** POST /api/messages/{connectionId} { body } — send a message. */
export const POST = apiHandler({ auth: "user", body: SendBody }, async ({ body, params }) => {
  const outcome = await sendMessage(params.connectionId, body.body);
  if (!outcome.ok) throw new ApiError(400, outcome.error);
  return outcome;
});
