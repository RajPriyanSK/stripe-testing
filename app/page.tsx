export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : "";
  const configuredPriceId = process.env.STRIPE_PRICE_ID ?? "";

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
      <h1>Stripe Checkout demo</h1>
      <p>Enter a real Stripe Price ID from your dashboard to start checkout.</p>
      {error ? (
        <p style={{ color: "#b91c1c", marginBottom: "1rem" }}>
          {error}
        </p>
      ) : null}
      <form method="post" action="/api/checkout" style={{ display: "grid", gap: "0.75rem", maxWidth: "420px" }}>
        <label htmlFor="priceId">Price ID</label>
        <input
          id="priceId"
          name="priceId"
          defaultValue={configuredPriceId}
          placeholder="price_..."
          style={{ padding: "0.75rem", fontSize: "1rem" }}
        />
        <button type="submit">Buy now</button>
      </form>
    </main>
  );
}
