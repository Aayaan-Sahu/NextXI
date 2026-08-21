import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isLandingLang, LANG_COOKIE, LANG_COOKIE_MAX_AGE } from "@/lib/landing-lang";
import { getSupabaseConfig } from "@/lib/supabase/server";

export async function proxy(request: NextRequest) {
  // The landing page's language switch: `/?lang=hi` pins a choice for a year
  // and bounces back to a clean `/`. Handled here so the toggle can be two
  // plain links — no JavaScript, no server action, works from a shared URL.
  if (request.nextUrl.pathname === "/") {
    const wanted = request.nextUrl.searchParams.get("lang");
    if (isLandingLang(wanted)) {
      const clean = request.nextUrl.clone();
      clean.searchParams.delete("lang");
      const redirect = NextResponse.redirect(clean);
      redirect.cookies.set(LANG_COOKIE, wanted, {
        maxAge: LANG_COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
      });
      return redirect;
    }
  }

  let response = NextResponse.next({ request });
  const { key, url } = getSupabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // Verifies the session JWT locally (asymmetric keys + process-wide JWKS
  // cache) instead of a network round-trip to the auth server per request.
  // When the access token is expired or near expiry, getClaims() refreshes the
  // session over the network first; the resulting TOKEN_REFRESHED event writes
  // the new cookies onto the response via setAll above.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)"],
};
