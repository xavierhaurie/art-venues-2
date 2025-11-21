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

      // Create response with session cookie
      const response = NextResponse.json(
        {
          user: { id: 'dev-user-id', email },
          needs_confirmation: false,
          dev_mode: true,
          stripe_customer_id: 'dev-stripe-customer-id',
        },
        { status: 200 }
      );

      // Set dev mode session cookie
      const expiresAt = new Date(Date.now() + 86400000); // 24 hours
      response.cookies.set('supabase-session', JSON.stringify({
        access_token: 'dev-token',
        refresh_token: 'dev-refresh',
        expires_at: expiresAt.toISOString(),
        user: { id: 'dev-user-id', email },
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });
      console.log('[DEV MODE] Session cookie set');

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

    console.log('[AUTH] Attempting Supabase sign-up for:', email);
    const { data, error } = await supabaseServer.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('[AUTH] Sign-up error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[AUTH] User created:', {
      id: data.user?.id,
      email: data.user?.email,
      confirmed: data.user?.email_confirmed_at ? 'yes' : 'no',
      has_session: !!data.session,
    });

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

    if (needsConfirmation) {
      console.log('[AUTH] Email confirmation required - user must check their email');
    } else {
      console.log('[AUTH] User auto-confirmed - can sign in immediately');
    }

    // Create response
    const response = NextResponse.json(
      {
        user: data.user,
        needs_confirmation: needsConfirmation,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscriptionId,
      },
      { status: 200 }
    );

    // Set session cookie if user was auto-confirmed (no email verification needed)
    if (data.session) {
      const expiresAt = new Date(data.session.expires_at || Date.now() + 86400000);
      response.cookies.set('supabase-session', JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });
      console.log('[AUTH] Session cookie set for new user, expires:', expiresAt);
    }

    return response;
  } catch (err) {
    console.error('Sign-up error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

