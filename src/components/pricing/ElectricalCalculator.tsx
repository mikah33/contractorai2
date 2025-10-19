import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';

interface Circuit {
  id: string;
  type: 'lighting' | 'receptacle' | 'appliance' | 'hvac';
  amperage: 15 | 20 | 30 | 40 | 50;
  voltage: 120 | 240;
  length: number;
  wireGauge: 14 | 12 | 10 | 8 | 6;
  wireType: 'nm-b' | 'thhn' | 'ser' | 'uf-b';
  conduit: boolean;
  conduitType?: 'emt' | 'pvc' | 'flex';
  conduitSize?: 0.5 | 0.75 | 1;
  deviceCount: number;
  boxCount: number;
}

const ElectricalCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [includePanel, setIncludePanel] = useState(false);
  const [panelSize, setPanelSize] = useState<100 | 150 | 200>(200);
  const [panelSpaces, setPanelSpaces] = useState<20 | 30 | 40>(30);
  const [includeGroundRods, setIncludeGroundRods] = useState(true);
  const [includeGFCI, setIncludeGFCI] = useState(true);
  const [includeAFCI, setIncludeAFCI] = useState(true);
  const [lastCalculation, setLastCalculation] = useState<CalculationResult[] | null>(null);

  const getCurrentInputs = () => ({
    circuits,
    includePanel,
    panelSize,
    panelSpaces,
    includeGroundRods,
    includeGFCI,
    includeAFCI
  });

  const handleLoadEstimate = (inputs: Record<string, any>) => {
    setCircuits(inputs.circuits ?? []);
    setIncludePanel(inputs.includePanel ?? false);
    setPanelSize(inputs.panelSize ?? 200);
    setPanelSpaces(inputs.panelSpaces ?? 30);
    setIncludeGroundRods(inputs.includeGroundRods ?? true);
    setIncludeGFCI(inputs.includeGFCI ?? true);
    setIncludeAFCI(inputs.includeAFCI ?? true);
  };

  const handleNewEstimate = () => {
    setCircuits([]);
    setIncludePanel(false);
    setPanelSize(200);
    setPanelSpaces(30);
    setIncludeGroundRods(true);
    setIncludeGFCI(true);
    setIncludeAFCI(true);
    setLastCalculation(null);
  };

  const addCircuit = () => {
    const newCircuit: Circuit = {
      id: Date.now().toString(),
      type: 'lighting',
      amperage: 15,
      voltage: 120,
      length: 0,
      wireGauge: 14,
      wireType: 'nm-b',
      conduit: false,
      deviceCount: 0,
      boxCount: 0
    };
    setCircuits([...circuits, newCircuit]);
  };

  const updateCircuit = (id: string, updates: Partial<Circuit>) => {
    setCircuits(circuits.map(circuit =>
      circuit.id === id ? { ...circuit, ...updates } : circuit
    ));
  };

  const removeCircuit = (id: string) => {
    setCircuits(circuits.filter(circuit => circuit.id !== id));
  };

  const getWirePrice = (gauge: number, type: string) => {
    const prices = {
      'nm-b': {
        14: 89.98,  // 250ft roll
        12: 109.98, // 250ft roll
        10: 159.98, // 250ft roll
        8: 249.98,  // 250ft roll
        6: 399.98   // 250ft roll
      },
      'thhn': {
        14: 49.98,  // 500ft roll
        12: 69.98,  // 500ft roll
        10: 99.98,  // 500ft roll
        8: 159.98,  // 500ft roll
        6: 259.98   // 500ft roll
      },
      'ser': {
        6: 299.98,  // 125ft roll
        8: 199.98   // 125ft roll
      },
      'uf-b': {
        14: 119.98, // 250ft roll
        12: 149.98, // 250ft roll
        10: 199.98, // 250ft roll
        8: 299.98,  // 250ft roll
        6: 449.98   // 250ft roll
      }
    };
    return prices[type][gauge];
  };

  const getConduitPrice = (type: string, size: number) => {
    const prices = {
      'emt': {
        0.5: 4.98,   // 10ft length
        0.75: 6.98,  // 10ft length
        1: 8.98      // 10ft length
      },
      'pvc': {
        0.5: 3.98,   // 10ft length
        0.75: 5.98,  // 10ft length
        1: 7.98      // 10ft length
      },
      'flex': {
        0.5: 12.98,  // 25ft roll
        0.75: 15.98, // 25ft roll
        1: 19.98     // 25ft roll
      }
    };
    return prices[type][size];
  };

  const handleCalculate = () => {
    const results: CalculationResult[] = [];
    let totalCost = 0;

    // Calculate panel if included
    if (includePanel) {
      const panelPrices = {
        100: { 20: 89.98, 30: 119.98, 40: 149.98 },
        150: { 20: 119.98, 30: 149.98, 40: 179.98 },
        200: { 20: 149.98, 30: 179.98, 40: 209.98 }
      };
      const panelCost = panelPrices[panelSize][panelSpaces];
      totalCost += panelCost;

      results.push({
        label: `${panelSize}${t('calculators.electrical.ampPanel')} (${panelSpaces} ${t('calculators.electrical.spaces')})`,
        value: 1,
        unit: t('calculators.electrical.panel'),
        cost: panelCost
      });

      if (includeGroundRods) {
        const groundRodCost = 2 * 12.98; // Two ground rods required
        const groundClampCost = 2 * 4.98;
        const groundWireCost = 20.98; // 25ft of #6 bare copper
        totalCost += groundRodCost + groundClampCost + groundWireCost;

        results.push({
          label: t('calculators.electrical.groundingSystem'),
          value: 1,
          unit: t('calculators.electrical.set'),
          cost: groundRodCost + groundClampCost + groundWireCost
        });
      }
    }

    // Calculate circuit materials
    circuits.forEach(circuit => {
      // Wire calculations
      const wireRollLength = circuit.wireType === 'ser' ? 125 : 250;
      const wiringRuns = circuit.voltage === 240 ? 3 : 2;
      const totalWireLength = circuit.length * wiringRuns * 1.2; // 20% extra for bends and connections
      const wireRollsNeeded = Math.ceil(totalWireLength / wireRollLength);
      const wireCost = wireRollsNeeded * getWirePrice(circuit.wireGauge, circuit.wireType);
      totalCost += wireCost;

      results.push({
        label: `${circuit.wireGauge} AWG ${circuit.wireType.toUpperCase()} ${t('calculators.electrical.wire')}`,
        value: wireRollsNeeded,
        unit: `${wireRollLength}${t('calculators.electrical.ftRolls')}`,
        cost: wireCost
      });

      // Conduit calculations if needed
      if (circuit.conduit && circuit.conduitType && circuit.conduitSize) {
        const conduitLength = Math.ceil(circuit.length * 1.1); // 10% extra for bends
        const conduitPieces = Math.ceil(conduitLength / 10);
        const conduitCost = conduitPieces * getConduitPrice(circuit.conduitType, circuit.conduitSize);
        totalCost += conduitCost;

        results.push({
          label: `${circuit.conduitSize}" ${circuit.conduitType.toUpperCase()} ${t('calculators.electrical.conduit')}`,
          value: conduitPieces,
          unit: t('calculators.electrical.tenFtLengths'),
          cost: conduitCost
        });

        // Conduit fittings
        const fittingsPerLength = 2;
        const fittingsNeeded = conduitPieces * fittingsPerLength;
        const fittingCost = fittingsNeeded * 1.98;
        totalCost += fittingCost;

        results.push({
          label: t('calculators.electrical.conduitFittings'),
          value: fittingsNeeded,
          unit: t('calculators.electrical.pieces'),
          cost: fittingCost
        });
      }

      // Device calculations
      if (circuit.deviceCount > 0) {
        let deviceCost = 0;
        if (circuit.type === 'receptacle') {
          const gfciPrice = 19.98;
          const standardPrice = 3.98;
          const gfciCount = includeGFCI ? Math.ceil(circuit.deviceCount / 4) : 0;
          const standardCount = circuit.deviceCount - gfciCount;
          deviceCost = (gfciCount * gfciPrice) + (standardCount * standardPrice);
        } else if (circuit.type === 'lighting') {
          deviceCost = circuit.deviceCount * 4.98; // Standard switches
        }
        totalCost += deviceCost;

        results.push({
          label: `${circuit.type.charAt(0).toUpperCase() + circuit.type.slice(1)} ${t('calculators.electrical.devices')}`,
          value: circuit.deviceCount,
          unit: t('calculators.electrical.pieces'),
          cost: deviceCost
        });
      }

      // Box calculations
      if (circuit.boxCount > 0) {
        const boxPrice = circuit.type === 'lighting' ? 0.98 : 1.98;
        const boxCost = circuit.boxCount * boxPrice;
        totalCost += boxCost;

        results.push({
          label: t('calculators.electrical.electricalBoxes'),
          value: circuit.boxCount,
          unit: t('calculators.electrical.pieces'),
          cost: boxCost
        });
      }

      // Circuit breaker
      const breakerPrice = circuit.amperage >= 30 ? 24.98 :
                          (includeAFCI ? 39.98 : 8.98);
      totalCost += breakerPrice;

      results.push({
        label: `${circuit.amperage}${t('calculators.electrical.ampCircuitBreaker')}${includeAFCI ? ` (${t('calculators.electrical.afci')})` : ''}`,
        value: 1,
        unit: t('calculators.electrical.piece'),
        cost: breakerPrice
      });
    });

    setLastCalculation(results);
    onCalculate(results);
  };

  const isFormValid = circuits.length > 0 && circuits.every(circuit =>
    typeof circuit.length === 'number' &&
    circuit.length > 0 &&
    typeof circuit.deviceCount === 'number' &&
    typeof circuit.boxCount === 'number'
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Zap className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.electrical.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="electrical"
        currentData={getCurrentInputs()}
        onLoad={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-800">{t('calculators.electrical.circuits')}</h3>
          <button
            onClick={addCircuit}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            {t('calculators.electrical.addCircuit')}
          </button>
        </div>

        {circuits.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Zap className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">{t('calculators.electrical.addCircuitsPrompt')}</p>
            <button
              onClick={addCircuit}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              {t('calculators.electrical.addFirstCircuit')}
            </button>
          </div>
        )}

        {circuits.map(circuit => (
          <div key={circuit.id} className="mb-6 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.electrical.circuitType')}
                </label>
                <select
                  value={circuit.type}
                  onChange={(e) => updateCircuit(circuit.id, { type: e.target.value as Circuit['type'] })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="lighting">{t('calculators.electrical.lightingCircuit')}</option>
                  <option value="receptacle">{t('calculators.electrical.receptacleCircuit')}</option>
                  <option value="appliance">{t('calculators.electrical.applianceCircuit')}</option>
                  <option value="hvac">{t('calculators.electrical.hvacCircuit')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.electrical.amperage')}
                </label>
                <select
                  value={circuit.amperage}
                  onChange={(e) => updateCircuit(circuit.id, { amperage: Number(e.target.value) as Circuit['amperage'] })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={15}>{t('calculators.electrical.fifteenAmp')}</option>
                  <option value={20}>{t('calculators.electrical.twentyAmp')}</option>
                  <option value={30}>{t('calculators.electrical.thirtyAmp')}</option>
                  <option value={40}>{t('calculators.electrical.fortyAmp')}</option>
                  <option value={50}>{t('calculators.electrical.fiftyAmp')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.electrical.voltage')}
                </label>
                <select
                  value={circuit.voltage}
                  onChange={(e) => updateCircuit(circuit.id, { voltage: Number(e.target.value) as Circuit['voltage'] })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={120}>{t('calculators.electrical.onetwentyV')}</option>
                  <option value={240}>{t('calculators.electrical.twofortyV')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.electrical.wireLengthFeet')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={circuit.length || ''}
                  onChange={(e) => updateCircuit(circuit.id, { length: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.electrical.enterWireLength')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.electrical.wireGauge')}
                </label>
                <select
                  value={circuit.wireGauge}
                  onChange={(e) => updateCircuit(circuit.id, { wireGauge: Number(e.target.value) as Circuit['wireGauge'] })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={14}>{t('calculators.electrical.fourteenAWG')}</option>
                  <option value={12}>{t('calculators.electrical.twelveAWG')}</option>
                  <option value={10}>{t('calculators.electrical.tenAWG')}</option>
                  <option value={8}>{t('calculators.electrical.eightAWG')}</option>
                  <option value={6}>{t('calculators.electrical.sixAWG')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.electrical.wireType')}
                </label>
                <select
                  value={circuit.wireType}
                  onChange={(e) => updateCircuit(circuit.id, { wireType: e.target.value as Circuit['wireType'] })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="nm-b">{t('calculators.electrical.nmb')}</option>
                  <option value="thhn">{t('calculators.electrical.thhn')}</option>
                  <option value="ser">{t('calculators.electrical.ser')}</option>
                  <option value="uf-b">{t('calculators.electrical.ufb')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.electrical.deviceCount')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={circuit.deviceCount || ''}
                  onChange={(e) => updateCircuit(circuit.id, { deviceCount: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.electrical.enterDeviceCount')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.electrical.boxCount')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={circuit.boxCount || ''}
                  onChange={(e) => updateCircuit(circuit.id, { boxCount: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.electrical.enterBoxCount')}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={circuit.conduit}
                  onChange={(e) => updateCircuit(circuit.id, { conduit: e.target.checked })}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-slate-700">
                  {t('calculators.electrical.requiresConduit')}
                </label>
              </div>
            </div>

            {circuit.conduit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.electrical.conduitType')}
                  </label>
                  <select
                    value={circuit.conduitType}
                    onChange={(e) => updateCircuit(circuit.id, { conduitType: e.target.value as Circuit['conduitType'] })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="emt">{t('calculators.electrical.emt')}</option>
                    <option value="pvc">{t('calculators.electrical.pvc')}</option>
                    <option value="flex">{t('calculators.electrical.flexible')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.electrical.conduitSize')}
                  </label>
                  <select
                    value={circuit.conduitSize}
                    onChange={(e) => updateCircuit(circuit.id, { conduitSize: Number(e.target.value) as Circuit['conduitSize'] })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value={0.5}>{t('calculators.electrical.halfInch')}</option>
                    <option value={0.75}>{t('calculators.electrical.threeQuarterInch')}</option>
                    <option value={1}>{t('calculators.electrical.oneInch')}</option>
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={() => removeCircuit(circuit.id)}
              className="mt-4 text-red-500 hover:text-red-600 text-sm font-medium"
            >
              {t('calculators.electrical.removeCircuit')}
            </button>
          </div>
        ))}

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.electrical.additionalOptions')}</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includePanel"
                checked={includePanel}
                onChange={(e) => setIncludePanel(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includePanel" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.electrical.includePanel')}
              </label>
            </div>

            {includePanel && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <div>
                  <label htmlFor="panelSize" className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.electrical.panelSize')}
                  </label>
                  <select
                    id="panelSize"
                    value={panelSize}
                    onChange={(e) => setPanelSize(Number(e.target.value) as 100 | 150 | 200)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value={100}>{t('calculators.electrical.oneHundredAmp')}</option>
                    <option value={150}>{t('calculators.electrical.oneFiftyAmp')}</option>
                    <option value={200}>{t('calculators.electrical.twoHundredAmp')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="panelSpaces" className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.electrical.panelSpaces')}
                  </label>
                  <select
                    id="panelSpaces"
                    value={panelSpaces}
                    onChange={(e) => setPanelSpaces(Number(e.target.value) as 20 | 30 | 40)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value={20}>{t('calculators.electrical.twentySpace')}</option>
                    <option value={30}>{t('calculators.electrical.thirtySpace')}</option>
                    <option value={40}>{t('calculators.electrical.fortySpace')}</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeGroundRods"
                    checked={includeGroundRods}
                    onChange={(e) => setIncludeGroundRods(e.target.checked)}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                  />
                  <label htmlFor="includeGroundRods" className="ml-2 block text-sm font-medium text-slate-700">
                    {t('calculators.electrical.includeGroundRods')}
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeGFCI"
                checked={includeGFCI}
                onChange={(e) => setIncludeGFCI(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeGFCI" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.electrical.includeGFCIProtection')}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeAFCI"
                checked={includeAFCI}
                onChange={(e) => setIncludeAFCI(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeAFCI" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.electrical.includeAFCIProtection')}
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

export default ElectricalCalculator;
