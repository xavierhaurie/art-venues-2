// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer, DEV_MODE } from '@/lib/supabaseServer';

export async function POST() {
  try {
    console.log('[AUTH/LOGOUT] Logout request received');

    // Clear session cookie (works in both dev and prod mode)
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.delete('supabase-session');
    console.log('[AUTH/LOGOUT] Session cookie deleted');

    // Dev mode: just return success after clearing cookie
    if (DEV_MODE) {
      console.log('[AUTH/LOGOUT] Dev mode - cookie cleared');
      return response;
    }

    // Real Supabase signout (production mode)
    if (supabaseServer) {
      await supabaseServer.auth.signOut();
      console.log('[AUTH/LOGOUT] Supabase sign-out successful');
    }

    return response;
  } catch (err) {
    console.error('[AUTH/LOGOUT] Error:', err);
    // Still try to clear cookie even if Supabase signout fails
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    response.cookies.delete('supabase-session');
    return response;
  }
}

