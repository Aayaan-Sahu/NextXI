<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# NextXI — agent guide

A cricket talent platform: players upload technique videos for AI coaching
reports, track stats/goals, and connect with coaches and guardians.
Next.js 16 (App Router) · React 19 · Prisma 7 · Supabase · Tailwind v4 · Bun.

**Author / committer (mandatory):** Mukilan Rajasekar \<mukilan.rajasekar@gmail.com\>.

Every agent commit — Cloud, background, local — must use that identity for **both**
author and committer. Never `Cursor Agent` / `cursoragent@cursor.com`. Never
`Co-authored-by:` or `Made-with: Cursor` trailers.

Enforcement (do not weaken):

1. Run `./scripts/agent-git-identity.sh` before the first commit in a session
   (`.cursor/environment.json` install and `.cursor/hooks.json` also run it).
2. That script sets `user.name` / `user.email` and replaces Cursor's
   `commit-msg.cursor.co-author` injector with a no-op.
3. If a commit still lands wrong, rewrite it (`git commit --amend` /
   `filter-branch` with `core.hooksPath=/dev/null`) before pushing.

Cursor has no product toggle for Cloud Agent authorship; this repo policy is
the permanent override.

## Commands (use Bun, never npm)

- `bun dev` — start the dev server
- `bun run build` / `bun start` — production build / serve
- `bun run lint` — ESLint (run before finishing a change)
- `bun run db:generate` — regenerate the Prisma client (**required after any
  `prisma/schema.prisma` edit**)
- `bun run db:migrate` — create/apply a dev migration

## Styling — read `STYLE-GUIDE.md` first

**Before writing or changing any UI, read `STYLE-GUIDE.md`.** It is the working
rulebook: the nine type roles, the seven colours, the primitives to build from,
and the checklist to run before you call a change done. `DESIGN.md` carries the
art direction behind those rules.

The two things that break the system every time: inventing a text size instead
of using a role (`text-[13.5px]` is always wrong), and inventing a colour
instead of using a token. Both are defined in `@theme` in `app/globals.css` —
there is no `tailwind.config.js`.

The landing page (`components/landing/*`) is a deliberately different register.
Do not use it as a reference for product work, and check both when you change
shared code.

## Where things go

- **Reusable UI → `components/`.** Keep distinct UI in its own component —
  including auth screens (sign in / sign up), video widgets, messaging, etc.
  Style with **Tailwind only**; no ad-hoc CSS files. Shared primitives live in
  `components/ui.tsx` — extend that file rather than restyling locally.
- **Server/data logic → `lib/`** (`auth`, `prisma`, `supabase/*`, `videos`,
  `connections`, `messages`, `players`, `progress`).
- **Routes → `app/`.** Server Actions live in `actions.ts` files next to their
  route and start with `"use server"`; call `revalidatePath(...)` after writes.
- Import alias: **`@/*` maps to the repo root** (e.g. `@/lib/prisma`,
  `@/components/ui`).

## Data layer (Prisma)

- Always import the shared singleton: `import { prisma } from "@/lib/prisma"`.
  **Never** `new PrismaClient()` — the singleton wires the `pg` adapter and
  avoids dev hot-reload connection leaks.
- The client is **generated** into `app/generated/prisma/` and is **gitignored**
  — run `bun run db:generate` after cloning and after every schema change.
- Import enums from `@/app/generated/prisma/enums` (e.g. `PlayerStatus`).
- Supabase owns the `auth` and `storage` schemas (external tables); app tables
  live in `public`. See `prisma/schema.prisma`.

## DB changes & deploys — migrations are not optional

- **Every `prisma/schema.prisma` edit ships as a committed migration.** Run
  `bun run db:migrate` (creates the folder in `prisma/migrations/` and applies
  it to the dev DB), then `bun run db:generate`, and commit the migration
  folder **in the same commit as the code that needs it**. A schema edit
  without a committed migration silently never reaches production — this
  caused a prod outage (pages 500ing on missing columns).
- **Merging to main is the deploy step.** The Vercel build
  (`scripts/vercel-build.sh`, the `vercel-build` script) runs
  `prisma migrate deploy` before `next build` **on production deploys only**,
  so pending migrations apply automatically on merge. Preview deploys skip the
  migration — they share the production database, and an unguarded deploy once
  applied a PR's migration to production from its preview build — so a preview
  of a migration PR builds against the current schema and may not exercise the
  new columns. Nobody runs SQL by hand, and local `bun run build` deliberately
  does not touch the DB.
- **Never delete or rename an applied migration folder.** A migration the DB
  records as applied but that is missing from the tree fails every
  deploy/`migrate` command with P3015 (also happened once — restore the file
  to recover, don't work around it).
- The Prisma CLI reads `.env.local` via `prisma.config.ts` (Next.js loads it
  natively), so `bunx prisma migrate status` / `db:migrate` work locally
  without a separate `.env`. When in doubt, `bunx prisma migrate status`
  before and after schema work.

## Auth & Supabase

- Gate routes with `requireUser()` / `requireAdmin()` from `@/lib/auth`; resolve
  the signed-in user with `getCurrentUser()` and role with `getOnboardingStatus`.
  Admins are the emails in `ADMIN_EMAILS`.
- Three Supabase clients — pick the right one:
  - `@/lib/supabase/server` — server components/actions (cookie-based session)
  - `@/lib/supabase/client` — browser
  - `@/lib/supabase/admin` — **server-only** privileged key; never import client-side
- `proxy.ts` is the middleware that refreshes the session on every request
  (Next.js 16 names it `proxy`, not `middleware`).

## Gotchas

- Roles: **player / coach / guardian / admin**. Coaches start `pending` and need
  admin approval before they can act.
- Videos upload directly to Supabase Storage via resumable **tus** uploads
  (`app/api/videos/*`); each finished upload auto-creates a `Report` row.
- External AI pipeline delivers coaching reports via
  `PUT /api/videos/{videoId}/report` — contract in `docs/reports-contract.md`.
- Env vars: see the README. Server-only secrets (`SUPABASE_SECRET_KEY`,
  `REPORTS_INGEST_SECRET`) must never reach the browser.
- The `/tutorials` films are **recordings of the real app**, not animation —
  changing a screen they show means re-shooting. `docs/tutorials.md` has the
  four commands. Never leave the seeded demo world in the database.
