import { redirect } from "next/navigation";
import { getProfile, requireUser, redirectRolelessAdmin } from "@/lib/auth";
import { getCoachClubs } from "@/lib/clubs.server";

/**
 * Pure router, so the nav can link "Home" at /dashboard/club without knowing
 * which club it means. A club goes to its own dashboard; a coach goes to the
 * club they run — or back to their own home if they run none.
 */
export default async function ClubIndexPage() {
  const user = await requireUser();

  await redirectRolelessAdmin(user);

  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role === "club") redirect(`/dashboard/club/${user.id}`);

  if (profile.role === "coach") {
    const { member } = await getCoachClubs(user.id);
    redirect(member.length ? `/dashboard/club/${member[0].id}` : "/dashboard/coach");
  }

  redirect(`/dashboard/${profile.role}`);
}
