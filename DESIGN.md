---
name: NextXI
description: Crease — the design system for a cricket talent platform
colors:
  rust-50: "#f7e2de"
  rust-100: "#fdf6f4"
  rust-300: "#c68c84"
  rust-500: "#c2503f"
  rust-600: "#8a2116"
  rust-700: "#6f1b1b"
  rust-800: "#5e1710"
  amber-500: "#e8a92e"
  gold-500: "#f2c79b"
  gold-600: "#e5b482"
  cream-50: "#fffcf5"
  cream-100: "#f8f2e7"
  cream-200: "#f3ebdd"
  cream-250: "#efead9"
  cream-300: "#ede4d4"
  cream-350: "#e4dac6"
  cream-400: "#e0d6c3"
  cream-450: "#dcd3c0"
  cream-500: "#cfc3aa"
  ink-900: "#241c15"
  ink-800: "#3b332b"
  ink-600: "#6b6155"
  ink-400: "#a2937c"
  olive-950: "#1b2118"
  olive-800: "#2e3b2a"
  olive-700: "#374332"
  pitch-950: "#171310"
  pitch-900: "#241c15"
  pitch-800: "#2c2620"
  pitch-700: "#38312a"
  moss-600: "#2f6b3e"
typography:
  display:
    fontFamily: "Saira Condensed, Public Sans, sans-serif"
    # 30px in the product and in every landing band; the two pinned heroes are
    # the one place display type runs larger.
    fontSize: "30px"
    lineHeight: 1.05
    fontWeight: 700
    letterSpacing: "0.02em"
    textTransform: uppercase
  title:
    fontSize: "20px"
    lineHeight: 1.25
  lead:
    fontSize: "17px"
    lineHeight: 1.6
  body:
    fontSize: "15px"
    lineHeight: 1.6
  ui:
    fontSize: "14px"
    lineHeight: 1.5
  caption:
    fontSize: "13px"
    lineHeight: 1.45
  micro:
    fontSize: "11px"
    lineHeight: 1.3
  figure:
    fontSize: "28px"
    lineHeight: 1
    fontVariantNumeric: tabular-nums
  figure-sm:
    fontSize: "20px"
    lineHeight: 1
    fontVariantNumeric: tabular-nums
rounded:
  meter: "2px"
  chip: "4px"
  control: "6px"
  media: "6px"
  card: "10px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  2xl: "28px"
  3xl: "40px"
  gutter-mobile: "24px"
  gutter-desktop: "40px"
components:
  button-primary:
    backgroundColor: "{colors.gold-500}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.gold-600}"
  button-secondary:
    backgroundColor: "{colors.cream-300}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-destructive:
    backgroundColor: "transparent"
    borderColor: "{colors.rust-300}"
    textColor: "{colors.rust-600}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-danger:
    backgroundColor: "{colors.rust-600}"
    textColor: "{colors.cream-50}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-disabled:
    backgroundColor: "{colors.cream-350}"
    textColor: "{colors.ink-400}"
  input:
    backgroundColor: "{colors.cream-50}"
    borderColor: "{colors.cream-400}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  chip-solid:
    backgroundColor: "{colors.pitch-900}"
    textColor: "{colors.cream-200}"
    rounded: "{rounded.pill}"
    padding: "5px 14px"
  flash-info:
    backgroundColor: "{colors.cream-250}"
    borderLeftColor: "{colors.amber-500}"
    textColor: "{colors.ink-800}"
  flash-error:
    backgroundColor: "{colors.rust-50}"
    borderLeftColor: "{colors.rust-600}"
    textColor: "{colors.rust-800}"
  panel:
    backgroundColor: "{colors.cream-50}"
    borderColor: "{colors.cream-400}"
    rounded: "{rounded.card}"
    padding: "22px"
  dark-panel:
    backgroundColor: "{colors.pitch-900}"
    textColor: "{colors.cream-200}"
    rounded: "{rounded.card}"
  nav:
    backgroundColor: "{colors.rust-600}"
    textColor: "{colors.cream-200}"
    height: "56px"
shadows:
  float: "0 24px 60px rgb(36 28 21 / 0.35)"
---

# Design System: NextXI ("Crease")

> **Building UI? Read `STYLE-GUIDE.md` instead.** That file is the working
> rulebook — the type roles, the colour tokens, the primitives and the
> pre-merge checklist. This document is the art direction and the reasoning
> behind those rules. When they disagree, the style guide is what ships, and
> this file should be corrected to match.

## 1. Overview

**Creative North Star: "The Team Sheet"**

