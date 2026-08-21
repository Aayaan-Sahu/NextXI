import type { LandingCopy, LandingLang } from "@/components/landing/copy";

/**
 * EN / हिंदी, as two plain links. `?lang=` is caught in `proxy.ts`, which
 * writes the cookie and bounces back to a clean `/` — so the switch works
 * before hydration, with JavaScript off, and from a shared link alike.
 *
 * Below `sm` only the other language shows — a single "EN" chip on the Hindi
 * page — because the brand bar has no room for a segmented control beside
 * two actions on a phone. The state it would have shown is the page itself.
 */
export function LangToggle({
  copy,
  current,
}: {
  copy: LandingCopy["toggle"];
  current: LandingLang;
}) {
  const options: { lang: LandingLang; label: string }[] = [
    { lang: "en", label: copy.en },
    { lang: "hi", label: copy.hi },
  ];

  return (
    <nav
      aria-label={copy.label}
      className="flex items-center rounded-md border border-cream-200/30 p-0.5 text-caption font-semibold"
    >
      {options.map(({ lang, label }) => {
        const active = lang === current;
        return (
          <a
            key={lang}
            aria-current={active ? "true" : undefined}
            className={`rounded-[4px] px-2 py-0.5 whitespace-nowrap no-underline ${
              active
                ? "bg-cream-50 text-rust-600 max-sm:hidden"
                : "text-cream-200/70 hover:text-cream-50"
            }`}
            href={`/?lang=${lang}`}
            hrefLang={lang}
            lang={lang}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
