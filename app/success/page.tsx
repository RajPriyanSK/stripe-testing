import { redirect } from "next/navigation";
import { getStripeClient } from "@/lib/stripe";
import { PaymentSuccessScreen } from "@/components/ui/payment-success-screen";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const stripe = getStripeClient();

  if (!session_id) {
    redirect("/");
  }

  if (!stripe) {
    return <p>Stripe is not configured.</p>;
  }

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["payment_intent.payment_method", "line_items.data.price.product"],
  });

  if (session.payment_status !== "paid") {
    redirect("/");
  }

  const planName =
    (session.line_items?.data?.[0]?.price?.product as { name?: string } | null)?.name ?? "Subscription";

  const paymentMethod =
    typeof session.payment_intent === "object" &&
    session.payment_intent?.payment_method &&
    typeof session.payment_intent.payment_method === "object"
      ? formatPaymentMethod(session.payment_intent.payment_method)
      : "Card";

  const amountPaid = formatAmount(session.amount_total, session.currency);

  const dateTime = new Date(session.created * 1000).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <PaymentSuccessScreen
        sessionId={session.id}
        planName={planName}
        paymentMethod={paymentMethod}
        dateTime={dateTime}
        amountPaid={amountPaid}
      />
    </div>
  );
}

function formatAmount(amountInCents: number | null, currency: string | null) {
  if (amountInCents == null || !currency) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

function formatPaymentMethod(pm: any) {
  if (pm.card) {
    const brand = pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
    return `${brand} •••• ${pm.card.last4}`;
  }
  if (pm.type) return pm.type.replace(/_/g, " ");
  return "Card";
}
