import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Droplets } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CalculatorEstimateHeader from './CalculatorEstimateHeader';

type GutterSize = '5' | '6' | 'custom';
type GutterMaterial = 'aluminum' | 'vinyl' | 'galvanized' | 'copper';
type DownspoutSize = '2x3' | '3x4' | 'custom';

interface GutterOption {
  name: string;
  pricePerFoot: number;
  maxSpan: number;
}

const gutterMaterials: Record<GutterMaterial, Record<GutterSize, GutterOption>> = {
  aluminum: {
    '5': { name: '5" K-Style Aluminum', pricePerFoot: 4.98, maxSpan: 35 },
    '6': { name: '6" K-Style Aluminum', pricePerFoot: 6.98, maxSpan: 40 },
    'custom': { name: 'Custom Aluminum', pricePerFoot: 0, maxSpan: 0 }
  },
  vinyl: {
    '5': { name: '5" K-Style Vinyl', pricePerFoot: 3.98, maxSpan: 30 },
    '6': { name: '6" K-Style Vinyl', pricePerFoot: 5.98, maxSpan: 35 },
    'custom': { name: 'Custom Vinyl', pricePerFoot: 0, maxSpan: 0 }
  },
  galvanized: {
    '5': { name: '5" K-Style Galvanized', pricePerFoot: 7.98, maxSpan: 35 },
    '6': { name: '6" K-Style Galvanized', pricePerFoot: 9.98, maxSpan: 40 },
    'custom': { name: 'Custom Galvanized', pricePerFoot: 0, maxSpan: 0 }
  },
  copper: {
    '5': { name: '5" K-Style Copper', pricePerFoot: 24.98, maxSpan: 35 },
    '6': { name: '6" K-Style Copper', pricePerFoot: 29.98, maxSpan: 40 },
    'custom': { name: 'Custom Copper', pricePerFoot: 0, maxSpan: 0 }
  }
};

const GuttersCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [roofLength, setRoofLength] = useState<number | ''>('');
  const [gutterMaterial, setGutterMaterial] = useState<GutterMaterial>('aluminum');
  const [gutterSize, setGutterSize] = useState<GutterSize>('5');
  const [customGutterPrice, setCustomGutterPrice] = useState<number | ''>('');
  const [customGutterMaxSpan, setCustomGutterMaxSpan] = useState<number | ''>('');
  const [downspoutSize, setDownspoutSize] = useState<DownspoutSize>('2x3');
  const [customDownspoutPrice, setCustomDownspoutPrice] = useState<number | ''>('');
  const [roofPitch, setRoofPitch] = useState<number>(4);
  const [valleyCount, setValleyCount] = useState<number | ''>('');
  const [includeLeafGuards, setIncludeLeafGuards] = useState(false);
  const [includeHeatTape, setIncludeHeatTape] = useState(false);
  const [heatTapeLength, setHeatTapeLength] = useState<number | ''>('');
  const [includeEndcaps, setIncludeEndcaps] = useState(true);
  const [includeCorners, setIncludeCorners] = useState(true);
  const [cornerCount, setCornerCount] = useState<number | ''>('');

  const getCurrentInputs = () => ({
    roofLength,
    gutterMaterial,
    gutterSize,
    customGutterPrice,
    customGutterMaxSpan,
    downspoutSize,
    customDownspoutPrice,
    roofPitch,
    valleyCount,
    includeLeafGuards,
    includeHeatTape,
    heatTapeLength,
    includeEndcaps,
    includeCorners,
    cornerCount
  });

  const handleLoadEstimate = (estimate: any) => {
    setRoofLength(estimate.inputs.roofLength ?? '');
    setGutterMaterial(estimate.inputs.gutterMaterial ?? 'aluminum');
    setGutterSize(estimate.inputs.gutterSize ?? '5');
    setCustomGutterPrice(estimate.inputs.customGutterPrice ?? '');
    setCustomGutterMaxSpan(estimate.inputs.customGutterMaxSpan ?? '');
    setDownspoutSize(estimate.inputs.downspoutSize ?? '2x3');
    setCustomDownspoutPrice(estimate.inputs.customDownspoutPrice ?? '');
    setRoofPitch(estimate.inputs.roofPitch ?? 4);
    setValleyCount(estimate.inputs.valleyCount ?? '');
    setIncludeLeafGuards(estimate.inputs.includeLeafGuards ?? false);
    setIncludeHeatTape(estimate.inputs.includeHeatTape ?? false);
    setHeatTapeLength(estimate.inputs.heatTapeLength ?? '');
    setIncludeEndcaps(estimate.inputs.includeEndcaps ?? true);
    setIncludeCorners(estimate.inputs.includeCorners ?? true);
    setCornerCount(estimate.inputs.cornerCount ?? '');
  };

  const handleNewEstimate = () => {
    setRoofLength('');
    setGutterMaterial('aluminum');
    setGutterSize('5');
    setCustomGutterPrice('');
    setCustomGutterMaxSpan('');
    setDownspoutSize('2x3');
    setCustomDownspoutPrice('');
    setRoofPitch(4);
    setValleyCount('');
    setIncludeLeafGuards(false);
    setIncludeHeatTape(false);
    setHeatTapeLength('');
    setIncludeEndcaps(true);
    setIncludeCorners(true);
    setCornerCount('');
  };

  const handleCalculate = () => {
    if (typeof roofLength === 'number') {
      const results: CalculationResult[] = [];
      let totalCost = 0;

      // Calculate effective roof length based on pitch
      const pitchFactor = 1 + (roofPitch / 12);
      const effectiveLength = roofLength * pitchFactor;

      // Add valley length if applicable
      let totalGutterLength = effectiveLength;
      if (typeof valleyCount === 'number') {
        const valleyLength = valleyCount * 5; // Assume 5 feet per valley
        totalGutterLength += valleyLength;
      }

      // Calculate gutter cost
      let gutterPricePerFoot = gutterSize === 'custom' && typeof customGutterPrice === 'number'
        ? customGutterPrice
        : gutterMaterials[gutterMaterial][gutterSize].pricePerFoot;

      const gutterCost = totalGutterLength * gutterPricePerFoot;
      totalCost += gutterCost;

      results.push({
        label: `${gutterSize}" ${gutterMaterial.charAt(0).toUpperCase() + gutterMaterial.slice(1)} Gutters`,
        value: Number(totalGutterLength.toFixed(2)),
        unit: 'linear feet',
        cost: gutterCost
      });

      // Calculate downspouts (1 per 35 feet of gutter)
      const downspoutsNeeded = Math.ceil(totalGutterLength / 35);
      const downspoutLength = 15; // Average 15 feet per downspout
      const totalDownspoutLength = downspoutsNeeded * downspoutLength;
      
      const downspoutPrices = {
        '2x3': 3.98,
        '3x4': 5.98,
        'custom': typeof customDownspoutPrice === 'number' ? customDownspoutPrice : 0
      };
      
      const downspoutCost = totalDownspoutLength * downspoutPrices[downspoutSize];
      totalCost += downspoutCost;

      results.push({
        label: `${downspoutSize} Downspouts`,
        value: downspoutsNeeded,
        unit: 'pieces',
        cost: downspoutCost
      });

      // Add endcaps if included
      if (includeEndcaps) {
        const endcapsNeeded = Math.ceil(totalGutterLength / 50) * 2; // Two per section
        const endcapPrice = gutterMaterial === 'copper' ? 12.98 : 4.98;
        const endcapCost = endcapsNeeded * endcapPrice;
        totalCost += endcapCost;

        results.push({
          label: 'Endcaps',
          value: endcapsNeeded,
          unit: 'pieces',
          cost: endcapCost
        });
      }

      // Add corners if included
      if (includeCorners && typeof cornerCount === 'number') {
        const cornerPrice = gutterMaterial === 'copper' ? 24.98 : 8.98;
        const cornerCost = cornerCount * cornerPrice;
        totalCost += cornerCost;

        results.push({
          label: 'Inside/Outside Corners',
          value: cornerCount,
          unit: 'pieces',
          cost: cornerCost
        });
      }

      // Calculate leaf guards if included
      if (includeLeafGuards) {
        const leafGuardPrice = gutterMaterial === 'copper' ? 8.98 : 4.98;
        const leafGuardCost = totalGutterLength * leafGuardPrice;
        totalCost += leafGuardCost;

        results.push({
          label: 'Leaf Guards',
          value: Number(totalGutterLength.toFixed(2)),
          unit: 'linear feet',
          cost: leafGuardCost
        });
      }

      // Calculate heat tape if included
      if (includeHeatTape && typeof heatTapeLength === 'number') {
        const heatTapeCost = heatTapeLength * 6.98;
        totalCost += heatTapeCost;

        results.push({
          label: 'Heat Tape',
          value: heatTapeLength,
          unit: 'linear feet',
          cost: heatTapeCost
        });
      }

      // Add hangers and misc hardware
      const hangersNeeded = Math.ceil(totalGutterLength / 2); // One every 2 feet
      const hangerPrice = gutterMaterial === 'copper' ? 3.98 : 1.98;
      const hangerCost = hangersNeeded * hangerPrice;
      totalCost += hangerCost;

      results.push({
        label: 'Hangers and Hardware',
        value: hangersNeeded,
        unit: 'pieces',
        cost: hangerCost
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
    typeof roofLength === 'number' &&
    (gutterSize !== 'custom' || (
      typeof customGutterPrice === 'number' &&
      typeof customGutterMaxSpan === 'number'
    )) &&
    (downspoutSize !== 'custom' || typeof customDownspoutPrice === 'number') &&
    (!includeCorners || typeof cornerCount === 'number') &&
    (!includeHeatTape || typeof heatTapeLength === 'number');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Droplets className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.gutters.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="gutters"
        currentInputs={getCurrentInputs()}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="roofLength" className="block text-sm font-medium text-slate-700 mb-1">
              Total Roof Edge Length (feet)
            </label>
            <input
              type="number"
              id="roofLength"
              min="0"
              step="0.1"
              value={roofLength}
              onChange={(e) => setRoofLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter total length in feet"
            />
          </div>

          <div>
            <label htmlFor="roofPitch" className="block text-sm font-medium text-slate-700 mb-1">
              Roof Pitch (inches per foot)
            </label>
            <select
              id="roofPitch"
              value={roofPitch}
              onChange={(e) => setRoofPitch(Number(e.target.value))}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(pitch => (
                <option key={pitch} value={pitch}>{pitch}/12 pitch</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Gutter Specifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="gutterMaterial" className="block text-sm font-medium text-slate-700 mb-1">
                Gutter Material
              </label>
              <select
                id="gutterMaterial"
                value={gutterMaterial}
                onChange={(e) => {
                  setGutterMaterial(e.target.value as GutterMaterial);
                  setGutterSize('5'); // Reset size when material changes
                }}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="aluminum">Aluminum</option>
                <option value="vinyl">Vinyl</option>
                <option value="galvanized">Galvanized Steel</option>
                <option value="copper">Copper</option>
              </select>
            </div>

            <div>
              <label htmlFor="gutterSize" className="block text-sm font-medium text-slate-700 mb-1">
                Gutter Size
              </label>
              <select
                id="gutterSize"
                value={gutterSize}
                onChange={(e) => setGutterSize(e.target.value as GutterSize)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="5">5" K-Style</option>
                <option value="6">6" K-Style</option>
                <option value="custom">Custom Size</option>
              </select>
            </div>
          </div>

          {gutterSize === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="customGutterPrice" className="block text-sm font-medium text-slate-700 mb-1">
                  Custom Gutter Price (per foot)
                </label>
                <input
                  type="number"
                  id="customGutterPrice"
                  min="0"
                  step="0.01"
                  value={customGutterPrice}
                  onChange={(e) => setCustomGutterPrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter price per foot"
                />
              </div>
              <div>
                <label htmlFor="customGutterMaxSpan" className="block text-sm font-medium text-slate-700 mb-1">
                  Maximum Span (feet)
                </label>
                <input
                  type="number"
                  id="customGutterMaxSpan"
                  min="0"
                  step="1"
                  value={customGutterMaxSpan}
                  onChange={(e) => setCustomGutterMaxSpan(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter maximum span"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Downspouts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="downspoutSize" className="block text-sm font-medium text-slate-700 mb-1">
                Downspout Size
              </label>
              <select
                id="downspoutSize"
                value={downspoutSize}
                onChange={(e) => setDownspoutSize(e.target.value as DownspoutSize)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="2x3">2" x 3"</option>
                <option value="3x4">3" x 4"</option>
                <option value="custom">Custom Size</option>
              </select>
            </div>

            {downspoutSize === 'custom' && (
              <div>
                <label htmlFor="customDownspoutPrice" className="block text-sm font-medium text-slate-700 mb-1">
                  Custom Downspout Price (per foot)
                </label>
                <input
                  type="number"
                  id="customDownspoutPrice"
                  min="0"
                  step="0.01"
                  value={customDownspoutPrice}
                  onChange={(e) => setCustomDownspoutPrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter price per foot"
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="valleyCount" className="block text-sm font-medium text-slate-700 mb-1">
                Number of Valleys
              </label>
              <input
                type="number"
                id="valleyCount"
                min="0"
                step="1"
                value={valleyCount}
                onChange={(e) => setValleyCount(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter number of valleys"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeLeafGuards"
                checked={includeLeafGuards}
                onChange={(e) => setIncludeLeafGuards(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeLeafGuards" className="ml-2 block text-sm font-medium text-slate-700">
                Include Leaf Guards
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeEndcaps"
                  checked={includeEndcaps}
                  onChange={(e) => setIncludeEndcaps(e.target.checked)}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label htmlFor="includeEndcaps" className="ml-2 block text-sm font-medium text-slate-700">
                  Include Endcaps
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeCorners"
                  checked={includeCorners}
                  onChange={(e) => {
                    setIncludeCorners(e.target.checked);
                    if (!e.target.checked) {
                      setCornerCount('');
                    }
                  }}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label htmlFor="includeCorners" className="ml-2 block text-sm font-medium text-slate-700">
                  Include Corners
                </label>
              </div>
            </div>

            {includeCorners && (
              <div>
                <label htmlFor="cornerCount" className="block text-sm font-medium text-slate-700 mb-1">
                  Number of Corners
                </label>
                <input
                  type="number"
                  id="cornerCount"
                  min="0"
                  step="1"
                  value={cornerCount}
                  onChange={(e) => setCornerCount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter number of corners"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeHeatTape"
                  checked={includeHeatTape}
                  onChange={(e) => {
                    setIncludeHeatTape(e.target.checked);
                    if (!e.target.checked) {
                      setHeatTapeLength('');
                    }
                  }}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label htmlFor="includeHeatTape" className="ml-2 block text-sm font-medium text-slate-700">
                  Include Heat Tape
                </label>
              </div>
            </div>

            {includeHeatTape && (
              <div>
                <label htmlFor="heatTapeLength" className="block text-sm font-medium text-slate-700 mb-1">
                  Heat Tape Length (feet)
                </label>
                <input
                  type="number"
                  id="heatTapeLength"
                  min="0"
                  step="1"
                  value={heatTapeLength}
                  onChange={(e) => setHeatTapeLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter heat tape length"
                />
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

export default GuttersCalculator;