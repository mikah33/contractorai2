import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Fence } from 'lucide-react';

interface Gate {
  id: string;
  width: number;
  height: number;
  type: 'single' | 'double' | 'rolling';
  material: string;
  includeHardware: boolean;
}

interface Corner {
  id: string;
  angle: number;
}

const FencingCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const [fenceType, setFenceType] = useState<'privacy' | 'picket' | 'chain-link' | 'ranch' | 'panel'>('privacy');
  const [material, setMaterial] = useState<'wood' | 'vinyl' | 'metal' | 'composite'>('wood');
  const [length, setLength] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [postSpacing, setPostSpacing] = useState<6 | 8>(8);
  const [gates, setGates] = useState<Gate[]>([]);
  const [corners, setCorners] = useState<Corner[]>([]);
  const [slopeType, setSlopeType] = useState<'level' | 'stepping' | 'racking'>('level');
  const [slopePercentage, setSlopePercentage] = useState<number | ''>('');
  const [includePostCaps, setIncludePostCaps] = useState(true);
  const [includeKickboard, setIncludeKickboard] = useState(false);
  const [postMountType, setPostMountType] = useState<'concrete' | 'spike' | 'bracket'>('concrete');
  const [concreteDepth, setConcreteDepth] = useState<number | ''>('');
  const [wasteFactor, setWasteFactor] = useState<10 | 15 | 20>(15);

  const materialPrices = {
    'privacy': {
      'wood': {
        'panel': 45.98,
        'post': 24.98,
        'rail': 12.98,
        'cap': 4.98
      },
      'vinyl': {
        'panel': 89.98,
        'post': 34.98,
        'rail': 19.98,
        'cap': 6.98
      },
      'metal': {
        'panel': 79.98,
        'post': 29.98,
        'rail': 16.98,
        'cap': 5.98
      },
      'composite': {
        'panel': 129.98,
        'post': 49.98,
        'rail': 24.98,
        'cap': 8.98
      }
    },
    'picket': {
      'wood': {
        'picket': 2.98,
        'post': 19.98,
        'rail': 9.98,
        'cap': 3.98
      },
      'vinyl': {
        'picket': 4.98,
        'post': 29.98,
        'rail': 14.98,
        'cap': 5.98
      },
      'metal': {
        'picket': 3.98,
        'post': 24.98,
        'rail': 12.98,
        'cap': 4.98
      },
      'composite': {
        'picket': 6.98,
        'post': 39.98,
        'rail': 19.98,
        'cap': 7.98
      }
    },
    'chain-link': {
      'metal': {
        'fabric': 5.98,
        'post': 19.98,
        'rail': 8.98,
        'cap': 2.98
      }
    },
    'ranch': {
      'wood': {
        'rail': 14.98,
        'post': 24.98,
        'cap': 4.98
      },
      'vinyl': {
        'rail': 24.98,
        'post': 34.98,
        'cap': 6.98
      }
    },
    'panel': {
      'wood': {
        'panel': 69.98,
        'post': 24.98,
        'cap': 4.98
      },
      'vinyl': {
        'panel': 129.98,
        'post': 34.98,
        'cap': 6.98
      },
      'composite': {
        'panel': 189.98,
        'post': 49.98,
        'cap': 8.98
      }
    }
  };

  const gatePrices = {
    'single': {
      'wood': 129.98,
      'vinyl': 199.98,
      'metal': 169.98,
      'composite': 249.98
    },
    'double': {
      'wood': 249.98,
      'vinyl': 399.98,
      'metal': 329.98,
      'composite': 499.98
    },
    'rolling': {
      'wood': 399.98,
      'vinyl': 599.98,
      'metal': 499.98,
      'composite': 799.98
    }
  };

  const gateHardwarePrices = {
    'single': 49.98,
    'double': 89.98,
    'rolling': 149.98
  };

  const addGate = (type: Gate['type']) => {
    const defaultHeight = typeof height === 'number' ? height : 72;
    const defaultWidth = type === 'single' ? 36 : type === 'double' ? 72 : 120;

    const newGate: Gate = {
      id: Date.now().toString(),
      width: defaultWidth,
      height: defaultHeight,
      type,
      material,
      includeHardware: true
    };
    setGates([...gates, newGate]);
  };

  const updateGate = (id: string, updates: Partial<Gate>) => {
    setGates(gates.map(gate => 
      gate.id === id ? { ...gate, ...updates } : gate
    ));
  };

  const removeGate = (id: string) => {
    setGates(gates.filter(gate => gate.id !== id));
  };

  const addCorner = () => {
    const newCorner: Corner = {
      id: Date.now().toString(),
      angle: 90
    };
    setCorners([...corners, newCorner]);
  };

  const updateCorner = (id: string, updates: Partial<Corner>) => {
    setCorners(corners.map(corner => 
      corner.id === id ? { ...corner, ...updates } : corner
    ));
  };

  const removeCorner = (id: string) => {
    setCorners(corners.filter(corner => corner.id !== id));
  };

  const handleCalculate = () => {
    if (typeof length === 'number' && typeof height === 'number') {
      const results: CalculationResult[] = [];
      let totalCost = 0;

      // Calculate posts needed
      const postCount = Math.ceil(length / postSpacing) + 1 + corners.length;
      const postHeight = height + (postMountType === 'concrete' ? 24 : 0); // Add 2ft for concrete depth
      const postPrice = materialPrices[fenceType][material]?.post || 0;
      const postCost = postCount * postPrice;
      totalCost += postCost;

      results.push({
        label: `${material.charAt(0).toUpperCase() + material.slice(1)} Posts`,
        value: postCount,
        unit: 'posts',
        cost: postCost
      });

      // Calculate post caps if included
      if (includePostCaps) {
        const capPrice = materialPrices[fenceType][material]?.cap || 0;
        const capCost = postCount * capPrice;
        totalCost += capCost;

        results.push({
          label: 'Post Caps',
          value: postCount,
          unit: 'caps',
          cost: capCost
        });
      }

      // Calculate concrete if needed
      if (postMountType === 'concrete' && typeof concreteDepth === 'number') {
        const concretePerPost = (concreteDepth * 0.33); // cubic feet per post (12" diameter hole)
        const totalConcrete = (concretePerPost * postCount) / 27; // convert to cubic yards
        const concreteCost = Math.ceil(totalConcrete * 4) * 6.98; // 60lb bags at $6.98 each
        totalCost += concreteCost;

        results.push({
          label: 'Concrete Mix',
          value: Math.ceil(totalConcrete * 4),
          unit: '60lb bags',
          cost: concreteCost
        });
      } else if (postMountType === 'spike') {
        const spikeCost = postCount * 12.98;
        totalCost += spikeCost;

        results.push({
          label: 'Post Spikes',
          value: postCount,
          unit: 'pieces',
          cost: spikeCost
        });
      } else if (postMountType === 'bracket') {
        const bracketCost = postCount * 14.98;
        totalCost += bracketCost;

        results.push({
          label: 'Post Mounting Brackets',
          value: postCount,
          unit: 'pieces',
          cost: bracketCost
        });
      }

      // Calculate fencing materials based on type
      if (fenceType === 'privacy' || fenceType === 'panel') {
        const panelPrice = materialPrices[fenceType][material]?.panel || 0;
        const panelsNeeded = Math.ceil(length / 8); // Standard 8ft panels
        const panelCost = panelsNeeded * panelPrice;
        totalCost += panelCost;

        results.push({
          label: `${material.charAt(0).toUpperCase() + material.slice(1)} Panels`,
          value: panelsNeeded,
          unit: '8ft panels',
          cost: panelCost
        });
      } else if (fenceType === 'picket') {
        const picketPrice = materialPrices.picket[material]?.picket || 0;
        const picketsPerFoot = 2; // Standard spacing
        const picketsNeeded = Math.ceil(length * picketsPerFoot);
        const picketCost = picketsNeeded * picketPrice;
        totalCost += picketCost;

        results.push({
          label: `${material.charAt(0).toUpperCase() + material.slice(1)} Pickets`,
          value: picketsNeeded,
          unit: 'pickets',
          cost: picketCost
        });
      } else if (fenceType === 'chain-link') {
        const fabricPrice = materialPrices['chain-link'].metal.fabric;
        const fabricNeeded = length * height / 9; // Convert to square yards
        const fabricCost = fabricNeeded * fabricPrice;
        totalCost += fabricCost;

        results.push({
          label: 'Chain Link Fabric',
          value: Number(fabricNeeded.toFixed(2)),
          unit: 'square yards',
          cost: fabricCost
        });
      }

      // Calculate rails if needed
      if (fenceType !== 'panel') {
        const railsPerSection = fenceType === 'ranch' ? 3 : 2;
        const railPrice = materialPrices[fenceType][material]?.rail || 0;
        const railsNeeded = Math.ceil(length / 8) * railsPerSection;
        const railCost = railsNeeded * railPrice;
        totalCost += railCost;

        results.push({
          label: `${material.charAt(0).toUpperCase() + material.slice(1)} Rails`,
          value: railsNeeded,
          unit: '8ft pieces',
          cost: railCost
        });
      }

      // Calculate kickboard if included
      if (includeKickboard) {
        const kickboardPrice = 8.98;
        const kickboardPieces = Math.ceil(length / 8);
        const kickboardCost = kickboardPieces * kickboardPrice;
        totalCost += kickboardCost;

        results.push({
          label: 'Kickboard',
          value: kickboardPieces,
          unit: '8ft pieces',
          cost: kickboardCost
        });
      }

      // Calculate gates
      gates.forEach(gate => {
        const gatePrice = gatePrices[gate.type][gate.material];
        const gateCost = gatePrice;
        totalCost += gateCost;

        results.push({
          label: `${gate.type.charAt(0).toUpperCase() + gate.type.slice(1)} Gate`,
          value: 1,
          unit: 'unit',
          cost: gateCost
        });

        if (gate.includeHardware) {
          const hardwareCost = gateHardwarePrices[gate.type];
          totalCost += hardwareCost;

          results.push({
            label: `${gate.type.charAt(0).toUpperCase() + gate.type.slice(1)} Gate Hardware`,
            value: 1,
            unit: 'set',
            cost: hardwareCost
          });
        }
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
    (!includeKickboard || typeof height === 'number') &&
    (postMountType !== 'concrete' || typeof concreteDepth === 'number');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Fence className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">Fencing Calculator</h2>
      </div>
      
      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="fenceType" className="block text-sm font-medium text-slate-700 mb-1">
              Fence Type
            </label>
            <select
              id="fenceType"
              value={fenceType}
              onChange={(e) => setFenceType(e.target.value as typeof fenceType)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="privacy">Privacy Fence</option>
              <option value="picket">Picket Fence</option>
              <option value="chain-link">Chain Link Fence</option>
              <option value="ranch">Ranch Rail Fence</option>
              <option value="panel">Panel Fence</option>
            </select>
          </div>

          <div>
            <label htmlFor="material" className="block text-sm font-medium text-slate-700 mb-1">
              Material
            </label>
            <select
              id="material"
              value={material}
              onChange={(e) => setMaterial(e.target.value as typeof material)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {fenceType !== 'chain-link' && (
                <>
                  <option value="wood">Wood</option>
                  <option value="vinyl">Vinyl</option>
                  {fenceType !== 'ranch' && <option value="composite">Composite</option>}
                </>
              )}
              {(fenceType === 'chain-link' || fenceType === 'picket') && (
                <option value="metal">Metal</option>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              Total Length (feet)
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter fence length"
            />
          </div>

          <div>
            <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
              Height (inches)
            </label>
            <input
              type="number"
              id="height"
              min="0"
              step="1"
              value={height}
              onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter fence height"
            />
          </div>

          <div>
            <label htmlFor="postSpacing" className="block text-sm font-medium text-slate-700 mb-1">
              Post Spacing
            </label>
            <select
              id="postSpacing"
              value={postSpacing}
              onChange={(e) => setPostSpacing(Number(e.target.value) as 6 | 8)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value={6}>6 feet</option>
              <option value={8}>8 feet</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Gates</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => addGate('single')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add Single Gate
              </button>
              <button
                onClick={() => addGate('double')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add Double Gate
              </button>
              <button
                onClick={() => addGate('rolling')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Add Rolling Gate
              </button>
            </div>
          </div>

          {gates.map(gate => (
            <div key={gate.id} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Gate Width (inches)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={gate.width}
                    onChange={(e) => updateGate(gate.id, { width: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Gate Height (inches)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={gate.height}
                    onChange={(e) => updateGate(gate.id, { height: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Material
                  </label>
                  <select
                    value={gate.material}
                    onChange={(e) => updateGate(gate.id, { material: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="wood">Wood</option>
                    <option value="vinyl">Vinyl</option>
                    <option value="metal">Metal</option>
                    <option value="composite">Composite</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gate.includeHardware}
                    onChange={(e) => updateGate(gate.id, { includeHardware: e.target.checked })}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-slate-700">
                    Include Hardware
                  </label>
                </div>
              </div>

              <button
                onClick={() => removeGate(gate.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                Remove Gate
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Corners</h3>
            <button
              onClick={addCorner}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Add Corner
            </button>
          </div>

          {corners.map(corner => (
            <div key={corner.id} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Corner Angle (degrees)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  step="1"
                  value={corner.angle}
                  onChange={(e) => updateCorner(corner.id, { angle: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
              </div>

              <button
                onClick={() => removeCorner(corner.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                Remove Corner
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Terrain & Installation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="slopeType" className="block text-sm font-medium text-slate-700 mb-1">
                Slope Type
              </label>
              <select
                id="slopeType"
                value={slopeType}
                onChange={(e) => setSlopeType(e.target.value as typeof slopeType)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="level">Level Ground</option>
                <option value="stepping">Stepping</option>
                <option value="racking">Racking</option>
              </select>
            </div>

            {slopeType !== 'level' && (
              <div>
                <label htmlFor="slopePercentage" className="block text-sm font-medium text-slate-700 mb-1">
                  Slope Percentage
                </label>
                <input
                  type="number"
                  id="slopePercentage"
                  min="0"
                  max="100"
                  step="1"
                  value={slopePercentage}
                  onChange={(e) => setSlopePercentage(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter slope percentage"
                />
              </div>
            )}

            <div>
              <label htmlFor="postMountType" className="block text-sm font-medium text-slate-700 mb-1">
                Post Mounting Method
              </label>
              <select
                id="postMountType"
                value={postMountType}
                onChange={(e) => setPostMountType(e.target.value as typeof postMountType)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="concrete">Concrete</option>
                <option value="spike">Ground Spike</option>
                <option value="bracket">Surface Mount Bracket</option>
              </select>
            </div>

            {postMountType === 'concrete' && (
              <div>
                <label htmlFor="concreteDepth" className="block text-sm font-medium text-slate-700 mb-1">
                  Post Hole Depth (inches)
                </label>
                <input
                  type="number"
                  id="concreteDepth"
                  min="0"
                  step="1"
                  value={concreteDepth}
                  onChange={(e) => setConcreteDepth(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter post hole depth"
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includePostCaps"
                checked={includePostCaps}
                onChange={(e) => setIncludePostCaps(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includePostCaps" className="ml-2 block text-sm font-medium text-slate-700">
                Include Post Caps
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeKickboard"
                checked={includeKickboard}
                onChange={(e) => setIncludeKickboard(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeKickboard" className="ml-2 block text-sm font-medium text-slate-700">
                Include Kickboard
              </label>
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
                <option value={10}>10% - Simple layout</option>
                <option value={15}>15% - Average complexity</option>
                <option value={20}>20% - Complex layout</option>
              </select>
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

export default FencingCalculator;