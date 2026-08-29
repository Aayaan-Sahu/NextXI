# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# NextXI mobile — agent guide

The iOS and Android app. Expo SDK 57 (expo-router, React Native 0.86,
React 19). The product spec is `../docs/mobile-apps.md`; the HTTP contract it
talks to is `../docs/api.md`. Authorship rules and the repo-wide commands are
in `../AGENTS.md` and apply here too.

## Commands (Bun, never npm)

- `bun start` — Metro. `bun run ios` / `bun run android` for a simulator.
- `bun run tokens` — regenerate `lib/theme.ts` from `../shared/theme.css`.
  **Run this after any token change on the web**, or `bun test` fails.
- `bun test` · `bun run typecheck`
- `bunx expo export --platform ios` — the fastest proof the app still
  bundles without a simulator. Run it before calling a change done.

## Styling — no NativeWind, and that is deliberate

Styles are plain React Native `StyleSheet`s built from `lib/theme.ts`, which
is **generated** from `../shared/theme.css` — the same file the web imports as
its Tailwind v4 theme. One definition of the Crease tokens, two consumers.

NativeWind was the plan and does not work on this stack. v5 (the only line
that speaks Tailwind v4) is a preview whose CSS pipeline fails to build on
SDK 57: even a bare `@import "tailwindcss"` dies in `react-native-css`'s
lightningcss visitor with `failed to deserialize; expected an object-like
struct named Specifier`, at matching lightningcss versions. v4 would work
only against Tailwind v3, which cannot read the web's v4 `@theme` — so it
buys class names at the price of a second, hand-maintained copy of every
token. Codegen keeps the single source of truth, which was the point.

Revisit when NativeWind 5 ships stable. The token source would not change.

Rules, from `../STYLE-GUIDE.md` (read it before touching UI):

- Never write a raw colour or font size in a screen. `lib/ui.tsx`'s `Text`
  takes `variant` (one of the nine roles) and `tone` (a token) and nothing
  else fits, which is the point.
- `variant`, not `role`: React Native's `TextProps` already has an ARIA
  `role`, and an intersection of the two silently collapses to `"figure"`,
  their one shared member. The ARIA prop passes through untouched.
- One family per weight. `fontWeight` on a custom family is unreliable on
  Android, so the weight is part of the family name (`fonts.sansSemibold`).
- Amber measures, peach acts, maroon brands. One hairline. Cards only for
  surfaces that genuinely float.

## Layout

- `app/` — expo-router routes. `app/_layout.tsx` loads the two faces and
  must not render before they land.
- `lib/theme.ts` — **generated, do not edit.** `lib/ui.tsx` — the primitives.
- `scripts/theme-codegen.ts` — the generator, imported by the drift test.
- `../shared/` — code the web and the app both run. Metro reaches it through
  `watchFolders` in `metro.config.js`; `disableHierarchicalLookup` stops
  resolution falling through to the Next.js app's `node_modules`.
