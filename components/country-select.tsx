"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/players";

/**
 * A custom country dropdown with flag emoji, mirroring the onboarding design.
 * Submits the selected country name via a hidden input under `name`.
 */
export function CountrySelect({
  defaultValue = DEFAULT_COUNTRY,
  name,
}: {
  defaultValue?: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);
  const ref = useRef<HTMLDivElement>(null);

  const current = COUNTRY_OPTIONS.find((c) => c.label === selected) ?? COUNTRY_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <input name={name} type="hidden" value={selected} />
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between rounded-md border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm font-normal text-ink-900 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 focus:outline-none"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-[17px] leading-none">{current.flag}</span>
          <span>{current.label}</span>
        </span>
        <span className="text-[11px] text-ink-600">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-auto rounded-md border border-cream-400 bg-cream-50 py-1 shadow-xl shadow-black/15"
          role="listbox"
        >
          {COUNTRY_OPTIONS.map((country) => {
            const active = country.label === selected;
            return (
              <li key={country.label}>
                <button
                  aria-selected={active}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-cream-100 ${
                    active ? "bg-cream-100 font-semibold" : "font-normal"
                  }`}
                  onClick={() => {
                    setSelected(country.label);
                    setOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[17px] leading-none">{country.flag}</span>
                    <span>{country.label}</span>
                  </span>
                  {active && <span className="text-[13px] text-gold-500">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
