import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Grid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
import { useCustomMaterials } from '../../hooks/useCustomMaterials';

interface Opening {
  width: number;
  height: number;
  type: 'door' | 'window' | 'cabinet' | 'custom';
}

type TileSize = {
  width: number;
  length: number;
  piecesPerBox: number;
  pricePerBox: number;
};

type TilePattern = 'straight' | 'diagonal' | 'herringbone' | 'brick' | 'basketweave';
type GroutWidth = 0.125 | 0.25 | 0.375;

const TileCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const { activeTab } = useCalculatorTab();
  const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } = useCustomCalculator('tile', activeTab === 'custom');
  const { getCustomPrice, getCustomUnitValue } = useCustomMaterials('tile');
  const [surfaceType, setSurfaceType] = useState<'floor' | 'wall'>('floor');
  const [inputType, setInputType] = useState<'dimensions' | 'area'>('dimensions');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [area, setArea] = useState<number | ''>('');
  const [tileSize, setTileSize] = useState<TileSize>({
    width: 12,
    length: 12,
    piecesPerBox: 12,
    pricePerBox: 45.98
  });
  const [customTileWidth, setCustomTileWidth] = useState<number | ''>('');
  const [customTileLength, setCustomTileLength] = useState<number | ''>('');
  const [customTilePiecesPerBox, setCustomTilePiecesPerBox] = useState<number | ''>('');
  const [customTilePricePerBox, setCustomTilePricePerBox] = useState<number | ''>('');
  const [pattern, setPattern] = useState<TilePattern>('straight');
  const [groutWidth, setGroutWidth] = useState<GroutWidth>(0.25);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [wasteFactor, setWasteFactor] = useState<10 | 15 | 20>(15);
  const [includeBackerBoard, setIncludeBackerBoard] = useState(true);
  const [backerBoardThickness, setBackerBoardThickness] = useState<'1/4' | '1/2'>('1/4');
  const [mortarType, setMortarType] = useState<'modified' | 'unmodified' | 'epoxy'>('modified');
  const [groutType, setGroutType] = useState<'sanded' | 'unsanded' | 'epoxy'>('sanded');
  const [includeMembrane, setIncludeMembrane] = useState(false);
  const [includeEdging, setIncludeEdging] = useState(true);
  const [edgingType, setEdgingType] = useState<'metal' | 'stone'>('metal');

  const addOpening = (type: Opening['type']) => {
    setOpenings([...openings, {
      width: type === 'door' ? 3 : type === 'window' ? 3 : type === 'cabinet' ? 3 : 3,
      height: type === 'door' ? 7 : type === 'window' ? 4 : type === 'cabinet' ? 2 : 3,
      type
    }]);
  };

  const updateOpening = (index: number, field: keyof Opening, value: any) => {
    const newOpenings = [...openings];
    newOpenings[index] = { ...newOpenings[index], [field]: value };
    setOpenings(newOpenings);
  };

  const removeOpening = (index: number) => {
    setOpenings(openings.filter((_, i) => i !== index));
  };

  // Determine which data source to use based on active tab
  const activeMortarPrices = useMemo(() => {
    return {
      modified: getCustomPrice('Modified Thinset Mortar', 24.98, 'mortar'),
      unmodified: getCustomPrice('Unmodified Thinset Mortar', 19.98, 'mortar'),
      epoxy: getCustomPrice('Epoxy Mortar', 89.98, 'mortar')
    };
  }, [getCustomPrice]);

  const activeGroutPrices = useMemo(() => {
    return {
      sanded: getCustomPrice('Sanded Grout', 19.98, 'grout'),
      unsanded: getCustomPrice('Unsanded Grout', 22.98, 'grout'),
      epoxy: getCustomPrice('Epoxy Grout', 79.98, 'grout')
    };
  }, [getCustomPrice]);

  // Auto-select when switching tabs
  useEffect(() => {
    if (activeTab === 'custom') {
      const mortarTypes = Object.keys(activeMortarPrices);
      if (mortarTypes.length > 0 && !mortarTypes.includes(mortarType)) {
        setMortarType(mortarTypes[0] as any);
      }
      const groutTypes = Object.keys(activeGroutPrices);
      if (groutTypes.length > 0 && !groutTypes.includes(groutType)) {
        setGroutType(groutTypes[0] as any);
      }
    } else if (activeTab === 'default') {
      if (!['modified', 'unmodified', 'epoxy'].includes(mortarType)) {
        setMortarType('modified');
      }
      if (!['sanded', 'unsanded', 'epoxy'].includes(groutType)) {
        setGroutType('sanded');
      }
    }
  }, [activeTab, activeMortarPrices, activeGroutPrices]);

  const getCurrentInputs = () => ({
    surfaceType,
    inputType,
    length,
    width,
    height,
    area,
    tileSize,
    pattern,
    groutWidth,
    openings,
    wasteFactor,
    includeBackerBoard,
    backerBoardThickness,
    mortarType,
    groutType,
    includeMembrane,
    includeEdging,
    edgingType
  });

  const handleLoadEstimate = (inputs: any) => {
    if (inputs.surfaceType) setSurfaceType(inputs.surfaceType);
    if (inputs.inputType) setInputType(inputs.inputType);
    if (inputs.length !== undefined) setLength(inputs.length);
    if (inputs.width !== undefined) setWidth(inputs.width);
    if (inputs.height !== undefined) setHeight(inputs.height);
    if (inputs.area !== undefined) setArea(inputs.area);
    if (inputs.tileSize) setTileSize(inputs.tileSize);
    if (inputs.pattern) setPattern(inputs.pattern);
    if (inputs.groutWidth !== undefined) setGroutWidth(inputs.groutWidth);
    if (inputs.openings) setOpenings(inputs.openings);
    if (inputs.wasteFactor !== undefined) setWasteFactor(inputs.wasteFactor);
    if (inputs.includeBackerBoard !== undefined) setIncludeBackerBoard(inputs.includeBackerBoard);
    if (inputs.backerBoardThickness) setBackerBoardThickness(inputs.backerBoardThickness);
    if (inputs.mortarType) setMortarType(inputs.mortarType);
    if (inputs.groutType) setGroutType(inputs.groutType);
    if (inputs.includeMembrane !== undefined) setIncludeMembrane(inputs.includeMembrane);
    if (inputs.includeEdging !== undefined) setIncludeEdging(inputs.includeEdging);
    if (inputs.edgingType) setEdgingType(inputs.edgingType);
  };

  const handleNewEstimate = () => {
    setSurfaceType('floor');
    setInputType('dimensions');
    setLength('');
    setWidth('');
    setHeight('');
    setArea('');
    setTileSize({
      width: 12,
      length: 12,
      piecesPerBox: 12,
      pricePerBox: 45.98
    });
    setCustomTileWidth('');
    setCustomTileLength('');
    setCustomTilePiecesPerBox('');
    setCustomTilePricePerBox('');
    setPattern('straight');
    setGroutWidth(0.25);
    setOpenings([]);
    setWasteFactor(15);
    setIncludeBackerBoard(true);
    setBackerBoardThickness('1/4');
    setMortarType('modified');
    setGroutType('sanded');
    setIncludeMembrane(false);
    setIncludeEdging(true);
    setEdgingType('metal');
  };

  const handleCalculate = () => {
    let totalArea: number;

    if (inputType === 'dimensions') {
      if (surfaceType === 'wall' && typeof length === 'number' && typeof height === 'number') {
        totalArea = length * height; // Single wall calculation
      } else if (surfaceType === 'floor' && typeof length === 'number' && typeof width === 'number') {
        totalArea = length * width;
      } else {
        return;
      }
    } else if (inputType === 'area' && typeof area === 'number') {
      totalArea = area;
    } else {
      return;
    }

    // Subtract openings
    const openingArea = openings.reduce((sum, opening) => sum + (opening.width * opening.height), 0);
    totalArea -= openingArea;

    // Add waste factor
    const patternWasteFactor = {
      'straight': 1.1,
      'diagonal': 1.15,
      'herringbone': 1.2,
      'brick': 1.1,
      'basketweave': 1.15
    }[pattern];

    const areaWithWaste = totalArea * (1 + wasteFactor / 100) * patternWasteFactor;

    // Calculate tiles needed
    const tileAreaSqFt = (tileSize.width * tileSize.length) / 144; // Convert from sq inches to sq ft
    const tilesNeeded = Math.ceil(areaWithWaste / tileAreaSqFt);
    const boxesNeeded = Math.ceil(tilesNeeded / tileSize.piecesPerBox);
    const tileCost = boxesNeeded * tileSize.pricePerBox;

    const results: CalculationResult[] = [
      {
        label: t('calculators.tile.totalSurfaceArea'),
        value: Number(totalArea.toFixed(2)),
        unit: t('calculators.tile.squareFeet')
      },
      {
        label: t('calculators.tile.areaWithWastePattern', {
          wasteFactor,
          pattern: t(`calculators.tile.patterns.${pattern}`)
        }),
        value: Number(areaWithWaste.toFixed(2)),
        unit: t('calculators.tile.squareFeet')
      },
      {
        label: t('calculators.tile.tileSize', {
          width: tileSize.width,
          length: tileSize.length
        }),
        value: boxesNeeded,
        unit: t('calculators.tile.boxes'),
        cost: tileCost
      }
    ];

    let totalCost = tileCost;

    // Calculate mortar
    const mortarCoverage = getCustomUnitValue('Mortar', 90, 'mortar'); // sq ft per 50lb bag
    const mortarBags = Math.ceil(areaWithWaste / mortarCoverage);
    const mortarPrice = activeMortarPrices[mortarType] || 24.98;
    const mortarCost = mortarBags * mortarPrice;
    totalCost += mortarCost;

    results.push({
      label: t(`calculators.tile.mortarTypes.${mortarType}`),
      value: mortarBags,
      unit: t('calculators.tile.bags50lb'),
      cost: mortarCost
    });

    // Calculate grout
    const baseGroutCoverage = {
      0.125: 200,
      0.25: 150,
      0.375: 100
    }[groutWidth];
    const groutCoverage = getCustomUnitValue('Grout', baseGroutCoverage, 'grout'); // sq ft per bag
    const groutBags = Math.ceil(areaWithWaste / groutCoverage);
    const groutPrice = activeGroutPrices[groutType] || 19.98;
    const groutCost = groutBags * groutPrice;
    totalCost += groutCost;

    results.push({
      label: t('calculators.tile.groutWithJoints', {
        groutType: t(`calculators.tile.groutTypes.${groutType}`),
        width: groutWidth
      }),
      value: groutBags,
      unit: t('calculators.tile.bags25lb'),
      cost: groutCost
    });

    // Calculate backer board if included
    if (includeBackerBoard) {
      const backerBoardCoverage = getCustomUnitValue('Backer Board', 32, 'supplies'); // sq ft per sheet
      const backerBoardSheets = Math.ceil(totalArea / backerBoardCoverage);
      const backerBoardPrice = backerBoardThickness === '1/4'
        ? getCustomPrice('Backer Board 1/4"', 15.98, 'supplies')
        : getCustomPrice('Backer Board 5/8"', 19.98, 'supplies');
      const backerBoardCost = backerBoardSheets * backerBoardPrice;
      totalCost += backerBoardCost;

      results.push({
        label: t('calculators.tile.backerBoardThickness', { thickness: backerBoardThickness }),
        value: backerBoardSheets,
        unit: t('calculators.tile.sheets3x5'),
        cost: backerBoardCost
      });

      // Backer board screws
      const screwsNeeded = backerBoardSheets * 30; // 30 screws per sheet
      const screwBoxes = Math.ceil(screwsNeeded / 100);
      const screwCost = screwBoxes * getCustomPrice('Backer Board Screws', 12.98, 'supplies');
      totalCost += screwCost;

      results.push({
        label: t('calculators.tile.backerBoardScrews'),
        value: screwBoxes,
        unit: t('calculators.tile.boxes100ct'),
        cost: screwCost
      });
    }

    // Calculate membrane if included
    if (includeMembrane) {
      const membraneCoverage = getCustomUnitValue('Waterproof Membrane', 100, 'supplies'); // sq ft per roll
      const membraneRolls = Math.ceil(totalArea / membraneCoverage);
      const membraneCost = membraneRolls * getCustomPrice('Waterproof Membrane', 89.98, 'supplies');
      totalCost += membraneCost;

      results.push({
        label: t('calculators.tile.waterproofMembrane'),
        value: membraneRolls,
        unit: t('calculators.tile.rolls100sf'),
        cost: membraneCost
      });
    }

    // Calculate edging if included
    if (includeEdging && typeof length === 'number' && typeof width === 'number') {
      const edgeLength = surfaceType === 'floor' ? 2 * (length + width) : length + width;
      const edgeTrimLength = getCustomUnitValue('Edge Trim', 8, 'supplies'); // ft per piece
      const edgePieces = Math.ceil(edgeLength / edgeTrimLength);
      const edgePrice = edgingType === 'metal'
        ? getCustomPrice('Metal Edge Trim', 12.98, 'supplies')
        : getCustomPrice('Stone Edge Trim', 24.98, 'supplies');
      const edgingCost = edgePieces * edgePrice;
      totalCost += edgingCost;

      results.push({
        label: t(`calculators.tile.edgingTypes.${edgingType}`),
        value: edgePieces,
        unit: t('calculators.tile.pieces8ft'),
        cost: edgingCost
      });
    }

    // Add total cost
    results.push({
      label: t('calculators.tile.totalEstimatedCost'),
      value: Number(totalCost.toFixed(2)),
      unit: t('calculators.tile.usd'),
      isTotal: true
    });

    onCalculate(results);
  };

  const isFormValid =
    ((inputType === 'dimensions' &&
      ((surfaceType === 'floor' && typeof length === 'number' && typeof width === 'number') ||
       (surfaceType === 'wall' && typeof length === 'number' && typeof height === 'number'))) ||
    (inputType === 'area' && typeof area === 'number')) &&
    typeof tileSize.width === 'number' &&
    typeof tileSize.length === 'number' &&
    typeof tileSize.piecesPerBox === 'number' &&
    typeof tileSize.pricePerBox === 'number';

  // Show loading state if custom calculator data is loading
  if (activeTab === 'custom' && loadingCustom) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Grid className="h-6 w-6 text-orange-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.tile.title')}</h2>
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
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.tile.title')}</h2>
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
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.tile.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="tile"
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
                surfaceType === 'floor'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setSurfaceType('floor')}
            >
              {t('calculators.tile.floor')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                surfaceType === 'wall'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setSurfaceType('wall')}
            >
              {t('calculators.tile.wall')}
            </button>
          </div>

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
              {t('calculators.tile.useDimensions')}
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
              {t('calculators.tile.useSquareFootage')}
            </button>
          </div>
        </div>

        {inputType === 'dimensions' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
                {surfaceType === 'wall'
                  ? t('calculators.tile.wallLengthFeet')
                  : t('calculators.tile.lengthFeet')}
              </label>
              <input
                type="number"
                id="length"
                min="0"
                step="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={surfaceType === 'wall'
                  ? t('calculators.tile.placeholderWallLength')
                  : t('calculators.tile.placeholderLength')}
              />
            </div>

            {surfaceType === 'floor' ? (
              <div>
                <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.tile.widthFeet')}
                </label>
                <input
                  type="number"
                  id="width"
                  min="0"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.tile.placeholderWidth')}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.tile.wallHeightFeet')}
                </label>
                <input
                  type="number"
                  id="height"
                  min="0"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.tile.placeholderWallHeight')}
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="area" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.tile.totalAreaSquareFeet')}
            </label>
            <input
              type="number"
              id="area"
              min="0"
              step="0.1"
              value={area}
              onChange={(e) => setArea(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.tile.placeholderTotalArea')}
            />
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.tile.tileSpecifications')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tileWidth" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.tile.tileWidthInches')}
              </label>
              <input
                type="number"
                id="tileWidth"
                min="0"
                step="0.125"
                value={customTileWidth || tileSize.width}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : '';
                  setCustomTileWidth(value);
                  setTileSize(prev => ({ ...prev, width: value as number }));
                }}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.tile.placeholderTileWidth')}
              />
            </div>

            <div>
              <label htmlFor="tileLength" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.tile.tileLengthInches')}
              </label>
              <input
                type="number"
                id="tileLength"
                min="0"
                step="0.125"
                value={customTileLength || tileSize.length}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : '';
                  setCustomTileLength(value);
                  setTileSize(prev => ({ ...prev, length: value as number }));
                }}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.tile.placeholderTileLength')}
              />
            </div>

            <div>
              <label htmlFor="tilePiecesPerBox" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.tile.piecesPerBox')}
              </label>
              <input
                type="number"
                id="tilePiecesPerBox"
                min="1"
                step="1"
                value={customTilePiecesPerBox || tileSize.piecesPerBox}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : '';
                  setCustomTilePiecesPerBox(value);
                  setTileSize(prev => ({ ...prev, piecesPerBox: value as number }));
                }}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.tile.placeholderPiecesPerBox')}
              />
            </div>

            <div>
              <label htmlFor="tilePricePerBox" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.tile.pricePerBox')}
              </label>
              <input
                type="number"
                id="tilePricePerBox"
                min="0"
                step="0.01"
                value={customTilePricePerBox || tileSize.pricePerBox}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : '';
                  setCustomTilePricePerBox(value);
                  setTileSize(prev => ({ ...prev, pricePerBox: value as number }));
                }}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.tile.placeholderPricePerBox')}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.tile.installationDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pattern" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.tile.installationPattern')}
              </label>
              <select
                id="pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value as TilePattern)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="straight">{t('calculators.tile.patterns.straight')}</option>
                <option value="diagonal">{t('calculators.tile.patterns.diagonal')}</option>
                <option value="herringbone">{t('calculators.tile.patterns.herringbone')}</option>
                <option value="brick">{t('calculators.tile.patterns.brick')}</option>
                <option value="basketweave">{t('calculators.tile.patterns.basketweave')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="groutWidth" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.tile.groutJointWidth')}
              </label>
              <select
                id="groutWidth"
                value={groutWidth}
                onChange={(e) => setGroutWidth(Number(e.target.value) as GroutWidth)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={0.125}>{t('calculators.tile.groutWidths.1_8')}</option>
                <option value={0.25}>{t('calculators.tile.groutWidths.1_4')}</option>
                <option value={0.375}>{t('calculators.tile.groutWidths.3_8')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">{t('calculators.tile.openings')}</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => addOpening('door')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.tile.addDoor')}
              </button>
              <button
                onClick={() => addOpening('window')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.tile.addWindow')}
              </button>
              {surfaceType === 'wall' && (
                <button
                  onClick={() => addOpening('cabinet')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  {t('calculators.tile.addCabinet')}
                </button>
              )}
              <button
                onClick={() => addOpening('custom')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.tile.addCustom')}
              </button>
            </div>
          </div>

          {openings.map((opening, index) => (
            <div key={index} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.tile.openingWidth')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={opening.width}
                    onChange={(e) => updateOpening(index, 'width', Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.tile.openingHeight')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={opening.height}
                    onChange={(e) => updateOpening(index, 'height', Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.tile.openingType')}
                  </label>
                  <select
                    value={opening.type}
                    onChange={(e) => updateOpening(index, 'type', e.target.value as Opening['type'])}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="door">{t('calculators.tile.openingTypes.door')}</option>
                    <option value="window">{t('calculators.tile.openingTypes.window')}</option>
                    {surfaceType === 'wall' && <option value="cabinet">{t('calculators.tile.openingTypes.cabinet')}</option>}
                    <option value="custom">{t('calculators.tile.openingTypes.custom')}</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => removeOpening(index)}
                className="mt-2 text-red-500 hover:text-red-600"
              >
                {t('calculators.tile.removeOpening')}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.tile.materials')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mortarType" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.tile.mortarType')}
              </label>
              <select
                id="mortarType"
                value={mortarType}
                onChange={(e) => setMortarType(e.target.value as 'modified' | 'unmodified' | 'epoxy')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="modified">{t('calculators.tile.mortarTypes.modified')}</option>
                <option value="unmodified">{t('calculators.tile.mortarTypes.unmodified')}</option>
                <option value="epoxy">{t('calculators.tile.mortarTypes.epoxy')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="groutType" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.tile.groutType')}
              </label>
              <select
                id="groutType"
                value={groutType}
                onChange={(e) => setGroutType(e.target.value as 'sanded' | 'unsanded' | 'epoxy')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="sanded">{t('calculators.tile.groutTypes.sanded')}</option>
                <option value="unsanded">{t('calculators.tile.groutTypes.unsanded')}</option>
                <option value="epoxy">{t('calculators.tile.groutTypes.epoxy')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.tile.additionalOptions')}</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="wasteFactor" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.tile.wasteFactor')}
              </label>
              <select
                id="wasteFactor"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(Number(e.target.value) as 10 | 15 | 20)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={10}>{t('calculators.tile.wasteFactors.10')}</option>
                <option value={15}>{t('calculators.tile.wasteFactors.15')}</option>
                <option value={20}>{t('calculators.tile.wasteFactors.20')}</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeBackerBoard"
                checked={includeBackerBoard}
                onChange={(e) => setIncludeBackerBoard(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeBackerBoard" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.tile.includeBackerBoard')}
              </label>
            </div>

            {includeBackerBoard && (
              <div>
                <label htmlFor="backerBoardThickness" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.tile.backerBoardThicknessLabel')}
                </label>
                <select
                  id="backerBoardThickness"
                  value={backerBoardThickness}
                  onChange={(e) => setBackerBoardThickness(e.target.value as '1/4' | '1/2')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="1/4">{t('calculators.tile.backerBoardThicknesses.1_4')}</option>
                  <option value="1/2">{t('calculators.tile.backerBoardThicknesses.1_2')}</option>
                </select>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeMembrane"
                checked={includeMembrane}
                onChange={(e) => setIncludeMembrane(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeMembrane" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.tile.includeWaterproofMembrane')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeEdging"
                checked={includeEdging}
                onChange={(e) => setIncludeEdging(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeEdging" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.tile.includeEdgeTrim')}
              </label>
            </div>

            {includeEdging && (
              <div>
                <label htmlFor="edgingType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.tile.edgeTrimType')}
                </label>
                <select
                  id="edgingType"
                  value={edgingType}
                  onChange={(e) => setEdgingType(e.target.value as 'metal' | 'stone')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"

                >
                  <option value="metal">{t('calculators.tile.edgingTypes.metal')}</option>
                  <option value="stone">{t('calculators.tile.edgingTypes.stone')}</option>
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

export default TileCalculator;
