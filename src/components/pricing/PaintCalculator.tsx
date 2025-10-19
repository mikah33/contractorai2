import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Paintbrush } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalculatorEstimateHeader } from '../calculators/CalculatorEstimateHeader';

interface Opening {
  width: number;
  height: number;
}

interface Surface {
  length: number;
  height: number;
  condition: 'good' | 'fair' | 'poor';
}

const PaintCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [paintLocation, setPaintLocation] = useState<'interior' | 'exterior'>('interior');
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial');
  const [surfaces, setSurfaces] = useState<Surface[]>([{ length: 0, height: 0, condition: 'good' }]);
  const [doors, setDoors] = useState<Opening[]>([]);
  const [windows, setWindows] = useState<Opening[]>([]);
  const [coats, setCoats] = useState<1 | 2>(2);
  const [paintType, setPaintType] = useState<'economy' | 'standard' | 'premium'>('standard');
  const [paintFinish, setPaintFinish] = useState<'flat' | 'eggshell' | 'satin' | 'semi-gloss'>('eggshell');
  const [includePrimer, setIncludePrimer] = useState(false);
  const [includeWaste, setIncludeWaste] = useState(true);
  const [wasteFactor, setWasteFactor] = useState<5 | 10 | 15>(10);

  const addSurface = () => {
    setSurfaces([...surfaces, { length: 0, height: 0, condition: 'good' }]);
  };

  const updateSurface = (index: number, field: keyof Surface, value: any) => {
    const newSurfaces = [...surfaces];
    newSurfaces[index] = { ...newSurfaces[index], [field]: value };
    setSurfaces(newSurfaces);
  };

  const removeSurface = (index: number) => {
    setSurfaces(surfaces.filter((_, i) => i !== index));
  };

  const getCurrentInputs = () => ({
    paintLocation,
    unit,
    surfaces,
    doors,
    windows,
    coats,
    paintType,
    paintFinish,
    includePrimer,
    includeWaste,
    wasteFactor
  });

  const handleLoadEstimate = (inputs: any) => {
    setPaintLocation(inputs.paintLocation || 'interior');
    setUnit(inputs.unit || 'imperial');
    setSurfaces(inputs.surfaces || [{ length: 0, height: 0, condition: 'good' }]);
    setDoors(inputs.doors || []);
    setWindows(inputs.windows || []);
    setCoats(inputs.coats || 2);
    setPaintType(inputs.paintType || 'standard');
    setPaintFinish(inputs.paintFinish || 'eggshell');
    setIncludePrimer(inputs.includePrimer || false);
    setIncludeWaste(inputs.includeWaste !== undefined ? inputs.includeWaste : true);
    setWasteFactor(inputs.wasteFactor || 10);
  };

  const handleNewEstimate = () => {
    setPaintLocation('interior');
    setUnit('imperial');
    setSurfaces([{ length: 0, height: 0, condition: 'good' }]);
    setDoors([]);
    setWindows([]);
    setCoats(2);
    setPaintType('standard');
    setPaintFinish('eggshell');
    setIncludePrimer(false);
    setIncludeWaste(true);
    setWasteFactor(10);
  };

  const addDoor = () => {
    setDoors([...doors, { width: 3, height: 7 }]);
  };

  const addWindow = () => {
    setWindows([...windows, { width: 3, height: 3 }]);
  };

  const updateDoor = (index: number, field: keyof Opening, value: number) => {
    const newDoors = [...doors];
    newDoors[index] = { ...newDoors[index], [field]: value };
    setDoors(newDoors);
  };

  const updateWindow = (index: number, field: keyof Opening, value: number) => {
    const newWindows = [...windows];
    newWindows[index] = { ...newWindows[index], [field]: value };
    setWindows(newWindows);
  };

  const removeDoor = (index: number) => {
    setDoors(doors.filter((_, i) => i !== index));
  };

  const removeWindow = (index: number) => {
    setWindows(windows.filter((_, i) => i !== index));
  };

  const getPaintPrice = () => {
    const prices = {
      interior: {
        economy: { gallon: 25.98, coverage: 400 },
        standard: { gallon: 35.98, coverage: 400 },
        premium: { gallon: 45.98, coverage: 400 }
      },
      exterior: {
        economy: { gallon: 30.98, coverage: 350 },
        standard: { gallon: 40.98, coverage: 350 },
        premium: { gallon: 50.98, coverage: 350 }
      }
    };
    return prices[paintLocation][paintType];
  };

  const getPrimerPrice = () => {
    return paintLocation === 'interior' ? 25.98 : 30.98;
  };

  const handleCalculate = () => {
    // Calculate total surface area
    let totalArea = surfaces.reduce((sum, surface) => {
      return sum + (surface.length * surface.height);
    }, 0);

    // Subtract openings
    const doorArea = doors.reduce((sum, door) => sum + (door.width * door.height), 0);
    const windowArea = windows.reduce((sum, window) => sum + (window.width * window.height), 0);
    totalArea -= (doorArea + windowArea);

    // Add waste factor
    const areaWithWaste = includeWaste ? totalArea * (1 + wasteFactor / 100) : totalArea;

    // Calculate paint needed
    const paintInfo = getPaintPrice();
    const totalCoats = coats;
    const coveragePerGallon = paintInfo.coverage;

    // Adjust coverage based on surface condition
    const conditionFactors = { good: 1, fair: 0.9, poor: 0.8 };
    const averageConditionFactor = surfaces.reduce((sum, surface) =>
      sum + conditionFactors[surface.condition], 0) / surfaces.length;

    const effectiveCoverage = coveragePerGallon * averageConditionFactor;
    const gallonsNeeded = Math.ceil((areaWithWaste * totalCoats) / effectiveCoverage);

    const paintCost = gallonsNeeded * paintInfo.gallon;

    const results: CalculationResult[] = [
      {
        label: t('calculators.paint.totalWallArea'),
        value: Number(totalArea.toFixed(2)),
        unit: t('calculators.paint.squareFeet')
      },
      {
        label: `${t('calculators.paint.paintNeeded')} (${t(`calculators.paint.paintType.${paintType}`)}, ${t(`calculators.paint.paintFinish.${paintFinish}`)})`,
        value: gallonsNeeded,
        unit: t('calculators.paint.gallons'),
        cost: paintCost
      }
    ];

    if (includePrimer) {
      const primerGallons = Math.ceil(areaWithWaste / 400); // Primer typically covers 400 sq ft
      const primerCost = primerGallons * getPrimerPrice();

      results.push({
        label: t('calculators.paint.primerNeeded'),
        value: primerGallons,
        unit: t('calculators.paint.gallons'),
        cost: primerCost
      });
    }

    // Add supplies
    const suppliesCost = Math.ceil(totalArea / 400) * 25; // Basic supplies per 400 sq ft
    results.push({
      label: t('calculators.paint.paintingSupplies'),
      value: 1,
      unit: t('calculators.paint.set'),
      cost: suppliesCost
    });

    // Calculate total cost
    const totalCost = results.reduce((sum, item) => sum + (item.cost || 0), 0);
    results.push({
      label: t('calculators.paint.totalCost'),
      value: Number(totalCost.toFixed(2)),
      unit: t('calculators.paint.usd'),
      isTotal: true
    });

    onCalculate(results);
  };

  const isFormValid = surfaces.every(surface =>
    typeof surface.length === 'number' &&
    surface.length > 0 &&
    typeof surface.height === 'number' &&
    surface.height > 0
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Paintbrush className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.paint.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="paint"
        getCurrentInputs={getCurrentInputs}
        onLoadEstimate={handleLoadEstimate}
        onNewEstimate={handleNewEstimate}
      />

      <div className="mb-4">
        <div className="flex justify-between mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                paintLocation === 'interior'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setPaintLocation('interior')}
            >
              {t('calculators.paint.interior')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                paintLocation === 'exterior'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setPaintLocation('exterior')}
            >
              {t('calculators.paint.exterior')}
            </button>
          </div>

          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                unit === 'imperial'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setUnit('imperial')}
            >
              {t('calculators.paint.imperial')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                unit === 'metric'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setUnit('metric')}
            >
              {t('calculators.paint.metric')}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">{t('calculators.paint.surfacesToPaint')}</h3>
            <button
              onClick={addSurface}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              {t('calculators.paint.addSurface')}
            </button>
          </div>

          {surfaces.map((surface, index) => (
            <div key={index} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.paint.length')} ({unit === 'imperial' ? t('calculators.paint.feet') : t('calculators.paint.meters')})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={surface.length || ''}
                    onChange={(e) => updateSurface(index, 'length', Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.paint.height')} ({unit === 'imperial' ? t('calculators.paint.feet') : t('calculators.paint.meters')})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={surface.height || ''}
                    onChange={(e) => updateSurface(index, 'height', Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('calculators.paint.surfaceCondition')}
                  </label>
                  <select
                    value={surface.condition}
                    onChange={(e) => updateSurface(index, 'condition', e.target.value as 'good' | 'fair' | 'poor')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="good">{t('calculators.paint.conditionGood')}</option>
                    <option value="fair">{t('calculators.paint.conditionFair')}</option>
                    <option value="poor">{t('calculators.paint.conditionPoor')}</option>
                  </select>
                </div>
              </div>
              {surfaces.length > 1 && (
                <button
                  onClick={() => removeSurface(index)}
                  className="mt-2 text-red-500 hover:text-red-600"
                >
                  {t('calculators.paint.removeSurface')}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.paint.paintTypeLabel')}
              </label>
              <select
                value={paintType}
                onChange={(e) => setPaintType(e.target.value as typeof paintType)}
                className="w-full p-2 border border-slate-300 rounded-md"
              >
                <option value="economy">{t('calculators.paint.paintType.economy')}</option>
                <option value="standard">{t('calculators.paint.paintType.standard')}</option>
                <option value="premium">{t('calculators.paint.paintType.premium')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.paint.paintFinishLabel')}
              </label>
              <select
                value={paintFinish}
                onChange={(e) => setPaintFinish(e.target.value as typeof paintFinish)}
                className="w-full p-2 border border-slate-300 rounded-md"
              >
                <option value="flat">{t('calculators.paint.paintFinish.flat')}</option>
                <option value="eggshell">{t('calculators.paint.paintFinish.eggshell')}</option>
                <option value="satin">{t('calculators.paint.paintFinish.satin')}</option>
                <option value="semi-gloss">{t('calculators.paint.paintFinish.semiGloss')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.paint.numberOfCoats')}
              </label>
              <select
                value={coats}
                onChange={(e) => setCoats(Number(e.target.value) as 1 | 2)}
                className="w-full p-2 border border-slate-300 rounded-md"
              >
                <option value={1}>{t('calculators.paint.singleCoat')}</option>
                <option value={2}>{t('calculators.paint.twoCoats')}</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includePrimer"
                checked={includePrimer}
                onChange={(e) => setIncludePrimer(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includePrimer" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.paint.includePrimer')}
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeWaste"
              checked={includeWaste}
              onChange={(e) => setIncludeWaste(e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeWaste" className="ml-2 block text-sm font-medium text-slate-700">
              {t('calculators.paint.includeWasteFactor')}
            </label>
          </div>

          {includeWaste && (
            <div>
              <label htmlFor="wasteFactor" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.paint.wasteFactorPercentage')}
              </label>
              <select
                id="wasteFactor"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(Number(e.target.value) as 5 | 10 | 15)}
                className="w-full p-2 border border-slate-300 rounded-md"
              >
                <option value={5}>{t('calculators.paint.wasteFactor5')}</option>
                <option value={10}>{t('calculators.paint.wasteFactor10')}</option>
                <option value={15}>{t('calculators.paint.wasteFactor15')}</option>
              </select>
            </div>
          )}
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

export default PaintCalculator;
