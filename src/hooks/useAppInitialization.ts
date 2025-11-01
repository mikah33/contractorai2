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
        console.log('🚀 Loading essential data...');

        // Only prefetch CRITICAL data on login - lazy load the rest
        // This makes login much faster
        const prefetchPromises = [
          // Projects (critical - used in many places)
          queryClient.prefetchQuery({
            queryKey: queryKeys.projects,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
              if (error) throw error;
              console.log('  ✅ Projects loaded');
              return data || [];
            },
          }),

          // Clients (critical - used in many places)
          queryClient.prefetchQuery({
            queryKey: queryKeys.clients,
            queryFn: async () => {
              const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
              if (error) throw error;
              console.log('  ✅ Clients loaded');
              return data || [];
            },
          }),
        ];

        // Wait for critical data only
        await Promise.all(prefetchPromises);

        if (isMounted) {
          console.log('✅ Essential data loaded - app ready!');
          console.log('   Other data will load on-demand when you visit each page');
          hasInitialized.current = true;
          setIsInitialized(true);

          // Prefetch other data in background (don't wait)
          setTimeout(() => {
            console.log('🔄 Background loading additional data...');

            // Estimates
            queryClient.prefetchQuery({
              queryKey: queryKeys.estimates,
              queryFn: async () => {
                const { data } = await supabase
                  .from('estimates')
                  .select('*')
                  .eq('user_id', user.id)
                  .order('created_at', { ascending: false });
                return data || [];
              },
            }).catch(() => {});

            // Invoices
            queryClient.prefetchQuery({
              queryKey: queryKeys.invoices,
              queryFn: async () => {
                const { data } = await supabase
                  .from('invoices')
                  .select('*')
                  .eq('user_id', user.id)
                  .order('created_at', { ascending: false });
                return data || [];
              },
            }).catch(() => {});
          }, 2000); // Start background loading after 2 seconds
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        if (isMounted) {
          setInitError(error instanceof Error ? error.message : 'Failed to load data');
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
