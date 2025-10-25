export const stripeProducts = [
  {
    priceId: 'price_YOUR_STRIPE_PRICE_ID', // Replace with your actual Stripe price ID
    name: 'Contractor AI',
    description: 'Complete contractor management solution with AI-powered pricing, project management, and financial tracking.',
    mode: 'subscription' as const,
    price: 24.99,
    currency: 'usd',
    interval: 'month',
  },
];