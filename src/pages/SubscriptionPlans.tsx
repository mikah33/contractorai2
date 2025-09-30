import { useState } from 'react';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import { stripeProducts } from '../stripe-config';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

const SubscriptionPlans = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { user, subscription } = useAuthStore();

  const handleSubscribe = async (priceId: string) => {
    if (!user) return;

    setLoading(priceId);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/subscriptions`,
          mode: 'subscription',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (priceId: string) => {
    return subscription?.price_id === priceId && subscription?.subscription_status === 'active';
  };

  return (
    <div className="py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the perfect plan for your business. All plans include our core features with different levels of functionality.
        </p>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-1 justify-center">
          {stripeProducts.map((product) => (
            <div
              key={product.priceId}
              className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm max-w-md mx-auto"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
                <p className="mt-2 text-gray-500">{product.description}</p>

                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">${product.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
              </div>

              <ul className="mb-8 space-y-4">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="ml-3 text-gray-600">AI-powered pricing calculator</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="ml-3 text-gray-600">Advanced project management</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="ml-3 text-gray-600">Financial tracking and reporting</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="ml-3 text-gray-600">Professional estimate generator</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="ml-3 text-gray-600">Calendar and scheduling</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="ml-3 text-gray-600">Ad performance analyzer</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(product.priceId)}
                disabled={loading === product.priceId || isCurrentPlan(product.priceId)}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isCurrentPlan(product.priceId)
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-center">
                  {loading === product.priceId ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {isCurrentPlan(product.priceId) ? 'Current Plan' : 'Subscribe Now'}
                </div>
              </button>

              {isCurrentPlan(product.priceId) && (
                <p className="mt-2 text-xs text-center text-gray-500">
                  You are currently subscribed to this plan
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Need Help?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Have questions about our pricing or need a custom solution? We're here to help.
          </p>
          <button className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            Contact Support
          </button>
        </div>

        <div className="mt-16 border-t border-gray-200 pt-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                30-Day Money-Back Guarantee
              </h4>
              <p className="text-gray-600">
                Try our service risk-free. If you're not completely satisfied, get a full refund.
              </p>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Secure Payments
              </h4>
              <p className="text-gray-600">
                All transactions are secured with 256-bit SSL encryption powered by Stripe.
              </p>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                24/7 Support
              </h4>
              <p className="text-gray-600">
                Get help whenever you need it from our dedicated support team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;