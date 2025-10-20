import React from 'react';
import { CalculationResult } from '../../types';
import { DollarSign, Package, Info, FileText, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CalculatorResultsProps {
  results: CalculationResult[];
  title: string;
}

const CalculatorResults: React.FC<CalculatorResultsProps> = ({ results, title }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Filter out any items marked as isTotal to prevent double-counting
  const totalCost = results
    .filter(result => !result.isTotal)
    .reduce((sum, result) => sum + (result.cost || 0), 0);

  const handleGenerateEstimate = () => {
    console.log('Generate Estimate clicked');
    console.log('Results:', results);
    console.log('Total Cost:', totalCost);
    
    // Generate UUID v4 for estimate ID
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    // Create estimate items from calculator results with proper EstimateItem structure
    const items = results
      .filter(result => result.cost && result.cost > 0)
      .map((result, index) => ({
        id: generateUUID(),
        description: `${result.label} - ${result.value} ${result.unit}`,
        quantity: result.value,
        unit: result.unit,
        unitPrice: result.cost / result.value,
        totalPrice: result.cost,
        type: 'material' as const
      }));

    console.log('Generated items:', items);

    // Translate the title if it's a translation key
    // If translation fails or returns the key itself, strip the 'trades.' prefix
    let translatedTitle = title;
    if (title.startsWith('trades.')) {
      const translated = t(title);
      // Check if translation actually worked (didn't just return the key)
      translatedTitle = translated === title ? title.replace('trades.', '') : translated;
    }

    // Create new estimate with simple schema fields
    const newEstimate = {
      id: generateUUID(),
      title: `${translatedTitle} Estimate`,
      clientName: '',
      projectName: '',
      items: items,
      subtotal: totalCost,
      taxRate: 0,
      taxAmount: 0,
      total: totalCost,
      status: 'draft' as const,
      notes: `Generated from ${translatedTitle} Calculator`,
      terms: 'Valid for 30 days from the date of issue.',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toDateString()
    };

    console.log('New estimate object:', newEstimate);
    console.log('Navigating to /estimates with calculator data');
    
    // Navigate to estimate page with the calculator data
    navigate('/estimates', { state: { fromCalculator: true, calculatorData: newEstimate } });
  };

  // Translate the title for display
  // If translation fails or returns the key itself, strip the 'trades.' prefix
  let displayTitle = title;
  if (title.startsWith('trades.')) {
    const translated = t(title);
    displayTitle = translated === title ? title.replace('trades.', '') : translated;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-6">{displayTitle} Results</h3>
      
      <div className="space-y-4">
        {results.map((result, index) => {
          // Special rendering for warning messages
          if (result.isWarning) {
            return (
              <div key={index} className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-amber-400 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="w-6 h-6 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-900 mb-1">{result.label}</p>
                    <p className="text-sm text-amber-800 leading-relaxed">{result.unit}</p>
                  </div>
                </div>
              </div>
            );
          }

          // Normal result rendering
          return (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {result.cost ? (
                  <DollarSign className="w-5 h-5 text-green-600 mr-3" />
                ) : result.label === 'Note' ? (
                  <Info className="w-5 h-5 text-blue-600 mr-3" />
                ) : (
                  <Package className="w-5 h-5 text-blue-600 mr-3" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{result.label}</p>
                  <p className="text-sm text-gray-600">
                    {result.value} {result.unit}
                  </p>
                </div>
              </div>
              {result.cost && (
                <div className="text-right">
                  <p className="font-bold text-green-600">${result.cost.toFixed(2)}</p>
                </div>
              )}
            </div>
          );
        })}
        
        {totalCost > 0 && (
          <>
            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-6 h-6 text-blue-600 mr-3" />
                  <p className="text-lg font-bold text-gray-900">Total Estimated Cost</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">${totalCost.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleGenerateEstimate}
                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5 mr-2" />
                Generate Estimate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CalculatorResults;