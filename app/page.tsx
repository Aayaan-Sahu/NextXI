import { redirect } from "next/navigation";
import { getOnboardingStatus, isAdmin, requireUser } from "@/lib/auth";

export default async function Home() {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const status = await getOnboardingStatus(user.id);

  redirect(status.role ? "/dashboard" : "/onboarding");
}
