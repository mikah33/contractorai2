import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Shovel } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ExcavationCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [depth, setDepth] = useState<number | ''>('');
  const [removalCostPerYard, setRemovalCostPerYard] = useState<number | ''>('');
  const [soilType, setSoilType] = useState<'loose' | 'compacted' | 'rock'>('loose');
  const [hasSlopedSides, setHasSlopedSides] = useState(false);
  const [slopeRatio, setSlopeRatio] = useState<1 | 1.5 | 2>(1.5);
  const [includeHaulOff, setIncludeHaulOff] = useState(true);
  const [totalHaulOffCost, setTotalHaulOffCost] = useState<number | ''>('');
  const [addSpoilFactor, setAddSpoilFactor] = useState(true);
  const [spoilFactor, setSpoilFactor] = useState<10 | 15 | 20>(15);

  const handleCalculate = () => {
    if (typeof length === 'number' && typeof width === 'number' &&
        typeof depth === 'number' && typeof removalCostPerYard === 'number') {

      let totalVolume = 0;
      const results: CalculationResult[] = [];

      // Base volume calculation
      if (!hasSlopedSides) {
        totalVolume = (length * width * depth) / 27; // Convert cubic feet to cubic yards
      } else {
        // Calculate volume with sloped sides using the trapezoidal formula
        const slopeDepthOffset = depth * slopeRatio;
        const topLength = length + (2 * slopeDepthOffset);
        const topWidth = width + (2 * slopeDepthOffset);

        // Average area times height
        totalVolume = (
          ((length * width) + (topLength * topWidth)) / 2 * depth
        ) / 27;
      }

      // Add spoil factor if selected
      const spoilVolume = addSpoilFactor ? totalVolume * (1 + spoilFactor / 100) : totalVolume;

      results.push({
        label: t('calculators.excavation.baseExcavationVolume'),
        value: Number(totalVolume.toFixed(2)),
        unit: t('calculators.excavation.cubicYards')
      });

      if (addSpoilFactor) {
        results.push({
          label: t('calculators.excavation.volumeWithSpoilFactor', { factor: spoilFactor }),
          value: Number(spoilVolume.toFixed(2)),
          unit: t('calculators.excavation.cubicYards')
        });
      }

      // Calculate removal cost
      const removalCost = spoilVolume * removalCostPerYard;
      let totalCost = removalCost;

      results.push({
        label: t('calculators.excavation.removalCost'),
        value: Number(removalCost.toFixed(2)),
        unit: t('calculators.excavation.usd'),
        cost: removalCost
      });

      // Add haul-off costs if applicable
      if (includeHaulOff && typeof totalHaulOffCost === 'number') {
        totalCost += totalHaulOffCost;

        results.push({
          label: t('calculators.excavation.totalHaulOffCost'),
          value: Number(totalHaulOffCost.toFixed(2)),
          unit: t('calculators.excavation.usd'),
          cost: totalHaulOffCost
        });
      }

      // Add total cost
      results.push({
        label: t('calculators.excavation.totalCost'),
        value: Number(totalCost.toFixed(2)),
        unit: t('calculators.excavation.usd'),
        isTotal: true
      });

      onCalculate(results);
    }
  };

  const isFormValid =
    typeof length === 'number' &&
    typeof width === 'number' &&
    typeof depth === 'number' &&
    typeof removalCostPerYard === 'number' &&
    (!includeHaulOff || typeof totalHaulOffCost === 'number');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Shovel className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.excavation.title')}</h2>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.excavation.lengthFeet')}
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.excavation.enterLengthInFeet')}
            />
          </div>

          <div>
            <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.excavation.widthFeet')}
            </label>
            <input
              type="number"
              id="width"
              min="0"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.excavation.enterWidthInFeet')}
            />
          </div>

          <div>
            <label htmlFor="depth" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.excavation.depthFeet')}
            </label>
            <input
              type="number"
              id="depth"
              min="0"
              step="0.1"
              value={depth}
              onChange={(e) => setDepth(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.excavation.enterDepthInFeet')}
            />
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="removalCostPerYard" className="block text-sm font-medium text-slate-700 mb-1">
            {t('calculators.excavation.removalCostPerCubicYard')}
          </label>
          <input
            type="number"
            id="removalCostPerYard"
            min="0"
            step="0.01"
            value={removalCostPerYard}
            onChange={(e) => setRemovalCostPerYard(e.target.value ? Number(e.target.value) : '')}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder={t('calculators.excavation.enterRemovalCostPerCubicYard')}
          />
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.excavation.siteConditions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="soilType" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.excavation.soilType')}
              </label>
              <select
                id="soilType"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value as 'loose' | 'compacted' | 'rock')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="loose">{t('calculators.excavation.looseSoil')}</option>
                <option value="compacted">{t('calculators.excavation.compactedSoil')}</option>
                <option value="rock">{t('calculators.excavation.rockySoil')}</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasSlopedSides"
                checked={hasSlopedSides}
                onChange={(e) => setHasSlopedSides(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="hasSlopedSides" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.excavation.includeSlopedSides')}
              </label>
            </div>
          </div>

          {hasSlopedSides && (
            <div className="mt-4">
              <label htmlFor="slopeRatio" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.excavation.slopeRatio')}
              </label>
              <select
                id="slopeRatio"
                value={slopeRatio}
                onChange={(e) => setSlopeRatio(Number(e.target.value) as 1 | 1.5 | 2)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={1}>{t('calculators.excavation.slope1to1')}</option>
                <option value={1.5}>{t('calculators.excavation.slope1_5to1')}</option>
                <option value={2}>{t('calculators.excavation.slope2to1')}</option>
              </select>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.excavation.additionalOptions')}</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="addSpoilFactor"
                checked={addSpoilFactor}
                onChange={(e) => setAddSpoilFactor(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="addSpoilFactor" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.excavation.addSpoilFactor')}
              </label>
            </div>

            {addSpoilFactor && (
              <div>
                <label htmlFor="spoilFactor" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.excavation.spoilFactorPercentage')}
                </label>
                <select
                  id="spoilFactor"
                  value={spoilFactor}
                  onChange={(e) => setSpoilFactor(Number(e.target.value) as 10 | 15 | 20)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value={10}>{t('calculators.excavation.spoilFactor10')}</option>
                  <option value={15}>{t('calculators.excavation.spoilFactor15')}</option>
                  <option value={20}>{t('calculators.excavation.spoilFactor20')}</option>
                </select>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeHaulOff"
                checked={includeHaulOff}
                onChange={(e) => setIncludeHaulOff(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeHaulOff" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.excavation.includeHaulOff')}
              </label>
            </div>

            {includeHaulOff && (
              <div>
                <label htmlFor="totalHaulOffCost" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.excavation.totalHaulOffCostForJob')}
                </label>
                <input
                  type="number"
                  id="totalHaulOffCost"
                  min="0"
                  step="0.01"
                  value={totalHaulOffCost}
                  onChange={(e) => setTotalHaulOffCost(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('calculators.excavation.enterTotalHaulOffCost')}
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
            ? 'bg-orange-500 hover:bg-orange-600 transition-colors'
            : 'bg-slate-300 cursor-not-allowed'
        }`}
      >
        {t('calculators.calculateMaterials')}
      </button>
    </div>
  );
};

export default ExcavationCalculator;
