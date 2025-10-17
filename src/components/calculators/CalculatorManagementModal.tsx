import React, { useState, useEffect } from 'react';
import { X, Search, Calculator, Grid, List, Save, Loader2 } from 'lucide-react';
import { calculatorRegistry, getCategories } from '../../data/calculatorRegistry';
import { useCalculatorPreferences } from '../../hooks/useCalculatorPreferences';
import CalculatorCard from './CalculatorCard';
import { useTranslation } from 'react-i18next';

interface CalculatorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalculatorManagementModal: React.FC<CalculatorManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const {
    selectedCalculators,
    saveCalculators,
    isCalculatorSelected
  } = useCalculatorPreferences();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [localSelections, setLocalSelections] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const categories = ['All', ...getCategories()];

  // Initialize local selections from current selected calculators
  useEffect(() => {
    if (isOpen) {
      setLocalSelections(selectedCalculators.map(c => c.id));
      setHasChanges(false);
    }
  }, [isOpen, selectedCalculators]);

  // Filter calculators based on search and category
  const filteredCalculators = calculatorRegistry.filter(calc => {
    const matchesSearch =
      calc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      calc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || calc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToggle = (calculatorId: string) => {
    setLocalSelections(prev => {
      const newSelections = prev.includes(calculatorId)
        ? prev.filter(id => id !== calculatorId)
        : [...prev, calculatorId];
      setHasChanges(true);
      return newSelections;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCalculators(localSelections);
      setHasChanges(false);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error saving calculators:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredCalculators.map(c => c.id);
    setLocalSelections(allIds);
    setHasChanges(true);
  };

  const handleClearAll = () => {
    setLocalSelections([]);
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Calculator className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Manage Calculators
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select which calculators appear in your sidebar
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search calculators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filters & Actions */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Selection Counter */}
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600">
                {localSelections.length}
              </span>{' '}
              calculator{localSelections.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Calculator Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredCalculators.length === 0 ? (
              <div className="text-center py-12">
                <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No calculators found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCalculators.map(calculator => (
                  <CalculatorCard
                    key={calculator.id}
                    calculator={calculator}
                    isSelected={localSelections.includes(calculator.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {hasChanges && (
                <span className="text-amber-600 font-medium">
                  You have unsaved changes
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorManagementModal;
