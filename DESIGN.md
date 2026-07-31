---
name: NextXI
description: Crease — the broadcast-scoreboard design system for a cricket talent platform
colors:
  rust-500: "#c2503f"
  rust-600: "#8a2323"
  rust-700: "#6f1b1b"
  gold-500: "#f0c8a0"
  gold-600: "#dbae7e"
  vision-300: "#b5f5dc"
  vision-500: "#7ce8bf"
  vision-700: "#2ea77d"
  cream-50: "#fdfbf6"
  cream-100: "#f7f0e3"
  cream-200: "#efead9"
  cream-300: "#e4dec9"
  cream-400: "#ddd6c2"
  cream-500: "#e6ddc9"
  pitch-700: "#38312a"
  pitch-800: "#2c2620"
  pitch-900: "#211c17"
  pitch-950: "#171310"
  ink-900: "#2a251e"
  ink-600: "#6b6353"
  sage-400: "#e0b0b0"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Saira Condensed, Public Sans, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Saira Condensed, Public Sans, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.02em"
  title:
    fontFamily: "Saira Condensed, Public Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.2em"
  body-lead:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
  body-secondary:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.78125rem"
    fontWeight: 400
    lineHeight: 1.5
  label-small:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.14em"
  scoreboard:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1
rounded:
  meter: "4px"
  control: "6px"
  card: "10px"
  marquee: "12px"
  bubble: "14px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "36px"
  gutter-mobile: "24px"
  gutter-desktop: "48px"
components:
  button-primary:
    backgroundColor: "{colors.gold-500}"
    textColor: "{colors.pitch-900}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.gold-600}"
  button-rust:
    backgroundColor: "{colors.rust-600}"
    textColor: "{colors.cream-50}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-rust-hover:
    backgroundColor: "{colors.rust-700}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.cream-100}"
  input:
    backgroundColor: "{colors.cream-50}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  badge:
    backgroundColor: "{colors.cream-100}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-selected:
    backgroundColor: "{colors.pitch-900}"
    textColor: "{colors.cream-200}"
    rounded: "{rounded.pill}"
    padding: "7px 16px"
  panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.card}"
    padding: "24px"
  scoreboard:
    backgroundColor: "{colors.pitch-800}"
    textColor: "{colors.cream-200}"
    rounded: "{rounded.marquee}"
    padding: "26px 26px 14px"
  nav:
    backgroundColor: "{colors.rust-600}"
    textColor: "{colors.cream-200}"
    height: "64px"
---

# Design System: NextXI ("Crease")

## 1. Overview

**Creative North Star: "The Floodlit Scoreboard"**

Crease is match-day materials wrapped around broadcast instruments. The warm layer is physical cricket: New-Ball Rust leather, Pavilion Cream paper, Stitching Gold thread, seam-stitch and scanline textures. The precise layer is television: condensed uppercase display type like a lower-third graphic, monospace readouts for every number the machine produced, thin meters, and a cold Phosphor Mint that belongs only to the computer-vision overlay. The product's story — a warm, human game measured by a precise machine — is told by the contrast between these two layers, never by blending them. Voice stays *measured, floodlit, earned* (PRODUCT.md).

The system runs in two registers. Product surfaces (`/dashboard`, `/onboarding`, `/auth`) are quiet: cream pages, white hairline-bordered cards, instant state changes, one gold accent doing all interactive work. Brand surfaces (the landing page) are cinematic: full-bleed tonal bands (pitch black → seam-stitch red → cream → pitch), scroll-driven scenes, and the real `ReportPanel` component rendered as the hero artifact — never a mockup that can drift.

Crease explicitly rejects generic SaaS landing-page grammar (gradient heroes, icon-card grids), youth-sports clip-art cheerfulness, and fake-precision marketing. Demo numbers must read as plausible and clearly staged, never dressed up as live analysis of a real player.

**Key Characteristics:**
- Warm flat surfaces, hairline borders, near-zero shadows; depth is tonal, not lifted
- Saira Condensed uppercase display over Public Sans body over IBM Plex Mono data
- One interactive accent (gold) across focus, hover, active, progress, and scores
- A reserved cold mint palette that marks "the machine is looking at this"
- Real product components double as marketing imagery

## 2. Colors

A committed three-color brand (leather red, pavilion cream, stitching gold) with a charcoal dark register and one quarantined technical accent.

