/**
 * Pushes supabase/templates/*.html into the linked project's auth email
 * templates.
 *
 * The dashboard does not read this repo. Editing a template here changes
 * nothing a user ever receives until the HTML is in the project's auth
 * config, and re-pasting three files by hand after every copy change is
 * exactly how the two drift apart. This is that paste, as a command.
 *
 * Subjects are left alone: the repo holds no subject line, so pushing one
 * would overwrite the dashboard's with a guess. Only the bodies move.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=… bun scripts/push-email-templates.ts [name ...]
 *
 * The token is the Supabase CLI's own — `supabase login` stores it in the
 * system keychain, so nothing new has to be issued or written to disk:
 *
 *   SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" \
 *     -a access-token -w) bun run auth:templates
 *
 * `-a access-token` is not optional: the CLI files several secrets under that
 * one service name, keyed by account, and a lookup without it can hand back a
 * project's database password instead.
 *
 * The project is the one `supabase link` recorded; override it with
 * SUPABASE_PROJECT_REF.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** The whole command, quoted in both token errors — it is the fix for either. */
const KEYCHAIN =
  'SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -a access-token -w) bun run auth:templates';

/** Template file → the Management API field that holds its body. */
const TEMPLATES = {
  confirmation: "mailer_templates_confirmation_content",
  "magic-link": "mailer_templates_magic_link_content",
  recovery: "mailer_templates_recovery_content",
} as const;

type TemplateName = keyof typeof TEMPLATES;

async function projectRef() {
  const fromEnv = process.env.SUPABASE_PROJECT_REF;
  if (fromEnv) return fromEnv;

  try {
    const linked = await readFile(path.join(ROOT, "supabase", ".temp", "linked-project.json"), "utf8");
    const ref = (JSON.parse(linked) as { ref?: string }).ref;
    if (ref) return ref;
  } catch {
    // Falls through to the same error as an unlinked project.
  }

  throw new Error("No project. Run `supabase link`, or set SUPABASE_PROJECT_REF.");
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(`SUPABASE_ACCESS_TOKEN is required. Use the CLI's own:\n  ${KEYCHAIN}`);
  }
  // Personal access tokens are `sbp_…`. Anything else here came out of the
  // same keychain service under a different account, and the API's answer to
  // it — "JWT could not be decoded" — says nothing about which one.
  if (!token.startsWith("sbp_")) {
    throw new Error(
      `That is not a Supabase access token (they start with "sbp_"). The CLI files several secrets under one keychain service, so name the account:\n  ${KEYCHAIN}`,
    );
  }

  const names = (process.argv.slice(2).length
    ? process.argv.slice(2)
    : Object.keys(TEMPLATES)) as TemplateName[];

  for (const name of names) {
    if (!(name in TEMPLATES)) {
      throw new Error(`Unknown template "${name}". One of: ${Object.keys(TEMPLATES).join(", ")}.`);
    }
  }

  const ref = await projectRef();
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const read = await fetch(endpoint, { headers });
  if (!read.ok) {
    throw new Error(`GET config/auth failed: ${read.status} ${await read.text()}`);
  }
  const live = (await read.json()) as Record<string, string | null>;

  console.log(`Auth email templates → ${ref}`);

  const patch: Record<string, string> = {};
  for (const name of names) {
    const field = TEMPLATES[name];
    const html = await readFile(path.join(ROOT, "supabase", "templates", `${name}.html`), "utf8");
    if ((live[field] ?? "") === html) {
      console.log(`  ${name.padEnd(12)} already matches the repo`);
      continue;
    }
    patch[field] = html;
    console.log(`  ${name.padEnd(12)} differs — pushing ${html.length} bytes`);
  }

  if (!Object.keys(patch).length) {
    console.log("\nNothing to do.");
    return;
  }

  const write = await fetch(endpoint, { method: "PATCH", headers, body: JSON.stringify(patch) });
  if (!write.ok) {
    // The usual cause is a project on the default email provider, where
    // Supabase locks template editing until custom SMTP is configured.
    throw new Error(`PATCH config/auth failed: ${write.status} ${await write.text()}`);
  }

  // Read back rather than trust the 200: this is the whole point of the script.
  const verify = await fetch(endpoint, { headers });
  if (!verify.ok) throw new Error(`GET config/auth failed: ${verify.status}`);
  const saved = (await verify.json()) as Record<string, string | null>;

  const stale = Object.entries(patch).filter(([field, html]) => (saved[field] ?? "") !== html);
  if (stale.length) {
    throw new Error(`Saved, but the project still returns different HTML for: ${stale.map(([field]) => field).join(", ")}`);
  }

  console.log(`\nPushed ${Object.keys(patch).length} template(s). The project now serves the repo's HTML.`);
}

await main();
