"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Field, Select } from "@/components/ui";
import {
  HANDEDNESS_LABELS,
  isVideoDiscipline,
  VIDEO_DISCIPLINES,
} from "@/lib/videos";

/** URL-driven tag filters; the page filters server-side from searchParams. */
export function VideoFilterBar({ unviewedCount }: { unviewedCount: number }) {
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

  const active = Boolean(discipline || variation || handedness);

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-cream-400 pb-5">
      <div className="flex flex-wrap items-end gap-3.5">
        <Field className="text-caption">
          Discipline
          <Select
            className="sm:w-[180px]"
            onChange={(event) => applyFilters({ discipline: event.target.value, variation: "" })}
            value={discipline}
          >
            <option value="">All disciplines</option>
            {Object.entries(VIDEO_DISCIPLINES).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field className="text-caption">
          {discipline === "BATTING" ? "Shot" : "Variation"}
          <Select
            className="sm:w-[180px]"
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
        </Field>
        <Field className="text-caption">
          Handedness
          <Select
            className="sm:w-[150px]"
            onChange={(event) => applyFilters({ handedness: event.target.value })}
            value={handedness}
          >
            <option value="">Any</option>
            {Object.entries(HANDEDNESS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label} handed
              </option>
            ))}
          </Select>
        </Field>
        {active ? (
          <button
            className="cursor-pointer pb-2.5 text-ui font-semibold text-rust-600 hover:text-rust-700"
            onClick={() => applyFilters({ discipline: "", variation: "", handedness: "" })}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="pb-2.5 text-ui text-ink-600">
        {unviewedCount} unviewed video{unviewedCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
