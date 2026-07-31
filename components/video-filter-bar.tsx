"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";
import {
  HANDEDNESS_LABELS,
  isVideoDiscipline,
  VIDEO_DISCIPLINES,
} from "@/lib/videos";

/** URL-driven tag filters; the page filters server-side from searchParams. */
export function VideoFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const discipline = searchParams.get("discipline") ?? "";
  const variation = searchParams.get("variation") ?? "";
  const handedness = searchParams.get("handedness") ?? "";

  function applyFilters(next: { discipline?: string; variation?: string; handedness?: string }) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-[11px] font-semibold tracking-[.2em] text-ink-600 uppercase">
        Filter
      </span>
      <Select
        aria-label="Discipline"
        onChange={(event) =>
          applyFilters({ discipline: event.target.value, variation: "" })
        }
        value={discipline}
      >
        <option value="">All disciplines</option>
        {Object.entries(VIDEO_DISCIPLINES).map(([key, { label }]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Variation or shot"
        disabled={!isVideoDiscipline(discipline)}
        onChange={(event) => applyFilters({ variation: event.target.value })}
        value={variation}
      >
        <option value="">All variations</option>
        {isVideoDiscipline(discipline) &&
          VIDEO_DISCIPLINES[discipline].variations.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
      </Select>
      <Select
        aria-label="Handedness"
        onChange={(event) => applyFilters({ handedness: event.target.value })}
        value={handedness}
      >
        <option value="">Any hand</option>
        {Object.entries(HANDEDNESS_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label} handed
          </option>
        ))}
      </Select>
    </div>
  );
}
