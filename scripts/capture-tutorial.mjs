/**
 * Films a tutorial walkthrough against the real app.
 *
 * Playwright drives Chrome with a demo account's session cookies injected
 * (scripts/seed-demo.ts wrote them), records the page, and logs a caption cue
 * at each beat. Remotion reads the recording and the cues and composes the
 * finished film — nothing here draws a fake screen, so a tutorial can never
 * show UI the product doesn't have.
 *
 * Two things the recorder doesn't give you, both added here:
 *
 *   1. A pointer. Playwright records no cursor, which makes a silent
 *      walkthrough unreadable, so an injected overlay follows every move and
 *      pulses on click. It is CSS-transitioned in the page rather than stepped
 *      from Node, so the motion is smooth without a round trip per frame.
 *   2. Trustworthy cue times. Wall-clock and encoder-clock drift apart over a
 *      couple of minutes, so every cue is rescaled by the recording's real
 *      duration once ffprobe has measured it.
 *
 * Usage: bun scripts/capture-tutorial.mjs player|coach [--headed]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WORLD_FILE = path.join(ROOT, "scripts", ".demo-world.json");
const OUT_DIR = path.join(ROOT, "remotion", "public", "captures");
const CLIP = path.join(ROOT, "public", "hero-drive.mp4");
const BASE = process.env.BASE_URL ?? "https://www.nextxi.pro";
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * 1280×720, recorded 1:1. The recorder only ever scales a frame *down* to fit
 * `size` — ask for more and it pads the canvas instead — so the capture size
 * and the finished film share one resolution, and the product's own type is
 * pixel-for-pixel what the viewer sees. 1280 CSS px is a real desktop layout
 * (the lg breakpoint is 1024), which is why it isn't wider.
 */
const VIEWPORT = { width: 1280, height: 720 };
const RECORD_SIZE = VIEWPORT;

if (!fs.existsSync(WORLD_FILE)) {
  throw new Error(`${WORLD_FILE} is missing. Run: DEMO_WORLD=1 bun scripts/seed-demo.ts`);
}

const world = JSON.parse(fs.readFileSync(WORLD_FILE, "utf8"));

// ------------------------------------------------------------ the overlay

/**
 * Runs before any page script on every navigation: draws the pointer, and
 * exposes the two calls the beats below drive it with.
 */
const CURSOR_SCRIPT = `
(() => {
  const DOT = 22;
  let dot, ring;
  function mount() {
    if (dot?.isConnected) return;
    dot = document.createElement("div");
    dot.style.cssText = [
      "position:fixed", "left:0", "top:0", "z-index:2147483647",
      "width:" + DOT + "px", "height:" + DOT + "px", "border-radius:50%",
      "background:rgba(22,34,27,.82)", "box-shadow:0 0 0 2px rgba(253,251,244,.9)",
      "pointer-events:none", "transform:translate(-100px,-100px)",
      "transition:transform .38s cubic-bezier(.22,.61,.36,1)",
    ].join(";");
    ring = document.createElement("div");
    ring.style.cssText = [
      "position:fixed", "left:0", "top:0", "z-index:2147483646",
      "width:56px", "height:56px", "border-radius:50%",
      "border:3px solid rgba(224,122,95,.95)", "pointer-events:none", "opacity:0",
      "transform:translate(-100px,-100px) scale(.4)",
    ].join(";");
    document.body.append(ring, dot);
  }
  window.__cursorTo = (x, y) => {
    mount();
    dot.style.transform = "translate(" + (x - DOT / 2) + "px," + (y - DOT / 2) + "px)";
  };
  window.__cursorClick = (x, y) => {
    mount();
    ring.style.transition = "none";
    ring.style.opacity = "1";
    ring.style.transform = "translate(" + (x - 28) + "px," + (y - 28) + "px) scale(.4)";
    requestAnimationFrame(() => {
      ring.style.transition = "transform .45s ease-out, opacity .45s ease-out";
      ring.style.opacity = "0";
      ring.style.transform = "translate(" + (x - 28) + "px," + (y - 28) + "px) scale(1.15)";
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
`;

