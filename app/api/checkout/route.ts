import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";

export async function POST(req: Request) {
  const formData = await req.formData();
  const submittedPriceId = formData.get("priceId");
  const priceId = typeof submittedPriceId === "string"
    ? submittedPriceId.trim()
    : process.env.STRIPE_PRICE_ID?.trim() ?? "";
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const requestBaseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const origin = configuredBaseUrl || requestBaseUrl || new URL(req.url).origin;
  const stripe = getStripeClient();

  if (!priceId) {
    return NextResponse.json({ error: "A Stripe Price ID is required." }, { status: 400 });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 500 });
  }

  try {
    let resolvedPriceId = priceId;

    if (/^prod_[A-Za-z0-9]+$/.test(priceId)) {
      const product = await stripe.products.retrieve(priceId);
      resolvedPriceId = product.default_price as string;
    }

    if (!/^price_[A-Za-z0-9]+$/.test(resolvedPriceId)) {
      return NextResponse.json(
        {
          error: "The value you entered is not a supported Stripe Price or Product ID.",
        },
        { status: 400 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: `${origin}/success`,
      cancel_url: `${origin}/cancel`,
    });

    if (session.url) {
      return NextResponse.redirect(session.url, 303);
    }

    return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe error";
    console.error("Checkout failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
