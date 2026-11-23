# BuyWise retailer integration contract

The API now exposes retailer connection status at:

- `GET /api/retailers`
- `GET /api/integrations/status`

All four retailers intentionally report `not_connected` until BuyWise has approved access and a provider adapter is implemented. This avoids presenting sample listings as live offers.

## Normalized offer shape

A provider adapter should normalize every approved provider response into:

```js
{
  retailerId: "amazon-in",
  retailerName: "Amazon India",
  externalProductId: "provider-product-id",
  title: "Exact product title",
  productUrl: "https://retailer.example/exact-product",
  imageUrl: "https://retailer.example/product-image.jpg",
  price: 12345,
  currency: "INR",
  availability: "In stock",
  fetchedAt: new Date().toISOString(),
  isDemo: false
}
```

## Required safeguards

1. Keep provider credentials on the server in environment variables. Never put API keys in React/Vite client code or commit them to Git.
2. Use only official APIs, authorised affiliate feeds, or written partner integrations.
3. Respect provider rate limits, caching rules, attribution requirements and terms.
4. Store provider product IDs and exact product URLs; do not match products by title alone where identifiers are available.
5. Mark a price as live only when it came from a successful authorised provider response. Preserve `is_demo = 1` for sample data.
6. Store fetch timestamps and surface stale/unavailable offers honestly.
7. Do not scrape retailer pages or fabricate prices.

Provider-specific request and authentication code should be added only after the retailer's current API documentation and BuyWise's approved access are available.