### Primary
- **New-Ball Rust** (#8a2323, `rust-600`): The brand surface. Nav bar, seam-stitch hero sections, primary rust buttons, own-message bubbles, links and text actions. Its bright face **Polished Leather** (#c2503f, `rust-500`) marks low scores on dark scoreboards; its pressed shade **Old Leather** (#6f1b1b, `rust-700`) is hover/pressed and the landing nav.

### Secondary
- **Stitching Gold** (#f0c8a0, `gold-500`): The single interactive accent — focus rings (`gold-500/25`), active-nav underlines and rails, card hover borders, upload progress, chart bars and dots, high scores, the "XI" in the wordmark. **Worn Stitching** (#dbae7e, `gold-600`) is its hover state. Gold means "alive or earned"; it is never a background wash.

### Tertiary
- **Phosphor Mint** (#7ce8bf, `vision-500`, with faces #b5f5dc `vision-300` and #2ea77d `vision-700`): The machine-vision voice. Tracking trails, joint markers, live readouts, the pulsing "Tracking" dot — always on dark, always mono type, always alongside white-alpha strokes and square corners.

### Neutral
- **Pavilion Cream** (#efead9 `cream-200` page ground; #f7f0e3 `cream-100` bands and bars; #fdfbf6 `cream-50` inputs and dropdowns; #e4dec9 `cream-300` tracks; #ddd6c2 `cream-400` the universal hairline border; #e6ddc9 `cream-500` emphasized borders): The warm paper the product is printed on. Card surfaces are pure white (#ffffff) so they read one step brighter than the page.
- **Leather-Black Pitch** (#171310 `pitch-950` letterbox and scrims; #211c17 `pitch-900` dark sections and emphasis buttons; #2c2620 `pitch-800` the scoreboard; #38312a `pitch-700`): Charcoal with leather warmth, never pure black.
- **Scorer's Ink** (#2a251e `ink-900` body text; #6b6353 `ink-600` secondary text and empty states — darkened from the original #948d7c, which sat at 3.3:1 on white and failed WCAG AA; the current value holds ≥4.5:1 on every cream step).
- **Sun-Faded Seam** (#e0b0b0, `sage-400`): Faint text on red and dark surfaces — inactive nav links, timestamps, receipts, placeholders, completed items. It is a tint of the leather family, which is why faint text on rust never looks gray.

### Named Rules
**The Gold Thread Rule.** Gold is the only interactive accent. Focus, active, hover-emphasis, progress, and high scores all speak gold; introducing a second accent color is prohibited.

**The Sixty Rule.** In reports and meters, a metric at 60 or above fills gold; below 60 fills rust. This threshold is the only place color passes judgment. Do not invent new score colors.

**The Reserved Mint Rule.** `vision-*` never appears in product chrome, marketing sections, or any warm surface. It exists solely inside machine-vision/analysis overlays (the HUD, future report annotations). If a mint element isn't the machine speaking, it's wrong.

## 3. Typography

**Display Font:** Saira Condensed (weights 500/600/700, falls back to Public Sans)
**Body Font:** Public Sans (system-ui fallback)
**Label/Mono Font:** IBM Plex Mono (weights 500/600)

**Character:** A broadcast graphics package: condensed, uppercase, tightly-leaded headlines like lower-thirds; plain readable body; monospace for anything a scorer or a machine would write down.

### Hierarchy
- **Display** (700, breakpoint-stepped `text-5xl → sm:text-7xl → lg:text-8xl`, leading 0.98–1.05, tracking 0.02em, uppercase): Landing heroes and section headlines. No `clamp()` — the scale steps at breakpoints.
- **Headline** (700, 28–34px, leading 1.05, tracking 0.02em, uppercase): Page H1s (`PageHeader`), onboarding titles, auth card titles (26px).
- **Title** (600, 18–22px, leading tight, uppercase): Panel headings, card titles, drop-zone callouts.
- **Body** (400, 14px dominant; 14.5–15px for lead paragraphs, 12.5–13.5px for secondary rows; leading 1.55–1.65): All prose, labels, list content. Names bold at 14.5px.
- **Label** (IBM Plex Mono 600, 10–11.5px, tracking 0.08–0.3em, uppercase where standalone): The `Kicker` eyebrow (11px/0.2em — gold on dark, rust on light), timestamps, file sizes, @usernames, chart labels, receipts, scores.

### Named Rules
**The Lower-Third Rule.** Every machine-produced or record-keeping fact — dates, sizes, scores, timestamps, @usernames, model versions — is set in IBM Plex Mono, small, and joined with " · " middle dots. Prose never goes mono; data never goes sans.

**The Uppercase Condensed Rule.** Saira Condensed appears only bold or semibold, only uppercase, only tightly leaded. It is never used for body copy, buttons under 19px, or anything lowercase.

## 4. Elevation

Crease is flat by default. Depth is conveyed tonally — cream page → white card, pitch band → pitch-800 scoreboard — and by the universal 1px `cream-400` hairline (cards, row separators, dropdowns, input borders; `cream-500` for dashed drop zones and outline emphasis). Texture substitutes for shadow on brand surfaces: the seam-stitch weave on rust sections, broadcast scanlines on scoreboards and video placeholders.

### Shadow Vocabulary
- **Floating panels** (`shadow-md`): Nav dropdown menus and the mobile nav sheet — the only mid-weight shadow.
- **True float** (`shadow-2xl` + `shadow-black/40–45`): Surfaces detached from the page: the **mobile** auth card on the seam-stitch brand band, the revoke confirm dialog, the marketing report showcase. Desktop auth uses a hairline white panel on cream (no float shadow) — the split brand/form layout is the brand→product threshold. That is the complete list.

### Auth layout
Product auth (`/auth`, reset, check-email) is a **split composition**: seam-stitch brand pane (wordmark, match-day kicker, one voice line, scanline foot) beside a cream form pane. On mobile the brand band stacks above a true-float white card. Form titles stay short ("Sign in" / "Create account"); a light-tone `Kicker` sits above the H1. Mount motion: CSS `animate-crease-fade` / `animate-crease-rise` (~250ms), disabled under `prefers-reduced-motion`.

### Named Rules
**The Flat Field Rule.** Surfaces are flat at rest. A shadow is a statement that the element floats above the page (menu, dialog, the one marketing showcase) — never decoration on a resting card. If a card needs emphasis, change its border or its tone, not its altitude.

## 5. Components

All shared primitives live in `components/ui.tsx`. Build with them first; extend them there rather than restyling locally.

### Buttons
- **Shape:** Gently rounded (6px), 10px × 16px padding, `text-sm font-bold`.
- **Primary (gold):** `gold-500` fill, `pitch-900` text → hover `gold-600`. The default affirmative action.
- **Primary (rust variant):** `rust-600` fill, `cream-50` text → hover `rust-700`. Auth and brand-forward moments.
- **Secondary:** transparent with `cream-500` border, `ink-900` semibold text → hover `cream-100` fill.
- **Dark utility (pitch):** `pitch-900` fill, `cream-200` text → hover `pitch-800`. Search/directory actions.
- **Focus:** gold ring (`ring-2 ring-gold-500/25` with `border-gold-500` on inputs); buttons currently rely on browser default focus — extend, don't remove.

### Chips
- **CheckboxChip (multi-select pill):** `cream-500` border pill, `13px semibold` → checked: `pitch-900` fill, `cream-200` text. No checkmark glyph; the fill is the state.
- **Badge (static tag):** `cream-100` fill, `cream-400` border pill, `text-xs semibold ink-900`.

### Cards / Containers
- **Corner Style:** 10px (`Panel`, video cards, dialogs); 12px for scoreboards and marketing marquees; 12px (`rounded-xl`) for onboarding/auth cards.
- **Background:** White on cream pages; `pitch-800` scoreboard for dark report surfaces; `pitch-900` for featured-dark cards (coach role card).
- **Border:** 1px `cream-400`, always. Hover-affordance cards swap to `gold-500`.
- **Video-card report chips:** when a card knows its report state, a mono, square-cornered (3px) chip sits top-left on the thumbnail — Analysing = `pitch-950/85` band, `cream-200` text, pulsing `gold-500` dot (`motion-safe:animate-pulse`); Report ready = `gold-500`/`pitch-900`; Analysis failed = `rust-600`/`cream-50`. Warm-layer colors only — the Reserved Mint Rule keeps `vision-*` out of chips.
- **Shadow Strategy:** None at rest (see Flat Field Rule).
- **Internal Padding:** 24px (`p-6`); 36px (`p-9`) for auth/onboarding forms.

### Inputs / Fields
- **Style:** `cream-50` fill, 1px `cream-500` border, 6px radius, `text-base sm:pointer-fine:text-sm` (16px on touch devices — coarse pointers — so iOS Safari doesn't auto-zoom a focused field in either orientation; 14px only on fine-pointer desktops), placeholder `ink-600`.
- **Focus:** `border-gold-500` + `ring-2 ring-gold-500/25`.
- **Disabled (selects):** `cream-100` fill, `sage-400` text.
- **Field labels:** `text-xs font-bold` stacked with 6px gap.
- **Errors:** shared `Notice` tone="error" — `rust-600/10` tint band, `rust-600/30` border, `rust-700` text, `animate-crease-rise` entrance.
- **Passwords:** `PasswordInput` (`components/password-input.tsx`) — TextInput plus an ink eye toggle; never a bare `type="password"` field.
- **Submits:** every server-action form submits through `SubmitButton` (`components/submit-button.tsx`) — PrimaryButton that disables with an inline spinner while the action is pending. The one exception is the messages composer, which submits through its own optimistic client handler.

### Navigation
- **App nav:** 64px `rust-600` bar with a 2px `gold-500` stitch line under the band, 1280px inner container. Links `text-sm font-semibold`: active = `cream-200` text + 2px `gold-500` underline; inactive = `sage-400` → hover `cream-200`. Mobile: hamburger disclosure sheet on `cream-50` with a 2px gold left rail + `cream-200` fill + rust text for the active item.
- **Landing nav:** same anatomy on `rust-700` with a cream CTA button.
- **Account menu:** gold avatar circle (rust initial), 176px `cream-50` dropdown, `shadow-md`.

### The Scoreboard (signature)
`ReportPanel` and its batting/bowling renderers are the hero artifact. Dual-tone via a `tone` prop: **light** = white 10px card with `cream-400` border (coach/guardian pages); **dark** = `pitch-800` 12px card with a 46px-period scanline gradient, `cream-200` text, mono `gold-500` scores at 44px, `text-[11px]` display captions tracked 0.22em. Thin meters (3–4px) fill per the Sixty Rule. Timestamps are mono 11px — gold on dark, rust on light. Every lifecycle state (pending / processing / failed / empty / unrecognized payload) renders inside the same card as a muted sentence; unknown payloads degrade to a `<details>` raw-JSON fallback, never a crash. Marketing renders this exact component with clearly staged data.

### Meters & Charts
Hand-rolled, no chart library. Tracks: `cream-300` (light) or `black/30` (dark), 3–6px tall, 4px radius. Fills and marks: gold. Line charts stroke `pitch-900` with gold dots. Labels: mono 10–10.5px. Empty states: a dashed `cream-500` box or a single `ink-600` sentence.

### Message Bubbles
14px radius with a 4px tail corner: own = `rust-600`/`cream-200` right-aligned; other = `cream-100` with `cream-400` border. Receipts and time dividers in mono `sage-400`.

## 6. Do's and Don'ts

### Do:
- **Do** build from `components/ui.tsx` primitives (`PrimaryButton`, `SecondaryButton`, `TextInput`, `Select`, `Panel`, `Kicker`, `Badge`, `Notice`, `StatusBoard`, `EmptyState`, `GatePanel`) and extend them there when a variant is missing. The shared `Select` closed the old local-`selectStyles` gap — never write a local select style again.
- **Do** keep faint text on rust/dark surfaces in the leather family (`sage-400`) or cream-alpha — never gray on color.
- **Do** set every machine fact in mono per the Lower-Third Rule, with " · " separators.
- **Do** write empty states with `EmptyState` (dashed cream box, optional scanline media, one `text-sm text-ink-600` sentence, optional gold CTA).
- **Do** open role homes with `StatusBoard` (kicker + title + real mono stats) so the first viewport still reads NextXI without the nav. Coach and guardian homes title with the display name; the player home titles with a time-of-day greeting + first name and carries a one-sentence `note` line (voice, numeral-free — exact facts stay in the mono stats).
- **Do** treat gated states (guardian code, coach under review) as `GatePanel` scoreboard readouts, not footnote paragraphs.
- **Do** guard every infinite or scroll-driven animation with `useReducedMotion` / `prefers-reduced-motion`, following `hero-scrub-video.tsx`.
- **Do** render the real `ReportPanel` wherever a report is shown — product, marketing, or demo — with staged data clearly staged (PRODUCT.md: never dressed up as live analysis).

### Don't:
- **Don't** reach for generic SaaS landing-page grammar — "gradient heroes, icon-card grids" (PRODUCT.md anti-reference, verbatim).
- **Don't** add youth-sports clip-art cheerfulness; "this is a serious tool for serious kids" (PRODUCT.md).
- **Don't** fake precision: demo numbers must be plausible and clearly staged (PRODUCT.md).
- **Don't** use `vision-*` outside machine-vision overlays (Reserved Mint Rule).
- **Don't** put shadows on resting cards, gradient text anywhere, or glassmorphism outside the HUD's `pitch-950/80 + backdrop-blur-sm` chips — that one blur is the machine's chrome, not a general material.
- **Don't** hard-code palette hexes in components. Known debts: the leather-red vignette gradient (`#2c0b0b` family) copy-pasted in `ball-hero.tsx` and twice in `hero-scrub-video.tsx`, and the `#f0c8a0` pointLight in `ball-canvas.tsx`. Tokenize before reusing; don't add a fourth copy.
- **Don't** introduce new heading size/leading combos — the landing already carries five h2 tiers; converge on the Hierarchy above instead of adding a sixth.
- **Don't** use pure black (`#000`) surfaces or borders; Pitch is the darkest material. (Dark-tone meter tracks and floating-shadow colors are the sanctioned `black/NN` alpha exceptions.)
