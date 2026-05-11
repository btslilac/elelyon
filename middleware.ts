import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

  // getUser() validates the token with Supabase Auth and refreshes it if expired.
  // The middleware is the single serial point per request — it runs before any
  // parallel server components/actions, so by the time they execute the refreshed
  // tokens are already written to cookies. Server actions then use getUser()
  // (which is memoized via React.cache()) so that we hit the Supabase Auth
  // server only once per request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/pending-approval");

  // Redirect unauthenticated users away from protected routes
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages (except pending-approval)
  if (user && isAuthRoute && !pathname.startsWith("/pending-approval")) {
    // Check user status before redirecting to dashboard
    const { data: profile } = await supabase
      .from("users")
      .select("user_status")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profile?.user_status === "pending" || profile?.user_status === "rejected") {
      // Pending/rejected users can stay on auth pages — they shouldn't reach the dashboard
      return supabaseResponse;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Block pending/rejected users from accessing protected routes
  if (user && !isAuthRoute) {
    const { data: profile } = await supabase
      .from("users")
      .select("user_status")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profile?.user_status === "pending" || profile?.user_status === "rejected") {
      const url = request.nextUrl.clone();
      url.pathname = "/pending-approval";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
