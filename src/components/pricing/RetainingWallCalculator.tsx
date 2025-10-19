import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Wallet as Wall } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CalculatorEstimateHeader from './CalculatorEstimateHeader';

type WallType = 'block' | 'concrete' | 'timber' | 'boulder';
type BlockType = 'standard' | 'pinned' | 'gravity' | 'custom';
type DrainageType = 'gravel' | 'pipe' | 'both' | 'none';

const RetainingWallCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [wallType, setWallType] = useState<WallType>('block');
  const [length, setLength] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [concreteWidth, setConcreteWidth] = useState<number | ''>(12); // Default 12 inches for concrete walls
  const [blockType, setBlockType] = useState<BlockType>('standard');
  const [customBlockWidth, setCustomBlockWidth] = useState<number | ''>('');
  const [customBlockHeight, setCustomBlockHeight] = useState<number | ''>('');
  const [customBlockDepth, setCustomBlockDepth] = useState<number | ''>('');
  const [customBlockPrice, setCustomBlockPrice] = useState<number | ''>('');
  const [customBlockWeight, setCustomBlockWeight] = useState<number | ''>('');
  const [drainageType, setDrainageType] = useState<DrainageType>('both');
  const [includeFrost, setIncludeFrost] = useState(true);
  const [soilType, setSoilType] = useState<'sandy' | 'clay' | 'gravel'>('clay');
  const [includeGeogrid, setIncludeGeogrid] = useState(false);
  const [geogridLayers, setGeogridLayers] = useState<number>(2);
  const [includeCapstone, setIncludeCapstone] = useState(true);

  // Boulder wall options
  const [machineHours, setMachineHours] = useState<number | ''>('');
  const [pricePerHour, setPricePerHour] = useState<number | ''>('');
  const [boulderQuantity, setBoulderQuantity] = useState<number | ''>('');
  const [pricePerBoulder, setPricePerBoulder] = useState<number | ''>('');

  // Block dimensions and prices
  const blockSpecs = {
    standard: {
      width: 12,
      height: 8,
      depth: 12,
      price: 5.98,
      weightLbs: 38
    },
    pinned: {
      width: 16,
      height: 6,
      depth: 12,
      price: 6.98,
      weightLbs: 42
    },
    gravity: {
      width: 18,
      height: 8,
      depth: 24,
      price: 12.98,
      weightLbs: 82
    },
    custom: {
      width: customBlockWidth,
      height: customBlockHeight,
      depth: customBlockDepth,
      price: customBlockPrice,
      weightLbs: customBlockWeight
    }
  };

  const getCurrentInputs = () => ({
    wallType,
    length,
    height,
    concreteWidth,
    blockType,
    customBlockWidth,
    customBlockHeight,
    customBlockDepth,
    customBlockPrice,
    customBlockWeight,
    drainageType,
    includeFrost,
    soilType,
    includeGeogrid,
    geogridLayers,
    includeCapstone,
    machineHours,
    pricePerHour,
    boulderQuantity,
    pricePerBoulder
  });

  const handleLoadEstimate = (estimate: any) => {
    setWallType(estimate.inputs.wallType);
    setLength(estimate.inputs.length);
    setHeight(estimate.inputs.height);
    setConcreteWidth(estimate.inputs.concreteWidth);
    setBlockType(estimate.inputs.blockType);
    setCustomBlockWidth(estimate.inputs.customBlockWidth);
    setCustomBlockHeight(estimate.inputs.customBlockHeight);
    setCustomBlockDepth(estimate.inputs.customBlockDepth);
    setCustomBlockPrice(estimate.inputs.customBlockPrice);
    setCustomBlockWeight(estimate.inputs.customBlockWeight);
    setDrainageType(estimate.inputs.drainageType);
    setIncludeFrost(estimate.inputs.includeFrost);
    setSoilType(estimate.inputs.soilType);
    setIncludeGeogrid(estimate.inputs.includeGeogrid);
    setGeogridLayers(estimate.inputs.geogridLayers);
    setIncludeCapstone(estimate.inputs.includeCapstone);
    setMachineHours(estimate.inputs.machineHours);
    setPricePerHour(estimate.inputs.pricePerHour);
    setBoulderQuantity(estimate.inputs.boulderQuantity);
    setPricePerBoulder(estimate.inputs.pricePerBoulder);
  };

  const handleNewEstimate = () => {
    setWallType('block');
    setLength('');
    setHeight('');
    setConcreteWidth(12);
    setBlockType('standard');
    setCustomBlockWidth('');
    setCustomBlockHeight('');
    setCustomBlockDepth('');
    setCustomBlockPrice('');
    setCustomBlockWeight('');
    setDrainageType('both');
    setIncludeFrost(true);
    setSoilType('clay');
    setIncludeGeogrid(false);
    setGeogridLayers(2);
    setIncludeCapstone(true);
    setMachineHours('');
    setPricePerHour('');
    setBoulderQuantity('');
    setPricePerBoulder('');
  };

  const handleCalculate = () => {
    // Different validation for boulder walls
    if (wallType === 'boulder' || (typeof length === 'number' && typeof height === 'number')) {
      const results: CalculationResult[] = [];
      let totalCost = 0;

      // Base calculations - skip for boulder walls
      let wallArea = 0;
      if (wallType !== 'boulder') {
        wallArea = length * height;
        results.push({
          label: t('calculators.retainingWall.totalWallArea'),
          value: Number(wallArea.toFixed(2)),
          unit: t('calculators.retainingWall.squareFeet')
        });
      }

      if (wallType === 'block') {
        const specs = blockSpecs[blockType];

        // For custom blocks, verify all dimensions are provided
        if (blockType === 'custom' &&
            typeof specs.width === 'number' &&
            typeof specs.height === 'number' &&
            typeof specs.depth === 'number' &&
            typeof specs.price === 'number') {
          const blocksPerSqFt = 144 / (specs.width * specs.height); // 144 sq inches in a sq ft
          const totalBlocks = Math.ceil(wallArea * blocksPerSqFt);
          const blockCost = totalBlocks * specs.price;
          totalCost += blockCost;

          results.push({
            label: `${t('calculators.retainingWall.customBlocks')} (${specs.width}"x${specs.height}"x${specs.depth}")`,
            value: totalBlocks,
            unit: t('calculators.retainingWall.blocks'),
            cost: blockCost
          });
        } else if (blockType !== 'custom') {
          const blocksPerSqFt = 144 / (specs.width * specs.height);
          const totalBlocks = Math.ceil(wallArea * blocksPerSqFt);
          const blockCost = totalBlocks * specs.price;
          totalCost += blockCost;

          results.push({
            label: `${t('calculators.retainingWall.retainingWallBlocks')} (${blockType})`,
            value: totalBlocks,
            unit: t('calculators.retainingWall.blocks'),
            cost: blockCost
          });
        }

        if (includeCapstone) {
          const capstonePerFt = 1;
          const capstonesNeeded = Math.ceil(length * capstonePerFt);
          const capstoneCost = capstonesNeeded * 8.98;
          totalCost += capstoneCost;

          results.push({
            label: t('calculators.retainingWall.capstoneBlocks'),
            value: capstonesNeeded,
            unit: t('calculators.retainingWall.pieces'),
            cost: capstoneCost
          });
        }

      } else if (wallType === 'concrete') {
        const wallThickness = typeof concreteWidth === 'number' ? concreteWidth : 12; // Use user input or default to 12 inches
        const volumeCuYd = (length * height * (wallThickness / 12)) / 27;
        const concreteCost = volumeCuYd * 185; // $185 per cubic yard
        totalCost += concreteCost;

        results.push({
          label: t('calculators.retainingWall.concreteNeeded'),
          value: Number(volumeCuYd.toFixed(2)),
          unit: t('calculators.retainingWall.cubicYards'),
          cost: concreteCost
        });

        // Rebar calculation
        const verticalSpacing = 12; // inches
        const horizontalSpacing = 16; // inches
        const verticalBars = Math.ceil((length * 12) / verticalSpacing);
        const horizontalBars = Math.ceil((height * 12) / horizontalSpacing);
        const totalRebar = (verticalBars * height) + (horizontalBars * length);
        const rebarCost = Math.ceil(totalRebar / 20) * 12.98; // 20ft rebar lengths at $12.98 each
        totalCost += rebarCost;

        results.push({
          label: t('calculators.retainingWall.rebarNeeded'),
          value: Math.ceil(totalRebar),
          unit: t('calculators.retainingWall.linearFeet'),
          cost: rebarCost
        });

      } else if (wallType === 'timber') {
        const timberHeight = 6; // inches
        const rowsNeeded = Math.ceil((height * 12) / timberHeight);
        const timberLength = 8; // feet
        const timbersNeeded = Math.ceil(length / timberLength) * rowsNeeded;
        const timberCost = timbersNeeded * 24.98; // $24.98 per pressure treated 6x6
        totalCost += timberCost;

        results.push({
          label: t('calculators.retainingWall.pressureTreatedTimbers'),
          value: timbersNeeded,
          unit: t('calculators.retainingWall.eightFootLengths'),
          cost: timberCost
        });

        // Deadmen calculation (one every 8ft of length, every other row)
        const deadmenNeeded = Math.ceil(length / 8) * Math.ceil(rowsNeeded / 2);
        const deadmenCost = deadmenNeeded * 24.98;
        totalCost += deadmenCost;

        results.push({
          label: t('calculators.retainingWall.deadmenTimbers'),
          value: deadmenNeeded,
          unit: t('calculators.retainingWall.eightFootLengths'),
          cost: deadmenCost
        });
      } else if (wallType === 'boulder') {
        // Machine hours cost
        if (typeof machineHours === 'number' && typeof pricePerHour === 'number') {
          const machineCost = machineHours * pricePerHour;
          totalCost += machineCost;

          results.push({
            label: 'Machine Hours',
            value: machineHours,
            unit: 'Hours',
            cost: machineCost
          });
        }

        // Boulder cost
        if (typeof boulderQuantity === 'number' && typeof pricePerBoulder === 'number') {
          const boulderCost = boulderQuantity * pricePerBoulder;
          totalCost += boulderCost;

          results.push({
            label: 'Boulders',
            value: boulderQuantity,
            unit: 'Pieces',
            cost: boulderCost
          });
        }
      }

      // Skip these for boulder walls (they only need machine hours and boulders)
      if (wallType !== 'boulder') {
        // Base material
        const baseDepth = 6; // inches
        const baseWidth = wallType === 'block' ? 24 : 36; // inches
        const baseVolume = (length * (baseWidth / 12) * (baseDepth / 12)) / 27; // cubic yards
        const baseCost = baseVolume * 45; // $45 per cubic yard
        totalCost += baseCost;

        results.push({
          label: t('calculators.retainingWall.gravelBaseMaterial'),
          value: Number(baseVolume.toFixed(2)),
          unit: t('calculators.retainingWall.cubicYards'),
          cost: baseCost
        });

        // Drainage calculations
        if (drainageType !== 'none') {
          if (drainageType === 'gravel' || drainageType === 'both') {
            const drainageGravelVolume = (length * height * 1) / 27; // 1 foot thick drainage layer
            const drainageGravelCost = drainageGravelVolume * 55; // $55 per cubic yard
            totalCost += drainageGravelCost;

            results.push({
              label: t('calculators.retainingWall.drainageGravel'),
              value: Number(drainageGravelVolume.toFixed(2)),
              unit: t('calculators.retainingWall.cubicYards'),
              cost: drainageGravelCost
            });
          }

          if (drainageType === 'pipe' || drainageType === 'both') {
            const drainPipeNeeded = Math.ceil(length);
            const drainPipeCost = drainPipeNeeded * 8.98; // $8.98 per 10ft section
            totalCost += drainPipeCost;

            results.push({
              label: t('calculators.retainingWall.drainagePipe'),
              value: drainPipeNeeded,
              unit: t('calculators.retainingWall.tenFootSections'),
              cost: drainPipeCost
            });
          }
        }

        // Geogrid if included
        if (includeGeogrid && height > 4) {
          const geogridArea = length * height * geogridLayers;
          const geogridRolls = Math.ceil(geogridArea / 200); // 200 sq ft per roll
          const geogridCost = geogridRolls * 89.98;
          totalCost += geogridCost;

          results.push({
            label: t('calculators.retainingWall.geogridReinforcement'),
            value: geogridRolls,
            unit: t('calculators.retainingWall.twoHundredSfRolls'),
            cost: geogridCost
          });
        }

        // Filter fabric
        const fabricArea = length * (height + 2); // Extra 2ft for overlap
        const fabricRolls = Math.ceil(fabricArea / 300); // 300 sq ft per roll
        const fabricCost = fabricRolls * 45.98;
        totalCost += fabricCost;

        results.push({
          label: t('calculators.retainingWall.filterFabric'),
          value: fabricRolls,
          unit: t('calculators.retainingWall.threeHundredSfRolls'),
          cost: fabricCost
        });
      }

      // Add total cost
      results.push({
        label: t('calculators.retainingWall.totalEstimatedCost'),
        value: Number(totalCost.toFixed(2)),
        unit: t('calculators.retainingWall.usd'),
        isTotal: true
      });

      onCalculate(results);
    }
  };

  const isFormValid = wallType === 'boulder'
    ? (typeof machineHours === 'number' &&
       typeof pricePerHour === 'number' &&
       typeof boulderQuantity === 'number' &&
       typeof pricePerBoulder === 'number')
    : (typeof length === 'number' &&
       typeof height === 'number' &&
       (blockType !== 'custom' || (
         typeof customBlockWidth === 'number' &&
         typeof customBlockHeight === 'number' &&
         typeof customBlockDepth === 'number' &&
         typeof customBlockPrice === 'number' &&
         typeof customBlockWeight === 'number'
       )));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Wall className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.retainingWall.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="retaining-wall"
        getCurrentInputs={getCurrentInputs}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="flex justify-between mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                wallType === 'block'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300 rounded-l-lg`}
              onClick={() => setWallType('block')}
            >
              {t('calculators.retainingWall.blockWall')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                wallType === 'concrete'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border-t border-b border-slate-300`}
              onClick={() => setWallType('concrete')}
            >
              {t('calculators.retainingWall.concreteWall')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                wallType === 'timber'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setWallType('timber')}
            >
              {t('calculators.retainingWall.timberWall')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                wallType === 'boulder'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300 rounded-r-lg`}
              onClick={() => setWallType('boulder')}
            >
              Boulder Wall
            </button>
          </div>
        </div>

        {wallType === 'boulder' ? (
          <div className="mb-6 p-6 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Boulder Wall Calculator</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="machineHours" className="block text-sm font-medium text-slate-700 mb-1">
                  Total Machine Hours
                </label>
                <input
                  type="number"
                  id="machineHours"
                  min="0"
                  step="0.5"
                  value={machineHours}
                  onChange={(e) => setMachineHours(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., 8.5"
                />
              </div>

              <div>
                <label htmlFor="pricePerHour" className="block text-sm font-medium text-slate-700 mb-1">
                  Price Per Hour ($)
                </label>
                <input
                  type="number"
                  id="pricePerHour"
                  min="0"
                  step="0.01"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., 150.00"
                />
              </div>

              <div>
                <label htmlFor="boulderQuantity" className="block text-sm font-medium text-slate-700 mb-1">
                  Estimated Quantity of Boulders
                </label>
                <input
                  type="number"
                  id="boulderQuantity"
                  min="0"
                  step="1"
                  value={boulderQuantity}
                  onChange={(e) => setBoulderQuantity(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., 25"
                />
              </div>

              <div>
                <label htmlFor="pricePerBoulder" className="block text-sm font-medium text-slate-700 mb-1">
                  Price Per Boulder ($)
                </label>
                <input
                  type="number"
                  id="pricePerBoulder"
                  min="0"
                  step="0.01"
                  value={pricePerBoulder}
                  onChange={(e) => setPricePerBoulder(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., 75.00"
                />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              <strong>Note:</strong> Boulder walls require specialized equipment and expertise. Total cost includes machine hours and boulder materials.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.retainingWall.wallLengthFeet')}
              </label>
              <input
                type="number"
                id="length"
                min="0"
                step="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.retainingWall.enterWallLengthPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.retainingWall.wallHeightFeet')}
              </label>
              <input
                type="number"
                id="height"
                min="0"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.retainingWall.enterWallHeightPlaceholder')}
              />
            </div>
          </div>
        )}

        {wallType === 'block' && (
          <div className="mb-6">
            <label htmlFor="blockType" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.retainingWall.blockType')}
            </label>
            <select
              id="blockType"
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as BlockType)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="standard">{t('calculators.retainingWall.standardBlock')}</option>
              <option value="pinned">{t('calculators.retainingWall.pinnedBlock')}</option>
              <option value="gravity">{t('calculators.retainingWall.gravityBlock')}</option>
              <option value="custom">{t('calculators.retainingWall.customBlockSize')}</option>
            </select>

            {blockType === 'custom' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.retainingWall.blockWidthInches')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.125"
                    value={customBlockWidth}
                    onChange={(e) => setCustomBlockWidth(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.retainingWall.widthInInchesPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.retainingWall.blockHeightInches')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.125"
                    value={customBlockHeight}
                    onChange={(e) => setCustomBlockHeight(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.retainingWall.heightInInchesPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.retainingWall.blockDepthInches')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.125"
                    value={customBlockDepth}
                    onChange={(e) => setCustomBlockDepth(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.retainingWall.depthInInchesPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.retainingWall.pricePerBlock')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customBlockPrice}
                    onChange={(e) => setCustomBlockPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.retainingWall.pricePerBlockPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.retainingWall.blockWeightLbs')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={customBlockWeight}
                    onChange={(e) => setCustomBlockWeight(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.retainingWall.weightInPoundsPlaceholder')}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {wallType === 'concrete' && (
          <div className="mb-6">
            <label htmlFor="concreteWidth" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.retainingWall.wallThicknessInches')}
            </label>
            <input
              type="number"
              id="concreteWidth"
              min="0"
              step="1"
              value={concreteWidth}
              onChange={(e) => setConcreteWidth(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.retainingWall.enterWallThicknessPlaceholder')}
            />
            <p className="text-sm text-slate-500 mt-1">
              {t('calculators.retainingWall.typicalThickness')}
            </p>
          </div>
        )}

        {wallType !== 'boulder' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="soilType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.retainingWall.soilType')}
                </label>
                <select
                  id="soilType"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value as 'sandy' | 'clay' | 'gravel')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="sandy">{t('calculators.retainingWall.sandySoil')}</option>
                  <option value="clay">{t('calculators.retainingWall.claySoil')}</option>
                  <option value="gravel">{t('calculators.retainingWall.gravelRockySoil')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="drainageType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.retainingWall.drainageSystem')}
                </label>
                <select
                  id="drainageType"
                  value={drainageType}
                  onChange={(e) => setDrainageType(e.target.value as DrainageType)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="both">{t('calculators.retainingWall.gravelAndPipe')}</option>
                  <option value="gravel">{t('calculators.retainingWall.gravelOnly')}</option>
                  <option value="pipe">{t('calculators.retainingWall.pipeOnly')}</option>
                  <option value="none">{t('calculators.retainingWall.noDrainage')}</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 mb-6">
              <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.retainingWall.additionalOptions')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeFrost"
                    checked={includeFrost}
                    onChange={(e) => setIncludeFrost(e.target.checked)}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                  />
                  <label htmlFor="includeFrost" className="ml-2 block text-sm font-medium text-slate-700">
                    {t('calculators.retainingWall.includeFrostProtection')}
                  </label>
                </div>

                {wallType === 'block' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeCapstone"
                      checked={includeCapstone}
                      onChange={(e) => setIncludeCapstone(e.target.checked)}
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                    />
                    <label htmlFor="includeCapstone" className="ml-2 block text-sm font-medium text-slate-700">
                      {t('calculators.retainingWall.includeCapstone')}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {wallType !== 'boulder' && height > 4 && (
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="includeGeogrid"
                checked={includeGeogrid}
                onChange={(e) => setIncludeGeogrid(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeGeogrid" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.retainingWall.includeGeogridReinforcement')}
              </label>
            </div>

            {includeGeogrid && (
              <div>
                <label htmlFor="geogridLayers" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.retainingWall.numberOfGeogridLayers')}
                </label>
                <select
                  id="geogridLayers"
                  value={geogridLayers}
                  onChange={(e) => setGeogridLayers(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {[2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{t('calculators.retainingWall.layersCount', { count: num })}</option>
                  ))}
                </select>
              </div>
            )}
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

export default RetainingWallCalculator;
