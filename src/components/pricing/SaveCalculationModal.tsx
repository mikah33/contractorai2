import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { CalculationResult } from '../../types';
import { estimateService } from '../../services/estimateService';
import { useClientsStore } from '../../stores/clientsStore';

interface SaveCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculatorType: string;
  calculatorName: string;
  results: CalculationResult[];
  calculatorData?: Record<string, any>;
  onSaveSuccess?: () => void;
}

const SaveCalculationModal: React.FC<SaveCalculationModalProps> = ({
  isOpen,
  onClose,
  calculatorType,
  calculatorName,
  results,
  calculatorData,
  onSaveSuccess
}) => {
  const { clients, fetchClients, isLoading: clientsLoading } = useClientsStore();
  const [saveTitle, setSaveTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setSaveTitle('');
      setSelectedClientId('');
    }
  }, [isOpen, fetchClients]);

  const handleSave = async () => {
    if (!saveTitle.trim()) {
      alert('Please enter a title for this calculation');
      return;
    }

    setSaving(true);
    try {
      const total = results.reduce((sum, item) => sum + (item.cost || 0), 0);

      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const selectedClient = clients.find(c => c.id === selectedClientId);

      const estimate = {
        id: generateUUID(),
        title: saveTitle.trim(),
        clientId: selectedClientId || undefined,
        clientName: selectedClient?.name || undefined,
        status: 'draft' as const,
        subtotal: total,
        taxRate: 0,
        taxAmount: 0,
        total: total,
        items: results.map(item => ({
          id: Math.random().toString(36).substr(2, 9),
          description: item.label,
          quantity: item.value,
          unit: item.unit,
          unitPrice: item.cost ? item.cost / item.value : 0,
          total: item.cost || 0
        })),
        calculatorType,
        calculatorData
      };

      const result = await estimateService.saveEstimate(estimate);

      if (result.success) {
        alert('✅ Calculation saved successfully!');
        onClose();
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } else {
        throw new Error('Failed to save calculation');
      }
    } catch (error) {
      console.error('Error saving calculation:', error);
      alert('❌ Failed to save calculation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Save {calculatorName} Calculation</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder={`e.g., Main Street ${calculatorName}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client (Optional)
                </label>
                {clientsLoading ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading clients...</span>
                  </div>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">-- Select a client --</option>
                    {clients
                      .filter(c => c.status === 'active')
                      .map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} {client.company ? `(${client.company})` : ''}
                        </option>
                      ))}
                  </select>
                )}
                {!clientsLoading && clients.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No clients found. Add clients in the CRM section first.
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  💡 This calculation will be saved and can be loaded later from the "Saved Calculations" section.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !saveTitle.trim()}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveCalculationModal;
