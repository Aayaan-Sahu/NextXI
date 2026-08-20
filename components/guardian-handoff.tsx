"use client";

import { useState } from "react";
import { PUBLIC_SITE_URL } from "@/lib/contact";

function guardianMessage(code: string, playerName: string) {
  const firstName = playerName.split(" ")[0] || playerName;
  return [
    "Hi,",
    "",
    `I started a NextXI player account (${playerName}). Because I'm under 18, a parent or guardian needs to approve it before I can use the platform.`,
    "",
    `1. Create an account at ${PUBLIC_SITE_URL}/auth?mode=sign-up`,
    `2. After you confirm your email, open “Parent or guardian? Link a child's account” on the profile screen`,
    `3. Enter this approval code: ${code}`,
    "",
    "Thanks,",
    firstName,
  ].join("\n");
}

/** Copy / share / email so an under-18 player can hand the code to a parent. */
export function GuardianHandoff({
  code,
  playerName,
}: {
  code: string;
  playerName: string;
}) {
  const [copied, setCopied] = useState(false);
  const message = guardianMessage(code, playerName);
  const signupUrl = `${PUBLIC_SITE_URL}/auth?mode=sign-up`;
  const parentMailto = `mailto:?subject=${encodeURIComponent(
    `NextXI approval code for ${playerName}`,
  )}&body=${encodeURIComponent(message)}`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "NextXI guardian approval",
          text: message,
          url: signupUrl,
        });
        return;
      } catch {
        return;
      }
    }
    window.location.href = parentMailto;
  }

  const buttonClass =
    "cursor-pointer rounded-md border border-cream-500 bg-transparent px-3.5 py-2 text-caption font-semibold text-ink-900 hover:bg-cream-100";

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button className={buttonClass} onClick={copyCode} type="button">
        {copied ? "Copied" : "Copy code"}
      </button>
      <button className={buttonClass} onClick={share} type="button">
        Share with a parent
      </button>
      <a className={`${buttonClass} no-underline`} href={parentMailto}>
        Email a parent
      </a>
    </div>
  );
}
