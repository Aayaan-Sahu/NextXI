# Remaining mobile features

Everything the full spec (`../docs/mobile-apps.md`) covers that Home,
Connections, and Messages don't. A plain list — no implementation notes.

## Recording & upload

- In-app camera capture (film setup sheet, landscape camera, review screen)
- On-device framing coach (live pose guidance while filming)
- Background-resumable upload queue
- Camera-roll import with the same pre-flight check
- Capture policy (allowed fps / duration caps)

## Report / clip detail

- Tapping a clip to open its report
- The report screen itself: scoreboard, the three scores, last-6-sessions,
  "fix this one thing," moments seek on the clip
- Coach sign-off stamp on a published report
- "Not measured" / "with your coach" report states
- Share report card

## Notifications & realtime

- Push notifications (report ready, new message, connection request)
- Idempotent send retry (a send retried after a lost response writes a second
  row — needs a client-supplied message id and a unique index)

## Auth & onboarding

- Sign up
- Forgot / reset password
- Session refresh and sign-out UX polish
- Sign in with Apple / Google
- Role selection and onboarding forms (player, coach, guardian)
- Guardian-code claim flow
- Guardian gate screen (the code/QR handoff for a PENDING_GUARDIAN player)

## Other tabs

- Sessions (list, detail, consistency panel, clip management, "film into
  this session")
- Progress (season stats, runs-per-innings chart, technique trends,
  log-a-match sheet, goals, reminders)
- Profile (avatar, visibility, password, delete account)
- Settings (notification switches, upload preferences, camera preferences,
  guide replay, language, legal)

## Other roles

- Coach: queue, review + comment composer, report sign-off, player profile,
  session views
- Guardian: child switcher, read-only clips and threads, allow-sharing
  switch, link-child

## Messaging & connections gaps

- Coach feedback composer (giving feedback from the phone — this pass is
  player-view, read-only messaging only)
- Club directory
- Local conversation search
- Pagination on the videos and messages lists

## Platform

- Offline read/caching of recent reports and clips
- Delete confirmations and swipe/long-press actions beyond what this pass
  covers
- Accessibility and reduced-motion support
- Hindi localization
- Universal links / deep linking
- Rate limiting on the new API routes
- UGC report/block (content moderation)
- Store-submission requirements: permission strings, privacy labels, data
  safety declarations, in-app account deletion
