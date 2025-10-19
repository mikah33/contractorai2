import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Blocks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';

const VeneerCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [length, setLength] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [costPerSqFt, setCostPerSqFt] = useState<number | ''>('');

  const handleCalculate = () => {
    if (typeof length === 'number' && typeof height === 'number' && typeof costPerSqFt === 'number') {
      const results: CalculationResult[] = [];

      // Calculate square footage
      const squareFootage = length * height;

      results.push({
        label: 'Total Square Footage',
        value: Number(squareFootage.toFixed(2)),
        unit: 'sq ft'
      });

      // Calculate total cost
      const totalCost = squareFootage * costPerSqFt;

      results.push({
        label: 'Veneer Materials',
        value: Number(squareFootage.toFixed(2)),
        unit: 'sq ft',
        cost: totalCost
      });

      results.push({
        label: t('calculators.totalEstimatedCost'),
        value: Number(totalCost.toFixed(2)),
        unit: t('calculators.currencyUnit'),
        isTotal: true
      });

      onCalculate(results);
    }
  };

  const isFormValid =
    typeof length === 'number' &&
    typeof height === 'number' &&
    typeof costPerSqFt === 'number';

  const getCurrentInputs = () => ({
    length,
    height,
    costPerSqFt
  });

  const handleLoadEstimate = (inputs: any) => {
    setLength(inputs.length || '');
    setHeight(inputs.height || '');
    setCostPerSqFt(inputs.costPerSqFt || '');
  };

  const handleNewEstimate = () => {
    setLength('');
    setHeight('');
    setCostPerSqFt('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Blocks className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">Veneer Calculator</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="veneer"
        currentInputs={getCurrentInputs()}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              Length (feet)
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter length in feet"
            />
          </div>

          <div>
            <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
              Height (feet)
            </label>
            <input
              type="number"
              id="height"
              min="0"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter height in feet"
            />
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="costPerSqFt" className="block text-sm font-medium text-slate-700 mb-1">
            Cost Per Square Foot ($)
          </label>
          <input
            type="number"
            id="costPerSqFt"
            min="0"
            step="0.01"
            value={costPerSqFt}
            onChange={(e) => setCostPerSqFt(e.target.value ? Number(e.target.value) : '')}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., 12.50"
          />
          <p className="text-sm text-slate-500 mt-1">
            Enter the cost per square foot for veneer materials
          </p>
        </div>

        {typeof length === 'number' && typeof height === 'number' && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-slate-700">
              <strong>Calculated Area:</strong> {(length * height).toFixed(2)} square feet
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleCalculate}
        disabled={!isFormValid}
        className={`w-full py-3 px-4 rounded-md font-medium text-white ${
          isFormValid
            ? 'bg-orange-500 hover:bg-orange-600 transition-colors'
            : 'bg-slate-300 cursor-not-allowed'
        }`}
      >
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default VeneerCalculator;
