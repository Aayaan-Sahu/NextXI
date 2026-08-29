# Tutorial films

Short, silent, captioned recordings of the product, published at `/tutorials`
and linked from each role's dashboard home. `public/recording-guide.mp4` — the
drawn film about how to hold a phone — is a different thing and is built by the
`remotion/scenes/*` compositions.

**Nothing in a tutorial is drawn.** Every frame of the walkthrough is the real
app in a real browser, signed in as a real (throwaway) account, so a film can
never show UI the product doesn't have. That is the whole reason the pipeline
is scripted rather than screen-recorded by hand: re-shooting after a UI change
is four commands, not an afternoon.

## The pipeline

```
bun run video:seed                  # build the demo world (writes .demo-world.json)
bun run video:capture player        # drive + record the app  → remotion/public/captures
bun run video:tutorials player      # render + encode         → public/tutorials
bun run video:teardown              # delete everything, and prove it
```

| Step | What it does |
| --- | --- |
| `scripts/seed-demo.ts` | Creates the cast through the Supabase auth admin API (pre-confirmed, so no confirmation email is ever sent), writes the rows onboarding would have written, uploads the demo clip, delivers reports, and signs everyone in — storing the `@supabase/ssr` session cookies so capture never has to film a login. Idempotent: a re-run resets the world, including report review state, so a second take starts where the first did. |
| `scripts/capture-tutorial.mjs` | Playwright drives Chrome through a scripted walkthrough and records it, injecting a pointer overlay (the recorder draws no cursor) and logging a caption cue at each beat. |
| `remotion/tutorials/` | Composes the capture with a title card, the lower-third captions and an end card. Duration comes from the capture manifest, so a longer take needs no code change. |
| `scripts/render-tutorials.sh` | Renders, then encodes for the web (H.264, CRF 26, no audio track) and grabs a poster from 40% in. |
| `scripts/demo-teardown.ts` | Deletes the accounts (which cascades the rows), removes the storage objects that don't cascade, and prints a residue count. Non-zero exits 1. |

## Running it

`DEMO_WORLD=1` is required by both the seeder and the teardown — they write to
whatever project `NEXT_PUBLIC_SUPABASE_URL` points at, and there is only one
project. The env they need is the Supabase URL, the secret key and the
publishable key; no `DATABASE_URL`, because the seeder writes through PostgREST
with the service role rather than Prisma (one credential instead of two).

One local prerequisite the scripts can't install for you:

```sh
bunx playwright-core install ffmpeg   # Playwright records video with its own ffmpeg
```

`BASE_URL` defaults to `https://www.nextxi.pro`; point it at a preview
deployment to film one. **Capture in film order and re-seed between films** —
the coach film approves a report the player film needs to still be awaiting
sign-off:

```sh
bun run video:seed && bun run video:capture player
bun run video:seed && bun run video:capture coach
```

## Things that will bite

- **The recorder never scales up.** Ask `recordVideo.size` for more than the
  viewport and Playwright pads the canvas instead of upscaling — the capture
  ends up in the corner of a grey frame. Capture size and composition size are
  both 1280×720 for that reason, and the finished films are 720p.
- **Sessions expire in about an hour.** Re-run the seeder to mint fresh ones.
- **Production has a live worker.** A clip uploaded during a capture gets a
  real report a few minutes later and appears in the coach's queue; the seeder
  prunes those on its next run.
- **Never leave the demo world in place.** `bun run video:teardown` is part of
  the job, not a cleanup you get to skip.

## Adding a film

1. Copy for the title and end cards → `remotion/tutorials/films.ts`.
2. The beats → the `FILMS` map in `scripts/capture-tutorial.mjs`. A beat is
   `stage.beat("caption")` plus the clicks that follow it; every interaction
   goes through `stage.click`/`stage.type` so the pointer is visible.
3. The page copy → `lib/tutorials.ts`, which feeds both `/tutorials` and the
   in-app links.
4. Anything the film needs to exist (a player, a held report) → the cast and
   `VIDEOS` in `scripts/seed-demo.ts`.
