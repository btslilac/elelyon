import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // "next" is where we want to redirect the user after the code exchange
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // If code exchange is successful, redirect to the "next" path
      return NextResponse.redirect(`${origin}${next}`);
    }
  }



  // If no code is present, it might be an Implicit Flow (fragment-based).
  // Redirect to the "next" destination and let the client-side handle it.
  return NextResponse.redirect(`${origin}${next}`);
}
