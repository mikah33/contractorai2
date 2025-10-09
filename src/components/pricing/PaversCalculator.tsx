import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Layout } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PaversCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [inputType, setInputType] = useState<'dimensions' | 'area'>('dimensions');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [area, setArea] = useState<number | ''>('');
  const [baseDepth, setBaseDepth] = useState<number | ''>('');
  const [beddingType, setBeddingType] = useState<'sand' | 'stone-dust' | '3/8-stone'>('sand');
  const [beddingDepth, setBeddingDepth] = useState<number | ''>('');
  const [hasBorder, setHasBorder] = useState(false);
  const [borderLength, setBorderLength] = useState<number | ''>('');
  const [borderStyle, setBorderStyle] = useState<'soldier' | 'sailor' | 'double-sailor'>('soldier');
  const [edgeBlockSize, setEdgeBlockSize] = useState<'4x8' | '6x9' | '6x12' | 'custom'>('6x9');
  const [customEdgeWidth, setCustomEdgeWidth] = useState<number | ''>('');
  const [customEdgeLength, setCustomEdgeLength] = useState<number | ''>('');
  const [wasteFactor, setWasteFactor] = useState<5 | 10 | 15 | 20>(10);
  const [paverCostPerSqFt, setPaverCostPerSqFt] = useState<number | ''>('');

  const handleCalculate = () => {
    let baseArea: number;
    
    if (inputType === 'dimensions' && typeof length === 'number' && typeof width === 'number') {
      baseArea = length * width;
    } else if (inputType === 'area' && typeof area === 'number') {
      baseArea = area;
    } else {
      return;
    }

    if (typeof baseDepth === 'number' && typeof beddingDepth === 'number' && typeof paverCostPerSqFt === 'number') {
      const areaWithWaste = baseArea * (1 + wasteFactor / 100);
      const baseVolume = (areaWithWaste * baseDepth) / 324;
      const beddingVolume = (areaWithWaste * beddingDepth) / 324;

      const jointSandBags = Math.ceil(baseArea / 60);

      // Calculate paver cost
      const paverCost = baseArea * paverCostPerSqFt;

      const results: CalculationResult[] = [
        {
          label: 'Total Patio Area',
          value: Number(baseArea.toFixed(2)),
          unit: 'square feet'
        },
        {
          label: `Total Area (including ${wasteFactor}% waste)`,
          value: Number(areaWithWaste.toFixed(2)),
          unit: 'square feet'
        },
        {
          label: 'Paver Cost',
          value: Number(paverCost.toFixed(2)),
          unit: 'USD',
          cost: paverCost
        },
        {
          label: 'Base Material Needed',
          value: Number(baseVolume.toFixed(2)),
          unit: 'cubic yards',
          cost: baseVolume * 45 // Approximate cost of base material per cubic yard
        },
        {
          label: `${beddingType.replace('-', ' ').replace(/(^\w|\s\w)/g, l => l.toUpperCase())} Needed`,
          value: Number(beddingVolume.toFixed(2)),
          unit: 'cubic yards',
          cost: beddingVolume * 55 // Approximate cost of bedding material per cubic yard
        },
        {
          label: 'Polymeric Sand Needed',
          value: jointSandBags,
          unit: '60lb bags',
          cost: jointSandBags * 45 // Updated price to $45 per bag
        }
      ];

      if (hasBorder && typeof borderLength === 'number') {
        let blockLength: number;
        let blockWidth: number;

        if (edgeBlockSize === 'custom' && typeof customEdgeLength === 'number' && typeof customEdgeWidth === 'number') {
          blockLength = customEdgeLength / 12; // Convert inches to feet
          blockWidth = customEdgeWidth / 12;
        } else {
          // Parse dimensions from standard sizes
          const [width, length] = edgeBlockSize.split('x').map(Number);
          blockWidth = width / 12;
          blockLength = length / 12;
        }

        const effectiveLength = borderStyle === 'soldier' ? blockWidth : blockLength;
        const edgeBlocksNeeded = Math.ceil(borderLength / effectiveLength);
        const totalBlocks = borderStyle === 'double-sailor' ? edgeBlocksNeeded * 2 : edgeBlocksNeeded;

        const styleLabel = borderStyle.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        const sizeLabel = edgeBlockSize === 'custom' 
          ? `${customEdgeWidth}"x${customEdgeLength}"`
          : edgeBlockSize;

        // Updated prices for edge blocks
        const getEdgeBlockPrice = (size: string) => {
          switch (size) {
            case '6x9': return 2.00; // Updated to $2.00 per piece
            case '4x8': return 1.50; // Updated to $1.50 per piece
            case '6x12': return 2.25;
            default: return 2.00; // Default price for custom size
          }
        };

        const edgeBlockPrice = getEdgeBlockPrice(edgeBlockSize);
        const edgeBlockCost = totalBlocks * edgeBlockPrice;
        
        results.push({
          label: `Edge Blocks Needed (${sizeLabel}, ${styleLabel})`,
          value: totalBlocks,
          unit: 'pieces',
          cost: edgeBlockCost
        });
      }

      // Add total cost
      const totalCost = results.reduce((sum, item) => sum + (item.cost || 0), 0);
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
    ((inputType === 'dimensions' && typeof length === 'number' && typeof width === 'number') ||
    (inputType === 'area' && typeof area === 'number')) &&
    typeof baseDepth === 'number' &&
    typeof beddingDepth === 'number' &&
    typeof paverCostPerSqFt === 'number' &&
    (!hasBorder || (
      typeof borderLength === 'number' &&
      (edgeBlockSize !== 'custom' || (
        typeof customEdgeWidth === 'number' &&
        typeof customEdgeLength === 'number'
      ))
    ));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Layout className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.pavers.title')}</h2>
      </div>
      
      <div className="mb-4">
        <div className="mb-6">
          <div className="flex justify-start mb-4">
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
                {t('calculators.useDimensions')}
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
                {t('calculators.useSquareFootage')}
              </button>
            </div>
          </div>

          {inputType === 'dimensions' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.lengthFeet')}
                </label>
                <input
                  type="number"
                  id="length"
                  min="0"
                  step="0.1"
                  value={length}
                  onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.enterLength')}
                />
              </div>

              <div>
                <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.widthFeet')}
                </label>
                <input
                  type="number"
                  id="width"
                  min="0"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.enterWidth')}
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="area" className="block text-sm font-medium text-slate-700 mb-1">
                Total Area (square feet)
              </label>
              <input
                type="number"
                id="area"
                min="0"
                step="0.1"
                value={area}
                onChange={(e) => setArea(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter total area in square feet"
              />
            </div>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="paverCostPerSqFt" className="block text-sm font-medium text-slate-700 mb-1">
            Paver Cost per Square Foot
          </label>
          <input
            type="number"
            id="paverCostPerSqFt"
            min="0"
            step="0.01"
            value={paverCostPerSqFt}
            onChange={(e) => setPaverCostPerSqFt(e.target.value ? Number(e.target.value) : '')}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter paver cost per square foot"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="wasteFactor" className="block text-sm font-medium text-slate-700 mb-1">
            Estimated Waste Factor
          </label>
          <select
            id="wasteFactor"
            value={wasteFactor}
            onChange={(e) => setWasteFactor(Number(e.target.value) as 5 | 10 | 15 | 20)}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value={5}>5% waste</option>
            <option value={10}>10% waste</option>
            <option value={15}>15% waste</option>
            <option value={20}>20% waste</option>
          </select>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Base Material</h3>
          <div>
            <label htmlFor="baseDepth" className="block text-sm font-medium text-slate-700 mb-1">
              Base Depth (inches)
            </label>
            <input
              type="number"
              id="baseDepth"
              min="0"
              step="0.5"
              value={baseDepth}
              onChange={(e) => setBaseDepth(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter base depth in inches"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Bedding Layer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="beddingType" className="block text-sm font-medium text-slate-700 mb-1">
                Bedding Material
              </label>
              <select
                id="beddingType"
                value={beddingType}
                onChange={(e) => setBeddingType(e.target.value as 'sand' | 'stone-dust' | '3/8-stone')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="sand">Sand</option>
                <option value="stone-dust">Stone Dust</option>
                <option value="3/8-stone">3/8" Stone</option>
              </select>
            </div>
            <div>
              <label htmlFor="beddingDepth" className="block text-sm font-medium text-slate-700 mb-1">
                Bedding Depth (inches)
              </label>
              <input
                type="number"
                id="beddingDepth"
                min="0"
                step="0.5"
                value={beddingDepth}
                onChange={(e) => setBeddingDepth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter bedding depth in inches"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="hasBorder"
              checked={hasBorder}
              onChange={(e) => {
                setHasBorder(e.target.checked);
                if (!e.target.checked) {
                  setBorderLength('');
                }
              }}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="hasBorder" className="ml-2 block text-sm font-medium text-slate-700">
              Add border edge blocks
            </label>
          </div>

          {hasBorder && (
            <div className="space-y-4">
              <div>
                <label htmlFor="borderStyle" className="block text-sm font-medium text-slate-700 mb-1">
                  Border Style
                </label>
                <select
                  id="borderStyle"
                  value={borderStyle}
                  onChange={(e) => setBorderStyle(e.target.value as 'soldier' | 'sailor' | 'double-sailor')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="soldier">Soldier</option>
                  <option value="sailor">Sailor</option>
                  <option value="double-sailor">Double Sailor</option>
                </select>
              </div>

              <div>
                <label htmlFor="edgeBlockSize" className="block text-sm font-medium text-slate-700 mb-1">
                  Edge Block Size
                </label>
                <select
                  id="edgeBlockSize"
                  value={edgeBlockSize}
                  onChange={(e) => {
                    const value = e.target.value as typeof edgeBlockSize;
                    setEdgeBlockSize(value);
                    if (value !== 'custom') {
                      setCustomEdgeWidth('');
                      setCustomEdgeLength('');
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="4x8">4" x 8"</option>
                  <option value="6x9">6" x 9"</option>
                  <option value="6x12">6" x 12"</option>
                  <option value="custom">Custom Size</option>
                </select>
              </div>

              {edgeBlockSize === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customEdgeWidth" className="block text-sm font-medium text-slate-700 mb-1">
                      Custom Edge Block Width (inches)
                    </label>
                    <input
                      type="number"
                      id="customEdgeWidth"
                      min="0"
                      step="0.5"
                      value={customEdgeWidth}
                      onChange={(e) => setCustomEdgeWidth(e.target.value ? Number(e.target.value) : '')}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter width in inches"
                    />
                  </div>
                  <div>
                    <label htmlFor="customEdgeLength" className="block text-sm font-medium text-slate-700 mb-1">
                      Custom Edge Block Length (inches)
                    </label>
                    <input
                      type="number"
                      id="customEdgeLength"
                      min="0"
                      step="0.5"
                      value={customEdgeLength}
                      onChange={(e) => setCustomEdgeLength(e.target.value ? Number(e.target.value) : '')}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter length in inches"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="borderLength" className="block text-sm font-medium text-slate-700 mb-1">
                  Total Border Length (feet)
                </label>
                <input
                  type="number"
                  id="borderLength"
                  min="0"
                  step="0.1"
                  value={borderLength}
                  onChange={(e) => setBorderLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter total perimeter length in feet"
                />
              </div>
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

export default PaversCalculator;