import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: CookieOptions }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Helper to preserve cookies set by Supabase (e.g. refreshed tokens) during a redirect
  const redirectWithCookies = (url: URL | string) => {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
    return response;
  };

  const { pathname, searchParams } = request.nextUrl;
  const code = searchParams.get('code');

  // 0. Catch-all for prefixed auth callbacks (e.g. /forgot-password/auth/callback)
  // This handles cases where the redirect URL was incorrectly prefixed.
  if (pathname !== '/auth/callback' && pathname.endsWith('/auth/callback')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return redirectWithCookies(url);
  }

  // 1. Global PKCE Code Exchange: If a 'code' is present in the URL, exchange it
  // for a session immediately. This handles Magic Links or Invites that might
  // land on the home page or other routes directly.
  if (code && pathname !== '/auth/callback') {
    await supabase.auth.exchangeCodeForSession(code);
    const url = request.nextUrl.clone();
    url.searchParams.delete('code');
    return redirectWithCookies(url);
  }

  // getUser() validates the token with Supabase Auth and refreshes it if expired.
  // The middleware is the single serial point per request — it runs before any
  // parallel server components/actions, so by the time they execute the refreshed
  // tokens are already written to cookies. Server actions then use getUser()
  // (which is memoized via React.cache()) so that we hit the Supabase Auth
  // server only once per request.
  const {
    data: { user },
  } = await supabase.auth.getUser();


  const isAuthRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/pending-approval") ||
    pathname.startsWith("/auth/callback");

  // Redirect unauthenticated users away from protected routes
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return redirectWithCookies(url);
  }

  // Redirect authenticated users away from auth pages (except pending-approval)
  if (user && isAuthRoute && !pathname.startsWith("/pending-approval")) {
    // Check user status before redirecting to dashboard
    try {
      const { data: profile, error } = await supabase
        .from("users")
        .select("user_status")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (error) console.error("Middleware fetch user error:", error);

      if (profile?.user_status === "pending" || profile?.user_status === "rejected") {
        // Pending/rejected users can stay on auth pages — they shouldn't reach the dashboard
        return supabaseResponse;
      }
    } catch (err) {
      console.error("Middleware unexpected error:", err);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";
    return redirectWithCookies(url);
  }

  // Block pending/rejected users from accessing protected routes
  if (user && !isAuthRoute) {
    try {
      const { data: profile, error } = await supabase
        .from("users")
        .select("user_status")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (error) console.error("Middleware fetch user error:", error);

      if (profile?.user_status === "pending" || profile?.user_status === "rejected") {
        const url = request.nextUrl.clone();
        url.pathname = "/pending-approval";
        return redirectWithCookies(url);
      }
    } catch (err) {
      console.error("Middleware unexpected error:", err);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
