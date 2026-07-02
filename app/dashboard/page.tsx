import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  redirect(`/dashboard/${profile.role}`);
}
