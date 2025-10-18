import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Clock, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { estimateService } from '../../services/estimateService';
import { Trade } from '../../types';

interface SavedCalculationsProps {
  trade: Trade;
  onLoadCalculation: (calculatorData: any, estimateId: string) => void;
}

export interface SavedCalculationsRef {
  refresh: () => void;
}

const SavedCalculations = forwardRef<SavedCalculationsRef, SavedCalculationsProps>(
  ({ trade, onLoadCalculation }, ref) => {
    const [savedCalculations, setSavedCalculations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
      loadSavedCalculations();
    }, [trade.id]);

    const loadSavedCalculations = async () => {
      setLoading(true);
      try {
        const result = await estimateService.getEstimates();
        if (result.success && result.data) {
          // Filter estimates for this calculator type
          const filtered = result.data.filter(
            (est: any) => est.calculatorType === trade.id
          );
          setSavedCalculations(filtered);
        }
      } catch (error) {
        console.error('Error loading saved calculations:', error);
      } finally {
        setLoading(false);
      }
    };

    // Expose refresh method to parent components
    useImperativeHandle(ref, () => ({
      refresh: loadSavedCalculations
    }));

    const handleDelete = async (estimateId: string) => {
      if (!confirm('Delete this saved calculation?')) return;

      try {
        const result = await estimateService.deleteEstimate(estimateId);
        if (result.success) {
          setSavedCalculations(prev => prev.filter(calc => calc.id !== estimateId));
        }
      } catch (error) {
        console.error('Error deleting calculation:', error);
        alert('Failed to delete calculation');
      }
    };

    if (loading) {
      return (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      );
    }

    if (savedCalculations.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No saved calculations yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Your calculations will be saved here for future reference
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">
              Saved Calculations ({savedCalculations.length})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-gray-200 divide-y divide-gray-200">
            {savedCalculations.map((calc) => (
              <div
                key={calc.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {calc.title || 'Unnamed Calculation'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>
                        {new Date(calc.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-green-600">
                        ${calc.total?.toFixed(2) || '0.00'}
                      </span>
                      {calc.items && (
                        <>
                          <span>•</span>
                          <span>{calc.items.length} items</span>
                        </>
                      )}
                    </div>
                    {calc.clientName && (
                      <p className="text-xs text-gray-600 mt-1">
                        Client: {calc.clientName}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onLoadCalculation(calc.calculatorData, calc.id)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(calc.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SavedCalculations.displayName = 'SavedCalculations';

export default SavedCalculations;
