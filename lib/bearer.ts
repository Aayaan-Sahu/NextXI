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
