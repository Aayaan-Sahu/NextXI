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

  // Supabase's *default* confirm-signup email links to its own /auth/v1/verify
  // and redirects to the Site URL — here, with the PKCE `code` on the query.
  // Only /auth/confirm exchanges that, so without this the click confirms the
  // address and then drops the person on the landing page with no session.
  // The repo's own template links straight to /auth/confirm; this is what
  // keeps the flow working while the project is still on the default provider,
  // which locks template editing until custom SMTP is configured.
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const confirm = request.nextUrl.clone();
    confirm.pathname = "/auth/confirm";
    if (!confirm.searchParams.has("next")) confirm.searchParams.set("next", "/onboarding");
    return NextResponse.redirect(confirm);
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
