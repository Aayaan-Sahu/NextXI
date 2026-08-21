# NextXI style guide

**Read this before writing or changing any UI.** It is the working rulebook:
what exists, where the configuration lives, and the rules that keep the product
looking like one thing. `DESIGN.md` carries the art direction and the reasoning
behind these choices — this file is how you apply them.

The product has drifted twice already. Both times the cause was the same: a new
surface invented its own sizes and colours instead of using the ones below. If
you find yourself typing a raw pixel value or a hex code, stop — the answer is
almost always a token that already exists.

---

## 1. Where everything lives

| What | Where | Notes |
| --- | --- | --- |
| Colour, type scale, fonts, textures | `app/globals.css` → `@theme` | The only place a colour or a font size is defined. |
| Shared primitives | `components/ui.tsx` | Buttons, fields, headings, chips, dialogs, shells. Build from these. |
| Report rendering | `components/report-panel.tsx`, `report-metric.tsx` | The signature surface. `ReportMetricRow` is the **only** metric renderer — `tone` covers dark surfaces, `compact` covers the pinned hero. |
| Report data model + honesty rules | `components/measured-metric.tsx` | Types, parsing and the reference rules. No JSX — it draws nothing. |
| Art direction and rationale | `DESIGN.md` | Why the system is shaped this way. |
| Landing page | `components/landing/*` | Same system, larger scale in the two pinned heroes. See §2. |
| Landing band type | `components/landing/landing-ui.tsx` | `BandHeading` / `BandIntro` — the only section-head sizes on the landing page. |

Tailwind is configured entirely through `@theme` in `app/globals.css`. There is
no `tailwind.config.js` and no separate CSS file — Tailwind v4 reads the theme
from CSS. Style with utility classes only.

---

## 2. One system, including the landing page

There used to be two registers here, and the landing page was exempt from this
guide. It isn't any more. The landing page uses the same nine type roles, the
same seven colours, the same radii and the same two shadows as the product.

What the landing page still gets is **scale, and only scale**: the two pinned
heroes (`ball-hero`, `hero-scrub-video`) run display type at full-viewport size
over video, because a marketing hero is not a page title. Everything below the
fold — band headings, card headings, body, captions — is the product scale, and
goes through `BandHeading` / `BandIntro` in `components/landing/landing-ui.tsx`
so a new band cannot invent a seventh heading size.

What it does **not** get: a second font, a second palette, its own radii, or its
own shadow. IBM Plex Mono is no longer loaded at all. The phosphor-mint
`vision-*` family and the pink `sage-400` are gone from the theme.

If you are changing shared code, check both surfaces — they now look alike, so a
regression on one is a regression on both.

---

## 3. Type

Nine roles. Every piece of text in the product is one of them. There is no
`text-[13.5px]`, and there is no tenth role.

| Token | Size / leading | Job |
| --- | --- | --- |
| `text-display` | 30 / 1.05 | the page title (Saira Condensed, uppercase) |
| `text-title` | 20 / 1.25 | dialog titles, a report's shot heading, a thread name |
| `text-lead` | 17 / 1.6 | the one introductory paragraph on a reading page |
| `text-body` | 15 / 1.6 | prose, inputs, primary list rows |
| `text-ui` | 14 / 1.5 | labels, buttons, descriptions, secondary rows — the workhorse |
| `text-caption` | 13 / 1.45 | metadata, hints, field labels, table headers |
| `text-micro` | 11 / 1.3 | chips and badges, where the box is the constraint |
| `text-figure` | 28 / 1 | a measured number |
| `text-figure-sm` | 20 / 1 | a measured number inside a row |

**Two faces, and only two.** Saira Condensed (`font-display`) names pages and
sections. Public Sans carries everything else. There is no mono anywhere in the
codebase and none is loaded — aligned figures use `tabular-nums`. The wordmark
uses `font-brand` — the same Saira, on its own token, because a brand mark never
follows the page's language.

The one place the faces change is the Hindi landing page (`<main lang="hi">`,
offered to visitors in India): Hind stands in for Public Sans and Khand for
Saira, role for role, via `[lang="hi"]` rules at the end of `globals.css`. Same
nine sizes, same seven colours, every word — the demo report included.

