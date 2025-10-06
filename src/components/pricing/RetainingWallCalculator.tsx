import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Wallet as Wall } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type WallType = 'block' | 'concrete' | 'timber';
type BlockType = 'standard' | 'pinned' | 'gravity' | 'custom';
type DrainageType = 'gravel' | 'pipe' | 'both' | 'none';

const RetainingWallCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [wallType, setWallType] = useState<WallType>('block');
  const [length, setLength] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
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

  const handleCalculate = () => {
    if (typeof length === 'number' && typeof height === 'number') {
      const results: CalculationResult[] = [];
      let totalCost = 0;

      // Base calculations
      const wallArea = length * height;
      results.push({
        label: 'Total Wall Area',
        value: Number(wallArea.toFixed(2)),
        unit: 'square feet'
      });

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
            label: `Custom Blocks (${specs.width}"x${specs.height}"x${specs.depth}")`,
            value: totalBlocks,
            unit: 'blocks',
            cost: blockCost
          });
        } else if (blockType !== 'custom') {
          const blocksPerSqFt = 144 / (specs.width * specs.height);
          const totalBlocks = Math.ceil(wallArea * blocksPerSqFt);
          const blockCost = totalBlocks * specs.price;
          totalCost += blockCost;

          results.push({
            label: `Retaining Wall Blocks (${blockType})`,
            value: totalBlocks,
            unit: 'blocks',
            cost: blockCost
          });
        }

        if (includeCapstone) {
          const capstonePerFt = 1;
          const capstonesNeeded = Math.ceil(length * capstonePerFt);
          const capstoneCost = capstonesNeeded * 8.98;
          totalCost += capstoneCost;

          results.push({
            label: 'Capstone Blocks',
            value: capstonesNeeded,
            unit: 'pieces',
            cost: capstoneCost
          });
        }

      } else if (wallType === 'concrete') {
        const wallThickness = height <= 4 ? 8 : 12; // inches
        const volumeCuYd = (length * height * (wallThickness / 12)) / 27;
        const concreteCost = volumeCuYd * 185; // $185 per cubic yard
        totalCost += concreteCost;

        results.push({
          label: 'Concrete Needed',
          value: Number(volumeCuYd.toFixed(2)),
          unit: 'cubic yards',
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
          label: 'Rebar Needed',
          value: Math.ceil(totalRebar),
          unit: 'linear feet',
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
          label: '6x6 Pressure Treated Timbers',
          value: timbersNeeded,
          unit: '8ft lengths',
          cost: timberCost
        });

        // Deadmen calculation (one every 8ft of length, every other row)
        const deadmenNeeded = Math.ceil(length / 8) * Math.ceil(rowsNeeded / 2);
        const deadmenCost = deadmenNeeded * 24.98;
        totalCost += deadmenCost;

        results.push({
          label: 'Deadmen Timbers',
          value: deadmenNeeded,
          unit: '8ft lengths',
          cost: deadmenCost
        });
      }

      // Base material
      const baseDepth = 6; // inches
      const baseWidth = wallType === 'block' ? 24 : 36; // inches
      const baseVolume = (length * (baseWidth / 12) * (baseDepth / 12)) / 27; // cubic yards
      const baseCost = baseVolume * 45; // $45 per cubic yard
      totalCost += baseCost;

      results.push({
        label: 'Gravel Base Material',
        value: Number(baseVolume.toFixed(2)),
        unit: 'cubic yards',
        cost: baseCost
      });

      // Drainage calculations
      if (drainageType !== 'none') {
        if (drainageType === 'gravel' || drainageType === 'both') {
          const drainageGravelVolume = (length * height * 1) / 27; // 1 foot thick drainage layer
          const drainageGravelCost = drainageGravelVolume * 55; // $55 per cubic yard
          totalCost += drainageGravelCost;

          results.push({
            label: 'Drainage Gravel',
            value: Number(drainageGravelVolume.toFixed(2)),
            unit: 'cubic yards',
            cost: drainageGravelCost
          });
        }

        if (drainageType === 'pipe' || drainageType === 'both') {
          const drainPipeNeeded = Math.ceil(length);
          const drainPipeCost = drainPipeNeeded * 8.98; // $8.98 per 10ft section
          totalCost += drainPipeCost;

          results.push({
            label: 'Drainage Pipe',
            value: drainPipeNeeded,
            unit: '10ft sections',
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
          label: 'Geogrid Reinforcement',
          value: geogridRolls,
          unit: '200sf rolls',
          cost: geogridCost
        });
      }

      // Filter fabric
      const fabricArea = length * (height + 2); // Extra 2ft for overlap
      const fabricRolls = Math.ceil(fabricArea / 300); // 300 sq ft per roll
      const fabricCost = fabricRolls * 45.98;
      totalCost += fabricCost;

      results.push({
        label: 'Filter Fabric',
        value: fabricRolls,
        unit: '300sf rolls',
        cost: fabricCost
      });

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

  const isFormValid = 
    typeof length === 'number' && 
    typeof height === 'number' &&
    (blockType !== 'custom' || (
      typeof customBlockWidth === 'number' &&
      typeof customBlockHeight === 'number' &&
      typeof customBlockDepth === 'number' &&
      typeof customBlockPrice === 'number' &&
      typeof customBlockWeight === 'number'
    ));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Wall className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.retainingWall.title')}</h2>
      </div>
      
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
              Block Wall
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
              Concrete Wall
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                wallType === 'timber'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300 rounded-r-lg`}
              onClick={() => setWallType('timber')}
            >
              Timber Wall
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              Wall Length (feet)
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter wall length in feet"
            />
          </div>
          
          <div>
            <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
              Wall Height (feet)
            </label>
            <input
              type="number"
              id="height"
              min="0"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter wall height in feet"
            />
          </div>
        </div>

        {wallType === 'block' && (
          <div className="mb-6">
            <label htmlFor="blockType" className="block text-sm font-medium text-slate-700 mb-1">
              Block Type
            </label>
            <select
              id="blockType"
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as BlockType)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="standard">Standard Block (12"x8"x12")</option>
              <option value="pinned">Pinned Block (16"x6"x12")</option>
              <option value="gravity">Gravity Block (18"x8"x24")</option>
              <option value="custom">Custom Block Size</option>
            </select>

            {blockType === 'custom' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Block Width (inches)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.125"
                    value={customBlockWidth}
                    onChange={(e) => setCustomBlockWidth(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Width in inches"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Block Height (inches)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.125"
                    value={customBlockHeight}
                    onChange={(e) => setCustomBlockHeight(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Height in inches"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Block Depth (inches)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.125"
                    value={customBlockDepth}
                    onChange={(e) => setCustomBlockDepth(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Depth in inches"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Price per Block ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customBlockPrice}
                    onChange={(e) => setCustomBlockPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Price per block"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Block Weight (lbs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={customBlockWeight}
                    onChange={(e) => setCustomBlockWeight(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Weight in pounds"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="soilType" className="block text-sm font-medium text-slate-700 mb-1">
              Soil Type
            </label>
            <select
              id="soilType"
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as 'sandy' | 'clay' | 'gravel')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="sandy">Sandy Soil</option>
              <option value="clay">Clay Soil</option>
              <option value="gravel">Gravel/Rocky Soil</option>
            </select>
          </div>

          <div>
            <label htmlFor="drainageType" className="block text-sm font-medium text-slate-700 mb-1">
              Drainage System
            </label>
            <select
              id="drainageType"
              value={drainageType}
              onChange={(e) => setDrainageType(e.target.value as DrainageType)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="both">Gravel & Pipe</option>
              <option value="gravel">Gravel Only</option>
              <option value="pipe">Pipe Only</option>
              <option value="none">No Drainage</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Options</h3>
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
                Include Frost Protection
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
                  Include Capstone
                </label>
              </div>
            )}
          </div>
        </div>

        {height > 4 && (
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
                Include Geogrid Reinforcement
              </label>
            </div>

            {includeGeogrid && (
              <div>
                <label htmlFor="geogridLayers" className="block text-sm font-medium text-slate-700 mb-1">
                  Number of Geogrid Layers
                </label>
                <select
                  id="geogridLayers"
                  value={geogridLayers}
                  onChange={(e) => setGeogridLayers(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {[2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num} layers</option>
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