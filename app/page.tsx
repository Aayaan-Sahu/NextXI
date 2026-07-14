import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage, type WaitlistState } from "@/components/landing";
import { getCurrentUser, getOnboardingStatus, isAdmin } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "NextXI — AI coaching for young cricketers",
  description:
    "Upload your batting or bowling videos and get an AI coaching report — what's working, what to fix, and how you're improving.",
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

  return <LandingPage waitlist={waitlist} />;
}
