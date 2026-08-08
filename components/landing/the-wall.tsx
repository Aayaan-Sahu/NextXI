import { Kicker } from "@/components/ui";

/**
 * The wall — every player who gets a trial, a coach, or a call-up through the
 * platform ends up here. It sits directly after the how-it-works story ends on
 * "Coaches & scouts find you", so the proof lands right where the promise is
 * made. Styled as the design system's dark honours board (scanline scoreboard
 * panels, gold for achievement).
 *
 * ENTRIES is deliberately empty at launch and the section says so: the wall's
 * credibility rests on nothing here ever being invented. Every story added must
 * be a real player, shared with their guardian's permission, first name and
 * initial only. Add entries to ENTRIES as they are confirmed — the placeholder
 * slots give way on their own.
 */
type WallEntry = {
  /** First name and initial only, e.g. "S. Patel". */
  name: string;
  /** Discipline · age group · club, e.g. "Leg spin · U15 · Wandsworth CC". */
  detail: string;
  /** What actually happened, e.g. "Invited to a county trial". */
  outcome: string;
};

const ENTRIES: WallEntry[] = [];

// Placeholders are sliced away as real entries land, so every line must read
// correctly at ANY entry count and carry no calendar claim that can silently
// go stale — the footnote below stakes this section on literal accuracy.
const PLACEHOLDERS = [
  { big: "The first story", small: "lands here" },
  { big: "More stories", small: "on their way" },
  { big: "Your name", small: "could be here" },
];

export function TheWall() {
  return (
    <section className="bg-pitch-900 px-6 py-24 sm:px-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <header className="mb-12 text-center">
          <Kicker tone="dark">Noticed through NextXI</Kicker>
          <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] text-cream-50 uppercase sm:text-5xl">
            The wall
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-sage-400">
            Players who get a trial, a coach, or a call-up through this platform
            can land here — when they and their guardian want that story told. It
            starts empty. It won&apos;t stay that way.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Keyed by index, not name: "first name and initial only" makes
              duplicate names likely, and a duplicate key would silently drop a
              real player's card. The list is append-only, so index is stable. */}
          {ENTRIES.map((entry, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-[12px] bg-pitch-800 p-6"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-thumb-scanlines opacity-40"
              />
              <div className="relative">
                <span className="font-mono text-[11px] font-semibold tracking-[.2em] text-gold-500 uppercase">
                  Noticed
                </span>
                <h3 className="mt-2 font-display text-xl leading-tight font-semibold text-cream-200 uppercase">
                  {entry.name}
                </h3>
                <p className="mt-1 font-mono text-[11px] tracking-[.08em] text-sage-400">
                  {entry.detail}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-cream-200/85">
                  {entry.outcome}
                </p>
              </div>
            </div>
          ))}

          {PLACEHOLDERS.slice(ENTRIES.length).map((slot, i) => (
            <div
              key={slot.big}
              className="relative flex min-h-36 flex-col justify-between overflow-hidden rounded-[12px] bg-pitch-800 p-6"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-thumb-scanlines opacity-40"
              />
              <span className="relative font-mono text-[11px] font-semibold tracking-[.2em] text-gold-500/70 uppercase">
                {String(ENTRIES.length + i + 1).padStart(2, "0")}
              </span>
              <div className="relative">
                <span className="font-display text-xl leading-tight font-semibold text-cream-200/55 uppercase">
                  {slot.big}
                </span>
                <span className="mt-1.5 block font-mono text-[11px] font-semibold tracking-[.2em] text-gold-500 uppercase">
                  {slot.small}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-[64ch] text-center font-mono text-[11px] leading-relaxed tracking-[.06em] text-sage-400">
          Nothing on this wall is ever invented. Every story is a real player,
          shared with their guardian&apos;s permission — first name and initial
          only.
        </p>
      </div>
    </section>
  );
}
