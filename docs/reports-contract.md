# AI Coaching Report — Integration Contract

This is the service-to-service contract for the AI team's pipeline to deliver a
coaching report for an uploaded cricket technique video.

Every video gets a `Report` row automatically when its upload completes. The row
starts in `pending`. The pipeline discovers work via the **claim endpoint**
(below), analyses the video, and moves the report to `ready` (with a payload) or
`failed` (with an error) by calling the ingress endpoint.

The reference worker lives in the `cricket-ai-model` repo (`worker/worker.py` +
the `cricket_analysis` package) and implements both sides of this contract.

## Claim endpoint — how the worker finds work

```
POST /api/reports/claim
Authorization: Bearer <REPORTS_INGEST_SECRET>
```

Atomically claims the oldest analysable report and marks it `processing`.
The worker never holds storage credentials — the response carries a signed
video URL (1-hour TTL) and the metadata the analysis needs.

Responses:

| Status | Meaning                                                             |
| ------ | ------------------------------------------------------------------- |
| `200`  | A job. Body below.                                                  |
| `204`  | Nothing to analyse right now — poll again later.                    |
| `401`  | Bad/missing bearer token.                                           |
| `500`  | Signed-URL creation failed; the claim goes stale and is re-issued.  |
| `503`  | Ingestion or storage not configured on the server.                  |

```json
{
  "videoId": "8f0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d",
  "signedUrl": "https://…/object/sign/player-videos/…",
  "meta": {
    "heightCm": 175,
    "category": "BATTING",
    "variation": "Cover drive",
    "handedness": "RIGHT"
  }
}
```

Retry semantics are the platform's, not the worker's:

- A `processing` claim older than **15 minutes** is handed out again (worker
  crashed or hung — no cleanup required on the worker side).
- A `failed` report with attempts remaining is retried after the same window
  (the player-facing failure copy promises an automatic retry).
- The **third** failed attempt dead-letters the report as `failed`.
- Untagged videos (no discipline) are auto-failed with honest copy instead of
  sitting "being prepared" forever.

A `ready` report — including a low-coverage `scored: false` one — is final and
is never re-claimed.

## Endpoint

```
PUT /api/videos/{videoId}/report
```

- `{videoId}` is the UUID of the `PlayerVideo`. We create the report slot for you
  the moment the upload finishes, so you never create it yourself.
- Host: the platform base URL (e.g. `https://app.example.com`).

## Authentication

Send a bearer token that matches the platform's `REPORTS_INGEST_SECRET`:

```
Authorization: Bearer <REPORTS_INGEST_SECRET>
```

- `401 Unauthorized` — token missing or wrong.
- `503 Service Unavailable` — the platform has no `REPORTS_INGEST_SECRET`
  configured. Treat this as "not ready yet" and retry later; it is not your bug.

The token is compared in constant time. Keep it secret and rotate via the
platform's environment configuration.

## Request body

`Content-Type: application/json`

| Field            | Type                    | Required               | Notes                                          |
| ---------------- | ----------------------- | ---------------------- | ---------------------------------------------- |
| `schema_version` | integer                 | yes                    | Version of the payload schema you are sending. |
| `status`         | `"ready"` \| `"failed"` | yes                    | Terminal state for this report.                |
| `payload`        | object                  | required when `ready`  | The report body. See recommended shape below.  |
| `error`          | string (non-empty)      | required when `failed` | Human-readable failure reason.                 |
| `model_version`  | string                  | optional               | Your model/pipeline version, shown to coaches. |

Validation rules:

- `status: "ready"` **must** include a `payload` object.
- `status: "failed"` **must** include a non-empty `error` string.
- On a `ready` write, any stored `error` is cleared; on a `failed` write, any
  stored `payload` is cleared.

## Responses

| Status | Meaning                                                         |
| ------ | --------------------------------------------------------------- |
| `200`  | Report stored. Body: `{ ok: true, report: { ... } }`.           |
| `400`  | Malformed JSON or failed validation. Body: `{ error: string }`. |
| `401`  | Bad/missing bearer token.                                       |
| `404`  | No video exists with that `videoId`.                            |
| `503`  | Ingestion not configured on the server (missing secret).        |

Success body:

