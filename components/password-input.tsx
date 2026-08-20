"use client";

import type { ComponentProps } from "react";
import { useState } from "react";

/**
 * TextInput for passwords with a Show/Hide toggle. The toggle is a word, not
 * an icon — the system has no icon vocabulary, so a glyph here would be the
 * only one in the product.
 */
export function PasswordInput({ className = "", ...props }: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-md border border-cream-400 bg-cream-50 px-3 focus-within:border-ink-900 focus-within:ring-2 focus-within:ring-amber-500/30">
      <input
        {...props}
        className={`min-w-0 flex-1 border-none bg-transparent py-2.5 text-base font-normal text-ink-900 placeholder:text-ink-600 focus:outline-none sm:pointer-fine:text-body ${className}`}
        type={visible ? "text" : "password"}
      />
      <button
        aria-pressed={visible}
        className="shrink-0 cursor-pointer text-caption font-semibold text-ink-600 hover:text-ink-900"
        onClick={(event) => {
          // Stop the wrapping <label> from re-focusing the input mid-toggle.
          event.preventDefault();
          setVisible((state) => !state);
        }}
        type="button"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
