import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Grid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
import { useCustomMaterials } from '../../hooks/useCustomMaterials';

type FlooringType = 'hardwood' | 'laminate' | 'vinyl' | 'carpet' | 'engineered';
type InstallPattern = 'straight' | 'diagonal' | 'herringbone';
type UnderlaymentType = 'standard' | 'premium' | 'moisture-barrier';

interface FlooringOption {
  name: string;
  width: number; // inches
  length: number; // inches
  piecesPerBox: number;
  sqftPerBox: number;
  pricePerBox: number;
  requiresUnderlayment: boolean;
  patterns: InstallPattern[];
}

const flooringOptions: Record<FlooringType, FlooringOption[]> = {
  hardwood: [
    {
      name: "3/4\" Oak Strip",
      width: 2.25,
      length: 84,
      piecesPerBox: 24,
      sqftPerBox: 25,
      pricePerBox: 159.98,
      requiresUnderlayment: false,
      patterns: ['straight', 'diagonal', 'herringbone']
    },
    {
      name: "3/4\" Oak Plank",
      width: 5,
      length: 84,
      piecesPerBox: 12,
      sqftPerBox: 25,
      pricePerBox: 179.98,
      requiresUnderlayment: false,
      patterns: ['straight', 'diagonal']
    },
    {
      name: "Custom Hardwood",
      width: 0,
      length: 0,
      piecesPerBox: 0,
      sqftPerBox: 0,
      pricePerBox: 0,
      requiresUnderlayment: false,
      patterns: ['straight', 'diagonal', 'herringbone']
    }
  ],
  engineered: [
    {
      name: "3/8\" Engineered Oak",
      width: 5,
      length: 48,
      piecesPerBox: 8,
      sqftPerBox: 22,
      pricePerBox: 129.98,
      requiresUnderlayment: true,
      patterns: ['straight', 'diagonal']
    },
    {
      name: "1/2\" Engineered Maple",
      width: 7,
      length: 48,
      piecesPerBox: 6,
      sqftPerBox: 20,
      pricePerBox: 149.98,
      requiresUnderlayment: true,
      patterns: ['straight', 'diagonal']
    },
    {
      name: "Custom Engineered",
      width: 0,
      length: 0,
      piecesPerBox: 0,
      sqftPerBox: 0,
      pricePerBox: 0,
      requiresUnderlayment: true,
      patterns: ['straight', 'diagonal']
    }
  ],
  laminate: [
    {
      name: "8mm Laminate",
      width: 7.6,
      length: 54,
      piecesPerBox: 8,
      sqftPerBox: 22.5,
      pricePerBox: 49.98,
      requiresUnderlayment: true,
      patterns: ['straight']
    },
    {
      name: "12mm Laminate",
      width: 7.6,
      length: 54,
      piecesPerBox: 6,
      sqftPerBox: 17.5,
      pricePerBox: 69.98,
      requiresUnderlayment: true,
      patterns: ['straight']
    },
    {
      name: "Custom Laminate",
      width: 0,
      length: 0,
      piecesPerBox: 0,
      sqftPerBox: 0,
      pricePerBox: 0,
      requiresUnderlayment: true,
      patterns: ['straight']
    }
  ],
  vinyl: [
    {
      name: "Luxury Vinyl Plank",
      width: 7,
      length: 48,
      piecesPerBox: 10,
      sqftPerBox: 23.64,
      pricePerBox: 89.98,
      requiresUnderlayment: false,
      patterns: ['straight', 'diagonal']
    },
    {
      name: "WPC Vinyl Plank",
      width: 7,
      length: 48,
      piecesPerBox: 8,
      sqftPerBox: 19.2,
      pricePerBox: 109.98,
      requiresUnderlayment: false,
      patterns: ['straight', 'diagonal']
    },
    {
      name: "Custom Vinyl",
      width: 0,
      length: 0,
      piecesPerBox: 0,
      sqftPerBox: 0,
      pricePerBox: 0,
      requiresUnderlayment: false,
      patterns: ['straight', 'diagonal']
    }
  ],
  carpet: [
    {
      name: "Plush Carpet",
      width: 144,
      length: 144,
      piecesPerBox: 1,
      sqftPerBox: 144,
      pricePerBox: 359.98,
      requiresUnderlayment: true,
      patterns: ['straight']
    },
    {
      name: "Berber Carpet",
      width: 144,
      length: 144,
      piecesPerBox: 1,
      sqftPerBox: 144,
      pricePerBox: 299.98,
      requiresUnderlayment: true,
      patterns: ['straight']
    },
    {
      name: "Custom Carpet",
      width: 0,
      length: 0,
      piecesPerBox: 0,
      sqftPerBox: 0,
      pricePerBox: 0,
      requiresUnderlayment: true,
      patterns: ['straight']
    }
  ]
};

