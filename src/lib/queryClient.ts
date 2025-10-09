import { QueryClient } from '@tanstack/react-query';

// Configure React Query for optimal Supabase caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 10 minutes (consider it fresh)
      staleTime: 10 * 60 * 1000,
      // Keep unused data in cache for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry failed requests
      retry: 1,
      // FIXED: Only refetch on focus if data is stale (respects staleTime)
      refetchOnWindowFocus: true,
      // NEVER refetch on mount if we have cached data
      refetchOnMount: false,
      // Refetch in background when reconnect
      refetchOnReconnect: true,
      // Keep previous data while fetching new data
      placeholderData: (previousData) => previousData,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Query key factory for consistent cache keys
export const queryKeys = {
  // Projects
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,

  // Clients
  clients: ['clients'] as const,
  client: (id: string) => ['clients', id] as const,

  // Estimates
  estimates: ['estimates'] as const,
  estimate: (id: string) => ['estimates', id] as const,

  // Finance
  receipts: ['receipts'] as const,
  payments: ['payments'] as const,
  invoices: ['invoices'] as const,
  expenses: ['expenses'] as const,
  financeSummary: ['finance', 'summary'] as const,

  // Calendar
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,

  // Employees
  employees: ['employees'] as const,
  employee: (id: string) => ['employees', id] as const,

  // Subscription
  subscription: ['subscription'] as const,
} as const;
