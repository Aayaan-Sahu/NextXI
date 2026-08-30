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
  off-spin, leg-spin, batting), variation, and handedness. Capped at 50 MB to
  match Supabase's Free-plan ceiling (`MAX_VIDEO_SIZE_BYTES` in
  `shared/videos.ts`, and the bucket's own `file_size_limit`).
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
- **Admin console** — approve or reject coach and club applications. Both are
  auto-approved on sign-up for now, so the queue is normally empty; the console
  is still where an account gets rejected or a club name dispute is settled.

## Roles

| Role         | How it's assigned                          | Can do                                                                 |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| **Player**   | Chosen at onboarding                       | Build a profile, upload videos, log stats/goals, message connections   |
| **Coach**    | Chosen at onboarding, approved automatically | Browse the player directory, view videos, comment, message players     |
| **Guardian** | Chosen at onboarding                       | Link to child players via guardian code, oversee their videos          |
| **Club**     | Chosen at onboarding, approved automatically | Claim the players who named it, watch their clips and signed-off reports, invite coaches to run it |
| **Admin**    | `ADMIN_EMAILS`, or granted on the account  | Approve/reject coaches and clubs from the admin dashboard               |

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
| `NEXT_PUBLIC_SITE_URL`                                         | ⚠️       | Production canonical URL for auth emails. Production always falls back to `https://www.nextxi.pro` if this is missing or still a `*.vercel.app` host. Previews use `VERCEL_URL` so signup stays on the same host. |
| `ADMIN_EMAILS`                                                 | ➖       | Comma-separated emails granted admin access. Optional — `bun run admin:grant <email>` sets it on the account instead, with no redeploy (see below) |
| `REPORTS_INGEST_SECRET`                                        | ➖       | Bearer token the AI pipeline uses to submit coaching reports        |
| `TEAM_NOTIFY_WEBHOOK_URL`                                      | ➖       | Slack-compatible webhook pinged on signups and finished uploads     |

> Never expose `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` or
> `REPORTS_INGEST_SECRET` to the browser — they are server-only.

### Supabase auth URL configuration (required before real users sign up)

The verification email's link is minted by **Supabase**, not this app, and
Supabase silently replaces any redirect it doesn't recognize with the project's
Site URL. That Site URL was left on the old Vercel alias
(`https://cricket-platform-nine.vercel.app`), so confirmation emails pointed
away from `https://www.nextxi.pro` and the session cookie never landed on the
canonical host.

In the Supabase dashboard → **Authentication → URL Configuration**:

1. Set **Site URL** to `https://www.nextxi.pro` (www, not the apex — `nextxi.pro` 308s to www).
2. Set **Redirect URLs** to:
   - `https://www.nextxi.pro/**`
   - `https://nextxi.pro/**`
   - `https://cricket-platform-*.vercel.app/**` (preview deploys)
   - `http://localhost:3000/**`
3. Push the email templates. They live in `supabase/templates/`, and **the
   dashboard does not read the repo** — editing a file here changes nothing a
   user receives until the HTML is in the project's auth config:

   ```sh
   SUPABASE_ACCESS_TOKEN=sbp_… bun run auth:templates
   ```

   The token is a personal access token from
   [Account → Access Tokens](https://supabase.com/dashboard/account/tokens),
   revocable from the same page. Not the CLI's own credential: `supabase
   login` files a go-keyring wrapper in the keychain, not a token an API
   client can present. The push sends only the bodies (the dashboard keeps
   its subject lines) and reads back what it wrote. By hand it is **Authentication → Emails**:
   `confirmation.html` → **Confirm signup** (subject: `Confirm your NextXI
   account`), `magic-link.html` → **Magic Link** (`Your NextXI sign-in code`),
   `recovery.html` → **Reset password** (`Reset your NextXI password`).

   Every template links to `/auth/confirm?token_hash={{ .TokenHash }}` with its
   own `type=`: `signup`, `magiclink`, `recovery`. Only the magic-link template
   still carries a 6-digit `{{ .Token }}`; sign-up and password reset are
   link-only. If the dashboard rejects the paste (`Email template modification
   is not available for free tier projects using the default email provider`),
   add custom SMTP (Resend, etc.) or upgrade the project — the push fails with
   that same message.

Then set `NEXT_PUBLIC_SITE_URL=https://www.nextxi.pro` in the **Production**
Vercel environment (not Preview). The app also refuses to mint `*.vercel.app`
links when `VERCEL_ENV=production`, and `/auth/confirm` 308s any production
alias onto `www.nextxi.pro` so older emails still confirm on the right host.

The remaining dashboard work (SMTP, mailbox, Vercel env, GitHub homepage) is
the step-by-step brief in `docs/aayaan-ops-handoff.md`.

## Scripts

| Command               | Description                                            |
| --------------------- | ----------------------------------------------------- |
| `bun dev`             | Start the Next.js dev server                          |
| `bun run build`       | Production build                                      |
| `bun start`           | Serve the production build                            |
| `bun run db:generate` | Generate the Prisma client (`prisma generate`)        |
| `bun run db:migrate`  | Create/apply a dev migration (`prisma migrate dev`)   |
| `bun run lint`        | Run ESLint                                             |
| `bun run admin:grant` | Make an account an administrator (`… you@example.com`) |
| `bun run admin:revoke` | Take it away again                                    |
| `bun run video:seed`  | Build the demo world the tutorials are filmed against  |
| `bun run video:capture` | Record a tutorial walkthrough (`… player`)          |
| `bun run video:tutorials` | Render + encode the tutorial films                |
| `bun run video:teardown` | Delete the demo world and verify it is gone        |

### Making someone an administrator

Two ways in, and the app accepts either.

**On the account** — no hosting access, no redeploy:

```sh
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SECRET_KEY=<service key> \
  bun run admin:grant you@example.com someone.else@example.com
```

That sets `app_metadata.admin` on the Supabase auth user, which rides in the
access token — so the app reads it with no extra query, and `bun run
admin:revoke` takes it back. Only the service key can write `app_metadata`;
nothing the browser holds can. It lands on the next token they are issued,
so signing out and back in makes it immediate.

**On the deployment** — `ADMIN_EMAILS`, comma-separated, in the hosting
environment. Simple, but it needs whoever owns that account, and a redeploy
before it takes effect.

## Project structure

```
app/
  api/videos/            # Upload initiation/completion + report ingress
  auth/                  # Sign in / sign up, email confirm, password reset
  onboarding/            # Role selection + first-run profile
  dashboard/
    admin/               # Coach approvals
    club/                # Club dashboard: roster, claims, member coaches
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
docs/                     # reports-contract.md, tutorials.md and other contracts
remotion/                 # Video compositions: the recording guide and the tutorials
scripts/                  # Demo-world seeding, tutorial capture and rendering
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
