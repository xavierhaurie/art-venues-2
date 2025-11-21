// app/api/auth/signin/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer, DEV_MODE } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Dev mode: auto-succeed for any email/password
    if (DEV_MODE) {
      console.log('[SIGNIN/SERVER] Dev mode sign-in for:', email);

      // Create a response with session cookie (so logout can clear it)
      const response = NextResponse.json(
        {
          user: { id: 'dev-user-id', email },
          session: { expires_at: Date.now() + 86400000 },
          dev_mode: true,
        },
        { status: 200 }
      );

      // Set dev mode session cookie
      const expiresAt = new Date(Date.now() + 86400000); // 24 hours
      const cookieValue = JSON.stringify({
        access_token: 'dev-token',
        refresh_token: 'dev-refresh',
        expires_at: expiresAt.toISOString(),
        user: { id: 'dev-user-id', email },
      });

      console.log('[SIGNIN/SERVER] Setting cookie with value:', cookieValue.substring(0, 100) + '...');

      response.cookies.set('supabase-session', cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });

      console.log('[SIGNIN/SERVER] Cookie set successfully');

      return response;
    }

    // Real Supabase auth
    if (!supabaseServer) {
      console.error('[AUTH] Supabase client not initialized');
      return NextResponse.json(
        { error: 'Authentication not configured' },
        { status: 500 }
      );
    }

    console.log('[AUTH] Attempting Supabase sign-in for:', email);
    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[AUTH] Supabase sign-in error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.log('[AUTH] Sign-in successful for:', email);

    // Store session in HTTP-only cookie
    const response = NextResponse.json(
      {
        user: data.user,
        session: data.session
          ? { expires_at: data.session.expires_at }
          : null,
      },
      { status: 200 }
    );

    // Set session cookie if we have a session
    if (data.session) {
      const expiresAt = new Date(data.session.expires_at || Date.now() + 86400000);
      response.cookies.set('supabase-session', JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });
      console.log('[AUTH] Session cookie set, expires:', expiresAt);
    }

    return response;
  } catch (err) {
    console.error('Sign-in error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

