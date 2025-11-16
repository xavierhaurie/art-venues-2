import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ total_credits: 0 }, { status: 200 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('user_credit_event')
      .select('credits')
      .eq('user_id', session.userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch credits', message: error.message }, { status: 500 });
    }
    const total = (data || []).reduce((sum, row) => sum + (row.credits || 0), 0);
    return NextResponse.json({ total_credits: total }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed', message: err?.message || String(err) }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
