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

      const response = NextResponse.json(
        {
          user: { id: 'dev-user-id', email },
          session: { expires_at: Date.now() + 86400000 },
          dev_mode: true,
        },
        { status: 200 }
      );

      const expiresAt = new Date(Date.now() + 86400000);
      const cookieValue = JSON.stringify({
        access_token: 'dev-token',
        refresh_token: 'dev-refresh',
        expires_at: expiresAt.toISOString(),
        user: { id: 'dev-user-id', email },
      });

      response.cookies.set('supabase-session', cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });

      console.log('[SIGNIN/SERVER] Cookie set via cookies API');
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

      // Provide more helpful error messages
      let userMessage = error.message;
      if (error.message.includes('Email not confirmed')) {
        userMessage = 'Please confirm your email address. Check your inbox for a confirmation link.';
      }

      return NextResponse.json({ error: userMessage }, { status: 401 });
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

    if (data.session) {
      const expiresAt = new Date(
        (typeof data.session.expires_at === 'number'
          ? data.session.expires_at * 1000
          : data.session.expires_at) || Date.now() + 86400000
      );
      const cookieData = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: expiresAt.toISOString(),
        user: data.user,
      };

      response.cookies.set('supabase-session', JSON.stringify(cookieData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });
      console.log('[AUTH] Session cookie set via cookies API');
    }

    return response;
  } catch (err) {
    console.error('[AUTH] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
