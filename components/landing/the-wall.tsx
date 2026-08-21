import type { LandingCopy, LandingLang } from "@/components/landing/copy";
import { BandHeading, BandIntro } from "@/components/landing/landing-ui";
import { WallFigure } from "@/components/landing/wall-figure";
import { Kicker } from "@/components/ui";

/**
 * The wall — every player who gets a trial, a coach, or a call-up through the
 * platform ends up here. It sits directly after the how-it-works story ends on
 * "Coaches & scouts find you", so the proof lands right where the promise is
 * made.
 *
 * One honours board: copy and the platform's skeleton view of a batter on the
 * left, a gold-stitched plate for the confirmed name on the right, then open
 * slots that read as upcoming stories. Nothing here is ever invented.
 *
 * ENTRIES holds only confirmed stories. Every story added must be a real
 * player, shared with their guardian's permission, first name and initial only
 * — and states only what is actually known (detail line omitted until
 * confirmed). Append entries as they are confirmed; placeholder slots give way
 * on their own.
 */
type WallEntry = {
  /** First name and initial only, e.g. "S. Patel". */
  name: string;
  /** Discipline · age group · club, e.g. "Leg spin · U15 · Wandsworth CC".
      Omitted until confirmed — an entry only ever states what we know. */
  detail?: string;
  /** What actually happened, e.g. "Invited to a county trial" — in each
      landing language, since it's the one line of copy that is data. */
  outcome: Record<LandingLang, string>;
};

const ENTRIES: WallEntry[] = [
  {
    name: "Peter N.",
    outcome: { en: "Scouted by Mubasher H.", hi: "Mubasher H. ने स्काउट किया" },
  },
];

// Placeholders (`copy.wall.placeholders`) are sliced away as real entries
// land, so every line must read correctly at ANY entry count and carry no
// calendar claim that can silently go stale — the footnote stakes this
// section on literal accuracy.

function slotNumber(n: number) {
  return String(n).padStart(2, "0");
}

function EntryCopy({ entry, lang }: { entry: WallEntry; lang: LandingLang }) {
  return (
    <>
      <h3 className="font-display text-title font-semibold text-cream-50 uppercase">
        {entry.name}
      </h3>
      {entry.detail && (
        <p className="mt-1 text-caption text-cream-200/70">{entry.detail}</p>
      )}
      <p className="mt-1 text-ui text-cream-200">{entry.outcome[lang]}</p>
    </>
  );
}

export function TheWall({ copy, lang }: { copy: LandingCopy["wall"]; lang: LandingLang }) {
  const [featured, ...rest] = ENTRIES;
  const openSlots = copy.placeholders.slice(ENTRIES.length);

  return (
    <section className="bg-pitch-900 px-6 py-24 sm:px-12">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-20">
        {/* Left page of the spread: the pitch — copy plus the platform's
            skeleton view of a batter. The board hangs on the right. */}
        <div>
          <Kicker tone="dark">{copy.kicker}</Kicker>
          <BandHeading tone="dark" className="mt-3">
            {copy.heading}
          </BandHeading>
          <BandIntro tone="dark" className="mt-4 max-w-[52ch]">
            {copy.intro}
          </BandIntro>
          <WallFigure className="mx-auto mt-10 w-full max-w-[360px] lg:mx-0" />
        </div>

        <div>
          <div className="relative overflow-hidden rounded-[10px] bg-pitch-800">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-thumb-scanlines opacity-40"
            />

            {featured ? (
              <article className="relative border-b border-cream-400/25 px-7 py-10 sm:px-10 sm:py-12">
                <div className="flex items-baseline justify-between gap-4">
                  <Kicker tone="dark">{copy.featuredKicker}</Kicker>
                  <span className="text-title font-semibold text-amber-500 tabular-nums">
                    {slotNumber(1)}
                  </span>
                </div>
                {/* The plate: the one name on the board today carries the
                    section. Display size, then a step up on wide screens —
                    this is an honours board, not a list row. */}
                <h3 className="mt-6 font-display text-display leading-none font-bold tracking-[.02em] text-cream-50 uppercase sm:text-[44px] lg:text-[56px]">
                  {featured.name}
                </h3>
                {featured.detail && (
                  <p className="mt-3 text-ui text-cream-200/70">{featured.detail}</p>
                )}
                <p className="mt-4 text-lead text-cream-200">{featured.outcome[lang]}</p>
              </article>
            ) : null}

            {/* Keyed by index, not name: "first name and initial only" makes
                duplicate names likely, and a duplicate key would silently drop
                a real player's card. The list is append-only, so index is
                stable. */}
            {rest.map((entry, i) => (
              <article
                key={i}
                className={`relative px-7 py-7 sm:px-10 ${
                  i === rest.length - 1 && openSlots.length === 0
                    ? ""
                    : "border-b border-cream-400/25"
                }`}
              >
                <div className="flex items-center gap-6">
                  <span className="text-caption font-semibold text-amber-500 tabular-nums">
                    {slotNumber(i + 2)}
                  </span>
                  <div className="min-w-0">
                    <EntryCopy entry={entry} lang={lang} />
                  </div>
                </div>
              </article>
            ))}

            {openSlots.map((slot, i) => {
              const n = ENTRIES.length + i + 1;
              const last = i === openSlots.length - 1;
              return (
                <article
                  key={slot.title}
                  className={`relative px-7 py-8 sm:px-10 ${last ? "" : "border-b border-cream-400/25"}`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <Kicker tone="dark">{slot.body}</Kicker>
                    <span className="text-title font-semibold text-amber-500/70 tabular-nums">
                      {slotNumber(n)}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-display font-semibold text-cream-200/55 uppercase">
                    {slot.title}
                  </h3>
                </article>
              );
            })}
          </div>

          <p className="mt-5 max-w-[64ch] text-caption text-cream-200/70">{copy.footnote}</p>
        </div>
      </div>
    </section>
  );
}
