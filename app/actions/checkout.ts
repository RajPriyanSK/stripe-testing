"use server";

import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";

export async function createCheckoutSession(formData: FormData) {
  const priceId = formData.get("priceId") as string;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey || secretKey.includes("placeholder")) {
    redirect("/?error=Stripe+is+not+configured+yet.");
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
    });

    if (session.url) {
      redirect(session.url);
    }
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    redirect(`/?error=${encodeURIComponent((error as Error).message)}`);
  }
}
