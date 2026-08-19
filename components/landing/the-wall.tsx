import { Kicker } from "@/components/ui";
import { WallFigure } from "@/components/landing/wall-figure";

/**
 * The wall — every player who gets a trial, a coach, or a call-up through the
 * platform ends up here. It sits directly after the how-it-works story ends on
 * "Coaches & scouts find you", so the proof lands right where the promise is
 * made. One honours board: a gold-stitched plate for the confirmed name, then
 * open slots that read as upcoming stories. Nothing here is ever invented.
 *
 * Every story added must be a real player, shared with their guardian's
 * permission, first name and initial only — and states only what is actually
 * known (detail line omitted until confirmed). Append entries as they are
 * confirmed; placeholder slots give way on their own.
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
  { title: "Your story will be here soon", note: "Coming up" },
  { title: "More stories on their way", note: "Coming up" },
];

function EntryCopy({ entry }: { entry: WallEntry }) {
  return (
    <>
      <h3 className="font-display text-xl leading-tight font-semibold tracking-[.02em] text-cream-50 uppercase">
        {entry.name}
      </h3>
      {entry.detail && (
        <p className="mt-1 font-mono text-[11px] tracking-[.08em] text-cream-200">{entry.detail}</p>
      )}
      <p className="mt-1 font-mono text-[12px] tracking-[.06em] text-gold-500">{entry.outcome}</p>
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
          <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] text-cream-50 uppercase sm:text-5xl">
            The wall
          </h2>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-cream-200">
            Players who get a trial, a coach, or a call-up through this platform
            can land here — when they and their guardian want that story told.
            Every story is real. There&apos;s room for yours.
          </p>
          <WallFigure className="mx-auto mt-10 w-full max-w-[400px] lg:mx-0" />
        </div>

        <div>
          <div className="relative overflow-hidden rounded-[12px] bg-pitch-800">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-thumb-scanlines opacity-40"
          />

          {featured ? (
            <article className="relative border-b border-gold-500/40 px-6 py-8 sm:px-8">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[11px] font-semibold tracking-[.2em] text-gold-500 uppercase">
                  Noticed
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-[.2em] text-gold-500 uppercase">
                  01
                </span>
              </div>
              <h3 className="mt-5 font-display text-3xl leading-tight font-bold tracking-[.02em] text-cream-50 uppercase sm:text-4xl">
                {featured.name}
              </h3>
              {featured.detail && (
                <p className="mt-2 font-mono text-[11px] tracking-[.08em] text-cream-200">
                  {featured.detail}
                </p>
              )}
              <p className="mt-3 font-mono text-[13px] tracking-[.08em] text-gold-500">
                {featured.outcome}
              </p>
            </article>
          ) : null}

          {rest.map((entry, i) => (
            <article
              key={i}
              className={`relative px-6 py-6 sm:px-8 ${
                i === rest.length - 1 && openSlots.length === 0 ? "" : "border-b border-gold-500/25"
              }`}
            >
              <div className="flex items-center gap-6">
                <span className="font-mono text-[11px] font-semibold tracking-[.2em] text-gold-500 uppercase">
                  {String(i + 2).padStart(2, "0")}
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
                className={`relative px-6 py-7 sm:px-8 ${last ? "" : "border-b border-gold-500/25"}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[11px] font-semibold tracking-[.2em] text-gold-500 uppercase">
                    {slot.note}
                  </span>
                  <span className="font-mono text-[11px] font-semibold tracking-[.2em] text-gold-500 uppercase">
                    {String(n).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-2xl leading-tight font-semibold tracking-[.02em] text-cream-100 uppercase sm:text-3xl">
                  {slot.title}
                </h3>
              </article>
            );
          })}
          </div>

          <p className="mt-5 max-w-[64ch] font-mono text-[11px] leading-relaxed tracking-[.06em] text-cream-200">
            Nothing on this wall is ever invented. Every story is a real
            player, shared with their guardian&apos;s permission — first name
            and initial only.
          </p>
        </div>
      </div>
    </section>
  );
}
