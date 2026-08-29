/**
 * Grants or revokes administrator rights, by email.
 *
 * The other way in is `ADMIN_EMAILS` on the deployment, which needs whoever
 * owns the hosting account and a redeploy before it takes effect. This one
 * writes `app_metadata.admin` on the Supabase auth user instead: it rides in
 * the access token, so the app reads it with no extra query, and changing who
 * is an administrator is one command against the project.
 *
 * `app_metadata` is the right home for it — unlike `user_metadata`, nothing
 * the browser holds can write to it. Only the service key can, which is why
 * this script is the only way it is ever set.
 *
 * Usage:
 *   bun run admin:grant  someone@example.com [more@example.com ...]
 *   bun run admin:revoke someone@example.com
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.",
  );
}

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const emails = args.filter((arg) => !arg.startsWith("--")).map((email) => email.toLowerCase());

if (!emails.length) {
  throw new Error("Give at least one email address.");
}

const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** One page-through of the user list, reused for every email on the line. */
async function loadUsers() {
  const byEmail = new Map<string, { id: string; appMetadata: Record<string, unknown> }>();
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email) {
        byEmail.set(user.email.toLowerCase(), {
          appMetadata: (user.app_metadata ?? {}) as Record<string, unknown>,
          id: user.id,
        });
      }
    }
    if (data.users.length < 1000) break;
  }
  return byEmail;
}

console.log(
  `${revoke ? "Revoking" : "Granting"} admin in ${new URL(supabaseUrl).hostname}.`,
);

const users = await loadUsers();
let missing = 0;

for (const email of emails) {
  const user = users.get(email);
  if (!user) {
    // Nothing to write to: rights live on the account, so it has to exist.
    console.error(`  ${email} — no account. They have to sign up first.`);
    missing += 1;
    continue;
  }

  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    // Spread rather than replace: app_metadata also carries the identity
    // provider, and this must not be the write that drops it.
    app_metadata: { ...user.appMetadata, admin: !revoke },
  });
  if (error) throw new Error(`${email}: ${error.message}`);

  // Read the answer back rather than trust the absence of an error — this
  // decides who can approve coaches.
  const saved = data.user?.app_metadata?.admin === true;
  if (saved === revoke) {
    throw new Error(`${email}: the project still reports admin=${saved}.`);
  }

  console.log(`  ${email} — ${revoke ? "revoked" : "granted"}`);
}

console.log(
  "\nIt lands on the next token they are issued. Signing out and back in makes it immediate.",
);

if (missing) process.exit(1);
