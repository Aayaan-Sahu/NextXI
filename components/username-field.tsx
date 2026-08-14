"use client";

import { useEffect, useRef, useState } from "react";
import { checkUsername } from "@/app/auth/actions";
import { Field, TextInput } from "@/components/ui";
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

  return (
    <Field>
      Username
      <TextInput
        aria-describedby="username-status"
        aria-invalid={status === "taken" || status === "invalid"}
        autoCapitalize="none"
        autoComplete="username"
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
      <span
        aria-live="polite"
        className={
          status === "taken" || status === "invalid"
            ? "text-xs font-normal text-rust-700"
            : status === "free"
              ? "text-xs font-normal text-vision-700"
              : "text-xs font-normal text-ink-600"
        }
        id="username-status"
      >
        {hint}
      </span>
    </Field>
  );
}
