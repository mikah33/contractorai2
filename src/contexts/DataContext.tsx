import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import i18n from '../i18n';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  company_name?: string;
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
        // Retry once after a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (retryError && retryError.code !== 'PGRST116') {
          console.error('Profile retry failed:', retryError);
        } else if (retryData) {
          setProfile(retryData);
          if (retryData.language && retryData.language !== i18n.language) {
            i18n.changeLanguage(retryData.language);
          }
        }
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
      const { data: customer, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .single();

      if (customerError) {
        console.error('Error loading customer:', customerError);
        // Retry once after a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: retryCustomer } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .eq('user_id', user.id)
          .single();

        if (!retryCustomer?.customer_id) return;

        const { data: sub } = await supabase
          .from('stripe_subscriptions')
          .select('*')
          .eq('customer_id', retryCustomer.customer_id)
          .eq('status', 'active')
          .single();

        setSubscription(sub);
        return;
      }

      if (!customer?.customer_id) return;

      // Get active subscription
      const { data: sub, error: subError } = await supabase
        .from('stripe_subscriptions')
        .select('*')
        .eq('customer_id', customer.customer_id)
        .eq('status', 'active')
        .single();

      if (subError) {
        console.error('Error loading subscription:', subError);
        // Retry once
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: retrySub } = await supabase
          .from('stripe_subscriptions')
          .select('*')
          .eq('customer_id', customer.customer_id)
          .eq('status', 'active')
          .single();

        setSubscription(retrySub);
      } else {
        setSubscription(sub);
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  const refreshAll = async () => {
    console.log('Refreshing all data...');
    setLoading(true);
    await Promise.all([refreshProfile(), refreshSubscription()]);
    setLoading(false);
  };

  // Load data whenever user changes - always refresh
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (user) {
        console.log('User detected, loading data for user:', user.id);
        if (mounted) {
          setLoading(true);
          await Promise.all([refreshProfile(), refreshSubscription()]);
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        console.log('No user, clearing data');
        if (mounted) {
          setProfile(null);
          setSubscription(null);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [user?.id]); // Depend on user.id to reload when user changes

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
