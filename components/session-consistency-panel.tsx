import type { ConsistencyItem } from "@/components/consistency";
import { ConsistencyRow } from "@/components/report-panel";
import { Panel, SectionHeading } from "@/components/ui";

/**
 * Session-level consistency, computed across the member videos' reports. Shows
 * meters once enough videos are analysed; otherwise a prompt (too few) or a
 * note (discipline not yet supported, e.g. bowling). The two shortfall states
 * are drawn as a dashed box, not as an empty panel — nothing was measured, so
 * nothing should look like a readout.
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

  if (!enough || items.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-cream-500 bg-cream-100 px-[22px] py-[18px]">
        <p className="text-ui leading-relaxed text-ink-800">
          {enough
            ? "Consistency couldn’t be measured from these videos yet."
            : `Add at least ${minVideos} analysed videos to see consistency across this session.`}
        </p>
      </div>
    );
  }

  return (
    <Panel>
      <SectionHeading>Consistency across this session</SectionHeading>
      <p className="mt-1.5 text-caption text-ink-600">
        Every detected shot across {readyCount} analysed videos.
      </p>
      <div className="mt-4 grid gap-3.5">
        {items.map((item) => (
          <ConsistencyRow key={item.label} label={item.label} value={item.consistency} />
        ))}
      </div>
      {hasUnavailable && (
        <p className="mt-3.5 border-t border-cream-300 pt-3 text-caption leading-relaxed text-ink-600">
          — not enough comparable data across these videos to score reliably. Metrics we never
          measured aren’t listed.
        </p>
      )}
    </Panel>
  );
}
