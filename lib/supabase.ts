import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server client — reads/writes the Supabase session cookie automatically.
 * Use for auth operations (signIn, signUp, getUser, signOut).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Prevent background token refresh races — the middleware's single
        // getSession() call owns all token refresh responsibility.
        // NOTE: persistSession must remain true (default) so that sign-in
        // and sign-up write the session tokens back to cookies correctly.
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignored; middleware handles refresh.
          }
        },
      },
    }
  );
}


/**
 * Admin client — uses the service-role key to bypass Row Level Security.
 * Use for all database reads/writes in server actions.
 * Never expose this to the browser.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
