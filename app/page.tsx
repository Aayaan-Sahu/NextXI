import { redirect } from "next/navigation";
import { BallHero } from "@/components/landing/ball-hero";
import { FeaturesSteps } from "@/components/landing/features-steps";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroScrubVideo } from "@/components/landing/hero-scrub-video";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { MoreFeatures } from "@/components/landing/more-features";
import { TheWall } from "@/components/landing/the-wall";
import { TrustStrip } from "@/components/landing/trust-strip";
import { type WaitlistState } from "@/components/landing/waitlist-form";
import { getCurrentUser, getOnboardingStatus, isAdmin } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site-url";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{ waitlist?: string | string[] }>;

function waitlistState(value: string | undefined): WaitlistState | undefined {
  return value === "joined" || value === "invalid" ? value : undefined;
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();

  if (user) {
    if (isAdmin(user)) redirect("/dashboard/admin");

    const status = await getOnboardingStatus(user.id);
    redirect(status.role ? "/dashboard" : "/onboarding");
  }

  const waitlist = waitlistState(firstParam((await searchParams).waitlist));
  const siteUrl = getSiteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "NextXI",
        url: siteUrl,
        description:
          "Cricket talent platform where young players upload technique videos for AI coaching reports and connect with verified coaches and scouts.",
      },
      {
        "@type": "WebApplication",
        name: "NextXI",
        url: siteUrl,
        applicationCategory: "SportsApplication",
        operatingSystem: "Web",
        description:
          "Film your bowling or batting on a phone and build a profile scouts can check — measured technique and real footage.",
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/PreOrder",
          price: "0",
          priceCurrency: "GBP",
        },
      },
    ],
  };

  return (
    <main>
      <a
        href="#how-it-works"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-cream-50 focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-pitch-900 focus:outline-2 focus:outline-offset-2 focus:outline-gold-500"
      >
        Skip to how it works
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingNav />
      <BallHero />
      <HeroScrubVideo src="/hero-drive.mp4" poster="/hero-drive-poster.jpg" />
      <FeaturesSteps />
      <TheWall />
      <MoreFeatures />
      <TrustStrip />
      <FinalCta waitlist={waitlist} />
      <LandingFooter />
    </main>
  );
}
