/**
 * Bridge between Zustand stores and React Query cache
 * Allows Zustand stores to read from prefetched React Query data
 */

import { queryClient } from './queryClient';
import { queryKeys } from './queryClient';

/**
 * Get cached data from React Query if available
 */
export const getCachedProjects = () => {
  const data = queryClient.getQueryData(queryKeys.projects);
  return data as any[] | undefined;
};

export const getCachedClients = () => {
  const data = queryClient.getQueryData(queryKeys.clients);
  return data as any[] | undefined;
};

export const getCachedEstimates = () => {
  const data = queryClient.getQueryData(queryKeys.estimates);
  return data as any[] | undefined;
};

export const getCachedReceipts = () => {
  const data = queryClient.getQueryData(queryKeys.receipts);
  if (data) {
    console.log('🔗 Zustand → Reading receipts from React Query cache');
  }
  return data as any[] | undefined;
};

export const getCachedPayments = () => {
  const data = queryClient.getQueryData(queryKeys.payments);
  if (data) {
    console.log('🔗 Zustand → Reading payments from React Query cache');
  }
  return data as any[] | undefined;
};

export const getCachedInvoices = () => {
  const data = queryClient.getQueryData(queryKeys.invoices);
  if (data) {
    console.log('🔗 Zustand → Reading invoices from React Query cache');
  }
  return data as any[] | undefined;
};

export const getCachedEvents = () => {
  const data = queryClient.getQueryData(queryKeys.events);
  if (data) {
    console.log('🔗 Zustand → Reading events from React Query cache');
  }
  return data as any[] | undefined;
};
