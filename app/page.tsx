import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BallFinale } from "@/components/landing/ball-finale";
import { FeaturesSteps } from "@/components/landing/features-steps";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingHero } from "@/components/landing/hero";
import { HeroScrubVideo } from "@/components/landing/hero-scrub-video";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { MoreFeatures } from "@/components/landing/more-features";
import { TrustStrip } from "@/components/landing/trust-strip";
import { type WaitlistState } from "@/components/landing/waitlist-form";
import { getCurrentUser, getOnboardingStatus, isAdmin } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "NextXI — AI coaching for young cricketers",
  description:
    "Film your bowling or batting on a phone and get back an AI coaching report on your technique.",
};

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

  return (
    <main>
      <LandingNav />
      <LandingHero waitlist={waitlist} />
      <HeroScrubVideo src="/hero-scrub.mp4" poster="/hero-poster.jpg" />
      <FeaturesSteps />
      <MoreFeatures />
      <TrustStrip />
      <BallFinale />
      <FinalCta waitlist={waitlist} />
      <LandingFooter />
    </main>
  );
}
