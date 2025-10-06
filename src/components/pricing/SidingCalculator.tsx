import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

  const getSidingPrice = () => {
    const prices = {
      'vinyl': {
        'lap': 89.98,        // per square (100 sq ft)
        'dutch-lap': 99.98,  // per square
        'vertical': 109.98,  // per square
        'shake': 129.98      // per square
      },
      'fiber-cement': {
        'lap': 159.98,       // per square
        'dutch-lap': 169.98, // per square
        'vertical': 179.98,  // per square
        'shake': 199.98      // per square
      },
      'wood': {
        'lap': 199.98,       // per square
        'dutch-lap': 209.98, // per square
        'vertical': 219.98,  // per square
        'shake': 239.98      // per square
      },
      'metal': {
        'lap': 149.98,       // per square
        'dutch-lap': 159.98, // per square
        'vertical': 139.98,  // per square
        'shake': 189.98      // per square
      },
      'engineered-wood': {
        'lap': 179.98,       // per square
        'dutch-lap': 189.98, // per square
        'vertical': 199.98,  // per square
        'shake': 219.98      // per square
      }
    };
    return prices[sidingType][sidingProfile];
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
        label: 'Total Wall Area',
        value: Number(totalWallArea.toFixed(2)),
        unit: 'square feet'
      },
      {
        label: `${sidingType.replace('-', ' ').replace(/(^\w|\s\w)/g, l => l.toUpperCase())} Siding (${sidingProfile.replace('-', ' ')})`,
        value: squaresNeeded,
        unit: 'squares',
        cost: sidingCost
      }
    );

    // Calculate house wrap if included
    if (includeHouseWrap) {
      const wrapRolls = Math.ceil(totalWallArea / 1000); // 1000 sq ft per roll
      const wrapCost = wrapRolls * 159.98;
      totalCost += wrapCost;

      results.push({
        label: 'House Wrap',
        value: wrapRolls,
        unit: '1000sf rolls',
        cost: wrapCost
      });

      // House wrap tape
      const tapeRolls = Math.ceil(totalPerimeter / 165); // 165 linear feet per roll
      const tapeCost = tapeRolls * 12.98;
      totalCost += tapeCost;

      results.push({
        label: 'House Wrap Tape',
        value: tapeRolls,
        unit: 'rolls',
        cost: tapeCost
      });
    }

    // Calculate insulation if included
    if (includeInsulation) {
      const insulationBundles = Math.ceil(totalWallArea / 100); // 100 sq ft per bundle
      const insulationCost = insulationBundles * 49.98;
      totalCost += insulationCost;

      results.push({
        label: 'Foam Insulation',
        value: insulationBundles,
        unit: 'bundles',
        cost: insulationCost
      });
    }

    // Calculate starter strip if included
    if (includeStarter) {
      const starterPieces = Math.ceil(totalPerimeter / 12); // 12ft pieces
      const starterCost = starterPieces * 6.98;
      totalCost += starterCost;

      results.push({
        label: 'Starter Strip',
        value: starterPieces,
        unit: '12ft pieces',
        cost: starterCost
      });
    }

    // Calculate J-channel if included
    if (includeJChannel) {
      const jChannelPieces = Math.ceil((totalOpeningsPerimeter + totalPerimeter) / 12.5); // 12.5ft pieces
      const jChannelCost = jChannelPieces * 8.98;
      totalCost += jChannelCost;

      results.push({
        label: 'J-Channel',
        value: jChannelPieces,
        unit: '12.5ft pieces',
        cost: jChannelCost
      });
    }

    // Calculate corner posts if included
    if (includeCorners) {
      const cornerHeight = Math.max(...walls.map(w => w.height));
      const cornerPosts = Math.ceil((cornerHeight * 4) / 10); // 10ft pieces
      const cornerCost = cornerPosts * 19.98;
      totalCost += cornerCost;

      results.push({
        label: 'Corner Posts',
        value: cornerPosts,
        unit: '10ft pieces',
        cost: cornerCost
      });
    }

    // Calculate trim if included
    if (includeTrim) {
      const trimPrices = {
        'vinyl': 8.98,
        'wood': 12.98,
        'aluminum': 15.98,
        'fiber-cement': 19.98
      };
      
      const trimPieces = Math.ceil(totalOpeningsPerimeter / 16); // 16ft pieces
      const trimCost = trimPieces * trimPrices[trimType];
      totalCost += trimCost;

      results.push({
        label: `${trimType.replace('-', ' ').replace(/(^\w|\s\w)/g, l => l.toUpperCase())} Trim`,
        value: trimPieces,
        unit: '16ft pieces',
        cost: trimCost
      });
    }

    // Calculate fasteners
    const fastenersPerSquare = 250;
    const fastenerBoxes = Math.ceil((squaresNeeded * fastenersPerSquare) / 1000); // 1000 per box
    const fastenerCost = fastenerBoxes * 29.98;
    totalCost += fastenerCost;

    results.push({
      label: 'Siding Fasteners',
      value: fastenerBoxes,
      unit: '1000ct boxes',
      cost: fastenerCost
    });

    // Add total cost
    results.push({
      label: 'Total Estimated Cost',
      value: Number(totalCost.toFixed(2)),
      unit: 'USD',
      isTotal: true
    });

    onCalculate(results);
  };

  const isFormValid = walls.length > 0 && walls.every(wall => 
    typeof wall.length === 'number' && wall.length > 0 &&
    typeof wall.height === 'number' && wall.height > 0 &&
    (!wall.isGable || typeof wall.gableHeight === 'number')
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Square className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.siding.title')}</h2>
      </div>
      
      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="sidingType" className="block text-sm font-medium text-slate-700 mb-1">
              Siding Material
            </label>
            <select
              id="sidingType"
              value={sidingType}
              onChange={(e) => setSidingType(e.target.value as SidingType)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="vinyl">Vinyl Siding</option>
              <option value="fiber-cement">Fiber Cement Siding</option>
              <option value="wood">Wood Siding</option>
              <option value="metal">Metal Siding</option>
              <option value="engineered-wood">Engineered Wood Siding</option>
            </select>
          </div>

          <div>
            <label htmlFor="sidingProfile" className="block text-sm font-medium text-slate-700 mb-1">
              Siding Profile
            </label>
            <select
              id="sidingProfile"
              value={sidingProfile}
              onChange={(e) => setSidingProfile(e.target.value as SidingProfile)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="lap">Traditional Lap</option>
              <option value="dutch-lap">Dutch Lap</option>
              <option value="vertical">Vertical (Board & Batten)</option>
              <option value="shake">Shake/Shingle</option>
            </select>
          </div>

          <div>
            <label htmlFor="sidingExposure" className="block text-sm font-medium text-slate-700 mb-1">
              Exposure (inches)
            </label>
            <select
              id="sidingExposure"
              value={sidingExposure}
              onChange={(e) => setSidingExposure(Number(e.target.value) as 4 | 5 | 6 | 7 | 8)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value={4}>4" Exposure</option>
              <option value={5}>5" Exposure</option>
              <option value={6}>6" Exposure</option>
              <option value={7}>7" Exposure</option>
              <option value={8}>8" Exposure</option>
            </select>
          </div>

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
              <option value={10}>10% - Simple walls, few cuts</option>
              <option value={15}>15% - Average complexity</option>
              <option value={20}>20% - Complex layout, many cuts</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Walls</h3>
            <button
              onClick={addWall}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              Add Wall
            </button>
          </div>

          {walls.map(wall => (
            <div key={wall.id} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Wall Length (feet)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={wall.length || ''}
                    onChange={(e) => updateWall(wall.id, { length: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Enter wall length"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Wall Height (feet)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={wall.height || ''}
                    onChange={(e) => updateWall(wall.id, { height: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Enter wall height"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={wall.isGable}
                    onChange={(e) => updateWall(wall.id, { isGable: e.target.checked })}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-slate-700">
                    Is Gable Wall
                  </label>
                </div>

                {wall.isGable && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Gable Height (feet)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={wall.gableHeight || ''}
                      onChange={(e) => updateWall(wall.id, { gableHeight: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder="Enter gable height"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-slate-700">Openings</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => addOpening(wall.id, 'door')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
                    >
                      Add Door
                    </button>
                    <button
                      onClick={() => addOpening(wall.id, 'window')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
                    >
                      Add Window
                    </button>
                    <button
                      onClick={() => addOpening(wall.id, 'garage')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
                    >
                      Add Garage
                    </button>
                    <button
                      onClick={() => addOpening(wall.id, 'custom')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
                    >
                      Add Custom
                    </button>
                  </div>
                </div>

                {wall.openings.map((opening, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 p-2 bg-white rounded">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Width (feet)
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
                        Height (feet)
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
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => removeWall(wall.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                Remove Wall
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeHouseWrap"
                checked={includeHouseWrap}
                onChange={(e) => setIncludeHouseWrap(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeHouseWrap" className="ml-2 block text-sm font-medium text-slate-700">
                Include House Wrap
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeInsulation"
                checked={includeInsulation}
                onChange={(e) => setIncludeInsulation(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeInsulation" className="ml-2 block text-sm font-medium text-slate-700">
                Include Foam Insulation
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeStarter"
                checked={includeStarter}
                onChange={(e) => setIncludeStarter(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeStarter" className="ml-2 block text-sm font-medium text-slate-700">
                Include Starter Strip
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeJChannel"
                checked={includeJChannel}
                onChange={(e) => setIncludeJChannel(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeJChannel" className="ml-2 block text-sm font-medium text-slate-700">
                Include J-Channel
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeCorners"
                checked={includeCorners}
                onChange={(e) => setIncludeCorners(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeCorners" className="ml-2 block text-sm font-medium text-slate-700">
                Include Corner Posts
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeTrim"
                checked={includeTrim}
                onChange={(e) => setIncludeTrim(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeTrim" className="ml-2 block text-sm font-medium text-slate-700">
                Include Trim
              </label>
            </div>

            {includeTrim && (
              <div>
                <label htmlFor="trimType" className="block text-sm font-medium text-slate-700 mb-1">
                  Trim Material
                </label>
                <select
                  id="trimType"
                  value={trimType}
                  onChange={(e) => setTrimType(e.target.value as TrimType)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="vinyl">Vinyl Trim</option>
                  <option value="wood">Wood Trim</option>
                  <option value="aluminum">Aluminum Trim</option>
                  <option value="fiber-cement">Fiber Cement Trim</option>
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

export default SidingCalculator;