import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { SaveCalculatorEstimateModal } from './SaveCalculatorEstimateModal';
import { LoadEstimateDropdown } from './LoadEstimateDropdown';
import { supabase } from '../../lib/supabase';

interface CalculatorEstimateHeaderProps {
  calculatorType: string;
  currentData: Record<string, any>;
  onLoad: (estimateData: Record<string, any>, resultsData?: Record<string, any>) => void;
  resultsData?: Record<string, any>;
  title?: string;
  description?: string;
}

export const CalculatorEstimateHeader: React.FC<CalculatorEstimateHeaderProps> = ({
  calculatorType,
  currentData,
  onLoad,
  resultsData,
  title,
  description,
}) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (name: string, clientId: string | null) => {
    setSaveError(null);

    try {
      console.log('🔵 Starting save operation...');
      console.log('Calculator Type:', calculatorType);
      console.log('Estimate Name:', name);
      console.log('Current Data:', currentData);
      console.log('Results Data:', resultsData);

      const { data: { user } } = await supabase.auth.getUser();
      console.log('User:', user?.id);

      if (!user) throw new Error('Not authenticated');

      const insertData = {
        user_id: user.id,
        estimate_name: name,
        calculator_type: calculatorType,
        estimate_data: currentData,
        results_data: resultsData || {},
        client_id: clientId,
      };

      console.log('Inserting data:', insertData);

      const { data, error } = await supabase
        .from('calculator_estimates')
        .insert(insertData)
        .select();

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Save successful! Data:', data);
    } catch (err) {
      console.error('❌ Error saving estimate:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save estimate');
      throw err;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title Section */}
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-500">
                {description}
              </p>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-3">
            <LoadEstimateDropdown
              calculatorType={calculatorType}
              onLoad={onLoad}
            />
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Estimate
            </button>
          </div>
        </div>

        {/* Error Display */}
        {saveError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {saveError}
          </div>
        )}
      </div>

      {/* Save Modal */}
      <SaveCalculatorEstimateModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSave}
        calculatorType={calculatorType}
        estimateData={currentData}
        resultsData={resultsData}
      />
    </div>
  );
};
