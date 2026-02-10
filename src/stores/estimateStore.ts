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
  calculator_type?: string;
  calculator_data?: any;
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
  updateLocalEstimate: (id: string, updates: Partial<Estimate>) => void;
  loading: boolean; // Alias for isLoading to match existing usage
}

const useEstimateStore = create<EstimateStore>((set, get) => ({
  estimates: [],
  isLoading: false,
  error: null,
  hasLoadedOnce: false,

  // Computed property for backward compatibility
  get loading() {
    return get().isLoading;
  },

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
        calculator_type: estimate.calculator_type || null,
        calculator_data: estimate.calculator_data || null,
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
      console.log('📊 updateEstimate called with id:', id);
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

      console.log('📝 Update data:', updateData);

      // Check if estimate exists first
      const { data: existingEstimate, error: checkError } = await supabase
        .from('estimates')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking for existing estimate:', checkError);
      }

      let savedEstimate;

      if (existingEstimate) {
        // Update existing estimate
        console.log('✏️ Updating existing estimate...');
        const { data, error } = await supabase
          .from('estimates')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        savedEstimate = data;
        console.log('✅ Estimate updated successfully');
      } else {
        // Insert new estimate
        console.log('➕ Inserting new estimate...');
        const insertData = {
          id,
          ...updateData,
          user_id: userId
        };

        const { data, error } = await supabase
          .from('estimates')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('❌ Insert error:', error);
          throw error;
        }
        savedEstimate = data;
        console.log('✅ Estimate inserted successfully');
      }

      // Update local state
      set((state) => {
        const existingIndex = state.estimates.findIndex(e => e.id === id);
        let newEstimates;

        if (existingIndex >= 0) {
          // Update existing estimate in state
          newEstimates = state.estimates.map((estimate) =>
            estimate.id === id ? { ...estimate, ...updateData } : estimate
          );
        } else {
          // Add new estimate to state
          newEstimates = [savedEstimate, ...state.estimates];
        }

        return {
          estimates: newEstimates,
          isLoading: false
        };
      });

      console.log('✅ Local state updated');
    } catch (error) {
      console.error('❌ Error in updateEstimate:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error; // Re-throw so caller can handle it
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
        calculator_type: calculatorData.calculatorType || null,
        calculator_data: calculatorData.calculatorData || null,
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
  },

  // Real-time update method for use by subscription hooks
  updateLocalEstimate: (id, updates) => {
    set((state) => {
      const existingIndex = state.estimates.findIndex(e => e.id === id);

      if (existingIndex >= 0) {
        // Update existing estimate
        const newEstimates = state.estimates.map((estimate) =>
          estimate.id === id ? { ...estimate, ...updates } : estimate
        );
        return { estimates: newEstimates };
      } else {
        // If estimate not found locally, we could add it, but probably should fetch fresh
        console.log('Estimate not found in local state, consider fetching fresh estimates');
        return state;
      }
    });
  }
}));

export default useEstimateStore;