```json
{
  "ok": true,
  "report": {
    "videoId": "8f0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d",
    "status": "ready",
    "schemaVersion": 1,
    "modelVersion": "technique-v1.4.2",
    "updatedAt": "2026-07-03T10:15:00.000Z"
  }
}
```

## Lifecycle

```
pending --(PUT status:"ready")--> ready
   |
   +-------(PUT status:"failed")--> failed
```

A report is `pending` from upload completion until you write a terminal state.
You may overwrite a terminal state (e.g. move `failed` -> `ready` on a re-run, or
re-deliver an updated `ready` report).

## Idempotency

The endpoint upserts on `videoId`. Sending the same PUT twice produces the same
stored report — no duplicate rows, no error. Safe to retry on network failures.

## Example

```bash
curl -X PUT "https://app.example.com/api/videos/8f0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d/report" \
  -H "Authorization: Bearer $REPORTS_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": 1,
    "status": "ready",
    "model_version": "technique-v1.4.2",
    "payload": {
      "overall_score": 78,
      "metrics": [
        { "name": "Head position", "score": 82, "comment": "Steady through the shot." },
        { "name": "Bat swing path", "score": 71, "comment": "Slightly across the line." }
      ],
      "feedback": "Strong base and balance. Work on keeping the front elbow high to straighten the swing path.",
      "annotations": [
        { "timestamp_s": 2.4, "note": "Trigger movement starts a touch late." },
        { "timestamp_s": 5.1, "note": "Good weight transfer into the drive." }
      ]
    }
  }'
```

A failed run:

```bash
curl -X PUT "https://app.example.com/api/videos/8f0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d/report" \
  -H "Authorization: Bearer $REPORTS_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "schema_version": 1, "status": "failed", "error": "Could not detect the batter in frame." }'
```

## Recommended payload shape — PROPOSED v1

This is the shape the UI renders nicely today. All fields are optional and the UI
degrades gracefully if any are missing, malformed, or extra: recognized fields
render in their dedicated sections, and unknown/extra keys are shown in a
collapsible "Raw report data" panel. Nothing crashes on an unexpected payload —
but matching this shape gives players and coaches the best experience.

```jsonc
{
  "overall_score": 78,            // number 0-100, shown prominently
  "metrics": [                    // labeled rows with a score bar
    {
      "name": "Head position",    // string, required per metric
      "score": 82,                // number 0-100
      "comment": "Steady."        // optional string
    }
  ],
  "feedback": "Prose feedback...", // optional string, rendered as paragraphs
  "annotations": [                // optional timeline notes
    {
      "timestamp_s": 2.4,         // number, seconds into the video
      "note": "Trigger late."     // string
    }
  ]
}
```

Bump `schema_version` when you change this shape so the platform can adapt the
renderer without breaking older reports.

## Batting-analysis payload — schema_version 2

This is what the CRICKET worker (`api_batting.analyze_batting`) actually sends
today. The renderer detects it by the presence of a `shots` array and renders
per-shot judgements, a cross-shot consistency section, and a derived overall
score. Every field is optional/nullable — missing values are simply omitted.

```jsonc
{
  "video":       { "fps": 30.0, "width": 1920, "height": 1080, "frame_count": 900 },
  "calibration": { "height_cm": 175, "px_per_cm": 6.2, "standing_extent_px": 950, "visible_fraction": 0.88 },
  "shots": [
    {
      "frames": { "trigger_start": 40, "trigger_end": 58, "swing_start": 70, "swing_peak": 82, "swing_end": 96 },
      "head":   { "max_head_movement_cm": 3.1, "head_movement_label": "good", "head_over_knee_label": "ok", ... },
      "front_foot_stride": { "stride_length_cm": 62.0, ... },
      "back_foot_depth":   { "depth_cm": 8.0, ... },
      "balance": { "head_inside_base": true, "hip_inside_base": true, "balance_label": "good" },
      "trigger": { "duration_sec": 0.30, "gap_to_swing_sec": 0.20, ... },
      "swing":   { "swing_straightness_mean": 0.09, "swing_label": "good", ... }
    }
  ],
  "consistency": { "stride_length_cv": 0.12, "backlift_height_cv": 0.18, "swing_straightness_mean_cv": 0.10, ... }
}
```

