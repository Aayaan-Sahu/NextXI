/** The landing page's two languages — pure constants, safe in the proxy. */
export type LandingLang = "en" | "hi";

export function isLandingLang(value: unknown): value is LandingLang {
  return value === "en" || value === "hi";
}

/** Set by `proxy.ts` when a visitor picks a language; a year, site-wide. */
export const LANG_COOKIE = "nextxi_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
