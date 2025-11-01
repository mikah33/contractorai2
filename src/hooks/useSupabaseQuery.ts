import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryClient';
import { useAuthStore } from '../stores/authStore';

// ===== PROJECTS =====
export const useProjects = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (projectData: any) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...projectData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: updated, error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
};

// ===== CLIENTS =====
export const useClients = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (clientData: any) => {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...clientData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
};

// ===== ESTIMATES =====
export const useEstimates = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.estimates,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateEstimate = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (estimateData: any) => {
      const { data, error } = await supabase
        .from('estimates')
        .insert([{ ...estimateData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates });
    },
  });
};

// ===== FINANCE =====
export const useReceipts = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.receipts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const usePayments = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.payments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useInvoices = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateReceipt = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (receiptData: any) => {
      const { data, error } = await supabase
        .from('receipts')
        .insert([{ ...receiptData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.receipts });
      queryClient.invalidateQueries({ queryKey: queryKeys.financeSummary });
    },
  });
};

// ===== CALENDAR =====
export const useEvents = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.events,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (eventData: any) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{ ...eventData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
    },
  });
};

// ===== PREFETCH UTILITY =====
export const usePrefetchData = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const prefetchAll = async () => {
    if (!user) return;

    await Promise.all([
      queryClient.prefetchQuery({ queryKey: queryKeys.projects }),
      queryClient.prefetchQuery({ queryKey: queryKeys.clients }),
      queryClient.prefetchQuery({ queryKey: queryKeys.estimates }),
      queryClient.prefetchQuery({ queryKey: queryKeys.receipts }),
      queryClient.prefetchQuery({ queryKey: queryKeys.payments }),
      queryClient.prefetchQuery({ queryKey: queryKeys.invoices }),
      queryClient.prefetchQuery({ queryKey: queryKeys.events }),
    ]);
  };

  return { prefetchAll };
};
