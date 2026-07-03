import { redirect } from "next/navigation";
import { getProfile, isAdmin, requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  redirect(`/dashboard/${profile.role}`);
}
