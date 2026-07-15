import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

export function getStripeClient() {
  if (!stripeSecretKey || stripeSecretKey.includes('placeholder')) {
    return null;
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

export const stripe = getStripeClient();
