import React, { useState, useMemo, useEffect } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
import { useCustomMaterials } from '../../hooks/useCustomMaterials';

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
  const { t } = useTranslation();
  const { activeTab } = useCalculatorTab();
  const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } =
    useCustomCalculator('junk-removal', activeTab === 'custom');
  const { getCustomPrice, getCustomUnitValue } = useCustomMaterials('junk-removal');
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
    const defaultVolumeRate = 1.50;
    const defaultWeightRate = 0.50;

    const volumeRate = getCustomPrice('volume_rate_per_cubic_foot', defaultVolumeRate, 'pricing');
    const weightRate = getCustomPrice('weight_rate_per_pound', defaultWeightRate, 'pricing');

    const volumeCost = volume * volumeRate;
    const weightCost = weight * weightRate;
    return Math.max(volumeCost, weightCost);
  };

  const getCurrentInputs = () => ({
    items,
    needsLabor,
    laborers,
    distance,
    includeDisposal,
    needsPermit,
    isHazardous,
    accessDifficulty,
    floors
  });

  const handleLoadEstimate = (inputs: any) => {
    setItems(inputs.items || []);
    setNeedsLabor(inputs.needsLabor ?? true);
    setLaborers(inputs.laborers || 2);
    setDistance(inputs.distance ?? '');
    setIncludeDisposal(inputs.includeDisposal ?? true);
    setNeedsPermit(inputs.needsPermit ?? false);
    setIsHazardous(inputs.isHazardous ?? false);
    setAccessDifficulty(inputs.accessDifficulty || 'easy');
    setFloors(inputs.floors || 1);
  };

  const handleNewEstimate = () => {
    setItems([]);
    setNeedsLabor(true);
    setLaborers(2);
    setDistance('');
    setIncludeDisposal(true);
    setNeedsPermit(false);
    setIsHazardous(false);
    setAccessDifficulty('easy');
    setFloors(1);
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
          unit: t('calculators.junkRemoval.units.items')
        });
      });

      // Base cost calculation
      const baseCost = calculateBaseCost(totalVolume, totalWeight);
      totalCost += baseCost;

      results.push({
        label: t('calculators.junkRemoval.results.totalVolume'),
        value: totalVolume,
        unit: t('calculators.junkRemoval.units.cubicFeet')
      },
      {
        label: t('calculators.junkRemoval.results.totalWeight'),
        value: totalWeight,
        unit: t('calculators.junkRemoval.units.pounds')
      },
      {
        label: t('calculators.junkRemoval.results.baseRemovalCost'),
        value: Number(baseCost.toFixed(2)),
        unit: t('calculators.junkRemoval.units.usd'),
        cost: baseCost
      });

      // Labor costs
      if (needsLabor) {
        const defaultLaborRate = 45; // per hour per person
        const laborRate = getCustomPrice('labor_rate_per_hour', defaultLaborRate, 'pricing');
        const estimatedHours = Math.ceil(totalVolume / 100); // 1 hour per 100 cubic feet
        const laborCost = laborRate * laborers * estimatedHours;
        totalCost += laborCost;

        results.push({
          label: `${t('calculators.junkRemoval.results.labor')} (${laborers} ${t('calculators.junkRemoval.results.workers')}, ${estimatedHours} ${t('calculators.junkRemoval.results.hours')})`,
          value: laborers * estimatedHours,
          unit: t('calculators.junkRemoval.units.laborHours'),
          cost: laborCost
        });
      }

      // Distance fee
      const defaultDistanceRate = 2.50; // $2.50 per mile
      const distanceRate = getCustomPrice('distance_rate_per_mile', defaultDistanceRate, 'pricing');
      const distanceFee = distance * distanceRate;
      totalCost += distanceFee;

      results.push({
        label: t('calculators.junkRemoval.results.distanceFee'),
        value: distance,
        unit: t('calculators.junkRemoval.units.miles'),
        cost: distanceFee
      });

      // Special disposal fees
      if (includeDisposal) {
        const specialItems = items.filter(item => item.requiresSpecialDisposal);
        if (specialItems.length > 0) {
          const defaultSpecialDisposalRate = 25; // $25 per special item
          const specialDisposalRate = getCustomPrice('special_disposal_fee', defaultSpecialDisposalRate, 'pricing');
          const specialDisposalFee = specialItems.reduce((sum, item) =>
            sum + (item.quantity * specialDisposalRate), 0);
          totalCost += specialDisposalFee;

          results.push({
            label: t('calculators.junkRemoval.results.specialDisposalFee'),
            value: specialItems.length,
            unit: t('calculators.junkRemoval.units.items'),
            cost: specialDisposalFee
          });
        }
      }

      // Permit fee if required
      if (needsPermit) {
        const defaultPermitFee = 150;
        const permitFee = getCustomPrice('permit_fee', defaultPermitFee, 'pricing');
        totalCost += permitFee;

        results.push({
          label: t('calculators.junkRemoval.results.disposalPermit'),
          value: 1,
          unit: t('calculators.junkRemoval.units.permit'),
          cost: permitFee
        });
      }

      // Hazardous material fee
      if (isHazardous) {
        const defaultHazardousRate = 0.75; // $0.75 per pound
        const hazardousRate = getCustomPrice('hazardous_rate_per_pound', defaultHazardousRate, 'pricing');
        const hazardousFee = totalWeight * hazardousRate;
        totalCost += hazardousFee;

        results.push({
          label: t('calculators.junkRemoval.results.hazardousMaterialFee'),
          value: totalWeight,
          unit: t('calculators.junkRemoval.units.pounds'),
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
          label: t('calculators.junkRemoval.results.accessDifficultyFloorAdjustment'),
          value: Number((accessMultiplier * floorMultiplier).toFixed(2)),
          unit: t('calculators.junkRemoval.units.multiplier')
        });
      }

      // Add total cost
      results.push({
        label: t('calculators.junkRemoval.results.totalEstimatedCost'),
        value: Number(totalCost.toFixed(2)),
        unit: t('calculators.junkRemoval.units.usd'),
        isTotal: true
      });

      onCalculate(results);
    }
  };

  const isFormValid = items.length > 0 && typeof distance === 'number';

  // Loading state
  if (activeTab === 'custom' && loadingCustom) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Trash className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.junkRemoval.title')}</h2>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading custom configuration...</p>
        </div>
      </div>
    );
  }

  // Not configured state
  if (activeTab === 'custom' && !isConfigured) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Trash className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.junkRemoval.title')}</h2>
        </div>
        <div className="text-center py-12">
          <Trash className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Required</h3>
          <p className="text-gray-600 mb-4">
            This calculator hasn't been configured yet. Click the gear icon to set up your custom materials and pricing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Trash className="h-6 w-6 text-blue-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.junkRemoval.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="junk-removal"
        currentInputs={getCurrentInputs()}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">{t('calculators.junkRemoval.itemsToRemove')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 gap-2">
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  {t('calculators.junkRemoval.categories.furniture')}
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.furniture).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('furniture', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {t(`calculators.junkRemoval.items.${itemType}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  {t('calculators.junkRemoval.categories.appliances')}
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.appliances).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('appliances', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {t(`calculators.junkRemoval.items.${itemType}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  {t('calculators.junkRemoval.categories.construction')}
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.construction).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('construction', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {t(`calculators.junkRemoval.items.${itemType}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  {t('calculators.junkRemoval.categories.yardWaste')}
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.yard).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('yard', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {t(`calculators.junkRemoval.items.${itemType}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  {t('calculators.junkRemoval.categories.electronics')}
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.electronics).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('electronics', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {t(`calculators.junkRemoval.items.${itemType}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <button className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                  {t('calculators.junkRemoval.categories.miscellaneous')}
                </button>
                <div className="absolute z-10 hidden group-hover:block w-48 bg-white border border-slate-200 rounded-md shadow-lg mt-1 right-0">
                  {Object.keys(commonItems.misc).map(itemType => (
                    <button
                      key={itemType}
                      onClick={() => addItem('misc', itemType)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                    >
                      {t(`calculators.junkRemoval.items.${itemType}`)}
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
                    {t('calculators.junkRemoval.itemType')}
                  </label>
                  <div className="p-2 bg-white border border-slate-300 rounded-md">
                    {t(`calculators.junkRemoval.items.${item.type.split('-').slice(1).join('-')}`)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.junkRemoval.quantity')}
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
                    <span className="text-blue-500 text-sm">
                      {t('calculators.junkRemoval.requiresSpecialDisposal')}
                    </span>
                  )}
                  {item.needsDisassembly && (
                    <span className="text-blue-500 text-sm">
                      {t('calculators.junkRemoval.mayRequireDisassembly')}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeItem(item.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                {t('calculators.junkRemoval.removeItem')}
              </button>
            </div>
          ))}
        </div>

        <div className="border-b border-slate-200 pb-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.junkRemoval.serviceDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="distance" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.junkRemoval.distanceToDisposalSite')}
              </label>
              <input
                type="number"
                id="distance"
                min="0"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('calculators.junkRemoval.enterDistancePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="accessDifficulty" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.junkRemoval.accessDifficulty')}
              </label>
              <select
                id="accessDifficulty"
                value={accessDifficulty}
                onChange={(e) => setAccessDifficulty(e.target.value as 'easy' | 'moderate' | 'difficult')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">{t('calculators.junkRemoval.accessLevels.easy')}</option>
                <option value="moderate">{t('calculators.junkRemoval.accessLevels.moderate')}</option>
                <option value="difficult">{t('calculators.junkRemoval.accessLevels.difficult')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="floors" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.junkRemoval.numberOfFloors')}
              </label>
              <input
                type="number"
                id="floors"
                min="1"
                max="10"
                value={floors}
                onChange={(e) => setFloors(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="needsLabor"
                checked={needsLabor}
                onChange={(e) => setNeedsLabor(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="needsLabor" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.junkRemoval.needLoadingAssistance')}
              </label>
            </div>
          </div>

          {needsLabor && (
            <div className="mt-4">
              <label htmlFor="laborers" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.junkRemoval.numberOfWorkers')}
              </label>
              <select
                id="laborers"
                value={laborers}
                onChange={(e) => setLaborers(Number(e.target.value) as 2 | 3 | 4)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={2}>{t('calculators.junkRemoval.workersCount.two')}</option>
                <option value={3}>{t('calculators.junkRemoval.workersCount.three')}</option>
                <option value={4}>{t('calculators.junkRemoval.workersCount.four')}</option>
              </select>
            </div>
          )}
        </div>

        <div className="border-b border-slate-200 pb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.junkRemoval.additionalOptions')}</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeDisposal"
                checked={includeDisposal}
                onChange={(e) => setIncludeDisposal(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeDisposal" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.junkRemoval.includeDisposalFees')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="needsPermit"
                checked={needsPermit}
                onChange={(e) => setNeedsPermit(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="needsPermit" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.junkRemoval.requiresDisposalPermit')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isHazardous"
                checked={isHazardous}
                onChange={(e) => setIsHazardous(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="isHazardous" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.junkRemoval.containsHazardousMaterials')}
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
            ? 'bg-blue-500 hover:bg-blue-600 transition-colors'
            : 'bg-slate-300 cursor-not-allowed'
        }`}
      >
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default JunkRemovalCalculator;
