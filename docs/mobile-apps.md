# NextXI mobile apps — product & engineering spec

NextXI's only client today is the web app. The footage lives on the phone, so
the web flow forces a two-step "film in the camera app → find the file →
upload" round trip; the report only appears after a reload or a 10 s poll
(`components/report-auto-refresh.tsx`); and nothing notifies anyone of anything
— the sole outbound signal is `lib/notify.ts` posting to a Slack webhook. The
iOS and Android apps carry every product feature (player, coach, guardian;
admin stays web-only) and add what only a phone can do: film-and-upload in one
step, on-device framing guidance so the pipeline can actually measure the clip,
an honest quick-feedback loop, and push when the report lands.

This document is the durable spec for those apps: what they are screen by
screen, which features are mobile-only, and how they are built against the
existing backend. No mobile code exists yet (no Expo, Capacitor or React
Native anywhere in the repo). Mockups of every screen are on the design canvas
linked below; app code starts at Phase 0 once those are signed off. Every
number shown in the mockups is the staged demo data from
`components/landing/report-variants/report-data.ts`, never live analysis.

## Mockups & demo

Design canvas (20 phone frames, 390×844 iOS chrome; Android is identical inside
the frame): https://claude.ai/code/artifact/c25f1ee9-5243-4a8c-bb59-2bb57530c60c

Interactive demo (clickable Film → report flow): https://claude.ai/code/artifact/26451ca4-44c6-416e-a481-ac0a57aa6dd2

Hero flow — read left to right:

1. **Home, idle** — greeting, pulse line, `LatestReportCard`, "Film your next clip", clips grid. Replaces `app/dashboard/player/page.tsx`.
2. **Film setup sheet** — discipline · shot · hand · session, "Open camera". Replaces the three selects in `components/video-upload.tsx`.
3. **Camera, landscape, "Too close"** — body outline, state word + fix sentence, fps badge, Library/Flip words. New.
4. **Camera, recording** — timer 0:12, "Framed · In frame 94 %", ball counter "3 balls". New.
5. **Review, "Good clip"** — looping clip, coverage fact line, tag row, "Send for analysis". New (replaces the dropzone in `video-upload.tsx`).
6. **Home, analysing** — in-flight strip (Analysing / Sending 42 %), clip tiles with `ReportChip` states. Replaces `getPlayerVideoPulse.analysing` + `ReportAutoRefresh`.
7. **Lock-screen push** — "Report ready — Cover drive" and a coach message. New (no notification path exists on web).
8. **Report, top** — the home page's scoreboard on a phone: masthead and facts line, the 0–100 dial with the verdict and delta pill, "Your 3 scores", "Last 6 sessions". Port of `components/landing/report-variants/variant-scoreboard.tsx`; replaces `components/report-panel.tsx` + `measured-report.tsx`.
9. **Report, "Fix this one thing" + moments** — the fix, the drill flash, the coach stamp, then the clip with rate/frame-step words and "Shot 2 · 0:14" seeking the player. Replaces the inert timestamps in `batting-report.tsx`.
10. **Share report card** — the scoreboard card at 300 pt (dial, verdict, the three score bars, wordmark), share targets.

Parity set:

11. **Session detail** — consistency panel with `Meter`s, "Film into this session", clips. Replaces `app/dashboard/player/sessions/[sessionId]` + `SessionConsistencyPanel`.
12. **Progress** — season `Stat` tiles, runs-per-innings bars, a technique trend. Replaces `app/dashboard/progress` + `components/progress-charts.tsx` + `technique-trends.tsx`.
13. **Log a match, step 2 (Batting)** — runs, balls, dismissal chips, Skip/Next. Replaces the six-field grid in `components/stat-entry-form.tsx`.
14. **Messages thread** — speaker groups, day dividers, "Read 2:04 pm", composer. Replaces `components/messaging.tsx`.
15. **Connections, Pending** — tabs with badge, Accept/Ignore, outgoing with **Cancel**. Replaces `components/connections.tsx` (`PendingColumn`).
16. **Coach queue** — filter chips, "6 unviewed", one-column rows. Replaces `app/dashboard/coach/page.tsx` + `video-filter-bar.tsx`.
17. **Guardian, child** — child switcher, facts, "Allow report sharing", library. Replaces `app/dashboard/guardian/page.tsx`.
18. **Guardian code gate** — display-type code, QR, "Share with a parent". Replaces `GatePanel` + `components/guardian-handoff.tsx`.
19. **Review, "Won't measure well"** — coverage 44 %, retake copy, Retake / Send anyway. New.
20. **Onboarding, player form** — username live check, DOB wheel, height sentence, role chips. Replaces `components/onboarding.tsx` (player branch).

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Stack | Expo (React Native, TypeScript), expo-router, EAS Build, expo-dev-client | One TS/React developer. `components/measured-metric.tsx`, the taxonomy half of `lib/videos.ts`, `lib/guardian-code.ts`, `lib/usernames.ts`, `lib/report-errors.ts` have zero imports and share as-is. OTA updates for copy/UI. Native Swift+Kotlin doubles every screen; Flutter shares nothing. |
| Camera | `react-native-vision-camera` 4.x | The only option with fps-format selection (60/120/240), orientation lock independent of the UI, and frame processors. `expo-camera` has none of these. |
| On-device framing | Google ML Kit / MediaPipe Pose via a VisionCamera frame-processor plugin (`react-native-mediapipe` first; a ~150-line Swift + ~150-line Kotlin plugin if it doesn't fit) | Same keypoints the worker uses, Apache-licensed, no model download. The AGPL YOLO weights in `cricket-ai-model/` never ship in the binary. Runs at ~5 fps for guidance only — never for measurements. |
| Upload | `tus-js-client` 4.x against the existing Supabase resumable endpoint; MMKV-persisted queue; Wi-Fi-default policy | Same endpoint, headers and metadata as `components/video-upload.tsx`. Resume via the stored tus URL after an app kill. A native background uploader (NSURLSession / WorkManager) is a v1.1 evaluation, not v1. |
| Push | `expo-notifications` + Expo Push Service; `expo-server-sdk` in Next.js | One integration for APNs and FCM. |
| Data | `@supabase/supabase-js` for auth + realtime only; typed fetch client to new Next.js REST routes; `@tanstack/react-query` 5; zod 4 schemas shared with the server | Every `public` table is RLS deny-all and both buckets are private, so the app can never talk to PostgREST or Storage directly (see Backend work). |
| Styling | NativeWind 4 with a `tailwind.config.js` mirroring the `@theme` block in `app/globals.css`, plus a test asserting the seven colours and nine type roles match; `@expo-google-fonts/saira-condensed` + `public-sans` | One design system on web and phone. |
| Icons | Exactly ten 1.5 pt stroked glyphs — five player tabs (Home, Film, Sessions, Progress, Messages), Players and Account for the coach/guardian bars, back chevron, close, viewfinder — ink or cream, never filled or coloured. Everything else stays a word. | Tab bars need icons; the web rule ("no icon vocabulary") becomes a contained exception. No icon ever appears in a list row, a button or a report. |
| Repo | `nextxi/mobile/` with its own `package.json` + `bun.lock`, **no root workspace**; new pure-TS `nextxi/shared/` resolved by relative path | Same PRs, shared types, no Metro hoisting problems, no RN install on Vercel deploys. |
| Admin | Web-only | Coach approval and the report queue are ops surfaces. An admin who signs into the app sees "Admin tools live at www.nextxi.pro" and nothing else. |
| Honesty | On-device feedback is framing, coverage, duration, fps and ball count **only**. No live joint angles, no "instant score", no predicted report, no elite bands, no fabricated history. | The pipeline takes minutes. Faking earlier numbers breaks the product's one promise: only draw a number you measured. |
| Design target | One design; mockups in iOS chrome at 390×844, Android parity noted per frame | The Crease system is platform-agnostic; only the OS chrome differs. |

## Information architecture

### Player (ACTIVE) — five tabs

Home · **Film** (centre, a 56 pt peach circle — the only filled, peach shape in
the bar) · Sessions · Progress · Messages. Connections is not a tab: it lives
under Messages ("Connections" word, top right) and on Home's empty
coach-feedback state ("Find a coach").

```
Home        ← app/dashboard/player/page.tsx (greeting, pulse, LatestReportCard, clips grid, CoachFeedback)
  Clip → Report (own full screen)    ← components/video-detail.tsx + report-panel.tsx
  Account → Profile / Settings / Sign out
Film        ← new: Setup sheet → Camera (landscape) → Review → Sending; Import from library
Sessions    ← app/dashboard/player/sessions (list, New session sheet, Session detail: rename, consistency, clip picker)
Progress    ← app/dashboard/progress (season tiles, runs chart, technique trends, Log-a-match sheet, goals, reminders)
Messages    ← app/dashboard/messages (list, thread) + Connections (roster, pending, find a coach)
```

### Player (PENDING_GUARDIAN) — no tabs

One screen: the guardian-code gate (`app/dashboard/player/page.tsx:63-99` +
`components/guardian-handoff.tsx`) with a QR and a native share sheet. Sign out
in the header. Nothing else is reachable, as on web.

### Coach (APPROVED) — four tabs

```
Queue       ← app/dashboard/coach/page.tsx + video-filter-bar.tsx
  Review    ← app/dashboard/coach/videos/[videoId] (video + report + comment composer)
  Player    ← app/dashboard/coach/players/[playerId] (profile, sessions, clips, request-to-connect)
    Session ← app/dashboard/coach/sessions/[sessionId]
Players     ← app/dashboard/connections?tab=players + player-directory.tsx
Messages
Account     ← profile + settings
```

Coach PENDING / REJECTED: the `GatePanel` copy from `app/dashboard/coach/page.tsx:26-59`
and Sign out only. Connections and Messages are hidden, not shown-but-blocked
(the web shows them and refuses every action).

### Guardian — three tabs

```
Child       ← app/dashboard/guardian/page.tsx (switcher, profile facts, "Allow report sharing", library, connections)
  Clip → Report (read-only video-detail)
Messages    ← app/dashboard/guardian/messages (read-only threads, no composer)
Account     ← link another child, settings, sign out
```

### Off-tab

Auth (sign in, sign up with live username check, check email, reset via
universal link), Onboarding (role rows → role form), Profile, Settings
(notification switches, "Send on mobile data", default fps, guide replay,
language EN/HI later, legal, sign out).

### Feedback surfaces

No toasts. Three affordances replace the web's `?error=` / `?message=`
banners:

- an inline `Notice` (left rule, tinted ground) at the top of the affected section for anything the user must read;
- a bottom status strip — same `Notice` anatomy, pinned above the tab bar, dismisses after 4 s — for confirmations that need no reading ("Match logged.", "Request sent.");
- a `ConfirmDialog` sheet for **every** destructive action (the web has one; mobile gets them all).

Field errors sit under the field. The report is the only `Panel`; everything
else is spacing plus one `cream-400` hairline. `EmptyState` is a dashed box and
one sentence. Video clips are borderless 16:9 thumbnails, as on web.

## The Film flow

### Entry

The centre tab. Also: the Home hero shows "Film your next clip" as the primary
button whenever nothing is analysing, and every Session detail has "Film into
this session".

### Setup sheet (portrait, half-height)

Remembered from last time; the first run shows all pickers expanded.

- **Discipline** — segmented: Batting · Pace · Off spin · Leg spin.
- **Shot / Variation** — chip row from `VIDEO_DISCIPLINES[category].variations` (`lib/videos.ts`). Label reads "Shot" for batting.
- **Hand** — Right · Left, prefilled from `Player.battingHandedness` / `bowlingHandedness` when set.
- **Into** — "No session", the session name, or "New session…" (name + discipline lock, inline). Entering from a session skips this.
- Collapsed caption (Quiet Facts): "Cover drive · Right · Winter nets". One tap re-opens.
- Button: **Open camera**. First run only: "Watch the 20-second guide" above it.

### First-run guide (replaces the 37 s `public/recording-guide.mp4`)

Four full-bleed frames, 5 s each, skippable, re-openable from Settings and from
the "?" word on the camera.

1. **Sideways, always.** "Turn your phone landscape. The app locks it for you."
2. **Side-on, about eight metres.** "Stand the phone square to the crease, level, roughly eight big steps away. Whole body in frame, head to feet, with room for the bat."
3. **The whole action.** "Batting: every ball, bat in view the whole swing. Bowling: run-up to follow-through, then stop."
4. **Light and space.** "Face the light, not into it. One player in shot — nobody walking through."

Slow motion is not a rule. The pipeline has only ever been validated at 30 fps
(`docs/MODEL-STATUS.md` Q11); the app records at the highest fps the server
allows (`GET /api/capture-policy`, default 60) and shows the fps badge honestly.

### Camera (landscape-locked)

Full-bleed viewfinder. `pitch-950/70` strips top and bottom, cream text, Saira
Condensed for the state word, Public Sans for the sentence. Top-left: discipline
· shot · hand caption. Top-right: fps badge ("60 fps", micro chip) and a "?"
word. Bottom: "Library" word (import) · record button (cream ring, rust dot) ·
"Flip" word.

The overlay is driven by on-device pose evaluated every ~200 ms on a downscaled
frame. It draws only a faint body-outline rectangle (`cream-200/40`) where the
pose is detected — no skeleton, no numbers. One state at a time, in priority
order:

| Trigger | Headline | Sentence |
| --- | --- | --- |
| Portrait | **Sideways** | Turn your phone sideways. |
| No person for 2 s | **Nobody yet** | Step into frame, side-on to the camera. |
| ≥ 2 people of similar size | **Two people** | Only one player in frame — the others will confuse the measurement. |
| Ankles below frame | **Too close** | Step back — I can't see your feet. |
| Head above frame | **Too close** | Step back — I can't see your head. |
| Person < 35 % of frame height | **Too far** | Come closer — you're too small to measure. |
| Person off-centre > 25 % | **Off centre** | Move the phone so the player sits in the middle. |
| Mean luma below threshold | **Too dark** | Find more light — face it, don't stand in front of it. |
| Tilt > 6° (device gravity) | **Level it** | Straighten the phone. |
| All clear for 1 s | **Ready** | Hold there. Record, then play. |

**Recording HUD.** Timer top-centre ("0:12"). The state strip collapses to one
quiet line ("Framed") or flips to the fault in amber ("Feet out of frame")
without stopping the recording. A rolling `poseFrac` meter ("In frame · 94 %")
is the honest "will the pipeline see you" signal — it targets the batting pose
floor of 50 %. Batting sessions show a **ball counter** ("3 balls"),
incremented on-device when wrist speed spikes then settles; it labels the clip,
it never scores. Bowling shows a single "delivery" pill; a second spike shows
"Stop after the follow-through". Caps: batting 180 s, bowling 45 s (the worker
measures one delivery); a soft cue at 45 s ("Long clip — stop after this
ball"). The record button is never gated by a red state.

### Review (portrait)

The clip loops, muted, above a pre-flight verdict computed on-device from the
pose frames sampled during recording.

- Headline (Saira): **Good clip** / **Might not measure** / **Won't measure well** (the last in `rust-600`).
- Fact line (caption, `ink-600`): "Whole body visible in 94 % of frames · 14 s · 60 fps · 3 balls".
- Verdict sentences, only when not Good:
  - "Feet were out of frame for 5 seconds. Retake from further back, or send it anyway and the report will say how much it could see."
  - "Two people were in shot for most of the clip. The analysis follows the biggest one — retake if that wasn't you."
  - "Under 3 balls. Consistency needs three or more — add this to a session and film more."
- Editable tag row: "Cover drive · Right · Winter nets" → "Change".
- Actions: **Send for analysis** (peach) · Retake (secondary) · Discard (word, confirm dialog). For a poor clip the peach button is **Retake** and "Send anyway" is secondary.
- Never a technique score here — coverage percentages only.

### Sending

Tap Send and the sheet drops to Home immediately. The clip appears at the top
of "Your clips" with an amber progress hairline under the thumbnail and the chip
"Uploading · 42 %", then "Analysing" (the web `ReportChip` pulse). The queue
survives an app kill and resumes on launch. Cellular is off by default; each
queued row offers "Send now on mobile data".

### Import from library

Same setup sheet → system video picker → the pose pre-flight runs over ~2
frames/s of the file behind a determinate bar ("Checking the clip · 60 %") →
the identical Review, plus one extra fact line: "Recorded 12 Aug · 1080p · 30
fps".

## Quick feedback timeline

The pipeline is a pull queue (`cricket-ai-model/worker/worker.py` polls
`POST /api/reports/claim` every 15 s, analysis timeout 600 s, CPU-only). Nothing
in it is sub-minute. What is quick:

| When | Player sees | Source |
| --- | --- | --- |
| T+0 s (stop) | Pre-flight verdict: framing, coverage %, ball count, duration, fps | on-device pose |
| T+1 s (Send) | Home in-flight strip: "Sending · Cover drive · 42 %" | local queue |
| T+seconds (upload done) | Strip: "Analysing · Cover drive · sent 0:41 ago". Report screen shows *Preparing*: "Your coaching report is being prepared. Usually a few minutes. We'll notify you." | `complete-upload` |
| T+minutes | Push: "Report ready — Cover drive" / "Good session · 82 of 100 · ▲ 6 on last session" → deep-links to the Report | pipeline → push |
| Not measured | Push: "Couldn't measure that cover drive — the feet were out of frame most of the clip." Report renders "Not measured" with a **Film again** button that reopens Film with the same tags | `coverage.scored: false` |
| Retryable failure | Silent until final; the web's "we'll retry automatically" copy in the report | `lib/report-errors.ts` |

**In-flight strip** (Home, under the greeting, only while something is
uploading or analysing): `pitch-900` ground, one line per clip, max three then
"+2 more", tap → the clip. States: "Sending · 42 %" · "Waiting for Wi-Fi" ·
"Analysing · sent 3 min ago" · "Analysis taking longer than usual · we'll
notify you". The same content drives the iOS Live Activity / Android ongoing
notification (P1).

**Report Preparing state** is the web `ReportShell` verbatim (dark header
"Preparing", pulsing amber dot, indeterminate bar) plus the second line above.
No countdown, no fake percentage.

**Rejected:** live joint angles on the viewfinder; an "instant technique
score"; any pre-report number that isn't coverage, duration, fps or ball count;
a fabricated "last session" comparison on a first report (the
`lib/report-measurements.ts:380-385` wart — fixed before the mobile report
ships, so a first report reads "First time we've measured this — your progress
starts here.", a string the code already has).

## Report screen

Its own screen on a 390 pt width, pushed from the Clip screen or opened by the
push. Not a rail. It is the report the home page shows — the scoreboard
(`components/landing/report-variants/variant-scoreboard.tsx` with the `report`
strings in `components/landing/copy.ts`) — set as a full-screen `cream-50`
panel: the report is the only Panel, and on a phone the whole screen is it.

1. **Masthead** — `Kicker` "Coaching report", then the facts line in `text-ui`
   `ink-600`: "Cover drive · 12 balls · 60 fps · Winter nets · Aug 24".
2. **The number** — the 0–100 dial (112 pt; `amber-500` arc on a `cream-300`
   track, the score in Saira 44 pt, "OF 100" beneath) beside the verdict in
   display type ("Good session" — `verdictFor()`: ≥ 85 great, ≥ 70 good, ≥ 60
   solid, else keep building) and the change pill ("▲ 6 on last session" on
   `moss-600`, "▼ n" on `rust-600`, "About the same as last time" on cream
   within a point). Hairline beneath.
3. **Your 3 scores** — kicker, then one `TileRow` per score: name (body,
   semibold) · delta mark (▲ 4 in moss / ▼ 3 in rust, on the tinted 18 pt
   square) · the score (`text-figure`, moss at ≥ 70, rust below) · a 12 pt
   rounded bar filled to the score · the note with its verdict sentence bold
   ("Needs work. Bat came down 4.1 cm off straight on a typical ball.").
   Hairline between rows. No elite mark: the mock's tick at 95 was a
   placeholder, and the product draws none until the NextXI pro reference set
   exists (`docs/BENCHMARKS.md`).
4. **Last 6 sessions** — six bars with their scores, today's in amber,
   "6 weeks ago" / "today" beneath.
5. **Fix this one thing** — kicker, "Your bat swing" (`text-title` bold), the
   short sentence, then the drill as the info flash: `rust-500` left rule on
   `rust-50`, "**Your drill ·** …". Plain text on the panel, never a card in a
   card.
6. **Coach stamp** — the moss tick, "Signed off by {reviewedByName} ·
   {reviewerCredential}", the date, the `coachNote` quote in italic caption —
   from `Report.reviewStatus = approved` (web: `components/report-signoff.tsx`).
   Nothing for a `released` report. Until a report is `approved` or `released`
   the whole screen is the **With your coach** state: the clip, the coach
   name(s), "You'll see it here once it's signed off", no numbers, no moments.
7. **The clip** — 16:9 player with custom controls: play/pause, scrubber, "½×" /
   "¼×" rate words, "‹ frame" / "frame ›" step words (`currentTime += 1/fps`).
   Beneath it the **moments list**: "Shot 1 · 0:04", "Shot 2 · 0:14" (from
   `frames.swing_peak / video.fps`) or "Back foot · 0:02 / Front foot · 0:02.4 /
   Release · 0:02.6" (from `delivery.events.*`). Tapping seeks and pauses on
   that frame; a timestamp is amber only while it is the current moment.
8. **Feedback** — coach comments, read-only for players.
9. **Raw report data** — the `RawDetails` disclosure, then `ReportMeta`.

Top-right word: **Share**. Renders the same scoreboard card at 300 pt (masthead
with first name and initial, dial + verdict + pill, the three score bars
without their notes, wordmark) to a 1080×1350 image. Never the clip, never a
face crop. For a minor, Share is enabled only when the guardian's "Allow report
sharing" switch is on (`Player.allowReportSharing`, default off).

**Where the numbers come from.** `lib/report-scores.ts` (see "Scores" in
`docs/reports-contract.md`). The worker never sends a score; the platform
derives each tile from a judgement the worker already makes — its
`good` / `ok` / `needs work` thresholds — on a continuous curve, so a score
can never disagree with the ball-by-ball verdicts. Batting tiles are **Head
movement**, **Bat swing** and **Balance** (not the landing mock's "Front
elbow": the pipeline measures no elbow angle and has no defensible threshold
for one); bowling has one, **Front-knee brace**. The session number is the
mean of the tiles; the change pill and "Last 6 sessions" come from the same
occasion history as the measurement rows (`lib/report-history.ts`), and the
web report already renders all of it (`components/scoreboard.tsx`). The app
reads the same `DerivedReport.scores` through `GET /api/videos/{id}`.

`scored: false` reports render the web "Not measured" header and copy plus
**Film again**.

## Screen specs

- **Home** — greeting "Evening, Aryaman" (Europe/London clock, as `app/dashboard/player/page.tsx`) with the pulse line "3 clips · 2 reports ready · 4-week streak"; in-flight strip; `LatestReportCard` (dark, two derived stats, "View full report →"); "Film your next clip" when idle; "Your clips" 2-column grid — long-press → sheet (Open · Move to session · Delete → confirm "Delete this clip? Its report and feedback go with it."); coach-feedback digest (three rows, relative time, tap → clip). Empty clips: "No clips yet — film your first ball." Empty feedback: "No feedback yet. Connect with a coach so they can leave some." + "Find a coach".
- **Sessions** — rows: cover thumbnail, name (title), "Batting · 12 clips · 3 Aug". "New session" word → sheet (name, discipline segmented). Detail: name tap → rename sheet; consistency panel (≥ 3 analysed clips, `MIN_VIDEOS_FOR_SESSION_STATS`; below that "Two more analysed clips and your consistency appears here."); **Film into this session**; clips grid; "Add existing clips" → picker of standalone clips of the same discipline with "Add" words; remove via long-press; overflow "More" → Delete session, confirm "Clips stay in your library." (FK is `SET NULL`). Empty: "No sessions yet. A session is one net — film three or more balls and your consistency appears."
- **Progress** — 2×2 `Stat` tiles: Runs this season · Batting average · Wickets · Economy, "—" when unmeasured (`deriveSeason` rules in `components/progress-charts.tsx:73`). Runs-per-innings bars (last 8, dashed season-average line). Technique trends: one small line chart per metric, a point per session, `MIN_SESSIONS_FOR_TRENDS = 2`, else "Analyse two sessions and your trends start here." **Log a match** is a three-step sheet: Date & opponent → Batting (runs, balls, dismissal chips: Bowled / Caught / LBW / Run out / Stumped / Not out / Retired) → Bowling (overs with a `.1–.5` stepper, wickets, runs conceded) → Save; either step skippable; the server still requires batting or bowling. Match log rows "5 Jul · vs Surrey U15" / "18 (24) · 2–31 (4.3 ov)" with swipe-delete + confirm. Goals: rows with target/date, Mark complete/Reopen, swipe-delete; add sheet; no meter (a goal has no current value). Reminders: due date, a **local notification** toggle ("Remind me at 6 pm the day before"), a quiet `ink-600` "Overdue" caption. Stats link moves to Profile.
- **Connections** (player: under Messages; coach: the Players tab) — segments All / Coaches / Players / Pending (n). Roster rows: avatar, name, @handle, role chip → profile; overflow Revoke with the web `ConfirmDialog` copy. Pending: incoming rows with **Accept** (peach) / Ignore (secondary); outgoing rows with **Cancel** — new, needs a server action. "Find a coach" search (name / @handle) with the web's four button states (Request to connect · Requested · Connected · Request again). Coach Players tab adds role and country filter chips over `searchPlayers`.
- **Messages** — list: avatar, name, compressed time, "You: …" preview, amber unread pill, local fuzzy search (as `conversation-sidebar.tsx`). Thread: speaker groups (`GROUP_GAP_MS` 5 min), day dividers (`TIME_DIVIDER_GAP_MS` 15 min), receipt under your last own message ("Sending… / Sent / Read 14:02"), composer grows to four lines, 4000-char limit, optimistic send with draft restore on failure. Push when the thread isn't open; badge on the tab. Guardian threads: no composer, footer "Read-only — opening this never changes {firstName}'s unread count."
- **Profile** — avatar (Take photo / Choose from library / Remove → `removeAvatar`); Visibility `Switch` with the public-directory sentence; fields as `components/edit-profile.tsx`; DOB shown, not editable, with the safeguarding sentence; stats link; Set/Change password; "Delete account" at the bottom in `ink-600` → sheet requiring the typed word DELETE (`deleteAccount` re-checks it).
- **Settings** (new) — Notifications: Reports ready · Messages · Connection requests · Coach feedback (four switches). Uploads: "Send on mobile data" (off), "Keep original in Photos" (on). Camera: default fps (only values `capture-policy` allows), "Show framing coach". Guide: "Watch the 20-second guide again". Language: English / हिंदी (later; the product still reports in English). Legal: Terms, Privacy, Safeguarding. Sign out.
- **Coach — Queue** — filter chips (discipline, variation, hand, "Clear"), caption "6 unviewed · opening a clip marks it reviewed", one-column rows (thumbnail, player name, tags, age). Opening upserts `VideoView` when connected, as `app/dashboard/coach/videos/[videoId]/page.tsx`.
- **Coach — Review** — the clip with the same moments controls, the report, then the **Feedback** composer pinned at the bottom (2000 chars, "Post feedback", "Pin to 0:04"; `addVideoComment` rules). Above the report, for a connected coach on an unpublished report, the **Sign-off** panel from web (`components/review-actions.tsx`): approve with an optional note (≤ 500) after an inline confirm, or hold with a reason (≤ 500). Notes posted during review are held and released with the approval; the composer says so.
- **Coach — Player** — header facts, role chips, "Request to connect" + the lock notice when not connected (visibility gate: accepted connection OR `PUBLIC` + `ACTIVE`); sessions list; clips grid. Sessions read-only.
- **Guardian — Child** — segmented child switcher when ≥ 2 (`GuardianChildSwitcher`); facts list (club, country, DOB, height, weight); "Allow report sharing" switch + sentence; library grid → read-only clip + report; connections with dates; "Link another child" sheet (`linkChild`). Empty (no child): the `GatePanel` + code form.
- **Onboarding** — three role rows (player / coach / parent or guardian), one sentence each. Player form: name, username with live "@handle is free" in moss (`checkUsername`), native date wheel (ages 8–100), club, country picker (`COUNTRY_OPTIONS`), height required with "Reports are calibrated to your height.", weight optional, role chips. Under-18 → straight to the guardian gate. Coach: name, username, accomplishments (one per line). Guardian: name, username, child's code auto-formatted `ABCD-2345`, **Scan code** (QR from the player's gate), consent checkbox; deep link `nextxi.pro/g/ABCD2345` pre-fills the code.
- **Auth** — sign in (email, password, "Forgot?"); sign up (username live check, email, password, confirm, consent checkbox, the under-18 footnote); check email; reset: the recovery email's universal link opens "Set a new password" in the app. Errors inline under fields; server errors as a `Notice` above the button.
- **Guardian gate** — display-type code in the dark panel (`GatePanel code=`), QR beneath, three steps, **Share with a parent** (native share sheet with the `guardianMessage` text + deep link), "Copy code" word. Header: Sign out.

## Mobile-only features

**P0** — v1 cannot ship without:

1. In-app capture + auto-upload — one step; the reason the app exists.
2. On-device framing coach — the only way to stop `scored: false` reports before the upload.
3. Background-resumable upload with a persisted queue — 500 MB on a phone dies without it.
4. Push for report ready / new message / connection request — the web has no notification path at all.
5. Tap-to-seek moments + rate / frame-step review — every report timestamp is dead text on web.
6. Camera-roll import with the same pre-flight — most existing footage is already in Photos.
7. Delete confirmations everywhere + long-press / swipe actions — the hover-revealed delete (`components/video-grid.tsx:120`) is unusable on touch.

**P1**

8. Session ball counter — clips auto-tagged and filed while filming back-to-back.
9. Report card share image — WhatsApp/Instagram is how youth cricket spreads; guardian-gated for minors.
10. Guardian approve-by-link + QR — the code handoff is the biggest onboarding drop-off risk.
11. Local reminder notifications — reminders are inert on web.
12. Live Activity / ongoing notification for "Analysing" — minutes of waiting become a glance.
13. Cancel outgoing connection request.

**P2**

14. Offline read of the last 10 reports and clip thumbnails.
15. Coach quick-review swipe queue (right = reviewed, left = later, tap = open).
16. Hindi UI (the pipeline still reports in English).

**Rejected** — live technique overlays or scores on the viewfinder; a predicted
report before analysis; any elite comparison; slow-mo as a promised measurement
mode until the pipeline is validated above 30 fps.

## Copy

Voice: measured, floodlit, earned (PRODUCT.md). Every sentence tells the user
something they couldn't infer. Facts are captions in `ink-600` joined by " · ".
The fix comes right after the fault. No exclamation marks, no "awesome", no
emoji. A number only ever appears when it was measured.

1. Camera permission: "NextXI films your technique clips. Nothing records until you press the button."
2. Photos permission: "To import clips you've already filmed."
3. Notifications permission: "We'll tell you when a report is ready — usually a few minutes after you send a clip."
4. Pre-flight, good: "Good clip · Whole body visible in 94 % of frames · 14 s · 60 fps"
5. Pre-flight, poor: "Won't measure well · Feet out of frame for 6 s. Retake from further back, or send it and the report will say how much it could see."
6. In flight: "Analysing · Cover drive · sent 3 min ago"
7. Push, ready: "Report ready — Cover drive" · "Good session · 82 of 100 · ▲ 6 on last session"
8. Push, not measured: "Couldn't measure that cover drive — the feet were out of frame most of the clip."
9. Push, message: "Ravi Kapoor: Your front elbow held all session — nice."
10. Empty, sessions: "No sessions yet. A session is one net — film three or more balls and your consistency appears."

## Backend work

All of this lives in `nextxi/`. Two facts dictate the shape: every `public`
table is RLS deny-all with zero policies
(`prisma/migrations/20260818000000_rls_lockdown_and_private_functions/`), and
both storage buckets are private with no `storage.objects` policies. A native
client can use Supabase for auth and realtime broadcast only; every read and
write goes through Next.js. Today the app has 5 API routes and ~39 Server
Actions, which a native client cannot call.

### Bearer auth — one change unlocks the existing routes

`supabase.auth.getClaims(jwt?)` accepts an explicit token. In `lib/auth.ts`:

```ts
export const getCurrentUser = cache(async () => {
  const bearer = (await headers()).get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims(bearer); // undefined → cookie session
  if (error || !data) return null;
  return { id: data.claims.sub, email: data.claims.email };
});
```

Same JWKS verification, no `/auth/v1/user` round-trip. `getApiPlayer()` in
`app/api/videos/utils.ts` inherits it unchanged, so `initiate-upload`,
`complete-upload` and the avatar route become mobile-ready. `proxy.ts` needs no
change: a bearer request carries no cookies, so its `getClaims()` is a no-op.

### `lib/api.ts`

`class ApiError(status, message)` and
`apiHandler({ body?: ZodSchema, query?: ZodSchema, auth: "user" | "player" | "coach" | "guardian" | "admin" }, fn)`:
parses with zod (installed, unused today), resolves `getProfile(user.id)` and
applies the same status gates the Server Actions use (`requireActiveAccount`,
`requirePlayerId`, coach `APPROVED`), and turns `ApiError` / zod errors into
`jsonError(message, status)`. Errors stay `{ error }`. Move each Server
Action's body into a `lib/*.ts` function that both the action and the route
call — one implementation of every rule.

### Routes

| Method · path | Auth | Wraps | Notes |
| --- | --- | --- | --- |
| **Phase 0** | | | |
| `GET /api/me` | bearer | `getProfile`, `isAdmin`, `getOnboardingStatus` | + `onboardingRequired`, `limits { canUpload, canMessage, canConnect }` |
| `POST /api/auth/signup` | none (rate-limited) | `signUp` body → `lib/signup.ts` | No admin `email_confirm`. If Supabase withholds the session, return `{ checkEmail: true }` (no tokens) so the app shows verify-email. If a session is issued, return `{ access_token, refresh_token }` for `setSession`. |
| `GET /api/usernames/{handle}` | none (rate-limited) | `checkUsername` | `"invalid" \| "taken" \| "free"` |
| `POST /api/onboarding` | bearer | `completeOnboarding` | incl. guardian-code claim + `notifyTeam` |
| `POST /api/media/sign` | bearer | `createSignedUrls` (admin client) | `{ paths }` → `{ urls: { path: { url, expiresAt } } }`, 1 h; app re-signs at < 5 min or on 403 |
| `PUT /api/devices` · `DELETE /api/devices/{token}` | bearer | new `lib/devices.ts` | upsert on every launch; delete on sign-out |
| `GET /api/videos?session=&cursor=` | player | `getReadyVideoGridItems` + `getThumbnailUrlByPath` | adds a cursor |
| `GET /api/videos/{id}` | user (owner / connected coach / guardian) | `video-detail` query, `effectiveReportStatus`, `getDerivedMeasurements`, `deriveFocus` | `report.moments[{label, t}]` computed server-side from `shots[].frames.swing_peak / video.fps`, `delivery.events.*`, v1 `annotations` |
| `DELETE /api/videos/{id}` | player | `deleteVideo` | |
| `POST /api/videos/initiate-upload` | player | existing | gains `capture { fps, width, height, durationSec, source, poseFrac }` |
| `GET /api/capture-policy` | bearer | new | `{ fps: [30, 60], maxDurationSec: { batting: 180, bowling: 45 } }` |
| **Phase 2** | | | |
| `GET/POST /api/sessions` · `GET/PATCH/DELETE /api/sessions/{id}` · `POST /api/sessions/{id}/videos` · `DELETE /api/sessions/{id}/videos/{videoId}` | player | `lib/sessions.server.ts` + the five session actions | exact-category lock kept |
| `GET /api/progress` · `POST/DELETE …/entries` · `…/goals` (+ `PATCH` toggle) · `…/reminders` · `PUT/DELETE …/stats-link` | player | `getProgressData`, `getTechniqueTrends`, the ten progress actions | |
| `GET /api/connections` · `POST /api/connections` · `POST /api/connections/{id}/respond` · `DELETE /api/connections/{id}` (revoke) · `DELETE /api/connections/{id}/request` (cancel outgoing — new) | user | `lib/connections.ts` + `app/dashboard/connections/actions.ts` | cancel = delete a `PENDING` row you requested |
| `GET /api/directory/coaches?q=` · `GET /api/directory/players?role=&country=` | player / coach | `getCoachDirectory`, `searchPlayers` | |
| `GET /api/messages` · `GET /api/messages/{connectionId}?before=&limit=50` · `POST /api/messages/{connectionId}` · `POST /api/messages/{connectionId}/read` | user | `getConversations`, `getThread` (+ new `{ before, limit }`, `lib/messages.ts:131`), `sendMessage`, `markConversationRead` | `sendMessage` already returns `{ ok, message }` |
| `GET/PATCH /api/profile` · `DELETE /api/profile/avatar` · `POST /api/account/password` · `POST /api/account/delete` | user | `updateProfile`, `removeAvatar`, `setAccountPassword`, `deleteAccount` | delete requires `confirm: "DELETE"` |
| **Phase 3** | | | |
| `GET /api/coach/queue?category=&variation=&handedness=` · `GET /api/coach/approvals` · `GET /api/coach/players/{id}` · `GET /api/coach/videos/{id}` · `GET /api/coach/sessions/{id}` · `POST /api/videos/{id}/comments` · `POST /api/videos/{id}/review` (`{ action: "approve", note? } \| { action: "hold", reason }`) | coach APPROVED | coach page queries, `getAwaitingReviewForCoach`, `addVideoComment`, `approveReport` / `holdReport` | `coach/videos/{id}` upserts `VideoView` when connected — same side effect as the page. Review actions share `publishReport` with web (`lib/report-review.server.ts`), so a report publishes the same way from either client |
| `GET /api/guardian/children` · `POST /api/guardian/children` · `GET /api/guardian/children/{id}/{videos,connections,messages}` · `GET …/messages/{connectionId}` · `PATCH /api/guardian/children/{id}` (`allowReportSharing`) | guardian | `lib/guardian.ts`, `linkChild` | |
| **Phase 4** | | | |
| `POST /api/report-content` · `POST/DELETE /api/blocks/{userId}` | user | new | Store UGC rules; nothing exists on web today |

### Schema

Every `prisma/schema.prisma` edit ships as a committed migration in the same
commit as the code that needs it (AGENTS.md — a schema edit without a migration
has already caused a production outage).

- `DeviceToken { id, userId, platform ios | android, token @unique, appVersion, lastSeenAt, createdAt }`.
- `PlayerVideo`: nullable `fps Decimal(6,2)`, `durationSec Int`, `width Int`, `height Int`, `captureSource`, `preflightPoseFrac Decimal(4,3)`. `initiate-upload` validates `durationSec ≤ 300` and `fps` 24–240.
- `Player.allowReportSharing Boolean @default(false)`.
- Phase 4: `blocked_users` table + a content-report table.

### Push

- `lib/push.ts` on `expo-server-sdk`: `sendToUser(userId, { title, body, data: { url } })`, chunked, receipts checked asynchronously, tokens pruned on `DeviceNotRegistered`. Fire-and-forget like `notifyTeam`.
- Triggers → deep links: report **published** (approved by a coach, or released — `publishReport` in `lib/report-review.server.ts`, not the worker's `ready` write, which the player can't see yet) → `nextxi://video/{id}`; report awaiting review → the connected coach(es), `nextxi://coach/videos/{id}`; `sendMessage` → `nextxi://messages/{connectionId}` (skipped when the recipient has that thread open); connection request / accept → `nextxi://connections?tab=pending`; `approveCoach` → `nextxi://coach`; `linkChild` / guardian onboarding → `nextxi://home`.
- Universal links: `public/.well-known/apple-app-site-association` (paths `/auth/confirm`, `/dashboard/*`, `/g/*`) and `public/.well-known/assetlinks.json`, plus a `headers()` rule in `next.config.ts` for the AASA content-type. Expo: `scheme: "nextxi"`, `ios.associatedDomains: ["applinks:www.nextxi.pro"]`, Android `intentFilters` with `autoVerify`.
- Supabase → Authentication → URL Configuration: add `nextxi://**` to Redirect URLs (the same panel `docs/aayaan-ops-handoff.md` describes).

### Capture policy and the pipeline

- `GET /api/capture-policy` decides the allowed fps and duration caps; default 60 fps in a real-time container. The 120 fps toggle ships disabled.
- `POST /api/reports/claim` `meta` gains `fps` and `durationSec`; the worker asserts `cv2.CAP_PROP_FPS` agrees, since every timing it emits is `frame / fps`.
- Validate the worker on a 60 fps golden clip before enabling 120 fps (it has only ever run at 30 — `docs/MODEL-STATUS.md` Q11).
- Pick a host for the worker (the repo has only a Dockerfile) and set `POLL_INTERVAL_SEC=5`; this is the single biggest lever on report latency.

### Fixes before the app renders a report

- `lib/report-measurements.ts:380-385` fabricates a previous value at `value * 0.94` (and `sessionReference([])` a "Last 2 sessions" band) when a player has no history. Return `previous: null` and use the existing "First time we've measured this — your progress starts here." copy.
- `components/video-grid.tsx:120` reveals Delete only on hover, so mobile-web users cannot delete a clip from the grid.
- **Scores.** Done on the web: `lib/report-scores.ts` derives `score`, `previousScore`, `verdict`, `tiles[{key, name, score, band, delta, note}]` and `history[6]` (`DerivedReport.scores`), and `GET /api/videos/{id}` returns that object verbatim so the home page and the app never disagree. The worker now emits `balance.worst_base_offset_norm` and `swing.swing_deviation_cm` (cricket-ai-model); reports stored before that score balance from the label band. Open: the thresholds' provenance (`MODEL-STATUS.md` Q7) — the demo cover drive scores 45 because a drive's forward head travel breaks the 0.15-stance-width "good" limit.

### Rate limiting

None exists. Add Vercel Firewall rate-limit rules (no code) on
`POST /api/auth/signup`, `GET /api/usernames/*`, `POST /api/videos/initiate-upload`,
`PUT /api/devices`, `POST /api/messages/*` before the first TestFlight build.
Per-user `@upstash/ratelimit` only if abuse appears.

### `shared/` extraction

New `nextxi/shared/` — pure TypeScript, no React, no `@/app/generated`, no
Node APIs. Each file moves with a one-line re-export left at its old path:

| Moves to | From |
| --- | --- |
| `shared/measured-metric.ts` | `components/measured-metric.tsx` (types, `referenceBand`, `bandStatus`, `isOffReference`, `MEASUREMENTS_EXPLAINER`) |
| `shared/video-taxonomy.ts` | the pure half of `lib/videos.ts` (`VIDEO_DISCIPLINES`, `ALLOWED_VIDEO_TYPES`, size/chunk constants, path builders); `lib/videos.ts` keeps `getSupabaseTusEndpoint` |
| `shared/report-errors.ts` | `lib/report-errors.ts` |
| `shared/guardian-code.ts` | `lib/guardian-code.ts` |
| `shared/usernames.ts` | `lib/usernames.ts` |
| `shared/api/*.ts` | new — zod request/response schemas for every route above; the server validates with them, the app `parse`s with them |

`lib/report-measurements.ts` and `lib/session-consistency.ts` stay server-side
(they import Prisma enums); the app receives derived rows and never derives.

Next.js must ignore the app: `tsconfig.json` `exclude: ["node_modules", "mobile"]`
(its `include` is `**/*.ts(x)`), `eslint.config.mjs` `globalIgnores([..., "mobile/**"])`,
a new `.vercelignore` containing `mobile/`. The app resolves the shared code via
`tsconfig` path `@shared/* → ../shared/*` and `metro.config.js`
`watchFolders: [../shared]`, `resolver.nodeModulesPaths: [mobile/node_modules]`,
`disableHierarchicalLookup: true`. Pin zod to the same major in both
`package.json`s.

## Capture → upload pipeline on device

1. **Record** — UI locked landscape via `expo-screen-orientation`; VisionCamera format 1920×1080 at 60 fps, `videoCodec="h264"`, ~10 Mbps, `audio={false}` (no microphone permission; the pipeline ignores audio), stabilisation off (it crops and warps geometry). VisionCamera writes the real-time fps into the container — never an iOS "slo-mo as slowed" 30 fps file. Caps: batting 180 s, bowling 45 s.
2. **Live pre-flight** — pose plugin at `runAtTargetFps(5)`: person present; largest person only (warn on ≥ 2 similar-size bodies — the worker takes the largest); full body = nose + both ankles at confidence ≥ 0.5; body height 35–70 % of frame height (the distance proxy for "square-on, ~8 m" — tune on real clips); horizontal centre within the middle 60 %; landscape; mean luma of a downscaled frame within a sane band. Rolling `poseFrac` is shown as the amber meter.
3. **Post-record check** — duration bounds and the recording's `poseFrac`; below 50 % → the "Won't measure well" review with Retake as the primary action.
4. **Thumbnail** — `expo-video-thumbnails` at `min(1 s, duration / 2)`, 640 px, JPEG 0.8 (matches `captureThumbnail` in `components/video-upload.tsx`).
5. **Enqueue** — MMKV row `{ localUri, thumbUri, tags: { category, variation, handedness }, sessionId, capture: { fps, width, height, durationSec, source, poseFrac }, videoId?, tusUrl?, state }`. Survives an app kill.
6. **Upload** — `POST /api/videos/initiate-upload` (with `capture`) → tus (`chunkSize` from the server, 6 MB; `retryDelays [0, 3000, 5000, 10000, 20000]`; headers `apikey` + `x-signature`; metadata `{ bucketName, objectName, contentType, cacheControl }`; the tus upload URL stored in the row and resumed via `uploadUrl` on relaunch) → thumbnail `PUT` to the signed URL → `POST /api/videos/complete-upload`. `expo-keep-awake` while the upload screen is open. `expo-network`: Wi-Fi by default, a per-upload "Send now on mobile data" override; the queue resumes on foreground. Background continuation is best-effort (iOS ≈ 30 s); v1.1 evaluates a native uploader if telemetry shows kills mid-upload.
7. **Report** — push on READY; the clip screen also polls `GET /api/videos/{id}` every 10 s while foregrounded (mirrors `ReportAutoRefresh`).

Server side: the `PlayerVideo` capture columns above, the `initiate-upload`
validation, `fps` / `durationSec` in the claim `meta`. `Player.heightCm` is
already required at onboarding and stays required in `POST /api/onboarding`.

## Build phases

Estimates are for one developer, after the mockups are signed off.

| Phase | Scope | Weeks (est.) |
| --- | --- | --- |
| 0 | Bearer auth, `lib/api.ts`, `shared/` extraction, `/api/me`, signup, onboarding, usernames, media sign, videos read/delete, capture columns, `DeviceToken` + push sender, AASA/assetlinks, Expo skeleton (router, NativeWind tokens, fonts, auth screens, EAS dev build) | 3 |
| 1 | Camera + pre-flight overlay, upload queue, Clip + Report screen with seek-to-moment, Home, push on READY → TestFlight / internal track | 4–5 |
| 2 | Sessions, Progress (log-match sheet, charts), Connections, Messages + realtime, Profile/avatar, Sign in with Apple + Google (`signInWithIdToken`; Apple rule 4.8 only applies once a third-party login exists) | 3–4 |
| 3 | Coach (queue, player, review + comment, sessions) and Guardian (children, read-only everything, sharing switch) | 2–3 |
| 4 | UGC report/block, accessibility + reduced motion, empty/error states, store listings, review cycles | 2–3 |

Critical path: bearer auth → `/api/me` + onboarding → `/api/videos/{id}` with
derived rows + moments → camera → upload queue → push. Everything else
parallelises around it.

Realtime ports as-is: `useMessagesRealtime(connectionIds)` calls
`supabase.realtime.setAuth(access_token)` after every refresh, subscribes one
`channel("connection:" + id, { config: { private: true } })` per accepted
connection for `INSERT` / `UPDATE` broadcasts, writes into the React Query
cache, and refetches `GET /api/messages` on foreground.

Store submission checklist specific to this app:

- Permission strings: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (import); no microphone (`audio={false}`). Android `CAMERA`, `READ_MEDIA_VIDEO`, `POST_NOTIFICATIONS`.
- UGC (Apple 1.2, Play UGC policy): videos, comments and messages are user content → report-content, block-user and a moderation contact must exist. None do on web today (Phase 4 endpoints).
- Under-13s in the audience (COPPA, UK Children's Code): the guardian-code claim is the parental-consent mechanism and already gates everything through `PENDING_GUARDIAN`. Do not opt into Apple's Kids Category; rate honestly. Play "Target audience" must include children → no ads or analytics SDKs, no precise location.
- Play Data Safety declares videos/photos, name, DOB, messages, email. Apple privacy labels: Contact Info, User Content (Photos/Videos, Messages), Identifiers, Usage Data if any analytics.
- In-app account deletion (Apple 5.1.1(v)) — `POST /api/account/delete` over the existing `deleteAccount` transaction.

## Risks

1. **AGPL YOLO weights** — never in the binary; on-device guidance uses ML Kit / MediaPipe. The server-side Ultralytics licence still needs a decision before launch (`docs/MODEL-STATUS.md` Q13); it blocks nothing in the app.
2. **30 fps-only pipeline vs high-fps capture** — record 60 fps real-time containers, send `fps` in the claim `meta`, have the worker assert it, validate on a golden clip before enabling 120.
3. **Minutes-long analysis vs an "instant" expectation** — instant means on-device framing plus the post-record `poseFrac` verdict; the report arrives by push; copy says "usually a few minutes", never "instant".
4. **1 h signed URLs** — batch `POST /api/media/sign`, a client cache keyed by path with `expiresAt`, re-sign on 403.
5. **No pagination** — `?before=&limit=` on messages and `cursor` on videos in Phase 0; the app never requests an unbounded list.
6. **No rate limiting** — Vercel Firewall rules on the five write/unauthenticated routes before the first TestFlight build.
7. **`deriveMeasurements` fake history** — fixed in Phase 0; otherwise a new player's first report on mobile opens with an invented "last session".
8. **Worker deployment unspecified** — choose a host (Fly / Railway / a plain VM), set `POLL_INTERVAL_SEC=5`; without it the queue's latency floor is 15 s before analysis even starts.

## Open questions

- Where does the worker run, and does it get a GPU? (Decides report latency more than anything in the app.)
- Which real clip becomes the 60 fps / 120 fps validation clip for the worker?
- Ultralytics: commercial licence or a replacement detector before launch?
- Sign in with Apple + Google in Phase 2 as planned, or v1 (they are the fastest onboarding for a 13-year-old, but email/password ships without App Store rule 4.8 exposure)?
- Hindi UI: wait for the pipeline to report in Hindi, or ship the interface first?
- Guardian "Allow report sharing": default off for every minor (as specced), or off only under 16?
- The scoring thresholds: the mapping is decided (`lib/report-scores.ts`), but the worker's `good` / `ok` limits were hand-picked with no coach sign-off, and on a front-foot drive the head-movement limit reads every drive as "needs work". Who calibrates them, on what clips, before the first real player sees a 45?