// ---------------------------------------------------------------- the kit

function makeStage(page, cues, startedAt) {
  const at = () => Date.now() - startedAt;

  const stage = {
    /** Records a caption cue at this instant. */
    beat(label) {
      cues.push({ atMs: at(), label });
      return stage;
    },

    async dwell(ms) {
      await page.waitForTimeout(ms);
    },

    async goto(pathname) {
      // Bounded so a hung request fails as a hung request, not thirty
      // seconds into an otherwise fine take.
      await page.goto(`${BASE}${pathname}`, { timeout: 20000, waitUntil: "domcontentloaded" });
      // Bounded: a dashboard holds a realtime socket open, so networkidle
      // never arrives there and an unbounded wait costs 30s of film.
      await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(500);
    },

    async point(target) {
      const box = await stage.box(target);
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.evaluate(([px, py]) => window.__cursorTo?.(px, py), [x, y]);
      await page.mouse.move(x, y, { steps: 12 });
      await page.waitForTimeout(420);
      return { x, y };
    },

    async click(target, { settle = 700 } = {}) {
      const { x, y } = await stage.point(target);
      await page.evaluate(([px, py]) => window.__cursorClick?.(px, py), [x, y]);
      await page.waitForTimeout(180);
      await page.mouse.click(x, y);
      await page.waitForTimeout(settle);
    },

    async select(target, value) {
      await stage.point(target);
      await stage.locator(target).selectOption(value);
      await page.waitForTimeout(500);
    },

    async type(target, text) {
      await stage.click(target, { settle: 200 });
      await stage.locator(target).pressSequentially(text, { delay: 38 });
      await page.waitForTimeout(400);
    },

    /** Smooth-scrolls the element into the middle of the screen. */
    async reveal(target) {
      await stage
        .locator(target)
        .evaluate((node) => node.scrollIntoView({ behavior: "smooth", block: "center" }));
      await page.waitForTimeout(900);
    },

    locator(target) {
      return typeof target === "string" ? page.locator(target).first() : target;
    },

    async box(target) {
      const locator = stage.locator(target);
      await locator.waitFor({ state: "visible", timeout: 20000 });
      await locator.evaluate((node) =>
        node.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      await page.waitForTimeout(650);
      const box = await locator.boundingBox();
      if (!box) throw new Error(`No bounding box for ${target}`);
      return box;
    },
  };

  return stage;
}

// ------------------------------------------------------------------ films

/**
 * The tag selects only exist once a file is staged, and the widget hydrates a
 * moment after the page settles — so setting the file can land before the
 * handler is listening. Retry until the Discipline field appears.
 */
async function stageFile(stage, page) {
  const discipline = page.getByLabel("Discipline");
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.setInputFiles('input[type="file"]', CLIP);
    try {
      await discipline.waitFor({ state: "visible", timeout: 5000 });
      return;
    } catch {
      if (attempt === 4) throw new Error("The upload widget never showed its tag fields.");
      await page.waitForTimeout(1200);
    }
  }
}