The UI reads the `*_label` fields (`"good" | "ok" | "needs work"`) for each shot,
the `*_cm` / `*_sec` measurements for the stat line, and the `*_cv` coefficients
of variation for the consistency bars (rendered as `100 * (1 - min(cv, 1))`%).

`calibration.height_cm` is the player's real height, which the worker reads from
`players.height_cm`; the analysis normalizes every distance metric against it.

> **Resolved (Jul 2026).** The cm calibration now exists:
> `cricket_analysis/calibration.py` derives `px_per_cm` from the pose itself —
> the 95th-percentile head-to-ankle pixel extent across confidently-detected
> frames, scaled by the Drillis & Contini (1966) body-segment proportions
> (head-point-to-ankle ≈ 0.897 × stature) against the player's required
> `players.height_cm`. No reference object, no manual step. It is a 2D
> estimate: camera tilt or a never-upright player biases cm values slightly
> large, and `calibration.visible_fraction` ships in the payload so consumers
> can judge it. When the clip can't support a calibration (too few confident
> frames), cm fields are simply omitted and normalised ratios
> (`*_norm`, in stance-width units) still render.

### Fraction-of-height fields (session consistency)

Calibrated payloads also carry each measurement as a fraction of the player's
standing height (`value_px / (calibration.height_cm × calibration.px_per_cm)`,
4 decimals) — these are the scalars `lib/session-consistency.ts` pools across a
session's videos:

- Batting, per shot: `front_foot_stride.stride_length_frac_height`,
  `back_foot_depth.depth_frac_height`, `head.head_stability_frac_height`
  (same px basis — head stability × setup stance width — as
  `consistency.head_stability_frac_height_cv`, so the per-shot field and the
  CV agree).
- Bowling: `delivery.stride.length_frac_height`,
  `delivery.release.height_frac_height`.

Like the cm fields, they are present only when `calibration` is present.
`delivery.run_up.distance_frac_height` and
`delivery.follow_through.distance_frac_height` are referenced by the session
panel but have **no producer** — the pipeline measures neither run-up nor
follow-through yet, so those rows simply stay empty.

## Measurements — schema_version 3

