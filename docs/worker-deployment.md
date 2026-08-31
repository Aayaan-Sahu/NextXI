# Getting coaching reports to actually arrive

Uploads work. Reports do not, and they fail silently: every finished upload
reserves a `Report` row, the player's video page says "Your coaching report is
being prepared", and it says that forever. Nothing is analysing anything.

This is not a missing feature. It is a container nobody has started.

## What is already true

Checked against production, not assumed:

- **The platform side is live.** `POST https://www.nextxi.pro/api/reports/claim`
  answers `401 Invalid or missing bearer token` — not `503 Report ingestion is
  not configured`. `REPORTS_INGEST_SECRET` is set in Vercel production and the
  claim endpoint is waiting to hand out work.
- **The worker exists and is packaged.** `cricket-ai-model/worker/worker.py`
  plus `worker/Dockerfile`, which bakes in the three `.pt` weight files
  (18 MB total). It implements both halves of `docs/reports-contract.md`.
- **It needs no inbound network.** The worker polls; the platform never calls
  it. No port, no public URL, no webhook, no health-check endpoint.
- **It needs exactly two secrets:** `PLATFORM_URL` and
  `REPORTS_INGEST_SECRET` (the same value already in Vercel production).
- **Retries are the platform's job.** A claim held longer than 15 minutes is
  re-issued; the third failed attempt is dead-lettered. Killing the worker at
  any moment is safe.

So the gap between here and working reports is: run one container, with two
environment variables, somewhere that stays up.

## Does it need a GPU? No.

The open question in `docs/mobile-apps.md` ("does it get a GPU?") has an answer.
Measured on this machine's CPU, running the real weights through the exact
`cricket_analysis.run_one` path the worker uses, at 720p:

| Clip length (30 fps) | Analysis time |
| --- | --- |
| 10 s | ~23 s |
| 30 s | ~66 s |
| 60 s | ~131 s |

That is ~72 ms/frame — about 14 fps — plus ~1.4 s of fixed model loading. One
analyzer runs per video (`--category` picks batting or bowling), so these are
per-video numbers, not per-video-doubled.

Two things make this comfortable at launch:

1. A cloud vCPU is slower than this laptop — budget 2–4×. A 30 s clip lands
   around 2–4 minutes, inside both `ANALYSIS_TIMEOUT_SEC` (600) and the
   15-minute stale-claim window.
2. The 50 MB upload cap bounds clip length to roughly 20–45 seconds at phone
   bitrates. The ceiling that exists for storage reasons also caps the worst
   case here.

Revisit the GPU question when either the cap rises or the queue backs up. Not
before — a GPU host costs an order of magnitude more and buys nothing at
launch volumes.

## The decision that actually blocks this

**Ultralytics is AGPL-3.0.** The worker imports it server-side to serve a
commercial platform. `docs/mobile-apps.md` lists this as needing a decision
before launch and points at `docs/MODEL-STATUS.md` Q13 in the model repo —
**that file does not exist**, so the decision has no written home and, as far
as this repo can tell, has never been made.

The options are the usual three: buy an Ultralytics commercial licence,
replace the detector with a permissively licensed one, or accept AGPL and
publish the source. Someone has to pick one. Deploying the worker is what
turns this from theoretical into shipped, so pick before, not after.

Everything below assumes that decision is made.

## Where to run it

It is a always-on, no-port, Docker-packaged background process. That is a
specific product category and several hosts sell it directly.

**Recommended: Render Background Worker.** It is exactly this shape — no port
expected, no health check to satisfy, restart-on-crash included. Point it at
the `cricket-ai-model` repo with `worker/Dockerfile` and a root build context,
set the two variables, done. ~$7/mo at the starter size.

**Railway** is equally fine and is faster if there is already an account —
same flow, detects the Dockerfile, no port needed.

**Fly.io** works but wants a little more care: omit the `[[services]]` block
entirely so it does not wait for a port that never opens, and pin
`min_machines_running = 1` so it does not scale to zero.

**Not Vercel.** Analysis runs for minutes and the torch/opencv image is far
past what a function allows. The worker is the one piece of this system that
does not belong on Vercel.

Whichever host: put it in the region closest to the Supabase project, since
every job downloads a video through a signed URL before it can start.

## Steps

1. **Settle the Ultralytics licence.** Write the answer into
   `cricket-ai-model/docs/MODEL-STATUS.md` so the next person finds it.
2. **Read `REPORTS_INGEST_SECRET`** out of Vercel → project `cricket-platform`
   → Settings → Environment Variables → Production. Do not mint a new one; the
   worker and the platform must share the value that is already live.
3. **Build the image once locally** and run the packaged smoke test, so a
   broken image is caught before the host does:
   ```sh
   cd cricket-ai-model
   docker build -f worker/Dockerfile -t nextxi-worker .
   docker run --rm nextxi-worker python scripts/smoke_synthetic.py
   ```
   It should print `smoke passed` — that exercises model loading, both
   extraction loops, the coverage gate and JSON serialization.
4. **Create the service** on the chosen host from the same Dockerfile, with:

   | Variable | Value |
   | --- | --- |
   | `PLATFORM_URL` | `https://www.nextxi.pro` |
   | `REPORTS_INGEST_SECRET` | the value from step 2 |
   | `POLL_INTERVAL_SEC` | `15` (the default; lower only if latency complaints start) |

   Size it at 2 vCPU / 4 GB to begin with. Keep it at **one** instance —
   claims are atomic so more is safe, but nothing needs more yet.
5. **Watch the first poll.** The logs open with
   `worker starting platform=… poll=15s timeout=600s model=…`. A `204` means
   the queue is empty; a `401` means the secret does not match what Vercel
   holds.
6. **Let it drain the backlog.** Every video uploaded since launch has a
   `pending` report and the endpoint hands out the oldest first. No backfill
   script — starting the worker is the backfill.
7. **Upload one real clip on production** and watch the video page go from
   "Preparing" to a report without a reload. That is the actual acceptance
   test; the synthetic smoke only proves the image runs.

## Two gaps to close while you are in here

**Nothing notices when the worker dies.** If it crashes or the host suspends
it, uploads keep succeeding and every one of them says "being prepared"
indefinitely. The platform already has `notifyTeam` (`lib/notify.ts`) and it
is a no-op unless `TEAM_NOTIFY_WEBHOOK_URL` is set in Vercel production —
worth confirming it is set, and worth a cron that shouts when the oldest
pending report is older than, say, an hour.

**A `pending` report has no floor.** The claim endpoint's housekeeping —
dead-lettering exhausted attempts, failing untagged videos — only runs *when a
worker calls it*. With no worker there is no housekeeping at all, and
`attempts` never increments, so nothing ages out. A report that has sat
`pending` for hours with no worker in sight should eventually say something
truthful to the player rather than "being prepared" in perpetuity. That is a
platform-side change, independent of where the worker runs.
