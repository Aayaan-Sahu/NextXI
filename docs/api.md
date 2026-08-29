# HTTP API — for the native apps

The web app talks to the platform through Server Actions; the iOS and
Android apps (`docs/mobile-apps.md`) can only speak HTTP, so every screen
they need has a JSON route under `app/api/`. This is the contract those
routes share. The AI worker's routes (`/api/reports/claim`,
`PUT /api/videos/{id}/report`) are a separate, secret-keyed contract in
`docs/reports-contract.md`.

## Authentication

Send the Supabase access token as a bearer:

```
Authorization: Bearer <access_token>
```

The token is the one `supabase-js` holds on the device after
`signInWithPassword` (or a future `signInWithIdToken` for Apple / Google).
The app never keeps cookies; `supabase-js` refreshes the token itself, and
every request carries the current one. The server verifies it locally
against the project's JWKS (`lib/auth.ts` `getCurrentUser`), exactly as it
verifies the browser's cookie session — the same function serves both, so
every Server Component, Server Action and route that calls `requireUser()`
accepts a bearer with no further change. A bearer takes precedence over any
cookie on the request; an invalid token or an unparseable Authorization
header is simply "not signed in" and never falls back to a cookie.

Sign-up and password reset are the two flows that cannot ride a bearer
(there is no account yet / no session); they get their own routes below.

## Errors

Every failure is JSON with an HTTP status:

```json
{ "error": "Account pending guardian approval." }
```

`error` is a sentence the app may show as-is. Validation failures (400)
add `issues: [{ path, message }]`, one per field, and `error` is the first
of them prefixed with its path (`"heightCm: Invalid input: expected number"`).
Unexpected failures are a bare `500 { "error": "Something went wrong." }`
with the detail in the server log, never on the wire.

| Status | Meaning |
| --- | --- |
| `400` | Malformed JSON, or a body / query the schema rejected. |
| `401` | No valid credential. Sign in again. |
| `403` | Signed in, but the role or its status doesn't allow this — the message says which (player pending guardian approval, coach pending admin approval, wrong role). |
| `404` | The thing addressed doesn't exist or isn't yours. |
| `429` | Rate-limited at the edge (Vercel Firewall); back off. |

Routes are written with `apiHandler` (`lib/api.ts`), which owns auth,
validation and this error shape; a route body is only the rule, and the
rule lives in a `lib/*` function the equivalent Server Action calls too.

## Routes

Phase 0 (`docs/mobile-apps.md`, "Build phases"). ✅ = live on main.

| Route | Auth | Purpose |
| --- | --- | --- |
| ✅ `GET /api/me` | user | The account on launch: `{ user, role, username, player \| coach \| guardian, isAdmin, onboardingRequired, limits: { canUpload, canMessage, canConnect } }`. `role: null` + `onboardingRequired: true` → show onboarding. `limits` restate the Server Actions' status rules so the app hides a control rather than showing it and failing. |
| ✅ `GET /api/usernames/{username}` | none | `{ username, status: "free" \| "taken" \| "invalid" }` — the live handle check on sign-up. Same rule as the web form (`lib/usernames.server.ts`). |
| ✅ `POST /api/videos/initiate-upload` · `POST /api/videos/complete-upload` · `POST /api/profile/avatar/initiate-upload` | player | The existing upload routes; they accepted only the cookie session before and accept a bearer now. Contract unchanged. |
| `POST /api/auth/signup` | none | Create the account (the web's `signUp` action lifted into `lib/signup.ts`, including the confirm-email step); returns the session for `setSession`. |
| `POST /api/onboarding` | user | `completeOnboarding` as a route. |
| `POST /api/media/sign` | user | Batch signed URLs for storage paths the caller may read (videos, thumbnails, avatars). The app caches by path until `expiresAt` and re-signs on 403. |
| `PUT` / `DELETE /api/devices` | user | Register / remove an Expo push token (`DeviceToken`). |
| `GET /api/videos?session=&cursor=` · `GET /api/videos/{id}` · `DELETE /api/videos/{id}` | player | The clip list and the report (`payload`, derived rows, scores, focus, moments), honouring coach-review publication. |
| `GET /api/capture-policy` | none | Allowed capture fps and max clip length for the camera. |

Later phases add sessions, progress, connections, messages, profile, coach
and guardian routes — the table in `docs/mobile-apps.md` is the plan; this
file records what exists.

## Rate limiting

None in the app code. Before the first TestFlight build, Vercel Firewall
rules go on `POST /api/auth/signup`, `GET /api/usernames/*`,
`POST /api/videos/initiate-upload`, `PUT /api/devices` and the message
routes (`docs/mobile-apps.md`, "Rate limiting").
