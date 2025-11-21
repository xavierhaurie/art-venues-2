// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { DEV_MODE } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    console.log('[AUTH/ME] Checking authentication...');

    // Check for session cookie (works in both dev and prod mode)
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('supabase-session');

    console.log('[AUTH/ME] Cookie store has cookies:', cookieStore.getAll().map(c => c.name));
    console.log('[AUTH/ME] Session cookie exists?', !!sessionCookie);

    if (sessionCookie) {
      console.log('[AUTH/ME] Session cookie value (first 100 chars):', sessionCookie.value.substring(0, 100));
    }

    if (!sessionCookie) {
      console.log('[AUTH/ME] No session cookie - user not authenticated');
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Dev mode: trust the cookie exists, return authenticated
    if (DEV_MODE) {
      console.log('[AUTH/ME] Dev mode - cookie exists, user authenticated');
      return NextResponse.json(
        {
          authenticated: true,
          user: { id: 'dev-user-id', email: 'dev@example.com' },
          dev_mode: true
        },
        { status: 200 }
      );
    }

    // Production mode: validate session cookie
    try {
      console.log('[AUTH/ME] Parsing session cookie...');
      const session = JSON.parse(sessionCookie.value);
      console.log('[AUTH/ME] Session parsed successfully:', {
        has_access_token: !!session.access_token,
        has_user: !!session.user,
        expires_at: session.expires_at,
        expires_at_type: typeof session.expires_at,
        user_email: session.user?.email
      });

      // Check if session is expired
      const expiresAt = new Date(session.expires_at);
      const now = new Date();
      console.log('[AUTH/ME] Checking expiration:', {
        expires_at: expiresAt.toISOString(),
        now: now.toISOString(),
        is_expired: expiresAt < now,
        time_diff_seconds: Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
      });

      if (expiresAt.getTime() < now.getTime()) {
        console.log('[AUTH/ME] Session expired');
        return NextResponse.json(
          { authenticated: false, reason: 'session_expired' },
          { status: 401 }
        );
      }

      console.log('[AUTH/ME] ✅ User authenticated:', session.user?.email);
      return NextResponse.json(
        {
          authenticated: true,
          user: session.user,
        },
        { status: 200 }
      );
    } catch (parseError) {
      console.error('[AUTH/ME] Invalid session cookie - parse error:', parseError);
      console.error('[AUTH/ME] Cookie value that failed to parse:', sessionCookie.value.substring(0, 200));
      return NextResponse.json(
        { authenticated: false, reason: 'invalid_session' },
        { status: 401 }
      );
    }
  } catch (err) {
    console.error('[AUTH/ME] ❌ Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
