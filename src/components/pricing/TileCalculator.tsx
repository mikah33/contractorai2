import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Grid } from 'lucide-react';

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
        label: 'Total Surface Area',
        value: Number(totalArea.toFixed(2)),
        unit: 'square feet'
      },
      {
        label: `Area with ${wasteFactor}% Waste & ${pattern} Pattern`,
        value: Number(areaWithWaste.toFixed(2)),
        unit: 'square feet'
      },
      {
        label: `Tile (${tileSize.width}"x${tileSize.length}")`,
        value: boxesNeeded,
        unit: 'boxes',
        cost: tileCost
      }
    ];

    let totalCost = tileCost;

    // Calculate mortar
    const mortarCoverage = 90; // sq ft per 50lb bag
    const mortarBags = Math.ceil(areaWithWaste / mortarCoverage);
    const mortarPrices = {
      'modified': 24.98,
      'unmodified': 19.98,
      'epoxy': 89.98
    };
    const mortarCost = mortarBags * mortarPrices[mortarType];
    totalCost += mortarCost;

    results.push({
      label: `${mortarType.charAt(0).toUpperCase() + mortarType.slice(1)} Mortar`,
      value: mortarBags,
      unit: '50lb bags',
      cost: mortarCost
    });

    // Calculate grout
    const groutCoverage = {
      0.125: 200,
      0.25: 150,
      0.375: 100
    }[groutWidth];
    const groutBags = Math.ceil(areaWithWaste / groutCoverage);
    const groutPrices = {
      'sanded': 19.98,
      'unsanded': 22.98,
      'epoxy': 79.98
    };
    const groutCost = groutBags * groutPrices[groutType];
    totalCost += groutCost;

    results.push({
      label: `${groutType.charAt(0).toUpperCase() + groutType.slice(1)} Grout (${groutWidth}" joints)`,
      value: groutBags,
      unit: '25lb bags',
      cost: groutCost
    });

    // Calculate backer board if included
    if (includeBackerBoard) {
      const backerBoardSheets = Math.ceil(totalArea / 32); // 32 sq ft per sheet
      const backerBoardPrice = backerBoardThickness === '1/4' ? 15.98 : 19.98;
      const backerBoardCost = backerBoardSheets * backerBoardPrice;
      totalCost += backerBoardCost;

      results.push({
        label: `${backerBoardThickness}" Backer Board`,
        value: backerBoardSheets,
        unit: '3x5 sheets',
        cost: backerBoardCost
      });

      // Backer board screws
      const screwsNeeded = backerBoardSheets * 30; // 30 screws per sheet
      const screwBoxes = Math.ceil(screwsNeeded / 100);
      const screwCost = screwBoxes * 12.98;
      totalCost += screwCost;

      results.push({
        label: 'Backer Board Screws',
        value: screwBoxes,
        unit: '100ct boxes',
        cost: screwCost
      });
    }

    // Calculate membrane if included
    if (includeMembrane) {
      const membraneRolls = Math.ceil(totalArea / 100); // 100 sq ft per roll
      const membraneCost = membraneRolls * 89.98;
      totalCost += membraneCost;

      results.push({
        label: 'Waterproof Membrane',
        value: membraneRolls,
        unit: '100sf rolls',
        cost: membraneCost
      });
    }

    // Calculate edging if included
    if (includeEdging && typeof length === 'number' && typeof width === 'number') {
      const edgeLength = surfaceType === 'floor' ? 2 * (length + width) : length + width;
      const edgePieces = Math.ceil(edgeLength / 8); // 8ft pieces
      const edgePrice = edgingType === 'metal' ? 12.98 : 24.98;
      const edgingCost = edgePieces * edgePrice;
      totalCost += edgingCost;

      results.push({
        label: `${edgingType.charAt(0).toUpperCase() + edgingType.slice(1)} Edge Trim`,
        value: edgePieces,
        unit: '8ft pieces',
        cost: edgingCost
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Grid className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">Tile Calculator</h2>
      </div>
      
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
              Floor
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
              Wall
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
              Use Dimensions
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
              Use Square Footage
            </button>
          </div>
        </div>

        {inputType === 'dimensions' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
                {surfaceType === 'wall' ? 'Wall Length' : 'Length'} (feet)
              </label>
              <input
                type="number"
                id="length"
                min="0"
                step="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={`Enter ${surfaceType === 'wall' ? 'wall length' : 'length'} in feet`}
              />
            </div>
            
            {surfaceType === 'floor' ? (
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
            ) : (
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
            )}
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

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Tile Specifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tileWidth" className="block text-sm font-medium text-slate-700 mb-1">
                Tile Width (inches)
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
                placeholder="Enter tile width"
              />
            </div>

            <div>
              <label htmlFor="tileLength" className="block text-sm font-medium text-slate-700 mb-1">
                Tile Length (inches)
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
                placeholder="Enter tile length"
              />
            </div>

            <div>
              <label htmlFor="tilePiecesPerBox" className="block text-sm font-medium text-slate-700 mb-1">
                Pieces per Box
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
                placeholder="Enter pieces per box"
              />
            </div>

            <div>
              <label htmlFor="tilePricePerBox" className="block text-sm font-medium text-slate-700 mb-1">
                Price per Box ($)
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
                placeholder="Enter price per box"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Installation Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pattern" className="block text-sm font-medium text-slate-700 mb-1">
                Installation Pattern
              </label>
              <select
                id="pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value as TilePattern)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="straight">Straight (Grid)</option>
                <option value="diagonal">Diagonal (45°)</option>
                <option value="herringbone">Herringbone</option>
                <option value="brick">Brick (Running Bond)</option>
                <option value="basketweave">Basketweave</option>
              </select>
            </div>

            <div>
              <label htmlFor="groutWidth" className="block text-sm font-medium text-slate-700 mb-1">
                Grout Joint Width
              </label>
              <select
                id="groutWidth"
                value={groutWidth}
                onChange={(e) => setGroutWidth(Number(e.target.value) as GroutWidth)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={0.125}>1/8 inch</option>
                <option value={0.25}>1/4 inch</option>
                <option value={0.375}>3/8 inch</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Openings</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => addOpening('door')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add Door
              </button>
              <button
                onClick={() => addOpening('window')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add Window
              </button>
              {surfaceType === 'wall' && (
                <button
                  onClick={() => addOpening('cabinet')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Add Cabinet
                </button>
              )}
              <button
                onClick={() => addOpening('custom')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add Custom
              </button>
            </div>
          </div>

          {openings.map((opening, index) => (
            <div key={index} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Width (feet)
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
                    Height (feet)
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
                    Type
                  </label>
                  <select
                    value={opening.type}
                    onChange={(e) => updateOpening(index, 'type', e.target.value as Opening['type'])}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="door">Door</option>
                    <option value="window">Window</option>
                    {surfaceType === 'wall' && <option value="cabinet">Cabinet</option>}
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => removeOpening(index)}
                className="mt-2 text-red-500 hover:text-red-600"
              >
                Remove Opening
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Materials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mortarType" className="block text-sm font-medium text-slate-700 mb-1">
                Mortar Type
              </label>
              <select
                id="mortarType"
                value={mortarType}
                onChange={(e) => setMortarType(e.target.value as 'modified' | 'unmodified' | 'epoxy')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="modified">Modified Thinset</option>
                <option value="unmodified">Unmodified Thinset</option>
                <option value="epoxy">Epoxy Mortar</option>
              </select>
            </div>

            <div>
              <label htmlFor="groutType" className="block text-sm font-medium text-slate-700 mb-1">
                Grout Type
              </label>
              <select
                id="groutType"
                value={groutType}
                onChange={(e) => setGroutType(e.target.value as 'sanded' | 'unsanded' | 'epoxy')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="sanded">Sanded Grout</option>
                <option value="unsanded">Unsanded Grout</option>
                <option value="epoxy">Epoxy Grout</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Options</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="wasteFactor" className="block text-sm font-medium text-slate-700 mb-1">
                Waste Factor
              </label>
              <select
                id="wasteFactor"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(Number(e.target.value) as 10 | 15 | 20)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={10}>10% - Simple layout</option>
                <option value={15}>15% - Average complexity</option>
                <option value={20}>20% - Complex layout</option>
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
                Include Backer Board
              </label>
            </div>

            {includeBackerBoard && (
              <div>
                <label htmlFor="backerBoardThickness" className="block text-sm font-medium text-slate-700 mb-1">
                  Backer Board Thickness
                </label>
                <select
                  id="backerBoardThickness"
                  value={backerBoardThickness}
                  onChange={(e) => setBackerBoardThickness(e.target.value as '1/4' | '1/2')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="1/4">1/4 inch</option>
                  <option value="1/2">1/2 inch</option>
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
                Include Waterproof Membrane
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
                Include Edge Trim
              </label>
            </div>

            {includeEdging && (
              <div>
                <label htmlFor="edgingType" className="block text-sm font-medium text-slate-700 mb-1">
                  Edge Trim Type
                </label>
                <select
                  id="edgingType"
                  value={edgingType}
                  onChange={(e) => setEdgingType(e.target.value as 'metal' | 'stone')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                
                >
                  <option value="metal">Metal Trim</option>
                  <option value="stone">Stone Trim</option>
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
        Calculate Materials
      </button>
    </div>
  );
};

export default TileCalculator;