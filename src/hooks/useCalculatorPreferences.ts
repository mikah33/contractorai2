import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { CalculatorInfo, calculatorRegistry } from '../data/calculatorRegistry';

interface UserCalculator {
  id: string;
  calculator_id: string;
  display_order: number;
}

export const useCalculatorPreferences = () => {
  const { user } = useAuthStore();
  const [selectedCalculators, setSelectedCalculators] = useState<CalculatorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's selected calculators
  const fetchCalculators = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_calculators')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      // If no calculators selected, show default ones (deck, foundation, roofing)
      if (!data || data.length === 0) {
        const defaultCalculators = calculatorRegistry.filter(calc =>
          ['deck', 'foundation', 'roofing'].includes(calc.id)
        );
        setSelectedCalculators(defaultCalculators);
      } else {
        // Map calculator IDs to full calculator info
        const calculators = data
          .map((uc: UserCalculator) =>
            calculatorRegistry.find(calc => calc.id === uc.calculator_id)
          )
          .filter((calc): calc is CalculatorInfo => calc !== undefined);

        setSelectedCalculators(calculators);
      }
    } catch (err) {
      console.error('Error fetching calculators:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calculators');
      // Fallback to default calculators on error
      const defaultCalculators = calculatorRegistry.filter(calc =>
        ['deck', 'foundation', 'roofing'].includes(calc.id)
      );
      setSelectedCalculators(defaultCalculators);
    } finally {
      setLoading(false);
    }
  };

  // Save calculator selections
  const saveCalculators = async (calculatorIds: string[]) => {
    if (!user) return;

    try {
      setError(null);

      // Delete all existing calculators for this user
      const { error: deleteError } = await supabase
        .from('user_calculators')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Insert new selections with order
      const newCalculators = calculatorIds.map((calcId, index) => ({
        user_id: user.id,
        calculator_id: calcId,
        display_order: index
      }));

      if (newCalculators.length > 0) {
        const { error: insertError } = await supabase
          .from('user_calculators')
          .insert(newCalculators);

        if (insertError) throw insertError;
      }

      // Update local state
      const calculators = calculatorIds
        .map(id => calculatorRegistry.find(calc => calc.id === id))
        .filter((calc): calc is CalculatorInfo => calc !== undefined);

      setSelectedCalculators(calculators);

      return { success: true };
    } catch (err) {
      console.error('Error saving calculators:', err);
      setError(err instanceof Error ? err.message : 'Failed to save calculators');
      return { success: false, error: err };
    }
  };

  // Add a single calculator
  const addCalculator = async (calculatorId: string) => {
    const currentIds = selectedCalculators.map(c => c.id);
    if (!currentIds.includes(calculatorId)) {
      await saveCalculators([...currentIds, calculatorId]);
    }
  };

  // Remove a single calculator
  const removeCalculator = async (calculatorId: string) => {
    const currentIds = selectedCalculators.map(c => c.id);
    const newIds = currentIds.filter(id => id !== calculatorId);
    await saveCalculators(newIds);
  };

  // Reorder calculators
  const reorderCalculators = async (calculatorIds: string[]) => {
    await saveCalculators(calculatorIds);
  };

  // Check if calculator is selected
  const isCalculatorSelected = (calculatorId: string): boolean => {
    return selectedCalculators.some(calc => calc.id === calculatorId);
  };

  useEffect(() => {
    fetchCalculators();
  }, [user?.id]);

  return {
    selectedCalculators,
    loading,
    error,
    saveCalculators,
    addCalculator,
    removeCalculator,
    reorderCalculators,
    isCalculatorSelected,
    refreshCalculators: fetchCalculators
  };
};
