"use client";

import { useEffect, useRef, useState } from "react";
import { checkUsername } from "@/app/auth/actions";
import { Field, FieldHint } from "@/components/ui";
import { USERNAME_PATTERN, usernameFromName } from "@/lib/usernames";

export function UsernameHandleField({ nameValue }: { nameValue: string }) {
  const suggested = usernameFromName(nameValue);
  const [override, setOverride] = useState<string | null>(null);
  const username = override ?? suggested;
  const [check, setCheck] = useState<{
    username: string;
    result: "free" | "taken";
  } | null>(null);
  const request = useRef(0);

  const valid = USERNAME_PATTERN.test(username);
  const status = !username
    ? "idle"
    : !valid
      ? "invalid"
      : check?.username === username
        ? check.result
        : "checking";

  useEffect(() => {
    if (!valid) return;

    const id = ++request.current;
    const timer = window.setTimeout(() => {
      void checkUsername(username).then((result) => {
        if (id !== request.current || result === "invalid") return;
        setCheck({ username, result });
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [username, valid]);

  const hint =
    status === "free"
      ? "Available."
      : status === "taken"
        ? "That username is taken."
        : status === "invalid"
          ? "3–30 letters, numbers, or underscores."
          : status === "checking"
            ? "Checking…"
            : "Public on your profile. We'll suggest one from your name.";

  const bad = status === "taken" || status === "invalid";

  return (
    <Field>
      Username
      {/* The @ is chrome, not content — it sits inside the control so the
          value a player types is exactly the handle they get. */}
      <span
        className={`flex items-center gap-1 rounded-md border bg-cream-50 px-3 focus-within:ring-2 focus-within:ring-amber-500/30 ${
          bad ? "border-rust-300 bg-rust-100 focus-within:border-rust-600" : "border-cream-400 focus-within:border-ink-900"
        }`}
      >
        <span className="text-body text-ink-600">@</span>
        <input
          aria-describedby="username-status"
          aria-invalid={bad}
          autoCapitalize="none"
          autoComplete="username"
          className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-base font-normal text-ink-900 focus:outline-none sm:pointer-fine:text-body"
          name="username"
          onChange={(event) => {
            setOverride(
              event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30),
            );
          }}
          pattern="[a-z0-9_]{3,30}"
          required
          spellCheck={false}
          title="Use 3-30 letters, numbers, or underscores."
          type="text"
          value={username}
        />
      </span>
      <FieldHint tone={bad ? "error" : status === "free" ? "ok" : "muted"}>
        <span aria-live="polite" id="username-status">
          {hint}
        </span>
      </FieldHint>
    </Field>
  );
}
