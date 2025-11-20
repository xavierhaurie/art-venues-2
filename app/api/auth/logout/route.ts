// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer, DEV_MODE } from '@/lib/supabaseServer';

export async function POST() {
  try {
    // Dev mode: just return success
    if (DEV_MODE) {
      console.log('[DEV MODE] Logout bypass');
      return NextResponse.json({ success: true, dev_mode: true }, { status: 200 });
    }

    // Real Supabase signout
    if (supabaseServer) {
      await supabaseServer.auth.signOut();
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

