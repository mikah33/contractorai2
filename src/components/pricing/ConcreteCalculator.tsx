import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Calculator, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SaveCalculationModal from './SaveCalculationModal';

const ConcreteCalculator: React.FC<CalculatorProps> = ({ onCalculate, onSaveSuccess }) => {
  const { t } = useTranslation();
  const [concreteType, setConcreteType] = useState<'wall' | 'flatwork'>('flatwork');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [thickness, setThickness] = useState<number | ''>(''); // For wall thickness in inches
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial');
  const [reinforcement, setReinforcement] = useState<'none' | 'rebar' | 'mesh'>('none');
  const [rebarSpacing, setRebarSpacing] = useState<number>(12); // inches or 30cm
  const [meshType, setMeshType] = useState<'6x6' | '4x4'>('6x6');
  const [deliveryMethod, setDeliveryMethod] = useState<'bags' | 'truck'>('truck'); // Default to ready-mix truck
  const [addColor, setAddColor] = useState<boolean>(false);
  const [colorPricePerYard, setColorPricePerYard] = useState<number | ''>('');
  const [addFiber, setAddFiber] = useState<boolean>(false);
  const [fiberPricePerYard, setFiberPricePerYard] = useState<number | ''>('');
  const [lastCalculation, setLastCalculation] = useState<CalculationResult[] | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleCalculate = () => {
    if (typeof length === 'number' &&
        (concreteType === 'flatwork' ? (typeof width === 'number' && typeof height === 'number') :
         (typeof height === 'number' && typeof thickness === 'number'))) {
      let volume: number;
      let volumeUnit: string;
      let bagsNeeded: number;
      let bagsUnit: string;

      if (unit === 'imperial') {
        // For walls: length in feet, height in feet, thickness in inches
        // For flatwork: length and width in feet, depth in inches
        volume = concreteType === 'wall'
          ? (length * height * (thickness / 12)) / 27 // Linear feet × height × (thickness in feet) / 27
          : (length * width * (height / 12)) / 27; // Convert depth from inches to feet, then to cubic yards
        volumeUnit = t('calculators.concrete.cubicYards');
        bagsNeeded = Math.ceil(volume * 40); // Approx 40 bags per cubic yard
        bagsUnit = t('calculators.concrete.lbBags');
      } else {
        volume = concreteType === 'wall'
          ? (length * height * (thickness / 100)) // Linear meters × height × (thickness in meters)
          : length * width * (height / 100); // Convert depth from cm to meters
        volumeUnit = t('calculators.concrete.cubicMeters');
        bagsNeeded = Math.ceil(volume * 90);
        bagsUnit = t('calculators.concrete.kgBags');
      }

      const results: CalculationResult[] = [
        {
          label: t('calculators.concrete.concreteVolume'),
          value: Number(volume.toFixed(2)),
          unit: volumeUnit
        }
      ];

      if (deliveryMethod === 'bags') {
        const bagPrice = unit === 'imperial' ? 6.98 : 7.50; // Price per bag
        const bagCost = bagsNeeded * bagPrice;

        results.push(
          {
            label: t('calculators.concrete.bagsOfConcrete'),
            value: bagsNeeded,
            unit: bagsUnit,
            cost: bagCost
          }
        );
      } else {
        // Truck delivery
        const minLoad = 1; // Minimum load in cubic yards
        const truckPrice = 185; // Price per cubic yard
        const deliveryFee = volume < minLoad ? 150 : 0; // Additional fee for small loads
        let truckCost = (Math.max(volume, minLoad) * truckPrice) + deliveryFee;

        // Add color cost if selected
        if (addColor && typeof colorPricePerYard === 'number') {
          const colorCost = Math.max(volume, minLoad) * colorPricePerYard;
          truckCost += colorCost;

          results.push({
            label: 'Concrete Color Additive',
            value: Math.max(volume, minLoad),
            unit: volumeUnit,
            cost: colorCost
          });
        }

        // Add fiber cost if selected
        if (addFiber && typeof fiberPricePerYard === 'number') {
          const fiberCost = Math.max(volume, minLoad) * fiberPricePerYard;
          truckCost += fiberCost;

          results.push({
            label: 'Fiber Reinforcement Additive',
            value: Math.max(volume, minLoad),
            unit: volumeUnit,
            cost: fiberCost
          });
        }

        results.push({
          label: t('calculators.concrete.readyMix'),
          value: Math.max(volume, minLoad),
          unit: volumeUnit,
          cost: truckCost
        });

        if (volume < minLoad) {
          results.push({
            label: t('calculators.concrete.note'),
            value: minLoad,
            unit: t('calculators.concrete.minimumLoad')
          });
        }

        // Add small load fee warning for volumes under 3 cubic yards
        if (volume < 3) {
          results.push({
            label: '⚠️ Small Load Fee Notice',
            value: 0,
            unit: 'Orders under 3 cubic yards typically incur a $150-$300 small load fee. Please add this to your estimate.',
            isWarning: true
          });
        }
      }

      // Add reinforcement calculations
      if (reinforcement === 'rebar') {
        const area = length * width;
        const spacing = unit === 'imperial' ? rebarSpacing / 12 : rebarSpacing / 100;
        const lengthBars = Math.ceil(width / spacing) + 1;
        const widthBars = Math.ceil(length / spacing) + 1;
        const totalLength = (length * lengthBars) + (width * widthBars);
        const rebarPrice = unit === 'imperial' ? 8.98 : 9.50; // Price per bar
        const rebarCost = Math.ceil(totalLength / 20) * rebarPrice; // 20ft rebar lengths

        results.push({
          label: t('calculators.concrete.rebarLengthNeeded'),
          value: Number(totalLength.toFixed(2)),
          unit: unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters'),
          cost: rebarCost
        });
      } else if (reinforcement === 'mesh') {
        const area = length * width;
        const sheetSize = unit === 'imperial' ? 100 : 9.29; // 100 sqft or 9.29 sqm per sheet
        const sheetsNeeded = Math.ceil(area / sheetSize);
        const meshPrice = meshType === '6x6' ? 12.98 : 16.98; // Price per sheet
        const meshCost = sheetsNeeded * meshPrice;

        results.push({
          label: `${meshType} ${t('calculators.concrete.meshSheetsNeeded')}`,
          value: sheetsNeeded,
          unit: t('calculators.concrete.sheets'),
          cost: meshCost
        });
      }

      setLastCalculation(results);
      onCalculate(results);
    }
  };

  const isFormValid =
    typeof length === 'number' &&
    (concreteType === 'flatwork'
      ? (typeof width === 'number' && typeof height === 'number')
      : (typeof height === 'number' && typeof thickness === 'number'));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Calculator className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">{t('calculators.concrete.title')}</h2>
      </div>

      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                concreteType === 'flatwork'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setConcreteType('flatwork')}
            >
              {t('calculators.concrete.flatwork')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                concreteType === 'wall'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setConcreteType('wall')}
            >
              {t('calculators.concrete.wall')}
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
              {t('calculators.concrete.imperial')}
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
              {t('calculators.concrete.metric')}
            </button>
          </div>

          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-l-lg ${
                deliveryMethod === 'bags'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setDeliveryMethod('bags')}
            >
              {t('calculators.concrete.bags')}
            </button>
            <button
              type="button"
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-r-lg ${
                deliveryMethod === 'truck'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              } border border-slate-300`}
              onClick={() => setDeliveryMethod('truck')}
            >
              <span className="hidden sm:inline">{t('calculators.concrete.readyMixTruck')}</span>
              <span className="sm:hidden">{t('calculators.concrete.truck')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              {concreteType === 'wall' ? 'Total Linear Feet' : t('calculators.concrete.length')} ({unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters')})
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.01"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={concreteType === 'wall' ? 'Total wall length' : `${t('calculators.concrete.enterLength')} ${unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters')}`}
            />
          </div>

          {concreteType === 'flatwork' && (
            <div>
              <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.concrete.width')} ({unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters')})
              </label>
              <input
                type="number"
                id="width"
                min="0"
                step="0.01"
                value={width}
                onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={`${t('calculators.concrete.enterWidth')} ${unit === 'imperial' ? t('calculators.concrete.feet') : t('calculators.concrete.meters')}`}
              />
            </div>
          )}

          <div>
            <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
              {concreteType === 'wall' ? 'Height of Wall' : t('calculators.concrete.thickness')} ({unit === 'imperial' ? t('calculators.concrete.feet') : (concreteType === 'wall' ? t('calculators.concrete.meters') : t('calculators.concrete.centimeters'))})
            </label>
            <input
              type="number"
              id="height"
              min="0"
              step="0.01"
              value={height}
              onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={concreteType === 'wall' ? 'e.g., 8' : `${t('calculators.concrete.enterThickness')} ${unit === 'imperial' ? t('calculators.concrete.inches') : t('calculators.concrete.centimeters')}`}
            />
          </div>

          {concreteType === 'wall' && (
            <div>
              <label htmlFor="thickness" className="block text-sm font-medium text-slate-700 mb-1">
                Thickness ({unit === 'imperial' ? t('calculators.concrete.inches') : 'cm'})
              </label>
              <input
                type="number"
                id="thickness"
                min="0"
                step="0.5"
                value={thickness}
                onChange={(e) => setThickness(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., 8"
              />
            </div>
          )}

          {concreteType === 'flatwork' && (
            <div>
              <label htmlFor="flatworkThickness" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.concrete.thickness')} ({unit === 'imperial' ? t('calculators.concrete.inches') : t('calculators.concrete.centimeters')})
              </label>
              <input
                type="number"
                id="flatworkThickness"
                min="0"
                step="0.5"
                value={height}
                onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={`${t('calculators.concrete.enterThickness')} ${unit === 'imperial' ? t('calculators.concrete.inches') : t('calculators.concrete.centimeters')}`}
              />
            </div>
          )}
        </div>

        {/* Color and Fiber Add-ons - Only show for Ready-Mix Truck */}
        {deliveryMethod === 'truck' && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Concrete Add-ons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="addColor"
                  checked={addColor}
                  onChange={(e) => setAddColor(e.target.checked)}
                  className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor="addColor" className="block text-sm font-medium text-slate-700 mb-1">
                    Add Color to Concrete
                  </label>
                  {addColor && (
                    <div className="mt-2">
                      <label htmlFor="colorPrice" className="block text-xs text-slate-600 mb-1">
                        Price per Cubic Yard ($)
                      </label>
                      <input
                        type="number"
                        id="colorPrice"
                        min="0"
                        step="0.01"
                        value={colorPricePerYard}
                        onChange={(e) => setColorPricePerYard(e.target.value ? Number(e.target.value) : '')}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., 15.00"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="addFiber"
                  checked={addFiber}
                  onChange={(e) => setAddFiber(e.target.checked)}
                  className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor="addFiber" className="block text-sm font-medium text-slate-700 mb-1">
                    Add Fiber Reinforcement
                  </label>
                  {addFiber && (
                    <div className="mt-2">
                      <label htmlFor="fiberPrice" className="block text-xs text-slate-600 mb-1">
                        Price per Cubic Yard ($)
                      </label>
                      <input
                        type="number"
                        id="fiberPrice"
                        min="0"
                        step="0.01"
                        value={fiberPricePerYard}
                        onChange={(e) => setFiberPricePerYard(e.target.value ? Number(e.target.value) : '')}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., 8.00"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">{t('calculators.concrete.reinforcementOptions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reinforcement" className="block text-sm font-medium text-slate-700 mb-1">
                {t('calculators.concrete.reinforcementType')}
              </label>
              <select
                id="reinforcement"
                value={reinforcement}
                onChange={(e) => setReinforcement(e.target.value as 'none' | 'rebar' | 'mesh')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="none">{t('calculators.concrete.noReinforcement')}</option>
                <option value="rebar">{t('calculators.concrete.rebarGrid')}</option>
                <option value="mesh">{t('calculators.concrete.wireMesh')}</option>
              </select>
            </div>

            {reinforcement === 'rebar' && (
              <div>
                <label htmlFor="rebarSpacing" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.concrete.rebarSpacing')} ({unit === 'imperial' ? t('calculators.concrete.inches') : 'cm'})
                </label>
                <select
                  id="rebarSpacing"
                  value={rebarSpacing}
                  onChange={(e) => setRebarSpacing(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {unit === 'imperial' ? (
                    <>
                      <option value="12">12 {t('calculators.concrete.inches')}</option>
                      <option value="16">16 {t('calculators.concrete.inches')}</option>
                      <option value="18">18 {t('calculators.concrete.inches')}</option>
                      <option value="24">24 {t('calculators.concrete.inches')}</option>
                    </>
                  ) : (
                    <>
                      <option value="30">30 cm</option>
                      <option value="40">40 cm</option>
                      <option value="45">45 cm</option>
                      <option value="60">60 cm</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {reinforcement === 'mesh' && (
              <div>
                <label htmlFor="meshType" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('calculators.concrete.meshType')}
                </label>
                <select
                  id="meshType"
                  value={meshType}
                  onChange={(e) => setMeshType(e.target.value as '6x6' | '4x4')}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="6x6">6x6 - W2.9 x W2.9</option>
                  <option value="4x4">4x4 - W4.0 x W4.0</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCalculate}
          disabled={!isFormValid}
          className={`flex-1 py-3 px-4 rounded-md font-medium text-white ${
            isFormValid
              ? 'bg-orange-500 hover:bg-orange-600 transition-colors'
              : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          {t('calculators.calculateMaterials')}
        </button>

        {lastCalculation && lastCalculation.length > 0 && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-6 py-3 border-2 border-green-600 text-base font-medium rounded-md text-green-600 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save
          </button>
        )}
      </div>

      <SaveCalculationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        calculatorType="concrete"
        calculatorName="Concrete"
        results={lastCalculation || []}
        calculatorData={{
          concreteType,
          length,
          width,
          height,
          thickness,
          unit,
          reinforcement,
          rebarSpacing,
          meshType,
          deliveryMethod,
          addColor,
          colorPricePerYard,
          addFiber,
          fiberPricePerYard
        }}
        onSaveSuccess={onSaveSuccess}
      />
    </div>
  );
};

export default ConcreteCalculator;
