import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  CalculatorEstimate,
  SaveEstimateData,
  UpdateEstimateData,
  CalculatorEstimateFilters,
  CalculatorType
} from '../types/calculator';

interface UseCalculatorEstimatesReturn {
  estimates: CalculatorEstimate[];
  loading: boolean;
  error: string | null;
  saveEstimate: (data: SaveEstimateData) => Promise<CalculatorEstimate | null>;
  loadEstimate: (id: string) => Promise<CalculatorEstimate | null>;
  updateEstimate: (id: string, data: UpdateEstimateData) => Promise<CalculatorEstimate | null>;
  deleteEstimate: (id: string) => Promise<boolean>;
  fetchEstimatesByType: (type: CalculatorType) => Promise<CalculatorEstimate[]>;
  fetchAllEstimates: (filters?: CalculatorEstimateFilters) => Promise<CalculatorEstimate[]>;
  refreshEstimates: () => Promise<void>;
}

/**
 * Custom hook for managing calculator estimates
 * Handles CRUD operations for saved calculator estimates with client associations
 */
export function useCalculatorEstimates(): UseCalculatorEstimatesReturn {
  const [estimates, setEstimates] = useState<CalculatorEstimate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all estimates for the current user
   */
  const fetchAllEstimates = useCallback(async (filters?: CalculatorEstimateFilters): Promise<CalculatorEstimate[]> => {
    try {
      setError(null);

      let query = supabase
        .from('calculator_estimates')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.calculator_type) {
        query = query.eq('calculator_type', filters.calculator_type);
      }

      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }

      if (filters?.search) {
        query = query.ilike('estimate_name', `%${filters.search}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`Failed to fetch estimates: ${fetchError.message}`);
      }

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching estimates:', err);
      return [];
    }
  }, []);

  /**
   * Fetch estimates by calculator type
   */
  const fetchEstimatesByType = useCallback(async (type: CalculatorType): Promise<CalculatorEstimate[]> => {
    return fetchAllEstimates({ calculator_type: type });
  }, [fetchAllEstimates]);

  /**
   * Load initial estimates on mount
   */
  useEffect(() => {
    const loadInitialEstimates = async () => {
      setLoading(true);
      try {
        const data = await fetchAllEstimates();
        setEstimates(data);
      } catch (err) {
        console.error('Error loading initial estimates:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialEstimates();
  }, [fetchAllEstimates]);

  /**
   * Refresh estimates manually
   */
  const refreshEstimates = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await fetchAllEstimates();
      setEstimates(data);
    } finally {
      setLoading(false);
    }
  }, [fetchAllEstimates]);

  /**
   * Save a new estimate
   */
  const saveEstimate = useCallback(async (data: SaveEstimateData): Promise<CalculatorEstimate | null> => {
    try {
      setError(null);
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const estimateData = {
        user_id: user.id,
        calculator_type: data.calculator_type,
        estimate_name: data.estimate_name,
        client_id: data.client_id || null,
        estimate_data: data.estimate_data,
        results_data: data.results_data
      };

      const { data: savedEstimate, error: insertError } = await supabase
        .from('calculator_estimates')
        .insert(estimateData)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to save estimate: ${insertError.message}`);
      }

      // Update local state
      setEstimates(prev => [savedEstimate, ...prev]);

      return savedEstimate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save estimate';
      setError(errorMessage);
      console.error('Error saving estimate:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load a specific estimate by ID
   */
  const loadEstimate = useCallback(async (id: string): Promise<CalculatorEstimate | null> => {
    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('calculator_estimates')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to load estimate: ${fetchError.message}`);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load estimate';
      setError(errorMessage);
      console.error('Error loading estimate:', err);
      return null;
    }
  }, []);

  /**
   * Update an existing estimate
   */
  const updateEstimate = useCallback(async (id: string, data: UpdateEstimateData): Promise<CalculatorEstimate | null> => {
    try {
      setError(null);
      setLoading(true);

      const { data: updatedEstimate, error: updateError } = await supabase
        .from('calculator_estimates')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update estimate: ${updateError.message}`);
      }

      // Update local state
      setEstimates(prev =>
        prev.map(est => est.id === id ? updatedEstimate : est)
      );

      return updatedEstimate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update estimate';
      setError(errorMessage);
      console.error('Error updating estimate:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete an estimate
   */
  const deleteEstimate = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);

      const { error: deleteError } = await supabase
        .from('calculator_estimates')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Failed to delete estimate: ${deleteError.message}`);
      }

      // Update local state
      setEstimates(prev => prev.filter(est => est.id !== id));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete estimate';
      setError(errorMessage);
      console.error('Error deleting estimate:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    estimates,
    loading,
    error,
    saveEstimate,
    loadEstimate,
    updateEstimate,
    deleteEstimate,
    fetchEstimatesByType,
    fetchAllEstimates,
    refreshEstimates
  };
}

export default useCalculatorEstimates;
