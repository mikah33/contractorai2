import React, { useState, useMemo, useEffect } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { DoorClosed, AppWindow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
import { useCustomMaterials } from '../../hooks/useCustomMaterials';

interface Opening {
  id: string;
  type: 'door' | 'window';
  style: string;
  width: number;
  height: number;
  quantity: number;
  includeTrim: boolean;
  trimStyle: 'basic' | 'colonial' | 'craftsman' | 'modern';
  includeHardware: boolean;
  isExterior: boolean;
  isPreHung: boolean;
  material: string;
  finish: string;
  useCustomCost: boolean;
  customCostPerUnit: number | '';
}

const DoorsWindowsCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const { activeTab } = useCalculatorTab();
  const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } =
    useCustomCalculator('doors-windows', activeTab === 'custom');
  const { getCustomPrice, getCustomUnitValue } = useCustomMaterials('doors-windows');
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [includeInsulation, setIncludeInsulation] = useState(true);
  const [includeFlashing, setIncludeFlashing] = useState(true);
  const [includeCaulk, setIncludeCaulk] = useState(true);
  const [includeShims, setIncludeShims] = useState(true);

  const doorStyles = {
    'entry': {
      name: t('calculators.doorsWindows.doorStyles.entry'),
      materials: ['steel', 'fiberglass', 'wood'],
      finishes: ['primed', 'stained', 'painted'],
      prices: {
        'steel': 299.98,
        'fiberglass': 499.98,
        'wood': 699.98
      }
    },
    'interior': {
      name: t('calculators.doorsWindows.doorStyles.interior'),
      materials: ['hollow-core', 'solid-core', 'wood'],
      finishes: ['primed', 'stained', 'painted'],
      prices: {
        'hollow-core': 49.98,
        'solid-core': 99.98,
        'wood': 199.98
      }
    },
    'patio': {
      name: t('calculators.doorsWindows.doorStyles.patio'),
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: ['white', 'bronze', 'stained'],
      prices: {
        'vinyl': 599.98,
        'aluminum': 799.98,
        'wood': 1299.98
      }
    },
    'french': {
      name: t('calculators.doorsWindows.doorStyles.french'),
      materials: ['wood', 'fiberglass', 'steel'],
      finishes: ['primed', 'stained', 'painted'],
      prices: {
        'wood': 899.98,
        'fiberglass': 799.98,
        'steel': 699.98
      }
    },
    'bifold': {
      name: t('calculators.doorsWindows.doorStyles.bifold'),
      materials: ['hollow-core', 'solid-core', 'wood'],
      finishes: ['primed', 'stained', 'painted'],
      prices: {
        'hollow-core': 99.98,
        'solid-core': 149.98,
        'wood': 249.98
      }
    }
  };

  const vinylColorOptions = ['white', 'off-white', 'gray', 'beige', 'tan', 'clay', 'black', 'dark-bronze', 'brown', 'wood-tone'];
  const standardFinishes = ['white', 'bronze', 'stained'];

  const windowStyles = {
    'single-hung': {
      name: t('calculators.doorsWindows.windowStyles.singleHung'),
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: {
        'vinyl': vinylColorOptions,
        'aluminum': standardFinishes,
        'wood': standardFinishes
      },
      prices: {
        'vinyl': 199.98,
        'aluminum': 249.98,
        'wood': 399.98
      }
    },
    'double-hung': {
      name: t('calculators.doorsWindows.windowStyles.doubleHung'),
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: {
        'vinyl': vinylColorOptions,
        'aluminum': standardFinishes,
        'wood': standardFinishes
      },
      prices: {
        'vinyl': 249.98,
        'aluminum': 299.98,
        'wood': 499.98
      }
    },
    'casement': {
      name: t('calculators.doorsWindows.windowStyles.casement'),
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: {
        'vinyl': vinylColorOptions,
        'aluminum': standardFinishes,
        'wood': standardFinishes
      },
      prices: {
        'vinyl': 299.98,
        'aluminum': 349.98,
        'wood': 599.98
      }
    },
    'sliding': {
      name: t('calculators.doorsWindows.windowStyles.sliding'),
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: {
        'vinyl': vinylColorOptions,
        'aluminum': standardFinishes,
        'wood': standardFinishes
      },
      prices: {
        'vinyl': 249.98,
        'aluminum': 299.98,
        'wood': 499.98
      }
    },
    'picture': {
      name: t('calculators.doorsWindows.windowStyles.picture'),
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: {
        'vinyl': vinylColorOptions,
        'aluminum': standardFinishes,
        'wood': standardFinishes
      },
      prices: {
        'vinyl': 299.98,
        'aluminum': 349.98,
        'wood': 599.98
      }
    }
  };

  const trimStyles = {
    'basic': {
      name: t('calculators.doorsWindows.trimStyles.basic'),
      price: 2.98 // per linear foot
    },
    'colonial': {
      name: t('calculators.doorsWindows.trimStyles.colonial'),
      price: 3.98
    },
    'craftsman': {
      name: t('calculators.doorsWindows.trimStyles.craftsman'),
      price: 4.98
    },
    'modern': {
      name: t('calculators.doorsWindows.trimStyles.modern'),
      price: 3.98
    }
  };

  const hardwarePrices = {
    door: {
      interior: {
        'basic': 24.98,
        'premium': 49.98
      },
      exterior: {
        'basic': 79.98,
        'premium': 149.98
      }
    },
    window: {
      'basic': 19.98,
      'premium': 39.98
    }
  };

  const addOpening = (type: 'door' | 'window') => {
    const defaultStyles = type === 'door' ? doorStyles : windowStyles;
    const firstStyle = Object.keys(defaultStyles)[0];
    const defaultMaterial = defaultStyles[firstStyle].materials[0];
    const defaultFinishes = type === 'door'
      ? defaultStyles[firstStyle].finishes
      : defaultStyles[firstStyle].finishes[defaultMaterial];
    const defaultFinish = Array.isArray(defaultFinishes) ? defaultFinishes[0] : defaultFinishes;

    const newOpening: Opening = {
      id: Date.now().toString(),
      type,
      style: firstStyle,
      width: type === 'door' ? 36 : 32,
      height: type === 'door' ? 80 : 60,
      quantity: 1,
      includeTrim: true,
      trimStyle: 'basic',
      includeHardware: true,
      isExterior: type === 'door' ? true : false,
      isPreHung: type === 'door' ? true : false,
      material: defaultMaterial,
      finish: defaultFinish,
      useCustomCost: false,
      customCostPerUnit: ''
    };
    setOpenings([...openings, newOpening]);
  };

  const updateOpening = (id: string, updates: Partial<Opening>) => {
    setOpenings(openings.map(opening =>
      opening.id === id ? { ...opening, ...updates } : opening
    ));
  };

  const removeOpening = (id: string) => {
    setOpenings(openings.filter(opening => opening.id !== id));
  };

  const calculateTrimLength = (width: number, height: number) => {
    return (width * 2 + height * 2) / 12; // Convert to linear feet
  };

  const getCurrentInputs = () => ({
    openings,
    includeInsulation,
    includeFlashing,
    includeCaulk,
    includeShims
  });

  const handleLoadEstimate = (inputs: any) => {
    setOpenings(inputs.openings || []);
    setIncludeInsulation(inputs.includeInsulation ?? true);
    setIncludeFlashing(inputs.includeFlashing ?? true);
    setIncludeCaulk(inputs.includeCaulk ?? true);
    setIncludeShims(inputs.includeShims ?? true);
  };

  const handleNewEstimate = () => {
    setOpenings([]);
    setIncludeInsulation(true);
    setIncludeFlashing(true);
    setIncludeCaulk(true);
    setIncludeShims(true);
  };

  const handleCalculate = () => {
    const results: CalculationResult[] = [];
    let totalCost = 0;

    openings.forEach(opening => {
      const styles = opening.type === 'door' ? doorStyles : windowStyles;

      // Use custom cost if enabled, otherwise use base price (with custom pricing override)
      let basePrice = opening.useCustomCost && typeof opening.customCostPerUnit === 'number'
        ? opening.customCostPerUnit
        : styles[opening.style]?.prices[opening.material] || 0;

      // Override with custom pricing if available
      const pricingKey = `${opening.type}_${opening.style}_${opening.material}`;
      basePrice = getCustomPrice(pricingKey, basePrice);

      const itemCost = basePrice * opening.quantity;
      totalCost += itemCost;

      results.push({
        label: `${styles[opening.style].name} (${opening.material})${opening.useCustomCost ? ' - Custom Price' : ''}`,
        value: opening.quantity,
        unit: t('calculators.doorsWindows.units.units'),
        cost: itemCost
      });

      // Add pre-hung costs for doors
      if (opening.type === 'door' && opening.isPreHung) {
        const preHungBasePrice = opening.isExterior ? 149.98 : 79.98;
        const preHungCost = getCustomPrice(opening.isExterior ? 'prehung_exterior' : 'prehung_interior', preHungBasePrice);
        const totalPreHungCost = preHungCost * opening.quantity;
        totalCost += totalPreHungCost;

        results.push({
          label: t('calculators.doorsWindows.preHungFrame'),
          value: opening.quantity,
          unit: t('calculators.doorsWindows.units.kits'),
          cost: totalPreHungCost
        });
      }

      // Calculate trim if included
      if (opening.includeTrim) {
        const trimLength = calculateTrimLength(opening.width, opening.height);
        const baseTrimPrice = trimStyles[opening.trimStyle].price;
        const trimPrice = getCustomPrice(`trim_${opening.trimStyle}`, baseTrimPrice);
        const totalTrimLength = trimLength * opening.quantity;
        const trimCost = totalTrimLength * trimPrice;
        totalCost += trimCost;

        results.push({
          label: `${trimStyles[opening.trimStyle].name} ${t('calculators.doorsWindows.trim')}`,
          value: Number(totalTrimLength.toFixed(2)),
          unit: t('calculators.doorsWindows.units.linearFeet'),
          cost: trimCost
        });
      }

      // Add hardware if included
      if (opening.includeHardware) {
        let baseHardwarePrice: number;
        let hardwareKey: string;
        if (opening.type === 'door') {
          baseHardwarePrice = opening.isExterior ?
            hardwarePrices.door.exterior.basic :
            hardwarePrices.door.interior.basic;
          hardwareKey = opening.isExterior ? 'hardware_door_exterior' : 'hardware_door_interior';
        } else {
          baseHardwarePrice = hardwarePrices.window.basic;
          hardwareKey = 'hardware_window';
        }

        const hardwareCost = getCustomPrice(hardwareKey, baseHardwarePrice);
        const totalHardwareCost = hardwareCost * opening.quantity;
        totalCost += totalHardwareCost;

        results.push({
          label: `${opening.type === 'door' ? t('calculators.doorsWindows.door') : t('calculators.doorsWindows.window')} ${t('calculators.doorsWindows.hardware')}`,
          value: opening.quantity,
          unit: t('calculators.doorsWindows.units.sets'),
          cost: totalHardwareCost
        });
      }
    });

    // Calculate additional materials
    if (includeInsulation) {
      const insulationNeeded = openings.reduce((sum, opening) => {
        const perimeterFeet = (opening.width + opening.height) * 2 / 12;
        return sum + (perimeterFeet * opening.quantity);
      }, 0);

      const insulationPrice = getCustomPrice('insulation', 12.98);
      const insulationCost = Math.ceil(insulationNeeded / 20) * insulationPrice;
      totalCost += insulationCost;

      results.push({
        label: t('calculators.doorsWindows.insulation'),
        value: Math.ceil(insulationNeeded / 20),
        unit: t('calculators.doorsWindows.units.rolls20ft'),
        cost: insulationCost
      });
    }

    if (includeFlashing) {
      const exteriorOpenings = openings.filter(o => o.isExterior).reduce((sum, o) => sum + o.quantity, 0);
      const flashingPrice = getCustomPrice('flashing', 12.98);
      const flashingCost = exteriorOpenings * flashingPrice;
      totalCost += flashingCost;

      results.push({
        label: t('calculators.doorsWindows.flashingTape'),
        value: exteriorOpenings,
        unit: t('calculators.doorsWindows.units.rolls'),
        cost: flashingCost
      });
    }

    if (includeCaulk) {
      const caulkTubes = Math.ceil(openings.reduce((sum, opening) => {
        const linearFeet = (opening.width + opening.height) * 2 / 12;
        return sum + (linearFeet * opening.quantity / 20); // 20 linear feet per tube
      }, 0));

      const caulkPrice = getCustomPrice('caulk', 6.98);
      const caulkCost = caulkTubes * caulkPrice;
      totalCost += caulkCost;

      results.push({
        label: t('calculators.doorsWindows.caulk'),
        value: caulkTubes,
        unit: t('calculators.doorsWindows.units.tubes'),
        cost: caulkCost
      });
    }

    if (includeShims) {
      const shimPacks = Math.ceil(openings.reduce((sum, o) => sum + o.quantity, 0) / 2);
      const shimPrice = getCustomPrice('shims', 4.98);
      const shimCost = shimPacks * shimPrice;
      totalCost += shimCost;

      results.push({
        label: t('calculators.doorsWindows.shimPacks'),
        value: shimPacks,
        unit: t('calculators.doorsWindows.units.packs'),
        cost: shimCost
      });
    }

    onCalculate(results);
  };

  const isFormValid = openings.length > 0;

  // Loading state
  if (activeTab === 'custom' && loadingCustom) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <div className="flex space-x-2">
            <DoorClosed className="h-6 w-6 text-orange-500" />
            <AppWindow className="h-6 w-6 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 ml-2">{t('calculators.doorsWindows.title')}</h2>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
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
          <div className="flex space-x-2">
            <DoorClosed className="h-6 w-6 text-orange-500" />
            <AppWindow className="h-6 w-6 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 ml-2">{t('calculators.doorsWindows.title')}</h2>
        </div>
        <div className="text-center py-12">
          <DoorClosed className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
        <div className="flex space-x-2">
          <DoorClosed className="h-6 w-6 text-orange-500" />
          <AppWindow className="h-6 w-6 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 ml-2">{t('calculators.doorsWindows.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="doors-windows"
        getCurrentInputs={getCurrentInputs}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => addOpening('door')}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              {t('calculators.doorsWindows.addDoor')}
            </button>
            <button
              onClick={() => addOpening('window')}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              {t('calculators.doorsWindows.addWindow')}
            </button>
          </div>
        </div>

        {openings.map(opening => (
          <div key={opening.id} className="mb-6 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {opening.type === 'door' ? t('calculators.doorsWindows.doorStyle') : t('calculators.doorsWindows.windowStyle')}
                </label>
                <select
                  value={opening.style}
                  onChange={(e) => updateOpening(opening.id, {
                    style: e.target.value,
                    material: (opening.type === 'door' ? doorStyles : windowStyles)[e.target.value].materials[0]
                  })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {Object.entries(opening.type === 'door' ? doorStyles : windowStyles).map(([value, { name }]) => (
                    <option key={value} value={value}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.doorsWindows.material')}
                </label>
                <select
                  value={opening.material}
                  onChange={(e) => updateOpening(opening.id, { material: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {(opening.type === 'door' ? doorStyles : windowStyles)[opening.style].materials.map(material => (
                    <option key={material} value={material}>
                      {t(`calculators.doorsWindows.materials.${material}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {opening.type === 'window' && opening.material === 'vinyl' ? 'Color' : t('calculators.doorsWindows.finish')}
                </label>
                <select
                  value={opening.finish}
                  onChange={(e) => updateOpening(opening.id, { finish: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {opening.type === 'window'
                    ? windowStyles[opening.style].finishes[opening.material].map(finish => (
                        <option key={finish} value={finish}>
                          {finish.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </option>
                      ))
                    : doorStyles[opening.style].finishes.map(finish => (
                        <option key={finish} value={finish}>
                          {t(`calculators.doorsWindows.finishes.${finish}`)}
                        </option>
                      ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.doorsWindows.widthInches')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.125"
                  value={opening.width}
                  onChange={(e) => updateOpening(opening.id, { width: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.doorsWindows.heightInches')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.125"
                  value={opening.height}
                  onChange={(e) => updateOpening(opening.id, { height: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.doorsWindows.quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={opening.quantity}
                  onChange={(e) => updateOpening(opening.id, { quantity: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-3 border-t border-slate-200 pt-4 mt-2">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id={`customCost-${opening.id}`}
                    checked={opening.useCustomCost}
                    onChange={(e) => updateOpening(opening.id, { useCustomCost: e.target.checked })}
                    className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor={`customCost-${opening.id}`} className="block text-sm font-medium text-slate-700 mb-1">
                      Use Custom Cost Per {opening.type === 'door' ? 'Door' : 'Window'}
                    </label>
                    {opening.useCustomCost && (
                      <div className="mt-2">
                        <label className="block text-xs text-slate-600 mb-1">
                          Cost Per Unit ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={opening.customCostPerUnit}
                          onChange={(e) => updateOpening(opening.id, { customCostPerUnit: e.target.value ? Number(e.target.value) : '' })}
                          className="w-full max-w-xs p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="e.g., 350.00"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={opening.isExterior}
                  onChange={(e) => updateOpening(opening.id, { isExterior: e.target.checked })}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-slate-700">
                  {t('calculators.doorsWindows.exteriorInstallation')}
                </label>
              </div>

              {opening.type === 'door' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={opening.isPreHung}
                    onChange={(e) => updateOpening(opening.id, { isPreHung: e.target.checked })}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-slate-700">
                    {t('calculators.doorsWindows.preHung')}
                  </label>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={opening.includeTrim}
                  onChange={(e) => updateOpening(opening.id, { includeTrim: e.target.checked })}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-slate-700">
                  {t('calculators.doorsWindows.includeTrim')}
                </label>
              </div>

              {opening.includeTrim && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.doorsWindows.trimStyle')}
                  </label>
                  <select
                    value={opening.trimStyle}
                    onChange={(e) => updateOpening(opening.id, { trimStyle: e.target.value as Opening['trimStyle'] })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {Object.entries(trimStyles).map(([value, { name }]) => (
                      <option key={value} value={value}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={opening.includeHardware}
                  onChange={(e) => updateOpening(opening.id, { includeHardware: e.target.checked })}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-slate-700">
                  {t('calculators.doorsWindows.includeHardware')}
                </label>
              </div>
            </div>

            <button
              onClick={() => removeOpening(opening.id)}
              className="mt-4 text-red-500 hover:text-red-600 text-sm font-medium"
            >
              {t('calculators.doorsWindows.remove')} {opening.type === 'door' ? t('calculators.doorsWindows.door') : t('calculators.doorsWindows.window')}
            </button>
          </div>
        ))}

        {openings.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="flex justify-center space-x-2 mb-4">
              <DoorClosed className="w-12 h-12 text-gray-400" />
              <AppWindow className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">{t('calculators.doorsWindows.emptyMessage')}</p>
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => addOpening('door')}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                {t('calculators.doorsWindows.addDoor')}
              </button>
              <button
                onClick={() => addOpening('window')}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                {t('calculators.doorsWindows.addWindow')}
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.doorsWindows.additionalMaterials')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeInsulation"
                checked={includeInsulation}
                onChange={(e) => setIncludeInsulation(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeInsulation" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.doorsWindows.includeInsulation')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeFlashing"
                checked={includeFlashing}
                onChange={(e) => setIncludeFlashing(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeFlashing" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.doorsWindows.includeFlashing')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeCaulk"
                checked={includeCaulk}
                onChange={(e) => setIncludeCaulk(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeCaulk" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.doorsWindows.includeCaulk')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeShims"
                checked={includeShims}
                onChange={(e) => setIncludeShims(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeShims" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.doorsWindows.includeShims')}
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
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default DoorsWindowsCalculator;