const playerUpload = async (stage, page) => {
  await stage.goto("/dashboard/player");
  stage.beat("Everything you film lives on one page.");
  await stage.dwell(1900);

  stage.beat("Drop a clip in — phone footage is exactly what this wants.");
  await stageFile(stage, page);
  await stage.dwell(700);

  stage.beat("Tag it, so the analysis knows what it is looking at.");
  await stage.select(page.getByLabel("Discipline"), "BATTING");
  await stage.select(page.getByLabel("Shot"), "Cover drive");
  await stage.select(page.getByLabel("Handedness"), "RIGHT");
  await stage.dwell(500);

  await stage.click('button:has-text("Start upload")', { settle: 1200 });
  stage.beat("The upload resumes itself if the signal drops.");
  await page
    .locator('input[type="file"]')
    .waitFor({ state: "attached", timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(9000);

  stage.beat("Analysis starts on its own. Nothing to request, nothing to pay for.");
  await stage.dwell(2400);
};

const playerReport = async (stage) => {
  await stage.goto("/dashboard/player");
  stage.beat("A report reaches you only once your coach has signed it off.");
  await stage.reveal('text="With your coach"');
  await stage.dwell(2000);

  await stage.click(`a[href$="${world.videos["maya-cover-drive"]}"]`, { settle: 3000 });
  stage.beat("This one is signed off, so here it is in full.");
  await stage.dwell(1700);

  stage.beat("Every moment the analysis found is a word you can tap.");
  await stage.click('button:has-text("Shot 2")', { settle: 1800 });
  await stage.dwell(1500);

  stage.beat("Three scores, and the measurements behind them.");
  await stage.reveal('text="Coaching report"');
  await stage.dwell(2800);

  stage.beat("Your coach's notes point at the exact frame they mean.");
  await stage.click('button[aria-label="Go to 0:02"]', { settle: 1800 });
  await stage.dwell(1600);

  stage.beat("Signed off by a real coach, with their name on it.");
  await stage.reveal("text=/Signed off by/i");
  await stage.dwell(2600);
};

const playerProgress = async (stage) => {
  await stage.goto("/dashboard/progress");
  stage.beat("Log your matches and the numbers build themselves.");
  await stage.dwell(2800);
  await stage.reveal("text=/Match log/i");
  await stage.dwell(2400);
};

const coachQueue = async (stage) => {
  await stage.goto("/dashboard/coach");
  stage.beat("New reports land with you before they reach the player.");
  await stage.dwell(2600);

  stage.beat("Oldest first, so nobody waits twice.");
  await stage.click(`a[href$="${world.videos["maya-straight-drive"]}"]`, { settle: 3500 });
};

const coachReview = async (stage) => {
  stage.beat("The clip, with the moments the analysis found.");
  await stage.dwell(1700);
  await stage.click('button:has-text("Shot 2")', { settle: 1600 });

  stage.beat("Quarter speed, and a frame at a time when you need it.");
  await stage.click('button:has-text("\u00bc\u00d7")', { settle: 1000 });
  await stage.click('button[aria-label="Next frame"]', { settle: 700 });
  await stage.click('button[aria-label="Next frame"]', { settle: 1000 });

  stage.beat("Pin a note to the frame you are talking about.");
  await stage.type('textarea[name="body"]', "Head falls away here \u2014 hips through the line.");
  await stage.click('label:has-text("Pin to")', { settle: 800 });
  await stage.click('button:has-text("Post feedback")', { settle: 3500 });

  stage.beat("Held until you approve. She sees none of it yet.");
  await stage.reveal("text=/Hidden until you approve/i");
  await stage.dwell(2400);

  stage.beat("Read the report you are putting your name to.");
  await stage.reveal('text="Coaching report"');
  await stage.dwell(2400);

  stage.beat("Approving publishes the report and your notes together.");
  await stage.type(
    'textarea[name="note"]',
    "Really strong session. Keep the head still a beat longer.",
  );
  await stage.click('button:has-text("Approve report")', { settle: 1000 });
  await stage.click('button:has-text("Approve and publish")', { settle: 4000 });

  stage.beat("Signed off. It is with the player now.");
  await stage.dwell(2600);
};

const coachEpilogue = async (stage) => {
  await stage.goto(`/dashboard/player/videos/${world.videos["maya-straight-drive"]}`);
  stage.beat("And this is what she sees: the report, and your name on it.");
  await stage.reveal("text=/Signed off by/i");
  await stage.dwell(3200);
};


// ---- the sign-up film -------------------------------------------------

/**
 * The film shows the sign-up form filled in and cuts on the click. It must
 * not create an account: a real submit either hangs on example.com SMTP or
 * — now that the app no longer auto-confirms — creates an auth user and
 * leaves residue the teardown may not expect. Later segments start from
 * accounts the seeder made through the admin API.
 */
const SIGNUP_EMAIL = "ava.whitmore.demo@example.com";
const SIGNUP_PASSWORD = "riverside2026";

const signupForm = async (stage, page) => {
  await stage.goto("/auth?mode=sign-up");
  stage.beat("One account, whoever you are here for.");
  await stage.dwell(1400);

  await stage.type('input[name="username"]', "ava_whitmore");
  await page
    .locator("text=Available.")
    .first()
    .waitFor({ timeout: 8000 })
    .catch(() => {});
  stage.beat("The handle you pick is checked as you type.");
  await stage.dwell(1100);

  await stage.type('input[name="email"]', SIGNUP_EMAIL);
  await stage.type('input[name="password"]', SIGNUP_PASSWORD);
  await stage.type('input[name="confirmPassword"]', SIGNUP_PASSWORD);
  stage.beat("A handle, an email, a password. That is the whole account.");
  await stage.click('input[name="consent"]', { settle: 700 });

  // Username availability already POSTed. From here, swallow every submit so
  // the filmed click cannot create an account.
  await page.evaluate(() => {
    document.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );
  });
  await page.route("**/*", (route) => {
    if (route.request().method() === "POST") return route.abort();
    return route.continue();
  });

  await stage.click('button:has-text("Create account")', { settle: 1400 });

  const url = new URL(page.url());
  if (url.pathname !== "/auth" || url.searchParams.get("mode") !== "sign-up") {
    throw new Error(`signupForm must stay on /auth?mode=sign-up; now at ${page.url()}`);
  }
};

const signupPlayer = async (stage, page, shared) => {
  await stage.goto("/onboarding");
  stage.beat("Then say what you are. Four kinds of account, one short form each.");
  await stage.point('a:has-text("coach")');
  await stage.dwell(1700);

  stage.beat("A player fills in the things a report needs.");
  await stage.type('input[name="name"]', "Ava Whitmore");
  await page.fill('input[name="dateOfBirth"]', "2010-03-14");
  await stage.type('input[name="club"]', "Riverside CC");
  await stage.type('input[name="heightCm"]', "168");
  await stage.click('label:has-text("Batter")', { settle: 700 });

  stage.beat("Height is required — every measurement is calibrated against it.");
  await stage.dwell(1500);
  await stage.click('button:has-text("Create my profile")', { settle: 3500 });

  stage.beat("Under 18, so nothing opens until a guardian says yes.");
  // The code sits directly above its own caption; anchoring on the caption
  // beats pattern-matching the page for something that looks like a code.
  shared.guardianCode = (
    await page
      .locator('p:has-text("Your guardian approval code")')
      .locator("xpath=preceding-sibling::p[1]")
      .innerText()
  ).trim();
  await stage.dwell(2800);
};

const signupGuardian = async (stage, page, shared) => {
  await stage.goto("/onboarding");
  stage.beat("Their guardian signs up the same way, and picks their own part.");
  await stage.click('a:has-text("parent or guardian")', { settle: 1500 });

  stage.beat("Then enters the code from the player's dashboard.");
  await stage.type('input[name="name"]', "Rachel Whitmore");
  if (!shared.guardianCode) {
    throw new Error("No guardian code was carried over from the player segment.");
  }
  await stage.type('input[name="childCode"]', shared.guardianCode);
  await stage.click('label:has-text("parent or legal guardian")', { settle: 800 });
  await stage.click('button:has-text("Link my child")', { settle: 3500 });

  stage.beat("Linked. A guardian sees everything the player does — all of it.");
  await stage.dwell(2800);
};

const signupCoach = async (stage) => {
  await stage.goto("/onboarding?role=coach");
  stage.beat("A coach or a club signs up the same way.");
  await stage.type('input[name="name"]', "Sam Whitlock");
  await stage.type(
    'textarea[name="accomplishments"]',
    "ECB Level 2 coach\nRiverside CC U15 lead\nEight years in age-group cricket",
  );
  await stage.dwell(900);
  await stage.click('button:has-text("Submit for review")', { settle: 3500 });

  stage.beat("And waits: we check every one before they can reach a player.");
  await stage.dwell(2800);
};

const FILMS = {
  player: {
    segments: [
      {
        as: "maya",
        run: async (stage, page) => {
          await playerUpload(stage, page);
          await playerReport(stage);
          await playerProgress(stage);
        },
      },
    ],
  },
  signup: {
    segments: [
      { as: null, run: signupForm },
      { as: "newplayer", run: signupPlayer },
      { as: "newguardian", run: signupGuardian },
      { as: "newcomer", run: signupCoach },
    ],
  },
  coach: {
    segments: [
      {
        as: "tom",
        run: async (stage) => {
          await coachQueue(stage);
          await coachReview(stage);
        },
      },
      { as: "maya", run: coachEpilogue },
    ],
  },
};

// ------------------------------------------------------------------- main

function cookiesFor(personKey) {
  const person = world.people[personKey];
  if (!person) throw new Error(`No demo person "${personKey}" in ${WORLD_FILE}`);
  return person.cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: BASE,
  }));
}

