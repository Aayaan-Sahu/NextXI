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
  /** What actually happened, e.g. "Invited to a county trial". */
  outcome: string;
};

const ENTRIES: WallEntry[] = [
  { name: "Peter N.", outcome: "Scouted by Mubasher H." },
];

// Placeholders are sliced away as real entries land, so every line must read
// correctly at ANY entry count and carry no calendar claim that can silently
// go stale — the footnote below stakes this section on literal accuracy.
const PLACEHOLDERS = [
  { title: "The first story", note: "Lands here" },
  { title: "More stories", note: "On their way" },
  { title: "Your name", note: "Could be here" },
];

function slotNumber(n: number) {
  return String(n).padStart(2, "0");
}

function EntryCopy({ entry }: { entry: WallEntry }) {
  return (
    <>
      <h3 className="font-display text-title font-semibold text-cream-50 uppercase">
        {entry.name}
      </h3>
      {entry.detail && (
        <p className="mt-1 text-caption text-cream-200/70">{entry.detail}</p>
      )}
      <p className="mt-1 text-ui text-cream-200">{entry.outcome}</p>
    </>
  );
}

export function TheWall() {
  const [featured, ...rest] = ENTRIES;
  const openSlots = PLACEHOLDERS.slice(ENTRIES.length);

  return (
    <section className="bg-pitch-900 px-6 py-24 sm:px-12">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        {/* Left page of the spread: the pitch — copy plus the platform's
            skeleton view of a batter. The board hangs on the right. */}
        <div>
          <Kicker tone="dark">Noticed through NextXI</Kicker>
          <BandHeading tone="dark" className="mt-3">
            The wall
          </BandHeading>
          <BandIntro tone="dark" className="mt-4 max-w-[52ch]">
            Players who get a trial, a coach, or a call-up through this platform
            can land here — when they and their guardian want that story told.
            Every story is real. There&apos;s room for yours.
          </BandIntro>
          <WallFigure className="mx-auto mt-10 w-full max-w-[400px] lg:mx-0" />
        </div>

        <div>
          <div className="relative overflow-hidden rounded-[10px] bg-pitch-800">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-thumb-scanlines opacity-40"
            />

            {featured ? (
              <article className="relative border-b border-cream-400/25 px-6 py-8 sm:px-8">
                <div className="flex items-baseline justify-between gap-4">
                  <Kicker tone="dark">Noticed</Kicker>
                  <span className="text-caption font-semibold text-amber-500 tabular-nums">
                    {slotNumber(1)}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-title font-bold tracking-[.02em] text-cream-50 uppercase">
                  {featured.name}
                </h3>
                {featured.detail && (
                  <p className="mt-2 text-caption text-cream-200/70">{featured.detail}</p>
                )}
                <p className="mt-3 text-ui text-cream-200">{featured.outcome}</p>
              </article>
            ) : null}

            {/* Keyed by index, not name: "first name and initial only" makes
                duplicate names likely, and a duplicate key would silently drop
                a real player's card. The list is append-only, so index is
                stable. */}
            {rest.map((entry, i) => (
              <article
                key={i}
                className={`relative px-6 py-6 sm:px-8 ${
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
                    <EntryCopy entry={entry} />
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
                  className={`relative px-6 py-7 sm:px-8 ${last ? "" : "border-b border-cream-400/25"}`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <Kicker tone="dark">{slot.note}</Kicker>
                    <span className="text-caption font-semibold text-amber-500/70 tabular-nums">
                      {slotNumber(n)}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-title font-semibold text-cream-200/55 uppercase">
                    {slot.title}
                  </h3>
                </article>
              );
            })}
          </div>

          <p className="mt-5 max-w-[64ch] text-caption text-cream-200/70">
            Nothing on this wall is ever invented. Every story is a real player,
            shared with their guardian&apos;s permission — first name and initial
            only.
          </p>
        </div>
      </div>
    </section>
  );
}
