import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, FileText, Trash2, Loader2, Calendar, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SavedEstimate {
  id: string;
  estimate_name: string;
  calculator_type: string;
  estimate_data: Record<string, any>;
  results_data?: Record<string, any>;
  client_id: string | null;
  client_name?: string;
  created_at: string;
}

interface LoadEstimateDropdownProps {
  calculatorType: string;
  onLoad: (estimateData: Record<string, any>, resultsData?: Record<string, any>) => void;
}

export const LoadEstimateDropdown: React.FC<LoadEstimateDropdownProps> = ({
  calculatorType,
  onLoad,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [estimates, setEstimates] = useState<SavedEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEstimates();
    }
  }, [isOpen, calculatorType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchEstimates = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('calculator_estimates')
        .select(`
          id,
          estimate_name,
          calculator_type,
          estimate_data,
          results_data,
          client_id,
          created_at,
          clients (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('calculator_type', calculatorType)
        .order('created_at', { ascending: false});

      if (error) throw error;

      const formattedEstimates = (data || []).map((estimate: any) => ({
        ...estimate,
        client_name: estimate.clients?.name || null,
      }));

      setEstimates(formattedEstimates);
    } catch (err) {
      console.error('Error fetching estimates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = (estimate: SavedEstimate) => {
    onLoad(estimate.estimate_data, estimate.results_data);
    setIsOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, estimateId: string) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this estimate?')) {
      return;
    }

    setIsDeleting(estimateId);
    try {
      const { error } = await supabase
        .from('calculator_estimates')
        .delete()
        .eq('id', estimateId);

      if (error) throw error;

      setEstimates((prev) => prev.filter((est) => est.id !== estimateId));
    } catch (err) {
      console.error('Error deleting estimate:', err);
      alert('Failed to delete estimate');
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
      >
        <FileText className="w-4 h-4 mr-2" />
        Load Estimate
        <ChevronDown
          className={`w-4 h-4 ml-2 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">
              Saved Estimates
            </h3>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">
                  Loading estimates...
                </span>
              </div>
            ) : estimates.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No saved estimates</p>
                <p className="text-xs text-gray-400 mt-1">
                  Save your first estimate to see it here
                </p>
              </div>
            ) : (
              <div className="py-2">
                {estimates.map((estimate) => (
                  <div
                    key={estimate.id}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                    onClick={() => handleLoad(estimate)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {estimate.estimate_name}
                        </h4>
                        <div className="mt-1 space-y-1">
                          {estimate.client_name && (
                            <div className="flex items-center text-xs text-gray-500">
                              <User className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">
                                {estimate.client_name}
                              </span>
                            </div>
                          )}
                          {!estimate.client_name && (
                            <div className="flex items-center text-xs text-gray-400">
                              <User className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span>General</span>
                            </div>
                          )}
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span>{formatDate(estimate.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, estimate.id)}
                        disabled={isDeleting === estimate.id}
                        className="ml-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete estimate"
                      >
                        {isDeleting === estimate.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
