# NextXI

## What it is

A cricket talent platform: young players upload technique videos, an external
AI/CV pipeline turns them into coaching reports (scored metrics, timestamped
notes), and verified coaches and scouts discover players on evidence. Guardians
get linked accounts with full visibility; coaches are admin-approved before
they can contact any player.

## Register

Product (app UI) for everything under `/dashboard`, `/onboarding`, `/auth`.
Brand (design is the product) for the public landing page at `/` and any
future marketing surfaces.

## Target users

- **Players (primary)**: youth cricketers (mostly U13–U19) who want structured
  feedback and a way to get seen without personal-coach money or connections.
- **Guardians**: parents who approve and supervise a minor's presence.
- **Coaches & scouts**: verified adults looking for talent with evidence.

## Brand personality

Ball-leather red, cream, and gold-tan ("Crease" design system, committed in
`app/globals.css`). Broadcast-scoreboard aesthetic: condensed display type
(Saira Condensed), mono data labels (IBM Plex Mono), scanline and seam-stitch
textures. Confident and sporty, not corporate; the product's credibility comes
from showing real coaching-report UI rather than abstract illustration.

Voice words: measured, floodlit, earned.

## Anti-references

- Generic SaaS landing pages (gradient heroes, icon-card grids).
- Youth-sports clip-art cheerfulness; this is a serious tool for serious kids.
- Fake-precision marketing: demo numbers are fine but must be plausible and
  clearly staged, never dressed up as live analysis of a real player.

## Strategic design principles

1. The coaching report is the hero artifact; marketing renders the real
   `ReportPanel` component, never a mockup that can drift.
2. Safety is a feature: guardian visibility and coach verification are selling
   points, stated plainly.
3. The analysis/CV layer may use a colder, technical visual language than the
   Crease wrapper; the contrast between warm brand and precise machine is the
   product story.
