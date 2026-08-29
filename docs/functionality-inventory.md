# Cricket Platform — Complete Functionality Inventory

This document catalogs **every piece of functionality** in the app, organized by view. It describes structure, controls, states, and behavior — not current styling — so it can be used as the input to a design pass.

---

## 0. Global Structure & Cross-Cutting Patterns

### Roles
Five roles: **Player**, **Coach**, **Guardian**, **Club**, **Admin** (admin is not an onboarded role: an email in `ADMIN_EMAILS`, or `app_metadata.admin` on the account — see `lib/admins.ts`). Coaches and clubs are both admin-verified before they can reach anyone. Every dashboard page is server-guarded:

- Unauthenticated → `/auth`
- Admin → `/dashboard/admin` (admins never see the normal dashboard)
- Authenticated but no role yet → `/onboarding`
- Has a role → `/dashboard/{role}`; visiting another role's page redirects to your own

### Dashboard shell (every signed-in view)
A top navigation bar with:

- **Brand link** "Cricket Platform" → role home
- **Nav tabs**: Home · Progress (player-only) · Connections · Messages. Active tab = current path prefix, visually emphasized. Badges: Messages carries the unread count; an approved coach's Home carries the number of reports awaiting their sign-off.
- **Limited mode** (guardians, and players stuck in `PENDING_GUARDIAN` status): only "Home" is shown; "Edit profile" is hidden too.
- **Avatar button** (right): circle with the user's first initial. Opens a dropdown menu (`aria-haspopup="menu"`) containing **Edit profile** (hidden in limited mode) and **Sign out**. An invisible full-screen backdrop closes it on outside click.

**Route-level loading**: a centered spinner (`role="status"`, aria-label "Loading") during navigation on dashboard routes.

### Feedback pattern (important for design)
Almost every form is a server action that redirects back with `?error=` / `?message=` query params, rendered as one **error banner** and/or one **info banner** at the top of the page. Consequences the design should address:

- **No inline field-level server errors** — everything is a top-of-page banner after a full page reload.
- **No pending/disabled/spinner states on buttons** during submission (the only exception is the message composer, which is optimistic).
- **No confirmation dialogs on any Delete** (videos, stat entries, goals, reminders) — the only confirmation modal in the app is "Revoke connection".
- **No toasts** anywhere.

Client-side, HTML-native validation (`required`, `pattern`, `min`/`max`, email type) fires before submit.

---

## 1. Authentication View

All auth screens share a centered single card: title, optional description, form, notices below the form, and an optional footer separated by a divider. Behind the card on `/auth` is a decorative animated pixel-art cricket field (aria-hidden, non-interactive, respects `prefers-reduced-motion`).

### 1.1 Landing (`/`)
Pure router — no UI. Redirects: signed-out → `/auth`; admin → `/dashboard/admin`; has role → `/dashboard`; no role → `/onboarding`.

### 1.1b Tutorials (`/tutorials`)
Public reading page in the landing register (`InfoPage`, same shell as `/safeguarding`), linked from the landing footer. One section per film: heading, "For {audience} · {length}", a poster taken from the film itself, and a sentence of prose. Playing opens the shared `VideoModal` (backdrop, Escape or **Close**, autoplay, muted — the films carry no audio track and are captioned). Films are recordings of the real product; see `docs/tutorials.md`.

### 1.2 Auth panel (`/auth`) — Sign in / Sign up
One screen, two modes toggled by a **footer link** (URL param `?mode=sign-up`), not tabs. Already-signed-in users are bounced away.

**Sign in mode**
- Title: "Sign in to your account"
- Fields: **Email** (email type, required, autocomplete) · **Password** (required, minLength 6, `current-password`)
- Inline "**Forgot your password?**" link next to the Password label → `/auth/reset-password`
- Button: "Sign in"
- Footer: "New to Cricket Platform? **Create account**"
- Errors: "Enter your email and password." · raw Supabase error · "Sign in failed."
- Success: admin → admin dashboard; else role → `/dashboard`, no role → `/onboarding`

**Sign up mode**
- Title: "Create your account"
- Same fields (`new-password` autocomplete); no forgot-password link
- Button: "Create account"
- Footer: "Already have an account? **Sign in**"
- Errors: "Enter an email and a password with at least 6 characters." · "That account already exists. Sign in or reset your password." · raw Supabase error
- Success: redirect to `/auth/check-email?email=…` (no session until email confirmed)

### 1.3 Check email (`/auth/check-email`)
- Title: "Verify your email". Description: "We sent a verification link to {email}. Click it to open your account."
- Field: **Email** (required, pre-filled from query param, editable)
- Button: "**Resend verification email**". Success info notice: "Verification email sent. Click the link to open your account." Error: "Enter the email address you used." or Supabase error.
- Footer link: "Back to sign in"

