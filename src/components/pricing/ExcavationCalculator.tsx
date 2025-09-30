import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Shovel } from 'lucide-react';

const ExcavationCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [depth, setDepth] = useState<number | ''>('');
  const [removalCostPerYard, setRemovalCostPerYard] = useState<number | ''>('');
  const [soilType, setSoilType] = useState<'loose' | 'compacted' | 'rock'>('loose');
  const [hasSlopedSides, setHasSlopedSides] = useState(false);
  const [slopeRatio, setSlopeRatio] = useState<1 | 1.5 | 2>(1.5);
  const [includeHaulOff, setIncludeHaulOff] = useState(true);
  const [totalHaulOffCost, setTotalHaulOffCost] = useState<number | ''>('');
  const [addSpoilFactor, setAddSpoilFactor] = useState(true);
  const [spoilFactor, setSpoilFactor] = useState<10 | 15 | 20>(15);

  const handleCalculate = () => {
    if (typeof length === 'number' && typeof width === 'number' && 
        typeof depth === 'number' && typeof removalCostPerYard === 'number') {
      
      let totalVolume = 0;
      const results: CalculationResult[] = [];

      // Base volume calculation
      if (!hasSlopedSides) {
        totalVolume = (length * width * depth) / 27; // Convert cubic feet to cubic yards
      } else {
        // Calculate volume with sloped sides using the trapezoidal formula
        const slopeDepthOffset = depth * slopeRatio;
        const topLength = length + (2 * slopeDepthOffset);
        const topWidth = width + (2 * slopeDepthOffset);
        
        // Average area times height
        totalVolume = (
          ((length * width) + (topLength * topWidth)) / 2 * depth
        ) / 27;
      }

      // Add spoil factor if selected
      const spoilVolume = addSpoilFactor ? totalVolume * (1 + spoilFactor / 100) : totalVolume;

      results.push({
        label: 'Base Excavation Volume',
        value: Number(totalVolume.toFixed(2)),
        unit: 'cubic yards'
      });

      if (addSpoilFactor) {
        results.push({
          label: `Volume with ${spoilFactor}% Spoil Factor`,
          value: Number(spoilVolume.toFixed(2)),
          unit: 'cubic yards'
        });
      }

      // Calculate removal cost
      const removalCost = spoilVolume * removalCostPerYard;
      let totalCost = removalCost;

      results.push({
        label: 'Removal Cost',
        value: Number(removalCost.toFixed(2)),
        unit: 'USD',
        cost: removalCost
      });

      // Add haul-off costs if applicable
      if (includeHaulOff && typeof totalHaulOffCost === 'number') {
        totalCost += totalHaulOffCost;

        results.push({
          label: 'Total Haul-off Cost',
          value: Number(totalHaulOffCost.toFixed(2)),
          unit: 'USD',
          cost: totalHaulOffCost
        });
      }

      // Add total cost
      results.push({
        label: 'Total Cost',
        value: Number(totalCost.toFixed(2)),
        unit: 'USD',
        isTotal: true
      });

      onCalculate(results);
    }
  };

  const isFormValid = 
    typeof length === 'number' && 
    typeof width === 'number' && 
    typeof depth === 'number' && 
    typeof removalCostPerYard === 'number' &&
    (!includeHaulOff || typeof totalHaulOffCost === 'number');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Shovel className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">Excavation Calculator</h2>
      </div>
      
      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
              Width (feet)
            </label>
            <input
              type="number"
              id="width"
              min="0"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter width in feet"
            />
          </div>

          <div>
            <label htmlFor="depth" className="block text-sm font-medium text-slate-700 mb-1">
              Depth (feet)
            </label>
            <input
              type="number"
              id="depth"
              min="0"
              step="0.1"
              value={depth}
              onChange={(e) => setDepth(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter depth in feet"
            />
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="removalCostPerYard" className="block text-sm font-medium text-slate-700 mb-1">
            Removal Cost per Cubic Yard ($)
          </label>
          <input
            type="number"
            id="removalCostPerYard"
            min="0"
            step="0.01"
            value={removalCostPerYard}
            onChange={(e) => setRemovalCostPerYard(e.target.value ? Number(e.target.value) : '')}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter removal cost per cubic yard"
          />
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Site Conditions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="soilType" className="block text-sm font-medium text-slate-700 mb-1">
                Soil Type
              </label>
              <select
                id="soilType"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as 'loose' | 'compacted' | 'rock')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="loose">Loose Soil</option>
                <option value="compacted">Compacted Soil</option>
                <option value="rock">Rocky Soil</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasSlopedSides"
                checked={hasSlopedSides}
                onChange={(e) => setHasSlopedSides(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="hasSlopedSides" className="ml-2 block text-sm font-medium text-slate-700">
                Include Sloped Sides
              </label>
            </div>
          </div>

          {hasSlopedSides && (
            <div className="mt-4">
              <label htmlFor="slopeRatio" className="block text-sm font-medium text-slate-700 mb-1">
                Slope Ratio (horizontal:1 vertical)
              </label>
              <select
                id="slopeRatio"
                value={slopeRatio}
                onChange={(e) => setSlopeRatio(Number(e.target.value) as 1 | 1.5 | 2)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={1}>1:1 Slope</option>
                <option value={1.5}>1.5:1 Slope</option>
                <option value={2}>2:1 Slope</option>
              </select>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Options</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="addSpoilFactor"
                checked={addSpoilFactor}
                onChange={(e) => setAddSpoilFactor(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="addSpoilFactor" className="ml-2 block text-sm font-medium text-slate-700">
                Add Spoil Factor
              </label>
            </div>

            {addSpoilFactor && (
              <div>
                <label htmlFor="spoilFactor" className="block text-sm font-medium text-slate-700 mb-1">
                  Spoil Factor Percentage
                </label>
                <select
                  id="spoilFactor"
                  value={spoilFactor}
                  onChange={(e) => setSpoilFactor(Number(e.target.value) as 10 | 15 | 20)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={10}>10% - Sandy/Loose Soil</option>
                  <option value={15}>15% - Average Soil</option>
                  <option value={20}>20% - Clay/Heavy Soil</option>
                </select>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeHaulOff"
                checked={includeHaulOff}
                onChange={(e) => setIncludeHaulOff(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeHaulOff" className="ml-2 block text-sm font-medium text-slate-700">
                Include Haul-off
              </label>
            </div>

            {includeHaulOff && (
              <div>
                <label htmlFor="totalHaulOffCost" className="block text-sm font-medium text-slate-700 mb-1">
                  Total Haul-off Cost for Job ($)
                </label>
                <input
                  type="number"
                  id="totalHaulOffCost"
                  min="0"
                  step="0.01"
                  value={totalHaulOffCost}
                  onChange={(e) => setTotalHaulOffCost(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter total haul-off cost"
                />
              </div>
            )}
          </div>
        </div>
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
        Calculate Excavation
      </button>
    </div>
  );
};

export default ExcavationCalculator;