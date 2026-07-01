import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/server";

function safeNext(value: string | null, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"), "/onboarding");
  const cookiesToSet: Parameters<NextResponse["cookies"]["set"]>[] = [];
  const headersToSet: Record<string, string> = {};
  const { key, url: supabaseUrl } = getSupabaseConfig();

  const supabase = createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies, headers) {
        cookies.forEach(({ name, options, value }) => {
          cookiesToSet.push([name, value, options]);
        });
        Object.assign(headersToSet, headers);
      },
    },
  });

  const result =
    tokenHash && (type === "email" || type === "recovery")
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error("Missing confirmation token.") };

  const redirectTo = result.error
    ? new URL(`/auth?error=${encodeURIComponent(result.error.message)}`, url.origin)
    : new URL(next, url.origin);

  const response = NextResponse.redirect(redirectTo);
  cookiesToSet.forEach((cookie) => response.cookies.set(...cookie));
  Object.entries(headersToSet).forEach(([name, value]) => response.headers.set(name, value));

  return response;
}
