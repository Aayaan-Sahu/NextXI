"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  HANDEDNESS_LABELS,
  isVideoDiscipline,
  VIDEO_DISCIPLINES,
} from "@/lib/videos";

const selectStyles =
  "rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-neutral-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:bg-stone-100 disabled:text-stone-500";

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
      <span className="text-sm font-medium text-stone-600">Filter</span>
      <select
        aria-label="Discipline"
        className={selectStyles}
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
      </select>
      <select
        aria-label="Variation or shot"
        className={selectStyles}
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
      </select>
      <select
        aria-label="Handedness"
        className={selectStyles}
        onChange={(event) => applyFilters({ handedness: event.target.value })}
        value={handedness}
      >
        <option value="">Any hand</option>
        {Object.entries(HANDEDNESS_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label} handed
          </option>
        ))}
      </select>
    </div>
  );
}
