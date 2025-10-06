import React, { useState, useEffect } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useData } from '../contexts/DataContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionDetails {
  payment_method?: {
    brand: string;
    last4: string;
  };
  next_invoice_amount?: number;
}

interface Invoice {
  id: string;
  amount_paid: number;
  created: number;
  invoice_pdf: string;
  status: string;
}

const Subscriptions: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [showUserId, setShowUserId] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingSubscription(false);
        return;
      }

      setUserId(user.id);

      // Get Stripe customer record
      const { data: customer } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .single();

      if (!customer?.customer_id) {
        setLoadingSubscription(false);
        return;
      }

      // Get active subscription
      const { data: subscription } = await supabase
        .from('stripe_subscriptions')
        .select('*')
        .eq('customer_id', customer.customer_id)
        .eq('status', 'active')
        .single();

      setCurrentSubscription(subscription);

      // Fetch additional details if subscription exists
      if (subscription) {
        await fetchSubscriptionDetails(subscription.subscription_id);
        await fetchInvoices(customer.customer_id);
      }

      setLoadingSubscription(false);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setLoadingSubscription(false);
    }
  };

  const fetchSubscriptionDetails = async (subscriptionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-subscription-details', {
        body: { subscriptionId },
      });

      if (error) throw error;
      setSubscriptionDetails(data);
    } catch (error) {
      console.error('Error fetching subscription details:', error);
    }
  };

  const fetchInvoices = async (customerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-invoices', {
        body: { customerId },
      });

      if (error) throw error;
      setInvoices(data?.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const getPlanName = (priceId: string) => {
    const plan = plans.find(p => p.priceId === priceId);
    return plan?.name || 'Unknown Plan';
  };

  const plans = [
    {
      name: t('subscriptions.plan1Month'),
      price: '$49.99',
      priceId: import.meta.env.VITE_STRIPE_PRICE_1_MONTH || 'price_1SEXGjGcGCTrlHr7KPva7H7c',
      period: t('subscriptions.perMonth'),
      features: [
        t('subscriptions.feature1'),
        t('subscriptions.feature2'),
        t('subscriptions.feature3'),
        t('subscriptions.feature4'),
        t('subscriptions.feature5'),
        t('subscriptions.feature6'),
      ],
    },
    {
      name: t('subscriptions.plan3Months'),
      price: '$129.99',
      priceId: import.meta.env.VITE_STRIPE_PRICE_3_MONTHS || 'price_1SEXGiGcGCTrlHr7yE07hREx',
      period: t('subscriptions.per3Months'),
      popular: true,
      savings: t('subscriptions.save3Months'),
      features: [
        t('subscriptions.feature1'),
        t('subscriptions.feature2'),
        t('subscriptions.feature3'),
        t('subscriptions.feature4'),
        t('subscriptions.feature5'),
        t('subscriptions.feature6'),
      ],
    },
    {
      name: t('subscriptions.plan1Year'),
      price: '$499.99',
      priceId: import.meta.env.VITE_STRIPE_PRICE_1_YEAR || 'price_1SEY4UGcGCTrlHr7pk0lW6MD',
      period: t('subscriptions.perYear'),
      savings: t('subscriptions.save1Year'),
      features: [
        t('subscriptions.feature1'),
        t('subscriptions.feature2'),
        t('subscriptions.feature3'),
        t('subscriptions.feature4'),
        t('subscriptions.feature5'),
        t('subscriptions.feature6'),
      ],
    },
  ];

  const handleSubscribe = async (priceId: string, planName: string) => {
    try {
      setLoading(priceId);
      setSelectedPlan(planName);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert(t('subscriptions.pleaseLogin'));
        setLoading(null);
        return;
      }

      // Call Stripe checkout Edge Function
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          priceId,
          userId: user.id,
          userEmail: user.email,
        },
      });

      if (error) throw error;

      // Redirect to Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to start subscription';
      alert(errorMsg);
      setLoading(null);
      setSelectedPlan(null);
    }
  };

  const handleCloseCheckout = () => {
    setClientSecret(null);
    setSelectedPlan(null);
    setLoading(null);
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    const confirmCancel = window.confirm(
      t('subscriptions.cancelConfirm')
    );

    if (!confirmCancel) return;

    try {
      setLoading('cancel');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert(t('subscriptions.pleaseLogin'));
        setLoading(null);
        return;
      }

      // Call edge function to cancel subscription in Stripe
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId: currentSubscription.subscription_id,
        },
      });

      if (error) throw error;

      alert(t('subscriptions.cancelSuccess'));

      // Refresh subscription data
      await fetchCurrentSubscription();
      setLoading(null);
    } catch (error: any) {
      alert(error?.message || 'Failed to cancel subscription');
      setLoading(null);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    try {
      setLoading('payment');

      const { data, error } = await supabase.functions.invoke('create-billing-portal-session', {
        body: {
          subscriptionId: currentSubscription?.subscription_id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      alert(error?.message || 'Failed to update payment method');
      setLoading(null);
    }
  };

  const handleToggleAutoRenewal = async () => {
    if (!currentSubscription) return;

    const action = currentSubscription.cancel_at_period_end ? 'resume' : 'cancel';
    const confirmMessage = currentSubscription.cancel_at_period_end
      ? t('subscriptions.resumeAutoRenewalConfirm')
      : t('subscriptions.turnOffAutoRenewalConfirm');

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading('auto-renewal');

      const { error } = await supabase.functions.invoke('toggle-auto-renewal', {
        body: {
          subscriptionId: currentSubscription.subscription_id,
          cancelAtPeriodEnd: !currentSubscription.cancel_at_period_end,
        },
      });

      if (error) throw error;

      await fetchCurrentSubscription();
      setLoading(null);
    } catch (error: any) {
      alert(error?.message || 'Failed to update auto-renewal');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {currentSubscription ? t('subscriptions.yourSubscription') : t('subscriptions.choosePlan')}
          </h1>
          <p className="text-xl text-gray-600">
            {currentSubscription
              ? t('subscriptions.manageDetails')
              : t('subscriptions.selectPerfectPlan')}
          </p>
        </div>

        {/* Current Subscription Info */}
        {loadingSubscription ? (
          <div className="flex justify-center mb-12">
            <Loader2 className="animate-spin h-8 w-8 text-orange-600" />
          </div>
        ) : currentSubscription ? (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Current Plan</h2>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                currentSubscription.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Plan</p>
                <p className="text-lg font-semibold text-gray-900">
                  {getPlanName(currentSubscription.price_id)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Started</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(currentSubscription.created_at).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Renewal Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                <p className="text-lg font-semibold text-gray-900">
                  {subscriptionDetails?.payment_method ? (
                    `${subscriptionDetails.payment_method.brand.charAt(0).toUpperCase() + subscriptionDetails.payment_method.brand.slice(1)} •••• ${subscriptionDetails.payment_method.last4}`
                  ) : (
                    'Loading...'
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Next Invoice</p>
                <p className="text-lg font-semibold text-gray-900">
                  {subscriptionDetails?.next_invoice_amount !== undefined
                    ? `$${(subscriptionDetails.next_invoice_amount / 100).toFixed(2)}`
                    : 'Loading...'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Auto-Renewal</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currentSubscription.cancel_at_period_end ? (
                    <span className="text-yellow-600">Off</span>
                  ) : (
                    <span className="text-green-600">On</span>
                  )}
                </p>
              </div>
            </div>

            {/* User ID Section */}
            {userId && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">User ID</p>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-mono text-gray-900">
                        {showUserId ? userId : '••••••••-••••-••••-••••-••••••••••••'}
                      </p>
                      <button
                        onClick={() => setShowUserId(!showUserId)}
                        className="text-sm text-orange-600 hover:text-orange-700 font-semibold"
                      >
                        {showUserId ? 'Hide' : 'Show'}
                      </button>
                      {showUserId && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(userId);
                            alert('User ID copied to clipboard');
                          }}
                          className="text-sm text-gray-600 hover:text-gray-700 font-semibold"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentSubscription.cancel_at_period_end && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  Your subscription will be canceled at the end of the current billing period.
                </p>
              </div>
            )}

            {/* Change Plan */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Plan</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.filter(plan => plan.priceId !== currentSubscription.price_id).map((plan) => (
                  <div key={plan.priceId} className="p-4 border border-gray-200 rounded-md hover:border-orange-600 transition-colors">
                    <div className="mb-2">
                      <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                      <p className="text-2xl font-bold text-gray-900">{plan.price}<span className="text-sm font-normal text-gray-500">{plan.period}</span></p>
                      {plan.savings && (
                        <p className="text-sm text-green-600 font-semibold">{plan.savings}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSubscribe(plan.priceId, plan.name)}
                      disabled={loading === plan.priceId}
                      className="w-full py-2 px-4 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 font-semibold text-sm transition-colors"
                    >
                      {loading === plan.priceId ? 'Loading...' : 'Switch to this plan'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing History */}
            {invoices.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h3>
                <div className="space-y-3">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium text-gray-900">
                          ${(invoice.amount_paid / 100).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(invoice.created * 1000).toLocaleDateString()} • {invoice.status}
                        </p>
                      </div>
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-orange-600 hover:text-orange-700 font-semibold"
                      >
                        Download PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={handleUpdatePaymentMethod}
                disabled={loading === 'payment'}
                className="px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center"
              >
                {loading === 'payment' ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Loading...
                  </>
                ) : (
                  'Update Payment'
                )}
              </button>

              <button
                onClick={handleToggleAutoRenewal}
                disabled={loading === 'auto-renewal'}
                className="px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center"
              >
                {loading === 'auto-renewal' ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Updating...
                  </>
                ) : currentSubscription.cancel_at_period_end ? (
                  'Resume Auto-Renewal'
                ) : (
                  'Turn Off Auto-Renewal'
                )}
              </button>

              {!currentSubscription.cancel_at_period_end && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={loading === 'cancel'}
                  className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center"
                >
                  {loading === 'cancel' ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </button>
              )}

              <a
                href="mailto:admin@elevatedsystems.info"
                className="px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-semibold transition-colors text-center flex items-center justify-center"
              >
                Contact Support
              </a>
            </div>
          </div>
        ) : null}

        {/* Pricing Cards - Only show if no active subscription */}
        {!currentSubscription && !loadingSubscription && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.priceId}
              className={`relative bg-white rounded-lg shadow-lg overflow-hidden ${
                plan.popular ? 'ring-2 ring-orange-600' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-orange-600 text-white px-4 py-1 text-sm font-semibold">
                  POPULAR
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>

                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 ml-2">{plan.period}</span>
                </div>

                {plan.savings && (
                  <div className="mb-6">
                    <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                      {plan.savings}
                    </span>
                  </div>
                )}

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.priceId, plan.name)}
                  disabled={loading === plan.priceId}
                  className={`w-full py-3 px-6 rounded-md font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
                >
                  {loading === plan.priceId ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Subscribe Now'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* FAQ or Additional Info */}
        {!currentSubscription && !loadingSubscription && (
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            All plans include a 14-day money-back guarantee. Cancel anytime.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Need a custom plan? <a href="mailto:support@contractorai.com" className="text-orange-600 hover:text-orange-700">Contact us</a>
          </p>
        </div>
        )}
      </div>

      {/* Embedded Checkout Modal */}
      {clientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={handleCloseCheckout}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full z-10"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Complete Your Subscription</h2>
              <p className="text-gray-600 mb-6">Plan: {selectedPlan}</p>

              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{ clientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </Elements>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
