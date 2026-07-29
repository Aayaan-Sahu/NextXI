import { timingSafeEqual } from "node:crypto";
import { jsonError } from "@/app/api/videos/utils";

/** Constant-time comparison so the bearer token can't be guessed by timing. */
function tokensMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Service-to-service auth shared by the report ingress and the claim
 * endpoint: the AI pipeline sends `Authorization: Bearer <REPORTS_INGEST_SECRET>`.
 * Returns an error response to short-circuit with, or null when authorized.
 */
export function requireIngestAuth(request: Request): Response | null {
  const secret = process.env.REPORTS_INGEST_SECRET;
  if (!secret) {
    // Deliberately unusable until an operator configures the secret.
    return jsonError("Report ingestion is not configured.", 503);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!tokensMatch(authHeader, `Bearer ${secret}`)) {
    return jsonError("Invalid or missing bearer token.", 401);
  }

  return null;
}
