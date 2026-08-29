/**
 * Pushes supabase/templates/*.html into the linked project's auth email
 * templates.
 *
 * The dashboard does not read this repo. Editing a template here changes
 * nothing a user ever receives until the HTML is in the project's auth
 * config, and re-pasting three files by hand after every copy change is
 * exactly how the two drift apart. This is that paste, as a command.
 *
 * Subject lines move too, from the map below. They are the ones the ops
 * handoff has always specified, so the repo — not the dashboard — is where
 * the whole email is decided.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=… bun scripts/push-email-templates.ts [name ...]
 *
 * The token is a personal access token from
 * https://supabase.com/dashboard/account/tokens — `sbp_…`, and revocable
 * from the same page:
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_… bun run auth:templates
 *
 * Not the CLI's own credential: `supabase login` files a go-keyring wrapper
 * under the "Supabase CLI" keychain service, not a token this (or any) API
 * client can present. Reading it back gets you 78 characters beginning
 * "go-k" and a "JWT could not be decoded" from the API.
 *
 * The project is the one `supabase link` recorded; override it with
 * SUPABASE_PROJECT_REF.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Quoted in both token errors — it is the fix for either. */
const HOW =
  "Create one at https://supabase.com/dashboard/account/tokens, then:\n  SUPABASE_ACCESS_TOKEN=sbp_… bun run auth:templates";

/**
 * Template file → what it is called in the project's auth config, and the
 * subject line it goes out under. The subject lives here rather than in the
 * dashboard so the whole email — line and body — has one source; the values
 * are the ones docs/aayaan-ops-handoff.md has always specified.
 */
const TEMPLATES = {
  confirmation: {
    body: "mailer_templates_confirmation_content",
    subject: "mailer_subjects_confirmation",
    line: "Confirm your NextXI account",
  },
  "magic-link": {
    body: "mailer_templates_magic_link_content",
    subject: "mailer_subjects_magic_link",
    line: "Your NextXI sign-in code",
  },
  recovery: {
    body: "mailer_templates_recovery_content",
    subject: "mailer_subjects_recovery",
    line: "Reset your NextXI password",
  },
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
    throw new Error(`SUPABASE_ACCESS_TOKEN is required. ${HOW}`);
  }
  // Access tokens are `sbp_…`. The CLI's keychain entry is not one of them,
  // and the API's answer to anything else — "JWT could not be decoded" —
  // says nothing about what went in.
  if (!token.startsWith("sbp_")) {
    throw new Error(`That is not an access token — they start with "sbp_". ${HOW}`);
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

  // Supabase locks template editing on the default email provider, and the
  // 400 it returns arrives after the work looks done. Say it up front.
  if (!live.smtp_host) {
    console.warn(
      "  ! custom SMTP is not configured, so this project cannot edit templates at all —\n" +
        "    not here and not in the dashboard. Set SMTP first (docs/aayaan-ops-handoff.md, Task 2).",
    );
  }

  const patch: Record<string, string> = {};
  for (const name of names) {
    const template = TEMPLATES[name];
    const html = await readFile(path.join(ROOT, "supabase", "templates", `${name}.html`), "utf8");
    const bodyMatches = (live[template.body] ?? "") === html;
    const subjectMatches = (live[template.subject] ?? "") === template.line;

    if (bodyMatches && subjectMatches) {
      console.log(`  ${name.padEnd(12)} already matches the repo`);
      continue;
    }

    if (!bodyMatches) patch[template.body] = html;
    if (!subjectMatches) patch[template.subject] = template.line;
    console.log(
      `  ${name.padEnd(12)} differs — pushing ${[
        !bodyMatches ? `${html.length} bytes` : null,
        !subjectMatches ? `subject "${template.line}"` : null,
      ]
        .filter(Boolean)
        .join(" and ")}`,
    );
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

  const stale = Object.entries(patch).filter(([field, value]) => (saved[field] ?? "") !== value);
  if (stale.length) {
    throw new Error(
      `Saved, but the project still returns something else for: ${stale.map(([field]) => field).join(", ")}`,
    );
  }

  console.log(`\nPushed ${Object.keys(patch).length} field(s). The project now sends what the repo says.`);
}

await main();