**Emphasis comes from weight and colour, not another size.** A field label and a
caption are both 13px; the label is semibold ink, the caption is regular
`ink-600`. If you want something to stand out, do not reach for 13.5px.

**The only exception to the scale** is the 16px floor on text inputs
(`text-base sm:pointer-fine:text-body`), which stops iOS Safari auto-zooming a
focused field. It is in `inputStyles` — use that and you get it for free.

### Rules

- **The Nine Roles Rule.** If new text does not fit one of the nine, you have not
  decided which one it is. The scale does not need a tenth step.
- **The Rare Eyebrow Rule.** Tracked uppercase appears in exactly two places:
  `SectionHeading` (opens a content group) and `Kicker` (labels a panel that has
  no other heading — the report header, the latest-report band). **Never above an
  `h1` that says the same words.** "GUARDIAN HOME / Aayaan Verma" spends the
  rarest treatment in the system on a repeat. Letter-spacing anywhere else must
  be functional: the approval code and the typed DELETE confirmation, where you
  read character by character.
- **The Quiet Facts Rule.** Dates, sizes, counts, model versions are
  `text-caption` in `ink-600`, joined with " · ". They sit beside the thing they
  describe and never compete with it.

---

## 4. Colour

Seven values carry the product.

| Role | Token | Value |
| --- | --- | --- |
| Brand, links, destructive, negative numbers | `rust-600` | `#8a2116` |
| Data emphasis — the XI, active markers, meter fills | `amber-500` | `#e8a92e` |
| Primary action, and only that | `gold-500` (peach) | `#f2c79b` |
| Headings and dark panels | `ink-900` / `pitch-900` | `#241c15` |
| Page ground | `cream-200` | `#f3ebdd` |
| Raised surface, fields | `cream-50` | `#fffcf5` |
| The hairline | `cream-400` | `#e0d6c3` |

Supporting steps: `ink-800` body, `ink-600` captions, `ink-400` disabled;
`cream-100` tint bands, `cream-250` flash grounds and meter tracks, `cream-300`
secondary buttons, `cream-350` skeletons, `cream-450` benchmark bands,
`cream-500` dashed borders. Errors: `rust-50` ground, `rust-300` border,
`rust-800` copy. `moss-600` is the one green — a positive verdict in a report.

`olive-*` is the video family (clip placeholders, the player well, a player's
avatar) so a clip never reads as a panel. `pitch-800` and `pitch-700` are the
landing page's darker bands.

On a dark ground the muted step is `cream-200` at alpha (`/70`, `/80`), not a
separate token. `sage-400` and `vision-*` used to fill that job and both read as
a different palette; they no longer exist.

### Rules

- **The Three Jobs Rule.** Amber means *measured*. Peach means *do this*. Maroon
  means *brand, or something lost*. A peach meter, an amber button or a maroon
  progress bar is wrong.
- **The One Hairline Rule.** `cream-400` at 1px is the only rule weight. Separate
  with spacing first, this hairline second. `cream-500` is for dashed boundaries.
- **The Measured Rule.** Colour passes judgment in exactly two places: a value on
  the wrong side of its reference band renders maroon, and a consistency figure
  under 60 fills maroon instead of amber. Nowhere else.
- **The Suppression Rule.** A destructive action that repeats once per row is
  `ink-600` at rest, maroon on hover. Six maroon "Delete" links down a table make
  the table about deleting.

---

## 5. Primitives — build from these

Everything below is exported from `components/ui.tsx`. Extend it there rather
than restyling locally; a local variant is how the system fragments.

**Structure** — `PageShell`, `BarShell` + `SubBar` + `Tabs` (roster/inbox
surfaces), `PageTitle`, `PageHeader`, `SectionHeading`, `SectionHead`, `Panel`.

**Forms** — `Form`, `Field`, `FieldGroup`, `FieldHint`, `TextInput`, `TextArea`,
`Select`, `Switch`, `CheckboxChip`, `inputStyles`. Passwords go through
`PasswordInput` (a **Show/Hide word**, not an eye glyph — the system has no icon
vocabulary). Form submits go through `SubmitButton`, which disables and spins in
place; spinners exist nowhere else.

