import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalculatorProps, CalculationResult } from '../../types';
import { Radiation as Foundation } from 'lucide-react';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
import { useCustomMaterials } from '../../hooks/useCustomMaterials';

type FoundationType = 'strip-footing' | 'spread-footings' | 'thickened-edge' | 'frost-wall';
type SoilType = 'sandy' | 'clay' | 'rock';
type BackfillType = 'native' | 'gravel' | 'sand';

const FoundationCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const { activeTab } = useCalculatorTab();
  const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } = useCustomCalculator('foundation', activeTab === 'custom');
  const { getCustomPrice, getCustomUnitValue } = useCustomMaterials('foundation');
  const [foundationType, setFoundationType] = useState<FoundationType>('strip-footing');
  const [isBasement, setIsBasement] = useState(false);
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [footingWidth, setFootingWidth] = useState<number | ''>('');
  const [footingDepth, setFootingDepth] = useState<number | ''>('');
  const [stemWallHeight, setStemWallHeight] = useState<number | ''>('');
  const [stemWallThickness, setStemWallThickness] = useState<number | ''>('');
  const [slabThickness, setSlabThickness] = useState<number | ''>('');
  const [soilType, setSoilType] = useState<SoilType>('clay');
  const [backfillType, setBackfillType] = useState<BackfillType>('gravel');
  const [frostDepth, setFrostDepth] = useState<number | ''>('');
  const [includeVaporBarrier, setIncludeVaporBarrier] = useState(true);
  const [includeSteelReinforcement, setIncludeSteelReinforcement] = useState(true);
  const [rebarSize, setRebarSize] = useState<'#3' | '#4' | '#5'>('#4');
  const [rebarSpacing, setRebarSpacing] = useState<12 | 16 | 18>(16);
  const [includeWaterproofing, setIncludeWaterproofing] = useState(true);
  const [includeDrainage, setIncludeDrainage] = useState(true);
  const [concreteStrength, setConcreteStrength] = useState<3000 | 3500 | 4000 | 4500>(3500);
  const [gravelBaseDepth, setGravelBaseDepth] = useState<number | ''>('');
  const [includeICF, setIncludeICF] = useState(false);
  const [icfWallHeight, setIcfWallHeight] = useState<number | ''>('');

  // Build active concrete pricing from custom or default
  const activeConcretePrices = useMemo(() => {
    return {
      3000: getCustomPrice('concrete_3000', 125),
      3500: getCustomPrice('concrete_3500', 135),
      4000: getCustomPrice('concrete_4000', 145),
      4500: getCustomPrice('concrete_4500', 155)
    };
  }, [getCustomPrice]);

  // Build active rebar pricing from custom or default
  const activeRebarPrice = useMemo(() => {
    return getCustomPrice('rebar', 12.98);
  }, [getCustomPrice]);

  // Build active form/drainage materials pricing from custom or default
  const activeMaterialPrices = useMemo(() => {
    return {
      vaporBarrier: getCustomPrice('vapor_barrier', 89.98),
      waterproofing: getCustomPrice('waterproofing', 45.98),
      drainPipe: getCustomPrice('drain_pipe', 12.98),
      gravel: getCustomPrice('gravel', 45),
      backfillNative: getCustomPrice('backfill_native', 15),
      backfillGravel: getCustomPrice('backfill_gravel', 45),
      backfillSand: getCustomPrice('backfill_sand', 35),
      icfMaterial: getCustomPrice('icf_material', 12)
    };
  }, [getCustomPrice]);

  const getCurrentInputs = () => ({
    foundationType,
    isBasement,
    length,
    width,
    footingWidth,
    footingDepth,
    stemWallHeight,
    stemWallThickness,
    slabThickness,
    soilType,
    backfillType,
    frostDepth,
    includeVaporBarrier,
    includeSteelReinforcement,
    rebarSize,
    rebarSpacing,
    includeWaterproofing,
    includeDrainage,
    concreteStrength,
    gravelBaseDepth,
    includeICF,
    icfWallHeight,
  });

  const handleLoadEstimate = (inputs: any) => {
    setFoundationType(inputs.foundationType || 'strip-footing');
    setIsBasement(inputs.isBasement || false);
    setLength(inputs.length || '');
    setWidth(inputs.width || '');
    setFootingWidth(inputs.footingWidth || '');
    setFootingDepth(inputs.footingDepth || '');
    setStemWallHeight(inputs.stemWallHeight || '');
    setStemWallThickness(inputs.stemWallThickness || '');
    setSlabThickness(inputs.slabThickness || '');
    setSoilType(inputs.soilType || 'clay');
    setBackfillType(inputs.backfillType || 'gravel');
    setFrostDepth(inputs.frostDepth || '');
    setIncludeVaporBarrier(inputs.includeVaporBarrier ?? true);
    setIncludeSteelReinforcement(inputs.includeSteelReinforcement ?? true);
    setRebarSize(inputs.rebarSize || '#4');
    setRebarSpacing(inputs.rebarSpacing || 16);
    setIncludeWaterproofing(inputs.includeWaterproofing ?? true);
    setIncludeDrainage(inputs.includeDrainage ?? true);
    setConcreteStrength(inputs.concreteStrength || 3500);
    setGravelBaseDepth(inputs.gravelBaseDepth || '');
    setIncludeICF(inputs.includeICF || false);
    setIcfWallHeight(inputs.icfWallHeight || '');
  };

  const handleNewEstimate = () => {
    setFoundationType('strip-footing');
    setIsBasement(false);
    setLength('');
    setWidth('');
    setFootingWidth('');
    setFootingDepth('');
    setStemWallHeight('');
    setStemWallThickness('');
    setSlabThickness('');
    setSoilType('clay');
    setBackfillType('gravel');
    setFrostDepth('');
    setIncludeVaporBarrier(true);
    setIncludeSteelReinforcement(true);
    setRebarSize('#4');
    setRebarSpacing(16);
    setIncludeWaterproofing(true);
    setIncludeDrainage(true);
    setConcreteStrength(3500);
    setGravelBaseDepth('');
    setIncludeICF(false);
    setIcfWallHeight('');
  };

  const handleCalculate = () => {
    if (typeof length === 'number' && typeof width === 'number' && 
        typeof footingWidth === 'number' && typeof footingDepth === 'number' &&
        typeof stemWallHeight === 'number' && typeof stemWallThickness === 'number' &&
        typeof slabThickness === 'number' && typeof gravelBaseDepth === 'number') {
      
      const results: CalculationResult[] = [];
      let totalCost = 0;

      // Calculate perimeter and area
      const perimeter = 2 * (length + width);
      const area = length * width;

      // 1. Footing Calculations
      const footingWidthFt = footingWidth / 12;
      const footingDepthFt = footingDepth / 12;
      const footingVolume = (perimeter * footingWidthFt * footingDepthFt) / 27;
      const footingConcreteCost = footingVolume * (activeConcretePrices[concreteStrength] || 135);
      totalCost += footingConcreteCost;

      results.push({
        label: `${t('calculators.foundation.footingConcrete')} (${concreteStrength} PSI)`,
        value: Number(footingVolume.toFixed(2)),
        unit: t('calculators.foundation.cubicYards'),
        cost: footingConcreteCost
      });

      // 2. Stem Wall/Basement Wall Calculations
      const wallVolume = (perimeter * stemWallHeight * (stemWallThickness / 12)) / 27;
      const wallConcreteCost = wallVolume * (activeConcretePrices[concreteStrength] || 135);
      totalCost += wallConcreteCost;

      results.push({
        label: `${isBasement ? t('calculators.foundation.basementWall') : t('calculators.foundation.stemWall')} ${t('calculators.foundation.concrete')} (${concreteStrength} PSI)`,
        value: Number(wallVolume.toFixed(2)),
        unit: t('calculators.foundation.cubicYards'),
        cost: wallConcreteCost
      });

      // 3. Backfill Calculations (only if not a basement)
      if (!isBasement) {
        const interiorWidth = width - ((stemWallThickness / 12) * 2);
        const interiorLength = length - ((stemWallThickness / 12) * 2);
        const interiorArea = interiorLength * interiorWidth;
        const backfillHeight = stemWallHeight - ((slabThickness / 12) + (gravelBaseDepth / 12));
        const backfillVolume = (interiorArea * backfillHeight) / 27;
        const backfillPriceMap = {
          'native': activeMaterialPrices.backfillNative,
          'gravel': activeMaterialPrices.backfillGravel,
          'sand': activeMaterialPrices.backfillSand
        };
        const backfillCost = backfillVolume * (backfillPriceMap[backfillType] || 15);
        totalCost += backfillCost;

        results.push({
          label: `${t(`calculators.foundation.${backfillType}`)} ${t('calculators.foundation.backfill')}`,
          value: Number(backfillVolume.toFixed(2)),
          unit: t('calculators.foundation.cubicYards'),
          cost: backfillCost
        });
      }

      // 4. Gravel Base Calculations
      const gravelBaseVolume = (area * (gravelBaseDepth / 12)) / 27;
      const gravelBaseCost = gravelBaseVolume * activeMaterialPrices.gravel;
      totalCost += gravelBaseCost;

      results.push({
        label: t('calculators.foundation.gravelBase'),
        value: Number(gravelBaseVolume.toFixed(2)),
        unit: t('calculators.foundation.cubicYards'),
        cost: gravelBaseCost
      });

      // 5. Slab Calculations
      const slabVolume = (area * (slabThickness / 12)) / 27;
      const slabConcreteCost = slabVolume * (activeConcretePrices[concreteStrength] || 135);
      totalCost += slabConcreteCost;

      results.push({
        label: `${isBasement ? t('calculators.foundation.basementFloor') : t('calculators.foundation.slab')} ${t('calculators.foundation.concrete')} (${concreteStrength} PSI)`,
        value: Number(slabVolume.toFixed(2)),
        unit: t('calculators.foundation.cubicYards'),
        cost: slabConcreteCost
      });

      // 6. Reinforcement Calculations
      if (includeSteelReinforcement) {
        // Footing rebar (longitudinal bars)
        const footingRebarLength = perimeter * 2;
        const footingRebarPieces = Math.ceil(footingRebarLength / 20);
        const footingRebarCost = footingRebarPieces * activeRebarPrice;
        totalCost += footingRebarCost;

        results.push({
          label: t('calculators.foundation.footingRebar'),
          value: footingRebarPieces,
          unit: t('calculators.foundation.pieces20ft'),
          cost: footingRebarCost
        });

        // Wall rebar
        const verticalBarSpacing = 16;
        const verticalBars = Math.ceil((perimeter * 12) / verticalBarSpacing);
        const verticalBarLength = stemWallHeight + 2;
        const wallVerticalRebarPieces = Math.ceil((verticalBars * verticalBarLength) / 20);
        const wallHorizontalRebarPieces = Math.ceil((perimeter * 2) / 20);
        const wallRebarCost = (wallVerticalRebarPieces + wallHorizontalRebarPieces) * activeRebarPrice;
        totalCost += wallRebarCost;

        results.push({
          label: `${isBasement ? t('calculators.foundation.basementWall') : t('calculators.foundation.stemWall')} ${t('calculators.foundation.rebar')}`,
          value: wallVerticalRebarPieces + wallHorizontalRebarPieces,
          unit: t('calculators.foundation.pieces20ft'),
          cost: wallRebarCost
        });

        // Slab/floor mesh/rebar
        const slabRebarSpacingFt = rebarSpacing / 12;
        const longitudinalBars = Math.ceil(width / slabRebarSpacingFt) + 1;
        const transverseBars = Math.ceil(length / slabRebarSpacingFt) + 1;
        const slabRebarLength = (longitudinalBars * length) + (transverseBars * width);
        const slabRebarPieces = Math.ceil(slabRebarLength / 20);
        const slabRebarCost = slabRebarPieces * activeRebarPrice;
        totalCost += slabRebarCost;

        results.push({
          label: `${isBasement ? t('calculators.foundation.floor') : t('calculators.foundation.slab')} ${t('calculators.foundation.rebar')} (${rebarSpacing}" ${t('calculators.foundation.onCenter')})`,
          value: slabRebarPieces,
          unit: t('calculators.foundation.pieces20ft'),
          cost: slabRebarCost
        });
      }

      // 7. Vapor Barrier
      if (includeVaporBarrier) {
        const vaporBarrierArea = area * 1.1;
        const vaporBarrierRolls = Math.ceil(vaporBarrierArea / 1000);
        const vaporBarrierCost = vaporBarrierRolls * activeMaterialPrices.vaporBarrier;
        totalCost += vaporBarrierCost;

        results.push({
          label: t('calculators.foundation.vaporBarrier'),
          value: vaporBarrierRolls,
          unit: t('calculators.foundation.rolls1000sf'),
          cost: vaporBarrierCost
        });
      }

      // 8. Waterproofing
      if (includeWaterproofing) {
        const waterproofingArea = perimeter * stemWallHeight * 1.1;
        const waterproofingGallons = Math.ceil(waterproofingArea / 100);
        const waterproofingCost = waterproofingGallons * activeMaterialPrices.waterproofing;
        totalCost += waterproofingCost;

        results.push({
          label: t('calculators.foundation.waterproofing'),
          value: waterproofingGallons,
          unit: t('calculators.foundation.gallons'),
          cost: waterproofingCost
        });
      }

      // 9. Drainage System
      if (includeDrainage) {
        const drainPipeLength = Math.ceil(perimeter * 1.1);
        const drainPipeSections = Math.ceil(drainPipeLength / 10);
        const drainPipeCost = drainPipeSections * activeMaterialPrices.drainPipe;
        totalCost += drainPipeCost;

        results.push({
          label: t('calculators.foundation.drainagePipe'),
          value: drainPipeSections,
          unit: t('calculators.foundation.sections10ft'),
          cost: drainPipeCost
        });

        const drainageGravelVolume = (perimeter * 2 * 2) / 27;
        const drainageGravelCost = drainageGravelVolume * activeMaterialPrices.gravel;
        totalCost += drainageGravelCost;

        results.push({
          label: t('calculators.foundation.drainageGravel'),
          value: Number(drainageGravelVolume.toFixed(2)),
          unit: t('calculators.foundation.cubicYards'),
          cost: drainageGravelCost
        });
      }

      // 10. ICF Walls Calculation
      // Formula: (L×2 + W×2) × H × 12 = Estimation total for ICF forms (materials only)
      if (includeICF && typeof icfWallHeight === 'number') {
        const totalSqFtage = perimeter * icfWallHeight;
        const icfEstimation = totalSqFtage * activeMaterialPrices.icfMaterial;
        totalCost += icfEstimation;

        results.push({
          label: 'ICF Walls (Materials Only)',
          value: Number(totalSqFtage.toFixed(2)),
          unit: 'sq ft',
          cost: icfEstimation
        });

        // Note: Concrete yardage must still be calculated separately
        const icfConcreteVolume = (perimeter * icfWallHeight * (6 / 12)) / 27; // Assuming 6" ICF wall
        const icfConcreteCost = icfConcreteVolume * (activeConcretePrices[concreteStrength] || 135);
        totalCost += icfConcreteCost;

        results.push({
          label: `ICF Wall Concrete (${concreteStrength} PSI)`,
          value: Number(icfConcreteVolume.toFixed(2)),
          unit: t('calculators.foundation.cubicYards'),
          cost: icfConcreteCost
        });
      }

      // Add total cost
      results.push({
        label: t('calculators.foundation.totalCost'),
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
    typeof footingWidth === 'number' &&
    typeof footingDepth === 'number' &&
    typeof stemWallHeight === 'number' &&
    typeof stemWallThickness === 'number' &&
    typeof slabThickness === 'number' &&
    typeof gravelBaseDepth === 'number';

  // Show loading state if custom calculator data is loading
  if (activeTab === 'custom' && loadingCustom) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Foundation className="h-6 w-6 text-orange-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.foundation.title')}</h2>
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
          <Foundation className="h-6 w-6 text-orange-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.foundation.title')}</h2>
        </div>
        <div className="text-center py-12">
          <Foundation className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
        <Foundation className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.foundation.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="foundation"
        currentInputs={getCurrentInputs()}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="flex justify-between mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                foundationType === 'strip-footing'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300 rounded-l-lg`}
              onClick={() => setFoundationType('strip-footing')}
            >
              {t('calculators.foundation.stripFooting')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                foundationType === 'spread-footings'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border-t border-b border-slate-300`}
              onClick={() => setFoundationType('spread-footings')}
            >
              {t('calculators.foundation.spreadFootings')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                foundationType === 'thickened-edge'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border-t border-b border-slate-300`}
              onClick={() => setFoundationType('thickened-edge')}
            >
              {t('calculators.foundation.thickenedEdge')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                foundationType === 'frost-wall'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300 rounded-r-lg`}
              onClick={() => setFoundationType('frost-wall')}
            >
              {t('calculators.foundation.frostWall')}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isBasement"
              checked={isBasement}
              onChange={(e) => setIsBasement(e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="isBasement" className="ml-2 block text-sm font-medium text-slate-700">
              {t('calculators.foundation.isBasement')}
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.foundation.length')}
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.foundation.enterLength')}
            />
          </div>
          
          <div>
            <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.foundation.width')}
            </label>
            <input
              type="number"
              id="width"
              min="0"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.foundation.enterWidth')}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.foundation.footingDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="footingWidth" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.foundation.footingWidth')}
              </label>
              <input
                type="number"
                id="footingWidth"
                min="0"
                step="1"
                value={footingWidth}
                onChange={(e) => setFootingWidth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.foundation.enterFootingWidth')}
              />
            </div>

            <div>
              <label htmlFor="footingDepth" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.foundation.footingDepth')}
              </label>
              <input
                type="number"
                id="footingDepth"
                min="0"
                step="1"
                value={footingDepth}
                onChange={(e) => setFootingDepth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.foundation.enterFootingDepth')}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">
            {isBasement ? t('calculators.foundation.basementWallDetails') : t('calculators.foundation.stemWallDetails')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="stemWallHeight" className="block text-sm font-medium text-slate-700 mb-1">
                {isBasement ? t('calculators.foundation.wallHeight') : t('calculators.foundation.stemWallHeight')}
              </label>
              <input
                type="number"
                id="stemWallHeight"
                min="0"
                step="0.1"
                value={stemWallHeight}
                onChange={(e) => setStemWallHeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={isBasement ? t('calculators.foundation.enterWallHeight') : t('calculators.foundation.enterStemWallHeight')}
              />
            </div>

            <div>
              <label htmlFor="stemWallThickness" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.foundation.wallThickness')}
              </label>
              <input
                type="number"
                id="stemWallThickness"
                min="0"
                step="1"
                value={stemWallThickness}
                onChange={(e) => setStemWallThickness(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.foundation.enterWallThickness')}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">
            {isBasement ? t('calculators.foundation.basementFloorDetails') : t('calculators.foundation.slabDetails')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="slabThickness" className="block text-sm font-medium text-slate-700 mb-1">
                {isBasement ? t('calculators.foundation.floorThickness') : t('calculators.foundation.slabThickness')}
              </label>
              <input
                type="number"
                id="slabThickness"
                min="0"
                step="0.5"
                value={slabThickness}
                onChange={(e) => setSlabThickness(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={isBasement ? t('calculators.foundation.enterFloorThickness') : t('calculators.foundation.enterSlabThickness')}
              />
            </div>

            <div>
              <label htmlFor="gravelBaseDepth" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.foundation.gravelBaseDepth')}
              </label>
              <input
                type="number"
                id="gravelBaseDepth"
                min="0"
                step="1"
                value={gravelBaseDepth}
                onChange={(e) => setGravelBaseDepth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.foundation.enterGravelBaseDepth')}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.foundation.siteConditions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="soilType" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.foundation.soilType')}
              </label>
              <select
                id="soilType"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as SoilType)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="sandy">{t('calculators.foundation.sandySoil')}</option>
                <option value="clay">{t('calculators.foundation.claySoil')}</option>
                <option value="rock">{t('calculators.foundation.rockySoil')}</option>
              </select>
            </div>

            {!isBasement && (
              <div>
                <label htmlFor="backfillType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.foundation.backfillMaterial')}
                </label>
                <select
                  id="backfillType"
                  value={backfillType}
                  onChange={(e) => setBackfillType(e.target.value as BackfillType)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="native">{t('calculators.foundation.native')}</option>
                  <option value="gravel">{t('calculators.foundation.gravel')}</option>
                  <option value="sand">{t('calculators.foundation.sand')}</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="frostDepth" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.foundation.frostDepth')}
              </label>
              <input
                type="number"
                id="frostDepth"
                min="0"
                step="1"
                value={frostDepth}
                onChange={(e) => setFrostDepth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.foundation.enterFrostDepth')}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.foundation.concreteReinforcement')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="concreteStrength" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.foundation.concreteStrength')}
              </label>
              <select
                id="concreteStrength"
                value={concreteStrength}
                onChange={(e) => setConcreteStrength(Number(e.target.value) as 3000 | 3500 | 4000 | 4500)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={3000}>3000 PSI</option>
                <option value={3500}>3500 PSI</option>
                <option value={4000}>4000 PSI</option>
                <option value={4500}>4500 PSI</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeSteelReinforcement"
                checked={includeSteelReinforcement}
                onChange={(e) => setIncludeSteelReinforcement(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeSteelReinforcement" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.foundation.includeSteelReinforcement')}
              </label>
            </div>
          </div>

          {includeSteelReinforcement && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="rebarSize" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.foundation.rebarSize')}
                </label>
                <select
                  id="rebarSize"
                  value={rebarSize}
                  onChange={(e) => setRebarSize(e.target.value as '#3' | '#4' | '#5')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="#3">{t('calculators.foundation.rebarSize3')}</option>
                  <option value="#4">{t('calculators.foundation.rebarSize4')}</option>
                  <option value="#5">{t('calculators.foundation.rebarSize5')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="rebarSpacing" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.foundation.rebarSpacing')}
                </label>
                <select
                  id="rebarSpacing"
                  value={rebarSpacing}
                  onChange={(e) => setRebarSpacing(Number(e.target.value) as 12 | 16 | 18)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={12}>{t('calculators.foundation.rebarSpacing12')}</option>
                  <option value={16}>{t('calculators.foundation.rebarSpacing16')}</option>
                  <option value={18}>{t('calculators.foundation.rebarSpacing18')}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.foundation.additionalOptions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeVaporBarrier"
                checked={includeVaporBarrier}
                onChange={(e) => setIncludeVaporBarrier(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeVaporBarrier" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.foundation.includeVaporBarrier')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeWaterproofing"
                checked={includeWaterproofing}
                onChange={(e) => setIncludeWaterproofing(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeWaterproofing" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.foundation.includeWaterproofing')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeDrainage"
                checked={includeDrainage}
                onChange={(e) => setIncludeDrainage(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeDrainage" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.foundation.includeDrainage')}
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">ICF Walls</h3>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeICF"
              checked={includeICF}
              onChange={(e) => setIncludeICF(e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeICF" className="ml-2 block text-sm font-medium text-slate-700">
              Include ICF Walls (Insulated Concrete Forms)
            </label>
          </div>

          {includeICF && (
            <div>
              <label htmlFor="icfWallHeight" className="block text-sm font-medium text-slate-700 mb-1">
                ICF Wall Height (ft)
              </label>
              <input
                type="number"
                id="icfWallHeight"
                min="0"
                step="0.1"
                value={icfWallHeight}
                onChange={(e) => setIcfWallHeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter ICF wall height in feet"
              />
              <p className="mt-2 text-xs text-slate-500">
                Formula: (Length × 2 + Width × 2) × Height = Total SqFt<br/>
                Estimation = Total SqFt × $12/sqft (materials only, concrete calculated separately)
              </p>
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
        {t('calculators.foundation.calculateMaterials')}
      </button>
    </div>
  );
};

export default FoundationCalculator;