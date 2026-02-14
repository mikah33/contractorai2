import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Check, Zap, Crown } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { revenueCatWebService } from '../services/revenueCatWebService';
import { Capacitor } from '@capacitor/core';
import { revenueCatService } from '../services/revenueCatService';

interface PackageOption {
  identifier: string;
  title: string;
  price: string;
  pricePerMonth: string;
  duration: string;
  savings?: string;
  popular?: boolean;
  rcPackage: any;
}

const SubscriptionsWeb = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const isIOS = Capacitor.getPlatform() === 'ios';

  useEffect(() => {
    const loadOfferings = async () => {
      if (!user) {
        navigate('/auth/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (isIOS) {
          // iOS - use native paywall directly
          await revenueCatService.initialize(user.id);
          await revenueCatService.presentPaywall('ContractorAI Pro');
          navigate(-1);
          return;
        }

        // Web - go directly to RevenueCat checkout (skip custom UI)
        await revenueCatWebService.initialize(user.id);
        const result = await revenueCatWebService.purchaseCurrentOffering();
        if (result.success) {
          navigate('/');
        } else {
          // If user cancelled, go back to previous screen
          navigate(-1);
        }
        return;
      } catch (err: any) {
        console.error('[SubscriptionsWeb] Error:', err);
        setError(err.message || 'Failed to load subscription options');
        setLoading(false);
      }
    };

    loadOfferings();
  }, [user, navigate, isIOS]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    const pkg = packages.find(p => p.identifier === selectedPackage);
    if (!pkg?.rcPackage) return;

    try {
      setPurchasing(true);
      setError(null);

      const { Purchases } = await import('@revenuecat/purchases-js');
      await Purchases.getSharedInstance().purchase({ rcPackage: pkg.rcPackage });

      // Success - sync and navigate
      await revenueCatWebService.syncSubscriptionToSupabase();
      navigate('/');
    } catch (err: any) {
      console.error('[SubscriptionsWeb] Purchase error:', err);

      if (err.userCancelled) {
        // User cancelled - just reset state
        setPurchasing(false);
        return;
      }

      setError(err.message || 'Purchase failed. Please try again.');
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-zinc-400">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  const features = [
    'Unlimited AI-powered estimates',
    'Smart pricing calculator',
    'Project management tools',
    'Client CRM & invoicing',
    'Finance tracking dashboard',
    'Calendar & scheduling',
    'Photo gallery & documentation',
    'Priority support',
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <div className="border-b border-[#2C2C2E]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => {
              // Sign out and go to welcome screen
              import('../lib/supabase').then(({ supabase }) => {
                supabase.auth.signOut().then(() => {
                  window.location.href = '/auth/welcome';
                });
              });
            }}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">ContractorAI Pro</h1>
          <p className="text-zinc-400">The complete toolkit for modern contractors</p>
        </div>

        {/* Package Selection */}
        <div className="space-y-3 mb-8">
          {packages.map((pkg) => (
            <button
              key={pkg.identifier}
              onClick={() => setSelectedPackage(pkg.identifier)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                selectedPackage === pkg.identifier
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-[#2C2C2E] bg-[#1C1C1E] hover:border-[#3C3C3E]'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
                  Most Popular
                </span>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPackage === pkg.identifier
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-zinc-600'
                  }`}>
                    {selectedPackage === pkg.identifier && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{pkg.title}</div>
                    <div className="text-sm text-zinc-400">{pkg.pricePerMonth}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">{pkg.price}</div>
                  <div className="text-xs text-zinc-500">{pkg.duration}</div>
                  {pkg.savings && (
                    <div className="text-xs text-green-400 font-medium">{pkg.savings}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="bg-[#1C1C1E] rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Everything included
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handlePurchase}
          disabled={!selectedPackage || purchasing}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {purchasing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Start Free Trial
            </>
          )}
        </button>

        {/* Terms */}
        <p className="text-center text-xs text-zinc-500 mt-4">
          Free trial included. Cancel anytime. By subscribing, you agree to our{' '}
          <a href="/legal/terms" className="text-blue-500 hover:underline">Terms</a> and{' '}
          <a href="/legal/privacy" className="text-blue-500 hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionsWeb;
