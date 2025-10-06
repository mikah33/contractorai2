import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Warehouse } from 'lucide-react';

type RoofMaterial = 'asphalt' | 'metal' | 'tile' | 'slate' | 'tpo' | 'epdm' | 'wood';
type RoofType = 'gable' | 'hip' | 'flat' | 'mansard' | 'gambrel' | 'shed';

const RoofingCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  // State management
  const [roofArea, setRoofArea] = useState<number | ''>('');
  const [roofType, setRoofType] = useState<RoofType>('gable');
  const [material, setMaterial] = useState<RoofMaterial>('asphalt');
  const [pitch, setPitch] = useState('6:12');
  const [stories, setStories] = useState('1');
  const [layers, setLayers] = useState<number | ''>('');
  const [skylights, setSkylights] = useState<number | ''>('');
  const [chimneys, setChimneys] = useState<number | ''>('');
  const [valleys, setValleys] = useState<number | ''>('');
  const [includeVentilation, setIncludeVentilation] = useState(false);
  const [includeIceShield, setIncludeIceShield] = useState(true);
  const [includeWarranty, setIncludeWarranty] = useState(false);

  // Material pricing (price per square - 100 sq ft)
  const materialPrices: Record<RoofMaterial, number> = {
    asphalt: 130,
    metal: 575,
    tile: 450,
    slate: 800,
    tpo: 280,
    epdm: 220,
    wood: 400
  };

  // Pitch multipliers (affects labor difficulty)
  const pitchMultipliers: Record<string, number> = {
    '1:12': 1.0,
    '2:12': 1.0,
    '3:12': 1.0,
    '4:12': 1.0,
    '5:12': 1.0,
    '6:12': 1.15,
    '7:12': 1.15,
    '8:12': 1.35,
    '9:12': 1.35,
    '10:12': 1.6,
    '11:12': 1.6,
    '12:12': 1.6
  };

  // Story height multipliers (affects labor cost)
  const storyMultipliers: Record<string, number> = {
    '1': 1.0,
    '2': 1.25,
    '3': 1.5
  };

  // Complexity multipliers based on roof type
  const complexityMultipliers: Record<RoofType, number> = {
    'flat': 1.0,
    'gable': 1.0,
    'shed': 1.0,
    'hip': 1.15,
    'mansard': 1.3,
    'gambrel': 1.3
  };

  const handleCalculate = () => {
    if (!roofArea || roofArea <= 0) {
      alert('Please enter roof area in square feet');
      return;
    }

    const results: CalculationResult[] = [];
    const area = Number(roofArea);
    const squares = area / 100; // Convert to roofing squares

    // 1. Roof Area
    results.push({
      label: 'Roof Area',
      value: area,
      unit: 'sqft',
      cost: 0
    });

    // 2. Roofing Material
    const materialCost = squares * materialPrices[material];
    results.push({
      label: `${getMaterialName(material)}`,
      value: squares,
      unit: 'squares',
      cost: materialCost
    });

    // 3. Underlayment
    const underlaymentCost = squares * 26;
    results.push({
      label: 'Synthetic Underlayment',
      value: squares,
      unit: 'squares',
      cost: underlaymentCost
    });

    // 4. Ice & Water Shield
    if (includeIceShield) {
      const rolls = Math.ceil(area / 200);
      results.push({
        label: 'Ice & Water Shield',
        value: rolls,
        unit: 'rolls',
        cost: rolls * 70
      });
    }

    // 5. Ridge Cap (estimate 10% of area as linear feet)
    const ridgeFeet = area * 0.1;
    results.push({
      label: 'Ridge Cap Shingles',
      value: ridgeFeet,
      unit: 'linear feet',
      cost: ridgeFeet * 3.25
    });

    // 6. Drip Edge (estimate perimeter)
    const dripEdgeFeet = Math.sqrt(area) * 4; // Rough perimeter estimate
    results.push({
      label: 'Drip Edge',
      value: dripEdgeFeet,
      unit: 'linear feet',
      cost: dripEdgeFeet * 2.5
    });

    // 7. Starter Strips
    const starterBundles = Math.ceil(dripEdgeFeet / 90);
    results.push({
      label: 'Starter Strips',
      value: starterBundles,
      unit: 'bundles',
      cost: starterBundles * 37
    });

    // 8. Pipe Boots (estimate 2-4 based on area)
    const pipeBoots = area > 2000 ? 4 : 2;
    results.push({
      label: 'Pipe Boots',
      value: pipeBoots,
      unit: 'each',
      cost: pipeBoots * 12
    });

    // 9. Nails & Fasteners
    results.push({
      label: 'Nails & Fasteners',
      value: squares,
      unit: 'squares',
      cost: squares * 32
    });

    // 10. Installation Labor
    const baseHoursPerSquare = 3.5;
    const pitchMult = pitchMultipliers[pitch] || 1.0;
    const storyMult = storyMultipliers[stories] || 1.0;
    const complexMult = complexityMultipliers[roofType] || 1.0;

    const installHours = squares * baseHoursPerSquare * pitchMult * storyMult * complexMult;
    const laborRate = 85;

    results.push({
      label: 'Installation Labor',
      value: installHours,
      unit: 'hours',
      cost: installHours * laborRate
    });

    // 11. Tear-Off Labor (if layers to remove)
    if (layers && layers > 0) {
      const tearOffHoursPerSquare = 1.2;
      const tearOffHours = squares * tearOffHoursPerSquare * Number(layers) * pitchMult * storyMult;
      results.push({
        label: `Tear-Off Labor (${layers} layer${layers > 1 ? 's' : ''})`,
        value: tearOffHours,
        unit: 'hours',
        cost: tearOffHours * laborRate
      });
    }

    // 12. Chimney Flashing
    if (chimneys && chimneys > 0) {
      const chimneyHours = 3 * Number(chimneys);
      results.push({
        label: 'Chimney Flashing',
        value: Number(chimneys),
        unit: chimneys > 1 ? 'chimneys' : 'chimney',
        cost: chimneyHours * laborRate
      });
    }

    // 13. Skylight Flashing
    if (skylights && skylights > 0) {
      const skylightHours = 2 * Number(skylights);
      results.push({
        label: 'Skylight Flashing',
        value: Number(skylights),
        unit: skylights > 1 ? 'skylights' : 'skylight',
        cost: skylightHours * laborRate
      });
    }

    // 14. Valley Flashing
    if (valleys && valleys > 0) {
      const valleyFeet = Number(valleys) * 20; // Estimate 20 LF per valley
      results.push({
        label: 'Valley Flashing',
        value: valleyFeet,
        unit: 'linear feet',
        cost: valleyFeet * 3.5
      });
    }

    // 15. Ventilation System
    if (includeVentilation) {
      results.push({
        label: 'Ventilation System (Ridge & Soffit)',
        value: 1,
        unit: 'system',
        cost: 625
      });
    }

    // 16. Extended Warranty
    if (includeWarranty) {
      results.push({
        label: 'Extended Manufacturer Warranty',
        value: squares,
        unit: 'squares',
        cost: squares * 27
      });
    }

    // 17. Disposal (if tear-off)
    if (layers && layers > 0) {
      results.push({
        label: 'Debris Disposal',
        value: squares,
        unit: 'squares',
        cost: squares * 32
      });
    }

    // 18. Total
    const totalCost = results.reduce((sum, item) => sum + item.cost, 0);
    results.push({
      label: 'Total Estimate',
      value: 1,
      unit: 'project',
      cost: totalCost,
      isTotal: true
    });

    onCalculate(results);
  };

  const getMaterialName = (mat: RoofMaterial): string => {
    const names: Record<RoofMaterial, string> = {
      asphalt: 'Architectural Shingles',
      metal: 'Metal Roofing (Standing Seam)',
      tile: 'Clay/Concrete Tile',
      slate: 'Natural Slate',
      tpo: 'TPO Membrane',
      epdm: 'EPDM Rubber',
      wood: 'Cedar Wood Shakes'
    };
    return names[mat];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <Warehouse className="h-6 w-6 text-orange-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Roofing Calculator</h2>
      </div>

      <div className="space-y-6">
        {/* Manual Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roof Area (sq ft) *
            </label>
            <input
              type="number"
              value={roofArea}
              onChange={(e) => setRoofArea(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder="Enter roof square footage"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roof Type *
            </label>
            <select
              value={roofType}
              onChange={(e) => setRoofType(e.target.value as RoofType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="gable">Gable</option>
              <option value="hip">Hip</option>
              <option value="flat">Flat</option>
              <option value="mansard">Mansard</option>
              <option value="gambrel">Gambrel</option>
              <option value="shed">Shed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roofing Material *
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as RoofMaterial)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="asphalt">Asphalt Shingles - $130/sq</option>
              <option value="metal">Metal Roofing - $575/sq</option>
              <option value="tile">Clay/Concrete Tile - $450/sq</option>
              <option value="slate">Slate - $800/sq</option>
              <option value="tpo">TPO (Flat) - $280/sq</option>
              <option value="epdm">EPDM Rubber - $220/sq</option>
              <option value="wood">Wood Shakes - $400/sq</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roof Pitch *
            </label>
            <select
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="1:12">1:12 (Nearly Flat)</option>
              <option value="2:12">2:12</option>
              <option value="3:12">3:12</option>
              <option value="4:12">4:12 (Low Pitch)</option>
              <option value="5:12">5:12</option>
              <option value="6:12">6:12 (Standard)</option>
              <option value="7:12">7:12</option>
              <option value="8:12">8:12 (Steep)</option>
              <option value="9:12">9:12</option>
              <option value="10:12">10:12</option>
              <option value="12:12">12:12 (45°)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Stories
            </label>
            <select
              value={stories}
              onChange={(e) => setStories(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="1">1 Story</option>
              <option value="2">2 Stories</option>
              <option value="3">3+ Stories</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Layers to Remove
            </label>
            <input
              type="number"
              value={layers}
              onChange={(e) => setLayers(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skylights
            </label>
            <input
              type="number"
              value={skylights}
              onChange={(e) => setSkylights(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chimneys
            </label>
            <input
              type="number"
              value={chimneys}
              onChange={(e) => setChimneys(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valleys
            </label>
            <input
              type="number"
              value={valleys}
              onChange={(e) => setValleys(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Optional Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Optional Features</h3>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVentilation}
              onChange={(e) => setIncludeVentilation(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Ventilation Upgrade (Ridge & Soffit Vents)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeIceShield}
              onChange={(e) => setIncludeIceShield(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Ice & Water Shield (Recommended)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeWarranty}
              onChange={(e) => setIncludeWarranty(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Extended Manufacturer Warranty</span>
          </label>
        </div>

        <button
          onClick={handleCalculate}
          className="w-full py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
        >
          Calculate Roofing Materials & Labor
        </button>
      </div>
    </div>
  );
};

export default RoofingCalculator;
