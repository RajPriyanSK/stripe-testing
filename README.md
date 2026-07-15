# Stripe + Next.js: Complete Setup & Payment Guide (2026)

A practical, up-to-date guide to accepting payments in a Next.js (App Router) application using Stripe.

---

## 1. Prerequisites

- Node.js 18+ and a Next.js 14/15 App Router project
- A free [Stripe account](https://dashboard.stripe.com/register)
- Basic familiarity with Server Actions / Route Handlers

---

## 2. Install packages

```bash
npm install stripe @stripe/stripe-js
```

- `stripe` — the **server-side** SDK (secret key, never exposed to the browser)
- `@stripe/stripe-js` — the **client-side** loader (publishable key, safe to expose)

If you plan to build a fully custom card form with Stripe Elements (instead of the hosted Checkout page), also install:

```bash
npm install @stripe/react-stripe-js
```

---

## 3. Get your API keys

1. Go to **Stripe Dashboard → Developers → API keys**.
2. Copy the **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`). Keep Stripe in **Test mode** while developing.
3. Create `.env.local` in your project root:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx   # you'll get this in step 6
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Add `.env.local` to `.gitignore` (Next.js does this by default). **Never** commit a secret key — if you accidentally push `sk_live_...`, rotate it immediately from the dashboard.

---

## 4. Which integration should you use?

Stripe's current official guidance: **default to Checkout Sessions** unless you have a specific reason to build your own form.

| Approach | When to use it |
|---|---|
| **Stripe Checkout** (hosted or embedded) | 90% of apps. Fastest to build, PCI compliance handled entirely by Stripe, built-in 3D Secure, Apple/Google Pay, tax, localization. |
| **Stripe Elements + Payment Intents** | You need a fully custom, inline payment form and are willing to manage more of the flow yourself (multi-step checkout, deep branding control). |

This guide covers **Stripe Checkout** (recommended path), then a short section on Elements for when you need it.

---

## 5. Set up the Stripe client (server-side)

```ts
// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28", // pin a version so future Stripe changes don't silently break you
});
```

Pinning `apiVersion` matters: Stripe updates its API periodically, and pinning keeps your integration stable until you choose to upgrade.

---

## 6. Create a Checkout Session (one-time payment)

Use a **Server Action** so the secret key never touches the browser.

```ts
// app/actions/checkout.ts
"use server";

import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";

export async function createCheckoutSession(formData: FormData) {
  const priceId = formData.get("priceId") as string;

  const session = await stripe.checkout.sessions.create({
    mode: "payment", // use "subscription" for recurring billing
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
  });

  if (session.url) redirect(session.url);
}
```

> **Important:** Never trust an amount sent from the client. Always create the `price` in the Stripe Dashboard (or via API) and reference it by `priceId`, or compute the amount server-side. Letting the frontend POST `{ amount: 5000 }` is a common and dangerous mistake.

Trigger it from a simple form:

```tsx
// app/pricing/page.tsx
import { createCheckoutSession } from "@/app/actions/checkout";

