/**
 * Fire-and-forget team notification. Posts `{ text }` to
 * `TEAM_NOTIFY_WEBHOOK_URL` (any Slack-compatible incoming webhook); when the
 * env var is unset this is a no-op, so local and preview environments need no
 * setup. Failures are swallowed — a notification must never break the
 * user-facing action that triggered it.
 */
export async function notifyTeam(text: string) {
  const url = process.env.TEAM_NOTIFY_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Ignore: timeouts and webhook outages are the team's problem, not the user's.
  }
}
