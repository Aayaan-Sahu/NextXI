"use client";

import { useEffect, useRef, useState } from "react";
import { inputStyles } from "@/components/ui";

/**
 * Six single-digit boxes for email OTP. Hidden `name="token"` submits the
 * concatenated code. Pasting a 6-digit string fills every box; completing
 * the last digit submits the parent form.
 */
export function OtpBoxes({
  autoSubmit = true,
  length = 6,
  name = "token",
}: {
  autoSubmit?: boolean;
  length?: number;
  name?: string;
}) {
  const [digits, setDigits] = useState(() => Array.from({ length }, () => ""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const submitted = useRef("");

  const token = digits.join("");

  useEffect(() => {
    if (token.length !== length) {
      submitted.current = "";
      return;
    }
    if (!autoSubmit || submitted.current === token) return;
    submitted.current = token;
    inputs.current[0]?.form?.requestSubmit();
  }, [autoSubmit, length, token]);

  function focusAt(index: number) {
    inputs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  }

  function write(next: string[]) {
    setDigits(next.slice(0, length).concat(Array(length).fill("")).slice(0, length));
  }

  return (
    <fieldset className="grid gap-1.5">
      <legend className="text-xs font-bold">Confirmation code</legend>
      <input name={name} type="hidden" value={token} />
      <div className="flex gap-2">
        {digits.map((digit, index) => (
          <input
            aria-label={`Digit ${index + 1} of ${length}`}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            autoFocus={index === 0}
            className={`${inputStyles} w-full min-w-0 px-0 text-center font-mono text-lg font-semibold tracking-widest`}
            inputMode="numeric"
            key={index}
            maxLength={1}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, "");
              if (value.length > 1) {
                const chars = value.slice(0, length).split("");
                const next = digits.map((_, i) => chars[i] ?? (i < index ? digits[i] : ""));
                chars.forEach((char, offset) => {
                  if (index + offset < length) next[index + offset] = char;
                });
                write(next);
                focusAt(index + chars.length);
                return;
              }

              const next = [...digits];
              next[index] = value.slice(-1);
              write(next);
              if (value) focusAt(index + 1);
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digits[index]) {
                event.preventDefault();
                const next = [...digits];
                next[index - 1] = "";
                write(next);
                focusAt(index - 1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                focusAt(index - 1);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                focusAt(index + 1);
              }
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
              if (pasted.length < 2) return;
              event.preventDefault();
              const next = Array.from({ length }, (_, i) => pasted[i] ?? "");
              write(next);
              focusAt(pasted.length);
            }}
            pattern="[0-9]"
            ref={(node) => {
              inputs.current[index] = node;
            }}
            value={digit}
          />
        ))}
      </div>
    </fieldset>
  );
}
