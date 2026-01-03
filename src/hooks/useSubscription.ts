import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Capacitor } from '@capacitor/core';

export interface SubscriptionInfo {
  hasSubscription: boolean;
  subscriptionStatus: string | null;
  subscriptionSource: 'apple' | 'stripe' | 'none' | null;
  subscriptionPlan: string | null;
  expiresAt: Date | null;
  isTrialing: boolean;
  isPastDue: boolean;
}

export const useSubscription = () => {
  const { user, profile } = useAuthStore();
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    hasSubscription: false,
    subscriptionStatus: null,
    subscriptionSource: null,
    subscriptionPlan: null,
    expiresAt: null,
    isTrialing: false,
    isPastDue: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription({
        hasSubscription: false,
        subscriptionStatus: null,
        subscriptionSource: null,
        subscriptionPlan: null,
        expiresAt: null,
        isTrialing: false,
        isPastDue: false,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the database function to check subscription
      const { data, error: dbError } = await supabase.rpc('check_user_subscription', {
        user_id: user.id,
      });

      if (dbError) {
        console.error('[useSubscription] Error checking subscription:', dbError);

        // Fallback to direct profile query
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_source, subscription_plan, subscription_end_date')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        const status = profileData?.subscription_status;
        const hasActive = status === 'active' || status === 'trialing';

        setSubscription({
          hasSubscription: hasActive,
          subscriptionStatus: status || null,
          subscriptionSource: profileData?.subscription_source || null,
          subscriptionPlan: profileData?.subscription_plan || null,
          expiresAt: profileData?.subscription_end_date ? new Date(profileData.subscription_end_date) : null,
          isTrialing: status === 'trialing',
          isPastDue: status === 'past_due',
        });
      } else if (data && data.length > 0) {
        const result = data[0];
        setSubscription({
          hasSubscription: result.has_subscription || false,
          subscriptionStatus: result.subscription_status || null,
          subscriptionSource: result.subscription_source || null,
          subscriptionPlan: result.subscription_plan || null,
          expiresAt: result.expires_at ? new Date(result.expires_at) : null,
          isTrialing: result.subscription_status === 'trialing',
          isPastDue: result.subscription_status === 'past_due',
        });
      }
    } catch (err: any) {
      console.error('[useSubscription] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Also check from profile if available (faster initial load)
  useEffect(() => {
    if (profile) {
      const status = (profile as any).subscription_status;
      const hasActive = status === 'active' || status === 'trialing';

      setSubscription((prev) => ({
        ...prev,
        hasSubscription: hasActive,
        subscriptionStatus: status || prev.subscriptionStatus,
        subscriptionSource: (profile as any).subscription_source || prev.subscriptionSource,
        subscriptionPlan: (profile as any).subscription_plan || prev.subscriptionPlan,
      }));
    }
  }, [profile]);

  // Helper to determine if we should use Stripe or RevenueCat
  const isNativePlatform = Capacitor.isNativePlatform();
  const paymentProvider = isNativePlatform ? 'revenuecat' : 'stripe';

  return {
    ...subscription,
    loading,
    error,
    refresh: checkSubscription,
    paymentProvider,
    isNativePlatform,
  };
};

// Export a simpler hook for just checking if user has active subscription
export const useHasSubscription = () => {
  const { hasSubscription, loading } = useSubscription();
  return { hasSubscription, loading };
};
