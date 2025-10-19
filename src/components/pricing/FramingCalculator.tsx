import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Ruler } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CalculatorEstimateHeader from './CalculatorEstimateHeader';

interface Opening {
  width: number;
  height: number;
  type: 'door' | 'window';
  roughOpening: boolean;
}

const FramingCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [framingType, setFramingType] = useState<'wall' | 'floor' | 'ceiling'>('wall');
  const [length, setLength] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [studSpacing, setStudSpacing] = useState<16 | 24>(16);
  const [plateCount, setPlateCount] = useState<2 | 3>(2);
  const [lumberSize, setLumberSize] = useState<'2x4' | '2x6'>('2x4');
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [includeBlocking, setIncludeBlocking] = useState(false);
  const [includeFireblocking, setIncludeFireblocking] = useState(false);
  const [includeTiedowns, setIncludeTiedowns] = useState(false);
  const [includeSheathing, setIncludeSheathing] = useState(true);
  const [sheathingType, setSheathingType] = useState<'osb' | 'plywood'>('osb');
  const [sheathingThickness, setSheathingThickness] = useState<'7/16' | '15/32' | '19/32'>('7/16');

  const addOpening = (type: 'door' | 'window') => {
    setOpenings([...openings, {
      width: type === 'door' ? 3 : 3,
      height: type === 'door' ? 7 : 4,
      type,
      roughOpening: true
    }]);
  };

  const updateOpening = (index: number, field: keyof Opening, value: any) => {
    const newOpenings = [...openings];
    newOpenings[index] = { ...newOpenings[index], [field]: value };
    setOpenings(newOpenings);
  };

  const removeOpening = (index: number) => {
    setOpenings(openings.filter((_, i) => i !== index));
  };

  const getLumberPrice = (size: '2x4' | '2x6') => {
    const prices = {
      '2x4': 3.98,
      '2x6': 5.98
    };
    return prices[size];
  };

  const getSheathingPrice = (type: 'osb' | 'plywood', thickness: '7/16' | '15/32' | '19/32') => {
    const prices = {
      'osb': {
        '7/16': 15.98,
        '15/32': 18.98,
        '19/32': 22.98
      },
      'plywood': {
        '7/16': 24.98,
        '15/32': 28.98,
        '19/32': 32.98
      }
    };
    return prices[type][thickness];
  };

  const getCurrentInputs = () => ({
    framingType,
    length,
    height,
    studSpacing,
    plateCount,
    lumberSize,
    openings,
    includeBlocking,
    includeFireblocking,
    includeTiedowns,
    includeSheathing,
    sheathingType,
    sheathingThickness
  });

  const handleLoadEstimate = (inputs: any) => {
    setFramingType(inputs.framingType || 'wall');
    setLength(inputs.length || '');
    setHeight(inputs.height || '');
    setStudSpacing(inputs.studSpacing || 16);
    setPlateCount(inputs.plateCount || 2);
    setLumberSize(inputs.lumberSize || '2x4');
    setOpenings(inputs.openings || []);
    setIncludeBlocking(inputs.includeBlocking || false);
    setIncludeFireblocking(inputs.includeFireblocking || false);
    setIncludeTiedowns(inputs.includeTiedowns || false);
    setIncludeSheathing(inputs.includeSheathing !== undefined ? inputs.includeSheathing : true);
    setSheathingType(inputs.sheathingType || 'osb');
    setSheathingThickness(inputs.sheathingThickness || '7/16');
  };

  const handleNewEstimate = () => {
    setFramingType('wall');
    setLength('');
    setHeight('');
    setStudSpacing(16);
    setPlateCount(2);
    setLumberSize('2x4');
    setOpenings([]);
    setIncludeBlocking(false);
    setIncludeFireblocking(false);
    setIncludeTiedowns(false);
    setIncludeSheathing(true);
    setSheathingType('osb');
    setSheathingThickness('7/16');
  };

  const handleCalculate = () => {
    if (typeof length === 'number' && (framingType === 'floor' || typeof height === 'number')) {
      // Calculate studs needed
      const studLength = framingType === 'wall' ? height : length;
      const spacing = studSpacing / 12; // Convert to feet
      const studCount = Math.ceil(length / spacing) + 1; // Add one for end stud

      // Add extra studs for openings
      const openingStuds = openings.reduce((sum, opening) => {
        // Each opening needs jack studs and king studs
        return sum + (opening.roughOpening ? 4 : 2);
      }, 0);

      const totalStuds = studCount + openingStuds;

      // Calculate plates
      const plateLength = length;
      const platesNeeded = plateCount; // 2 for standard, 3 for double top plate
      const platePieces = Math.ceil(plateLength / 16) * platesNeeded; // 16ft standard lumber length

      // Calculate headers
      const headerPieces = openings.reduce((sum, opening) => {
        const headerLength = opening.width + 1; // Add 1ft for overlap
        return sum + (Math.ceil(headerLength / 16) * 2); // Double headers
      }, 0);

      const lumberPrice = getLumberPrice(lumberSize);
      const studCost = totalStuds * lumberPrice;
      const plateCost = platePieces * lumberPrice;
      const headerCost = headerPieces * lumberPrice;

      const results: CalculationResult[] = [
        {
          label: t('calculators.framing.studs', { size: lumberSize, spacing: studSpacing }),
          value: totalStuds,
          unit: t('calculators.framing.pieces'),
          cost: studCost
        },
        {
          label: t('calculators.framing.plates', { size: lumberSize }),
          value: platePieces,
          unit: t('calculators.framing.pieces'),
          cost: plateCost
        }
      ];

      if (openings.length > 0) {
        results.push({
          label: t('calculators.framing.headers', { size: lumberSize }),
          value: headerPieces,
          unit: t('calculators.framing.pieces'),
          cost: headerCost
        });
      }

      if (includeBlocking) {
        const blockingPieces = Math.ceil(studCount / 2);
        const blockingCost = blockingPieces * lumberPrice;
        results.push({
          label: t('calculators.framing.blocking'),
          value: blockingPieces,
          unit: t('calculators.framing.pieces'),
          cost: blockingCost
        });
      }

      if (includeFireblocking && framingType === 'wall') {
        const fireblockingPieces = Math.ceil(studCount / 3);
        const fireblockingCost = fireblockingPieces * lumberPrice;
        results.push({
          label: t('calculators.framing.fireblocking'),
          value: fireblockingPieces,
          unit: t('calculators.framing.pieces'),
          cost: fireblockingCost
        });
      }

      if (includeTiedowns) {
        const tiedownCount = Math.ceil(length / 16) + 1;
        const tiedownCost = tiedownCount * 12.98;
        results.push({
          label: t('calculators.framing.tiedowns'),
          value: tiedownCount,
          unit: t('calculators.framing.pieces'),
          cost: tiedownCost
        });
      }

      if (includeSheathing) {
        const wallArea = length * (framingType === 'wall' ? height : 1);
        const sheetArea = 32; // 4x8 sheet
        const sheetsNeeded = Math.ceil(wallArea / sheetArea);
        const sheathingCost = sheetsNeeded * getSheathingPrice(sheathingType, sheathingThickness);

        results.push({
          label: t('calculators.framing.sheathing', { type: sheathingType.toUpperCase(), thickness: sheathingThickness }),
          value: sheetsNeeded,
          unit: t('calculators.framing.sheets'),
          cost: sheathingCost
        });
      }

      // Calculate hardware
      // Using 30-degree Passlode 3" hot-dipped nails
      const nailsPerConnection = 2; // Standard framing connection
      const nailsNeeded = Math.ceil((totalStuds + platePieces + headerPieces) * nailsPerConnection);
      const nailsPerStrip = 30; // Typical strip count for framing nailers
      const nailStripsNeeded = Math.ceil(nailsNeeded / nailsPerStrip);
      const nailsPerBox = 1000; // Standard box size for Passlode nails
      const nailBoxesNeeded = Math.ceil(nailStripsNeeded * nailsPerStrip / nailsPerBox);

      // Passlode 3" hot-dipped galvanized nails cost (updated price)
      const nailBoxPrice = 89.98; // Price per 1000-count box
      const nailCost = nailBoxesNeeded * nailBoxPrice;

      results.push({
        label: t('calculators.framing.nails'),
        value: nailBoxesNeeded,
        unit: t('calculators.framing.nailBoxes'),
        cost: nailCost
      });

      onCalculate(results);
    }
  };

  const isFormValid =
    typeof length === 'number' &&
    (framingType === 'floor' || typeof height === 'number');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Ruler className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.framing.title')}</h2>
      </div>

      <CalculatorEstimateHeader
        calculatorType="framing"
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
                framingType === 'wall'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300 rounded-l-lg`}
              onClick={() => setFramingType('wall')}
            >
              {t('calculators.framing.wall')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                framingType === 'floor'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border-t border-b border-slate-300`}
              onClick={() => setFramingType('floor')}
            >
              {t('calculators.framing.floor')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${
                framingType === 'ceiling'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300 rounded-r-lg`}
              onClick={() => setFramingType('ceiling')}
            >
              {t('calculators.framing.ceiling')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.framing.length')}
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('calculators.framing.lengthPlaceholder')}
            />
          </div>

          {framingType === 'wall' && (
            <div>
              <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.framing.height')}
              </label>
              <input
                type="number"
                id="height"
                min="0"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={t('calculators.framing.heightPlaceholder')}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="studSpacing" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.framing.studSpacing')}
            </label>
            <select
              id="studSpacing"
              value={studSpacing}
              onChange={(e) => setStudSpacing(Number(e.target.value) as 16 | 24)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value={16}>{t('calculators.framing.spacing16')}</option>
              <option value={24}>{t('calculators.framing.spacing24')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="lumberSize" className="block text-sm font-medium text-slate-700 mb-1">
              {t('calculators.framing.lumberSize')}
            </label>
            <select
              id="lumberSize"
              value={lumberSize}
              onChange={(e) => setLumberSize(e.target.value as '2x4' | '2x6')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="2x4">{t('calculators.framing.lumber2x4')}</option>
              <option value="2x6">{t('calculators.framing.lumber2x6')}</option>
            </select>
          </div>

          {framingType === 'wall' && (
            <div>
              <label htmlFor="plateCount" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.framing.plateConfiguration')}
              </label>
              <select
                id="plateCount"
                value={plateCount}
                onChange={(e) => setPlateCount(Number(e.target.value) as 2 | 3)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={2}>{t('calculators.framing.singleTopPlate')}</option>
                <option value={3}>{t('calculators.framing.doubleTopPlate')}</option>
              </select>
            </div>
          )}
        </div>

        {framingType === 'wall' && (
          <div className="border-t border-slate-200 pt-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-800">{t('calculators.framing.openings')}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => addOpening('door')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  {t('calculators.framing.addDoor')}
                </button>
                <button
                  onClick={() => addOpening('window')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  {t('calculators.framing.addWindow')}
                </button>
              </div>
            </div>

            {openings.map((opening, index) => (
              <div key={index} className="mb-4 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.framing.widthFeet')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={opening.width}
                      onChange={(e) => updateOpening(index, 'width', Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.framing.heightFeet')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={opening.height}
                      onChange={(e) => updateOpening(index, 'height', Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('calculators.framing.includeRoughOpening')}
                    </label>
                    <div className="flex items-center h-[42px]">
                      <input
                        type="checkbox"
                        checked={opening.roughOpening}
                        onChange={(e) => updateOpening(index, 'roughOpening', e.target.checked)}
                        className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                      />
                      <span className="ml-2 text-sm text-slate-600">{t('calculators.framing.add2Inches')}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeOpening(index)}
                  className="mt-2 text-red-500 hover:text-red-600"
                >
                  {t('calculators.framing.removeOpening')}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.framing.additionalOptions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeBlocking"
                checked={includeBlocking}
                onChange={(e) => setIncludeBlocking(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeBlocking" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.framing.includeBlocking')}
              </label>
            </div>

            {framingType === 'wall' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeFireblocking"
                  checked={includeFireblocking}
                  onChange={(e) => setIncludeFireblocking(e.target.checked)}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <label htmlFor="includeFireblocking" className="ml-2 block text-sm font-medium text-slate-700">
                  {t('calculators.framing.includeFireblocking')}
                </label>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeTiedowns"
                checked={includeTiedowns}
                onChange={(e) => setIncludeTiedowns(e.target.checked)}
                className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
              />
              <label htmlFor="includeTiedowns" className="ml-2 block text-sm font-medium text-slate-700">
                {t('calculators.framing.includeTiedowns')}
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="includeSheathing"
              checked={includeSheathing}
              onChange={(e) => setIncludeSheathing(e.target.checked)}
              className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
            />
            <label htmlFor="includeSheathing" className="ml-2 block text-sm font-medium text-slate-700">
              {t('calculators.framing.includeSheathing')}
            </label>
          </div>

          {includeSheathing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sheathingType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.framing.sheathingType')}
                </label>
                <select
                  id="sheathingType"
                  value={sheathingType}
                  onChange={(e) => setSheathingType(e.target.value as 'osb' | 'plywood')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="osb">{t('calculators.framing.osb')}</option>
                  <option value="plywood">{t('calculators.framing.plywood')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="sheathingThickness" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.framing.thickness')}
                </label>
                <select
                  id="sheathingThickness"
                  value={sheathingThickness}
                  onChange={(e) => setSheathingThickness(e.target.value as '7/16' | '15/32' | '19/32')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="7/16">7/16"</option>
                  <option value="15/32">15/32"</option>
                  <option value="19/32">19/32"</option>
                </select>
              </div>
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

export default FramingCalculator;
