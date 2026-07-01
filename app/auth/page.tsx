import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth";
import { getCurrentUser, getOnboardingStatus } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  error?: string | string[];
  mode?: string | string[];
}>;

export default async function AuthPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();

  if (user) {
    const status = await getOnboardingStatus(user.id);
    redirect(status.role ? "/dashboard" : "/onboarding");
  }

  const params = await searchParams;
  const mode = firstParam(params.mode) === "sign-up" ? "sign-up" : "sign-in";
  const error = firstParam(params.error);

  return <AuthPanel error={error} mode={mode} />;
}
