# Load testing

A pre-pilot harness that simulates ~100 signed-in players against a deployed
preview: dashboard browsing, upload initiation, and (for ~10% of users) a real
~10MB video upload to Supabase Storage.

> **⚠️ NEVER run this against production.** It creates 100 auth users, writes
> player rows, uploads real video bytes to the `player-videos` bucket, and
> burns database, auth, and storage quota. Point every environment variable at
> a **staging** Supabase project and a **preview** deployment only.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) (`brew install k6`)
- Bun, with the repo installed (`bun install`) and the Prisma client generated
  (`bun run db:generate`)
- A staging Supabase project and a Vercel preview deployment pointed at it

All configuration is read from env — nothing is hardcoded:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | seed | Staging Supabase project URL |
| `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) | seed | Admin API: create pre-confirmed users |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `..._ANON_KEY`) | seed | Password-grant sign-in per user |
| `DATABASE_URL` | seed | Prisma writes the player onboarding rows |
| `LOAD_PASSWORD` (optional) | seed | Fixed password for the test users; random per run otherwise |
| `LOAD_EMAIL_DOMAIN` (optional) | seed | Email domain for test users (default `example.com`) |
| `BASE_URL` | k6 | The preview deployment under test |
| `VERCEL_PROTECTION_BYPASS` (optional) | k6 | Bypass secret for protected previews |

## 1. Seed the test users

With your shell env (or `.env`) pointing at **staging**:

```sh
bun load/seed-users.ts --count 100
```

This creates `nextxi-load-0001@example.com` … as pre-confirmed auth users,
inserts their profile/player rows (adult date of birth, `ACTIVE` status, no
guardian gate), signs each one in, and writes the session cookies to
`load/.sessions.json`. The file is gitignored — it contains live session
tokens. The script is idempotent: re-runs reuse existing users and reset their
passwords.

Access tokens expire (default 1 hour), so seed shortly before running the
test. Mid-run refreshes are handled: each VU keeps a cookie jar, and the app's
proxy refreshes near-expiry sessions via `Set-Cookie`.

## 2. Run against a Vercel preview

Grab the preview URL from the Vercel dashboard or `vercel ls`. If the project
has Deployment Protection enabled, create a bypass secret under
**Project Settings → Deployment Protection → Protection Bypass for
Automation** and pass it along:

```sh
k6 run \
  -e BASE_URL=https://nextxi-git-<branch>-<team>.vercel.app \
  -e VERCEL_PROTECTION_BYPASS=<secret> \
  load/core-flow.js
```

The scenario ramps 0 → 100 VUs over 2 minutes, then holds 100 VUs for 8
minutes. Each VU loops: `GET /dashboard/player`, `GET /dashboard/progress`,
`POST /api/videos/initiate-upload`; every 10th VU also PUTs ~10MB to the
signed storage URL, polls `POST /api/videos/complete-upload` (409 = storage
not yet visible, retried), and loads the video page.

Pass/fail thresholds:

- `p(95) < 1500ms` for the two dashboard pages
- overall request error rate `< 1%`

## 3. What to watch in the Supabase dashboard

- **Database → Reports / Query Performance**: active connections (the app caps
  each server instance at a pool of 5 — watch total connections vs. the
  project's limit as Vercel scales instances), CPU/IO, slow queries.
- **Auth → Rate limits / logs**: token refresh volume. The proxy verifies JWTs
  locally, so a flood of `/token` requests means sessions are expiring
  mid-run — reseed and rerun.
- **Storage**: object count and bandwidth on the `player-videos` bucket; each
  run adds ~100MB from the uploader VUs.
- **Project usage**: overall egress and API request quota consumption.

On the Vercel side, watch function duration/timeouts and error rate for
`/dashboard/*` and `/api/videos/*`.

## Cleanup

Deleting the seeded auth users cascades to their profile/player/video rows
(`onDelete: Cascade`). Storage objects under each deleted player's folder in
`player-videos` must be removed separately. Non-uploader VUs leave
`PENDING_UPLOAD` video rows behind by design — they exercise the initiate
path only; those rows go away with the user cascade too.
