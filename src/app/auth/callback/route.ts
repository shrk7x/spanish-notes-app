import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

import { resolveSafeNext } from '@/utils/auth/resolveSafeNext';
import { getSupabaseConfig } from '@/utils/supabase/config';

export async function GET(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const recovery =
    type === 'recovery' ||
    (!tokenHash && searchParams.get('next') === '/auth/update-password');
  const next = recovery
    ? '/auth/update-password'
    : resolveSafeNext(searchParams.get('next'));
  const redirectOptions = { headers: { 'Cache-Control': 'private, no-store' } };
  const response = NextResponse.redirect(
    new URL(next, origin),
    redirectOptions
  );
  const errorResponse = () =>
    NextResponse.redirect(
      new URL('/auth/sign-in?auth=error', origin),
      redirectOptions
    );

  if (
    (!tokenHash && !code) ||
    (tokenHash && type !== 'signup' && type !== 'email' && type !== 'recovery')
  ) {
    return errorResponse();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const { error } = tokenHash
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email' | 'recovery',
        })
      : await supabase.auth.exchangeCodeForSession(code!);
    if (error) return errorResponse();
    return response;
  } catch {
    return errorResponse();
  }
}
