import { ResetPasswordPanel } from "@/components/auth";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  error?: string | string[];
  message?: string | string[];
}>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const error = firstParam(params.error);
  const message = firstParam(params.message);

  return <ResetPasswordPanel error={error} hasUser={Boolean(user)} message={message} />;
}