Crease is a record, kept properly. Cream paper, a maroon spine, one condensed
display face for the things that name a page, and everything else in plain
Public Sans. Nothing is decorated; the hierarchy comes from size, spacing and
a single hairline. Voice stays *measured, floodlit, earned* (PRODUCT.md).

The system runs everywhere, landing page included.

The landing page was a second register for a while — its own mint, its own pink,
IBM Plex Mono in the analysis HUD, six heading sizes and seven drop shadows. It
read as a different product to the one it was selling. Now it is the same seven
colors, the same two faces and the same nine roles; what it keeps is **scale**.
Full-bleed tonal bands and scroll-driven scenes are still its grammar, and the
two pinned heroes (`ball-hero`, `hero-scrub-video`) still run display type at
full-viewport size over video, because a marketing hero is not a page title.
Below the fold it is the product scale, through `BandHeading` / `BandIntro`.

**Key characteristics**
- Grouping by spacing and one hairline. A card is for a genuinely raised
  surface, never for wrapping a list.
- Nine type roles, no ad-hoc sizes. Saira Condensed names pages and report
  headings; Public Sans carries everything else, including the section
  eyebrow.
- Amber reads data, peach reads action, maroon reads brand and loss. Three
  jobs, three colors, no overlap.
- Every number the product shows was measured. Where it wasn't, the row says so.

## 2. Colors

Seven values carry the product. They live in `@theme` in `app/globals.css`;
nothing outside that block is a color.

| Role | Token | Value |
| --- | --- | --- |
| Brand, links, destructive, negative numbers | `rust-600` | `#8a2116` |
| Data emphasis — the XI, active markers, meter fills | `amber-500` | `#e8a92e` |
| Primary action, and only that | `gold-500` | `#f2c79b` |
| Headings and dark panels | `ink-900` / `pitch-900` | `#241c15` |
| Page ground | `cream-200` | `#f3ebdd` |
| Raised surface, fields | `cream-50` | `#fffcf5` |
| The hairline | `cream-400` | `#e0d6c3` |

Supporting steps: `ink-800` body copy, `ink-600` captions and labels, `ink-400`
disabled; `cream-100` tint bands and empty-state fill, `cream-250` flash and
meter tracks, `cream-300` secondary buttons and faint inner rules, `cream-350`
skeletons, `cream-450` benchmark bands, `cream-500` dashed borders. Error
surfaces are `rust-50` ground / `rust-300` border / `rust-800` copy. `moss-600`
is the one green — a positive verdict inside a report, never UI chrome.

`olive-*` is the video family: `olive-800` and the `bg-clip-scanlines` texture
for a clip with no thumbnail, `olive-950` for the player well, `olive-700` for a
player's avatar. It exists so a clip never reads as a panel.

`pitch-800` and `pitch-700` are the landing page's darker bands. On any dark
ground the muted step is `cream-200` at alpha, not a separate token — the pink
`sage-400` and the phosphor-mint `vision-*` that used to do that job read as a
second palette and have been removed.

### Named rules
**The Three Jobs Rule.** Amber means *measured*. Peach means *do this*. Maroon
means *brand, or something lost*. A peach meter, an amber button, or a maroon
progress bar is wrong. Amber is never a button; peach is never a data fill.

**The One Hairline Rule.** `cream-400` at 1px is the only rule weight in the
product. If a group needs separating, use spacing first and this hairline
second. `cream-500` exists solely for dashed boundaries.

**The Measured Rule.** Colour passes judgment in exactly two places: a value on
the wrong side of its reference band renders maroon, and a consistency figure
under 60 fills maroon instead of amber. Nowhere else.

## 3. Typography

**Display:** Saira Condensed (500/600/700), falling back to Public Sans. Reserved
for the page title (`PageTitle`) and report/dialog headings (`text-title`,
`text-figure`) — the two sizes with the most weight to carry.
**Body:** Public Sans, system-ui fallback. Carries everything else, including
the `SectionHeading` eyebrow — uppercase and tracked for emphasis, but the same
face as the rest of the page, not a second one.
**Mono:** none. There is no third face and none is loaded. Aligned figures come
from `tabular-nums`, not a font swap. The analysis HUD on the landing page was
the last mono holdout — it was set entirely in Plex Mono over pure white, which
is why the overlay read as a different design bolted onto the page.

### The scale

Nine roles, defined in `@theme` in `app/globals.css` as `--text-*`. Every piece
of text in the product is one of them. There is no `text-[13.5px]`.

