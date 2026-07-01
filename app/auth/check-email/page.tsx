import { CheckEmailPanel } from "@/components/auth";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  email?: string | string[];
  error?: string | string[];
  message?: string | string[];
}>;

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = firstParam(params.email) ?? "";
  const error = firstParam(params.error);
  const message = firstParam(params.message);

  return <CheckEmailPanel email={email} error={error} message={message} />;
}
