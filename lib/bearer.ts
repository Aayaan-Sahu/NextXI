/**
 * Reads a bearer token off an Authorization header value. Pure, so the
 * parsing is testable without Next's request context; lib/auth.ts is the
 * one caller.
 */
export function parseBearer(header: string | null | undefined): string | undefined {
  if (!header) return undefined;
  const match = /^\s*Bearer\s+(\S+)\s*$/i.exec(header);
  return match?.[1];
}

/**
 * How `getCurrentUser` should treat the Authorization header.
 *
 * - missing → cookie session
 * - a single Bearer token → that JWT, never the cookie
 * - anything else (Basic, `Bearer a b`, empty) → signed out; a junk header
 *   must not fall through to whatever cookie is on the request
 */
export type AuthorizationResolution =
  | { source: "cookie" }
  | { source: "bearer"; token: string }
  | { source: "none" };

export function resolveAuthorization(
  header: string | null | undefined,
): AuthorizationResolution {
  if (header == null) return { source: "cookie" };
  const token = parseBearer(header);
  if (token) return { source: "bearer", token };
  return { source: "none" };
}
