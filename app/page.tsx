import Demo from '@/components/ui/demo';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : "";
  const configuredPriceId = process.env.STRIPE_PRICE_ID?.trim() ?? "";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Stripe Checkout demo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter a real Stripe Price ID from your dashboard to start checkout.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <form method="post" action="/api/checkout" className="mt-4 grid max-w-xl gap-3">
          <label htmlFor="priceId" className="text-sm font-medium">
            Price ID
          </label>
          <input
            id="priceId"
            name="priceId"
            defaultValue={configuredPriceId}
            placeholder="price_..."
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button type="submit" className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Buy now
          </button>
        </form>
      </section>

      <Demo />
    </main>
  );
}
