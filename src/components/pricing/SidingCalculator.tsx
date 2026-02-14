import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
import { useCustomMaterials } from '../../hooks/useCustomMaterials';

interface Opening {
  width: number;
  height: number;
  type: 'door' | 'window' | 'garage' | 'custom';
}

interface Wall {
  id: string;
  length: number;
  height: number;
  gableHeight?: number;
  isGable: boolean;
  openings: Opening[];
}

type SidingType = 'vinyl' | 'fiber-cement' | 'wood' | 'metal' | 'engineered-wood';
type SidingProfile = 'lap' | 'dutch-lap' | 'vertical' | 'shake';
type TrimType = 'vinyl' | 'wood' | 'aluminum' | 'fiber-cement';

const SidingCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const { activeTab } = useCalculatorTab();
  const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } = useCustomCalculator('siding', activeTab === 'custom');
  const { getCustomPrice, getCustomUnitValue } = useCustomMaterials('siding');
  const [walls, setWalls] = useState<Wall[]>([]);
  const [sidingType, setSidingType] = useState<SidingType>('vinyl');
  const [sidingProfile, setSidingProfile] = useState<SidingProfile>('lap');
  const [sidingExposure, setSidingExposure] = useState<4 | 5 | 6 | 7 | 8>(4);
  const [includeTrim, setIncludeTrim] = useState(true);
  const [trimType, setTrimType] = useState<TrimType>('vinyl');
  const [includeInsulation, setIncludeInsulation] = useState(false);
  const [includeHouseWrap, setIncludeHouseWrap] = useState(true);
  const [includeStarter, setIncludeStarter] = useState(true);
  const [includeJChannel, setIncludeJChannel] = useState(true);
  const [includeCorners, setIncludeCorners] = useState(true);
  const [wasteFactor, setWasteFactor] = useState<10 | 15 | 20>(15);

  // Default siding prices with dynamic pricing support
  const defaultSidingPrices = {
    'vinyl': {
      'lap': getCustomPrice('Vinyl Siding - Traditional Lap', 179.98, 'siding'),
      'dutch-lap': getCustomPrice('Vinyl Siding - Dutch Lap', 199.98, 'siding'),
      'vertical': getCustomPrice('Vinyl Siding - Vertical Board & Batten', 219.98, 'siding'),
      'shake': getCustomPrice('Vinyl Siding - Shake/Shingle', 259.98, 'siding')
    },
    'fiber-cement': {
      'lap': getCustomPrice('Fiber Cement - Traditional Lap', 319.98, 'siding'),
      'dutch-lap': getCustomPrice('Fiber Cement - Dutch Lap', 339.98, 'siding'),
      'vertical': getCustomPrice('Fiber Cement - Vertical Board & Batten', 359.98, 'siding'),
      'shake': getCustomPrice('Fiber Cement - Shake/Shingle', 399.98, 'siding')
    },
    'wood': {
      'lap': getCustomPrice('Wood Siding - Traditional Lap', 399.98, 'siding'),
      'dutch-lap': getCustomPrice('Wood Siding - Dutch Lap', 419.98, 'siding'),
      'vertical': getCustomPrice('Wood Siding - Vertical Board & Batten', 439.98, 'siding'),
      'shake': getCustomPrice('Wood Siding - Shake/Shingle', 479.98, 'siding')
    },
    'metal': {
      'lap': getCustomPrice('Metal Siding - Traditional Lap', 299.98, 'siding'),
      'dutch-lap': getCustomPrice('Metal Siding - Dutch Lap', 319.98, 'siding'),
      'vertical': getCustomPrice('Metal Siding - Vertical Board & Batten', 279.98, 'siding'),
      'shake': getCustomPrice('Metal Siding - Shake/Shingle', 379.98, 'siding')
    },
    'engineered-wood': {
      'lap': getCustomPrice('Engineered Wood - Traditional Lap', 359.98, 'siding'),
      'dutch-lap': getCustomPrice('Engineered Wood - Dutch Lap', 379.98, 'siding'),
      'vertical': getCustomPrice('Engineered Wood - Vertical Board & Batten', 399.98, 'siding'),
      'shake': getCustomPrice('Engineered Wood - Shake/Shingle', 439.98, 'siding')
    }
  };

  // Default trim prices with dynamic pricing support
  const defaultTrimPrices = {
    'vinyl': getCustomPrice('Vinyl Trim', 17.98, 'trim'),
    'wood': getCustomPrice('Wood Trim', 25.98, 'trim'),
    'aluminum': getCustomPrice('Aluminum Trim', 31.98, 'trim'),
    'fiber-cement': getCustomPrice('Fiber Cement Trim', 39.98, 'trim')
  };

  // Determine active siding prices based on tab
  const activeSidingPrices = useMemo(() => {
    if (activeTab === 'custom' && isConfigured && customPricing) {
      const customSidingPrices: any = {};
      Object.keys(defaultSidingPrices).forEach(type => {
        customSidingPrices[type] = {};
        Object.keys(defaultSidingPrices[type as SidingType]).forEach(profile => {
          const key = `siding_${type}_${profile}`;
          customSidingPrices[type][profile] = customPricing[key] || defaultSidingPrices[type as SidingType][profile as SidingProfile];
        });
      });
      return customSidingPrices;
    }
    return defaultSidingPrices;
  }, [activeTab, isConfigured, customPricing]);

  // Determine active trim prices based on tab
  const activeTrimPrices = useMemo(() => {
    if (activeTab === 'custom' && isConfigured && customPricing) {
      return {
        'vinyl': customPricing.trim_vinyl || defaultTrimPrices.vinyl,
        'wood': customPricing.trim_wood || defaultTrimPrices.wood,
        'aluminum': customPricing.trim_aluminum || defaultTrimPrices.aluminum,
        'fiber-cement': customPricing.trim_fiber_cement || defaultTrimPrices['fiber-cement']
      };
    }
    return defaultTrimPrices;
  }, [activeTab, isConfigured, customPricing]);

  // Auto-select first material when switching tabs
  useEffect(() => {
    if (activeTab === 'custom' && isConfigured) {
      // Keep current selection or use default
      const typeExists = Object.keys(activeSidingPrices).includes(sidingType);
      if (!typeExists) {
        setSidingType('vinyl');
      }
    }
  }, [activeTab, isConfigured, activeSidingPrices]);

  const addWall = () => {
    const newWall: Wall = {
      id: Date.now().toString(),
      length: 0,
      height: 0,
      isGable: false,
      openings: []
    };
    setWalls([...walls, newWall]);
  };

  const updateWall = (id: string, updates: Partial<Wall>) => {
    setWalls(walls.map(wall =>
      wall.id === id ? { ...wall, ...updates } : wall
    ));
  };

  const removeWall = (id: string) => {
    setWalls(walls.filter(wall => wall.id !== id));
  };

  const addOpening = (wallId: string, type: Opening['type']) => {
    const wall = walls.find(w => w.id === wallId);
    if (wall) {
      const newOpening: Opening = {
        width: type === 'garage' ? 16 : type === 'door' ? 3 : 3,
        height: type === 'garage' ? 7 : type === 'door' ? 6.67 : 4,
        type
      };
      updateWall(wallId, {
        openings: [...wall.openings, newOpening]
      });
    }
  };

  const updateOpening = (wallId: string, index: number, updates: Partial<Opening>) => {
    const wall = walls.find(w => w.id === wallId);
    if (wall) {
      const newOpenings = [...wall.openings];
      newOpenings[index] = { ...newOpenings[index], ...updates };
      updateWall(wallId, { openings: newOpenings });
    }
  };

  const removeOpening = (wallId: string, index: number) => {
    const wall = walls.find(w => w.id === wallId);
    if (wall) {
      updateWall(wallId, {
        openings: wall.openings.filter((_, i) => i !== index)
      });
    }
  };

  const getCurrentInputs = () => ({
    walls,
    sidingType,
    sidingProfile,
    sidingExposure,
    includeTrim,
    trimType,
    includeInsulation,
    includeHouseWrap,
    includeStarter,
    includeJChannel,
    includeCorners,
    wasteFactor
  });

  const handleLoadEstimate = (inputs: any) => {
    if (inputs.walls) setWalls(inputs.walls);
    if (inputs.sidingType) setSidingType(inputs.sidingType);
    if (inputs.sidingProfile) setSidingProfile(inputs.sidingProfile);
    if (inputs.sidingExposure) setSidingExposure(inputs.sidingExposure);
    if (inputs.includeTrim !== undefined) setIncludeTrim(inputs.includeTrim);
    if (inputs.trimType) setTrimType(inputs.trimType);
    if (inputs.includeInsulation !== undefined) setIncludeInsulation(inputs.includeInsulation);
    if (inputs.includeHouseWrap !== undefined) setIncludeHouseWrap(inputs.includeHouseWrap);
    if (inputs.includeStarter !== undefined) setIncludeStarter(inputs.includeStarter);
    if (inputs.includeJChannel !== undefined) setIncludeJChannel(inputs.includeJChannel);
    if (inputs.includeCorners !== undefined) setIncludeCorners(inputs.includeCorners);
    if (inputs.wasteFactor) setWasteFactor(inputs.wasteFactor);
  };

  const handleNewEstimate = () => {
    setWalls([]);
    setSidingType('vinyl');
    setSidingProfile('lap');
    setSidingExposure(4);
    setIncludeTrim(true);
    setTrimType('vinyl');
    setIncludeInsulation(false);
    setIncludeHouseWrap(true);
    setIncludeStarter(true);
    setIncludeJChannel(true);
    setIncludeCorners(true);
    setWasteFactor(15);
  };

  const getSidingPrice = () => {
    return activeSidingPrices[sidingType]?.[sidingProfile] || 0;
  };

  const handleCalculate = () => {
    const results: CalculationResult[] = [];
    let totalCost = 0;

    // Calculate total wall area and subtract openings
    let totalWallArea = 0;
    let totalPerimeter = 0;
    let totalOpeningsPerimeter = 0;

    walls.forEach(wall => {
      let wallArea: number;

      if (wall.isGable && typeof wall.gableHeight === 'number') {
        // Triangle area for gable
        wallArea = (wall.length * wall.height) + (wall.length * wall.gableHeight / 2);
      } else {
        wallArea = wall.length * wall.height;
      }

      // Subtract openings
      const openingsArea = wall.openings.reduce((sum, opening) => {
        totalOpeningsPerimeter += 2 * (opening.width + opening.height);
        return sum + (opening.width * opening.height);
      }, 0);

      totalWallArea += wallArea - openingsArea;
      totalPerimeter += 2 * (wall.length + wall.height);
    });

    // Add waste factor
    const areaWithWaste = totalWallArea * (1 + wasteFactor / 100);

    // Calculate siding needed
    const squaresNeeded = Math.ceil(areaWithWaste / 100); // 100 sq ft per square
    const sidingPrice = getSidingPrice();
    const sidingCost = squaresNeeded * sidingPrice;
    totalCost += sidingCost;

    results.push(
      {
        label: t('calculators.siding.totalWallArea'),
        value: Number(totalWallArea.toFixed(2)),
        unit: t('calculators.siding.squareFeet')
      },
      {
        label: `${sidingType.replace('-', ' ').replace(/(^\w|\s\w)/g, l => l.toUpperCase())} ${t('calculators.siding.siding')} (${sidingProfile.replace('-', ' ')})`,
        value: squaresNeeded,
        unit: t('calculators.siding.squares'),
        cost: sidingCost
      }
    );

    // Calculate house wrap if included
    if (includeHouseWrap) {
      const wrapCoverage = getCustomUnitValue('House Wrap', 1000, 'accessories');
      const wrapRolls = Math.ceil(totalWallArea / wrapCoverage);
      const wrapPrice = getCustomPrice('House Wrap', 159.98, 'accessories');
      const wrapCost = wrapRolls * wrapPrice;
      totalCost += wrapCost;

      results.push({
        label: t('calculators.siding.houseWrap'),
        value: wrapRolls,
        unit: t('calculators.siding.rolls1000sf'),
        cost: wrapCost
      });

      // House wrap tape
      const tapeCoverage = getCustomUnitValue('House Wrap Tape', 165, 'accessories');
      const tapeRolls = Math.ceil(totalPerimeter / tapeCoverage);
      const tapePrice = getCustomPrice('House Wrap Tape', 12.98, 'accessories');
      const tapeCost = tapeRolls * tapePrice;
      totalCost += tapeCost;

      results.push({
        label: t('calculators.siding.houseWrapTape'),
        value: tapeRolls,
        unit: t('calculators.siding.rolls'),
        cost: tapeCost
      });
    }

    // Calculate insulation if included
    if (includeInsulation) {
      const insulationCoverage = getCustomUnitValue('Foam Insulation', 100, 'accessories');
      const insulationBundles = Math.ceil(totalWallArea / insulationCoverage);
      const insulationPrice = getCustomPrice('Foam Insulation', 49.98, 'accessories');
      const insulationCost = insulationBundles * insulationPrice;
      totalCost += insulationCost;

      results.push({
        label: t('calculators.siding.foamInsulation'),
        value: insulationBundles,
        unit: t('calculators.siding.bundles'),
        cost: insulationCost
      });
    }

    // Calculate starter strip if included
    if (includeStarter) {
      const starterLength = getCustomUnitValue('Starter Strip', 12, 'accessories');
      const starterPieces = Math.ceil(totalPerimeter / starterLength);
      const starterPrice = getCustomPrice('Starter Strip', 13.98, 'accessories');
      const starterCost = starterPieces * starterPrice;
      totalCost += starterCost;

      results.push({
        label: t('calculators.siding.starterStrip'),
        value: starterPieces,
        unit: t('calculators.siding.pieces12ft'),
        cost: starterCost
      });
    }

    // Calculate J-channel if included
    if (includeJChannel) {
      const jChannelLength = getCustomUnitValue('J-Channel', 12.5, 'accessories');
      const jChannelPieces = Math.ceil((totalOpeningsPerimeter + totalPerimeter) / jChannelLength);
      const jChannelPrice = getCustomPrice('J-Channel', 17.98, 'accessories');
      const jChannelCost = jChannelPieces * jChannelPrice;
      totalCost += jChannelCost;

      results.push({
        label: t('calculators.siding.jChannel'),
        value: jChannelPieces,
        unit: t('calculators.siding.pieces12_5ft'),
        cost: jChannelCost
      });
    }

    // Calculate corner posts if included
    if (includeCorners) {
      const cornerHeight = Math.max(...walls.map(w => w.height));
      const cornerPostLength = getCustomUnitValue('Corner Posts', 10, 'accessories');
      const cornerPosts = Math.ceil((cornerHeight * 4) / cornerPostLength);
      const cornerPrice = getCustomPrice('Corner Posts', 39.98, 'accessories');
      const cornerCost = cornerPosts * cornerPrice;
      totalCost += cornerCost;

      results.push({
        label: t('calculators.siding.cornerPosts'),
        value: cornerPosts,
        unit: t('calculators.siding.pieces10ft'),
        cost: cornerCost
      });
    }

    // Calculate trim if included
    if (includeTrim) {
      // Calculate trim for openings, or use a percentage of wall perimeter if no openings
      const trimPerimeter = totalOpeningsPerimeter > 0
        ? totalOpeningsPerimeter
        : totalPerimeter * 0.3; // 30% of perimeter for misc trim if no openings defined

      const trimPieces = Math.ceil(trimPerimeter / 16); // 16ft pieces
      const trimCost = trimPieces * (activeTrimPrices[trimType] || 0);
      totalCost += trimCost;

      results.push({
        label: `${trimType.replace('-', ' ').replace(/(^\w|\s\w)/g, l => l.toUpperCase())} ${t('calculators.siding.trim')}`,
        value: trimPieces,
        unit: t('calculators.siding.pieces16ft'),
        cost: trimCost
      });
    }

    // Calculate fasteners
    const fastenersPerSquare = 250;
    const fastenerBoxCount = getCustomUnitValue('Siding Fasteners', 1000, 'accessories');
    const fastenerBoxes = Math.ceil((squaresNeeded * fastenersPerSquare) / fastenerBoxCount);
    const fastenerPrice = getCustomPrice('Siding Fasteners', 29.98, 'accessories');
    const fastenerCost = fastenerBoxes * fastenerPrice;
    totalCost += fastenerCost;

    results.push({
      label: t('calculators.siding.sidingFasteners'),
      value: fastenerBoxes,
      unit: t('calculators.siding.boxes1000ct'),
      cost: fastenerCost
    });

    // Add total cost
    results.push({
      label: t('calculators.siding.totalEstimatedCost'),
      value: Number(totalCost.toFixed(2)),
      unit: 'USD',
      isTotal: true
    });

    onCalculate(results);
  };

  // Show loading state if custom calculator data is loading
  if (activeTab === 'custom' && loadingCustom) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Square className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.siding.title')}</h2>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
          <Square className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.siding.title')}</h2>
        </div>
        <div className="text-center py-12">
          <Square className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Required</h3>
          <p className="text-gray-600 mb-4">
            This calculator hasn't been configured yet. Click the gear icon to set up your custom materials and pricing.
          </p>
        </div>
      </div>
    );
  }

  const isFormValid = walls.length > 0 && walls.every(wall =>
    typeof wall.length === 'number' && wall.length > 0 &&
    typeof wall.height === 'number' && wall.height > 0 &&
    (!wall.isGable || typeof wall.gableHeight === 'number')
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Square className="h-6 w-6 text-blue-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.siding.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="siding"
        currentInputs={getCurrentInputs()}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="sidingType" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.siding.sidingMaterial')}
            </label>
            <select
              id="sidingType"
              value={sidingType}
              onChange={(e) => setSidingType(e.target.value as SidingType)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="vinyl">{t('calculators.siding.vinylSiding')}</option>
              <option value="fiber-cement">{t('calculators.siding.fiberCementSiding')}</option>
              <option value="wood">{t('calculators.siding.woodSiding')}</option>
              <option value="metal">{t('calculators.siding.metalSiding')}</option>
              <option value="engineered-wood">{t('calculators.siding.engineeredWoodSiding')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="sidingProfile" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.siding.sidingProfile')}
            </label>
            <select
              id="sidingProfile"
              value={sidingProfile}
              onChange={(e) => setSidingProfile(e.target.value as SidingProfile)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="lap">{t('calculators.siding.traditionalLap')}</option>
              <option value="dutch-lap">{t('calculators.siding.dutchLap')}</option>
              <option value="vertical">{t('calculators.siding.verticalBoardBatten')}</option>
              <option value="shake">{t('calculators.siding.shakeShingle')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="sidingExposure" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.siding.exposureInches')}
            </label>
            <select
              id="sidingExposure"
              value={sidingExposure}
              onChange={(e) => setSidingExposure(Number(e.target.value) as 4 | 5 | 6 | 7 | 8)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={4}>{t('calculators.siding.exposure4')}</option>
              <option value={5}>{t('calculators.siding.exposure5')}</option>
              <option value={6}>{t('calculators.siding.exposure6')}</option>
              <option value={7}>{t('calculators.siding.exposure7')}</option>
              <option value={8}>{t('calculators.siding.exposure8')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="wasteFactor" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.siding.wasteFactor')}
            </label>
            <select
              id="wasteFactor"
              value={wasteFactor}
              onChange={(e) => setWasteFactor(Number(e.target.value) as 10 | 15 | 20)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>{t('calculators.siding.wasteFactor10')}</option>
              <option value={15}>{t('calculators.siding.wasteFactor15')}</option>
              <option value={20}>{t('calculators.siding.wasteFactor20')}</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">{t('calculators.siding.walls')}</h3>
            <button
              onClick={addWall}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {t('calculators.siding.addWall')}
            </button>
          </div>

          {walls.map(wall => (
            <div key={wall.id} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.siding.wallLength')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={wall.length || ''}
                    onChange={(e) => updateWall(wall.id, { length: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.siding.enterWallLength')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.siding.wallHeight')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={wall.height || ''}
                    onChange={(e) => updateWall(wall.id, { height: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.siding.enterWallHeight')}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={wall.isGable}
                    onChange={(e) => updateWall(wall.id, { isGable: e.target.checked })}
                    className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-slate-700">
                    {t('calculators.siding.isGableWall')}
                  </label>
                </div>

                {wall.isGable && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.siding.gableHeight')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={wall.gableHeight || ''}
                      onChange={(e) => updateWall(wall.id, { gableHeight: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder={t('calculators.siding.enterGableHeight')}
                    />
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-slate-700">{t('calculators.siding.openings')}</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => addOpening(wall.id, 'door')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
                    >
                      {t('calculators.siding.addDoor')}
                    </button>
                    <button
                      onClick={() => addOpening(wall.id, 'window')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
                    >
                      {t('calculators.siding.addWindow')}
                    </button>
                    <button
                      onClick={() => addOpening(wall.id, 'garage')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
                    >
                      {t('calculators.siding.addGarage')}
                    </button>
                    <button
                      onClick={() => addOpening(wall.id, 'custom')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
                    >
                      {t('calculators.siding.addCustom')}
                    </button>
                  </div>
                </div>

                {wall.openings.map((opening, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 p-2 bg-white rounded">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('calculators.siding.widthFeet')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={opening.width}
                        onChange={(e) => updateOpening(wall.id, index, { width: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('calculators.siding.heightFeet')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={opening.height}
                        onChange={(e) => updateOpening(wall.id, index, { height: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{opening.type}</span>
                      <button
                        onClick={() => removeOpening(wall.id, index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        {t('calculators.siding.remove')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => removeWall(wall.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                {t('calculators.siding.removeWall')}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.siding.additionalOptions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeHouseWrap"
                checked={includeHouseWrap}
                onChange={(e) => setIncludeHouseWrap(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeHouseWrap" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.siding.includeHouseWrap')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeInsulation"
                checked={includeInsulation}
                onChange={(e) => setIncludeInsulation(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeInsulation" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.siding.includeFoamInsulation')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeStarter"
                checked={includeStarter}
                onChange={(e) => setIncludeStarter(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeStarter" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.siding.includeStarterStrip')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeJChannel"
                checked={includeJChannel}
                onChange={(e) => setIncludeJChannel(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeJChannel" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.siding.includeJChannel')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeCorners"
                checked={includeCorners}
                onChange={(e) => setIncludeCorners(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeCorners" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.siding.includeCornerPosts')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeTrim"
                checked={includeTrim}
                onChange={(e) => setIncludeTrim(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeTrim" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.siding.includeTrim')}
              </label>
            </div>

            {includeTrim && (
              <div>
                <label htmlFor="trimType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.siding.trimMaterial')}
                </label>
                <select
                  id="trimType"
                  value={trimType}
                  onChange={(e) => setTrimType(e.target.value as TrimType)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="vinyl">{t('calculators.siding.vinylTrim')}</option>
                  <option value="wood">{t('calculators.siding.woodTrim')}</option>
                  <option value="aluminum">{t('calculators.siding.aluminumTrim')}</option>
                  <option value="fiber-cement">{t('calculators.siding.fiberCementTrim')}</option>
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
            ? 'bg-blue-500 hover:bg-blue-600 transition-colors'
            : 'bg-slate-300 cursor-not-allowed'
        }`}
      >
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default SidingCalculator;
