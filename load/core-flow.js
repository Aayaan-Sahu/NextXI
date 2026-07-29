/**
 * k6 core-flow scenario: 100 seeded players browsing dashboards and initiating
 * uploads, with ~10% of VUs pushing a real ~10MB video to Supabase Storage.
 *
 * Prereq: bun load/seed-users.ts (writes load/.sessions.json).
 *
 * Run:  k6 run -e BASE_URL=https://<preview>.vercel.app load/core-flow.js
 * Opt:  -e VERCEL_PROTECTION_BYPASS=<secret> for protected preview deploys.
 *
 * NEVER point BASE_URL at production. See load/README.md.
 */
/* global __ENV, __VU, open */
import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const BASE_URL = (__ENV.BASE_URL || "").replace(/\/+$/, "");
if (!BASE_URL) {
  throw new Error("BASE_URL is required, e.g. k6 run -e BASE_URL=https://<preview>.vercel.app load/core-flow.js");
}

const sessions = new SharedArray("sessions", () => JSON.parse(open("./.sessions.json")).users);

/** Every UPLOADER_SHARE-th VU runs the full upload leg (~10% of VUs). */
const UPLOADER_SHARE = 10;
const UPLOAD_BYTES = 10 * 1024 * 1024;

const baseHeaders = {};
if (__ENV.VERCEL_PROTECTION_BYPASS) {
  baseHeaders["x-vercel-protection-bypass"] = __ENV.VERCEL_PROTECTION_BYPASS;
}
const jsonHeaders = Object.assign({ "Content-Type": "application/json" }, baseHeaders);

export const options = {
  scenarios: {
    core_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 100 },
        { duration: "8m", target: 100 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    "http_req_duration{page:dashboard}": ["p(95)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

// Per-VU state: the auth cookies are loaded into the VU's jar once, then the
// jar keeps any refreshed cookies the proxy sets during the run.
let cookiesLoaded = false;
let uploadPayload = null;

function uploadBody() {
  if (!uploadPayload) {
    uploadPayload = new Uint8Array(UPLOAD_BYTES).buffer;
  }
  return uploadPayload;
}

function think() {
  sleep(1 + Math.random() * 2);
}

export default function coreFlow() {
  const user = sessions[(__VU - 1) % sessions.length];

  if (!cookiesLoaded) {
    const jar = http.cookieJar();
    for (const cookie of user.cookies) {
      jar.set(BASE_URL, cookie.name, cookie.value, { path: "/" });
    }
    cookiesLoaded = true;
  }

  const dashboard = http.get(`${BASE_URL}/dashboard/player`, {
    headers: baseHeaders,
    tags: { page: "dashboard", name: "dashboard-player" },
  });
  check(dashboard, { "dashboard/player 200": (r) => r.status === 200 });
  think();

  const progress = http.get(`${BASE_URL}/dashboard/progress`, {
    headers: baseHeaders,
    tags: { page: "dashboard", name: "dashboard-progress" },
  });
  check(progress, { "dashboard/progress 200": (r) => r.status === 200 });
  think();

  const isUploader = (__VU - 1) % UPLOADER_SHARE === 0;
  // Values must satisfy app/api/videos/initiate-upload validation: category
  // and variation from VIDEO_DISCIPLINES, handedness RIGHT/LEFT (lib/videos.ts).
  const initiate = http.post(
    `${BASE_URL}/api/videos/initiate-upload`,
    JSON.stringify({
      category: "BATTING",
      contentType: "video/mp4",
      handedness: "RIGHT",
      originalFilename: "load-test.mp4",
      sizeBytes: isUploader ? UPLOAD_BYTES : 1024 * 1024,
      variation: "Cover drive",
    }),
    { headers: jsonHeaders, tags: { name: "initiate-upload" } },
  );
  const initiated = check(initiate, { "initiate-upload 201": (r) => r.status === 201 });

  if (initiated && isUploader) {
    const body = initiate.json();
    const videoId = body.video.id;

    // Single-shot PUT of the whole file to the signed Supabase Storage URL
    // (the browser client streams the same bytes via tus PATCH chunks).
    const upload = http.put(body.upload.signedUrl, uploadBody(), {
      headers: { "Content-Type": "video/mp4", "x-upsert": "false" },
      tags: { name: "storage-upload" },
      timeout: "180s",
    });
    const uploaded = check(upload, {
      "storage upload 2xx": (r) => r.status >= 200 && r.status < 300,
    });

    if (uploaded) {
      // Storage metadata can lag; the API answers 409 until the object is
      // visible, so 409 is an expected status here, retried with backoff.
      let completed = false;
      for (let attempt = 0; attempt < 3 && !completed; attempt += 1) {
        const complete = http.post(`${BASE_URL}/api/videos/complete-upload`, JSON.stringify({ videoId }), {
          headers: jsonHeaders,
          tags: { name: "complete-upload" },
          responseCallback: http.expectedStatuses(200, 409),
        });
        completed = complete.status === 200;
        if (!completed) sleep(2);
      }
      check(completed, { "complete-upload 200": (done) => done });

      const videoPage = http.get(`${BASE_URL}/dashboard/player/videos/${videoId}`, {
        headers: baseHeaders,
        tags: { name: "video-page" },
      });
      check(videoPage, { "video page 200": (r) => r.status === 200 });
    }
  }

  think();
}
