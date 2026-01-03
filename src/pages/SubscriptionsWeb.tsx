import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { revenueCatWebService } from '../services/revenueCatWebService';
import { Capacitor } from '@capacitor/core';
import { revenueCatService } from '../services/revenueCatService';

const SubscriptionsWeb = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isIOS = Capacitor.getPlatform() === 'ios';

  useEffect(() => {
    const openPaywall = async () => {
      if (!user) {
        navigate('/auth/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (isIOS) {
          // iOS - use native paywall
          await revenueCatService.initialize(user.id);
          await revenueCatService.presentPaywall();
        } else {
          // Web - use RevenueCat Web Billing with current offering
          await revenueCatWebService.initialize(user.id);
          await revenueCatWebService.purchaseCurrentOffering();
        }

        // After paywall closes, go back
        navigate(-1);
      } catch (err: any) {
        console.error('[Subscriptions] Error:', err);
        setError(err.message || 'Failed to load subscription options');
        setLoading(false);
      }
    };

    openPaywall();
  }, [user, navigate, isIOS]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-zinc-400">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white">
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
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default SubscriptionsWeb;
