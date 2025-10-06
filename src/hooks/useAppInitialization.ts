import { useEffect, useState } from 'react';
import { useClientsStore } from '../stores/clientsStore';
import useProjectStore from '../stores/projectStore';
import useEstimateStore from '../stores/estimateStore';
import { useFinanceStore } from '../stores/financeStoreSupabase';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';

/**
 * Global app initialization hook
 * Loads all essential data on app startup
 */
export const useAppInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const fetchClients = useClientsStore(state => state.fetchClients);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const fetchEstimates = useEstimateStore(state => state.fetchEstimates);
  const fetchReceipts = useFinanceStore(state => state.fetchReceipts);
  const fetchPayments = useFinanceStore(state => state.fetchPayments);
  const fetchInvoices = useFinanceStore(state => state.fetchInvoices);
  const fetchEvents = useCalendarStoreSupabase(state => state.fetchEvents);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app data...');

        // Load all data in parallel with individual logging
        const results = await Promise.allSettled([
          fetchClients().then(() => console.log('✅ Clients loaded')),
          fetchProjects().then(() => console.log('✅ Projects loaded')),
          fetchEstimates().then(() => console.log('✅ Estimates loaded')),
          fetchReceipts().then(() => console.log('✅ Receipts loaded')),
          fetchPayments().then(() => console.log('✅ Payments loaded')),
          fetchInvoices().then(() => console.log('✅ Invoices loaded')),
          fetchEvents().then(() => console.log('✅ Events loaded'))
        ]);

        // Check for failures
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const names = ['Clients', 'Projects', 'Estimates', 'Receipts', 'Payments', 'Invoices', 'Events'];
            console.error(`❌ Failed to load ${names[index]}:`, result.reason);
          }
        });

        if (isMounted) {
          console.log('✅ App data initialization complete');
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        if (isMounted) {
          setInitError(error instanceof Error ? error.message : 'Failed to initialize app');
          setIsInitialized(true); // Set to true anyway to prevent infinite loading
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []); // Run once on mount

  return { isInitialized, initError };
};
