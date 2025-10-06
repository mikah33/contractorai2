import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Trash } from 'lucide-react';

interface JunkItem {
  id: string;
  type: string;
  volume: number;
  weight: number;
  quantity: number;
  requiresSpecialDisposal: boolean;
  needsDisassembly: boolean;
}

const JunkRemovalCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const [items, setItems] = useState<JunkItem[]>([]);
  const [needsLabor, setNeedsLabor] = useState(true);
  const [laborers, setLaborers] = useState<2 | 3 | 4>(2);
  const [distance, setDistance] = useState<number | ''>('');
  const [includeDisposal, setIncludeDisposal] = useState(true);
  const [needsPermit, setNeedsPermit] = useState(false);
  const [isHazardous, setIsHazardous] = useState(false);
  const [accessDifficulty, setAccessDifficulty] = useState<'easy' | 'moderate' | 'difficult'>('easy');
  const [floors, setFloors] = useState<number>(1);

  const commonItems = {
    'furniture': {
      'sofa': { volume: 60, weight: 150 },
      'loveseat': { volume: 40, weight: 100 },
      'armchair': { volume: 25, weight: 75 },
      'dining-table': { volume: 45, weight: 120 },
      'mattress-twin': { volume: 20, weight: 40 },
      'mattress-full': { volume: 30, weight: 55 },
      'mattress-queen': { volume: 35, weight: 65 },
      'mattress-king': { volume: 42, weight: 80 },
      'dresser': { volume: 35, weight: 100 },
      'bookshelf': { volume: 30, weight: 85 }
    },
    'appliances': {
      'refrigerator': { volume: 80, weight: 250 },
      'washer': { volume: 40, weight: 200 },
      'dryer': { volume: 40, weight: 150 },
      'dishwasher': { volume: 30, weight: 120 },
      'stove': { volume: 45, weight: 180 },
      'microwave': { volume: 8, weight: 30 }
    },
    'construction': {
      'drywall-pile': { volume: 50, weight: 300 },
      'lumber-pile': { volume: 40, weight: 200 },
      'concrete-debris': { volume: 30, weight: 400 },
      'roofing-material': { volume: 45, weight: 250 },
      'tiles': { volume: 25, weight: 150 }
    },
    'yard': {
      'branches': { volume: 35, weight: 100 },
      'dirt': { volume: 20, weight: 300 },
      'grass-clippings': { volume: 30, weight: 80 },
      'leaves': { volume: 40, weight: 60 },
      'rocks': { volume: 15, weight: 250 }
    },
    'electronics': {
      'tv-crt': { volume: 15, weight: 60 },
      'tv-flat': { volume: 20, weight: 40 },
      'computer': { volume: 8, weight: 25 },
      'printer': { volume: 6, weight: 20 },
      'monitor': { volume: 5, weight: 15 }
    },
    'misc': {
      'boxes': { volume: 10, weight: 30 },
      'bags': { volume: 8, weight: 20 },
      'tires': { volume: 12, weight: 25 },
      'metal-scrap': { volume: 15, weight: 100 },
      'glass': { volume: 10, weight: 75 }
    }
  };

  const addItem = (category: string, itemType: string) => {
    const itemSpecs = commonItems[category][itemType];
    const newItem: JunkItem = {
      id: Date.now().toString(),
      type: `${category}-${itemType}`,
      volume: itemSpecs.volume,
      weight: itemSpecs.weight,
      quantity: 1,
      requiresSpecialDisposal: category === 'electronics' || itemType.includes('mattress'),
      needsDisassembly: category === 'furniture' && !itemType.includes('mattress')
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<JunkItem>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateBaseCost = (volume: number, weight: number) => {
    // Base rate is $1.50 per cubic foot or $0.50 per pound, whichever is higher
    const volumeCost = volume * 1.50;
    const weightCost = weight * 0.50;
    return Math.max(volumeCost, weightCost);
  };

  const handleCalculate = () => {
    if (items.length > 0 && typeof distance === 'number') {
      const results: CalculationResult[] = [];
      let totalCost = 0;
      let totalVolume = 0;
      let totalWeight = 0;

      // Calculate volume and weight totals
      items.forEach(item => {
        const itemVolume = item.volume * item.quantity;
        const itemWeight = item.weight * item.quantity;
        totalVolume += itemVolume;
        totalWeight += itemWeight;

        results.push({
          label: `${item.type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
          value: item.quantity,
          unit: 'items'
        });
      });

      // Base cost calculation
      const baseCost = calculateBaseCost(totalVolume, totalWeight);
      totalCost += baseCost;

      results.push({
        label: 'Total Volume',
        value: totalVolume,
        unit: 'cubic feet'
      },
      {
        label: 'Total Weight',
        value: totalWeight,
        unit: 'pounds'
      },
      {
        label: 'Base Removal Cost',
        value: Number(baseCost.toFixed(2)),
        unit: 'USD',
        cost: baseCost
      });

      // Labor costs
      if (needsLabor) {
        const laborRate = 45; // per hour per person
        const estimatedHours = Math.ceil(totalVolume / 100); // 1 hour per 100 cubic feet
        const laborCost = laborRate * laborers * estimatedHours;
        totalCost += laborCost;

        results.push({
          label: `Labor (${laborers} workers, ${estimatedHours} hours)`,
          value: laborers * estimatedHours,
          unit: 'labor hours',
          cost: laborCost
        });
      }

      // Distance fee
      const distanceFee = distance * 2.50; // $2.50 per mile
      totalCost += distanceFee;

      results.push({
        label: 'Distance Fee',
        value: distance,
        unit: 'miles',
        cost: distanceFee
      });

      // Special disposal fees
      if (includeDisposal) {
        const specialItems = items.filter(item => item.requiresSpecialDisposal);
        if (specialItems.length > 0) {
          const specialDisposalFee = specialItems.reduce((sum, item) => 
            sum + (item.quantity * 25), 0); // $25 per special item
          totalCost += specialDisposalFee;

          results.push({
            label: 'Special Disposal Fee',
            value: specialItems.length,
            unit: 'items',
            cost: specialDisposalFee
          });
        }
      }

      // Permit fee if required
      if (needsPermit) {
        const permitFee = 150;
        totalCost += permitFee;

        results.push({
          label: 'Disposal Permit',
          value: 1,
          unit: 'permit',
          cost: permitFee
        });
      }

      // Hazardous material fee
      if (isHazardous) {
        const hazardousFee = totalWeight * 0.75; // $0.75 per pound
        totalCost += hazardousFee;

        results.push({
          label: 'Hazardous Material Fee',
          value: totalWeight,
          unit: 'pounds',
          cost: hazardousFee
        });
      }

      // Access difficulty multiplier
      const accessMultipliers = {
        'easy': 1,
        'moderate': 1.25,
        'difficult': 1.5
      };
      const accessMultiplier = accessMultipliers[accessDifficulty];
      
      // Floor multiplier
      const floorMultiplier = 1 + ((floors - 1) * 0.15); // 15% increase per floor

      // Apply multipliers
      totalCost = totalCost * accessMultiplier * floorMultiplier;

      if (accessDifficulty !== 'easy' || floors > 1) {
        results.push({
          label: 'Access Difficulty & Floor Adjustment',
          value: Number((accessMultiplier * floorMultiplier).toFixed(2)),
          unit: 'multiplier'
        });
      }

      // Add total cost
      results.push({
        label: 'Total Estimated Cost',
        value: Number(totalCost.toFixed(2)),
        unit: 'USD',
        isTotal: true
      });

      onCalculate(results);
    }
  };

  const isFormValid = items.length > 0 && typeof distance === 'number';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Trash className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">Junk Removal Calculator</h2>
      </div>
      
      <div className="mb-4">
        <div className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Items to Remove</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 gap-2">
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  Furniture
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.furniture).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('furniture', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {itemType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  Appliances
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.appliances).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('appliances', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  Construction
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.construction).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('construction', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {itemType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  Yard Waste
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.yard).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('yard', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  Electronics
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.electronics).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('electronics', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {itemType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  Miscellaneous
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.misc).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('misc', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {items.map(item => (
            <div key={item.id} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Item Type
                  </label>
                  <div className="p-2 bg-white border border-slate-300 rounded-md">
                    {item.type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  {item.requiresSpecialDisposal && (
                    <span className="text-orange-500 text-sm">
                      Requires special disposal
                    </span>
                  )}
                  {item.needsDisassembly && (
                    <span className="text-blue-500 text-sm">
                      May require disassembly
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeItem(item.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                Remove Item
              </button>
            </div>
          ))}
        </div>

        <div className="border-b border-slate-200 pb-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Service Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="distance" className="block text-sm font-medium text-slate-700 mb-1">
                Distance to Disposal Site (miles)
              </label>
              <input
                type="number"
                id="distance"
                min="0"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter distance in miles"
              />
            </div>

            <div>
              <label htmlFor="accessDifficulty" className="block text-sm font-medium text-slate-700 mb-1">
                Access Difficulty
              </label>
              <select
                id="accessDifficulty"
                value={accessDifficulty}
                onChange={(e) => setAccessDifficulty(e.target.value as 'easy' | 'moderate' | 'difficult')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="easy">Easy Access</option>
                <option value="moderate">Moderate Access</option>
                <option value="difficult">Difficult Access</option>
              </select>
            </div>

            <div>
              <label htmlFor="floors" className="block text-sm font-medium text-slate-700 mb-1">
                Number of Floors
              </label>
              <input
                type="number"
                id="floors"
                min="1"
                max="10"
                value={floors}
                onChange={(e) => setFloors(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="needsLabor"
                checked={needsLabor}
                onChange={(e) => setNeedsLabor(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="needsLabor" className="ml-2 block text-sm font-medium text-slate-700">
                Need Loading Assistance
              </label>
            </div>
          </div>

          {needsLabor && (
            <div className="mt-4">
              <label htmlFor="laborers" className="block text-sm font-medium text-slate-700 mb-1">
                Number of Workers
              </label>
              <select
                id="laborers"
                value={laborers}
                onChange={(e) => setLaborers(Number(e.target.value) as 2 | 3 | 4)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={2}>2 Workers</option>
                <option value={3}>3 Workers</option>
                <option value={4}>4 Workers</option>
              </select>
            </div>
          )}
        </div>

        <div className="border-b border-slate-200 pb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Options</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeDisposal"
                checked={includeDisposal}
                onChange={(e) => setIncludeDisposal(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeDisposal" className="ml-2 block text-sm font-medium text-slate-700">
                Include Disposal Fees
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="needsPermit"
                checked={needsPermit}
                onChange={(e) => setNeedsPermit(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="needsPermit" className="ml-2 block text-sm font-medium text-slate-700">
                Requires Disposal Permit
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isHazardous"
                checked={isHazardous}
                onChange={(e) => setIsHazardous(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="isHazardous" className="ml-2 block text-sm font-medium text-slate-700">
                Contains Hazardous Materials
              </label>
            </div>
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
        Calculate Removal Cost
      </button>
    </div>
  );
};

export default JunkRemovalCalculator;