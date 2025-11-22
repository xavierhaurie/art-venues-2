// lib/stripeServer.ts
import Stripe from 'stripe';

// Dev mode: skip Stripe entirely
export const STRIPE_DEV_MODE = process.env.NEXT_PUBLIC_AUTH_DEV_MODE === 'true';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_DEV_MODE && !stripeSecretKey) {
  console.warn(
    'Stripe not configured. Either set STRIPE_SECRET_KEY, ' +
    'or enable dev mode with NEXT_PUBLIC_AUTH_DEV_MODE=true'
  );
}

// Create Stripe client (only if not in dev mode and key exists)
export const stripe = !STRIPE_DEV_MODE && stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover' as any,
    })
  : null;

// Price ID for monthly subscription (set in Stripe Dashboard)
// This should be your Stripe Price ID for the monthly plan
// Used in signup route to create subscriptions
export const MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID;

