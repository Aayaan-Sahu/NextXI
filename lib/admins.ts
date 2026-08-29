/**
 * Who is an administrator.
 *
 * Two sources, because they fail differently:
 *
 * - `ADMIN_EMAILS`, a comma-separated environment variable. Simple, but it
 *   lives in the deployment: changing it needs whoever owns the hosting
 *   account and a redeploy before it takes effect.
 * - `app_metadata.admin` on the Supabase auth user, set by
 *   `scripts/set-admin.ts`. It rides in the access token, so the app reads it
 *   with no extra query, and granting or revoking is one command against the
 *   project — no deploy, no hosting access.
 *
 * `app_metadata` is the right home for it: unlike `user_metadata`, nothing
 * the browser holds can write to it — only the service key can.
 */
export function parseAdminEmails(raw: string | undefined | null): Set<string> {
  return new Set(
    (raw ?? "")
      .toLowerCase()
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean),
  );
}

/**
 * Either shape the app has on hand: the session user built from JWT claims,
 * or the full Supabase user returned by a sign-in.
 */
export type AdminIdentity = {
  admin?: boolean;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
};

export function isAdminIdentity(
  user: AdminIdentity | null | undefined,
  adminEmails: Set<string>,
): boolean {
  if (!user) return false;
  // Strictly true: a stray "false", 0 or "" in the token must not pass.
  if (user.admin === true || user.app_metadata?.admin === true) return true;

  const email = user.email?.toLowerCase();
  return Boolean(email && adminEmails.has(email));
}
