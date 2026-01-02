import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
import { useCustomMaterials } from '../../hooks/useCustomMaterials';

const ConcreteCalculator: React.FC<CalculatorProps> = ({ onCalculate, onSaveSuccess }) => {
  const { t } = useTranslation();
  const { activeTab } = useCalculatorTab();
  const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } = useCustomCalculator('concrete', activeTab === 'custom');
  const { getCustomPrice, getCustomUnitValue } = useCustomMaterials('concrete');
  const [concreteType, setConcreteType] = useState<'wall' | 'flatwork'>('flatwork');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [thickness, setThickness] = useState<number | ''>(''); // For wall thickness in inches
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial');
  const [reinforcement, setReinforcement] = useState<'none' | 'rebar' | 'mesh'>('none');
  const [rebarSpacing, setRebarSpacing] = useState<number>(12); // inches or 30cm
  const [meshType, setMeshType] = useState<'6x6' | '4x4'>('6x6');
  const [deliveryMethod, setDeliveryMethod] = useState<'bags' | 'truck'>('truck'); // Default to ready-mix truck
  const [bagSize, setBagSize] = useState<60 | 80>(80); // 60lb or 80lb bags
  const [addColor, setAddColor] = useState<boolean>(false);
  const [colorPricePerYard, setColorPricePerYard] = useState<number | ''>('');
  const [addFiber, setAddFiber] = useState<boolean>(false);
  const [fiberPricePerYard, setFiberPricePerYard] = useState<number | ''>('');
  const [lastCalculation, setLastCalculation] = useState<CalculationResult[] | null>(null);

  // Default pricing with dynamic pricing support
  // 60lb bag = $6.98, 80lb bag = $5.89
  const defaultPricing = {
    bagPrice60: getCustomPrice('Concrete Bag 60lb', 6.98, 'concrete'),
    bagPrice80: getCustomPrice('Concrete Bag 80lb', 5.89, 'concrete'),
    bagPrice: bagSize === 60
      ? getCustomPrice('Concrete Bag 60lb', 6.98, 'concrete')
      : getCustomPrice('Concrete Bag 80lb', 5.89, 'concrete'),
    truckPricePerYard: getCustomPrice('3000 PSI Concrete', 185, 'concrete'),
    deliveryFee: getCustomPrice('Delivery Fee', 150, 'concrete'),
    rebarPrice: unit === 'imperial' ? getCustomPrice('#4 Rebar', 8.98, 'reinforcement') : getCustomPrice('#4 Rebar', 9.50, 'reinforcement'),
    meshPrice6x6: getCustomPrice('Wire Mesh', 12.98, 'reinforcement'),
    meshPrice4x4: getCustomPrice('Wire Mesh 4x4', 16.98, 'reinforcement')
  };

  // Determine active pricing based on tab
  const activePricing = useMemo(() => {
    if (activeTab === 'custom' && isConfigured && customPricing) {
      return {
        bagPrice: customPricing.concrete_bag_price || defaultPricing.bagPrice,
        truckPricePerYard: customPricing.concrete_truck_per_yard || defaultPricing.truckPricePerYard,
        deliveryFee: customPricing.concrete_delivery_fee || defaultPricing.deliveryFee,
        rebarPrice: customPricing.rebar_price || defaultPricing.rebarPrice,
        meshPrice6x6: customPricing.mesh_price_6x6 || defaultPricing.meshPrice6x6,
        meshPrice4x4: customPricing.mesh_price_4x4 || defaultPricing.meshPrice4x4
      };
    }
    return defaultPricing;
  }, [activeTab, isConfigured, customPricing, unit]);

  // Get current inputs for saving
  const getCurrentInputs = () => ({
    concreteType,
    length,
    width,
    height,
    thickness,
    unit,
    reinforcement,
    rebarSpacing,
    meshType,
    deliveryMethod,
    bagSize,
    addColor,
    colorPricePerYard,
    addFiber,
    fiberPricePerYard
  });

  // Load saved estimate inputs
  const handleLoadEstimate = (inputs: Record<string, any>) => {
    setConcreteType(inputs.concreteType || 'flatwork');
    setLength(inputs.length ?? '');
    setWidth(inputs.width ?? '');
    setHeight(inputs.height ?? '');
    setThickness(inputs.thickness ?? '');
    setUnit(inputs.unit || 'imperial');
    setReinforcement(inputs.reinforcement || 'none');
    setRebarSpacing(inputs.rebarSpacing ?? 12);
    setMeshType(inputs.meshType || '6x6');
    setDeliveryMethod(inputs.deliveryMethod || 'truck');
    setBagSize(inputs.bagSize || 80);
    setAddColor(inputs.addColor ?? false);
    setColorPricePerYard(inputs.colorPricePerYard ?? '');
    setAddFiber(inputs.addFiber ?? false);
    setFiberPricePerYard(inputs.fiberPricePerYard ?? '');
  };

  // Reset all inputs to defaults for new estimate
  const handleNewEstimate = () => {
    setConcreteType('flatwork');
    setLength('');
    setWidth('');
    setHeight('');
    setThickness('');
    setUnit('imperial');
    setReinforcement('none');
    setRebarSpacing(12);
    setMeshType('6x6');
    setDeliveryMethod('truck');
    setBagSize(80);
    setAddColor(false);
    setColorPricePerYard('');
    setAddFiber(false);
    setFiberPricePerYard('');
    setLastCalculation(null);
  };

  const handleCalculate = () => {
    if (typeof length === 'number' &&
        (concreteType === 'flatwork' ? (typeof width === 'number' && typeof height === 'number') :
         (typeof height === 'number' && typeof thickness === 'number'))) {
      let volume: number;
      let volumeUnit: string;
      let bagsNeeded: number;
      let bagsUnit: string;

      if (unit === 'imperial') {
        // For walls: length in feet, height in feet, thickness in inches
        // For flatwork: length and width in feet, depth in inches
        volume = concreteType === 'wall'
          ? (length * height * (thickness / 12)) / 27 // Linear feet × height × (thickness in feet) / 27
          : (length * width * (height / 12)) / 27; // Convert depth from inches to feet, then to cubic yards
        volumeUnit = t('calculators.concrete.cubicYards');
        // Bag yields: 60lb = 0.45 cu ft, 80lb = 0.60 cu ft
        // Per cubic yard (27 cu ft): 60lb = 60 bags, 80lb = 45 bags
        const bagsPerYard = bagSize === 60 ? 60 : 45;
        bagsNeeded = Math.ceil(volume * bagsPerYard);
        bagsUnit = `${bagSize}${t('calculators.concrete.lbBags')}`;
      } else {
        volume = concreteType === 'wall'
          ? (length * height * (thickness / 100)) // Linear meters × height × (thickness in meters)
          : length * width * (height / 100); // Convert depth from cm to meters
        volumeUnit = t('calculators.concrete.cubicMeters');
        bagsNeeded = Math.ceil(volume * 90);
        bagsUnit = t('calculators.concrete.kgBags');
      }

      const results: CalculationResult[] = [
        {
          label: t('calculators.concrete.concreteVolume'),
          value: Number(volume.toFixed(2)),
          unit: volumeUnit
        }
      ];

      if (deliveryMethod === 'bags') {
        const bagCost = bagsNeeded * (activePricing?.bagPrice || defaultPricing.bagPrice);

        results.push(
          {
            label: t('calculators.concrete.bagsOfConcrete'),
            value: bagsNeeded,
            unit: bagsUnit,
            cost: bagCost
          }
        );
      } else {
        // Truck delivery
        const minLoad = 1; // Minimum load in cubic yards
        const truckPrice = activePricing?.truckPricePerYard || defaultPricing.truckPricePerYard;
        const deliveryFee = volume < minLoad ? (activePricing?.deliveryFee || defaultPricing.deliveryFee) : 0;
        let truckCost = (Math.max(volume, minLoad) * truckPrice) + deliveryFee;

        // Add color cost if selected
        if (addColor && typeof colorPricePerYard === 'number') {
          const colorCost = Math.max(volume, minLoad) * colorPricePerYard;
          truckCost += colorCost;

          results.push({
            label: 'Concrete Color Additive',
            value: Math.max(volume, minLoad),
            unit: volumeUnit,
            cost: colorCost
          });
        }

        // Add fiber cost if selected
        if (addFiber && typeof fiberPricePerYard === 'number') {
          const fiberCost = Math.max(volume, minLoad) * fiberPricePerYard;
          truckCost += fiberCost;

          results.push({
            label: 'Fiber Reinforcement Additive',
            value: Math.max(volume, minLoad),
            unit: volumeUnit,
            cost: fiberCost
          });
        }

        results.push({
          label: t('calculators.concrete.readyMix'),
          value: Math.max(volume, minLoad),
          unit: volumeUnit,
          cost: truckCost
        });

        if (volume < minLoad) {
          results.push({
            label: t('calculators.concrete.note'),
            value: minLoad,
            unit: t('calculators.concrete.minimumLoad')
          });
        }

        // Add small load fee warning for volumes under 3 cubic yards
        if (volume < 3) {
          results.push({
            label: '⚠️ Small Load Fee Notice',
            value: 0,
            unit: 'Orders under 3 cubic yards typically incur a $150-$300 small load fee. Please add this to your estimate.',
            isWarning: true
          });
        }
      }

      // Add reinforcement calculations
      if (reinforcement === 'rebar') {
        const area = length * width;
        const spacing = unit === 'imperial' ? rebarSpacing / 12 : rebarSpacing / 100;
        const lengthBars = Math.ceil(width / spacing) + 1;
        const widthBars = Math.ceil(length / spacing) + 1;
        const totalLength = (length * lengthBars) + (width * widthBars);
        const rebarPrice = activePricing?.rebarPrice || defaultPricing.rebarPrice;
        const rebarCost = Math.ceil(totalLength / 20) * rebarPrice; // 20ft rebar lengths

        results.push({
          label: t('calculators.concrete.rebarLengthNeeded'),
          value: Number(totalLength.toFixed(2)),
          unit: unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters'),
          cost: rebarCost
        });
      } else if (reinforcement === 'mesh') {
        const area = length * width;
        const sheetSize = unit === 'imperial' ? 100 : 9.29; // 100 sqft or 9.29 sqm per sheet
        const sheetsNeeded = Math.ceil(area / sheetSize);
        const meshPrice = meshType === '6x6'
          ? (activePricing?.meshPrice6x6 || defaultPricing.meshPrice6x6)
          : (activePricing?.meshPrice4x4 || defaultPricing.meshPrice4x4);
        const meshCost = sheetsNeeded * meshPrice;

        results.push({
          label: `${meshType} ${t('calculators.concrete.meshSheetsNeeded')}`,
          value: sheetsNeeded,
          unit: t('calculators.concrete.sheets'),
          cost: meshCost
        });
      }

      setLastCalculation(results);
      onCalculate(results);
    }
  };

  // Show loading state if custom calculator data is loading
  if (activeTab === 'custom' && loadingCustom) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Calculator className="h-6 w-6 text-orange-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.concrete.title')}</h2>
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
          <Calculator className="h-6 w-6 text-orange-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.concrete.title')}</h2>
        </div>
        <div className="text-center py-12">
          <Calculator className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Required</h3>
          <p className="text-gray-600 mb-4">
            This calculator hasn't been configured yet. Click the gear icon to set up your custom materials and pricing.
          </p>
        </div>
      </div>
    );
  }

  const isFormValid =
    typeof length === 'number' &&
    (concreteType === 'flatwork'
      ? (typeof width === 'number' && typeof height === 'number')
      : (typeof height === 'number' && typeof thickness === 'number'));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Calculator className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.concrete.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="concrete"
        currentData={getCurrentInputs()}
        resultsData={lastCalculation ? { results: lastCalculation } : undefined}
        onLoad={(estimateData, resultsData) => {
          handleLoadEstimate(estimateData);
          if (resultsData?.results) {
            setLastCalculation(resultsData.results);
          }
        }}
      />

      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                concreteType === 'flatwork'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setConcreteType('flatwork')}
            >
              {t('calculators.concrete.flatwork')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                concreteType === 'wall'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setConcreteType('wall')}
            >
              {t('calculators.concrete.wall')}
            </button>
          </div>

          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                unit === 'imperial'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setUnit('imperial')}
            >
              {t('calculators.concrete.imperial')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                unit === 'metric'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setUnit('metric')}
            >
              {t('calculators.concrete.metric')}
            </button>
          </div>

          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-l-lg ${
                deliveryMethod === 'bags'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setDeliveryMethod('bags')}
            >
              {t('calculators.concrete.bags')}
            </button>
            <button
              type="button"
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-r-lg ${
                deliveryMethod === 'truck'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setDeliveryMethod('truck')}
            >
              <span className="hidden sm:inline">{t('calculators.concrete.readyMixTruck')}</span>
              <span className="sm:hidden">{t('calculators.concrete.truck')}</span>
            </button>
          </div>

          {/* Bag Size Selection - only show when bags selected */}
          {deliveryMethod === 'bags' && (
            <div className="inline-flex rounded-md shadow-sm">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  bagSize === 60
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                } border border-slate-300`}
                onClick={() => setBagSize(60)}
              >
                60lb ($6.98)
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  bagSize === 80
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                } border border-slate-300`}
                onClick={() => setBagSize(80)}
              >
                80lb ($5.89)
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              {concreteType === 'wall' ? 'Total Linear Feet' : t('calculators.concrete.length')} ({unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters')})
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.01"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={concreteType === 'wall' ? 'Total wall length' : `${t('calculators.concrete.enterLength')} ${unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters')}`}
            />
          </div>

          {concreteType === 'flatwork' && (
            <div>
              <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.concrete.width')} ({unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters')})
              </label>
              <input
                type="number"
                id="width"
                min="0"
                step="0.01"
                value={width}
                onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={`${t('calculators.concrete.enterWidth')} ${unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters')}`}
              />
            </div>
          )}

          {concreteType === 'wall' && (
            <div>
              <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
                Height of Wall ({unit === 'imperial' ? 'feet' : t('calculators.concrete.meters')})
              </label>
              <input
                type="number"
                id="height"
                min="0"
                step="0.01"
                value={height}
                onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., 8"
              />
            </div>
          )}

          {concreteType === 'wall' && (
            <div>
              <label htmlFor="thickness" className="block text-sm font-medium text-slate-700 mb-1">
                Wall Thickness ({unit === 'imperial' ? t('calculators.concrete.inches') : 'cm'})
              </label>
              <input
                type="number"
                id="thickness"
                min="0"
                step="0.5"
                value={thickness}
                onChange={(e) => setThickness(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., 8"
              />
            </div>
          )}

          {concreteType === 'flatwork' && (
            <div>
              <label htmlFor="flatworkThickness" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.concrete.thickness')} ({unit === 'imperial' ? t('calculators.concrete.inches') : t('calculators.concrete.centimeters')})
              </label>
              <input
                type="number"
                id="flatworkThickness"
                min="0"
                step="0.5"
                value={height}
                onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={`${t('calculators.concrete.enterThickness')} ${unit === 'imperial' ? t('calculators.concrete.inches') : t('calculators.concrete.centimeters')}`}
              />
            </div>
          )}
        </div>

        {/* Color and Fiber Add-ons - Only show for Ready-Mix Truck */}
        {deliveryMethod === 'truck' && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Concrete Add-ons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="addColor"
                  checked={addColor}
                  onChange={(e) => setAddColor(e.target.checked)}
                  className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor="addColor" className="block text-sm font-medium text-slate-700 mb-1">
                    Add Color to Concrete
                  </label>
                  {addColor && (
                    <div className="mt-2">
                      <label htmlFor="colorPrice" className="block text-xs text-slate-600 mb-1">
                        Price per Cubic Yard ($)
                      </label>
                      <input
                        type="number"
                        id="colorPrice"
                        min="0"
                        step="0.01"
                        value={colorPricePerYard}
                        onChange={(e) => setColorPricePerYard(e.target.value ? Number(e.target.value) : '')}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., 15.00"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="addFiber"
                  checked={addFiber}
                  onChange={(e) => setAddFiber(e.target.checked)}
                  className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor="addFiber" className="block text-sm font-medium text-slate-700 mb-1">
                    Add Fiber Reinforcement
                  </label>
                  {addFiber && (
                    <div className="mt-2">
                      <label htmlFor="fiberPrice" className="block text-xs text-slate-600 mb-1">
                        Price per Cubic Yard ($)
                      </label>
                      <input
                        type="number"
                        id="fiberPrice"
                        min="0"
                        step="0.01"
                        value={fiberPricePerYard}
                        onChange={(e) => setFiberPricePerYard(e.target.value ? Number(e.target.value) : '')}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., 8.00"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.concrete.reinforcementOptions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reinforcement" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.concrete.reinforcementType')}
              </label>
              <select
                id="reinforcement"
                value={reinforcement}
                onChange={(e) => setReinforcement(e.target.value as 'none' | 'rebar' | 'mesh')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="none">{t('calculators.concrete.noReinforcement')}</option>
                <option value="rebar">{t('calculators.concrete.rebarGrid')}</option>
                <option value="mesh">{t('calculators.concrete.wireMesh')}</option>
              </select>
            </div>

            {reinforcement === 'rebar' && (
              <div>
                <label htmlFor="rebarSpacing" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.concrete.rebarSpacing')} ({unit === 'imperial' ? t('calculators.concrete.inches') : 'cm'})
                </label>
                <select
                  id="rebarSpacing"
                  value={rebarSpacing}
                  onChange={(e) => setRebarSpacing(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {unit === 'imperial' ? (
                    <>
                      <option value="12">12 {t('calculators.concrete.inches')}</option>
                      <option value="16">16 {t('calculators.concrete.inches')}</option>
                      <option value="18">18 {t('calculators.concrete.inches')}</option>
                      <option value="24">24 {t('calculators.concrete.inches')}</option>
                    </>
                  ) : (
                    <>
                      <option value="30">30 cm</option>
                      <option value="40">40 cm</option>
                      <option value="45">45 cm</option>
                      <option value="60">60 cm</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {reinforcement === 'mesh' && (
              <div>
                <label htmlFor="meshType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.concrete.meshType')}
                </label>
                <select
                  id="meshType"
                  value={meshType}
                  onChange={(e) => setMeshType(e.target.value as '6x6' | '4x4')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="6x6">6x6 - W2.9 x W2.9</option>
                  <option value="4x4">4x4 - W4.0 x W4.0</option>
                </select>
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
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default ConcreteCalculator;
