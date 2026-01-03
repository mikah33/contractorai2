import { useState } from 'react';
import { Check, Zap, Crown, Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  priceId: string; // Stripe price ID
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
}

const plans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    interval: 'month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_BASIC || 'price_basic_monthly',
    icon: <Zap className="w-6 h-6" />,
    features: [
      'Unlimited estimates',
      'Client management',
      'Basic reporting',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    interval: 'month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO || 'price_pro_monthly',
    icon: <Crown className="w-6 h-6" />,
    popular: true,
    features: [
      'Everything in Basic',
      'AI-powered estimates',
      'Invoice management',
      'Project tracking',
      'Team collaboration',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    interval: 'month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly',
    icon: <Building2 className="w-6 h-6" />,
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'White-label options',
    ],
  },
];

const SubscriptionsWeb = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasSubscription, subscriptionPlan, subscriptionStatus, loading: subLoading } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    setLoading(plan.id);
    setError(null);

    try {
      // Call Supabase edge function to create Stripe checkout session
      const { data, error: funcError } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          priceId: plan.priceId,
          userId: user.id,
          userEmail: user.email,
          successUrl: `${window.location.origin}/settings?subscription=success`,
          cancelUrl: `${window.location.origin}/subscriptions?canceled=true`,
        },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to start subscription');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoading('manage');
    try {
      const { data, error: funcError } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          action: 'portal',
          userId: user.id,
          returnUrl: `${window.location.origin}/settings`,
        },
      });

      if (funcError) throw new Error(funcError.message);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <div className="border-b border-[#2C2C2E]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Unlock the full potential of ContractorAI with a subscription that fits your business needs.
          </p>
        </div>

        {/* Current Subscription Status */}
        {hasSubscription && (
          <div className="mb-8 p-4 bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Current Plan</p>
                <p className="text-lg font-semibold capitalize">
                  {subscriptionPlan || 'Pro'} - {subscriptionStatus}
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={loading === 'manage'}
                className="px-4 py-2 bg-[#2C2C2E] hover:bg-[#3A3A3C] rounded-lg transition-colors disabled:opacity-50"
              >
                {loading === 'manage' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Manage Subscription'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-[#1C1C1E] rounded-2xl border ${
                plan.popular ? 'border-blue-500' : 'border-[#2C2C2E]'
              } p-6 flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${plan.popular ? 'bg-blue-500/20 text-blue-400' : 'bg-[#2C2C2E] text-zinc-400'}`}>
                  {plan.icon}
                </div>
                <h3 className="text-xl font-semibold">{plan.name}</h3>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-zinc-400">/{plan.interval}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loading !== null || subLoading || (hasSubscription && subscriptionPlan === plan.id)}
                className={`w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.popular
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-white hover:bg-zinc-200 text-black'
                }`}
              >
                {loading === plan.id ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : hasSubscription && subscriptionPlan === plan.id ? (
                  'Current Plan'
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ or Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-zinc-500 text-sm">
            Secure payments powered by Stripe. Cancel anytime.
          </p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <img src="/stripe-badge.svg" alt="Stripe" className="h-8 opacity-50" onError={(e) => e.currentTarget.style.display = 'none'} />
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500 text-sm">256-bit SSL encryption</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500 text-sm">30-day money-back guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsWeb;
