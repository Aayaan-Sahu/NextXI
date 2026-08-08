# NextXI

A cricket talent platform where young players build a profile, upload technique
videos for AI‑powered coaching reports, track their match stats and goals, and
connect with coaches and guardians — all in one place.

Built with Next.js 16 (App Router), React 19, Prisma 7, and Supabase
(auth, storage, and realtime), styled with Tailwind CSS v4, and run with
[Bun](https://bun.com).

---

## Table of contents

- [Features](#features)
- [Roles](#roles)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [AI coaching reports](#ai-coaching-reports)
- [Conventions](#conventions)

---

## Features

- **Role-based onboarding** — new users pick a role (player, coach, or guardian)
  and complete a profile tailored to it.
- **Player profiles** — name, date of birth, club, county, playing roles,
  physical details, and public/private visibility.
- **Video uploads** — resumable, direct-to-storage uploads
  ([tus](https://tus.io/)) to Supabase Storage, tagged by category (pace,
  off-spin, leg-spin, batting), variation, and handedness.
- **AI coaching reports** — every uploaded video gets a report slot that an
  external AI pipeline fills in via a documented ingress API (see
  [AI coaching reports](#ai-coaching-reports)).
- **Progress tracking** — match-by-match batting and bowling stat entries,
  goals with targets and horizons, reminders, and progress charts.
- **Connections** — request, accept, and revoke connections between players,
  coaches, and guardians.
- **Realtime messaging** — direct messages between connected users, powered by
  Supabase Realtime with read receipts.
- **Coach directory & review** — coaches discover players, view their videos,
  and leave comments; video views are tracked.
- **Guardian linking** — guardians link to their children via a one-time
  guardian code and oversee their videos.
- **Admin console** — approve or reject coach applications (coaches start in a
  `pending` state).

## Roles

| Role         | How it's assigned                          | Can do                                                                 |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| **Player**   | Chosen at onboarding                       | Build a profile, upload videos, log stats/goals, message connections   |
| **Coach**    | Chosen at onboarding, approved by an admin | Browse the player directory, view videos, comment, message players     |
| **Guardian** | Chosen at onboarding                       | Link to child players via guardian code, oversee their videos          |
| **Admin**    | Email listed in `ADMIN_EMAILS`             | Approve/reject coaches from the admin dashboard                         |

Roles resolve at request time from the signed-in Supabase user; the middleware
(`proxy.ts`) refreshes sessions and `lib/auth.ts` gates routes.

## Tech stack

| Concern       | Choice                                                          |
| ------------- | -------------------------------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org) App Router, React 19          |
| Language      | TypeScript                                                     |
| Styling       | Tailwind CSS v4 (via `@tailwindcss/postcss`)                   |
| Database      | PostgreSQL via [Prisma 7](https://www.prisma.io) (`pg` adapter)|
| Auth          | Supabase Auth (`@supabase/ssr`)                                |
| Storage       | Supabase Storage (resumable uploads via `tus-js-client`)       |
| Realtime      | Supabase Realtime (messaging)                                  |
| Runtime / PM  | [Bun](https://bun.com)                                         |

> **Note:** This project uses Next.js 16, which has breaking changes from
> earlier versions. See `AGENTS.md` and the guides in
> `node_modules/next/dist/docs/` before making framework-level changes.

## Getting started

### Prerequisites

- [Bun](https://bun.com/docs/installation)
- A [Supabase](https://supabase.com) project (for auth, storage, and realtime)
- A PostgreSQL connection string (Supabase provides one)

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
#    Create .env.local and fill in the values from the table below

# 3. Generate the Prisma client and apply migrations
bun run db:generate
bun run db:migrate

# 4. Start the dev server
bun dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Environment variables

Create a `.env.local` in the project root. The Supabase keys support both the
newer (`PUBLISHABLE`/`SECRET`) and legacy (`ANON`/`SERVICE_ROLE`) names — set
one from each pair.

| Variable                                                       | Required | Purpose                                                             |
| -------------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                                                 | ✅       | Postgres connection string used by Prisma at runtime                |
| `DIRECT_URL`                                                   | ➖       | Direct (non-pooled) connection for migrations; falls back to `DATABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_URL`                                     | ✅       | Supabase project URL                                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `..._ANON_KEY`        | ✅       | Public client key (browser + server auth)                           |
| `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`            | ✅       | Server-only admin key (privileged storage/auth operations)          |
| `NEXT_PUBLIC_SITE_URL`                                         | ⚠️       | Base URL baked into auth verification/reset emails. **Required in production** — without it the link base falls back to the request origin or `localhost:3000`, and external users get emails pointing at a host they can't reach |
| `ADMIN_EMAILS`                                                 | ➖       | Comma-separated list of emails granted admin access                 |
| `REPORTS_INGEST_SECRET`                                        | ➖       | Bearer token the AI pipeline uses to submit coaching reports        |
| `TEAM_NOTIFY_WEBHOOK_URL`                                      | ➖       | Slack-compatible webhook pinged on signups and finished uploads     |

> Never expose `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` or
> `REPORTS_INGEST_SECRET` to the browser — they are server-only.

### Supabase auth URL configuration (required before real users sign up)

The verification email's link is minted by **Supabase**, not this app, and
Supabase silently replaces any redirect it doesn't recognize with the project's
Site URL (default `http://localhost:3000`) — which reads as "page not found" on
anyone else's machine even when signup works on a dev box. In the Supabase
dashboard → **Authentication → URL Configuration**:

1. Set **Site URL** to the production domain (e.g. `https://nextxi.app`).
2. Add `https://<production-domain>/auth/confirm` (and any preview domains) to
   **Redirect URLs**.
3. Recommended: switch the *Confirm signup* email template to the stateless
   token form so the link works from any device or browser — not just the one
   that submitted the form:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding`

Then set `NEXT_PUBLIC_SITE_URL` to the same production domain in the deploy
environment, and test the real email link from a device that isn't running the
dev server.

## Scripts

| Command               | Description                                            |
| --------------------- | ----------------------------------------------------- |
| `bun dev`             | Start the Next.js dev server                          |
| `bun run build`       | Production build                                      |
| `bun start`           | Serve the production build                            |
| `bun run db:generate` | Generate the Prisma client (`prisma generate`)        |
| `bun run db:migrate`  | Create/apply a dev migration (`prisma migrate dev`)   |
| `bun run lint`        | Run ESLint                                             |

## Project structure

```
app/
  api/videos/            # Upload initiation/completion + report ingress
  auth/                  # Sign in / sign up, email confirm, password reset
  onboarding/            # Role selection + first-run profile
  dashboard/
    admin/               # Coach approvals
    coach/               # Coach views: players, videos
    guardian/            # Guardian views
    player/              # Player home + videos
    connections/         # Connection requests
    messages/            # Realtime messaging
    progress/            # Stats, goals, reminders
    profile/             # Edit profile
  generated/prisma/      # Generated Prisma client (gitignored)
components/               # UI components (auth, video-*, messaging, charts, …)
lib/                      # Server/data helpers (auth, prisma, supabase, videos, …)
prisma/                   # schema.prisma + migrations
docs/                     # reports-contract.md and other contracts
proxy.ts                  # Middleware: refreshes the Supabase session per request
```

## Data model

Prisma models live in `prisma/schema.prisma`. The client is generated into
`app/generated/prisma` (gitignored). Supabase's `auth` and `storage` schemas are
treated as external tables; the app's own tables live in `public`.

Core entities:

- **AuthUser** (`auth.users`) — the Supabase user; every profile hangs off this.
- **Player / Coach / Guardian / Profile** — role records keyed to the auth user.
- **PlayerVideo** — an uploaded clip with storage metadata, category, variation,
  handedness, and status (`pending_upload` → `ready`).
- **Report** — one per video; holds the AI coaching payload and status
  (`pending` / `ready` / `failed`).
- **VideoComment / VideoView** — coach feedback and view tracking.
- **Connection / Message** — the social graph and direct messages.
- **StatEntry / Goal / Reminder** — a player's progress tracking.

## AI coaching reports

Each video automatically gets a `Report` row (starting in `pending`) when its
upload completes. An external AI pipeline delivers the finished report by calling
the platform's ingress endpoint:

```
PUT /api/videos/{videoId}/report
Authorization: Bearer <REPORTS_INGEST_SECRET>
```

It moves the report to `ready` (with a `payload`) or `failed` (with an `error`).
The full service-to-service contract — auth, request/response shapes, validation
rules, and the recommended payload schema — is documented in
[`docs/reports-contract.md`](docs/reports-contract.md).

## Conventions

- **Bun, not npm** — use `bun` for installs and scripts.
- **Tailwind for styling** — no ad-hoc CSS; keep distinct UI (sign in/up, etc.)
  in dedicated components.
- **Clean components** — reusable UI belongs in `components/`; data and
  server-only logic belong in `lib/`.
- **Next.js 16 specifics** — consult `AGENTS.md` and the bundled Next.js docs
  before touching framework conventions.
