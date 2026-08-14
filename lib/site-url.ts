import { headers } from "next/headers";

/** Canonical production origin. Apex `nextxi.pro` 308s here. */
export const CANONICAL_SITE_URL = "https://www.nextxi.pro";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function isUsablePublicOrigin(url: string) {
  try {
    const host = new URL(url).hostname;
    return host !== "localhost" && !host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

/**
 * Production auth emails and post-confirm redirects always land on
 * www.nextxi.pro. A missing `NEXT_PUBLIC_SITE_URL`, a leftover
 * cricket-platform-nine.vercel.app value, or VERCEL_URL would otherwise mint
 * links that look like a random preview and fail (PKCE cookie on nextxi.pro,
 * confirm hop on another host).
 */
export function productionSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ? stripSlash(process.env.NEXT_PUBLIC_SITE_URL)
    : "";

  if (configured && isUsablePublicOrigin(configured)) {
    return configured === "https://nextxi.pro" ? CANONICAL_SITE_URL : configured;
  }

  return CANONICAL_SITE_URL;
}

/** Base URL baked into verification and reset emails. */
export async function authEmailOrigin() {
  if (process.env.VERCEL_ENV === "production") return productionSiteUrl();

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return (
    (await headers()).get("origin") ??
    (process.env.NEXT_PUBLIC_SITE_URL
      ? stripSlash(process.env.NEXT_PUBLIC_SITE_URL)
      : null) ??
    "http://localhost:3000"
  );
}
