import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Radiation as Foundation } from 'lucide-react';

type FoundationType = 'strip-footing' | 'spread-footings' | 'thickened-edge' | 'frost-wall';
type SoilType = 'sandy' | 'clay' | 'rock';
type BackfillType = 'native' | 'gravel' | 'sand';

const FoundationCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
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
      const footingConcreteCost = footingVolume * {
        3000: 125,
        3500: 135,
        4000: 145,
        4500: 155
      }[concreteStrength];
      totalCost += footingConcreteCost;

      results.push({
        label: `Footing Concrete (${concreteStrength} PSI)`,
        value: Number(footingVolume.toFixed(2)),
        unit: 'cubic yards',
        cost: footingConcreteCost
      });

      // 2. Stem Wall/Basement Wall Calculations
      const wallVolume = (perimeter * stemWallHeight * (stemWallThickness / 12)) / 27;
      const wallConcreteCost = wallVolume * {
        3000: 125,
        3500: 135,
        4000: 145,
        4500: 155
      }[concreteStrength];
      totalCost += wallConcreteCost;

      results.push({
        label: `${isBasement ? 'Basement' : 'Stem'} Wall Concrete (${concreteStrength} PSI)`,
        value: Number(wallVolume.toFixed(2)),
        unit: 'cubic yards',
        cost: wallConcreteCost
      });

      // 3. Backfill Calculations (only if not a basement)
      if (!isBasement) {
        const interiorWidth = width - ((stemWallThickness / 12) * 2);
        const interiorLength = length - ((stemWallThickness / 12) * 2);
        const interiorArea = interiorLength * interiorWidth;
        const backfillHeight = stemWallHeight - ((slabThickness / 12) + (gravelBaseDepth / 12));
        const backfillVolume = (interiorArea * backfillHeight) / 27;
        const backfillCost = backfillVolume * {
          'native': 15,
          'gravel': 45,
          'sand': 35
        }[backfillType];
        totalCost += backfillCost;

        results.push({
          label: `${backfillType.charAt(0).toUpperCase() + backfillType.slice(1)} Backfill`,
          value: Number(backfillVolume.toFixed(2)),
          unit: 'cubic yards',
          cost: backfillCost
        });
      }

      // 4. Gravel Base Calculations
      const gravelBaseVolume = (area * (gravelBaseDepth / 12)) / 27;
      const gravelBaseCost = gravelBaseVolume * 45;
      totalCost += gravelBaseCost;

      results.push({
        label: 'Gravel Base',
        value: Number(gravelBaseVolume.toFixed(2)),
        unit: 'cubic yards',
        cost: gravelBaseCost
      });

      // 5. Slab Calculations
      const slabVolume = (area * (slabThickness / 12)) / 27;
      const slabConcreteCost = slabVolume * {
        3000: 125,
        3500: 135,
        4000: 145,
        4500: 155
      }[concreteStrength];
      totalCost += slabConcreteCost;

      results.push({
        label: `${isBasement ? 'Basement Floor' : 'Slab'} Concrete (${concreteStrength} PSI)`,
        value: Number(slabVolume.toFixed(2)),
        unit: 'cubic yards',
        cost: slabConcreteCost
      });

      // 6. Reinforcement Calculations
      if (includeSteelReinforcement) {
        // Footing rebar (longitudinal bars)
        const footingRebarLength = perimeter * 2;
        const footingRebarPieces = Math.ceil(footingRebarLength / 20);
        const footingRebarCost = footingRebarPieces * 12.98;
        totalCost += footingRebarCost;

        results.push({
          label: 'Footing Rebar',
          value: footingRebarPieces,
          unit: '20ft pieces',
          cost: footingRebarCost
        });

        // Wall rebar
        const verticalBarSpacing = 16;
        const verticalBars = Math.ceil((perimeter * 12) / verticalBarSpacing);
        const verticalBarLength = stemWallHeight + 2;
        const wallVerticalRebarPieces = Math.ceil((verticalBars * verticalBarLength) / 20);
        const wallHorizontalRebarPieces = Math.ceil((perimeter * 2) / 20);
        const wallRebarCost = (wallVerticalRebarPieces + wallHorizontalRebarPieces) * 12.98;
        totalCost += wallRebarCost;

        results.push({
          label: `${isBasement ? 'Basement' : 'Stem'} Wall Rebar`,
          value: wallVerticalRebarPieces + wallHorizontalRebarPieces,
          unit: '20ft pieces',
          cost: wallRebarCost
        });

        // Slab/floor mesh/rebar
        const slabRebarSpacingFt = rebarSpacing / 12;
        const longitudinalBars = Math.ceil(width / slabRebarSpacingFt) + 1;
        const transverseBars = Math.ceil(length / slabRebarSpacingFt) + 1;
        const slabRebarLength = (longitudinalBars * length) + (transverseBars * width);
        const slabRebarPieces = Math.ceil(slabRebarLength / 20);
        const slabRebarCost = slabRebarPieces * 12.98;
        totalCost += slabRebarCost;

        results.push({
          label: `${isBasement ? 'Floor' : 'Slab'} Rebar (${rebarSpacing}" o.c.)`,
          value: slabRebarPieces,
          unit: '20ft pieces',
          cost: slabRebarCost
        });
      }

      // 7. Vapor Barrier
      if (includeVaporBarrier) {
        const vaporBarrierArea = area * 1.1;
        const vaporBarrierRolls = Math.ceil(vaporBarrierArea / 1000);
        const vaporBarrierCost = vaporBarrierRolls * 89.98;
        totalCost += vaporBarrierCost;

        results.push({
          label: '10-mil Vapor Barrier',
          value: vaporBarrierRolls,
          unit: '1000sf rolls',
          cost: vaporBarrierCost
        });
      }

      // 8. Waterproofing
      if (includeWaterproofing) {
        const waterproofingArea = perimeter * stemWallHeight * 1.1;
        const waterproofingGallons = Math.ceil(waterproofingArea / 100);
        const waterproofingCost = waterproofingGallons * 45.98;
        totalCost += waterproofingCost;

        results.push({
          label: 'Waterproofing Membrane',
          value: waterproofingGallons,
          unit: 'gallons',
          cost: waterproofingCost
        });
      }

      // 9. Drainage System
      if (includeDrainage) {
        const drainPipeLength = Math.ceil(perimeter * 1.1);
        const drainPipeSections = Math.ceil(drainPipeLength / 10);
        const drainPipeCost = drainPipeSections * 12.98;
        totalCost += drainPipeCost;

        results.push({
          label: 'Drainage Pipe',
          value: drainPipeSections,
          unit: '10ft sections',
          cost: drainPipeCost
        });

        const drainageGravelVolume = (perimeter * 2 * 2) / 27;
        const drainageGravelCost = drainageGravelVolume * 45;
        totalCost += drainageGravelCost;

        results.push({
          label: 'Drainage Gravel',
          value: Number(drainageGravelVolume.toFixed(2)),
          unit: 'cubic yards',
          cost: drainageGravelCost
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

  const isFormValid = 
    typeof length === 'number' && 
    typeof width === 'number' &&
    typeof footingWidth === 'number' &&
    typeof footingDepth === 'number' &&
    typeof stemWallHeight === 'number' &&
    typeof stemWallThickness === 'number' &&
    typeof slabThickness === 'number' &&
    typeof gravelBaseDepth === 'number';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Foundation className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">Foundation Calculator</h2>
      </div>
      
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
              Strip Footing
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
              Spread Footings
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
              Thickened Edge
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
              Frost Wall
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
              This is a basement foundation
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              Length (feet)
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter length in feet"
            />
          </div>
          
          <div>
            <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
              Width (feet)
            </label>
            <input
              type="number"
              id="width"
              min="0"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter width in feet"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Footing Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="footingWidth" className="block text-sm font-medium text-slate-700 mb-1">
                Footing Width (inches)
              </label>
              <input
                type="number"
                id="footingWidth"
                min="0"
                step="1"
                value={footingWidth}
                onChange={(e) => setFootingWidth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter footing width"
              />
            </div>

            <div>
              <label htmlFor="footingDepth" className="block text-sm font-medium text-slate-700 mb-1">
                Footing Depth (inches)
              </label>
              <input
                type="number"
                id="footingDepth"
                min="0"
                step="1"
                value={footingDepth}
                onChange={(e) => setFootingDepth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter footing depth"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">
            {isBasement ? 'Basement Wall Details' : 'Stem Wall Details'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="stemWallHeight" className="block text-sm font-medium text-slate-700 mb-1">
                {isBasement ? 'Wall Height' : 'Stem Wall Height'} (feet)
              </label>
              <input
                type="number"
                id="stemWallHeight"
                min="0"
                step="0.1"
                value={stemWallHeight}
                onChange={(e) => setStemWallHeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={`Enter ${isBasement ? 'wall' : 'stem wall'} height in feet`}
              />
            </div>

            <div>
              <label htmlFor="stemWallThickness" className="block text-sm font-medium text-slate-700 mb-1">
                Wall Thickness (inches)
              </label>
              <input
                type="number"
                id="stemWallThickness"
                min="0"
                step="1"
                value={stemWallThickness}
                onChange={(e) => setStemWallThickness(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter wall thickness"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">
            {isBasement ? 'Basement Floor Details' : 'Slab Details'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="slabThickness" className="block text-sm font-medium text-slate-700 mb-1">
                {isBasement ? 'Floor' : 'Slab'} Thickness (inches)
              </label>
              <input
                type="number"
                id="slabThickness"
                min="0"
                step="0.5"
                value={slabThickness}
                onChange={(e) => setSlabThickness(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={`Enter ${isBasement ? 'floor' : 'slab'} thickness`}
              />
            </div>

            <div>
              <label htmlFor="gravelBaseDepth" className="block text-sm font-medium text-slate-700 mb-1">
                Gravel Base Depth (inches)
              </label>
              <input
                type="number"
                id="gravelBaseDepth"
                min="0"
                step="1"
                value={gravelBaseDepth}
                onChange={(e) => setGravelBaseDepth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter gravel base depth"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Site Conditions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="soilType" className="block text-sm font-medium text-slate-700 mb-1">
                Soil Type
              </label>
              <select
                id="soilType"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as SoilType)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="sandy">Sandy Soil</option>
                <option value="clay">Clay Soil</option>
                <option value="rock">Rocky Soil</option>
              </select>
            </div>

            {!isBasement && (
              <div>
                <label htmlFor="backfillType" className="block text-sm font-medium text-slate-700 mb-1">
                  Backfill Material
                </label>
                <select
                  id="backfillType"
                  value={backfillType}
                  onChange={(e) => setBackfillType(e.target.value as BackfillType)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="native">Native Soil</option>
                  <option value="gravel">Gravel</option>
                  <option value="sand">Sand</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="frostDepth" className="block text-sm font-medium text-slate-700 mb-1">
                Frost Depth (inches)
              </label>
              <input
                type="number"
                id="frostDepth"
                min="0"
                step="1"
                value={frostDepth}
                onChange={(e) => setFrostDepth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter frost depth"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Concrete & Reinforcement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="concreteStrength" className="block text-sm font-medium text-slate-700 mb-1">
                Concrete Strength
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
                Include Steel Reinforcement
              </label>
            </div>
          </div>

          {includeSteelReinforcement && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="rebarSize" className="block text-sm font-medium text-slate-700 mb-1">
                  Rebar Size
                </label>
                <select
                  id="rebarSize"
                  value={rebarSize}
                  onChange={(e) => setRebarSize(e.target.value as '#3' | '#4' | '#5')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="#3">#3 Rebar (3/8")</option>
                  <option value="#4">#4 Rebar (1/2")</option>
                  <option value="#5">#5 Rebar (5/8")</option>
                </select>
              </div>

              <div>
                <label htmlFor="rebarSpacing" className="block text-sm font-medium text-slate-700 mb-1">
                  Rebar Spacing
                </label>
                <select
                  id="rebarSpacing"
                  value={rebarSpacing}
                  onChange={(e) => setRebarSpacing(Number(e.target.value) as 12 | 16 | 18)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={12}>12" on center</option>
                  <option value={16}>16" on center</option>
                  <option value={18}>18" on center</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Options</h3>
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
                Include Vapor Barrier
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
                Include Waterproofing
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
                Include Drainage System
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
        Calculate Materials
      </button>
    </div>
  );
};

export default FoundationCalculator;