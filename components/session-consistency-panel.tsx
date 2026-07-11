import { ConsistencyList, type ConsistencyItem } from "@/components/consistency";
import { Kicker, Panel } from "@/components/ui";

/**
 * Session-level consistency, computed across the member videos' reports. Shows
 * bars once enough videos are analysed; otherwise a prompt (too few) or a note
 * (discipline not yet supported, e.g. bowling).
 */
export function SessionConsistencyPanel({
  items,
  readyCount,
  minVideos,
}: {
  items: ConsistencyItem[];
  readyCount: number;
  minVideos: number;
}) {
  const enough = readyCount >= minVideos;
  const hasUnavailable = items.some((item) => item.consistency === null);

  return (
    <Panel title="Consistency">
      {enough && items.length > 0 ? (
        <>
          <Kicker>Across {readyCount} analysed videos</Kicker>
          <ConsistencyList items={items} tone="light" />
          {hasUnavailable && (
            <p className="mt-3 text-[11px] text-ink-600">
              — not enough comparable data across these videos to score reliably.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-600">
          {enough
            ? "Consistency isn’t available for this discipline yet."
            : `Add at least ${minVideos} analysed videos to see consistency across this session.`}
        </p>
      )}
    </Panel>
  );
}
