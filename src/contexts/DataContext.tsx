import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import i18n from '../i18n';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  company?: string;
  address?: string;
  logo_url?: string;
  calendar_reminders?: boolean;
  marketing_emails?: boolean;
  security_alerts?: boolean;
  stripe_customer_id?: string;
  default_terms?: string;
  language?: string;
  contractor_notification_email?: string;
}

interface Subscription {
  subscription_id: string;
  status: string;
  price_id: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

interface DataContextType {
  profile: Profile | null;
  subscription: Subscription | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider = ({ children }: DataProviderProps) => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const refreshProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      } else if (data) {
        setProfile(data);
        // Sync language with i18n
        if (data.language && data.language !== i18n.language) {
          i18n.changeLanguage(data.language);
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const refreshSubscription = async () => {
    if (!user) return;

    try {
      // Get Stripe customer record
      const { data: customer } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .single();

      if (!customer?.customer_id) return;

      // Get active subscription
      const { data: sub } = await supabase
        .from('stripe_subscriptions')
        .select('*')
        .eq('customer_id', customer.customer_id)
        .eq('status', 'active')
        .single();

      setSubscription(sub);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([refreshProfile(), refreshSubscription()]);
    setLoading(false);
    setHasLoadedOnce(true);
  };

  // Load data ONLY ONCE when user first logs in
  useEffect(() => {
    if (user && !hasLoadedOnce) {
      refreshAll();
    } else if (!user) {
      setProfile(null);
      setSubscription(null);
      setLoading(false);
      setHasLoadedOnce(false);
    }
  }, [user]);

  return (
    <DataContext.Provider
      value={{
        profile,
        subscription,
        loading,
        refreshProfile,
        refreshSubscription,
        refreshAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
