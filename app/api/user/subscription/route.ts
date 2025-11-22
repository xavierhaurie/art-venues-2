// app/api/user/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { STRIPE_DEV_MODE } from '@/lib/stripeServer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/subscription
 * Returns whether the current user has an active subscription
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[USER/SUBSCRIPTION] Checking subscription status...');

    if (STRIPE_DEV_MODE) {
      console.log('[USER/SUBSCRIPTION] Dev mode, returning active=true');
      return NextResponse.json({ active: true, devMode: true }, { status: 200 });
    }

    // Get user from session cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('supabase-session');

    if (!sessionCookie) {
      console.log('[USER/SUBSCRIPTION] No session cookie');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    let userId: string | null = null;

    try {
      const parsed = JSON.parse(sessionCookie.value);
      userId = parsed.user?.id ?? null;
    } catch (err) {
      console.error('[USER/SUBSCRIPTION] Failed to parse session cookie:', err);
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    if (!userId) {
      console.log('[USER/SUBSCRIPTION] No user ID in session');
      return NextResponse.json(
        { error: 'User not found in session' },
        { status: 401 }
      );
    }

    // Check for active/trialing subscription
    const { data: subscription, error } = await supabaseAdmin
      .from('subscription')
      .select('id, status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['trialing', 'active'])
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[USER/SUBSCRIPTION] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to check subscription' },
        { status: 500 }
      );
    }

    const hasActiveSubscription = !!subscription;

    console.log('[USER/SUBSCRIPTION] User:', userId, 'has active subscription:', hasActiveSubscription);

    return NextResponse.json(
      {
        active: hasActiveSubscription,
        subscription: subscription ? {
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
        } : null,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[USER/SUBSCRIPTION] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

