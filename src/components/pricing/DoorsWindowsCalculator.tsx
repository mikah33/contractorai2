import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { DoorClosed, AppWindow } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Opening {
  id: string;
  type: 'door' | 'window';
  style: string;
  width: number;
  height: number;
  quantity: number;
  includeTrim: boolean;
  trimStyle: 'basic' | 'colonial' | 'craftsman' | 'modern';
  includeHardware: boolean;
  isExterior: boolean;
  isPreHung: boolean;
  material: string;
  finish: string;
}

const DoorsWindowsCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [includeInsulation, setIncludeInsulation] = useState(true);
  const [includeFlashing, setIncludeFlashing] = useState(true);
  const [includeCaulk, setIncludeCaulk] = useState(true);
  const [includeShims, setIncludeShims] = useState(true);

  const doorStyles = {
    'entry': {
      name: 'Entry Door',
      materials: ['steel', 'fiberglass', 'wood'],
      finishes: ['primed', 'stained', 'painted'],
      prices: {
        'steel': 299.98,
        'fiberglass': 499.98,
        'wood': 699.98
      }
    },
    'interior': {
      name: 'Interior Door',
      materials: ['hollow-core', 'solid-core', 'wood'],
      finishes: ['primed', 'stained', 'painted'],
      prices: {
        'hollow-core': 49.98,
        'solid-core': 99.98,
        'wood': 199.98
      }
    },
    'patio': {
      name: 'Patio Door',
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: ['white', 'bronze', 'stained'],
      prices: {
        'vinyl': 599.98,
        'aluminum': 799.98,
        'wood': 1299.98
      }
    },
    'french': {
      name: 'French Door',
      materials: ['wood', 'fiberglass', 'steel'],
      finishes: ['primed', 'stained', 'painted'],
      prices: {
        'wood': 899.98,
        'fiberglass': 799.98,
        'steel': 699.98
      }
    },
    'bifold': {
      name: 'Bifold Door',
      materials: ['hollow-core', 'solid-core', 'wood'],
      finishes: ['primed', 'stained', 'painted'],
      prices: {
        'hollow-core': 99.98,
        'solid-core': 149.98,
        'wood': 249.98
      }
    }
  };

  const windowStyles = {
    'single-hung': {
      name: 'Single Hung Window',
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: ['white', 'bronze', 'stained'],
      prices: {
        'vinyl': 199.98,
        'aluminum': 249.98,
        'wood': 399.98
      }
    },
    'double-hung': {
      name: 'Double Hung Window',
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: ['white', 'bronze', 'stained'],
      prices: {
        'vinyl': 249.98,
        'aluminum': 299.98,
        'wood': 499.98
      }
    },
    'casement': {
      name: 'Casement Window',
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: ['white', 'bronze', 'stained'],
      prices: {
        'vinyl': 299.98,
        'aluminum': 349.98,
        'wood': 599.98
      }
    },
    'sliding': {
      name: 'Sliding Window',
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: ['white', 'bronze', 'stained'],
      prices: {
        'vinyl': 249.98,
        'aluminum': 299.98,
        'wood': 499.98
      }
    },
    'picture': {
      name: 'Picture Window',
      materials: ['vinyl', 'aluminum', 'wood'],
      finishes: ['white', 'bronze', 'stained'],
      prices: {
        'vinyl': 299.98,
        'aluminum': 349.98,
        'wood': 599.98
      }
    }
  };

  const trimStyles = {
    'basic': {
      name: 'Basic Trim',
      price: 2.98 // per linear foot
    },
    'colonial': {
      name: 'Colonial Trim',
      price: 3.98
    },
    'craftsman': {
      name: 'Craftsman Trim',
      price: 4.98
    },
    'modern': {
      name: 'Modern Trim',
      price: 3.98
    }
  };

  const hardwarePrices = {
    door: {
      interior: {
        'basic': 24.98,
        'premium': 49.98
      },
      exterior: {
        'basic': 79.98,
        'premium': 149.98
      }
    },
    window: {
      'basic': 19.98,
      'premium': 39.98
    }
  };

  const addOpening = (type: 'door' | 'window') => {
    const defaultStyles = type === 'door' ? doorStyles : windowStyles;
    const firstStyle = Object.keys(defaultStyles)[0];
    const defaultMaterial = defaultStyles[firstStyle].materials[0];
    const defaultFinish = defaultStyles[firstStyle].finishes[0];

    const newOpening: Opening = {
      id: Date.now().toString(),
      type,
      style: firstStyle,
      width: type === 'door' ? 36 : 32,
      height: type === 'door' ? 80 : 60,
      quantity: 1,
      includeTrim: true,
      trimStyle: 'basic',
      includeHardware: true,
      isExterior: type === 'door' ? true : false,
      isPreHung: type === 'door' ? true : false,
      material: defaultMaterial,
      finish: defaultFinish
    };
    setOpenings([...openings, newOpening]);
  };

  const updateOpening = (id: string, updates: Partial<Opening>) => {
    setOpenings(openings.map(opening => 
      opening.id === id ? { ...opening, ...updates } : opening
    ));
  };

  const removeOpening = (id: string) => {
    setOpenings(openings.filter(opening => opening.id !== id));
  };

  const calculateTrimLength = (width: number, height: number) => {
    return (width * 2 + height * 2) / 12; // Convert to linear feet
  };

  const handleCalculate = () => {
    const results: CalculationResult[] = [];
    let totalCost = 0;

    openings.forEach(opening => {
      const styles = opening.type === 'door' ? doorStyles : windowStyles;
      const basePrice = styles[opening.style].prices[opening.material];
      const itemCost = basePrice * opening.quantity;
      totalCost += itemCost;

      results.push({
        label: `${styles[opening.style].name} (${opening.material})`,
        value: opening.quantity,
        unit: 'units',
        cost: itemCost
      });

      // Add pre-hung costs for doors
      if (opening.type === 'door' && opening.isPreHung) {
        const preHungCost = opening.isExterior ? 149.98 : 79.98;
        const totalPreHungCost = preHungCost * opening.quantity;
        totalCost += totalPreHungCost;

        results.push({
          label: 'Pre-hung Frame Kit',
          value: opening.quantity,
          unit: 'kits',
          cost: totalPreHungCost
        });
      }

      // Calculate trim if included
      if (opening.includeTrim) {
        const trimLength = calculateTrimLength(opening.width, opening.height);
        const trimPrice = trimStyles[opening.trimStyle].price;
        const totalTrimLength = trimLength * opening.quantity;
        const trimCost = totalTrimLength * trimPrice;
        totalCost += trimCost;

        results.push({
          label: `${trimStyles[opening.trimStyle].name} Trim`,
          value: Number(totalTrimLength.toFixed(2)),
          unit: 'linear feet',
          cost: trimCost
        });
      }

      // Add hardware if included
      if (opening.includeHardware) {
        let hardwareCost: number;
        if (opening.type === 'door') {
          hardwareCost = opening.isExterior ? 
            hardwarePrices.door.exterior.basic :
            hardwarePrices.door.interior.basic;
        } else {
          hardwareCost = hardwarePrices.window.basic;
        }
        
        const totalHardwareCost = hardwareCost * opening.quantity;
        totalCost += totalHardwareCost;

        results.push({
          label: `${opening.type === 'door' ? 'Door' : 'Window'} Hardware`,
          value: opening.quantity,
          unit: 'sets',
          cost: totalHardwareCost
        });
      }
    });

    // Calculate additional materials
    if (includeInsulation) {
      const insulationNeeded = openings.reduce((sum, opening) => {
        const perimeterFeet = (opening.width + opening.height) * 2 / 12;
        return sum + (perimeterFeet * opening.quantity);
      }, 0);
      
      const insulationCost = Math.ceil(insulationNeeded / 20) * 12.98; // 20ft per roll
      totalCost += insulationCost;

      results.push({
        label: 'Insulation',
        value: Math.ceil(insulationNeeded / 20),
        unit: '20ft rolls',
        cost: insulationCost
      });
    }

    if (includeFlashing) {
      const exteriorOpenings = openings.filter(o => o.isExterior).reduce((sum, o) => sum + o.quantity, 0);
      const flashingCost = exteriorOpenings * 12.98;
      totalCost += flashingCost;

      results.push({
        label: 'Flashing Tape',
        value: exteriorOpenings,
        unit: 'rolls',
        cost: flashingCost
      });
    }

    if (includeCaulk) {
      const caulkTubes = Math.ceil(openings.reduce((sum, opening) => {
        const linearFeet = (opening.width + opening.height) * 2 / 12;
        return sum + (linearFeet * opening.quantity / 20); // 20 linear feet per tube
      }, 0));
      
      const caulkCost = caulkTubes * 6.98;
      totalCost += caulkCost;

      results.push({
        label: 'Caulk',
        value: caulkTubes,
        unit: 'tubes',
        cost: caulkCost
      });
    }

    if (includeShims) {
      const shimPacks = Math.ceil(openings.reduce((sum, o) => sum + o.quantity, 0) / 2);
      const shimCost = shimPacks * 4.98;
      totalCost += shimCost;

      results.push({
        label: 'Shim Packs',
        value: shimPacks,
        unit: 'packs',
        cost: shimCost
      });
    }

    onCalculate(results);
  };

  const isFormValid = openings.length > 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <div className="flex space-x-2">
          <DoorClosed className="h-6 w-6 text-orange-500" />
          <AppWindow className="h-6 w-6 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 ml-2">{t('calculators.doorsWindows.title')}</h2>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => addOpening('door')}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              Add Door
            </button>
            <button
              onClick={() => addOpening('window')}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              Add Window
            </button>
          </div>
        </div>

        {openings.map(opening => (
          <div key={opening.id} className="mb-6 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {opening.type === 'door' ? 'Door' : 'Window'} Style
                </label>
                <select
                  value={opening.style}
                  onChange={(e) => updateOpening(opening.id, { 
                    style: e.target.value,
                    material: (opening.type === 'door' ? doorStyles : windowStyles)[e.target.value].materials[0]
                  })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {Object.entries(opening.type === 'door' ? doorStyles : windowStyles).map(([value, { name }]) => (
                    <option key={value} value={value}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Material
                </label>
                <select
                  value={opening.material}
                  onChange={(e) => updateOpening(opening.id, { material: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {(opening.type === 'door' ? doorStyles : windowStyles)[opening.style].materials.map(material => (
                    <option key={material} value={material}>
                      {material.charAt(0).toUpperCase() + material.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Finish
                </label>
                <select
                  value={opening.finish}
                  onChange={(e) => updateOpening(opening.id, { finish: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {(opening.type === 'door' ? doorStyles : windowStyles)[opening.style].finishes.map(finish => (
                    <option key={finish} value={finish}>
                      {finish.charAt(0).toUpperCase() + finish.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Width (inches)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.125"
                  value={opening.width}
                  onChange={(e) => updateOpening(opening.id, { width: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Height (inches)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.125"
                  value={opening.height}
                  onChange={(e) => updateOpening(opening.id, { height: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={opening.quantity}
                  onChange={(e) => updateOpening(opening.id, { quantity: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={opening.isExterior}
                  onChange={(e) => updateOpening(opening.id, { isExterior: e.target.checked })}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-slate-700">
                  Exterior Installation
                </label>
              </div>

              {opening.type === 'door' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={opening.isPreHung}
                    onChange={(e) => updateOpening(opening.id, { isPreHung: e.target.checked })}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-slate-700">
                    Pre-hung
                  </label>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={opening.includeTrim}
                  onChange={(e) => updateOpening(opening.id, { includeTrim: e.target.checked })}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-slate-700">
                  Include Trim
                </label>
              </div>

              {opening.includeTrim && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Trim Style
                  </label>
                  <select
                    value={opening.trimStyle}
                    onChange={(e) => updateOpening(opening.id, { trimStyle: e.target.value as Opening['trimStyle'] })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {Object.entries(trimStyles).map(([value, { name }]) => (
                      <option key={value} value={value}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={opening.includeHardware}
                  onChange={(e) => updateOpening(opening.id, { includeHardware: e.target.checked })}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-slate-700">
                  Include Hardware
                </label>
              </div>
            </div>

            <button
              onClick={() => removeOpening(opening.id)}
              className="mt-4 text-red-500 hover:text-red-600 text-sm font-medium"
            >
              Remove {opening.type === 'door' ? 'Door' : 'Window'}
            </button>
          </div>
        ))}

        {openings.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="flex justify-center space-x-2 mb-4">
              <DoorClosed className="w-12 h-12 text-gray-400" />
              <AppWindow className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">Add doors and windows to calculate materials</p>
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => addOpening('door')}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                Add Door
              </button>
              <button
                onClick={() => addOpening('window')}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                Add Window
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Materials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeInsulation"
                checked={includeInsulation}
                onChange={(e) => setIncludeInsulation(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeInsulation" className="ml-2 block text-sm font-medium text-slate-700">
                Include Insulation
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeFlashing"
                checked={includeFlashing}
                onChange={(e) => setIncludeFlashing(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeFlashing" className="ml-2 block text-sm font-medium text-slate-700">
                Include Flashing (Exterior Only)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeCaulk"
                checked={includeCaulk}
                onChange={(e) => setIncludeCaulk(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeCaulk" className="ml-2 block text-sm font-medium text-slate-700">
                Include Caulk
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeShims"
                checked={includeShims}
                onChange={(e) => setIncludeShims(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeShims" className="ml-2 block text-sm font-medium text-slate-700">
                Include Shims
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
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default DoorsWindowsCalculator;