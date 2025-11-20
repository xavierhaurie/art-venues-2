// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { DEV_MODE } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    // Dev mode: check for a simple dev session cookie/header
    if (DEV_MODE) {
      // In dev mode, always return authenticated for easier testing
      // In a real scenario, you'd check a dev cookie set by signin
      console.log('[DEV MODE] Auth check - always authenticated');
      return NextResponse.json(
        {
          authenticated: true,
          user: { id: 'dev-user-id', email: 'dev@example.com' },
          dev_mode: true
        },
        { status: 200 }
      );
    }

    // Real Supabase auth checking would go here
    // For now, return not authenticated until full cookie-based auth is wired
    // TODO: Integrate @supabase/auth-helpers-nextjs for proper session checking
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  } catch (err) {
    console.error('Auth check error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

