import { apiHandler, ApiError } from "@/lib/api";
import { authorizeConversation, markConversationRead } from "@/lib/messages";

export const runtime = "nodejs";

/** POST /api/messages/{connectionId}/read — mark incoming messages read. */
export const POST = apiHandler({ auth: "user" }, async ({ user, params }) => {
  const connection = await authorizeConversation(user.id, params.connectionId);
  if (!connection) throw new ApiError(404, "Conversation not found.");
  await markConversationRead(user.id, params.connectionId);
  return { ok: true };
});
