// BuyWise retailer integration registry.
// This is the shared contract/status layer. Provider-specific API calls must be
// implemented only after the retailer grants the required API credentials and terms.
export const retailerIntegrations = [
  {
    id: "amazon-in",
    name: "Amazon India",
    connection: "not_connected",
    description: "Product and offer data through an approved Amazon API integration.",
    requirements: "Eligible Associates account and approved Creators API access."
  },
  {
    id: "flipkart",
    name: "Flipkart",
    connection: "not_connected",
    description: "Product catalogue and offer data through an approved Flipkart affiliate integration.",
    requirements: "Registered affiliate account and API access."
  },
  {
    id: "croma",
    name: "Croma",
    connection: "not_connected",
    description: "Product data through an authorised affiliate feed or commercial partnership.",
    requirements: "Confirm feed/API availability and obtain partner approval."
  },
  {
    id: "reliance-digital",
    name: "Reliance Digital",
    connection: "not_connected",
    description: "Product data through an authorised feed or commercial partnership.",
    requirements: "Confirm feed/API availability and obtain partner approval."
  }
];

// Future provider adapters should export a searchProducts(query) function and
// return normalized offers in the shape documented in INTEGRATIONS.md.
// Never scrape retailer pages or invent prices as a substitute for authorised feeds.
