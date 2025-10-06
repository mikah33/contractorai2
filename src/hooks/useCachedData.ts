/**
 * Cached data hooks - drop-in replacements for Zustand stores
 * These use React Query cache so data persists between page navigation
 */

import {
  useProjects as useProjectsQuery,
  useEstimates as useEstimatesQuery,
  useEvents as useEventsQuery,
  useReceipts as useReceiptsQuery,
  usePayments as usePaymentsQuery,
  useInvoices as useInvoicesQuery,
  useClients as useClientsQuery
} from './useSupabaseQuery';

/**
 * Get cached projects - replaces useProjectStore
 */
export const useCachedProjects = () => {
  const { data: projects = [], isLoading } = useProjectsQuery();

  return {
    projects,
    loading: isLoading,
    // Keep the same API as the old store
    fetchProjects: () => Promise.resolve(), // No-op, React Query handles it
  };
};

/**
 * Get cached estimates - replaces useEstimateStore
 */
export const useCachedEstimates = () => {
  const { data: estimates = [], isLoading } = useEstimatesQuery();

  return {
    estimates,
    loading: isLoading,
    fetchEstimates: () => Promise.resolve(), // No-op, React Query handles it
  };
};

/**
 * Get cached events - replaces useCalendarStoreSupabase
 */
export const useCachedEvents = () => {
  const { data: events = [], isLoading } = useEventsQuery();

  return {
    events,
    loading: isLoading,
    fetchEvents: () => Promise.resolve(), // No-op, React Query handles it
  };
};

/**
 * Get cached clients - replaces useClientsStore
 */
export const useCachedClients = () => {
  const { data: clients = [], isLoading } = useClientsQuery();

  return {
    clients,
    loading: isLoading,
    fetchClients: () => Promise.resolve(), // No-op, React Query handles it
  };
};

/**
 * Get cached finance data - replaces useFinanceStore
 */
export const useCachedFinance = () => {
  const { data: receipts = [] } = useReceiptsQuery();
  const { data: payments = [] } = usePaymentsQuery();
  const { data: invoices = [] } = useInvoicesQuery();

  // Calculate summary from cached data
  const totalRevenue = payments
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const totalExpenses = receipts
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  return {
    receipts,
    payments,
    invoices,
    financialSummary: {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
    },
    fetchReceipts: () => Promise.resolve(),
    fetchPayments: () => Promise.resolve(),
    fetchInvoices: () => Promise.resolve(),
  };
};