### 1.4 Email confirmation (`/auth/confirm`)
No UI — GET route handler that verifies the email token (signup or recovery), sets the session, and redirects to `next` (default `/onboarding`; recovery → `/auth/reset-password`). Errors bounce to `/auth?error=…`. The `next` param is sanitized against open redirects.

Takes either shape of link: `token_hash` + `type`, which is what the repo's templates in `supabase/templates/` send, or a PKCE `code`, which is what Supabase's **default** templates send after their own `/auth/v1/verify` redirects to the Site URL. The default lands on `/`, so `proxy.ts` forwards a root request carrying `code` here — otherwise the click confirms the address and leaves the person on the landing page with no session. That path matters while the project is on the default email provider, which locks template editing until custom SMTP is configured.

### 1.5 Reset password (`/auth/reset-password`)
One screen, two modes decided by **whether a session exists**:

**Mode A — signed out (request reset)**
- Title: "Reset your password". Description: "We will send you a link to reset your password."
- Field: **Email** (required). Button: "**Send reset email**".
- Success: "Password reset email sent." Error: "Enter your email address." or Supabase error.
- Footer: "Back to sign in"

**Mode B — signed in (arrived via recovery link)**
- Title: "Set a new password". Description: "Enter a new password for your account."
- Field: **New password** (required, minLength 6). Button: "**Update password**".
- Error: "Use at least 6 characters." Success → `/dashboard`.

---

## 2. Onboarding View (`/onboarding`)

Two-step, URL-driven flow (deep-linkable; no client wizard state). Users who already have a role are bounced to `/dashboard`. Footer on both steps: "Signed in as {email} · **Sign out**".

### Step 1 — Role choice (no `role` param)
- Title: "How will you use Cricket Platform?" Description: "Choose a role to finish setting up your account."
- Three tappable link-cards (nav labeled "Choose your role"):
  - **"I'm a player"** — "Build your profile and share videos of your game with coaches."
  - **"I'm a coach"** — "Discover players and review their videos."
  - **"I'm a parent / guardian"** — "Approve and follow your child's player account."

### Step 2 — Role form (`?role=player|coach|guardian`)
- Title: "Set up your {role} profile". Description: "Tell us a bit about yourself to finish setting up."
- Back link below the form: "← Choose a different role"
- On any server validation error, the user returns to this same role form with an error banner (role preserved).

**Common fields (all roles)**
- **Name** — text, required
- **Username** — text, required, pattern `[A-Za-z0-9_]{3,30}`, tooltip "Use 3-30 letters, numbers, or underscores." Lowercased server-side. Collision → "Username is taken."
- Submit button: "Create {role} profile"

**Player fields**
- **Date of birth** — date, required
- **Club** — text, required
- **County** — text, required, placeholder "e.g. Surrey"
- **Height (cm)** — number, optional, 1–300, placeholder "Optional"
- **Weight (kg)** — number, optional, 1–500, placeholder "Optional" (height/weight in a 2-col row)
- **Playing roles** — multi-select checkbox **chips**, optional, helper "Optional. Select any that apply." Options: Batter, Pace bowler, Off spin, Leg spin, Wicketkeeper, All-rounder
- Errors: "Complete all player fields." · "Enter a valid height and weight, or leave them blank."
- **Under-18 branch**: DOB under 18 → account created with status `PENDING_GUARDIAN` and a **guardian code** generated; 18+ → `ACTIVE`.

**Coach fields**
- **Accomplishments** — textarea, 6 rows, optional, placeholder "One accomplishment per line" (split on newlines and commas). Error: "Enter your name."
- New coaches start **PENDING** (must be admin-approved before the platform unlocks).

