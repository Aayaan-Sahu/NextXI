import { cookies, headers } from "next/headers";
import { isLandingLang, LANG_COOKIE, type LandingLang } from "@/lib/landing-lang";

export type LandingLocale = {
  lang: LandingLang;
  /** Whether to offer the EN / हिंदी switch at all. Visitors who'd never
      want Hindi never see it — it's a courtesy for India, not a feature. */
  showToggle: boolean;
};

/**
 * Which language the landing page renders in, in order of authority:
 *
 *   1. The visitor's own choice (`nextxi_lang` cookie, set by the toggle).
 *   2. Where they are — `x-vercel-ip-country` is stamped by Vercel's edge
 *      from the connecting IP and overwrites anything a client sends, so it
 *      can't be spoofed in production. Absent locally, so dev falls through.
 *   3. What their browser asks for — a primary `Accept-Language` of Hindi.
 *   4. English.
 *
 * Geo is a guess, not a fact: plenty of Indian visitors read English first,
 * and a chunk of the country doesn't speak Hindi at all. That's why the
 * choice sticks for a year once made, and why the toggle shows the moment
 * either signal fires rather than only while Hindi is on.
 */
export async function resolveLandingLocale(): Promise<LandingLocale> {
  const [jar, h] = await Promise.all([cookies(), headers()]);

  const saved = jar.get(LANG_COOKIE)?.value;
  const chosen = isLandingLang(saved) ? saved : undefined;

  const inIndia = h.get("x-vercel-ip-country")?.toUpperCase() === "IN";
  const prefersHindi = /^\s*hi\b/i.test(h.get("accept-language") ?? "");

  const lang = chosen ?? (inIndia || prefersHindi ? "hi" : "en");
  return { lang, showToggle: chosen !== undefined || inIndia || prefersHindi || lang === "hi" };
}
