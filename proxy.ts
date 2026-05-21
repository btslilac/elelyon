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

  const redirectWithCookies = (url: URL | string) => {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
    return response;
  };

  const { pathname, searchParams } = request.nextUrl;
  const code = searchParams.get('code');

  if (pathname !== '/auth/callback' && pathname.endsWith('/auth/callback')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return redirectWithCookies(url);
  }

  if (code && pathname !== '/auth/callback') {
    await supabase.auth.exchangeCodeForSession(code);
    const url = request.nextUrl.clone();
    url.searchParams.delete('code');
    return redirectWithCookies(url);
  }

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
    try {
      // Fetch both status and role to decide where they go right after login
      const { data: profile, error } = await supabase
        .from("users")
        .select("user_status, role") // <-- Added 'role' here
        .eq("auth_id", user.id)
        .maybeSingle();

      if (error) console.error("Proxy fetch user error:", error);

      if (profile?.user_status === "pending" || profile?.user_status === "rejected") {
        return supabaseResponse;
      }

      // --- CHANGED FOR LOGGED-IN REDIRECTS ---
      // If they just logged in, check if they are allowed on the default path
      const url = request.nextUrl.clone();
      if (profile?.role === "ADMIN" || profile?.role === "MANAGER") {
        url.pathname = "/"; // Allowed to land on default path
      } else {
        url.pathname = "/loans"; // Regular staff land on loans page
      }
      return redirectWithCookies(url);

    } catch (err) {
      console.error("Proxy unexpected error:", err);
    }
  }

  // Handle protected route requests for authenticated users
  if (user && !isAuthRoute) {
    try {
      const { data: profile, error } = await supabase
        .from("users")
        .select("user_status, role") // <-- Added 'role' here
        .eq("auth_id", user.id)
        .maybeSingle();

      if (error) console.error("Proxy fetch user error:", error);

      // 1. Block pending/rejected users from protected routes
      if (profile?.user_status === "pending" || profile?.user_status === "rejected") {
        const url = request.nextUrl.clone();
        url.pathname = "/pending-approval";
        return redirectWithCookies(url);
      }

      // --- CHANGED ---
      // 2. Protect the default path "/" from non-admin/non-manager roles
      if (pathname === "/") {
        const isAuthorized = profile?.role === "ADMIN" || profile?.role === "MANAGER";
        
        if (!isAuthorized) {
          const url = request.nextUrl.clone();
          url.pathname = "/loans"; // Bounce standard staff to the loans page
          return redirectWithCookies(url);
        }
      }

    } catch (err) {
      console.error("Proxy unexpected error:", err);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};