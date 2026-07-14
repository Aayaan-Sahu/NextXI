<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# NextXI — agent guide

A cricket talent platform: players upload technique videos for AI coaching
reports, track stats/goals, and connect with coaches and guardians.
Next.js 16 (App Router) · React 19 · Prisma 7 · Supabase · Tailwind v4 · Bun.

## Commands (use Bun, never npm)

- `bun dev` — start the dev server
- `bun run build` / `bun start` — production build / serve
- `bun run lint` — ESLint (run before finishing a change)
- `bun run db:generate` — regenerate the Prisma client (**required after any
  `prisma/schema.prisma` edit**)
- `bun run db:migrate` — create/apply a dev migration

## Where things go

- **Reusable UI → `components/`.** Keep distinct UI in its own component —
  including auth screens (sign in / sign up), video widgets, messaging, etc.
  Style with **Tailwind only**; no ad-hoc CSS files.
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
