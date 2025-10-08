import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Warehouse } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type RoofMaterial = 'asphalt' | 'metal' | 'tile' | 'slate' | 'tpo' | 'epdm' | 'wood';
type RoofType = 'gable' | 'hip' | 'flat' | 'mansard' | 'gambrel' | 'shed';

const RoofingCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
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
      alert(t('calculators.roofing.alerts.enterRoofArea'));
      return;
    }

    const results: CalculationResult[] = [];
    const area = Number(roofArea);
    const squares = area / 100; // Convert to roofing squares

    // 1. Roof Area
    results.push({
      label: t('calculators.roofing.results.roofArea'),
      value: area,
      unit: t('calculators.roofing.units.sqft'),
      cost: 0
    });

    // 2. Roofing Material
    const materialCost = squares * materialPrices[material];
    results.push({
      label: getMaterialName(material),
      value: squares,
      unit: t('calculators.roofing.units.squares'),
      cost: materialCost
    });

    // 3. Underlayment
    const underlaymentCost = squares * 26;
    results.push({
      label: t('calculators.roofing.results.syntheticUnderlayment'),
      value: squares,
      unit: t('calculators.roofing.units.squares'),
      cost: underlaymentCost
    });

    // 4. Ice & Water Shield
    if (includeIceShield) {
      const rolls = Math.ceil(area / 200);
      results.push({
        label: t('calculators.roofing.results.iceWaterShield'),
        value: rolls,
        unit: t('calculators.roofing.units.rolls'),
        cost: rolls * 70
      });
    }

    // 5. Ridge Cap (estimate 10% of area as linear feet)
    const ridgeFeet = area * 0.1;
    results.push({
      label: t('calculators.roofing.results.ridgeCapShingles'),
      value: ridgeFeet,
      unit: t('calculators.roofing.units.linearFeet'),
      cost: ridgeFeet * 3.25
    });

    // 6. Drip Edge (estimate perimeter)
    const dripEdgeFeet = Math.sqrt(area) * 4; // Rough perimeter estimate
    results.push({
      label: t('calculators.roofing.results.dripEdge'),
      value: dripEdgeFeet,
      unit: t('calculators.roofing.units.linearFeet'),
      cost: dripEdgeFeet * 2.5
    });

    // 7. Starter Strips
    const starterBundles = Math.ceil(dripEdgeFeet / 90);
    results.push({
      label: t('calculators.roofing.results.starterStrips'),
      value: starterBundles,
      unit: t('calculators.roofing.units.bundles'),
      cost: starterBundles * 37
    });

    // 8. Pipe Boots (estimate 2-4 based on area)
    const pipeBoots = area > 2000 ? 4 : 2;
    results.push({
      label: t('calculators.roofing.results.pipeBoots'),
      value: pipeBoots,
      unit: t('calculators.roofing.units.each'),
      cost: pipeBoots * 12
    });

    // 9. Nails & Fasteners
    results.push({
      label: t('calculators.roofing.results.nailsFasteners'),
      value: squares,
      unit: t('calculators.roofing.units.squares'),
      cost: squares * 32
    });

    // Labor costs removed - materials only

    // 12. Chimney Flashing (materials only)
    if (chimneys && chimneys > 0) {
      results.push({
        label: t('calculators.roofing.results.chimneyFlashing'),
        value: Number(chimneys),
        unit: t('calculators.roofing.units.chimneys', { count: chimneys }),
        cost: Number(chimneys) * 150 // Material cost only
      });
    }

    // 13. Skylight Flashing (materials only)
    if (skylights && skylights > 0) {
      results.push({
        label: t('calculators.roofing.results.skylightFlashing'),
        value: Number(skylights),
        unit: t('calculators.roofing.units.skylights', { count: skylights }),
        cost: Number(skylights) * 85 // Material cost only
      });
    }

    // 14. Valley Flashing
    if (valleys && valleys > 0) {
      const valleyFeet = Number(valleys) * 20; // Estimate 20 LF per valley
      results.push({
        label: t('calculators.roofing.results.valleyFlashing'),
        value: valleyFeet,
        unit: t('calculators.roofing.units.linearFeet'),
        cost: valleyFeet * 3.5
      });
    }

    // 15. Ventilation System
    if (includeVentilation) {
      results.push({
        label: t('calculators.roofing.results.ventilationSystem'),
        value: 1,
        unit: t('calculators.roofing.units.system'),
        cost: 625
      });
    }

    // 16. Extended Warranty
    if (includeWarranty) {
      results.push({
        label: t('calculators.roofing.results.extendedWarranty'),
        value: squares,
        unit: t('calculators.roofing.units.squares'),
        cost: squares * 27
      });
    }

    // 17. Disposal (if tear-off)
    if (layers && layers > 0) {
      results.push({
        label: t('calculators.roofing.results.debrisDisposal'),
        value: squares,
        unit: t('calculators.roofing.units.squares'),
        cost: squares * 32
      });
    }

    // Don't add total as a line item - CalculatorResults component will calculate it
    // This prevents double-counting the total cost
    onCalculate(results);
  };

  const getMaterialName = (mat: RoofMaterial): string => {
    return t(`calculators.roofing.materials.${mat}`);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <Warehouse className="h-6 w-6 text-orange-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">{t('calculators.roofing.title')}</h2>
      </div>

      <div className="space-y-6">
        {/* Manual Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('calculators.roofing.roofArea')}
            </label>
            <input
              type="number"
              value={roofArea}
              onChange={(e) => setRoofArea(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder={t('calculators.roofing.roofAreaPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('calculators.roofing.roofType')}
            </label>
            <select
              value={roofType}
              onChange={(e) => setRoofType(e.target.value as RoofType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="gable">{t('calculators.roofing.roofTypes.gable')}</option>
              <option value="hip">{t('calculators.roofing.roofTypes.hip')}</option>
              <option value="flat">{t('calculators.roofing.roofTypes.flat')}</option>
              <option value="mansard">{t('calculators.roofing.roofTypes.mansard')}</option>
              <option value="gambrel">{t('calculators.roofing.roofTypes.gambrel')}</option>
              <option value="shed">{t('calculators.roofing.roofTypes.shed')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('calculators.roofing.roofingMaterial')}
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as RoofMaterial)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="asphalt">{t('calculators.roofing.materialOptions.asphalt')}</option>
              <option value="metal">{t('calculators.roofing.materialOptions.metal')}</option>
              <option value="tile">{t('calculators.roofing.materialOptions.tile')}</option>
              <option value="slate">{t('calculators.roofing.materialOptions.slate')}</option>
              <option value="tpo">{t('calculators.roofing.materialOptions.tpo')}</option>
              <option value="epdm">{t('calculators.roofing.materialOptions.epdm')}</option>
              <option value="wood">{t('calculators.roofing.materialOptions.wood')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('calculators.roofing.roofPitch')}
            </label>
            <select
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="1:12">{t('calculators.roofing.pitchOptions.1:12')}</option>
              <option value="2:12">{t('calculators.roofing.pitchOptions.2:12')}</option>
              <option value="3:12">{t('calculators.roofing.pitchOptions.3:12')}</option>
              <option value="4:12">{t('calculators.roofing.pitchOptions.4:12')}</option>
              <option value="5:12">{t('calculators.roofing.pitchOptions.5:12')}</option>
              <option value="6:12">{t('calculators.roofing.pitchOptions.6:12')}</option>
              <option value="7:12">{t('calculators.roofing.pitchOptions.7:12')}</option>
              <option value="8:12">{t('calculators.roofing.pitchOptions.8:12')}</option>
              <option value="9:12">{t('calculators.roofing.pitchOptions.9:12')}</option>
              <option value="10:12">{t('calculators.roofing.pitchOptions.10:12')}</option>
              <option value="12:12">{t('calculators.roofing.pitchOptions.12:12')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('calculators.roofing.numberOfStories')}
            </label>
            <select
              value={stories}
              onChange={(e) => setStories(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="1">{t('calculators.roofing.storiesOptions.1')}</option>
              <option value="2">{t('calculators.roofing.storiesOptions.2')}</option>
              <option value="3">{t('calculators.roofing.storiesOptions.3')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('calculators.roofing.layersToRemove')}
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
              {t('calculators.roofing.skylights')}
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
              {t('calculators.roofing.chimneys')}
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
              {t('calculators.roofing.valleys')}
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
          <h3 className="text-sm font-semibold text-gray-900">{t('calculators.roofing.optionalFeatures')}</h3>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVentilation}
              onChange={(e) => setIncludeVentilation(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">{t('calculators.roofing.ventilationUpgrade')}</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeIceShield}
              onChange={(e) => setIncludeIceShield(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">{t('calculators.roofing.iceWaterShieldOption')}</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeWarranty}
              onChange={(e) => setIncludeWarranty(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">{t('calculators.roofing.extendedWarrantyOption')}</span>
          </label>
        </div>

        <button
          onClick={handleCalculate}
          className="w-full py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
        >
          {t('calculators.calculateMaterials')}
        </button>
      </div>
    </div>
  );
};

export default RoofingCalculator;