export default function PricingPage() {
  return (
    <form action={createCheckoutSession}>
      <input type="hidden" name="priceId" value="price_12345" />
      <button type="submit">Buy now</button>
    </form>
  );
}
```

Get `priceId` from **Dashboard → Product catalog → your product → copy Price ID**.

### Embedded Checkout (keeps the user on your domain)

Instead of redirecting to Stripe's hosted page, you can render Checkout inline using `ui_mode: "embedded"`:

```ts
const session = await stripe.checkout.sessions.create({
  ui_mode: "embedded",
  mode: "payment",
  line_items: [{ price: priceId, quantity: 1 }],
  return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/return?session_id={CHECKOUT_SESSION_ID}`,
});
// return session.client_secret to the client
```

On the client, mount it with `@stripe/react-stripe-js`'s `EmbeddedCheckoutProvider` / `EmbeddedCheckout` components, passing the `client_secret`.

---

## 7. Handle the result page

```tsx
// app/success/page.tsx
import { stripe } from "@/lib/stripe";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) return <p>Missing session.</p>;

  const session = await stripe.checkout.sessions.retrieve(session_id);

  return <p>Thanks! Payment status: {session.payment_status}</p>;
}
```

Use this page for UX only (showing a "thank you" message) — **never** grant access, ship a product, or provision an account based solely on this redirect. Users can close the tab before it loads. The **webhook** is your real source of truth (next step).

---

## 8. Webhooks — the source of truth

Webhooks tell your backend that a payment actually completed, independent of whether the user's browser made it back to your success page.

```ts
// app/api/webhooks/stripe/route.ts
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // TODO: mark order as paid in your database using session.id / session.customer
      break;
    }
    case "invoice.payment_failed": {
      // TODO: handle failed subscription renewal (dunning, notify user)
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
```

A few rules that prevent real production bugs:

- Read the **raw body** (`req.text()`), not parsed JSON — signature verification needs the exact bytes.
- Return a `200` quickly. If your handler errors or times out, Stripe retries the event for up to 72 hours.
- Make your handler **idempotent** (e.g., check `event.id` or `session.id` against what's already recorded) so retries can't double-fulfill an order.

### Get your webhook secret locally

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This prints a `whsec_...` value — put it in `STRIPE_WEBHOOK_SECRET` in `.env.local`. You can also fire test events manually:

```bash
stripe trigger checkout.session.completed
```

### Production webhook setup

In **Dashboard → Developers → Webhooks → Add endpoint**, point it at `https://yourdomain.com/api/webhooks/stripe`, select the events you handle (at minimum `checkout.session.completed`), then copy the **Signing secret** into your production environment variables (e.g., Vercel → Project → Settings → Environment Variables).

---

## 9. Subscriptions (recurring billing)

Same Checkout Session flow, just switch the mode and use a recurring Price:

```ts
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: recurringPriceId, quantity: 1 }],
  success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
});
```

Also listen for these webhook events to keep your database in sync:

- `customer.subscription.updated` — plan changes, renewals
- `customer.subscription.deleted` — cancellations
- `invoice.payment_failed` — failed renewal (trigger dunning / restrict access)

For letting customers manage their own subscription (upgrade, cancel, update card), use the **Customer Portal**:

```ts
const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
});
redirect(portalSession.url);
```

---

## 10. Custom form with Stripe Elements (optional, advanced)

Only reach for this if Checkout genuinely can't fit your flow (e.g., payment collection mid-multi-step-form with heavy custom branding).

**Server Action** — create a Payment Intent instead of a Checkout Session:

```ts
"use server";
import { stripe } from "@/lib/stripe";

export async function createPaymentIntent(amount: number) {
  const intent = await stripe.paymentIntents.create({
    amount, // in the smallest currency unit, e.g. cents
    currency: "usd",
    automatic_payment_methods: { enabled: true },
  });
  return intent.client_secret;
}
```

**Client component:**

```tsx
"use client";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useState } from "react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/success` },
    });
    if (error) console.error(error.message);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button disabled={!stripe || loading}>{loading ? "Processing…" : "Pay"}</button>
    </form>
  );
}

export default function PaymentForm({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm />
    </Elements>
  );
}
```

Wrap `PaymentElement` this way whenever you need cards, wallets, and 40+ local payment methods rendered automatically, with Stripe handling validation and 3D Secure.

---

## 11. Testing

Use these card numbers in **test mode** (any future expiry date, any CVC, any postal code):

| Scenario | Card number |
|---|---|
| Success | `4242 4242 4242 4242` |
| Requires 3D Secure | `4000 0027 6000 3184` |
| Declined | `4000 0000 0000 0002` |
| Insufficient funds | `4000 0000 0000 9995` |

Test every failure path, not just the happy path — the most common integration bug is a checkout that breaks silently on a declined card instead of showing the user an error.

---

## 12. Going live checklist

- [ ] Switch Dashboard toggle from Test to Live mode; swap in `sk_live_...` / `pk_live_...` keys in your production env
- [ ] Create a **production** webhook endpoint and use its own `whsec_...` secret
- [ ] Confirm `.env.local` is git-ignored; never hardcode keys
- [ ] Verify amounts/prices are always resolved server-side, never trusted from the client
- [ ] Confirm webhook handler is idempotent (safe against Stripe's retries)
- [ ] Enable Stripe Radar (fraud detection) and review its default rules
- [ ] If handling EU/UK customers, confirm 3D Secure / SCA is on (`automatic_payment_methods` handles this by default)

---

## Quick reference: file structure

```
lib/stripe.ts                        # server-side Stripe client
app/actions/checkout.ts              # Server Action: create Checkout Session
app/api/webhooks/stripe/route.ts     # Webhook handler (Route Handler required — needs a static URL)
app/pricing/page.tsx                 # Buy button
app/success/page.tsx                 # Post-payment UX (not fulfillment)
```

**Rule of thumb:** Checkout Session for the payment, Webhook for fulfillment, Route Handler only needed for the webhook (everything else can be a Server Action).