function probeDurationMs(file) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  const seconds = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
}

async function captureSegment(browser, role, index, segment, shared) {
  const dir = path.join(OUT_DIR, `.raw-${role}-${index}`);
  fs.rmSync(dir, { force: true, recursive: true });

  const context = await browser.newContext({
    recordVideo: { dir, size: RECORD_SIZE },
    viewport: VIEWPORT,
  });
  await context.addInitScript(CURSOR_SCRIPT);
  // No `as` means the segment starts signed out — which is the whole subject
  // of the sign-up film.
  if (segment.as) await context.addCookies(cookiesFor(segment.as));

  const startedAt = Date.now();
  const cues = [];
  const page = await context.newPage();

  // The recording is saved either way — a take that broke halfway is the
  // fastest way to see why — but the failure is re-thrown, never swallowed.
  // (`return` inside `finally` silently discards the exception; it cost a
  // whole take to learn that.)
  let failure = null;
  try {
    await segment.run(makeStage(page, cues, startedAt), page, shared);
  } catch (error) {
    failure = error;
  }

  await page.waitForTimeout(900);
  const wallMs = Date.now() - startedAt;
  await context.close();

  const raw = fs.readdirSync(dir).find((name) => name.endsWith(".webm"));
  if (!raw) throw failure ?? new Error(`No recording written to ${dir}`);

  const file = `${role}-${index}.webm`;
  fs.renameSync(path.join(dir, raw), path.join(OUT_DIR, file));
  fs.rmSync(dir, { force: true, recursive: true });

  if (failure) throw failure;

  // Wall clock and encoder clock drift; the recording's own duration is the
  // authority, so every cue is rescaled onto it.
  const durationMs = probeDurationMs(path.join(OUT_DIR, file)) ?? wallMs;
  const scale = durationMs / wallMs;

  return {
    cues: cues.map((cue) => ({ ...cue, atMs: Math.round(cue.atMs * scale) })),
    durationMs,
    file,
  };
}

async function main() {
  const role = process.argv[2];
  const film = FILMS[role];
  if (!film) throw new Error(`Usage: bun scripts/capture-tutorial.mjs ${Object.keys(FILMS).join("|")}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: !process.argv.includes("--headed"),
  });

  const segments = [];
  // Carries anything one segment has to hand the next — the guardian code the
  // player's dashboard prints, for instance.
  const shared = {};
  try {
    for (const [index, segment] of film.segments.entries()) {
      console.log(`Filming ${role} segment ${index + 1} as ${segment.as ?? "a new visitor"} ...`);
      segments.push(await captureSegment(browser, role, index + 1, segment, shared));
    }
  } finally {
    await browser.close();
  }

  const manifest = path.join(OUT_DIR, `${role}.json`);
  fs.writeFileSync(manifest, `${JSON.stringify({ role, segments }, null, 2)}\n`);

  const total = segments.reduce((sum, segment) => sum + segment.durationMs, 0);
  console.log(`\n${segments.length} segment(s), ${(total / 1000).toFixed(1)}s total`);
  segments.forEach((segment) => {
    console.log(`  ${segment.file} — ${segment.cues.length} cues`);
  });
  console.log(`Wrote ${manifest}`);
}

await main();
