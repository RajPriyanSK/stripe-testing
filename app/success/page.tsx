import { getStripeClient } from "@/lib/stripe";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const stripe = getStripeClient();

  if (!session_id) {
    return <p>Missing session.</p>;
  }

  if (!stripe) {
    return <p>Stripe is not configured.</p>;
  }

  const session = await stripe.checkout.sessions.retrieve(session_id);

  return <p>Thanks! Payment status: {session.payment_status}</p>;
}
