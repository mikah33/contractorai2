import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ConcreteCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const { t } = useTranslation();
  const [concreteType, setConcreteType] = useState<'wall' | 'flatwork'>('flatwork');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial');
  const [reinforcement, setReinforcement] = useState<'none' | 'rebar' | 'mesh'>('none');
  const [rebarSpacing, setRebarSpacing] = useState<number>(12); // inches or 30cm
  const [meshType, setMeshType] = useState<'6x6' | '4x4'>('6x6');
  const [deliveryMethod, setDeliveryMethod] = useState<'bags' | 'truck'>('bags');

  const handleCalculate = () => {
    if (typeof length === 'number' && typeof width === 'number' && 
        (concreteType === 'flatwork' || (concreteType === 'wall' && typeof height === 'number'))) {
      let volume: number;
      let volumeUnit: string;
      let bagsNeeded: number;
      let bagsUnit: string;
      
      if (unit === 'imperial') {
        // For walls: length and width in feet, height in feet
        // For flatwork: length and width in feet, depth in inches
        volume = concreteType === 'wall' 
          ? (length * width * height) / 27 // Convert cubic feet to cubic yards
          : (length * width * (height / 12)) / 27; // Convert depth from inches to feet, then to cubic yards
        volumeUnit = 'cubic yards';
        bagsNeeded = Math.ceil(volume * 40); // Approx 40 bags per cubic yard
        bagsUnit = '60lb bags';
      } else {
        volume = concreteType === 'wall'
          ? length * width * height // Already in cubic meters
          : length * width * (height / 100); // Convert depth from cm to meters
        volumeUnit = 'cubic meters';
        bagsNeeded = Math.ceil(volume * 90);
        bagsUnit = '25kg bags';
      }

      const results: CalculationResult[] = [
        {
          label: 'Concrete Volume',
          value: Number(volume.toFixed(2)),
          unit: volumeUnit
        }
      ];

      if (deliveryMethod === 'bags') {
        const bagPrice = unit === 'imperial' ? 6.98 : 7.50; // Price per bag
        const bagCost = bagsNeeded * bagPrice;

        results.push(
          {
            label: 'Bags of Concrete',
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
        const truckCost = (Math.max(volume, minLoad) * truckPrice) + deliveryFee;

        results.push({
          label: 'Ready-Mix Truck',
          value: Math.max(volume, minLoad),
          unit: volumeUnit,
          cost: truckCost
        });

        if (volume < minLoad) {
          results.push({
            label: 'Note',
            value: minLoad,
            unit: 'yard minimum load required'
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
          label: 'Rebar Length Needed',
          value: Number(totalLength.toFixed(2)),
          unit: unit === 'imperial' ? 'feet' : 'meters',
          cost: rebarCost
        });
      } else if (reinforcement === 'mesh') {
        const area = length * width;
        const sheetSize = unit === 'imperial' ? 100 : 9.29; // 100 sqft or 9.29 sqm per sheet
        const sheetsNeeded = Math.ceil(area / sheetSize);
        const meshPrice = meshType === '6x6' ? 12.98 : 16.98; // Price per sheet
        const meshCost = sheetsNeeded * meshPrice;
        
        results.push({
          label: `${meshType} Mesh Sheets Needed`,
          value: sheetsNeeded,
          unit: 'sheets',
          cost: meshCost
        });
      }
      
      onCalculate(results);
    }
  };

  const isFormValid = 
    typeof length === 'number' && 
    typeof width === 'number' &&
    (concreteType === 'flatwork' || (concreteType === 'wall' && typeof height === 'number'));

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
              Flatwork
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
              Wall
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
              Imperial
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
              Metric
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
              Bags
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
              <span className="hidden sm:inline">Ready-Mix Truck</span>
              <span className="sm:hidden">Truck</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-700 mb-1">
              Length ({unit === 'imperial' ? 'feet' : 'meters'})
            </label>
            <input
              type="number"
              id="length"
              min="0"
              step="0.01"
              value={length}
              onChange={(e) => setLength(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={`Enter length in ${unit === 'imperial' ? 'feet' : 'meters'}`}
            />
          </div>
          
          <div>
            <label htmlFor="width" className="block text-sm font-medium text-slate-700 mb-1">
              Width ({unit === 'imperial' ? 'feet' : 'meters'})
            </label>
            <input
              type="number"
              id="width"
              min="0"
              step="0.01"
              value={width}
              onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={`Enter width in ${unit === 'imperial' ? 'feet' : 'meters'}`}
            />
          </div>
          
          <div>
            <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
              {concreteType === 'wall' ? 'Height' : 'Thickness'} ({unit === 'imperial' ? (concreteType === 'wall' ? 'feet' : 'inches') : (concreteType === 'wall' ? 'meters' : 'centimeters')})
            </label>
            <input
              type="number"
              id="height"
              min="0"
              step={concreteType === 'wall' ? '0.01' : '0.5'}
              value={height}
              onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={`Enter ${concreteType === 'wall' ? 'height' : 'thickness'} in ${unit === 'imperial' ? (concreteType === 'wall' ? 'feet' : 'inches') : (concreteType === 'wall' ? 'meters' : 'centimeters')}`}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Reinforcement Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reinforcement" className="block text-sm font-medium text-slate-700 mb-1">
                Reinforcement Type
              </label>
              <select
                id="reinforcement"
                value={reinforcement}
                onChange={(e) => setReinforcement(e.target.value as 'none' | 'rebar' | 'mesh')}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="none">No Reinforcement</option>
                <option value="rebar">Rebar Grid</option>
                <option value="mesh">Wire Mesh</option>
              </select>
            </div>

            {reinforcement === 'rebar' && (
              <div>
                <label htmlFor="rebarSpacing" className="block text-sm font-medium text-slate-700 mb-1">
                  Rebar Spacing ({unit === 'imperial' ? 'inches' : 'cm'})
                </label>
                <select
                  id="rebarSpacing"
                  value={rebarSpacing}
                  onChange={(e) => setRebarSpacing(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {unit === 'imperial' ? (
                    <>
                      <option value="12">12 inches</option>
                      <option value="16">16 inches</option>
                      <option value="18">18 inches</option>
                      <option value="24">24 inches</option>
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
                  Mesh Type
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

export default ConcreteCalculator;