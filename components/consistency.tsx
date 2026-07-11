/**
 * Shared consistency rendering. A consistency value is a 0-100 percentage
 * derived from a coefficient of variation (higher = steadier). Used both by the
 * per-video batting report (across shots) and by the session view (across
 * videos), so the two read as one system.
 */

export type Tone = "light" | "dark";
/** `consistency` is null when there isn't enough comparable data to score it. */
export type ConsistencyItem = { label: string; consistency: number | null };

const LOW_CONSISTENCY_THRESHOLD = 60;

export function ConsistencyBar({ value, tone }: { value: number; tone: Tone }) {
  const dark = tone === "dark";
  const low = value < LOW_CONSISTENCY_THRESHOLD;
  const fill = low ? (dark ? "bg-rust-500" : "bg-rust-600") : "bg-gold-500";
  return (
    <div
      className={`overflow-hidden rounded-sm ${dark ? "h-[3px] bg-black/30" : "h-1 bg-cream-300"}`}
      aria-hidden
    >
      <div className={`h-full rounded-sm ${fill}`} style={{ width: `${value}%` }} />
    </div>
  );
}

/** A labelled list of consistency metrics, each with a percentage and a bar. */
export function ConsistencyList({ items, tone }: { items: ConsistencyItem[]; tone: Tone }) {
  const dark = tone === "dark";
  return (
    <div className="mt-3 grid gap-2.5">
      {items.map((item) => {
        const value = item.consistency;
        return (
          <div key={item.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-[12.5px] ${dark ? "text-cream-200" : "text-ink-900"}`}>
                {item.label}
              </span>
              <span
                className={`font-mono text-[12.5px] font-semibold ${
                  value === null
                    ? dark
                      ? "text-sage-400"
                      : "text-ink-600"
                    : value < LOW_CONSISTENCY_THRESHOLD
                      ? dark
                        ? "text-rust-500"
                        : "text-rust-600"
                      : dark
                        ? "text-gold-500"
                        : "text-ink-900"
                }`}
              >
                {value === null ? "—" : `${value}%`}
              </span>
            </div>
            <div className="mt-1.5">
              {value === null ? (
                <div
                  className={`rounded-sm ${dark ? "h-[3px] bg-black/30" : "h-1 bg-cream-300"}`}
                  aria-hidden
                />
              ) : (
                <ConsistencyBar value={value} tone={tone} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