> **UI implemented.** `ReportPanel` prefers a `measurements` array and renders
> it through the shared `MeasuredMetricRow` (same component as the landing
> demo). The worker producer that emits this array is still landing — but v2
> payloads no longer wait for it: the **platform derives measurement rows
> server-side** (`lib/report-measurements.ts` + `lib/report-history.ts`) from
> the v2 shot/delivery scalars plus the player's stored report history. Each
> derived row carries the value in real units, a `session` reference band
> (min–max of the player's previous occasions, "Your range · Last N
> sessions"), and the previous occasion's value as a progress marker + plain
> read ("Last session 58 cm — 4 cm longer this time"). The worker cannot
> produce the `session` kind — it sees one video and no history — so this
> stays platform-side even after a worker `measurements` producer lands; a
> payload that ships its own `measurements` array is rendered as-is and skips
> derivation.

v3 exists because a 0-100 score is not actionable. "Stride 82/100" does not tell
a player whether the stride was too short or too long; "Stride 1.02 m, your usual
0.94-1.05 m" does. v3 adds a flat `measurements` array that the UI renders
directly, so the pipeline decides what a metric means rather than the renderer
guessing.

**On references — read this before adding one.** There is no published "elite
benchmark" for most batting kinematics. The accessible literature reports pooled
means across mixed international-to-club samples measured on lab motion-capture
rigs, and for stride length it finds *no significant difference* between skilled
and less-skilled batters (910 ± 30 mm vs 890 ± 320 mm, P = 0.65). So a reference
is one of four kinds and must always say which:

- `"session"` — the player's own recent range. Always defensible. Prefer this.
  The UI renders it with a bold `Your range · ` prefix, so `label` carries only
  the window ("Last 5 sessions") — don't author "your range" into it.
- `"published"` — a real published range. The UI renders it with a bold
  `Benchmark · ` prefix (parallel to session's `Your range · ` and elite's
  `Elite · `), so `label` carries only the population, in plain language
  ("Club-to-international batters") — don't author the word "benchmark" into
  it. `label` **must not** carry an academic citation — citations read as
  footnotes on a consumer report, so the full citation travels in the optional,
  never-rendered `source` field instead. Never the word "elite" in a
  `published` label unless the source population genuinely was elite.
- `"elite"` — a genuinely elite reference band, rendered as a gold target
  (falling short is headroom, never a fault). An elite population is necessary
  but not sufficient: the band must also survive every failure mode documented
  in `BENCHMARKS.md` (binding here too) — the measurand must be the same
  quantity the phone pipeline measures, the sample adequate (Mann 2013 is
  elite-only but n=2 on a head-mounted eye tracker — not compliant), the effect
  not a published null, and no invented youth scaling. In practice that means
  the only expected producer is the NextXI professional reference set, once the
  pipeline has run over rights-cleared pro footage (`MODEL-STATUS.md` Stage 2)
  — same pipeline, same measurands, adequate n — labelled e.g. "NextXI pro
  reference · n=N players". No current metric qualifies; the UI kind exists
  (typed and styled) but must stay unused until one does.
- `"none"` — no defensible comparison. Send the measurement without a band.

```jsonc
{
  "schema_version": 3,
  "video": { "fps": 30.0, "width": 1920, "height": 1080, "frame_count": 900 },
  "calibration": { "height_cm": 175, "px_per_cm": 6.2 },
  "shots": [ /* unchanged from v2 */ ],
  "consistency": { /* unchanged from v2 */ },

  "coverage": {                     // how much of this was observed vs inferred
    "bat_detected_frac": 0.34,      // frames where the bat detector actually fired
    "ball_detected_frac": 0.40,
    "pose_frac": 0.72,
    "scored": true                  // false => the UI shows "not enough signal"
  },

  "measurements": [
    {
      "key": "front_foot_stride",   // stable id, safe to key React off
      "name": "Front-foot stride",
      "short": "Stride",            // axis label for tight layouts
      "value": 1.02,
      "unit": "m",
      "decimals": 2,
      "direction": "none",          // "higher" | "lower" | "inside" | "none"
      "reference": {
        "kind": "session",          // "session" | "published" | "elite" | "none"
        "label": "Last 5 sessions",
        "band": [0.94, 1.05],       // omitted when kind is "none"
        "source": "…"               // optional, published/elite only: full academic
                                    // citation. Provenance for devs; never rendered
                                    // to players — the label carries the population
      },
      "note": "Varies by only ±4 cm across 12 balls — your most repeatable movement."
    }
  ]
}
```

`direction` drives whether being outside the band reads as a fault. Send
`"none"` for descriptive metrics — the UI will show the measurement and the
band without colouring it as a problem. This matters: stride length has no
demonstrated link to batting skill, so flagging a "short" stride as a fault
would be inventing a target the evidence does not support.

`coverage` is the honesty gate and it is not optional. In our one real test clip
the bat detector fired on 34% of frames — the rest of the trajectory was
inferred from the bat polygon or extrapolated by the Kalman filter. A report
built on 34% observation should say so rather than presenting the same
confident number as one built on 90%. Set `scored: false` below your coverage
floor and the UI will decline to show measurements rather than guess.

> **Implemented.** The worker gates on provisional floors (batting: pose ≥ 50%
> of frames AND directly-detected bat ≥ 15%; bowling: pose ≥ 50%) in
> `cricket_analysis/batting.py` / `bowling.py`. Below the floor it still
> delivers `status: "ready"` with an empty `shots` array / `delivery` object
> plus the coverage block — the UI renders its honest "didn't detect a clear
> shot" / "couldn't measure this delivery" copy. `failed` is reserved for
> crashes, timeouts, and undownloadable videos, which the platform retries.
> Bowling coverage uses `ball_detected_frac` instead of the bat fields.

### Backward compatibility

The renderer picks its path in this order, so nothing stored breaks:

1. `measurements` array present → v3 measurement rows.
2. `shots` array present → v2 batting renderer (per-shot stats + consistency).
3. `overall_score` / `metrics` present → v1 legacy score rows.
4. Anything else → the collapsible "Raw report data" panel.

Stored v1 and v2 reports keep rendering exactly as they do today. A v3 payload
may also include `shots` and `consistency`; the UI will render the measurement
rows and still use `consistency` for the headline repeatability figure.
