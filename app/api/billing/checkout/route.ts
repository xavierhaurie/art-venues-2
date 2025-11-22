// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { stripe, MONTHLY_PRICE_ID, STRIPE_DEV_MODE } from '@/lib/stripeServer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session for a new subscription with 30-day trial
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[BILLING/CHECKOUT] Starting checkout session creation...');

    if (STRIPE_DEV_MODE) {
      console.log('[BILLING/CHECKOUT] STRIPE_DEV_MODE=true, skipping real Stripe checkout');
      return NextResponse.json(
        { ok: true, devMode: true, message: 'Dev mode: checkout not actually created.' },
        { status: 200 }
      );
    }

    if (!stripe) {
      console.error('[BILLING/CHECKOUT] Stripe client not configured');
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    if (!MONTHLY_PRICE_ID) {
      console.error('[BILLING/CHECKOUT] STRIPE_MONTHLY_PRICE_ID not set');
      return NextResponse.json(
        { error: 'Subscription price not configured' },
        { status: 500 }
      );
    }

    // Get user from session cookie
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('supabase-session');

    if (!sessionCookie) {
      console.log('[BILLING/CHECKOUT] No session cookie found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    let userEmail: string | null = null;
    let userId: string | null = null;

    try {
      const parsed = JSON.parse(sessionCookie.value);
      userEmail = parsed.user?.email ?? null;
      userId = parsed.user?.id ?? null;
    } catch (err) {
      console.error('[BILLING/CHECKOUT] Failed to parse supabase-session cookie:', err);
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    if (!userEmail || !userId) {
      console.log('[BILLING/CHECKOUT] No user email or ID in session');
      return NextResponse.json(
        { error: 'User email not found in session' },
        { status: 401 }
      );
    }

    console.log('[BILLING/CHECKOUT] Creating checkout for user:', userId, userEmail);

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscription')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['trialing', 'active'])
      .single();

    if (existingSubscription) {
      console.log('[BILLING/CHECKOUT] User already has active subscription:', existingSubscription.id);
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Get or create app_user record
    let { data: dbUser, error: dbError } = await supabaseAdmin
      .from('app_user')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (dbError && dbError.code === 'PGRST116') {
      // User doesn't exist in app_user table - create it
      console.log('[BILLING/CHECKOUT] Creating app_user record for:', userId, userEmail);
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('app_user')
        .insert({
          id: userId,
          email: userEmail,
          role: 'artist', // default role
          status: 'active',
        })
        .select('id, email')
        .single();

      if (insertError) {
        console.error('[BILLING/CHECKOUT] Failed to create app_user:', insertError);
        return NextResponse.json(
          { error: 'Failed to create user record', details: insertError.message },
          { status: 500 }
        );
      }
      dbUser = newUser;
    } else if (dbError) {
      console.error('[BILLING/CHECKOUT] Failed to load user from DB:', dbError);
      return NextResponse.json(
        { error: 'Could not load user', details: dbError.message },
        { status: 500 }
      );
    }

    // Check if user has Stripe customer via subscription table
    const { data: existingSubRecord } = await supabaseAdmin
      .from('subscription')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .single();

    let customerId = existingSubRecord?.stripe_customer_id as string | null;

    if (!customerId) {
      console.log('[BILLING/CHECKOUT] Creating new Stripe customer for user:', userId);
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          app_user_id: userId,
        },
      });
      customerId = customer.id;
      console.log('[BILLING/CHECKOUT] Created Stripe customer:', customerId);
    } else {
      console.log('[BILLING/CHECKOUT] Using existing Stripe customer:', customerId);
    }

    // Create Stripe Checkout Session for subscription with 30-day trial
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    console.log('[BILLING/CHECKOUT] Creating Stripe Checkout Session...');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          app_user_id: userId,
        },
      },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?redirect=billing`,
      allow_promotion_codes: true,
    });

    console.log('[BILLING/CHECKOUT] Created Checkout Session:', session.id);

    return NextResponse.json(
      {
        ok: true,
        url: session.url,
        sessionId: session.id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[BILLING/CHECKOUT] Error:', err);
    return NextResponse.json(
      {
        error: 'Checkout session creation failed',
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

