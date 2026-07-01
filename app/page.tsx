import { redirect } from "next/navigation";
import { getOnboardingStatus, requireUser } from "@/lib/auth";

export default async function Home() {
  const user = await requireUser();
  const status = await getOnboardingStatus(user.id);

  redirect(status.role ? "/dashboard" : "/onboarding");
}
