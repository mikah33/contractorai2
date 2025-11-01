import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Client {
  id: string;
  name: string;
}

interface SaveCalculatorEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, clientId: string | null) => Promise<void>;
  calculatorType: string;
  estimateData: Record<string, any>;
  resultsData?: Record<string, any>;
}

export const SaveCalculatorEstimateModal: React.FC<SaveCalculatorEstimateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  calculatorType,
  estimateData,
  resultsData,
}) => {
  const [estimateName, setEstimateName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingClients, setIsFetchingClients] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setEstimateName('');
      setSelectedClientId('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const fetchClients = async () => {
    setIsFetchingClients(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients');
    } finally {
      setIsFetchingClients(false);
    }
  };

  const handleSave = async () => {
    console.log('🟢 Modal Save button clicked!');
    console.log('Estimate Name:', estimateName);

    if (!estimateName.trim()) {
      setError('Please enter an estimate name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🟢 Calling onSave callback...');
      await onSave(
        estimateName.trim(),
        selectedClientId === '' ? null : selectedClientId
      );
      console.log('🟢 onSave completed successfully');
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('❌ Error in modal save:', err);
      setError(err instanceof Error ? err.message : 'Failed to save estimate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Save Calculator Estimate
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <Save className="w-5 h-5 mr-2" />
              <span>Estimate saved successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Estimate Name Input */}
          <div>
            <label
              htmlFor="estimateName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Estimate Name *
            </label>
            <input
              id="estimateName"
              type="text"
              value={estimateName}
              onChange={(e) => setEstimateName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              placeholder="e.g., Kitchen Renovation Q1 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              autoFocus
            />
          </div>

          {/* Client Selector */}
          <div>
            <label
              htmlFor="clientSelect"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Client
            </label>
            {isFetchingClients ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Loading clients...
                </span>
              </div>
            ) : (
              <select
                id="clientSelect"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">General (No Client)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Optional: Associate this estimate with a specific client
            </p>
          </div>

          {/* Calculator Type Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Calculator Type:</span>{' '}
              <span className="capitalize">
                {calculatorType.replace(/_/g, ' ')}
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !estimateName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Estimate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