| Role | Size / leading | Job |
| --- | --- | --- |
| `text-display` | 30 / 1.05 | the page title (Saira, uppercase) |
| `text-title` | 20 / 1.25 | dialog titles, a report's shot heading, a thread name |
| `text-lead` | 17 / 1.6 | the one introductory paragraph on a reading page |
| `text-body` | 15 / 1.6 | prose, inputs, primary list rows |
| `text-ui` | 14 / 1.5 | labels, buttons, descriptions, secondary rows — the workhorse |
| `text-caption` | 13 / 1.45 | metadata, hints, table headers, field labels |
| `text-micro` | 11 / 1.3 | chips and badges, where the box is the constraint |
| `text-figure` | 28 / 1 | a measured number |
| `text-figure-sm` | 20 / 1 | a measured number inside a row |

The small end steps 15 → 14 → 13 on purpose. A half-pixel is not a hierarchy;
it is noise, and a card carrying 14.5, 14, 13.5, 13 and 12.5 reads as several
designs assembled together rather than one.

Emphasis comes from **weight and colour, not another size**. A field label and a
caption are both 13px; the label is semibold ink, the caption is regular
`ink-600`.

### Named rules

**The Nine Roles Rule.** If a new piece of text does not fit one of the nine,
the answer is almost always that it is one of them and you have not decided
which — not that the scale needs a tenth step.

**The Rare Eyebrow Rule.** Tracked uppercase appears in exactly two places: the
`SectionHeading` that opens a content group, and the `Kicker` that labels a
panel with no other heading. Both are Public Sans, not the display face — the
eyebrow is weight, size and tracking doing the work, not a second typeface.
Never above an `h1` that already says the same words — "GUARDIAN HOME / Aayaan
Verma" spends the rarest treatment in the system on a repeat. Letter-spacing
anywhere else must be functional, like the approval code and the typed DELETE
confirmation, where you read character by character.

**The Quiet Facts Rule.** Machine facts — dates, sizes, counts, model versions —
are `text-caption` in `ink-600`, joined with " · ". They sit beside the thing
they describe and never compete with it.

**The Suppression Rule.** A destructive action that repeats once per row is
`ink-600` at rest and maroon on hover. Six maroon "Delete" links down a table
make the table about deleting.


## 4. Surfaces and elevation

Flat. Depth is tonal — cream page → `cream-50` card, cream page → `pitch-900`
dark panel — plus the one hairline.

- **Panel** (`cream-50`, `cream-400` border, 10px, 22px padding): a genuinely
  raised surface — the report, a consistency readout. Not a list wrapper.
- **DarkPanel / dark headers** (`pitch-900`): the report header, the latest-report
  scoreboard, the guardian code, the admin bar, dialog eyebrows. Flat ink, no
  texture — texture belongs to video, not chrome.
- **Shadows**: one token, `shadow-float` (`0 24px 60px` in ink at 35%), and it
  goes only on things that genuinely float — the confirm dialog, the auth sheet,
  a video modal, the report card riding the pinned hero footage. A resting card
  never has one. Cast in ink, never black: pitch is the darkest material in the
  system, and a black shadow on cream reads grey-blue. There were seven
  hand-rolled recipes before this token existed, four of them the same intent at
  four different opacities.

## 5. Components

Shared primitives live in `components/ui.tsx`. Build from them; extend them
there rather than restyling locally.

### Buttons
Primary is peach with ink text, and it is the only peach in the product.
Secondary is `cream-300`. Destructive is an outline in `rust-300`/`rust-600`.
Filled maroon (`DangerButton`) appears **only** as the confirming action inside
a destructive dialog. Disabled is `cream-350` on `ink-400`. `GhostButton` is the
cancel beside a destructive action. Form submits go through `SubmitButton`,
which disables and spins in place while the action is pending — spinners exist
nowhere else.

### Fields
`cream-50` fill, `cream-400` border, 6px radius, 16px text on coarse pointers
(so iOS Safari never auto-zooms) and 14.5px on fine ones. Focus darkens the
border to ink and adds an amber ring. Labels are 13px semibold above the
control; `FieldHint` carries the caption beneath, in muted, moss (available) or
maroon (rejected). Passwords use `PasswordInput` — a **Show/Hide word**, not an
eye glyph; the system has no icon vocabulary.

### Chips and pills
`Chip` solid is a fact the system asserts (a role, a discipline tag): `pitch-900`
fill, cream text. Outline is a quieter label. `CheckboxChip` is the multi-select
form of the same pill — the fill is the state, no checkmark glyph.

### Flash notices
`Notice` is a left rule and a tinted ground, never a full border and never a
toast. Info is amber on `cream-250`; error is maroon on `rust-50`. Server
strings render verbatim.