**Guardian fields**
- **Child's approval code** — text, required, placeholder "e.g. ABCD-2345", helper "Shown on your child's dashboard after they sign up."
- Errors: "Enter the code shown on your child's dashboard." · "That code doesn't match a pending player account."
- Success atomically claims the pending child: player becomes ACTIVE, guardian linked, code cleared (race-safe — two guardians can't claim the same child).

### Guardian code mechanics
- 8 chars from a look-alike-free alphabet (no I, L, O, U, 0, 1), cryptographically random.
- Displayed hyphenated: `ABCD-2345`. Entry is normalized (case/spaces/hyphens ignored).
- Single-use; cleared once claimed.

---

## 3. Player View

### 3.1 Home tab — pending-guardian gate
If the player is under 18 and unapproved (`PENDING_GUARDIAN`), the entire home page is replaced with:
- Header: "Welcome {name}" + email subtitle
- Panel "**Guardian approval needed**": explains a parent/guardian must sign up, choose the guardian role, and enter the code — then displays the **guardian code** large, monospace, letter-spaced.
- Nav is limited to "Home" only; no Edit profile; no other functionality anywhere.

### 3.2 Home tab — active player ("Your videos")
Top-to-bottom:
1. Header: greeting + the stats line, which ends with a quiet **"Watch the 1 min tour"** link opening the player tutorial in a modal
2. **Role badges** (display-only pills for the player's playing roles, if any)
3. **Video upload widget**
4. **Video grid** of the player's own READY videos (newest first)

### 3.3 Video upload flow
**Three required dropdowns** (in a row; all disabled while uploading):
1. **Discipline** — "Select…" default; options: Pace bowling, Off spin, Leg spin, Batting. Changing it resets Variation.
2. **Variation / Shot** — label reads "**Shot**" when Batting, else "**Variation**". Disabled until a discipline is chosen. Options by discipline:
   - Pace: Stock ball, Yorker, Bouncer, Slower ball, Leg cutter, Off cutter
   - Off spin: Stock ball, Arm ball, Top spinner, Carrom ball, Doosra
   - Leg spin: Stock ball, Googly, Slider, Top spinner, Flipper
   - Batting: Straight drive, Cover drive, On drive, Square drive, Cut, Pull, Hook, Sweep, Reverse sweep, Flick
3. **Handedness** — "Select…" default; Right / Left.

**Drop zone** (dashed border, drag-active visual state):
- Idle: heading "Drag and drop a video to upload", helper "MP4, MOV, or WebM, up to 500 MB.", and a "**Browse files**" button (file picker). Drag-drop or browse; first file only.
- Uploading: idle content is replaced by a **progress bar** + "{n}% uploaded" label (live, chunked resumable upload with automatic retries).

**Constraints & pre-checks (inline error text below the zone):**
- Dropdowns not all set → "Choose a discipline, variation, and handedness before uploading."
- Type not MP4/MOV/WebM → "Choose an MP4, MOV, or WebM file."
- Size 0 or > 500 MB → "Videos must be larger than 0 bytes and no more than 500 MB."
- Undecodable codec (thumbnail capture fails) → "This video uses a codec browsers cannot play. Re-export it as an H.264 MP4 and try again."

**Pipeline (invisible to user beyond the progress bar):** client captures a JPEG thumbnail from ~1s in → server creates the video row and signed upload URLs → chunked tus upload (6 MB chunks) → best-effort thumbnail PUT → completion call marks the video READY and **auto-creates an AI report slot**. On success the page refreshes and the new video appears in the grid. Server errors are shown verbatim (e.g. "Upload has not finished.", "Could not verify upload.", "Account pending guardian approval.").

### 3.4 Video grid (player's own)
Responsive 3 → 2 → 1 column grid. **Empty state:** "No videos yet. Upload your first video above."

Each card (links to the video detail page):
- **Thumbnail** (16:9) or a placeholder tile with a ▶ glyph
- **Filename** (truncated)
- Meta line: "{date} · {size}" (e.g. "Jan 5, 2026 · 12.3 MB")
- **Tag label**: "Pace bowling · Yorker · Right handed" (or "Untagged")
- **Delete button** — trash icon at bottom-right, aria-label "Delete {filename}". Deletes immediately (no confirmation, no toast); cascades the report, comments, and views; grid refreshes.

No view-count badges, no "new comment" indicators, no status badges, and **no filter/sort controls** on the player's own grid (only coaches get the filter bar).

### 3.5 Video detail page (player)
Player can open only their **own READY** videos (anything else 404s).

- Back link: "← All videos"
- Header: filename; subtitle "Uploaded {date} · {size}"
- **Clip player** (`ClipPlayer`): native HTML5 controls (signed URL with 1-hour TTL) plus words beneath the well — the report's **moments** ("Shot 1 · 0:02", bowling "Back-foot landing · 0:02"; tap seeks and pauses, the current one carries the amber underline), "1× ½× ¼×" rate words, "‹ Frame / Frame ›" when the report knows the frame rate, and a `m:ss` readout (tenths while paused). Every timestamp on the page — report rows, comments — jumps the clip; `?t=` opens it paused at a second. No annotation overlay.
- **Coaching report panel** (below the player) — see 3.6. **Coach review gate:** a delivered report stays hidden until a connected coach approves it (or is released when the player has no coach) — see the "With your coach" state.
- **Feedback panel** (comments) — read-only for players; **players cannot comment**. Notes a coach left while the report awaited sign-off appear only once it is approved. No delete button on the detail page (deletion lives only on the grid card).

### 3.6 AI Coaching report panel ("Coaching report")
Reports are generated **automatically** — no "request report" button anywhere; a slot is created on upload completion and filled by a background pipeline. The panel polls while a report is pending/processing (10 s) or with the coach (60 s), for up to 30 minutes.

**Coach review (`Report.reviewStatus`, `lib/report-review.ts`).** A delivered report is visible to the player only once it is `approved` (a connected coach signed it off — the panel ends with the stamp) or `released` (no stamp: the player had no connected coach when it arrived, an admin released it, or it pre-dates review). `awaiting_review` and `held` both read as "With your coach".

States (exact copy):
- Pending / processing / no row yet: "Your coaching report is being prepared."
- Failed: "We couldn't complete the analysis for this video. We'll retry automatically — please check back later." (no manual retry control)
- **With your coach** (delivered, unpublished): headline "With your coach"; "{Coach} is reviewing this report. You'll see it here once it's signed off." / "{A} and {B} are reviewing…" / "A coach is checking this report before it's released to you."; caption "This page updates itself — no need to reload." Grid chip "With your coach"; home stat "{n} with your coach"; no latest-report card, no trends, no session pooling from it.
- Ready — renders, in order, whichever are present:
  1. **Overall score** — big number "/ 100 overall" (clamped 0–100)
  2. **Metrics** — each with name, rounded score, horizontal score bar, optional comment
  3. **Model notes** — the pipeline's free-text section, line breaks preserved (was headed "Coach feedback"; the coach's own feedback is the thread beside the clip)
  4. **Timeline notes** — list of `m:ss` timestamps + note text; each timestamp seeks the clip
  5. **Raw report data** — collapsible `<details>` of pretty-printed JSON (shown if the payload has unrecognized keys or nothing parseable)
  6. Footer: "Generated by {modelVersion}" (if present)
  7. **Sign-off stamp** (approved reports, every payload shape): moss tick · "Signed off by {coach}{ · certification or club}" ("You signed this off" to that coach) · date · the coach's note in italics, if any
- Ready but malformed payload: "Your coaching report is ready, but it arrived in an unexpected format." + raw data.

### 3.7 Feedback / comments panel ("Feedback")
- Comments ordered oldest → newest. Each: author name (bold), "@username", date (day granularity, e.g. "Jan 5, 2026"), an optional `m:ss` timestamp that seeks the clip, body with line breaks preserved.
- Empty state: "No feedback yet."
- **Only approved, connected coaches can post** (form appears only on the coach's video page). Players and guardians are read-only.
- **Held notes:** a comment posted while the video's report is delivered but not yet signed off is invisible to the player and guardian (and to coaches who aren't connected) until the report is approved or released; the approval releases them together. Comments on a video whose report is pending, failed or already published are live at once.

### 3.8 Player permissions summary
| Capability | Player |
|---|---|
| Upload own videos with discipline/variation/handedness tags | Yes |
| View/delete own READY videos | Yes (delete = grid only, no confirm) |
| See AI coaching report | Read-only, once a connected coach signs it off (at once when no coach is connected) |
| Request/retry a report | No (automatic) |
| Read coach comments | Yes |
| Post comments | No |
| Filter/sort own grid | No |
| See other players' videos | No |
| Anything while `PENDING_GUARDIAN` | No — code screen only |

---

## 4. Progress Tab (player-only)

Access: players only; pending-guardian players are bounced back to the player home. Header: "Progress" / "Log your matches, watch your trends, and set goals to work towards." Feedback via top-of-page error/info banners (full-reload pattern, no inline errors, no pending states, no delete confirmations).

Vertical stack of four sections:

### 4.1 Trends (charts)
**Global empty state** (no entries at all): dashed callout — heading "No stats yet", body "Log your first match below and your batting and bowling trends will appear here."

Otherwise a 2-col (desktop) / 1-col grid of **four charts**, each a titled card with an SVG (fixed 180px height, horizontally scrollable, width grows 48px per data point). Data is full history, chronological. No time-range selectors, filters, or aggregation controls.

1. **Runs per match** — bar chart, one bar per entry with runs. Value labels above bars when ≤16 bars; date labels ("5/7") under bars when ≤10. Y-axis max labeled. Empty: "No batting logged yet."
2. **Wickets per match** — same bar rules. Empty: "No bowling logged yet."
3. **Batting average** — line chart of running cumulative average (cumulative runs ÷ dismissals; "not out"/retired-style dismissals don't count as outs). Dots per point; first/last points labeled with value + date. Empty: "Log a completed innings to track your average."
4. **Bowling economy** — line chart of running economy (runs conceded ÷ overs, cricket `.1–.5` over notation converted properly). Empty: "Log some overs to track your economy."

### 4.2 Log a match (stat entry form)
Title "Log a match", submit button "**Save match**", helper "Fill in the batting or bowling details (or both) for the match." Success banner: "Match logged."

- **Match date** — date, **required**. Invalid → "Enter a valid match date."
- **Opponent** — text, optional, max 120 ("Opponent name is too long.")
- **Batting** (3-up): **Runs** (0–1000) · **Balls faced** (0–2000) · **Dismissal** (text, max 60, placeholder "e.g. bowled, not out")
- **Bowling** (3-up): **Overs** (cricket notation, pattern `\d{1,3}(\.[0-5])?`, placeholder "e.g. 4.3", error "Overs must use .1–.5 notation, e.g. 4.3.") · **Wickets** (0–10) · **Runs conceded** (0–1000)
- Bad numbers → "Check the batting and bowling numbers you entered."
- Must include batting OR bowling → "Add batting or bowling details for this match."

No edit capability — entries are create + delete only.

### 4.3 Match log (history)
Newest first. Empty: "No matches logged yet. Add your first match above to start tracking."

Each row:
- Header: "{5 Jul 2024}" + "vs {opponent}" if set
- Batting line (if any batting data): "Batting: {runs or –} ({balls} balls) · {dismissal}"
- Bowling line (if any bowling data): "Bowling: {wickets or –}/{conceded or –} ({overs} ov)"
- **Delete** button — immediate, no confirm. Success: "Match removed."

### 4.4 Goals panel
Create form: **Goal** (text, required, max 200, placeholder "e.g. Improve strike rate") · **Metric** (optional, max 80) · **Target** (optional number, decimals ok) · **Target date** (optional date). Button "**Add goal**", success "Goal added."

List (open goals first, then most recent). Empty: "No goals yet. Set one above." Each row:
- Title (strikethrough when completed)
- Meta line joined with " · ": metric, "target {n}", "by {date}"
- **Mark complete** / **Reopen** toggle (banners: "Goal completed." / "Goal reopened.")
- **Delete** (no confirm; "Goal removed.")

Goal progress is a manual binary toggle — no automatic tracking against logged stats.

### 4.5 Reminders panel
Create form: **Reminder** (text, required, max 300, placeholder "e.g. Book a net session") · **Due date** (optional). Button "**Add reminder**", success "Reminder added."

List (open first, then soonest due, nulls last). Empty: "No reminders yet." Each row: text (strikethrough when done), "Due {date}" if set, **Mark done**/**Reopen** toggle, **Delete** (no confirm). No notifications, badges, or overdue highlighting — reminders surface only in this list.

---

## 5. Connections Tab (`/dashboard/connections`)

Header: "Connections" / "Find players and coaches by username and manage your requests." Error + info banners from query params.

**Role differences:** Players see the **coach directory and the club directory** (one search box filters both) plus the Connections panel. Coaches, guardians and clubs see only the Connections panel — a club reaches players by claiming the public profiles who named it (the action re-checks that list), or by username.

### 5.1 "Find a coach" directory (players only)
- **Search form** (GET): search input "Search coaches by name" + "Search" button; case-insensitive name substring filter, persisted in `?q=`.
- Lists **approved coaches only**, sorted by name. Each row: name + " @username", below it accomplishments joined with " · " (or "No accomplishments listed.").
- Per-row action by connection state:
  - none → "**Request to connect**" button
  - revoked → "**Request again**" button
  - pending → static text "Requested"
  - accepted → static text "Connected"
- Empty states: "No coaches match your search." (with query) · "No approved coaches yet." (no coaches)

### 5.2 Connections panel (all roles)
**Send request by username form:** one **Username** field (required, pattern `[A-Za-z0-9_]{3,30}`) + "**Send request**" button.

**Three lists** (each with empty state "None."):
1. **Incoming pending** — rows show name / @username / role; actions **Accept** (primary) and **Decline** (secondary). Decline deletes the request entirely.
2. **Outgoing pending** — display-only rows. **There is no cancel/withdraw control** for outgoing requests.
3. **Accepted connections** — rows with a "**Revoke**" button that opens the app's only confirmation modal (alertdialog): heading "Revoke this connection?", warning "This coach will lose access to your videos." (coach counterpart) or "You will lose access to this person's videos and messages.", buttons **Cancel** / **Revoke**. Revoking also removes the conversation from Messages immediately.

### 5.3 Rules & exact messages
- Eligibility gates (sending/responding): unapproved coach → "Your coach account is still under review."; unverified club → "Your club is still under review."; pending-guardian player → "Your account needs guardian approval first."
- Request outcomes: "You can't connect with yourself." · "No user found for that username." · "That coach is not available to connect yet." · "That club is not available to connect yet." · "That player is not available to connect yet." (child-safety: can't connect to unapproved minors) · "You are already connected." · "That request is already pending." · success "Request sent." (a revoked pair is re-opened to pending)
- Respond: only the recipient can act ("Only the recipient can respond."); accept → "Request accepted."; decline → "Request declined."
- Revoke: success "Connection revoked."; stale → "Connection not found."
- Statuses: PENDING / ACCEPTED / REVOKED, one row per user pair, initiator recorded.

---

## 6. Messages Tab (`/dashboard/messages`)

Two-pane layout: fixed-width **conversation sidebar** left, thread right (sidebar narrows on smaller screens). Conversations exist only for **accepted connections**.

### 6.1 Index & loading states
- No conversation selected: centered "**Your messages**" / "Select a conversation to start chatting."
- Thread loading: centered spinner in the right pane.

### 6.2 Conversation sidebar
- **Search input** at top (placeholder "Search") — client-side fuzzy filter (query characters must appear in order in the counterpart's name or username).
- **Rows** (link to thread): avatar circle with first initial · counterpart name (truncated) · last-message preview (truncated, prefixed "You: " for own messages, or "No messages yet.") · **unread count pill** when > 0. Active conversation visually marked.
- Ordered by most recent message; empty conversations sink to the bottom.
- Empty states: "No connections match your search." · "No conversations yet. Connect with someone to start messaging."

### 6.3 Conversation thread
- **Header:** avatar initial, counterpart name, subtitle "@username · role" (parts omitted when absent).
- **Messages:** ascending by time. Bubbles aligned by sender side (own vs counterpart); no in-thread name labels; line breaks preserved.
- **Timestamp dividers:** centered "Mar 5, 09:14"-style line above the first message and whenever >15 minutes elapsed since the previous message. Each bubble carries a hover tooltip with the same timestamp.
- **Receipts** (only under your most recent own message): "Sending…" (in flight) → "Sent" → "Read {hh:mm}".
- **Auto-scroll** to bottom on new messages. Empty state: "No messages yet. Say hello."
- **Read marking:** incoming messages are marked read when the thread is open and the tab is visible (also on focus regain).
- **Realtime:** one websocket subscribed to all conversations; new messages and read-status updates appear live in the open thread; sidebar previews/badges refresh (debounced ~800ms).

### 6.4 Composer
- Single-line input, placeholder "Message...", max 4000 chars, + "**Send**" button.
- **Optimistic send:** the message appears immediately with "Sending…", input clears; on failure the placeholder is removed, an error banner appears above the composer, and the draft is restored for retry.
- Server rules: "Conversation not found." · "Enter a message up to 4000 characters." · "Your account is pending approval." (unapproved coach) · "Your account is pending guardian approval." (pending player)
- Any accepted pair can message; revoking the connection removes access and the conversation.

---

## 7. Edit Profile (`/dashboard/profile`)

Only players and coaches (guardians are redirected to their home; no guardian profile editing exists). Header: "Edit profile" + email subtitle. Banner-based success/error ("Profile updated." / errors).

### Player panel ("Player profile")
Fields, all pre-filled: **Name** (required) · **Username** (required, pattern, "Username is taken." on collision) · **Club** (required) · **County** (required, "e.g. Surrey") · **Height (cm)** (optional, 1–300) · **Weight (kg)** (optional, 1–500) · **Playing roles** multi-select chips (Batter, Pace bowler, Off spin, Leg spin, Wicketkeeper, All-rounder). Button "**Save changes**".
Errors: "Enter your name." · "Complete all player fields." · "Enter a valid height and weight, or leave them blank."
Not editable: date of birth, visibility, status, guardian link.

### Coach panel ("Coach profile")
**Name** (required) · **Username** (required) · **Accomplishments** textarea (8 rows, "One accomplishment per line", split on newlines/commas). Button "**Save changes**".

---

## 8. Coach View

### 8.1 Approval gate (replaces the entire dashboard)
New coaches are **PENDING** until an admin acts. Header always: "Welcome {name}, coach" + email.

- **Pending:** single panel "Account under review" — "Thanks for signing up. To keep the platform safe for young athletes, an administrator reviews every coach before activation. You'll gain full access once you're approved."
- **Rejected:** panel "Account not approved" — "Your coach account was not approved. If you believe this is a mistake, please contact support."
- No other UI in either state (no roster, videos, or filters). Connections/messaging actions also refuse unapproved coaches.

### 8.2 Coach Home (approved) — the review queue
Subtitle: "{n} players · {n} awaiting approval · {n} new", ending with a quiet **"Watch the 1 min tour"** link opening the coach tutorial in a modal. Header line: "Opening a clip marks it seen. Approving a report releases it to the player." Stack: **Awaiting your approval** → Players panel → Filter bar → **New from your players** grid.

**Awaiting your approval** (`ApprovalQueue`): every delivered, unpublished report of a connected player, oldest first — thumbnail, filename, "{player} · aged {age} · {tags}", "Report ready {relative}" (plus " · On hold by {coach}" and the reason when held), "Review →". Caption when non-empty: "Players can't see these reports until you sign them off." Empty: "Nothing waiting on you. New reports land here before your players see them." The Home nav badge is the count of those awaiting (held ones excluded).

**Players panel** ("Players"): chips for every accepted-connection player — name + role badges — each linking to that player's detail page. Empty: "No connected players yet."

**Filter bar** (URL-driven, instant, no submit button):
- **Discipline** select — "All disciplines" + the four disciplines; changing resets Variation
- **Variation or shot** select — "All variations" + the chosen discipline's list; disabled until a discipline is picked
- **Handedness** select — "Any hand" / "Right handed" / "Left handed"
- Filters persist in the URL (shareable, survives reload). No sort control (fixed newest-first).

**Video grid — unviewed feed ("New from your players"):** only READY videos from connected players **the coach has not yet opened**, filtered by the bar. Cards = thumbnail/placeholder, filename, date · size, tag label, **plus the player's name**, and a report chip that reads the review state ("Needs sign-off" / "On hold" / "Report ready"). No delete button. Empty: "No unviewed videos. Visit a player from the Players panel to rewatch their videos."

### 8.3 Coach → Player detail page
Guard: must have an accepted connection with the player (else 404).
- Back link "← Dashboard"
- Header: player name; subtitle "All of this player's videos, including ones you have already reviewed."
- Player **role badges** (if any). No physical stats shown (club/county/DOB/height/weight are guardian-view only).
- **No filter bar.** Grid of ALL the player's READY videos (viewed and unviewed), no player-name line, no delete. Empty: "This player has not uploaded any videos yet."

### 8.4 Coach video detail
Guard: video READY + accepted connection (else 404). **Opening the page marks the video as viewed** — it drops off the coach's home feed (this is the "mark as reviewed" mechanic; there is no explicit button).

- Back link "← All videos" → coach home
- Header: filename; subtitle "{player name} · Uploaded {date} · {size}"
- Two-column layout (large screens): main = clip player (moments, rate and frame words as 3.5) + **Feedback** thread with the comment form; sidebar = **Sign-off** panel (when applicable) above the **Coaching report** panel. A connected coach always sees the report body; an unconnected coach on a public player sees the player's "With the player's coach" state until it publishes.

**Sign-off panel** (`ReviewActions`; connected coach, report delivered and unpublished):
- Status: "Awaiting your approval · report ready {relative}" or "On hold · you|{coach} · {date}" + the reason. Intent line: "Nothing reaches {first name} until you approve — not the report, not your notes."
- **Approve**: "Note for {first name}" textarea (optional, ≤ 500; hint "Optional, up to 500 characters. Shown on the report under your name.") → "**Approve report**" reveals an inline second step: "This publishes the report and your notes to {first name} and their guardian. It can't be undone." with "Keep reviewing" / "**Approve and publish**". Outcome: "Report approved. {first name} can see it now." — the report and every held note publish together; the stamp reads "You signed this off".
- **Hold** (hidden once held): disclosure "Not ready to sign off?" → "Why it's on hold" textarea (required, ≤ 500; hint "Coaches see this. The player sees "With your coach" until you approve.") → "**Hold report**" (secondary). Outcome: "Report held. {first name} sees "With your coach" until you approve." — the admin queue lists it and the team webhook fires.
- Errors: "Keep your note to 500 characters." · "Say why you're holding this report, up to 500 characters." · "This report is no longer awaiting your approval." (a second coach got there first — the stamp is theirs).
- Any connected coach can approve; the first wins. A report published without a coach reads "Released to {first name} without a coach's sign-off."

**Comment form (coach-only writing surface):**
- Error notice slot + required textarea (aria-label "Leave feedback", max 2000, 4 rows, placeholder "Leave feedback for this player…") + "**Pin to {m:ss}**" switch (captures the clip position; "Pinned at {m:ss}") + "**Post feedback**" button. Hint: "Up to 2000 characters · the player sees this on their own report page." or, while the report awaits sign-off, "… · hidden from {first name} until you approve the report."
- Held notes carry "· Hidden until you approve" in their meta line until the report publishes.
- Errors: "Enter feedback up to 2000 characters." · "Complete your profile before leaving feedback." (no username) · "That timestamp isn't valid."
- Coach cannot: delete the video, edit/delete comments (theirs or others'), or request/regenerate reports.

---

## 9. Guardian View

Guardians are read-only observers of exactly one linked child. Limited nav (Home only, no Edit profile). Guardians can use Connections (panel only) and Messages.

### 9.1 Guardian Home
- **No linked player:** header "Welcome {name}" + email; panel "No linked player" — "Your account isn't linked to a player. If you believe this is a mistake, please contact support." Nothing else.
- **Linked:** header "{child name}'s player account"; subtitle "You approved this account and can review everything your child shares."
  - **Profile panel**: definition list showing only populated facts — Club, County, Date of birth, Height ("{n} cm"), Weight ("{n} kg") — plus the child's role badges.
  - **Video grid**: all the child's READY videos, newest first (thumbnail, filename, date · size, tag label). No filters, no delete, no player-name line. Empty: "No videos yet. Videos your child uploads will appear here."

### 9.2 Guardian video detail
Only their own child's READY videos (else 404). Back link "← All videos". Single-column: clip player → Coaching report panel (same states as the player, "With your coach" included) → Feedback panel **without a comment form** (read-only, published comments only; empty state "No feedback yet."). Opening does **not** mark anything viewed. No delete, no report controls.

---

## 9b. Club View

A club is its own account (a fifth onboarding role, admin-verified like a coach) **and** a workspace its coaches can open from their own logins. `/dashboard/club` is a router: the club's own account goes to its dashboard, a coach to the club they run.

### 9b.1 Approval gate
Same shape as the coach gate: "Under review" until an admin verifies the club, or "This club wasn't approved" with a contact link.

### 9b.2 Club dashboard (`/dashboard/club/[clubId]`)
Openable by the club's own account **or** a coach with an accepted membership whose own coach account is approved (`getClubAccess`); anything else 404s. A member coach sees the line "You're here as a coach of {club}, signed in as yourself" — there is no impersonation, no "act as" session.

Header: club name, "{country} · {n} players · {n} coaches". Stack:
1. **Players who list this club** (only when non-empty) — every ACTIVE player whose free-text `club` matches this club's name exactly after trimming and collapsing whitespace, and whom the club has never asked. Tick and submit to send each a **connection request**; the player (not the club) decides. Match is deliberately not fuzzy: a near-match is a stranger asking a fourteen-year-old to connect.
2. **Players** — the accepted roster: name, "aged {n} · {n} clips · latest report {relative}", role chips, linking to that player's clips.
3. **Coaches** — accepted members and open invitations ("Invited"), each with **Remove**/**Cancel** for the club or an OWNER, plus an invite-by-username form. Only approved coaches can be invited; they accept from their own home.

### 9b.3 Club → player and video pages
`/dashboard/club/[clubId]/players/[playerId]` and `/dashboard/club/[clubId]/videos/[videoId]`, both gated on the **club's** accepted connection — a member coach's own separate connection is not a key. The video page is the player's own page with `audience="observer"`: published reports only, an unpublished one reads "With the player's coach", the feedback thread is read-only ("Feedback is between the player and their coaches"), and there is no sign-off panel.

### 9b.4 What a club cannot do
Approve a report (`countApprovers` counts `Coach` rows, so a club can never be one), leave feedback, see a player's physical stats, or see anything at all before the player accepts. A player whose only connection is a club has their reports **released** on delivery, exactly as if they had no coach.

---

## 10. Admin View (`/dashboard/admin`)

A single-purpose **coach review console**. Admin is either an email in `ADMIN_EMAILS` or an account granted it directly (`app_metadata.admin`, set by `bun run admin:grant`, carried in the access token — see `lib/admins.ts`); admins are redirected here from everywhere else.

- Header: "Admin — coach review", subtitle = admin email, header action = **Sign out** button.
- Error/info banners from query params.
- **Pending clubs panel** — under the coaches panel, same shape: name + "@username", country and submission date, the club's description (or "No description given."), **Approve** / **Reject**. Outcomes "Club approved." / "Club rejected." · stale → "That club is no longer pending." A club reaching no player until it is verified is the point; its coaches are approved separately as coaches.
- **Pending coaches panel** — title with live count "Pending coaches ({n})", oldest first.
  - Empty: "No coaches awaiting review."
  - Each row: coach name + "@username", a bulleted list of accomplishments (or "No accomplishments listed."), and two buttons: **Approve** (primary) / **Reject** (secondary).
  - Outcomes: "Coach approved." / "Coach rejected." · stale race → "That coach is no longer pending." · bad request → "Invalid request."
- **Report queue** — pending / processing / failed reports the pipeline still owes, **plus reports a coach has held** (status "held", "Held by {coach}: {reason}") with two actions: **Release to player** (publishes without a stamp — "Report released to the player.") and **Re-run analysis** (back to pending for the worker; the next delivery returns it to the coach's queue — "Analysis queued again."). Stale: "That report is no longer held."
- Admin **cannot**: re-review already-actioned coaches, manage players/guardians, moderate videos/comments, or edit anything else.

---

## 11. Reference

### Vocabulary / enums
- **Playing roles:** Batter, Pace bowler, Off spin, Leg spin, Wicketkeeper, All-rounder
- **Video disciplines & variations:** see §3.3
- **Handedness:** Right, Left
- **Player status:** ACTIVE / PENDING_GUARDIAN · **Coach status:** PENDING / APPROVED / REJECTED · **Connection status:** PENDING / ACCEPTED / REVOKED · **Video status:** PENDING_UPLOAD / READY · **Report status:** PENDING / PROCESSING / READY / FAILED
- **Date formats in use:** "Jan 5, 2026" (videos/comments) · "5 Jul 2024" (progress, en-GB UTC) · "5/7" (chart ticks) · "Mar 5, 09:14" (message dividers) · `m:ss` (report timestamps)

### Known UX gaps (opportunities for the design pass)
1. All server feedback is top-of-page banners after full page reloads — no inline field errors, no toasts.
2. No button pending/disabled states during submission (except the optimistic message composer).
3. No delete confirmations anywhere except connection revoke (videos, matches, goals, reminders all delete instantly).
4. No edit flows for stat entries, goals, or reminders (create/delete/toggle only).
5. ~~Reports require a manual reload to appear (no polling); report timeline timestamps don't seek the video.~~ Fixed: the panel polls, and every timestamp seeks the clip.
6. No cancel control for outgoing connection requests.
7. No overdue treatment for reminders; no notifications of any kind (comments, reports, requests) outside the messages unread badge and the coach's awaiting-approval badge — a player learns their report was signed off only by opening the app.
8. Charts have no time-range or filter controls; values always span full history.
