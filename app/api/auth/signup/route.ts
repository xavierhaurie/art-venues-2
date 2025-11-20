// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer, DEV_MODE } from '@/lib/supabaseServer';
import { stripe, STRIPE_DEV_MODE, MONTHLY_PRICE_ID } from '@/lib/stripeServer';

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
      console.log('[DEV MODE] Sign-up bypass for:', email);
      console.log('[DEV MODE] Skipping Stripe customer creation');
      return NextResponse.json(
        {
          user: { id: 'dev-user-id', email },
          needs_confirmation: false,
          dev_mode: true,
          stripe_customer_id: 'dev-stripe-customer-id',
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

    const { data, error } = await supabaseServer.auth.signUp({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create Stripe customer with free trial (if Stripe is configured)
    let stripeCustomerId: string | null = null;
    let subscriptionId: string | null = null;

    if (!STRIPE_DEV_MODE && stripe && data.user) {
      try {
        console.log('Creating Stripe customer for:', email);

        // Create customer in Stripe
        const customer = await stripe.customers.create({
          email: email,
          metadata: {
            supabase_user_id: data.user.id,
          },
        });

        stripeCustomerId = customer.id;
        console.log('Stripe customer created:', stripeCustomerId);

        // Create subscription with free trial (30 days)
        if (MONTHLY_PRICE_ID) {
          const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: MONTHLY_PRICE_ID }],
            trial_period_days: 30, // Free first month
            payment_behavior: 'default_incomplete',
            payment_settings: {
              save_default_payment_method: 'on_subscription',
            },
            metadata: {
              supabase_user_id: data.user.id,
            },
          });

          subscriptionId = subscription.id;
          console.log('Stripe subscription created with 30-day trial:', subscriptionId);
        } else {
          console.warn('STRIPE_MONTHLY_PRICE_ID not set - customer created but no subscription');
        }

        // TODO: Store stripeCustomerId and subscriptionId in your database
        // For example, in a users table:
        // await supabaseServer.from('users').update({
        //   stripe_customer_id: stripeCustomerId,
        //   stripe_subscription_id: subscriptionId,
        // }).eq('id', data.user.id);

      } catch (stripeError) {
        console.error('Stripe customer creation failed:', stripeError);
        // Don't block signup if Stripe fails, but log it
        // User account is still created in Supabase
      }
    }

    // Supabase may require email confirmation
    const needsConfirmation = !data.session;

    return NextResponse.json(
      {
        user: data.user,
        needs_confirmation: needsConfirmation,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscriptionId,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Sign-up error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

