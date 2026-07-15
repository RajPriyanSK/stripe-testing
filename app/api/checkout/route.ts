import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const formData = await req.formData();
  const submittedPriceId = formData.get("priceId");
  const priceId = typeof submittedPriceId === "string" && submittedPriceId.trim()
    ? submittedPriceId
    : process.env.STRIPE_PRICE_ID ?? null;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!priceId || !priceId.startsWith("price_")) {
    return NextResponse.json({ error: "A valid Stripe price ID is required." }, { status: 400 });
  }

  if (!secretKey || secretKey.includes("placeholder")) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 500 });
  }

  if (!baseUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_BASE_URL is missing." }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
    });

    if (session.url) {
      return NextResponse.redirect(session.url, 303);
    }

    return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
  } catch (error) {
    console.error("Checkout failed:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