**Actions** — `PrimaryButton` (peach, the only peach in the product),
`SecondaryButton`, `DestructiveButton` (maroon outline), `DangerButton` (filled
maroon — **only** the confirming action inside a destructive dialog),
`GhostButton` (the cancel beside it), `TextLink`.

**Feedback** — `Notice` (left rule + tinted ground, never a toast, never a full
border), `EmptyState` (dashed box, one sentence, optional CTA, never an
illustration), `ConfirmDialog` + `DialogActions`, `SkeletonBlock`.

**Data** — `Stat`, `Meter`, `Chip`, `Kicker`, `GatePanel`.

Report rows are `ReportMetricRow`; the report shell is `ReportPanel`. Do not
build a second way to show a measurement.

---

## 6. Composition rules

These are the ones that get broken most often.

1. **Group with spacing, then one hairline. A card is a last resort.** A `Panel`
   is for a genuinely raised surface — the report, a consistency readout. It is
   not a wrapper for a list. Do not nest cards: if something inside a Panel wants
   its own Panel, it wants a section head and some spacing.

2. **Suppress before you emphasise.** Ask what can become quieter, not what else
   can be highlighted. Secondary information should be smaller, lower weight and
   less saturated — not given its own badge, border and background.

3. **No micro-component overload.** `Front elbow 91 / +4 from last session` is
   two lines of text, not five styled elements. Not every fact needs a pill, an
   icon or a container.

4. **Guard every grid track.** Use `grid-cols-[minmax(0,1fr)_320px]`, never
   `grid-cols-[1fr_320px]`. A `1fr` track floors at its content's min-content
   width, so one long unbroken string stretches the whole page. For the same
   reason, use `line-clamp-1` on user-authored prose rather than `truncate`
   (which sets `white-space: nowrap`), and keep `min-w-0` on flex and grid
   children that hold text.

5. **Do not narrate the interface.** Copy earns its place by telling the user
   something they could not infer. "Opening a video marks it reviewed" stays.
   "Keep logging matches — that's how form sticks" does not.

6. **Only draw a number you measured.** A meter with no current value is a lie
   dressed as a chart. Where the data does not exist, say so in words — the
   report's "Not measured" state is the pattern.

7. **Direct labels beat legends.** If each row already names its comparison, a
   key at the top is redundant encoding the reader has to look back and forth
   for.

8. **Motion is feedback, not decoration.** The mount reveals
   (`animate-crease-fade`, `animate-crease-rise`) and hover reveals are the whole
   vocabulary. Guard anything scroll-driven or infinite with
   `prefers-reduced-motion`. Note that `crease-rise` must never use `forwards` —
   a retained transform makes the element the containing block for `position:
   fixed` descendants and un-anchors the confirm dialogs.

9. **Responsive is a different composition**, not `grid-cols-3 md:grid-cols-1`.
   Reconsider hierarchy, density and touch targets at small sizes.

---

## 7. Before you call a UI change done

Run these, in this order:

```
bunx tsc --noEmit
bun run lint
bun run build
```

Then check the work against this list:

- [ ] Every text size is one of the nine roles. Grep your diff for
      `text-[` — the only legitimate hit is a wordmark or the guardian-code hero.
- [ ] No `font-mono` anywhere — the font is not loaded and `--font-mono` is gone.
- [ ] No `bg-white`, `text-white` or `stroke-white`. Cream is the lightest value.
- [ ] Drop shadows are `shadow-float` or nothing. A resting card has none.
- [ ] No hex codes or `rgb()` in components; colours come from tokens.
- [ ] Tracked uppercase only via `SectionHeading` or `Kicker`, and no `Kicker`
      sitting above an `h1` that repeats it.
- [ ] Amber is not a button; peach is not a data fill.
- [ ] New grid tracks use `minmax(0,1fr)`.
- [ ] Any new card earns its container — spacing alone was not enough.
- [ ] Any new sentence tells the user something they could not infer.
- [ ] Section headings on the landing page go through `BandHeading`, and only
      the two pinned heroes carry display type above `text-display`.

The standard is not "does this look polished". It is **does every decision make
sense for this information and this product** — and a polished interface is one
where the right things were emphasised and everything else was allowed to go
quiet.
