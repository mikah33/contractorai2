import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

/**
 * Global app initialization hook with React Query caching
 * PREFETCHES ALL DATA ON LOGIN so every tab is ready immediately
 */
export const useAppInitialization = () => {
  // Use ref to persist initialization state across re-renders
  const hasInitialized = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // If already initialized via ref, always return initialized
    if (hasInitialized.current) {
      if (!isInitialized) {
        setIsInitialized(true);
      }
      return;
    }

    if (!user) {
      // No user = immediately mark as initialized (don't block login screen)
      if (!isInitialized) {
        setIsInitialized(true);
        hasInitialized.current = true;
      }
      return;
    }

    let isMounted = true;

    const prefetchAllData = async () => {
      try {
        console.log('🚀 Prefetching all data for all tabs...');

        // Prefetch ALL queries in parallel on login
        const prefetchPromises = [
          // Projects
          queryClient.prefetchQuery({
            queryKey: queryKeys.projects,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
              if (error) throw error;
              console.log('  ✅ Projects prefetched');
              return data || [];
            },
          }),

          // Clients
          queryClient.prefetchQuery({
            queryKey: queryKeys.clients,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
              if (error) throw error;
              console.log('  ✅ Clients prefetched');
              return data || [];
            },
          }),

          // Estimates
          queryClient.prefetchQuery({
            queryKey: queryKeys.estimates,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('estimates')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
              if (error) throw error;
              console.log('  ✅ Estimates prefetched');
              return data || [];
            },
          }),

          // Receipts (catch 404 if table doesn't exist)
          queryClient.prefetchQuery({
            queryKey: queryKeys.receipts,
            queryFn: async () => {
              try {
                const { data, error } = await supabase
                  .from('receipts')
                  .select('*')
                  .eq('user_id', user.id)
                  .order('created_at', { ascending: false });
                if (error) {
                  if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    console.log('  ⚠️  Receipts table not found, skipping...');
                    return [];
                  }
                  throw error;
                }
                console.log('  ✅ Receipts prefetched');
                return data || [];
              } catch (err) {
                console.log('  ⚠️  Receipts query failed, skipping...');
                return [];
              }
            },
          }),

          // Payments (catch 404 if table doesn't exist)
          queryClient.prefetchQuery({
            queryKey: queryKeys.payments,
            queryFn: async () => {
              try {
                const { data, error } = await supabase
                  .from('payments')
                  .select('*')
                  .eq('user_id', user.id)
                  .order('created_at', { ascending: false });
                if (error) {
                  if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    console.log('  ⚠️  Payments table not found, skipping...');
                    return [];
                  }
                  throw error;
                }
                console.log('  ✅ Payments prefetched');
                return data || [];
              } catch (err) {
                console.log('  ⚠️  Payments query failed, skipping...');
                return [];
              }
            },
          }),

          // Invoices
          queryClient.prefetchQuery({
            queryKey: queryKeys.invoices,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
              if (error) throw error;
              console.log('  ✅ Invoices prefetched');
              return data || [];
            },
          }),

          // Calendar Events
          queryClient.prefetchQuery({
            queryKey: queryKeys.events,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', user.id)
                .order('start_date', { ascending: true });
              if (error) throw error;
              console.log('  ✅ Events prefetched');
              return data || [];
            },
          }),
        ];

        await Promise.all(prefetchPromises);

        if (isMounted) {
          console.log('✅ All data prefetched - every tab is ready!');
          hasInitialized.current = true;
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('❌ Error prefetching data:', error);
        if (isMounted) {
          setInitError(error instanceof Error ? error.message : 'Failed to prefetch data');
          hasInitialized.current = true;
          setIsInitialized(true); // Initialize anyway to not block app
        }
      }
    };

    prefetchAllData();

    return () => {
      isMounted = false;
    };
  }, [user, queryClient]); // Add queryClient to dependencies

  return { isInitialized, initError };
};
