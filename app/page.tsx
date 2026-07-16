import { redirect } from "next/navigation";
import { getCurrentUser, getOnboardingStatus, isAdmin } from "@/lib/auth";
import { BallFinale } from "@/components/landing/ball-finale";
import { FeaturesSteps } from "@/components/landing/features-steps";
import { HeroScrubVideo } from "@/components/landing/hero-scrub-video";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { MoreFeatures } from "@/components/landing/more-features";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    if (isAdmin(user)) redirect("/dashboard/admin");

    const status = await getOnboardingStatus(user.id);
    redirect(status.role ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="relative">
      <LandingNav />
      <HeroScrubVideo src="/hero-scrub.mp4" poster="/hero-poster.jpg" />
      <FeaturesSteps />
      <MoreFeatures />
      <BallFinale />
      <LandingFooter />
    </div>
  );
}
