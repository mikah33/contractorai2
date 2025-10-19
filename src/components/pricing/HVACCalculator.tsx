import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Thermometer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CalculatorEstimateHeader from './CalculatorEstimateHeader';

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
      name: t('calculators.hvac.defaultRoomName', { number: rooms.length + 1 }),
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

  const getCurrentInputs = () => ({
    systemType,
    rooms,
    ducts,
    climate,
    includeHumidifier,
    includeUVLight,
    includeAirCleaner,
    includeZoning,
    zoneCount,
    refrigerantLineLength,
    condensateDrainLength
  });

  const handleLoadEstimate = (data: any) => {
    if (data.systemType) setSystemType(data.systemType);
    if (data.rooms) setRooms(data.rooms);
    if (data.ducts) setDucts(data.ducts);
    if (data.climate) setClimate(data.climate);
    if (data.includeHumidifier !== undefined) setIncludeHumidifier(data.includeHumidifier);
    if (data.includeUVLight !== undefined) setIncludeUVLight(data.includeUVLight);
    if (data.includeAirCleaner !== undefined) setIncludeAirCleaner(data.includeAirCleaner);
    if (data.includeZoning !== undefined) setIncludeZoning(data.includeZoning);
    if (data.zoneCount) setZoneCount(data.zoneCount);
    if (data.refrigerantLineLength !== undefined) setRefrigerantLineLength(data.refrigerantLineLength);
    if (data.condensateDrainLength !== undefined) setCondensateDrainLength(data.condensateDrainLength);
  };

  const handleNewEstimate = () => {
    setSystemType('split');
    setRooms([]);
    setDucts([]);
    setClimate('moderate');
    setIncludeHumidifier(false);
    setIncludeUVLight(false);
    setIncludeAirCleaner(false);
    setIncludeZoning(false);
    setZoneCount(2);
    setRefrigerantLineLength('');
    setCondensateDrainLength('');
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
          label: t('calculators.hvac.condenserUnit', { tonnage }),
          value: 1,
          unit: t('calculators.hvac.unit'),
          cost: condenserCost
        },
        {
          label: t('calculators.hvac.airHandler', { tonnage }),
          value: 1,
          unit: t('calculators.hvac.unit'),
          cost: airHandlerCost
        }
      );
    } else if (systemType === 'package') {
      const unitCost = equipmentPrices.package.unit;
      totalCost += unitCost;

      results.push({
        label: t('calculators.hvac.packageUnit', { tonnage }),
        value: 1,
        unit: t('calculators.hvac.unit'),
        cost: unitCost
      });
    } else {
      const outdoorCost = equipmentPrices['mini-split'].outdoor;
      const indoorCost = equipmentPrices['mini-split'].indoor;
      totalCost += outdoorCost + indoorCost;

      results.push(
        {
          label: t('calculators.hvac.miniSplitOutdoor', { tonnage }),
          value: 1,
          unit: t('calculators.hvac.unit'),
          cost: outdoorCost
        },
        {
          label: t('calculators.hvac.miniSplitIndoor'),
          value: rooms.length,
          unit: t('calculators.hvac.units'),
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
          label: t(`calculators.hvac.ductwork${duct.type.charAt(0).toUpperCase() + duct.type.slice(1)}`, { size: duct.size }),
          value: duct.length,
          unit: t('calculators.hvac.linearFeet'),
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
        label: t('calculators.hvac.refrigerantLineSet'),
        value: refrigerantLineLength,
        unit: t('calculators.hvac.feet'),
        cost: lineSetCost
      });
    }

    // Condensate drain
    if (typeof condensateDrainLength === 'number') {
      const drainCost = condensateDrainLength * 2.98;
      totalCost += drainCost;

      results.push({
        label: t('calculators.hvac.condensateDrainLine'),
        value: condensateDrainLength,
        unit: t('calculators.hvac.feet'),
        cost: drainCost
      });
    }

    // Optional components
    if (includeHumidifier) {
      const humidifierCost = 299.98;
      totalCost += humidifierCost;

      results.push({
        label: t('calculators.hvac.wholeHouseHumidifier'),
        value: 1,
        unit: t('calculators.hvac.unit'),
        cost: humidifierCost
      });
    }

    if (includeUVLight) {
      const uvLightCost = 249.98;
      totalCost += uvLightCost;

      results.push({
        label: t('calculators.hvac.uvLightSystem'),
        value: 1,
        unit: t('calculators.hvac.unit'),
        cost: uvLightCost
      });
    }

    if (includeAirCleaner) {
      const airCleanerCost = 399.98;
      totalCost += airCleanerCost;

      results.push({
        label: t('calculators.hvac.airCleanerSystem'),
        value: 1,
        unit: t('calculators.hvac.unit'),
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
        label: t('calculators.hvac.zoneControlSystem', { zones: zoneCount }),
        value: 1,
        unit: t('calculators.hvac.system'),
        cost: totalZoningCost
      });
    }

    // Installation costs
    const installationCost = systemType === 'split' ? equipmentPrices.split.installation :
                           systemType === 'package' ? equipmentPrices.package.installation :
                           equipmentPrices['mini-split'].installation;
    totalCost += installationCost;

    results.push({
      label: t('calculators.hvac.installationLabor'),
      value: 1,
      unit: t('calculators.hvac.service'),
      cost: installationCost
    });

    // Add total cost
    results.push({
      label: t('calculators.hvac.totalEstimatedCost'),
      value: Number(totalCost.toFixed(2)),
      unit: t('calculators.hvac.usd'),
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

      <CalculatorEstimateHeader
        calculatorType="hvac"
        getCurrentInputs={getCurrentInputs}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

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
              {t('calculators.hvac.splitSystem')}
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
              {t('calculators.hvac.packageUnit')}
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
              {t('calculators.hvac.miniSplit')}
            </button>
          </div>

          <select
            value={climate}
            onChange={(e) => setClimate(e.target.value as 'mild' | 'moderate' | 'extreme')}
            className="px-4 py-2 border border-slate-300 rounded-md"
          >
            <option value="mild">{t('calculators.hvac.mildClimate')}</option>
            <option value="moderate">{t('calculators.hvac.moderateClimate')}</option>
            <option value="extreme">{t('calculators.hvac.extremeClimate')}</option>
          </select>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">{t('calculators.hvac.rooms')}</h3>
            <button
              onClick={addRoom}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              {t('calculators.hvac.addRoom')}
            </button>
          </div>

          {rooms.map(room => (
            <div key={room.id} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.hvac.roomName')}
                  </label>
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.hvac.enterRoomName')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.hvac.lengthFeet')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={room.length || ''}
                    onChange={(e) => updateRoom(room.id, { length: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.hvac.enterLength')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.hvac.widthFeet')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={room.width || ''}
                    onChange={(e) => updateRoom(room.id, { width: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.hvac.enterWidth')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.hvac.heightFeet')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={room.height || ''}
                    onChange={(e) => updateRoom(room.id, { height: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.hvac.enterHeight')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.hvac.numberOfWindows')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={room.windows || ''}
                    onChange={(e) => updateRoom(room.id, { windows: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.hvac.enterNumberOfWindows')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.hvac.primaryExposure')}
                  </label>
                  <select
                    value={room.exposure}
                    onChange={(e) => updateRoom(room.id, { exposure: e.target.value as Room['exposure'] })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="north">{t('calculators.hvac.north')}</option>
                    <option value="south">{t('calculators.hvac.south')}</option>
                    <option value="east">{t('calculators.hvac.east')}</option>
                    <option value="west">{t('calculators.hvac.west')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.hvac.insulationQuality')}
                  </label>
                  <select
                    value={room.insulation}
                    onChange={(e) => updateRoom(room.id, { insulation: e.target.value as Room['insulation'] })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="poor">{t('calculators.hvac.poor')}</option>
                    <option value="average">{t('calculators.hvac.average')}</option>
                    <option value="good">{t('calculators.hvac.good')}</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => removeRoom(room.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  {t('calculators.hvac.removeRoom')}
                </button>
                <div className="text-slate-600">
                  {t('calculators.hvac.estimatedLoad', { btus: calculateBTUs(room).toLocaleString() })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {systemType !== 'mini-split' && (
          <div className="border-t border-slate-200 pt-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-800">{t('calculators.hvac.ductwork')}</h3>
              <button
                onClick={addDuct}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                {t('calculators.hvac.addDuctRun')}
              </button>
            </div>

            {ducts.map(duct => (
              <div key={duct.id} className="mb-6 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.hvac.ductType')}
                    </label>
                    <select
                      value={duct.type}
                      onChange={(e) => updateDuct(duct.id, { type: e.target.value as 'supply' | 'return' })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    >
                      <option value="supply">{t('calculators.hvac.supply')}</option>
                      <option value="return">{t('calculators.hvac.return')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.hvac.ductSizeInches')}
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
                      {t('calculators.hvac.lengthFeet')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={duct.length || ''}
                      onChange={(e) => updateDuct(duct.id, { length: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder={t('calculators.hvac.enterLength')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.hvac.numberOfElbows')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={duct.elbows || ''}
                      onChange={(e) => updateDuct(duct.id, { elbows: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder={t('calculators.hvac.enterNumberOfElbows')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.hvac.numberOfTakeoffs')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={duct.takeoffs || ''}
                      onChange={(e) => updateDuct(duct.id, { takeoffs: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder={t('calculators.hvac.enterNumberOfTakeoffs')}
                    />
                  </div>
                </div>

                <button
                  onClick={() => removeDuct(duct.id)}
                  className="mt-4 text-red-500 hover:text-red-600"
                >
                  {t('calculators.hvac.removeDuctRun')}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.hvac.lineSetsAndDrains')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemType !== 'package' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.hvac.refrigerantLineLengthFeet')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={refrigerantLineLength}
                  onChange={(e) => setRefrigerantLineLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md"
                  placeholder={t('calculators.hvac.enterLineSetLength')}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.hvac.condensateDrainLengthFeet')}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={condensateDrainLength}
                onChange={(e) => setCondensateDrainLength(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md"
                placeholder={t('calculators.hvac.enterDrainLength')}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.hvac.additionalOptions')}</h3>
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
                {t('calculators.hvac.includeWholeHouseHumidifier')}
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
                {t('calculators.hvac.includeUVLightSystem')}
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
                {t('calculators.hvac.includeAirCleanerSystem')}
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
                {t('calculators.hvac.includeZoningSystem')}
              </label>
            </div>

            {includeZoning && (
              <div>
                <label htmlFor="zoneCount" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.hvac.numberOfZones')}
                </label>
                <select
                  id="zoneCount"
                  value={zoneCount}
                  onChange={(e) => setZoneCount(Number(e.target.value) as 2 | 3 | 4)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value={2}>{t('calculators.hvac.twoZones')}</option>
                  <option value={3}>{t('calculators.hvac.threeZones')}</option>
                  <option value={4}>{t('calculators.hvac.fourZones')}</option>
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
