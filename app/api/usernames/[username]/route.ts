import { apiHandler } from "@/lib/api";
import { usernameStatus } from "@/lib/usernames.server";

export const runtime = "nodejs";

/**
 * GET /api/usernames/{username} → { username, status: "free" | "taken" | "invalid" }
 *
 * The sign-up screen's live "@handle is free" check. Unauthenticated by
 * necessity (the caller has no account yet); rate-limited at the edge, not
 * here — see docs/api.md.
 */
export const GET = apiHandler({ auth: "none" }, async ({ params }) => {
  return usernameStatus(params.username ?? "");
});
