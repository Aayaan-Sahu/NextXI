import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BallHero } from "@/components/landing/ball-hero";
import { getLandingCopy } from "@/components/landing/copy";
import { FeaturesSteps } from "@/components/landing/features-steps";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroScrubVideo } from "@/components/landing/hero-scrub-video";
import { hindiFontVars } from "@/components/landing/hindi-fonts";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { MoreFeatures } from "@/components/landing/more-features";
import { TheWall } from "@/components/landing/the-wall";
import { TrustStrip } from "@/components/landing/trust-strip";
import { type WaitlistState } from "@/components/landing/waitlist-form";
import { getCurrentUser, getOnboardingStatus, isAdmin } from "@/lib/auth";
import { resolveLandingLocale } from "@/lib/landing-locale";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{ waitlist?: string | string[] }>;

function waitlistState(value: string | undefined): WaitlistState | undefined {
  return value === "joined" || value === "invalid" ? value : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await resolveLandingLocale();
  if (lang === "en") return {};
  const { meta } = getLandingCopy(lang);
  return {
    title: { absolute: meta.title },
    description: meta.description,
    // Replaces the layout's openGraph wholesale (metadata merges shallowly),
    // so the shared fields come along.
    openGraph: { siteName: "NextXI", type: "website", locale: "hi_IN" },
  };
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();

  if (user) {
    if (isAdmin(user)) redirect("/dashboard/admin");

    const status = await getOnboardingStatus(user.id);
    redirect(status.role ? "/dashboard" : "/onboarding");
  }

  const [{ lang, showToggle }, params] = await Promise.all([resolveLandingLocale(), searchParams]);
  const waitlist = waitlistState(firstParam(params.waitlist));
  const copy = getLandingCopy(lang);

  return (
    // `lang` on the landing root, not <html>: the product behind /auth stays
    // English, and the Devanagari faces (see globals.css) key off this
    // attribute so they never load for an English visitor.
    <main className={lang === "hi" ? hindiFontVars : undefined} id="main-content" lang={lang}>
      <LandingNav copy={copy.nav} lang={lang} toggle={showToggle ? copy.toggle : undefined} />
      <BallHero copy={copy.hero} />
      <HeroScrubVideo
        copy={{ video: copy.video, hud: copy.hud, report: copy.report }}
        poster="/hero-drive-poster.jpg"
        src="/hero-drive.mp4"
      />
      <FeaturesSteps copy={copy.steps} />
      <TheWall copy={copy.wall} lang={lang} />
      <MoreFeatures copy={copy.more} />
      <TrustStrip copy={copy.trust} />
      <FinalCta copy={copy.cta} waitlist={waitlist} waitlistCopy={copy.waitlist} />
      <LandingFooter copy={copy.footer} />
    </main>
  );
}
