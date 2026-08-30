# Finish the NextXI launch (give this whole file to Claude, in the repo root)

You are helping **Aayaan Sahu** clear the last things standing between NextXI
and real users hopping on. Mukilan has shipped every product change this
needs; what is left is dashboard, DNS, mailbox and one container.

Work top to bottom. The order is load-bearing — several steps fail in
confusing ways if an earlier one is not done. After each step, write down what
you clicked, the exact values you saved, and how you verified it. **Stop and
report** if a step is blocked (no DNS access, not a repo admin, billing, a
decision that is not yours).

Do **not** change application code unless a step here says to. Do **not** set
Site URL to a `*.vercel.app` host. Do **not** "improve" settings that are
already correct.

Two reference documents in this repo carry the detail. Read the relevant one
before the step that names it:

- `docs/aayaan-ops-handoff.md` — the click-by-click for mailbox, Resend,
  Supabase SMTP, templates and the GitHub setting.
- `docs/worker-deployment.md` — the report worker: why, where, and the exact
  commands.

---

## Where things actually stand

Verified against production, not assumed. Do not redo this discovery.

| Thing | State |
| --- | --- |
| Site is live | `https://www.nextxi.pro` serves 200; apex 308s to www |
| Site URL / Redirect URLs | Correct. Confirm, then leave alone |
| Auth emails | **Supabase's own defaults.** Template editing is locked on the free provider. This is the blocker |
| Signup flow | **Link-only.** No 6-digit code anywhere. `/auth/check-email` offers a resend and nothing else |
| Report ingest secret | **Already set** in Vercel production — `/api/reports/claim` answers 401, not 503 |
| Report worker | **Not running anywhere.** Every uploaded video says "being prepared" forever |
| Video size cap | 50 MB, matching Supabase's Free-plan ceiling |
| Coach / club approval | Auto-approved on sign-up. The admin queue is normally empty |
| Under-18 players | Open immediately; the guardian code is an invitation, not a lock |
| Public contact address | `contact@nextxi.pro` — **the mailbox does not exist yet** |
| GitHub repo homepage | Still `https://cricket-platform-nine.vercel.app` |

Two pull requests are open and should merge before you start:

- **#47** — the gate changes above, plus `docs/worker-deployment.md`.
- **#45** — puts the auth email subject lines in the repo, so
  `bun run auth:templates` writes subject *and* body. Merge this before
  Step 4 or you will be typing three subjects by hand.

---

## Step 0 — The decision that is not yours to make

**Ultralytics is AGPL-3.0**, and the report worker imports it server-side to
serve a commercial platform. `docs/mobile-apps.md` lists this as needing a
decision before launch and points at a `docs/MODEL-STATUS.md` in the
`cricket-ai-model` repo — **that file does not exist**. So the decision has no
written home and, as far as either repo can tell, has never been made.

The options are: buy an Ultralytics commercial licence, replace the detector
with a permissively licensed one, or accept AGPL and publish the source.

**Ask Aayaan and Mukilan to pick one before Step 7.** Deploying the worker is
what turns this from theoretical into shipped. Write the answer into
`cricket-ai-model/docs/MODEL-STATUS.md` so the next person finds it.

Everything except Step 7 can proceed while this is being decided.

---

## Step 1 — A mailbox at `contact@nextxi.pro`

`/contact` and `/safeguarding` advertise this address. Right now a parent
raising a safeguarding concern writes into nothing. That is worse than
publishing no address at all, so this goes first.

Follow **Task 1** of `docs/aayaan-ops-handoff.md`. Cloudflare Email Routing
(free, forward-only) is the recommended path.

**Done when:** a mail sent from an outside account to `contact@nextxi.pro`
lands in Aayaan's real inbox. Not when the DNS records are saved — when a
message actually arrives.

## Step 2 — A verified sending domain at Resend

Follow **Task 2a** of `docs/aayaan-ops-handoff.md`.

Watch the SPF record: if Step 1 created one for Cloudflare, you must *combine*
both includes into a single TXT record. Two SPF records on the same name fail
and neither vendor will tell you.

**Done when:** Resend shows the domain **Verified**, and the API key is in
Aayaan's password manager. Never commit it, never paste it into GitHub or
Slack or this repo.

## Step 3 — Custom SMTP on Supabase

Follow **Task 2b** of `docs/aayaan-ops-handoff.md`. Sender is
`contact@nextxi.pro`, sender name `NextXI`.

This is the step that unblocks the launch. Until it is done, Supabase's
built-in mailer sends every auth email, and it is rate-limited to a handful of
messages an hour and documented as not for production. **A group signing up
together will mostly receive nothing.** That is the single reason the platform
cannot be opened to real users yet.

**Done when:** Supabase shows custom SMTP enabled with no error banner.

## Step 4 — Push the NextXI email templates

Only after Step 3. Before Step 3 the API rejects the write, and the script now
warns you up front when it sees no SMTP host.

Merge **PR #45** first, then from a checkout, with a personal access token
from https://supabase.com/dashboard/account/tokens:

```sh
SUPABASE_ACCESS_TOKEN=sbp_… bun run auth:templates
```