### Empty states
`EmptyState`: a dashed `cream-500` box on `cream-100`, one sentence, an optional
CTA. Never an illustration.

### Dialogs
`ConfirmDialog`: an ink eyebrow bar naming the act, a Saira title, one sentence
on what it costs, then `DialogActions` — cancel left, the destructive action
last and filled maroon. Account deletion additionally requires typing DELETE.

### The report (signature)
`ReportPanel` is the hero artifact and has one treatment: a `cream-50` card with
a `pitch-900` header. The header says what was measured ("4 measurements",
"3 shots detected", "Preparing", "Not measured", "Analysis failed") and carries
the one figure that summarises it. Every lifecycle state renders inside that
same shell, so a pending report reads as the same object as a finished one.

Rows are drawn by `ReportMetricRow` (`components/report-metric.tsx`): the name,
the measurement, one track showing where the value sits, and the comparison
named in plain words. Peach on the track is the player's own range; tan is an
external band (published or elite). The ink rule is the player. A metric with no
defensible reference says so and shows the measurement alone.

The data model, the parsing, and the honesty rules about references live in
`components/measured-metric.tsx`, which draws nothing. The drawing does not
differ either: `ReportMetricRow` renders every measurement on every surface —
`tone="dark"` for the dark format variants, `compact` for the pinned hero card —
so the report in the marketing scroll is literally the component the dashboard
ships. Two renderers is what let them drift in the first place.

### Meters
`Meter`: a 4px `cream-350` track with an amber fill, maroon when the value is
behind. A null value draws the empty track and the caller explains the dash. A
meter is only drawn where a current value was actually measured — goals store a
target but no current, so goals have no meter.

### Navigation
56px `rust-600` bar, 1360px inner container, no bottom stitch. Links at 13.5px:
active is `cream-50` with a 2px amber inset underline; inactive is
`cream-200/66`. Unread counts are amber pills with ink text. The avatar is
peach with ink text. Below `md` the links collapse into a `pitch-900` sheet
where the active row keeps the amber marker on its left edge, and the unread dot
rides the closed hamburger.

`SubBar` is the full-bleed band under the nav on roster and inbox surfaces:
what this page is, then `Tabs` (active tab underlined maroon), then the way to
act on it.

### Messages
No bubbles. A thread is grouped by speaker, Slack-style: a 34px avatar and a
name once per run, then the lines stacked under it. Day dividers are a hairline
either side of a quiet timestamp. The list rail is `cream-100`; the active row
is `cream-50` with a 3px maroon inset. The guardian view is the same reading
with the composer removed.

### Video cards
No border, no card — a 16:9 thumbnail with the filename and one or two quiet
lines beneath. The report chip overlays top-left (`Report ready` amber on ink,
`Analysing` cream on ink, `Analysis failed` cream on maroon). A destructive
action reveals on hover or keyboard focus so the resting grid is footage, not a
row of buttons.

### Loading
Route waits render skeletons that mirror the page anatomy — title bar, panel,
card grid — in `cream-350`. Spinners live only inside pending buttons.

## 6. Do's and don'ts

### Do
- **Do** build from `components/ui.tsx` and extend it there when a variant is
  missing.
- **Do** open a content group with `SectionHeading`, and separate groups with
  spacing before reaching for a rule.
- **Do** keep the three colour jobs apart: amber measures, peach acts, maroon
  brands.
- **Do** put the honest state in the report header — "Not measured" is a result,
  not an error.
- **Do** say what a number is compared against, in words, under the number.
- **Do** guard scroll-driven and infinite animation with `prefers-reduced-motion`.

### Don't
- **Don't** use mono. There is no mono font loaded. Use `tabular-nums`.
- **Don't** nest cards. If something is inside a Panel and wants its own Panel,
  it wants a section head and some spacing.
- **Don't** draw a meter for a value nobody measured.
- **Don't** add a third Saira Condensed size, a second accent colour, or a
  second rule weight.
- **Don't** hard-code palette hexes in components. Known debts, both on the
  landing page: the leather-red vignette gradient (`#2c0b0b` family) in
  `ball-hero.tsx` and twice in `hero-scrub-video.tsx`, and the `#f0c8a0`
  pointLight in `ball-canvas.tsx`. Tokenize before reusing.
- **Don't** use pure white. `cream-50` is the lightest value in the system, and
  white next to cream reads cold and blue.
- **Don't** add a second drop shadow. It is `shadow-float` or nothing.
- **Don't** use pure black. Pitch and olive are the darkest materials.
- **Don't** fake precision: demo numbers must be plausible and clearly staged
  (PRODUCT.md).
