import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const formData = await req.formData();
  const submittedPriceId = formData.get("priceId");
  const priceId = typeof submittedPriceId === "string" && submittedPriceId.trim()
    ? submittedPriceId
    : process.env.STRIPE_PRICE_ID ?? null;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const requestBaseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const baseUrl = configuredBaseUrl || requestBaseUrl;

  if (!priceId) {
    return NextResponse.json({ error: "A Stripe price or product reference is required." }, { status: 400 });
  }

  if (!secretKey || secretKey.includes("placeholder")) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 500 });
  }

  if (!baseUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_BASE_URL is missing and the request host could not be determined." }, { status: 500 });
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
    const message = error instanceof Error ? error.message : "Unknown Stripe error";
    console.error("Checkout failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
