import React, { useState, useEffect } from 'react';
import { CalculatorProps, CalculationResult } from '../../types';
import { Warehouse, Search, Loader2, CheckCircle2, AlertCircle, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { estimateService } from '../../services/estimateService';
import { useClientsStore } from '../../stores/clientsStore';
import { customCalculatorService } from '../../services/customCalculatorService';
import { CustomMaterial } from '../../types/custom-calculator';

type RoofMaterial = 'asphalt' | 'architectural' | 'metal' | 'tile' | 'composite' | 'atlas-storm' | 'sbs-malarkey' | 'brava-synthetic';
type RoofPitch = 'low' | 'medium' | 'high' | 'steep';

const RoofingCalculator: React.FC<CalculatorProps> = ({ onCalculate, onSaveSuccess }) => {
  const { t } = useTranslation();
  const { clients, fetchClients, isLoading: clientsLoading } = useClientsStore();

  // State management
  const [address, setAddress] = useState('');
  const [searching, setSearching] = useState(false);
  const [addressStatus, setAddressStatus] = useState<{ type: 'success' | 'error' | 'info' | null, message: string }>({ type: null, message: '' });
  const [roofArea, setRoofArea] = useState<number | ''>('');
  const [material, setMaterial] = useState<RoofMaterial>('asphalt');
  const [pitch, setPitch] = useState<RoofPitch>('medium');
  const [stories, setStories] = useState('1');
  const [layers, setLayers] = useState<number | ''>('');
  const [skylights, setSkylights] = useState<number | ''>('');
  const [wasteFactor, setWasteFactor] = useState<number>(10);
  const [includeVentilation, setIncludeVentilation] = useState(false);
  const [includeIceShield, setIncludeIceShield] = useState(true);
  const [includeWarranty, setIncludeWarranty] = useState(false);

  // Custom pricing state
  const [useCustomPricing, setUseCustomPricing] = useState(false);
  const [customMaterialName, setCustomMaterialName] = useState('');
  const [customPricePerSquare, setCustomPricePerSquare] = useState<number | ''>('');

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastCalculation, setLastCalculation] = useState<CalculationResult[] | null>(null);

  // Custom materials from database
  const [customMaterials, setCustomMaterials] = useState<CustomMaterial[]>([]);
  const [configId, setConfigId] = useState<string | null>(null);

  // Fetch clients when modal opens
  useEffect(() => {
    if (showSaveModal) {
      fetchClients();
    }
  }, [showSaveModal, fetchClients]);

  // Load custom materials from database
  useEffect(() => {
    const loadCustomMaterials = async () => {
      const configResult = await customCalculatorService.getOrCreateConfig('roofing');
      if (configResult.success && configResult.data) {
        setConfigId(configResult.data.id);
        const materialsResult = await customCalculatorService.getMaterials(configResult.data.id);
        if (materialsResult.success && materialsResult.data) {
          setCustomMaterials(materialsResult.data);
        }
      }
    };
    loadCustomMaterials();
  }, []);

  // Material pricing (price per square - 100 sq ft) - MATCHES WIDGET
  const materialPrices: Record<RoofMaterial, number> = {
    asphalt: 350,           // Asphalt Shingles
    architectural: 475,     // Architectural Shingles
    metal: 850,            // Metal Roofing
    tile: 625,             // Tile Roofing
    composite: 425,        // Composite Shingles
    'atlas-storm': 550,    // Atlas Storm Master Shingles
    'sbs-malarkey': 500,   // SBS Malarkey Shingles
    'brava-synthetic': 950 // Brava Synthetic Tiles
  };

  // Pitch multipliers - MATCHES WIDGET
  const pitchMultipliers: Record<RoofPitch, number> = {
    low: 1.0,      // 0-4/12
    medium: 1.15,  // 5-8/12
    high: 1.35,    // 9-12/12
    steep: 1.6     // 12+/12
  };

  // Story height multipliers - MATCHES WIDGET
  const storyMultipliers: Record<string, number> = {
    '1': 1.0,
    '2': 1.15,
    '3': 1.3
  };

  // Address search using Google Solar API (matches widget)
  const handleAddressSearch = async () => {
    if (!address.trim()) {
      setAddressStatus({ type: 'error', message: '⚠️ Please enter an address' });
      return;
    }

    setSearching(true);
    setAddressStatus({ type: 'info', message: '🔍 Analyzing roof from satellite imagery...' });

    try {
      const response = await fetch('https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/get-roof-area', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: address.trim() })
      });

      const data = await response.json();

      if (data.success && data.roofAreaSqFeet) {
        setRoofArea(data.roofAreaSqFeet);
        setAddressStatus({
          type: 'success',
          message: `✅ Found ${data.roofAreaSqFeet.toLocaleString()} sq ft roof at ${data.address}${data.imageryDate ? `\nImagery from: ${data.imageryDate}` : ''}`
        });

        // Auto-calculate after successful address search
        setTimeout(() => {
          if (data.roofAreaSqFeet > 0) {
            handleCalculateWithArea(data.roofAreaSqFeet);
          }
        }, 500);
      } else {
        setAddressStatus({
          type: 'error',
          message: `⚠️ ${data.error || 'Unable to detect roof area'}`
        });
      }
    } catch (error) {
      console.error('Address search error:', error);
      setAddressStatus({
        type: 'error',
        message: '⚠️ Error searching address. Please try again.'
      });
    } finally {
      setSearching(false);
    }
  };

  // Helper functions to get custom material prices and unit specs
  const getCustomPrice = (materialName: string, defaultPrice: number, category?: string): number => {
    const custom = customMaterials.find(m =>
      m.name.toLowerCase() === materialName.toLowerCase() &&
      (!category || m.category === category) &&
      !m.is_archived
    );
    return custom ? custom.price : defaultPrice;
  };

  const getCustomUnitValue = (materialName: string, defaultValue: number, category?: string): number => {
    const custom = customMaterials.find(m =>
      m.name.toLowerCase() === materialName.toLowerCase() &&
      (!category || m.category === category) &&
      !m.is_archived
    );
    if (custom?.metadata?.unitSpec) {
      const parsed = customCalculatorService.parseUnitSpec(custom.metadata.unitSpec);
      return parsed !== null ? parsed : defaultValue;
    }
    return defaultValue;
  };

  const handleCalculateWithArea = (area?: number) => {
    const areaToUse = area || roofArea;
    if (!areaToUse || areaToUse <= 0) {
      alert('Please enter a valid roof area or search by address');
      return;
    }

    const results: CalculationResult[] = [];
    const sqft = Number(areaToUse);
    const baseSquares = sqft / 100; // Convert to roofing squares

    // Apply waste factor
    const wasteMultiplier = 1 + (wasteFactor / 100);
    const squares = baseSquares * wasteMultiplier;

    // 1. Roofing Material - MATCHES WIDGET (or custom pricing)
    const pricePerSquare = useCustomPricing && customPricePerSquare
      ? Number(customPricePerSquare)
      : materialPrices[material];
    const materialCost = squares * pricePerSquare;
    results.push({
      label: useCustomPricing && customMaterialName
        ? `Roofing Material (${customMaterialName}) - with ${wasteFactor}% waste`
        : `Roofing Material - with ${wasteFactor}% waste`,
      value: squares,
      unit: 'squares',
      cost: materialCost
    });

    // 2. Underlayment - Uses custom pricing from database
    const underlaymentPrice = getCustomPrice('Standard Underlayment', 26, 'underlayment');
    results.push({
      label: 'Underlayment',
      value: squares,
      unit: 'squares',
      cost: squares * underlaymentPrice
    });

    // 3. Ice & Water Shield - Uses custom pricing and unit specs from database
    if (includeIceShield) {
      const sqFtPerRoll = getCustomUnitValue('Ice & Water Shield', 200, 'underlayment');
      const pricePerRoll = getCustomPrice('Ice & Water Shield', 70, 'underlayment');
      const rolls = Math.ceil(sqft / sqFtPerRoll);
      results.push({
        label: 'Ice & Water Shield',
        value: rolls,
        unit: 'rolls',
        cost: rolls * pricePerRoll
      });
    }

    // 4. Ridge Cap - Uses custom pricing from database
    const ridgeFeet = sqft * 0.1;
    const ridgeCapPrice = getCustomPrice('Ridge Cap', 3.25, 'components');
    results.push({
      label: 'Ridge Cap',
      value: ridgeFeet,
      unit: 'linear feet',
      cost: ridgeFeet * ridgeCapPrice
    });

    // 5. Drip Edge - Uses custom pricing from database
    const dripEdge = Math.sqrt(sqft) * 4;
    const dripEdgePrice = getCustomPrice('Drip Edge', 2.5, 'components');
    results.push({
      label: 'Drip Edge',
      value: dripEdge,
      unit: 'linear feet',
      cost: dripEdge * dripEdgePrice
    });

    // 6. Nails & Fasteners - Uses custom pricing from database
    const nailsPrice = getCustomPrice('Nails & Fasteners', 32, 'components');
    results.push({
      label: 'Nails & Fasteners',
      value: squares,
      unit: 'squares',
      cost: squares * nailsPrice
    });

    // 7. Debris Disposal (if tear-off needed) - Uses custom pricing from database
    if (layers && layers > 0) {
      const debrisPrice = getCustomPrice('Debris Disposal', 32, 'components');
      results.push({
        label: 'Debris Disposal',
        value: squares,
        unit: 'squares',
        cost: squares * debrisPrice
      });
    }

    // 8. Skylight Flashing - Uses custom pricing from database
    if (skylights && skylights > 0) {
      const skylightPrice = getCustomPrice('Skylight Flashing', 85, 'components');
      results.push({
        label: 'Skylight Flashing',
        value: Number(skylights),
        unit: skylights > 1 ? 'skylights' : 'skylight',
        cost: Number(skylights) * skylightPrice
      });
    }

    // 9. Ventilation System - Uses custom pricing from database
    if (includeVentilation) {
      const ventilationPrice = getCustomPrice('Ventilation System', 625, 'components');
      results.push({
        label: 'Ventilation System',
        value: 1,
        unit: 'system',
        cost: ventilationPrice
      });
    }

    // 10. Extended Warranty - Uses custom pricing from database
    if (includeWarranty) {
      const warrantyPrice = getCustomPrice('Extended Warranty', 27, 'components');
      results.push({
        label: 'Extended Warranty',
        value: squares,
        unit: 'squares',
        cost: squares * warrantyPrice
      });
    }

    setLastCalculation(results);
    onCalculate(results);
  };

  const handleCalculate = () => {
    handleCalculateWithArea();
  };

  const handleSaveCalculation = async () => {
    if (!lastCalculation || lastCalculation.length === 0) {
      alert('Please calculate an estimate first');
      return;
    }

    if (!saveTitle.trim()) {
      alert('Please enter a title for this calculation');
      return;
    }

    setSaving(true);
    try {
      // Calculate total from results
      const total = lastCalculation.reduce((sum, item) => sum + item.cost, 0);

      // Generate UUID for new estimate
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // Get selected client info
      const selectedClient = clients.find(c => c.id === selectedClientId);

      const estimate = {
        id: generateUUID(),
        title: saveTitle.trim(),
        clientId: selectedClientId || undefined,
        clientName: selectedClient?.name || undefined,
        status: 'draft' as const,
        subtotal: total,
        taxRate: 0,
        taxAmount: 0,
        total: total,
        items: lastCalculation.map(item => ({
          id: Math.random().toString(36).substr(2, 9),
          description: item.label,
          quantity: item.value,
          unit: item.unit,
          unitPrice: item.cost / item.value,
          total: item.cost
        })),
        calculatorType: 'roofing',
        calculatorData: {
          address,
          roofArea,
          material,
          pitch,
          stories,
          layers,
          skylights,
          wasteFactor,
          includeVentilation,
          includeIceShield,
          includeWarranty,
          useCustomPricing,
          customMaterialName: useCustomPricing ? customMaterialName : undefined,
          customPricePerSquare: useCustomPricing ? customPricePerSquare : undefined
        }
      };

      const result = await estimateService.saveEstimate(estimate);

      if (result.success) {
        alert('✅ Calculation saved successfully!');
        setShowSaveModal(false);
        setSaveTitle('');
        setSelectedClientId('');

        // Trigger refresh of saved calculations list
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } else {
        throw new Error('Failed to save calculation');
      }
    } catch (error) {
      console.error('Error saving calculation:', error);
      alert('❌ Failed to save calculation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddressSearch();
    }
  };

  const getStatusIcon = () => {
    if (!addressStatus.type) return null;
    switch (addressStatus.type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'info':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (addressStatus.type) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <Warehouse className="h-6 w-6 text-orange-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Roofing Cost Calculator</h2>
      </div>

      <div className="space-y-6">
        {/* Address Auto-Detection */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            🏠 Find Your Roof Area by Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your address (e.g., 1600 Pennsylvania Ave NW, Washington, DC)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAddressSearch}
              disabled={searching || !address.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>

          {addressStatus.type && (
            <div className={`mt-2 p-2 rounded-md border flex items-start gap-2 ${getStatusColor()}`}>
              {getStatusIcon()}
              <p className="text-sm whitespace-pre-line">{addressStatus.message}</p>
            </div>
          )}
        </div>

        {/* Manual Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roof Area (sq ft) *
            </label>
            <input
              type="number"
              value={roofArea}
              onChange={(e) => setRoofArea(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder="2000"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
            <span className="text-xs text-gray-500 mt-1 block">
              Or search by address above to auto-fill
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material Type *
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as RoofMaterial)}
              disabled={useCustomPricing}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <option value="asphalt">Asphalt Shingles - ${materialPrices.asphalt}/sq</option>
              <option value="architectural">Architectural Shingles - ${materialPrices.architectural}/sq</option>
              <option value="atlas-storm">Atlas Storm Master Shingles - ${materialPrices['atlas-storm']}/sq</option>
              <option value="sbs-malarkey">SBS Malarkey Shingles - ${materialPrices['sbs-malarkey']}/sq</option>
              <option value="metal">Metal Roofing - ${materialPrices.metal}/sq</option>
              <option value="tile">Tile Roofing - ${materialPrices.tile}/sq</option>
              <option value="brava-synthetic">Brava Synthetic Tiles - ${materialPrices['brava-synthetic']}/sq</option>
              <option value="composite">Composite Shingles - ${materialPrices.composite}/sq</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roof Pitch
            </label>
            <select
              value={pitch}
              onChange={(e) => setPitch(e.target.value as RoofPitch)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="low">Low (0-4/12)</option>
              <option value="medium">Medium (5-8/12)</option>
              <option value="high">High (9-12/12)</option>
              <option value="steep">Steep (12+/12)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Stories
            </label>
            <select
              value={stories}
              onChange={(e) => setStories(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="1">1 Story</option>
              <option value="2">2 Stories</option>
              <option value="3">3+ Stories</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Old Layers to Remove
            </label>
            <select
              value={layers}
              onChange={(e) => setLayers(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="0">0 (New Build)</option>
              <option value="1">1 Layer</option>
              <option value="2">2 Layers</option>
              <option value="3">3 Layers</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Skylights
            </label>
            <input
              type="number"
              value={skylights}
              onChange={(e) => setSkylights(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Waste Factor (%)
            </label>
            <input
              type="number"
              value={wasteFactor}
              onChange={(e) => setWasteFactor(e.target.value ? parseFloat(e.target.value) : 0)}
              placeholder="10"
              min="0"
              max="100"
              step="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-500 mt-1 block">
              Accounts for cuts, overlaps, and roof complexity (10-25% typical)
            </span>
          </div>
        </div>

        {/* Custom Shingle Pricing Section */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200">
          <label className="flex items-center space-x-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={useCustomPricing}
              onChange={(e) => {
                setUseCustomPricing(e.target.checked);
                if (!e.target.checked) {
                  setCustomMaterialName('');
                  setCustomPricePerSquare('');
                }
              }}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-semibold text-gray-900">
              💎 Use Custom Shingle Pricing
            </span>
          </label>

          {useCustomPricing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-purple-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Material Name
                </label>
                <input
                  type="text"
                  value={customMaterialName}
                  onChange={(e) => setCustomMaterialName(e.target.value)}
                  placeholder="e.g., Premium Designer Shingles"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Square ($/sq)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={customPricePerSquare}
                    onChange={(e) => setCustomPricePerSquare(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="500"
                    min="0"
                    step="0.01"
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1 block">
                  1 square = 100 sq ft
                </span>
              </div>
            </div>
          )}

          {useCustomPricing && (
            <div className="mt-3 p-2 bg-purple-100 rounded-md">
              <p className="text-xs text-purple-700">
                ℹ️ Standard material dropdown is disabled when using custom pricing
              </p>
            </div>
          )}
        </div>

        {/* Optional Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Optional Features</h3>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVentilation}
              onChange={(e) => setIncludeVentilation(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Include Ventilation System (+$625)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeIceShield}
              onChange={(e) => setIncludeIceShield(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Include Ice & Water Shield</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeWarranty}
              onChange={(e) => setIncludeWarranty(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Extended Warranty ($27/sq)</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            className="flex-1 py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            Calculate Estimate
          </button>

          {lastCalculation && lastCalculation.length > 0 && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-6 py-3 border-2 border-green-600 text-base font-medium rounded-md text-green-600 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Calculation
            </button>
          )}
        </div>
      </div>

      {/* Save Calculation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Save Calculation</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="e.g., Main Street Roof Replacement"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client (Optional)
                </label>
                {clientsLoading ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading clients...</span>
                  </div>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">-- Select a client --</option>
                    {clients
                      .filter(c => c.status === 'active')
                      .map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} {client.company ? `(${client.company})` : ''}
                        </option>
                      ))}
                  </select>
                )}
                {!clientsLoading && clients.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No clients found. Add clients in the CRM section first.
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  💡 This calculation will be saved and can be loaded later from the "Saved Calculations" section.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCalculation}
                  disabled={saving || !saveTitle.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoofingCalculator;
