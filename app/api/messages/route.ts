import { apiHandler } from "@/lib/api";
import { getConversations } from "@/lib/messages";

export const runtime = "nodejs";

/**
 * GET /api/messages — the app's inbox: one row per conversation that has at
 * least one message, newest first. A connection nobody has written to yet is
 * not a conversation; the app starts those from its compose screen or the
 * roster's Message button.
 */
export const GET = apiHandler({ auth: "user" }, async ({ user }) => {
  const conversations = await getConversations(user.id, { withMessagesOnly: true });
  return { conversations };
});
