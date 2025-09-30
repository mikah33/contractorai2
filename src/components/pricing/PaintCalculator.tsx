import React, { useState } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Paintbrush } from 'lucide-react';

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
        label: 'Total Wall Area',
        value: Number(totalArea.toFixed(2)),
        unit: 'square feet'
      },
      {
        label: `Paint Needed (${paintType}, ${paintFinish})`,
        value: gallonsNeeded,
        unit: 'gallons',
        cost: paintCost
      }
    ];

    if (includePrimer) {
      const primerGallons = Math.ceil(areaWithWaste / 400); // Primer typically covers 400 sq ft
      const primerCost = primerGallons * getPrimerPrice();
      
      results.push({
        label: 'Primer Needed',
        value: primerGallons,
        unit: 'gallons',
        cost: primerCost
      });
    }

    // Add supplies
    const suppliesCost = Math.ceil(totalArea / 400) * 25; // Basic supplies per 400 sq ft
    results.push({
      label: 'Painting Supplies',
      value: 1,
      unit: 'set',
      cost: suppliesCost
    });

    // Calculate total cost
    const totalCost = results.reduce((sum, item) => sum + (item.cost || 0), 0);
    results.push({
      label: 'Total Cost',
      value: Number(totalCost.toFixed(2)),
      unit: 'USD',
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
        <h2 className="text-xl font-bold text-slate-800">Paint Calculator</h2>
      </div>
      
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
              Interior
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
              Exterior
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
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800">Surfaces to Paint</h3>
            <button
              onClick={addSurface}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Add Surface
            </button>
          </div>

          {surfaces.map((surface, index) => (
            <div key={index} className="mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Length ({unit === 'imperial' ? 'feet' : 'meters'})
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
                    Height ({unit === 'imperial' ? 'feet' : 'meters'})
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
                    Surface Condition
                  </label>
                  <select
                    value={surface.condition}
                    onChange={(e) => updateSurface(index, 'condition', e.target.value as 'good' | 'fair' | 'poor')}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="good">Good - Smooth, clean surface</option>
                    <option value="fair">Fair - Minor repairs needed</option>
                    <option value="poor">Poor - Significant prep required</option>
                  </select>
                </div>
              </div>
              {surfaces.length > 1 && (
                <button
                  onClick={() => removeSurface(index)}
                  className="mt-2 text-red-500 hover:text-red-600"
                >
                  Remove Surface
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Paint Type
              </label>
              <select
                value={paintType}
                onChange={(e) => setPaintType(e.target.value as typeof paintType)}
                className="w-full p-2 border border-slate-300 rounded-md"
              >
                <option value="economy">Economy Grade</option>
                <option value="standard">Standard Grade</option>
                <option value="premium">Premium Grade</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Paint Finish
              </label>
              <select
                value={paintFinish}
                onChange={(e) => setPaintFinish(e.target.value as typeof paintFinish)}
                className="w-full p-2 border border-slate-300 rounded-md"
              >
                <option value="flat">Flat</option>
                <option value="eggshell">Eggshell</option>
                <option value="satin">Satin</option>
                <option value="semi-gloss">Semi-Gloss</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Number of Coats
              </label>
              <select
                value={coats}
                onChange={(e) => setCoats(Number(e.target.value) as 1 | 2)}
                className="w-full p-2 border border-slate-300 rounded-md"
              >
                <option value={1}>Single Coat</option>
                <option value={2}>Two Coats</option>
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
                Include Primer
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
              Include Waste Factor
            </label>
          </div>

          {includeWaste && (
            <div>
              <label htmlFor="wasteFactor" className="block text-sm font-medium text-slate-700 mb-1">
                Waste Factor Percentage
              </label>
              <select
                id="wasteFactor"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(Number(e.target.value) as 5 | 10 | 15)}
                className="w-full p-2 border border-slate-300 rounded-md"
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

export default PaintCalculator;