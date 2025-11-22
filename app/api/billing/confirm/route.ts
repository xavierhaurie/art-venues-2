// app/api/billing/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_DEV_MODE } from '@/lib/stripeServer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/billing/confirm
 * Confirms a Stripe Checkout Session and creates subscription record in DB
 * Body: { sessionId: string, userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[BILLING/CONFIRM] Starting confirmation...');

    if (STRIPE_DEV_MODE) {
      console.log('[BILLING/CONFIRM] Dev mode, skipping');
      return NextResponse.json({ ok: true, devMode: true }, { status: 200 });
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const { sessionId, userId } = await request.json();

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'sessionId and userId required' },
        { status: 400 }
      );
    }

    console.log('[BILLING/CONFIRM] Retrieving Stripe session:', sessionId);

    // Check if this subscription has already been confirmed
    const { data: existingSubByStripe, error: existingSubError } = await supabaseAdmin
      .from('subscription')
      .select('id, stripe_subscription_id, status')
      .eq('user_id', userId)
      .maybeSingle();

    // If we already have a subscription record for this user, don't create another
    if (existingSubByStripe) {
      console.log('[BILLING/CONFIRM] User already has a subscription record:', {
        id: existingSubByStripe.id,
        stripe_subscription_id: existingSubByStripe.stripe_subscription_id,
        status: existingSubByStripe.status
      });

      // Return success if they already have an active/trialing subscription
      if (existingSubByStripe.stripe_subscription_id) {
        console.log('[BILLING/CONFIRM] Subscription already confirmed, returning existing');
        return NextResponse.json(
          {
            ok: true,
            subscriptionId: existingSubByStripe.stripe_subscription_id,
            status: 'already_confirmed',
          },
          { status: 200 }
        );
      }
    }

    if (existingSubError && existingSubError.code !== 'PGRST116') {
      console.error('[BILLING/CONFIRM] Error checking existing subscription:', existingSubError);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    console.log('[BILLING/CONFIRM] Session status:', session.payment_status);

    if (!session.subscription || typeof session.subscription === 'string') {
      console.error('[BILLING/CONFIRM] No subscription found on session');
      return NextResponse.json(
        { error: 'No subscription found on session' },
        { status: 400 }
      );
    }

    const subscription = session.subscription;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    console.log('[BILLING/CONFIRM] Subscription ID:', subscription.id);
    console.log('[BILLING/CONFIRM] Subscription status:', subscription.status);
    console.log('[BILLING/CONFIRM] Customer ID:', customerId);
    console.log('[BILLING/CONFIRM] Trial end:', subscription.trial_end);
    console.log('[BILLING/CONFIRM] Current period end (raw):', subscription.current_period_end);

    // For trials, use trial_end as the period end, otherwise use current_period_end
    let currentPeriodEndISO: string | null = null;
    const periodEndTimestamp = subscription.trial_end || subscription.current_period_end;

    if (periodEndTimestamp) {
      try {
        // Stripe timestamps are in seconds, JavaScript Date expects milliseconds
        currentPeriodEndISO = new Date(periodEndTimestamp * 1000).toISOString();
        console.log('[BILLING/CONFIRM] Period end (ISO):', currentPeriodEndISO);
      } catch (err) {
        console.error('[BILLING/CONFIRM] Failed to convert timestamp:', err);
        // Leave as null if conversion fails
      }
    }

    // Check again for existing subscription (double-check pattern to handle race conditions)
    const { data: finalCheck, error: finalCheckError } = await supabaseAdmin
      .from('subscription')
      .select('id, stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (finalCheckError && finalCheckError.code !== 'PGRST116') {
      console.error('[BILLING/CONFIRM] Error in final check:', finalCheckError);
    }

    const subscriptionData = {
      status: subscription.status as any,
      current_period_end: currentPeriodEndISO,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan: 'monthly',
    };

    if (finalCheck) {
      // Update existing subscription
      console.log('[BILLING/CONFIRM] Updating subscription record:', finalCheck.id);
      const { error: updateError } = await supabaseAdmin
        .from('subscription')
        .update({
          ...subscriptionData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', finalCheck.id);

      if (updateError) {
        console.error('[BILLING/CONFIRM] Failed to update subscription:', updateError);
        return NextResponse.json(
          { error: 'Failed to update subscription', details: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Insert new subscription
      console.log('[BILLING/CONFIRM] Creating new subscription record for user:', userId);
      const { error: insertError } = await supabaseAdmin
        .from('subscription')
        .insert({
          user_id: userId,
          ...subscriptionData,
        });

      if (insertError) {
        // If we get duplicate key error here, it means a race condition occurred
        // between our check and insert. Try one more update.
        if (insertError.code === '23505') {
          console.log('[BILLING/CONFIRM] Duplicate detected during insert, attempting update...');
          const { data: raceRecord } = await supabaseAdmin
            .from('subscription')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (raceRecord) {
            const { error: raceUpdateError } = await supabaseAdmin
              .from('subscription')
              .update({
                ...subscriptionData,
                updated_at: new Date().toISOString(),
              })
              .eq('id', raceRecord.id);

            if (raceUpdateError) {
              console.error('[BILLING/CONFIRM] Failed to update after race condition:', raceUpdateError);
              return NextResponse.json(
                { error: 'Failed to save subscription', details: raceUpdateError.message },
                { status: 500 }
              );
            }
          }
        } else {
          console.error('[BILLING/CONFIRM] Failed to insert subscription:', insertError);
          return NextResponse.json(
            { error: 'Failed to create subscription', details: insertError.message },
            { status: 500 }
          );
        }
      }
    }

    console.log('[BILLING/CONFIRM] ✅ Subscription confirmed and saved');

    return NextResponse.json(
      {
        ok: true,
        subscriptionId: subscription.id,
        status: subscription.status,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[BILLING/CONFIRM] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

