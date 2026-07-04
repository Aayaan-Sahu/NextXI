---
name: verify
description: How to build, run, and drive this app end-to-end to verify changes (dev server, confirmed test users, Playwright browser flows).
---

# Verifying cricket-platform changes

## Build / run

- `bunx prisma migrate deploy && bunx prisma generate` after schema changes, then `bunx tsc --noEmit` and `bun run build`.
- Dev server: `bun dev --port 3001`. **A dev server started before `prisma generate` holds a stale Prisma client singleton** (new models are `undefined` at runtime) — restart it after regenerating.
- Only one `next dev` can run per repo; check `.next/dev/logs/next-development.log` for runtime errors.

## Test users (Supabase auth requires confirmed emails)

Create pre-confirmed users with the admin API — no email round-trip:

```ts
import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } });
await admin.auth.admin.createUser({ email, password, email_confirm: true });
```

Run scripts from the repo root (`bun --env-file=.env script.ts`) so `node_modules` resolves. Clean up with `admin.auth.admin.deleteUser(id)` — app rows cascade from `auth.users`.

Direct Prisma queries work for `public` tables, but joins through `AuthUser` relations fail with `permission denied for schema auth` under `DATABASE_URL` — query by id instead.

## Driving the UI

`playwright-core` + cached Chromium works well (no project dep needed):

```js
import { chromium } from "playwright-core";
const executablePath = `${homedir()}/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
```

- Sign in at `/auth` (`input[name=email]`, `input[name=password]`, `button:has-text("Sign in")`).
- Server-action form submits redirect; **wait with `page.waitForURL(...)` for the destination or `?...Error=` query param** — `waitForLoadState("networkidle")` resolves too early and you'll read the pre-submit page.
- Flows worth driving: onboarding (`/onboarding?role=player|coach|guardian`), dashboards per role, connections send/respond (notices land in `?connectionError=`/`?connectionMessage=`), `/api/videos/initiate-upload` via `page.request.post` for authz checks.

## Gotchas

- Roles are row-existence (Player/Coach/Guardian keyed to the auth UUID); an auth user with no rows lands on `/onboarding` after sign-in.
- Minors (DOB < 18y at onboarding) get `status=PENDING_GUARDIAN` + a guardian code shown on their player dashboard.
