import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getCachedEstimates } from '../lib/storeQueryBridge';

// Helper to get current user ID
const getCurrentUserId = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch (error) {
    console.log('Auth not available, using development mode');
  }
  // Return a default user ID for development
  return '00000000-0000-0000-0000-000000000000';
};

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  type: 'material' | 'labor' | 'other';
}

interface Estimate {
  id: string;
  title: string;
  client_name?: string;
  project_name?: string;
  project_id?: string;  // Add project_id to link to projects
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  total: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  notes?: string;
  terms?: string;
  expires_at?: string;
  items?: EstimateItem[];
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface EstimateStore {
  estimates: Estimate[];
  isLoading: boolean;
  error: string | null;
  hasLoadedOnce: boolean;
  fetchEstimates: (force?: boolean) => Promise<void>;
  addEstimate: (estimate: Partial<Estimate>) => Promise<Estimate | null>;
  updateEstimate: (id: string, updates: Partial<Estimate>) => Promise<void>;
  deleteEstimate: (id: string) => Promise<void>;
  createFromCalculator: (calculatorData: any) => Promise<Estimate | null>;
}

const useEstimateStore = create<EstimateStore>((set, get) => ({
  estimates: [],
  isLoading: false,
  error: null,
  hasLoadedOnce: false,

  fetchEstimates: async (force = false) => {
    // **FIRST: Check React Query cache**
    const cachedEstimates = getCachedEstimates();
    if (cachedEstimates && !force) {
      set({
        estimates: cachedEstimates,
        isLoading: false,
        hasLoadedOnce: true,
        error: null
      });
      return;
    }

    // Skip if already loaded and not forcing refresh
    const state = get();
    if (state.hasLoadedOnce && !force && state.estimates.length > 0) {
      console.log('✅ Using Zustand cached estimates data');
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ estimates: data || [], isLoading: false, hasLoadedOnce: true });
    } catch (error) {
      console.error('Error fetching estimates:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addEstimate: async (estimate) => {
    try {
      const userId = await getCurrentUserId();
      
      // Calculate tax and total
      const subtotal = estimate.subtotal || 0;
      const taxRate = estimate.tax_rate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      const newEstimate = {
        title: estimate.title || 'New Estimate',
        client_name: estimate.client_name || null,
        project_name: estimate.project_name || null,
        project_id: estimate.project_id || null,
        status: estimate.status || 'draft',
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: estimate.notes || null,
        terms: estimate.terms || 'Valid for 30 days',
        expires_at: estimate.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: estimate.items || [],
        user_id: userId
      };

      const { data, error } = await supabase
        .from('estimates')
        .insert([newEstimate])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        estimates: [data, ...state.estimates]
      }));

      return data;
    } catch (error) {
      console.error('Error adding estimate:', error);
      set({ error: (error as Error).message });
      return null;
    }
  },

  updateEstimate: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      // Recalculate if needed
      let updateData: any = { ...updates };
      if (updates.subtotal !== undefined || updates.tax_rate !== undefined) {
        const estimate = get().estimates.find(e => e.id === id);
        const subtotal = updates.subtotal ?? estimate?.subtotal ?? 0;
        const taxRate = updates.tax_rate ?? estimate?.tax_rate ?? 0;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        updateData = {
          ...updateData,
          tax_amount: taxAmount,
          total
        };
      }

      const { error } = await supabase
        .from('estimates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        estimates: state.estimates.map((estimate) =>
          estimate.id === id ? { ...estimate, ...updateData } : estimate
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating estimate:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteEstimate: async (id) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        estimates: state.estimates.filter((estimate) => estimate.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting estimate:', error);
      set({ error: (error as Error).message });
    }
  },

  createFromCalculator: async (calculatorData) => {
    try {
      const userId = await getCurrentUserId();
      
      // Extract data from calculator
      const subtotal = calculatorData.subtotal || calculatorData.total || 0;
      const taxRate = calculatorData.taxRate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      const newEstimate = {
        title: calculatorData.title || 'Calculator Estimate',
        client_name: calculatorData.clientName || null,
        project_name: calculatorData.projectName || null,
        project_id: calculatorData.projectId || null,
        status: 'draft' as const,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: calculatorData.notes || `Generated from Pricing Calculator`,
        terms: calculatorData.terms || 'Valid for 30 days from the date of issue',
        items: calculatorData.items || [],
        expires_at: calculatorData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        user_id: userId
      };

      const { data, error } = await supabase
        .from('estimates')
        .insert([newEstimate])
        .select()
        .single();

      if (error) throw error;

      // Also save calculator results to calculations table if needed
      if (calculatorData.items && calculatorData.items.length > 0) {
        const calculationData = {
          trade_name: calculatorData.title || 'Pricing Calculation',
          specifications: calculatorData.items,
          results: { 
            subtotal, 
            tax_rate: taxRate, 
            tax_amount: taxAmount, 
            total 
          },
          total_cost: total,
          user_id: userId
        };

        await supabase
          .from('calculations')
          .insert([calculationData]);
      }

      set((state) => ({
        estimates: [data, ...state.estimates]
      }));

      return data;
    } catch (error) {
      console.error('Error creating estimate from calculator:', error);
      set({ error: (error as Error).message });
      return null;
    }
  }
}));

export default useEstimateStore;