It writes the subject and body of all three templates and reads both back.
Nothing about an auth email is decided in the dashboard any more.

**Done when:** the script reports all three pushed and verified.

## Step 5 — Prove the emails actually work

Use an inbox that is not already a NextXI user.

1. Sign up at `https://www.nextxi.pro/auth?mode=sign-up` (production, not a
   preview).
2. Open the email.

**Passes only if all of these hold:**

- From name is **NextXI**, from address is `contact@nextxi.pro`.
- The body is the NextXI template, not generic Supabase.
- The link host is `www.nextxi.pro` — not `cricket-platform-nine.vercel.app`,
  not localhost.
- Clicking it signs you in and lands on onboarding.
- **It also works when opened on a second device.** This is the one that
  catches a failed template push: the repo's template confirms by
  `token_hash`, which works anywhere; Supabase's default confirms by PKCE
  `code`, which only works in the browser that started the sign-up. If device
  one works and device two fails, Step 4 did not take.

There is **no 6-digit code** to look for. If any instruction you find says
otherwise, it is out of date.

Then repeat for password reset from `/auth/reset-password`: same host, lands
on set-password.

Delete the test user in Supabase → **Authentication → Users** when done.

## Step 6 — Remove the temporary disclaimer

The sign-up, verify and reset screens currently carry a note explaining that
the email comes from Supabase and may look unbranded. Once Step 5 passes, that
note is a lie and should go.

This is a code change: delete `SupabaseMailNote` from `components/auth.tsx`
and its three call sites. If you are not comfortable making it, hand this step
to Mukilan — do not leave the note up.

**Done when:** `bun run lint` and `bun run build` pass with the component gone.

## Step 7 — Deploy the report worker

Blocked on Step 0. Read `docs/worker-deployment.md` in full — it has the
measured performance numbers, the host comparison and the exact commands.

The short version: the platform half is already live and waiting. The worker
polls, so it needs no port and no public URL — just a container that stays up,
holding `PLATFORM_URL=https://www.nextxi.pro` and the
`REPORTS_INGEST_SECRET` already set in Vercel production. A Render Background
Worker at ~$7/mo is the recommendation. No GPU is needed at launch volumes.

Build and smoke-test the image locally before handing it to a host:

```sh
cd cricket-ai-model
docker build -f worker/Dockerfile -t nextxi-worker .
docker run --rm nextxi-worker python scripts/smoke_synthetic.py   # prints "smoke passed"
```

**Done when:** a real clip uploaded on production moves from "Preparing" to a
finished coaching report without reloading the page. Starting the worker also
drains every video uploaded so far — it claims oldest-first, so there is no
backfill script to run.

## Step 8 — Two small settings

**GitHub homepage** (needs repo **Admin**, which Mukilan does not have):
https://github.com/Aayaan-Sahu/NextXI/settings → General → Website →
`https://www.nextxi.pro`. It currently points at the old Vercel alias.

**Team notifications:** confirm `TEAM_NOTIFY_WEBHOOK_URL` is set in Vercel →
`cricket-platform` → Production. Without it, `notifyTeam` is a silent no-op
and nobody is told when a new player signs up or a video is ready. If it is
not set, say so — it is a Slack-compatible incoming webhook and takes a
minute.

**Skip `NEXT_PUBLIC_SITE_URL`.** Older instructions ask for it.
`lib/site-url.ts` now hardcodes the canonical origin in production, so setting
it changes nothing.

---

## The walkthrough that says you are done

On `https://www.nextxi.pro`, hard refresh, not a preview:

1. Create a player account. The email is NextXI-branded and arrives in
   seconds. The link opens the account on a second device.
2. Finish onboarding as an under-18. You land on a working dashboard — not a
   locked one — with a code to invite a parent.
3. Upload a clip. It is accepted under 50 MB and refused above it, at the file
   picker rather than at the end of the upload.
4. Within a few minutes the video page turns from "Preparing" into a real
   coaching report, without reloading.
5. Create a coach account. It can browse players immediately; nothing says
   "under review".
6. `/contact` shows `contact@nextxi.pro`, and a mail sent there reaches
   Aayaan.

If all six hold, people can start hopping on.

---

## Report back to Mukilan

Yes/no plus evidence — a timestamp, a screenshot, or the exact error text and
which account lacked access.

- [ ] Ultralytics licence decided and written into `MODEL-STATUS.md`
- [ ] `contact@nextxi.pro` received a mail from an outside address (timestamp)
- [ ] Resend domain: Verified
- [ ] Supabase custom SMTP: on, sender `contact@nextxi.pro`
- [ ] `bun run auth:templates` pushed and verified all three
- [ ] Signup email: NextXI-branded, link host `www.nextxi.pro`, works on a second device
- [ ] Reset email: same
- [ ] `SupabaseMailNote` deleted from `components/auth.tsx` and its three call sites
- [ ] Report worker running; a real upload produced a real report (video id)
- [ ] GitHub Website = `https://www.nextxi.pro`
- [ ] `TEAM_NOTIFY_WEBHOOK_URL` set in Vercel Production
- [ ] Site URL still `https://www.nextxi.pro` (unchanged)
