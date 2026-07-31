"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { inputStyles } from "@/components/ui";

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      aria-hidden
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      viewBox="0 0 24 24"
    >
      {off ? (
        <>
          <path d="M17.94 17.94A10.5 10.5 0 0 1 12 20c-7 0-10-8-10-8a19.5 19.5 0 0 1 5.06-5.94M9.9 4.24A9.9 9.9 0 0 1 12 4c7 0 10 8 10 8a19.4 19.4 0 0 1-3.23 4.35" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <path d="M2 2l20 20" />
        </>
      ) : (
        <>
          <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

/** TextInput for passwords with a show/hide toggle. */
export function PasswordInput(props: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} className={`${inputStyles} w-full pr-11`} type={visible ? "text" : "password"} />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded text-ink-600 hover:text-ink-900"
        onClick={(event) => {
          // Stop the wrapping <label> from re-focusing the input mid-toggle.
          event.preventDefault();
          setVisible((state) => !state);
        }}
        type="button"
      >
        <EyeIcon off={visible} />
      </button>
    </div>
  );
}