const underlaymentOptions = {
  standard: { name: 'Standard Foam', pricePerSqft: 0.45 },
  premium: { name: 'Premium Foam with Vapor Barrier', pricePerSqft: 0.75 },
  'moisture-barrier': { name: 'Moisture Barrier', pricePerSqft: 0.35 }
};

const FlooringCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const { activeTab } = useCalculatorTab();
  const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } = useCustomCalculator('flooring', activeTab === 'custom');
  const { getCustomPrice, getCustomUnitValue } = useCustomMaterials('flooring');
  const [inputType, setInputType] = useState<'dimensions' | 'area'>('dimensions');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [area, setArea] = useState<number | ''>('');
  const [flooringType, setFlooringType] = useState<FlooringType>('hardwood');
  const [selectedFlooring, setSelectedFlooring] = useState<number>(0);
  const [installPattern, setInstallPattern] = useState<InstallPattern>('straight');
  const [wasteFactor, setWasteFactor] = useState<10 | 15 | 20>(10);
  const [includeUnderlayment, setIncludeUnderlayment] = useState(true);
  const [underlaymentType, setUnderlaymentType] = useState<UnderlaymentType>('standard');
  const [includeTransitionStrips, setIncludeTransitionStrips] = useState(false);
  const [transitionStripLength, setTransitionStripLength] = useState<number | ''>('');

  // Custom product options
  const [customName, setCustomName] = useState<string>('');
  const [customPricePerBox, setCustomPricePerBox] = useState<number | ''>('');
  const [customSqftPerBox, setCustomSqftPerBox] = useState<number | ''>('');

  const isCustomSelection = (option: FlooringOption) => option.name.startsWith('Custom');

  // Determine which data source to use based on active tab
  const activeFlooringOptions = useMemo(() => {
    if (activeTab === 'custom' && isConfigured && customMaterials.length > 0) {
      const customFlooring = customMaterials.filter(m => m.category === 'flooring-material');
      if (customFlooring.length > 0) {
        const optionsByType: Record<FlooringType, FlooringOption[]> = {
          hardwood: [],
          engineered: [],
          laminate: [],
          vinyl: [],
          carpet: []
        };
        customFlooring.forEach(m => {
          const metadata = m.metadata || {};
          const type = (metadata.flooring_type || 'hardwood') as FlooringType;
          optionsByType[type].push({
            name: m.name,
            width: metadata.width || 5,
            length: metadata.length || 48,
            piecesPerBox: metadata.pieces_per_box || 10,
            sqftPerBox: metadata.sqft_per_box || 20,
            pricePerBox: m.price,
            requiresUnderlayment: metadata.requires_underlayment !== false,
            patterns: metadata.patterns || ['straight']
          });
        });
        // Keep at least the custom option for each type
        Object.keys(optionsByType).forEach((key) => {
          const type = key as FlooringType;
          if (optionsByType[type].length === 0) {
            optionsByType[type] = flooringOptions[type];
          }
        });
        return optionsByType;
      }
    }
    return flooringOptions;
  }, [activeTab, isConfigured, customMaterials]);

  const activeUnderlaymentOptions = useMemo(() => {
    if (activeTab === 'custom' && isConfigured && customMaterials.length > 0) {
      const customUnderlayment = customMaterials.filter(m => m.category === 'flooring-underlayment');
      if (customUnderlayment.length > 0) {
        const optionMap: Record<string, { name: string; pricePerSqft: number }> = {};
        customUnderlayment.forEach(m => {
          const key = m.id.substring(0, 10);
          optionMap[key] = {
            name: m.name,
            pricePerSqft: m.metadata?.price_per_sqft || m.price
          };
        });
        return Object.keys(optionMap).length > 0 ? optionMap : underlaymentOptions;
      }
    }
    return underlaymentOptions;
  }, [activeTab, isConfigured, customMaterials]);

  // Auto-select when switching tabs
  useEffect(() => {
    if (activeTab === 'custom' && activeFlooringOptions[flooringType]?.length > 0) {
      const currentExists = activeFlooringOptions[flooringType].find((_, idx) => idx === selectedFlooring);
      if (!currentExists) {
        setSelectedFlooring(0);
      }
    } else if (activeTab === 'default') {
      const currentExists = activeFlooringOptions[flooringType]?.find((_, idx) => idx === selectedFlooring);
      if (!currentExists) {
        setSelectedFlooring(0);
      }
    }
  }, [activeTab, activeFlooringOptions, flooringType]);

  const getCurrentInputs = () => ({
    inputType,
    length,
    width,
    area,
    flooringType,
    selectedFlooring,
    installPattern,
    wasteFactor,
    includeUnderlayment,
    underlaymentType,
    includeTransitionStrips,
    transitionStripLength,
    customName,
    customPricePerBox,
    customSqftPerBox
  });

  const handleLoadEstimate = (data: any) => {
    if (data.inputType) setInputType(data.inputType);
    if (data.length !== undefined) setLength(data.length);
    if (data.width !== undefined) setWidth(data.width);
    if (data.area !== undefined) setArea(data.area);
    if (data.flooringType) setFlooringType(data.flooringType);
    if (data.selectedFlooring !== undefined) setSelectedFlooring(data.selectedFlooring);
    if (data.installPattern) setInstallPattern(data.installPattern);
    if (data.wasteFactor !== undefined) setWasteFactor(data.wasteFactor);
    if (data.includeUnderlayment !== undefined) setIncludeUnderlayment(data.includeUnderlayment);
    if (data.underlaymentType) setUnderlaymentType(data.underlaymentType);
    if (data.includeTransitionStrips !== undefined) setIncludeTransitionStrips(data.includeTransitionStrips);
    if (data.transitionStripLength !== undefined) setTransitionStripLength(data.transitionStripLength);
    if (data.customName !== undefined) setCustomName(data.customName);
    if (data.customPricePerBox !== undefined) setCustomPricePerBox(data.customPricePerBox);
    if (data.customSqftPerBox !== undefined) setCustomSqftPerBox(data.customSqftPerBox);
  };

  const handleNewEstimate = () => {
    setInputType('dimensions');
    setLength('');
    setWidth('');
    setArea('');
    setFlooringType('hardwood');
    setSelectedFlooring(0);
    setInstallPattern('straight');
    setWasteFactor(10);
    setIncludeUnderlayment(true);
    setUnderlaymentType('standard');
    setIncludeTransitionStrips(false);
    setTransitionStripLength('');
    setCustomName('');
    setCustomPricePerBox('');
    setCustomSqftPerBox('');
  };

  const handleCalculate = () => {
    let totalArea: number;

    if (inputType === 'dimensions' && typeof length === 'number' && typeof width === 'number') {
      totalArea = length * width;
    } else if (inputType === 'area' && typeof area === 'number') {
      totalArea = area;
    } else {
      return;
    }

    let selectedOption = activeFlooringOptions[flooringType]?.[selectedFlooring];
    if (!selectedOption) {
      return;
    }

    // If this is a custom selection, update the option with custom values
    if (isCustomSelection(selectedOption)) {
      if (typeof customPricePerBox === 'number' && typeof customSqftPerBox === 'number') {
        selectedOption = {
          ...selectedOption,
          name: customName || selectedOption.name,
          sqftPerBox: customSqftPerBox,
          pricePerBox: customPricePerBox
        };
      } else {
        return;
      }
    }

    // Add waste factor
    const patternWasteFactor = installPattern === 'diagonal' ? 1.1 :
                              installPattern === 'herringbone' ? 1.15 : 1;
    const areaWithWaste = totalArea * (1 + wasteFactor / 100) * patternWasteFactor;

    // Calculate boxes needed
    const boxesNeeded = Math.ceil(areaWithWaste / selectedOption.sqftPerBox);
    const flooringCost = boxesNeeded * selectedOption.pricePerBox;

    const results: CalculationResult[] = [
      {
        label: t('calculators.flooring.totalArea'),
        value: Number(totalArea.toFixed(2)),
        unit: t('calculators.flooring.squareFeet')
      },
      {
        label: `${t('calculators.flooring.areaWith')} ${wasteFactor}% ${t('calculators.flooring.waste')}${installPattern !== 'straight' ? ` & ${installPattern} ${t('calculators.flooring.pattern')}` : ''}`,
        value: Number(areaWithWaste.toFixed(2)),
        unit: t('calculators.flooring.squareFeet')
      },
      {
        label: `${selectedOption.name}`,
        value: boxesNeeded,
        unit: t('calculators.flooring.boxes'),
        cost: flooringCost
      }
    ];

    let totalCost = flooringCost;

    // Calculate underlayment if needed
    if (includeUnderlayment && selectedOption.requiresUnderlayment) {
      const underlaymentRolls = Math.ceil(areaWithWaste / 100); // Typical 100 sq ft rolls
      const underlaymentPricePerSqft = activeUnderlaymentOptions[underlaymentType]?.pricePerSqft || 0.45;
      const underlaymentPrice = getCustomPrice(
        activeUnderlaymentOptions[underlaymentType]?.name || 'Standard Foam',
        underlaymentPricePerSqft,
        'underlayment'
      );
      const underlaymentCost = underlaymentRolls * (underlaymentPrice * 100);
      totalCost += underlaymentCost;

      results.push({
        label: `${activeUnderlaymentOptions[underlaymentType]?.name || 'Underlayment'}`,
        value: underlaymentRolls,
        unit: t('calculators.flooring.rolls100sf'),
        cost: underlaymentCost
      });
    }

    // Calculate transition strips if needed
    if (includeTransitionStrips && typeof transitionStripLength === 'number') {
      const stripsNeeded = Math.ceil(transitionStripLength / 4); // 4ft strips
      const stripsCost = stripsNeeded * getCustomPrice('Transition Strips', 19.98, 'trim');
      totalCost += stripsCost;

      results.push({
        label: t('calculators.flooring.transitionStrips'),
        value: stripsNeeded,
        unit: t('calculators.flooring.pieces4ft'),
        cost: stripsCost
      });
    }

    // Add total cost
    results.push({
      label: t('calculators.flooring.totalCost'),
      value: Number(totalCost.toFixed(2)),
      unit: 'USD',
      isTotal: true
    });

    onCalculate(results);
  };

  const isFormValid =
    ((inputType === 'dimensions' && typeof length === 'number' && typeof width === 'number') ||
    (inputType === 'area' && typeof area === 'number')) &&
    (!includeTransitionStrips || typeof transitionStripLength === 'number') &&
    (!isCustomSelection(activeFlooringOptions[flooringType]?.[selectedFlooring] || {} as FlooringOption) || (
      typeof customPricePerBox === 'number' &&
      typeof customSqftPerBox === 'number'
    ));

  // Show loading state if custom calculator data is loading
  if (activeTab === 'custom' && loadingCustom) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Grid className="h-6 w-6 text-orange-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.flooring.title')}</h2>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading custom configuration...</p>
        </div>
      </div>
    );
  }

  // Show message if custom tab but not configured
  if (activeTab === 'custom' && !isConfigured) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Grid className="h-6 w-6 text-orange-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.flooring.title')}</h2>
        </div>
        <div className="text-center py-12">
          <Grid className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
        <Grid className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.flooring.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="flooring"
        getCurrentInputs={getCurrentInputs}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="flex justify-between mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                inputType === 'dimensions'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setInputType('dimensions')}
            >
              {t('calculators.flooring.useDimensions')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                inputType === 'area'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setInputType('area')}
            >
              {t('calculators.flooring.useSquareFootage')}
            </button>
          </div>
        </div>

        {inputType === 'dimensions' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.flooring.length')}
              </label>
              <input
                type="number"
                id="length"
                min="0"
                step="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.flooring.lengthPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.flooring.width')}
              </label>
              <input
                type="number"
                id="width"
                min="0"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.flooring.widthPlaceholder')}
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="area" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.flooring.totalArea')}
            </label>
            <input
              type="number"
              id="area"
              min="0"
              step="0.1"
              value={area}
              onChange={(e) => setArea(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.flooring.totalAreaPlaceholder')}
            />
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.flooring.flooringSelection')}</h3>
          <div>
            <label htmlFor="flooringType" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.flooring.flooringType')}
            </label>
            <select
              id="flooringType"
              value={flooringType}
              onChange={(e) => {
                setFlooringType(e.target.value as FlooringType);
                setSelectedFlooring(0);
                setInstallPattern('straight');
                setCustomName('');
                setCustomPricePerBox('');
                setCustomSqftPerBox('');
              }}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="hardwood">{t('calculators.flooring.hardwood')}</option>
              <option value="engineered">{t('calculators.flooring.engineered')}</option>
              <option value="laminate">{t('calculators.flooring.laminate')}</option>
              <option value="vinyl">{t('calculators.flooring.vinyl')}</option>
              <option value="carpet">{t('calculators.flooring.carpet')}</option>
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="selectedFlooring" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.flooring.productSelection')}
            </label>
            <select
              id="selectedFlooring"
              value={selectedFlooring}
              onChange={(e) => {
                setSelectedFlooring(Number(e.target.value));
                setCustomName('');
                setCustomPricePerBox('');
                setCustomSqftPerBox('');
              }}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {activeFlooringOptions[flooringType]?.map((option, index) => (
                <option key={index} value={index}>
                  {option.name}
                  {!isCustomSelection(option) && ` ($${option.pricePerBox.toFixed(2)}/box, ${option.sqftPerBox} sq ft/box)`}
                </option>
              ))}
            </select>
          </div>

          {isCustomSelection(activeFlooringOptions[flooringType]?.[selectedFlooring] || {} as FlooringOption) && (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="customName" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.flooring.productName')}
                </label>
                <input
                  type="text"
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.flooring.productNamePlaceholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="customPricePerBox" className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.flooring.pricePerBox')}
                  </label>
                  <input
                    type="number"
                    id="customPricePerBox"
                    min="0"
                    step="0.01"
                    value={customPricePerBox}
                    onChange={(e) => setCustomPricePerBox(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder={t('calculators.flooring.pricePerBoxPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="customSqftPerBox" className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.flooring.sqftPerBox')}
                  </label>
                  <input
                    type="number"
                    id="customSqftPerBox"
                    min="0"
                    step="0.01"
                    value={customSqftPerBox}
                    onChange={(e) => setCustomSqftPerBox(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder={t('calculators.flooring.sqftPerBoxPlaceholder')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.flooring.installationDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="installPattern" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.flooring.installationPattern')}
              </label>
              <select
                id="installPattern"
                value={installPattern}
                onChange={(e) => setInstallPattern(e.target.value as InstallPattern)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {(activeFlooringOptions[flooringType]?.[selectedFlooring]?.patterns || ['straight']).map(pattern => (
                  <option key={pattern} value={pattern}>
                    {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="wasteFactor" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.flooring.wasteFactor')}
              </label>
              <select
                id="wasteFactor"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(Number(e.target.value) as 10 | 15 | 20)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={10}>{t('calculators.flooring.wasteFactor10')}</option>
                <option value={15}>{t('calculators.flooring.wasteFactor15')}</option>
                <option value={20}>{t('calculators.flooring.wasteFactor20')}</option>
              </select>
            </div>
          </div>
        </div>

        {(activeFlooringOptions[flooringType]?.[selectedFlooring]?.requiresUnderlayment || false) && (
          <div className="border-t border-slate-200 pt-6 mb-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="includeUnderlayment"
                checked={includeUnderlayment}
                onChange={(e) => setIncludeUnderlayment(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeUnderlayment" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.flooring.includeUnderlayment')}
              </label>
            </div>

            {includeUnderlayment && (
              <div>
                <label htmlFor="underlaymentType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.flooring.underlaymentType')}
                </label>
                <select
                  id="underlaymentType"
                  value={underlaymentType}
                  onChange={(e) => setUnderlaymentType(e.target.value as UnderlaymentType)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {Object.entries(activeUnderlaymentOptions).map(([value, option]) => (
                    <option key={value} value={value}>
                      {option.name} (${option.pricePerSqft.toFixed(2)}/sqft)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeTransitionStrips"
              checked={includeTransitionStrips}
              onChange={(e) => setIncludeTransitionStrips(e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeTransitionStrips" className="ml-2 block text-sm font-medium text-slate-700">
              {t('calculators.flooring.includeTransitionStrips')}
            </label>
          </div>

          {includeTransitionStrips && (
            <div>
              <label htmlFor="transitionStripLength" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.flooring.transitionStripLength')}
              </label>
              <input
                type="number"
                id="transitionStripLength"
                min="0"
                step="0.1"
                value={transitionStripLength}
                onChange={(e) => setTransitionStripLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.flooring.transitionStripLengthPlaceholder')}
              />
            </div>
          )}
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

export default FlooringCalculator;
