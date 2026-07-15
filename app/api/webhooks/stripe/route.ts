import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");
  const stripe = getStripeClient();

  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  if (!stripe) {
    return new NextResponse("Stripe is not configured", { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new NextResponse(`Webhook Error: ${(error as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("Checkout completed", session.id);
      break;
    }
    case "invoice.payment_failed": {
      console.log("Invoice payment failed");
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
