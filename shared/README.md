# shared/

Code the Next.js app and the mobile apps (`docs/mobile-apps.md`) both run.

A module belongs here when it encodes a **rule the two clients must agree on**
— what a discipline's variations are, when a measurement counts as off its
reference, whether a failed report is final, what a valid handle looks like.
Two implementations of one rule drift; that has already happened once in this
repo (two report renderers with their own fonts and colours).

## The constraint that keeps it importable

React Native has no DOM, no Node built-ins, and no Next.js. So a file here may
import **nothing** except other files in `shared/`. In particular, no:

- `react`, `next/*`, `@/components/*`, `@/lib/*`
- `node:*` built-ins (`fs`, `crypto`, `path`), `server-only`
- Prisma client or generated enums — mirror the enum *names* as string unions
- `process.env` — the two runtimes inline different variables
  (`NEXT_PUBLIC_*` vs `EXPO_PUBLIC_*`); read env at the call site and pass the
  value in

Web-only siblings stay put and re-export from here, so the ~34 existing
`@/lib/...` and `@/components/...` imports keep working:
`lib/videos.ts` re-exports `shared/videos.ts` and keeps
`getSupabaseTusEndpoint()`, which reads a `NEXT_PUBLIC_*` variable.

Browser globals that RN also has (`crypto.getRandomValues` behind a polyfill,
`URL`, `Intl`) are allowed inside a function body — just never at module load.
`generateGuardianCode()` is one: only the server calls it, and the apps import
the same module for `normalizeGuardianCode` / `formatGuardianCode`.

`theme.css` is the exception to the TypeScript-only rule and the clearest
case for this directory: the seven colours and nine type roles, defined once.
The web imports it as Tailwind v4 theme variables; the app compiles it to
`mobile/lib/theme.ts` with `bun run tokens`, because React Native cannot read
CSS. A test on each side fails if its copy drifts.

The mobile app resolves this directory through Metro's `watchFolders`; the web
app reaches it as `@/shared/*`, since `@/*` maps to the repo root.
