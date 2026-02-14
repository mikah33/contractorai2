import React, { useState, useMemo, useEffect } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Pipette as Pipe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';
import { useCalculatorTab } from '../../contexts/CalculatorTabContext';
import { useCustomCalculator } from '../../hooks/useCustomCalculator';
import { useCustomMaterials } from '../../hooks/useCustomMaterials';

interface Fixture {
  id: string;
  type: 'sink' | 'toilet' | 'shower' | 'tub' | 'washer' | 'dishwasher' | 'custom';
  name?: string;
  supplyLines: number;
  drainSize: number;
  ventSize: number;
  distanceFromStack: number;
  cost: number;
}

interface PipingRun {
  id: string;
  type: 'supply' | 'drain' | 'vent';
  size: number;
  length: number;
  material: 'pex' | 'copper' | 'cpvc' | 'pvc' | 'abs' | 'cast-iron';
  fittings: {
    elbows90: number;
    elbows45: number;
    tees: number;
    couplings: number;
    adapters: number;
    valves: number;
  };
}

const PlumbingCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const { activeTab } = useCalculatorTab();
  const { materials: customMaterials, pricing: customPricing, loading: loadingCustom, isConfigured } =
    useCustomCalculator('plumbing', activeTab === 'custom');
  const { getCustomPrice, getCustomUnitValue } = useCustomMaterials('plumbing');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [pipingRuns, setPipingRuns] = useState<PipingRun[]>([]);
  const [includeWaterHeater, setIncludeWaterHeater] = useState(false);
  const [waterHeaterType, setWaterHeaterType] = useState<'tank' | 'tankless'>('tank');
  const [waterHeaterSize, setWaterHeaterSize] = useState<30 | 40 | 50 | 75>(40);
  const [includeWaterSoftener, setIncludeWaterSoftener] = useState(false);
  const [includePressureTank, setIncludePressureTank] = useState(false);
  const [pressureTankSize, setPressureTankSize] = useState<20 | 30 | 40>(30);
  const [includeSewerConnection, setIncludeSewerConnection] = useState(true);
  const [sewerLength, setSewerLength] = useState<number | ''>('');
  const [includeCleanouts, setIncludeCleanouts] = useState(true);
  const [cleanoutCount, setCleanoutCount] = useState<number>(2);

  const getDefaultFixtureCost = (type: Fixture['type']) => {
    const costs = {
      sink: {
        cost: 149.98,
        description: t('calculators.plumbing.standardStainlessSteelKitchenSink')
      },
      toilet: {
        cost: 199.98,
        description: t('calculators.plumbing.standardTwoPieceToilet')
      },
      shower: {
        cost: 299.98,
        description: t('calculators.plumbing.standardShowerKit'),
        components: {
          valve: {
            cost: 129.98,
            description: t('calculators.plumbing.pressureBalanceShowerValve')
          },
          head: {
            cost: 49.98,
            description: t('calculators.plumbing.standardShowerHead')
          },
          trim: {
            cost: 79.98,
            description: t('calculators.plumbing.showerTrimKit')
          },
          drain: {
            cost: 39.98,
            description: t('calculators.plumbing.showerDrainAssembly')
          }
        }
      },
      tub: {
        cost: 399.98,
        description: t('calculators.plumbing.standardAlcoveBathtub')
      },
      washer: {
        cost: 24.98,
        description: t('calculators.plumbing.washerConnectionBox')
      },
      dishwasher: {
        cost: 19.98,
        description: t('calculators.plumbing.dishwasherConnectionKit')
      },
      custom: {
        cost: 0,
        description: t('calculators.plumbing.customFixture')
      }
    };
    return costs[type];
  };

  const addFixture = (type: Fixture['type']) => {
    const defaultDistances = {
      sink: 6,
      toilet: 4,
      shower: 8,
      tub: 8,
      washer: 10,
      dishwasher: 6,
      custom: 0
    };

    const defaultDrainSizes = {
      sink: 1.5,
      toilet: 3,
      shower: 2,
      tub: 2,
      washer: 2,
      dishwasher: 1.5,
      custom: 2
    };

    const { cost } = getDefaultFixtureCost(type);

    const newFixture: Fixture = {
      id: Date.now().toString(),
      type,
      supplyLines: type === 'toilet' ? 1 : 2,
      drainSize: defaultDrainSizes[type],
      ventSize: 1.5,
      distanceFromStack: defaultDistances[type],
      cost
    };
    setFixtures([...fixtures, newFixture]);
  };

  const updateFixture = (id: string, updates: Partial<Fixture>) => {
    setFixtures(fixtures.map(fixture =>
      fixture.id === id ? { ...fixture, ...updates } : fixture
    ));
  };

  const removeFixture = (id: string) => {
    setFixtures(fixtures.filter(fixture => fixture.id !== id));
  };

  const addPipingRun = (type: PipingRun['type']) => {
    const defaultSizes = {
      supply: 0.75,
      drain: 3,
      vent: 1.5
    };

    const defaultMaterials = {
      supply: 'pex',
      drain: 'pvc',
      vent: 'pvc'
    };

    const newPipingRun: PipingRun = {
      id: Date.now().toString(),
      type,
      size: defaultSizes[type],
      length: 0,
      material: defaultMaterials[type] as PipingRun['material'],
      fittings: {
        elbows90: 0,
        elbows45: 0,
        tees: 0,
        couplings: 0,
        adapters: 0,
        valves: 0
      }
    };
    setPipingRuns([...pipingRuns, newPipingRun]);
  };

  const updatePipingRun = (id: string, updates: Partial<PipingRun>) => {
    setPipingRuns(pipingRuns.map(run =>
      run.id === id ? { ...run, ...updates } : run
    ));
  };

  const updateFittings = (runId: string, updates: Partial<PipingRun['fittings']>) => {
    setPipingRuns(pipingRuns.map(run =>
      run.id === runId ? {
        ...run,
        fittings: { ...run.fittings, ...updates }
      } : run
    ));
  };

  const removePipingRun = (id: string) => {
    setPipingRuns(pipingRuns.filter(run => run.id !== id));
  };

  const getCurrentInputs = () => ({
    fixtures,
    pipingRuns,
    includeWaterHeater,
    waterHeaterType,
    waterHeaterSize,
    includeWaterSoftener,
    includePressureTank,
    pressureTankSize,
    includeSewerConnection,
    sewerLength,
    includeCleanouts,
    cleanoutCount
  });

  const handleLoadEstimate = (data: any) => {
    if (data.fixtures) setFixtures(data.fixtures);
    if (data.pipingRuns) setPipingRuns(data.pipingRuns);
    if (data.includeWaterHeater !== undefined) setIncludeWaterHeater(data.includeWaterHeater);
    if (data.waterHeaterType) setWaterHeaterType(data.waterHeaterType);
    if (data.waterHeaterSize) setWaterHeaterSize(data.waterHeaterSize);
    if (data.includeWaterSoftener !== undefined) setIncludeWaterSoftener(data.includeWaterSoftener);
    if (data.includePressureTank !== undefined) setIncludePressureTank(data.includePressureTank);
    if (data.pressureTankSize) setPressureTankSize(data.pressureTankSize);
    if (data.includeSewerConnection !== undefined) setIncludeSewerConnection(data.includeSewerConnection);
    if (data.sewerLength !== undefined) setSewerLength(data.sewerLength);
    if (data.includeCleanouts !== undefined) setIncludeCleanouts(data.includeCleanouts);
    if (data.cleanoutCount !== undefined) setCleanoutCount(data.cleanoutCount);
  };

  const handleNewEstimate = () => {
    setFixtures([]);
    setPipingRuns([]);
    setIncludeWaterHeater(false);
    setWaterHeaterType('tank');
    setWaterHeaterSize(40);
    setIncludeWaterSoftener(false);
    setIncludePressureTank(false);
    setPressureTankSize(30);
    setIncludeSewerConnection(true);
    setSewerLength('');
    setIncludeCleanouts(true);
    setCleanoutCount(2);
  };

  const getPipePrice = (material: PipingRun['material'], size: number) => {
    const defaultPrices = {
      'pex': {
        0.5: 0.89,
        0.75: 1.29,
        1: 1.89
      },
      'copper': {
        0.5: 3.98,
        0.75: 5.98,
        1: 7.98
      },
      'cpvc': {
        0.5: 1.29,
        0.75: 1.98,
        1: 2.98
      },
      'pvc': {
        1.5: 2.98,
        2: 3.98,
        3: 5.98,
        4: 8.98
      },
      'abs': {
        1.5: 3.98,
        2: 4.98,
        3: 6.98,
        4: 9.98
      },
      'cast-iron': {
        2: 12.98,
        3: 18.98,
        4: 24.98
      }
    };

    const defaultPrice = defaultPrices[material]?.[size] || 0;
    const materialName = `${material}_${size}`;

    return getCustomPrice(materialName, defaultPrice, 'pipe');
  };

  const getFittingPrice = (material: PipingRun['material'], size: number, type: keyof PipingRun['fittings']) => {
    const defaultPrices = {
      'pex': {
        'elbows90': 1.98,
        'elbows45': 1.98,
        'tees': 2.49,
        'couplings': 1.49,
        'adapters': 2.98,
        'valves': 8.98
      },
      'copper': {
        'elbows90': 3.98,
        'elbows45': 3.98,
        'tees': 4.98,
        'couplings': 2.98,
        'adapters': 4.98,
        'valves': 12.98
      },
      'cpvc': {
        'elbows90': 1.98,
        'elbows45': 1.98,
        'tees': 2.98,
        'couplings': 1.49,
        'adapters': 2.98,
        'valves': 9.98
      },
      'pvc': {
        'elbows90': 2.98,
        'elbows45': 2.98,
        'tees': 3.98,
        'couplings': 1.98,
        'adapters': 3.98,
        'valves': 12.98
      },
      'abs': {
        'elbows90': 3.49,
        'elbows45': 3.49,
        'tees': 4.49,
        'couplings': 2.49,
        'adapters': 4.49,
        'valves': 14.98
      },
      'cast-iron': {
        'elbows90': 18.98,
        'elbows45': 18.98,
        'tees': 24.98,
        'couplings': 12.98,
        'adapters': 16.98,
        'valves': 49.98
      }
    };

    const defaultPrice = defaultPrices[material]?.[type] || 0;
    const materialName = `${material}_${type}`;

    return getCustomPrice(materialName, defaultPrice, 'fitting');
  };

  const handleCalculate = () => {
    const results: CalculationResult[] = [];
    let totalCost = 0;

    // Calculate fixtures first
    fixtures.forEach(fixture => {
      // Add fixture cost
      const fixtureDetails = getDefaultFixtureCost(fixture.type);
      const fixtureName = fixture.type === 'custom' && fixture.name
        ? fixture.name
        : fixtureDetails.description;

      results.push({
        label: fixtureName,
        value: 1,
        unit: t('calculators.plumbing.piece'),
        cost: fixture.cost
      });
      totalCost += fixture.cost;

      // Add shower components if it's a shower
      if (fixture.type === 'shower') {
        const { components } = fixtureDetails;
        Object.entries(components).forEach(([component, details]) => {
          results.push({
            label: details.description,
            value: 1,
            unit: t('calculators.plumbing.piece'),
            cost: details.cost
          });
          totalCost += details.cost;
        });
      }

      // Supply lines
      const supplyLinePrice = getCustomPrice('supply_line', 12.98, 'fixture');
      const supplyLineCost = fixture.supplyLines * supplyLinePrice;
      totalCost += supplyLineCost;

      results.push({
        label: `${fixture.type} ${t('calculators.plumbing.supplyLines')}`,
        value: fixture.supplyLines,
        unit: t('calculators.plumbing.pieces'),
        cost: supplyLineCost
      });

      // Drain assembly
      const defaultDrainPrice = fixture.type === 'toilet' ? 24.98 :
                               fixture.type === 'tub' ? 49.98 :
                               fixture.type === 'shower' ? 39.98 :
                               29.98;
      const drainAssemblyCost = getCustomPrice(`drain_assembly_${fixture.type}`, defaultDrainPrice, 'fixture');
      totalCost += drainAssemblyCost;

      results.push({
        label: `${fixture.type} ${t('calculators.plumbing.drainAssembly')}`,
        value: 1,
        unit: t('calculators.plumbing.set'),
        cost: drainAssemblyCost
      });
    });

    // Calculate piping materials
    pipingRuns.forEach(run => {
      const pipePrice = getPipePrice(run.material, run.size);
      const pipeCost = run.length * pipePrice;
      totalCost += pipeCost;

      results.push({
        label: `${run.size}" ${run.material.toUpperCase()} ${run.type} ${t('calculators.plumbing.pipe')}`,
        value: run.length,
        unit: t('calculators.plumbing.feet'),
        cost: pipeCost
      });

      // Calculate fittings
      Object.entries(run.fittings).forEach(([fitting, count]) => {
        if (count > 0) {
          const fittingPrice = getFittingPrice(run.material, run.size, fitting as keyof PipingRun['fittings']);
          const fittingCost = count * fittingPrice;
          totalCost += fittingCost;

          results.push({
            label: `${run.size}" ${run.material.toUpperCase()} ${fitting}`,
            value: count,
            unit: t('calculators.plumbing.pieces'),
            cost: fittingCost
          });
        }
      });
    });

    // Water heater if included
    if (includeWaterHeater) {
      const defaultWaterHeaterPrices = {
        tank: {
          30: 399.98,
          40: 449.98,
          50: 549.98,
          75: 799.98
        },
        tankless: {
          30: 699.98,
          40: 899.98,
          50: 1099.98,
          75: 1499.98
        }
      };

      const defaultPrice = defaultWaterHeaterPrices[waterHeaterType][waterHeaterSize];
      const waterHeaterCost = getCustomPrice(`water_heater_${waterHeaterType}_${waterHeaterSize}`, defaultPrice, 'equipment');
      totalCost += waterHeaterCost;

      results.push({
        label: `${waterHeaterType === 'tank' ? `${waterHeaterSize} ${t('calculators.plumbing.gallon')}` : t('calculators.plumbing.tankless')} ${t('calculators.plumbing.waterHeater')}`,
        value: 1,
        unit: t('calculators.plumbing.unit'),
        cost: waterHeaterCost
      });

      // Water heater installation kit
      const defaultInstallKitPrice = waterHeaterType === 'tank' ? 89.98 : 149.98;
      const installKitCost = getCustomPrice(`install_kit_${waterHeaterType}`, defaultInstallKitPrice, 'equipment');
      totalCost += installKitCost;

      results.push({
        label: t('calculators.plumbing.waterHeaterInstallationKit'),
        value: 1,
        unit: t('calculators.plumbing.kit'),
        cost: installKitCost
      });
    }

    // Water softener if included
    if (includeWaterSoftener) {
      const softenerCost = getCustomPrice('water_softener', 599.98, 'equipment');
      const installKitCost = getCustomPrice('softener_install_kit', 89.98, 'equipment');
      totalCost += softenerCost + installKitCost;

      results.push({
        label: t('calculators.plumbing.waterSoftenerSystem'),
        value: 1,
        unit: t('calculators.plumbing.unit'),
        cost: softenerCost
      },
      {
        label: t('calculators.plumbing.softenerInstallationKit'),
        value: 1,
        unit: t('calculators.plumbing.kit'),
        cost: installKitCost
      });
    }

    // Pressure tank if included
    if (includePressureTank) {
      const defaultTankPrices = {
        20: 199.98,
        30: 249.98,
        40: 299.98
      };

      const defaultTankPrice = defaultTankPrices[pressureTankSize];
      const tankCost = getCustomPrice(`pressure_tank_${pressureTankSize}`, defaultTankPrice, 'equipment');
      const installKitCost = getCustomPrice('pressure_tank_install_kit', 69.98, 'equipment');
      totalCost += tankCost + installKitCost;

      results.push({
        label: `${pressureTankSize} ${t('calculators.plumbing.gallon')} ${t('calculators.plumbing.pressureTank')}`,
        value: 1,
        unit: t('calculators.plumbing.unit'),
        cost: tankCost
      },
      {
        label: t('calculators.plumbing.pressureTankInstallationKit'),
        value: 1,
        unit: t('calculators.plumbing.kit'),
        cost: installKitCost
      });
    }

    // Sewer connection if included
    if (includeSewerConnection && typeof sewerLength === 'number') {
      const sewerPipePrice = getCustomPrice('sewer_pipe_4', 12.98, 'pipe'); // 4" PVC sewer pipe
      const sewerPipeCost = sewerLength * sewerPipePrice;
      totalCost += sewerPipeCost;

      results.push({
        label: t('calculators.plumbing.sewerPipe'),
        value: sewerLength,
        unit: t('calculators.plumbing.feet'),
        cost: sewerPipeCost
      });
    }

    // Cleanouts if included
    if (includeCleanouts) {
      const cleanoutPrice = getCustomPrice('cleanout', 24.98, 'fixture');
      const cleanoutCost = cleanoutCount * cleanoutPrice;
      totalCost += cleanoutCost;

      results.push({
        label: t('calculators.plumbing.cleanouts'),
        value: cleanoutCount,
        unit: t('calculators.plumbing.pieces'),
        cost: cleanoutCost
      });
    }

    // Add total cost
    results.push({
      label: t('calculators.plumbing.totalEstimatedCost'),
      value: Number(totalCost.toFixed(2)),
      unit: 'USD',
      isTotal: true
    });

    onCalculate(results);
  };

  const isFormValid =
    pipingRuns.length > 0 &&
    pipingRuns.every(run =>
      typeof run.length === 'number' && run.length > 0
    ) &&
    (!includeSewerConnection || typeof sewerLength === 'number');

  // Loading state
  if (activeTab === 'custom' && loadingCustom) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Pipe className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.plumbing.title')}</h2>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading custom configuration...</p>
        </div>
      </div>
    );
  }

  // Not configured state
  if (activeTab === 'custom' && !isConfigured) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
        <div className="flex items-center mb-6">
          <Pipe className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">{t('calculators.plumbing.title')}</h2>
        </div>
        <div className="text-center py-12">
          <Pipe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Required</h3>
          <p className="text-gray-600 mb-4">
            This calculator hasn't been configured yet. Click the gear icon to set up your custom materials and pricing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Pipe className="h-6 w-6 text-blue-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.plumbing.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="plumbing"
        getCurrentInputs={getCurrentInputs}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">{t('calculators.plumbing.fixtures')}</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => addFixture('sink')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.plumbing.addSink')}
              </button>
              <button
                onClick={() => addFixture('toilet')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.plumbing.addToilet')}
              </button>
              <button
                onClick={() => addFixture('shower')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.plumbing.addShower')}
              </button>
              <button
                onClick={() => addFixture('tub')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.plumbing.addTub')}
              </button>
              <button
                onClick={() => addFixture('custom')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.plumbing.addCustom')}
              </button>
            </div>
          </div>

          {fixtures.map(fixture => (
            <div key={fixture.id} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fixture.type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.plumbing.fixtureName')}
                    </label>
                    <input
                      type="text"
                      value={fixture.name || ''}
                      onChange={(e) => updateFixture(fixture.id, { name: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder={t('calculators.plumbing.enterFixtureName')}
                    />
                  </div>
                )}

                {fixture.type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.plumbing.fixtureCost')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fixture.cost || ''}
                      onChange={(e) => updateFixture(fixture.id, { cost: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                      placeholder={t('calculators.plumbing.enterFixtureCost')}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.plumbing.supplyLines')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={fixture.supplyLines}
                    onChange={(e) => updateFixture(fixture.id, { supplyLines: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.plumbing.drainSize')}
                  </label>
                  <select
                    value={fixture.drainSize}
                    onChange={(e) => updateFixture(fixture.id, { drainSize: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value={1.5}>1-1/2"</option>
                    <option value={2}>2"</option>
                    <option value={3}>3"</option>
                    <option value={4}>4"</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.plumbing.ventSize')}
                  </label>
                  <select
                    value={fixture.ventSize}
                    onChange={(e) => updateFixture(fixture.id, { ventSize: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value={1.25}>1-1/4"</option>
                    <option value={1.5}>1-1/2"</option>
                    <option value={2}>2"</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.plumbing.distanceFromStack')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={fixture.distanceFromStack}
                    onChange={(e) => updateFixture(fixture.id, { distanceFromStack: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <button
                onClick={() => removeFixture(fixture.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                {t('calculators.plumbing.removeFixture')}
              </button>
            </div>
          ))}
        </div>

        <div className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">{t('calculators.plumbing.pipingRuns')}</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => addPipingRun('supply')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.plumbing.addSupplyLine')}
              </button>
              <button
                onClick={() => addPipingRun('drain')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.plumbing.addDrainLine')}
              </button>
              <button
                onClick={() => addPipingRun('vent')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {t('calculators.plumbing.addVentLine')}
              </button>
            </div>
          </div>

          {pipingRuns.map(run => (
            <div key={run.id} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.plumbing.pipeSize')}
                  </label>
                  <select
                    value={run.size}
                    onChange={(e) => updatePipingRun(run.id, { size: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    {run.type === 'supply' ? (
                      <>
                        <option value={0.5}>1/2"</option>
                        <option value={0.75}>3/4"</option>
                        <option value={1}>1"</option>
                      </>
                    ) : (
                      <>
                        <option value={1.5}>1-1/2"</option>
                        <option value={2}>2"</option>
                        <option value={3}>3"</option>
                        <option value={4}>4"</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.plumbing.pipeMaterial')}
                  </label>
                  <select
                    value={run.material}
                    onChange={(e) => updatePipingRun(run.id, { material: e.target.value as PipingRun['material'] })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    {run.type === 'supply' ? (
                      <>
                        <option value="pex">PEX</option>
                        <option value="copper">{t('calculators.plumbing.copper')}</option>
                        <option value="cpvc">CPVC</option>
                      </>
                    ) : (
                      <>
                        <option value="pvc">PVC</option>
                        <option value="abs">ABS</option>
                        <option value="cast-iron">{t('calculators.plumbing.castIron')}</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.plumbing.length')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={run.length || ''}
                    onChange={(e) => updatePipingRun(run.id, { length: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    placeholder={t('calculators.plumbing.enterLength')}
                  />
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-md font-medium text-slate-700 mb-2">{t('calculators.plumbing.fittings')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.plumbing.elbows90')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={run.fittings.elbows90}
                      onChange={(e) => updateFittings(run.id, { elbows90: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.plumbing.elbows45')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={run.fittings.elbows45}
                      onChange={(e) => updateFittings(run.id, { elbows45: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.plumbing.tees')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={run.fittings.tees}
                      onChange={(e) => updateFittings(run.id, { tees: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.plumbing.couplings')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={run.fittings.couplings}
                      onChange={(e) => updateFittings(run.id, { couplings: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.plumbing.adapters')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={run.fittings.adapters}
                      onChange={(e) => updateFittings(run.id, { adapters: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.plumbing.valves')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={run.fittings.valves}
                      onChange={(e) => updateFittings(run.id, { valves: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => removePipingRun(run.id)}
                className="mt-4 text-red-500 hover:text-red-600"
              >
                {t('calculators.plumbing.removePipingRun')}
              </button>
            </div>
          ))}
        </div>

        <div className="border-b border-slate-200 pb-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.plumbing.equipment')}</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeWaterHeater"
                checked={includeWaterHeater}
                onChange={(e) => setIncludeWaterHeater(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeWaterHeater" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.plumbing.includeWaterHeater')}
              </label>
            </div>

            {includeWaterHeater && (
              <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="waterHeaterType" className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.plumbing.waterHeaterType')}
                  </label>
                  <select
                    id="waterHeaterType"
                    value={waterHeaterType}
                    onChange={(e) => setWaterHeaterType(e.target.value as 'tank' | 'tankless')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="tank">{t('calculators.plumbing.tankWaterHeater')}</option>
                    <option value="tankless">{t('calculators.plumbing.tanklessWaterHeater')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="waterHeaterSize" className="block text-sm font-medium text-slate-700 mb-1">
                    {waterHeaterType === 'tank' ? t('calculators.plumbing.tankSize') : t('calculators.plumbing.capacity')}
                  </label>
                  <select
                    id="waterHeaterSize"
                    value={waterHeaterSize}
                    onChange={(e) => setWaterHeaterSize(Number(e.target.value) as 30 | 40 | 50 | 75)}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value={30}>30</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeWaterSoftener"
                checked={includeWaterSoftener}
                onChange={(e) => setIncludeWaterSoftener(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeWaterSoftener" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.plumbing.includeWaterSoftener')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includePressureTank"
                checked={includePressureTank}
                onChange={(e) => setIncludePressureTank(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includePressureTank" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.plumbing.includePressureTank')}
              </label>
            </div>

            {includePressureTank && (
              <div className="pl-6">
                <label htmlFor="pressureTankSize" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.plumbing.pressureTankSize')}
                </label>
                <select
                  id="pressureTankSize"
                  value={pressureTankSize}
                  onChange={(e) => setPressureTankSize(Number(e.target.value) as 20 | 30 | 40)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-slate-200 pb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.plumbing.drainage')}</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeSewerConnection"
                checked={includeSewerConnection}
                onChange={(e) => setIncludeSewerConnection(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeSewerConnection" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.plumbing.includeSewerConnection')}
              </label>
            </div>

            {includeSewerConnection && (
              <div className="pl-6">
                <label htmlFor="sewerLength" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.plumbing.sewerLineLength')}
                </label>
                <input
                  type="number"
                  id="sewerLength"
                  min="0"
                  step="1"
                  value={sewerLength}
                  onChange={(e) => setSewerLength(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md"
                  placeholder={t('calculators.plumbing.enterSewerLineLength')}
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeCleanouts"
                checked={includeCleanouts}
                onChange={(e) => setIncludeCleanouts(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="includeCleanouts" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.plumbing.includeCleanouts')}
              </label>
            </div>

            {includeCleanouts && (
              <div className="pl-6">
                <label htmlFor="cleanoutCount" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.plumbing.numberOfCleanouts')}
                </label>
                <input
                  type="number"
                  id="cleanoutCount"
                  min="1"
                  step="1"
                  value={cleanoutCount}
                  onChange={(e) => setCleanoutCount(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-md"
                  placeholder={t('calculators.plumbing.enterNumberOfCleanouts')}
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
            ? 'bg-blue-500 hover:bg-blue-600 transition-colors'
            : 'bg-slate-300 cursor-not-allowed'
        }`}
      >
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default PlumbingCalculator;
