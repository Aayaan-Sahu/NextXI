# AI Coaching Report — Integration Contract

This is the service-to-service contract for the AI team's pipeline to deliver a
coaching report for an uploaded cricket technique video.

Every video gets a `Report` row automatically when its upload completes. The row
starts in `pending`. Your pipeline moves it to `ready` (with a payload) or
`failed` (with an error) by calling the ingress endpoint below.

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
