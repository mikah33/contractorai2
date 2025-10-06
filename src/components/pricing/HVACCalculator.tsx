import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Thermometer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Room {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  windows: number;
  exposure: 'north' | 'south' | 'east' | 'west';
  insulation: 'poor' | 'average' | 'good';
}

interface Duct {
  id: string;
  type: 'supply' | 'return';
  size: number;
  length: number;
  elbows: number;
  takeoffs: number;
}

const HVACCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [systemType, setSystemType] = useState<'split' | 'package' | 'mini-split'>('split');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [ducts, setDucts] = useState<Duct[]>([]);
  const [climate, setClimate] = useState<'mild' | 'moderate' | 'extreme'>('moderate');
  const [includeHumidifier, setIncludeHumidifier] = useState(false);
  const [includeUVLight, setIncludeUVLight] = useState(false);
  const [includeAirCleaner, setIncludeAirCleaner] = useState(false);
  const [includeZoning, setIncludeZoning] = useState(false);
  const [zoneCount, setZoneCount] = useState<2 | 3 | 4>(2);
  const [refrigerantLineLength, setRefrigerantLineLength] = useState<number | ''>('');
  const [condensateDrainLength, setCondensateDrainLength] = useState<number | ''>('');

  const addRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: `Room ${rooms.length + 1}`,
      length: 0,
      width: 0,
      height: 0,
      windows: 0,
      exposure: 'north',
      insulation: 'average'
    };
    setRooms([...rooms, newRoom]);
  };

  const updateRoom = (id: string, updates: Partial<Room>) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, ...updates } : room
    ));
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter(room => room.id !== id));
  };

  const addDuct = () => {
    const newDuct: Duct = {
      id: Date.now().toString(),
      type: 'supply',
      size: 6,
      length: 0,
      elbows: 0,
      takeoffs: 0
    };
    setDucts([...ducts, newDuct]);
  };

  const updateDuct = (id: string, updates: Partial<Duct>) => {
    setDucts(ducts.map(duct => 
      duct.id === id ? { ...duct, ...updates } : duct
    ));
  };

  const removeDuct = (id: string) => {
    setDucts(ducts.filter(duct => duct.id !== id));
  };

  const calculateBTUs = (room: Room): number => {
    const squareFootage = room.length * room.width;
    const volume = squareFootage * room.height;
    
    // Base BTU calculation (20-30 BTU per sq ft)
    let btus = squareFootage * 25;
    
    // Adjustments for climate
    const climateFactors = {
      mild: 0.9,
      moderate: 1.0,
      extreme: 1.2
    };
    btus *= climateFactors[climate];
    
    // Adjustments for exposure
    const exposureFactors = {
      north: 1.0,
      south: 1.1,
      east: 1.05,
      west: 1.15
    };
    btus *= exposureFactors[room.exposure];
    
    // Adjustments for insulation
    const insulationFactors = {
      poor: 1.3,
      average: 1.0,
      good: 0.8
    };
    btus *= insulationFactors[room.insulation];
    
    // Window adjustments (1000 BTU per window)
    btus += room.windows * 1000;
    
    return Math.round(btus);
  };

  const handleCalculate = () => {
    const results: CalculationResult[] = [];
    let totalCost = 0;

    // Calculate total BTUs needed
    const totalBTUs = rooms.reduce((sum, room) => sum + calculateBTUs(room), 0);
    const tonnage = Math.ceil(totalBTUs / 12000);

    // Equipment costs based on system type and size
    const equipmentPrices = {
      'split': {
        condenser: tonnage * 1200,
        airHandler: tonnage * 800,
        installation: tonnage * 1000
      },
      'package': {
        unit: tonnage * 1800,
        installation: tonnage * 800
      },
      'mini-split': {
        outdoor: tonnage * 1500,
        indoor: rooms.length * 500,
        installation: (tonnage * 800) + (rooms.length * 200)
      }
    };

    if (systemType === 'split') {
      const condenserCost = equipmentPrices.split.condenser;
      const airHandlerCost = equipmentPrices.split.airHandler;
      totalCost += condenserCost + airHandlerCost;

      results.push(
        {
          label: `${tonnage} Ton Condenser Unit`,
          value: 1,
          unit: 'unit',
          cost: condenserCost
        },
        {
          label: `${tonnage} Ton Air Handler`,
          value: 1,
          unit: 'unit',
          cost: airHandlerCost
        }
      );
    } else if (systemType === 'package') {
      const unitCost = equipmentPrices.package.unit;
      totalCost += unitCost;

      results.push({
        label: `${tonnage} Ton Package Unit`,
        value: 1,
        unit: 'unit',
        cost: unitCost
      });
    } else {
      const outdoorCost = equipmentPrices['mini-split'].outdoor;
      const indoorCost = equipmentPrices['mini-split'].indoor;
      totalCost += outdoorCost + indoorCost;

      results.push(
        {
          label: `${tonnage} Ton Mini-Split Outdoor Unit`,
          value: 1,
          unit: 'unit',
          cost: outdoorCost
        },
        {
          label: 'Mini-Split Indoor Units',
          value: rooms.length,
          unit: 'units',
          cost: indoorCost
        }
      );
    }

    // Calculate ductwork
    if (systemType !== 'mini-split') {
      let totalDuctCost = 0;
      ducts.forEach(duct => {
        const ductPricePerFoot = duct.size <= 6 ? 4.98 :
                                duct.size <= 8 ? 6.98 :
                                duct.size <= 10 ? 8.98 :
                                12.98;
        
        const ductCost = duct.length * ductPricePerFoot;
        const elbowCost = duct.elbows * (duct.size <= 8 ? 8.98 : 12.98);
        const takeoffCost = duct.takeoffs * 6.98;
        
        const totalCostForDuct = ductCost + elbowCost + takeoffCost;
        totalDuctCost += totalCostForDuct;

        results.push({
          label: `${duct.size}" ${duct.type.charAt(0).toUpperCase() + duct.type.slice(1)} Ductwork`,
          value: duct.length,
          unit: 'linear feet',
          cost: totalCostForDuct
        });
      });
      totalCost += totalDuctCost;
    }

    // Refrigerant line set if applicable
    if (typeof refrigerantLineLength === 'number' && systemType !== 'package') {
      const lineSetCost = refrigerantLineLength * 12.98;
      totalCost += lineSetCost;

      results.push({
        label: 'Refrigerant Line Set',
        value: refrigerantLineLength,
        unit: 'feet',
        cost: lineSetCost
      });
    }

    // Condensate drain
    if (typeof condensateDrainLength === 'number') {
      const drainCost = condensateDrainLength * 2.98;
      totalCost += drainCost;

      results.push({
        label: 'Condensate Drain Line',
        value: condensateDrainLength,
        unit: 'feet',
        cost: drainCost
      });
    }

    // Optional components
    if (includeHumidifier) {
      const humidifierCost = 299.98;
      totalCost += humidifierCost;

      results.push({
        label: 'Whole-House Humidifier',
        value: 1,
        unit: 'unit',
        cost: humidifierCost
      });
    }

    if (includeUVLight) {
      const uvLightCost = 249.98;
      totalCost += uvLightCost;

      results.push({
        label: 'UV Light System',
        value: 1,
        unit: 'unit',
        cost: uvLightCost
      });
    }

    if (includeAirCleaner) {
      const airCleanerCost = 399.98;
      totalCost += airCleanerCost;

      results.push({
        label: 'Air Cleaner System',
        value: 1,
        unit: 'unit',
        cost: airCleanerCost
      });
    }

    if (includeZoning) {
      const zoneBoardCost = 299.98;
      const damperCost = 89.98 * zoneCount;
      const thermostatCost = 79.98 * zoneCount;
      const totalZoningCost = zoneBoardCost + damperCost + thermostatCost;
      totalCost += totalZoningCost;

      results.push({
        label: `${zoneCount}-Zone Control System`,
        value: 1,
        unit: 'system',
        cost: totalZoningCost
      });
    }

    // Installation costs
    const installationCost = systemType === 'split' ? equipmentPrices.split.installation :
                           systemType === 'package' ? equipmentPrices.package.installation :
                           equipmentPrices['mini-split'].installation;
    totalCost += installationCost;

    results.push({
      label: 'Installation Labor',
      value: 1,
      unit: 'service',
      cost: installationCost
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

  const isFormValid = 
    rooms.length > 0 &&
    rooms.every(room => 
      typeof room.length === 'number' && room.length > 0 &&
      typeof room.width === 'number' && room.width > 0 &&
      typeof room.height === 'number' && room.height > 0
    ) &&
    (systemType === 'mini-split' || ducts.length > 0) &&
    ducts.every(duct =>
      typeof duct.length === 'number' && duct.length > 0 &&
      typeof duct.elbows === 'number' &&
      typeof duct.takeoffs === 'number'
    ) &&
    (systemType === 'package' || typeof refrigerantLineLength === 'number') &&
    typeof condensateDrainLength === 'number';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Thermometer className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.hvac.title')}</h2>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                systemType === 'split'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300 rounded-l-lg`}
              onClick={() => setSystemType('split')}
            >
              Split System
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                systemType === 'package'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border-t border-b border-slate-300`}
              onClick={() => setSystemType('package')}
            >
              Package Unit
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                systemType === 'mini-split'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300 rounded-r-lg`}
              onClick={() => setSystemType('mini-split')}
            >
              Mini-Split
            </button>
          </div>

          <select
            value={climate}
            onChange={(e) => setClimate(e.target.value as 'mild' | 'moderate' | 'extreme')}
            className="px-4 py-2 border border-slate-300 rounded-md"
          >
            <option value="mild">Mild Climate</option>
            <option value="moderate">Moderate Climate</option>
            <option value="extreme">Extreme Climate</option>
          </select>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Rooms</h3>
            <button
              onClick={addRoom}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              Add Room
            </button>
          </div>

          {rooms.map(room => (
            <div key={room.id} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Enter room name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Length (feet)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={room.length || ''}
                    onChange={(e) => updateRoom(room.id, { length: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Enter length"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Width (feet)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={room.width || ''}
                    onChange={(e) => updateRoom(room.id, { width: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Enter width"
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
                    value={room.height || ''}
                    onChange={(e) => updateRoom(room.id, { height: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Enter height"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Number of Windows
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={room.windows || ''}
                    onChange={(e) => updateRoom(room.id, { windows: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder="Enter number of windows"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Primary Exposure
                  </label>
                  <select
                    value={room.exposure}
                    onChange={(e) => updateRoom(room.id, { exposure: e.target.value as Room['exposure'] })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="north">North</option>
                    <option value="south">South</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Insulation Quality
                  </label>
                  <select
                    value={room.insulation}
                    onChange={(e) => updateRoom(room.id, { insulation: e.target.value as Room['insulation'] })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="poor">Poor</option>
                    <option value="average">Average</option>
                    <option value="good">Good</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => removeRoom(room.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  Remove Room
                </button>
                <div className="text-slate-600">
                  Estimated Load: {calculateBTUs(room).toLocaleString()} BTU/h
                </div>
              </div>
            </div>
          ))}
        </div>

        {systemType !== 'mini-split' && (
          <div className="border-t border-slate-200 pt-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-800">Ductwork</h3>
              <button
                onClick={addDuct}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                Add Duct Run
              </button>
            </div>

            {ducts.map(duct => (
              <div key={duct.id} className="mb-6 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Duct Type
                    </label>
                    <select
                      value={duct.type}
                      onChange={(e) => updateDuct(duct.id, { type: e.target.value as 'supply' | 'return' })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    >
                      <option value="supply">Supply</option>
                      <option value="return">Return</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Duct Size (inches)
                    </label>
                    <select
                      value={duct.size}
                      onChange={(e) => updateDuct(duct.id, { size: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    >
                      {[4, 5, 6, 7, 8, 9, 10, 12, 14, 16].map(size => (
                        <option key={size} value={size}>{size}"</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Length (feet)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={duct.length || ''}
                      onChange={(e) => updateDuct(duct.id, { length: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder="Enter length"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Number of Elbows
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={duct.elbows || ''}
                      onChange={(e) => updateDuct(duct.id, { elbows: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder="Enter number of elbows"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Number of Takeoffs
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={duct.takeoffs || ''}
                      onChange={(e) => updateDuct(duct.id, { takeoffs: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder="Enter number of takeoffs"
                    />
                  </div>
                </div>

                <button
                  onClick={() => removeDuct(duct.id)}
                  className="mt-4 text-red-500 hover:text-red-600"
                >
                  Remove Duct Run
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Line Sets and Drains</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemType !== 'package' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Refrigerant Line Length (feet)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={refrigerantLineLength}
                  onChange={(e) => setRefrigerantLineLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md"
                  placeholder="Enter line set length"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Condensate Drain Length (feet)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={condensateDrainLength}
                onChange={(e) => setCondensateDrainLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md"
                placeholder="Enter drain length"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Additional Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeHumidifier"
                checked={includeHumidifier}
                onChange={(e) => setIncludeHumidifier(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeHumidifier" className="ml-2 block text-sm font-medium text-slate-700">
                Include Whole-House Humidifier
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeUVLight"
                checked={includeUVLight}
                onChange={(e) => setIncludeUVLight(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeUVLight" className="ml-2 block text-sm font-medium text-slate-700">
                Include UV Light System
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeAirCleaner"
                checked={includeAirCleaner}
                onChange={(e) => setIncludeAirCleaner(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeAirCleaner" className="ml-2 block text-sm font-medium text-slate-700">
                Include Air Cleaner System
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeZoning"
                checked={includeZoning}
                onChange={(e) => setIncludeZoning(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeZoning" className="ml-2 block text-sm font-medium text-slate-700">
                Include Zoning System
              </label>
            </div>

            {includeZoning && (
              <div>
                <label htmlFor="zoneCount" className="block text-sm font-medium text-slate-700 mb-1">
                  Number of Zones
                </label>
                <select
                  id="zoneCount"
                  value={zoneCount}
                  onChange={(e) => setZoneCount(Number(e.target.value) as 2 | 3 | 4)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value={2}>2 Zones</option>
                  <option value={3}>3 Zones</option>
                  <option value={4}>4 Zones</option>
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

export default HVACCalculator;