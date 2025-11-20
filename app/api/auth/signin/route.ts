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
      console.log('[DEV MODE] Sign-in bypass for:', email);
      return NextResponse.json(
        {
          user: { id: 'dev-user-id', email },
          session: { expires_at: Date.now() + 86400000 },
          dev_mode: true,
        },
        { status: 200 }
      );
    }

    // Real Supabase auth
    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Authentication not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        user: data.user,
        session: data.session
          ? { expires_at: data.session.expires_at }
          : null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Sign-in error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

