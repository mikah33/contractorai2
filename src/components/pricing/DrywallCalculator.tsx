import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Square, DoorClosed, AppWindow as Window } from 'lucide-react';

interface Opening {
  width: number;
  height: number;
}

const DrywallCalculator: React.FC<CalculatorProps> = ({ onCalculate }) => {
  const [surfaceType, setSurfaceType] = useState<'wall' | 'ceiling'>('wall');
  const [length, setLength] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial');
  const [sheetSize, setSheetSize] = useState<'4x8' | '4x12'>('4x8');
  const [sheetThickness, setSheetThickness] = useState<'1/2' | '5/8'>('1/2');
  const [doors, setDoors] = useState<Opening[]>([]);
  const [windows, setWindows] = useState<Opening[]>([]);
  const [layers, setLayers] = useState<1 | 2>(1);
  const [includeWaste, setIncludeWaste] = useState(true);
  const [wasteFactor, setWasteFactor] = useState<5 | 10 | 15>(10);

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

  const handleCalculate = () => {
    if (typeof length === 'number' && typeof height === 'number') {
      // Calculate total surface area
      let totalArea = length * height;

      // Subtract openings
      const doorArea = doors.reduce((sum, door) => sum + (door.width * door.height), 0);
      const windowArea = windows.reduce((sum, window) => sum + (window.width * window.height), 0);
      totalArea -= (doorArea + windowArea);

      // Add waste factor
      const areaWithWaste = includeWaste ? totalArea * (1 + wasteFactor / 100) : totalArea;
      
      // Calculate sheets needed
      const sheetArea = sheetSize === '4x8' ? 32 : 48; // 4x8=32sqft, 4x12=48sqft
      const sheetsNeeded = Math.ceil(areaWithWaste / sheetArea) * layers;
      
      // Calculate materials
      const screwsPerSheet = 30;
      const screwsNeeded = sheetsNeeded * screwsPerSheet;
      const mudCoverage = 100; // square feet per gallon of joint compound
      const mudNeeded = Math.ceil(totalArea / mudCoverage);
      const tapeNeeded = Math.ceil(totalArea / 25); // 25 sq ft per roll of tape approximately
      
      // Calculate costs
      const sheetPrice = sheetThickness === '1/2' ? 15.98 : 17.98;
      const sheetCost = sheetsNeeded * sheetPrice;
      const screwCost = Math.ceil(screwsNeeded / 100) * 8.98; // Box of 100 screws
      const mudCost = mudNeeded * 19.98; // Cost per 5-gallon bucket
      const tapeCost = tapeNeeded * 4.98; // Cost per roll
      
      const results: CalculationResult[] = [
        {
          label: 'Total Wall Area',
          value: Number(totalArea.toFixed(2)),
          unit: 'square feet'
        },
        {
          label: `${sheetSize} Drywall Sheets (${sheetThickness}")`,
          value: sheetsNeeded,
          unit: 'sheets',
          cost: sheetCost
        },
        {
          label: 'Drywall Screws',
          value: screwsNeeded,
          unit: 'screws',
          cost: screwCost
        },
        {
          label: 'Joint Compound',
          value: mudNeeded,
          unit: '5-gallon buckets',
          cost: mudCost
        },
        {
          label: 'Joint Tape',
          value: tapeNeeded,
          unit: 'rolls',
          cost: tapeCost
        }
      ];
      
      onCalculate(results);
    }
  };

  const isFormValid = typeof length === 'number' && typeof height === 'number';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center mb-6">
        <Square className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-bold text-slate-800">Drywall Calculator</h2>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-end mb-4">
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
            <label htmlFor="height" className="block text-sm font-medium text-slate-700 mb-1">
              Height ({unit === 'imperial' ? 'feet' : 'meters'})
            </label>
            <input
              type="number"
              id="height"
              min="0"
              step="0.01"
              value={height}
              onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={`Enter height in ${unit === 'imperial' ? 'feet' : 'meters'}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="sheetSize" className="block text-sm font-medium text-slate-700 mb-1">
              Sheet Size
            </label>
            <select
              id="sheetSize"
              value={sheetSize}
              onChange={(e) => setSheetSize(e.target.value as '4x8' | '4x12')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="4x8">4' x 8' Sheets</option>
              <option value="4x12">4' x 12' Sheets</option>
            </select>
          </div>

          <div>
            <label htmlFor="sheetThickness" className="block text-sm font-medium text-slate-700 mb-1">
              Sheet Thickness
            </label>
            <select
              id="sheetThickness"
              value={sheetThickness}
              onChange={(e) => setSheetThickness(e.target.value as '1/2' | '5/8')}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="1/2">1/2 inch</option>
              <option value="5/8">5/8 inch</option>
            </select>
          </div>

          <div>
            <label htmlFor="layers" className="block text-sm font-medium text-slate-700 mb-1">
              Number of Layers
            </label>
            <select
              id="layers"
              value={layers}
              onChange={(e) => setLayers(Number(e.target.value) as 1 | 2)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value={1}>Single Layer</option>
              <option value={2}>Double Layer</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Openings</h3>
            <div className="flex space-x-2">
              <button
                onClick={addDoor}
                className="flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                <DoorClosed className="h-4 w-4 mr-2" />
                Add Door
              </button>
              <button
                onClick={addWindow}
                className="flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                <Window className="h-4 w-4 mr-2" />
                Add Window
              </button>
            </div>
          </div>

          {doors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-slate-700 mb-2">Doors</h4>
              {doors.map((door, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="number"
                    value={door.width}
                    onChange={(e) => updateDoor(index, 'width', Number(e.target.value))}
                    className="w-24 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Width"
                  />
                  <span>x</span>
                  <input
                    type="number"
                    value={door.height}
                    onChange={(e) => updateDoor(index, 'height', Number(e.target.value))}
                    className="w-24 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Height"
                  />
                  <button
                    onClick={() => removeDoor(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {windows.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-medium text-slate-700 mb-2">Windows</h4>
              {windows.map((window, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="number"
                    value={window.width}
                    onChange={(e) => updateWindow(index, 'width', Number(e.target.value))}
                    className="w-24 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Width"
                  />
                  <span>x</span>
                  <input
                    type="number"
                    value={window.height}
                    onChange={(e) => updateWindow(index, 'height', Number(e.target.value))}
                    className="w-24 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Height"
                  />
                  <button
                    onClick={() => removeWindow(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
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
              Include Waste Factor
            </label>
          </div>

          {includeWaste && (
            <div className="mb-4">
              <label htmlFor="wasteFactor" className="block text-sm font-medium text-slate-700 mb-1">
                Waste Factor Percentage
              </label>
              <select
                id="wasteFactor"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(Number(e.target.value) as 5 | 10 | 15)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={5}>5% - Simple room, few cuts</option>
                <option value={10}>10% - Average complexity</option>
                <option value={15}>15% - Complex layout, many cuts</option>
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
        Calculate Materials
      </button>
    </div>
  );
};

export default DrywallCalculator;