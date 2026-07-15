export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : "";
  const priceId = process.env.STRIPE_PRICE_ID ?? "price_12345";

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
      <h1>Stripe Checkout demo</h1>
      <p>Use a test Stripe price ID to start a checkout session.</p>
      {error ? (
        <p style={{ color: "#b91c1c", marginBottom: "1rem" }}>
          {error}
        </p>
      ) : null}
      <form method="post" action="/api/checkout">
        <input type="hidden" name="priceId" value={priceId} />
        <button type="submit">Buy now</button>
      </form>
    </main>
  );
}
