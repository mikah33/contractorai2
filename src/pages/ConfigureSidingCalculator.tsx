import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Save, RotateCcw, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customCalculatorService } from '../services/customCalculatorService';
import { CustomMaterial } from '../types/custom-calculator';

// Default siding materials from SidingCalculator.tsx
const DEFAULT_SIDING_MATERIALS = [
  // Vinyl Siding
  { name: 'Vinyl Siding - Traditional Lap', unit: 'per square', unitSpec: '100 sq ft', price: 179.98, category: 'siding' },
  { name: 'Vinyl Siding - Dutch Lap', unit: 'per square', unitSpec: '100 sq ft', price: 199.98, category: 'siding' },
  { name: 'Vinyl Siding - Vertical Board & Batten', unit: 'per square', unitSpec: '100 sq ft', price: 219.98, category: 'siding' },
  { name: 'Vinyl Siding - Shake/Shingle', unit: 'per square', unitSpec: '100 sq ft', price: 259.98, category: 'siding' },
  // Fiber Cement Siding
  { name: 'Fiber Cement - Traditional Lap', unit: 'per square', unitSpec: '100 sq ft', price: 319.98, category: 'siding' },
  { name: 'Fiber Cement - Dutch Lap', unit: 'per square', unitSpec: '100 sq ft', price: 339.98, category: 'siding' },
  { name: 'Fiber Cement - Vertical Board & Batten', unit: 'per square', unitSpec: '100 sq ft', price: 359.98, category: 'siding' },
  { name: 'Fiber Cement - Shake/Shingle', unit: 'per square', unitSpec: '100 sq ft', price: 399.98, category: 'siding' },
  // Wood Siding
  { name: 'Wood Siding - Traditional Lap', unit: 'per square', unitSpec: '100 sq ft', price: 399.98, category: 'siding' },
  { name: 'Wood Siding - Dutch Lap', unit: 'per square', unitSpec: '100 sq ft', price: 419.98, category: 'siding' },
  { name: 'Wood Siding - Vertical Board & Batten', unit: 'per square', unitSpec: '100 sq ft', price: 439.98, category: 'siding' },
  { name: 'Wood Siding - Shake/Shingle', unit: 'per square', unitSpec: '100 sq ft', price: 479.98, category: 'siding' },
  // Metal Siding
  { name: 'Metal Siding - Traditional Lap', unit: 'per square', unitSpec: '100 sq ft', price: 299.98, category: 'siding' },
  { name: 'Metal Siding - Dutch Lap', unit: 'per square', unitSpec: '100 sq ft', price: 319.98, category: 'siding' },
  { name: 'Metal Siding - Vertical Board & Batten', unit: 'per square', unitSpec: '100 sq ft', price: 279.98, category: 'siding' },
  { name: 'Metal Siding - Shake/Shingle', unit: 'per square', unitSpec: '100 sq ft', price: 379.98, category: 'siding' },
  // Engineered Wood Siding
  { name: 'Engineered Wood - Traditional Lap', unit: 'per square', unitSpec: '100 sq ft', price: 359.98, category: 'siding' },
  { name: 'Engineered Wood - Dutch Lap', unit: 'per square', unitSpec: '100 sq ft', price: 379.98, category: 'siding' },
  { name: 'Engineered Wood - Vertical Board & Batten', unit: 'per square', unitSpec: '100 sq ft', price: 399.98, category: 'siding' },
  { name: 'Engineered Wood - Shake/Shingle', unit: 'per square', unitSpec: '100 sq ft', price: 439.98, category: 'siding' }
];

const DEFAULT_TRIM_MATERIALS = [
  { name: 'Vinyl Trim', unit: 'per 16ft piece', unitSpec: '16 ft', price: 17.98, category: 'trim' },
  { name: 'Wood Trim', unit: 'per 16ft piece', unitSpec: '16 ft', price: 25.98, category: 'trim' },
  { name: 'Aluminum Trim', unit: 'per 16ft piece', unitSpec: '16 ft', price: 31.98, category: 'trim' },
  { name: 'Fiber Cement Trim', unit: 'per 16ft piece', unitSpec: '16 ft', price: 39.98, category: 'trim' }
];

const DEFAULT_ACCESSORY_MATERIALS = [
  { name: 'House Wrap', unit: 'per roll', unitSpec: '1000 sq ft', price: 159.98, category: 'accessories' },
  { name: 'House Wrap Tape', unit: 'per roll', unitSpec: '165 linear ft', price: 12.98, category: 'accessories' },
  { name: 'Foam Insulation', unit: 'per bundle', unitSpec: '100 sq ft', price: 49.98, category: 'accessories' },
  { name: 'Starter Strip', unit: 'per 12ft piece', unitSpec: '12 ft', price: 13.98, category: 'accessories' },
  { name: 'J-Channel', unit: 'per 12.5ft piece', unitSpec: '12.5 ft', price: 17.98, category: 'accessories' },
  { name: 'Corner Posts', unit: 'per 10ft piece', unitSpec: '10 ft', price: 39.98, category: 'accessories' },
  { name: 'Siding Fasteners', unit: 'per box', unitSpec: '1000 count', price: 29.98, category: 'accessories' }
];

interface AddMaterialModalProps {
  category: string;
  onClose: () => void;
  onAdd: (material: { name: string; price: number; unit: string; category: string }) => Promise<void>;
}

const AddMaterialModal = ({ category, onClose, onAdd }: AddMaterialModalProps) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [unit, setUnit] = useState('per square');
  const [unitSpec, setUnitSpec] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || typeof price !== 'number') return;

    setSaving(true);
    try {
      await onAdd({ name, price, unit, category });
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Failed to add material');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Add Custom Material</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="e.g., Premium Vinyl Siding"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="per square">per square</option>
                <option value="per square foot">per square foot</option>
                <option value="per panel">per panel</option>
                <option value="per 16ft piece">per 16ft piece</option>
                <option value="per 12ft piece">per 12ft piece</option>
                <option value="per 12.5ft piece">per 12.5ft piece</option>
                <option value="per 10ft piece">per 10ft piece</option>
                <option value="per roll">per roll</option>
                <option value="per bundle">per bundle</option>
                <option value="per box">per box</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Specification (Optional)
              </label>
              <input
                type="text"
                value={unitSpec}
                onChange={(e) => setUnitSpec(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1000 sq ft, 165 linear ft, 100 count"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ConfigureSidingCalculator = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'siding' | 'trim' | 'accessories'>('siding');
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Default materials state (editable)
  const [sidingDefaults, setSidingDefaults] = useState(DEFAULT_SIDING_MATERIALS);
  const [trimDefaults, setTrimDefaults] = useState(DEFAULT_TRIM_MATERIALS);
  const [accessoryDefaults, setAccessoryDefaults] = useState(DEFAULT_ACCESSORY_MATERIALS);

  // Custom materials from database
  const [customSiding, setCustomSiding] = useState<CustomMaterial[]>([]);
  const [customTrim, setCustomTrim] = useState<CustomMaterial[]>([]);
  const [customAccessories, setCustomAccessories] = useState<CustomMaterial[]>([]);

  // UI state
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [editingDefault, setEditingDefault] = useState<{ index: number; field: 'name' | 'price' | 'unit' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editUnitSpec, setEditUnitSpec] = useState('');
  const [newUnitSpec, setNewUnitSpec] = useState('');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const UNIT_OPTIONS = [
    { value: 'per square', label: 'per square' },
    { value: 'per square foot', label: 'per square foot' },
    { value: 'per panel', label: 'per panel' },
    { value: 'per 16ft piece', label: 'per 16ft piece' },
    { value: 'per 12ft piece', label: 'per 12ft piece' },
    { value: 'per 12.5ft piece', label: 'per 12.5ft piece' },
    { value: 'per 10ft piece', label: 'per 10ft piece' },
    { value: 'per roll', label: 'per roll' },
    { value: 'per bundle', label: 'per bundle' },
    { value: 'per box', label: 'per box' }
  ];

  const getUnitValue = (unit: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.label === unit || opt.value === unit);
    return option?.value || unit;
  };

  const getUnitLabel = (value: string, spec?: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.value === value);
    const baseLabel = option?.label || 'per square';
    return spec ? `${baseLabel} (${spec})` : baseLabel;
  };

  const formatUnitDisplay = (material: any): string => {
    if (material.unitSpec) {
      return getUnitLabel(material.unit || getUnitValue(material.unit), material.unitSpec);
    }
    return material.unit?.startsWith('per ') ? material.unit : getUnitLabel(material.unit || getUnitValue(material.unit));
  };

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const configResult = await customCalculatorService.getOrCreateConfig('siding');
      if (!configResult.success || !configResult.data) {
        alert('Failed to load configuration');
        return;
      }

      const config = configResult.data;
      setConfigId(config.id);

      if (config.is_configured) {
        const materialsResult = await customCalculatorService.getMaterials(config.id);
        if (materialsResult.success && materialsResult.data) {
          const materials = materialsResult.data.filter(m => !m.is_archived);
          setCustomSiding(materials.filter(m => m.category === 'siding'));
          setCustomTrim(materials.filter(m => m.category === 'trim'));
          setCustomAccessories(materials.filter(m => m.category === 'accessories'));
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      alert('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomMaterial = async (material: { name: string; price: number; unit: string; category: string }) => {
    if (!configId) return;

    const materialWithMetadata = {
      ...material,
      metadata: newUnitSpec ? { unitSpec: newUnitSpec } : undefined
    };

    const result = await customCalculatorService.addMaterial(configId, materialWithMetadata);
    if (result.success) {
      await loadConfiguration();
      setShowAddMaterial(false);
      setNewUnitSpec('');
    } else {
      alert('Failed to add material');
    }
  };

  const handleDeleteCustomMaterial = async (materialId: string) => {
    if (!confirm('Delete this custom material? This cannot be undone.')) return;

    const result = await customCalculatorService.deleteMaterial(materialId);
    if (result.success) {
      await loadConfiguration();
    } else {
      alert('Failed to delete material');
    }
  };

  const handleEditDefault = (index: number, field: 'name' | 'price' | 'unit') => {
    const materials = activeTab === 'siding' ? sidingDefaults : activeTab === 'trim' ? trimDefaults : accessoryDefaults;
    const value = field === 'price' ? materials[index][field].toString() : materials[index][field];
    setEditValue(value);
    setEditUnitSpec(materials[index].unitSpec || '');
    setEditingDefault({ index, field });
  };

  const handleSaveEdit = () => {
    if (!editingDefault) return;

    const { index, field } = editingDefault;
    const newValue = field === 'price' ? parseFloat(editValue) : editValue;

    if (activeTab === 'siding') {
      const updated = [...sidingDefaults];
      updated[index] = {
        ...updated[index],
        [field]: newValue,
        unitSpec: editUnitSpec || updated[index].unitSpec
      };
      setSidingDefaults(updated);
    } else if (activeTab === 'trim') {
      const updated = [...trimDefaults];
      updated[index] = {
        ...updated[index],
        [field]: newValue,
        unitSpec: editUnitSpec || updated[index].unitSpec
      };
      setTrimDefaults(updated);
    } else {
      const updated = [...accessoryDefaults];
      updated[index] = {
        ...updated[index],
        [field]: newValue,
        unitSpec: editUnitSpec || updated[index].unitSpec
      };
      setAccessoryDefaults(updated);
    }

    setEditingDefault(null);
    setEditValue('');
    setEditUnitSpec('');
  };

  const handleCancelEdit = () => {
    setEditingDefault(null);
    setEditValue('');
    setEditUnitSpec('');
  };

  const handleReset = async () => {
    if (!confirm('Reset all materials to defaults? This will delete all custom materials.')) return;
    if (!configId) return;

    const result = await customCalculatorService.resetConfiguration(configId);
    if (result.success) {
      setSidingDefaults(DEFAULT_SIDING_MATERIALS);
      setTrimDefaults(DEFAULT_TRIM_MATERIALS);
      setAccessoryDefaults(DEFAULT_ACCESSORY_MATERIALS);
      await loadConfiguration();
    } else {
      alert('Failed to reset configuration');
    }
  };

  const getCurrentDefaults = () => {
    switch (activeTab) {
      case 'siding': return sidingDefaults;
      case 'trim': return trimDefaults;
      case 'accessories': return accessoryDefaults;
    }
  };

  const getCurrentCustom = () => {
    switch (activeTab) {
      case 'siding': return customSiding;
      case 'trim': return customTrim;
      case 'accessories': return customAccessories;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Pricing Calculator</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configure Siding Calculator</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Customize materials and pricing for your siding estimates</p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-2 sm:gap-4 px-4 sm:px-6 min-w-max">
            {(['siding', 'trim', 'accessories'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Default Materials Section */}
          <div className="mb-8">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Default Materials</h2>
            <div className="bg-blue-50 rounded-lg border border-blue-100 p-3 sm:p-4 space-y-2 sm:space-y-3">
              {getCurrentDefaults().map((material, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 px-3 bg-white rounded-md gap-2 sm:gap-0">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
                    <div className="sm:col-span-1">
                      {editingDefault?.index === index && editingDefault.field === 'name' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-700">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEditDefault(index, 'name')}
                          className="font-medium text-sm sm:text-base text-gray-900 cursor-pointer hover:text-blue-600"
                        >
                          {material.name}
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      {editingDefault?.index === index && editingDefault.field === 'price' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full sm:w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-700">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEditDefault(index, 'price')}
                          className="text-sm sm:text-base text-gray-700 cursor-pointer hover:text-blue-600"
                        >
                          ${material.price.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      {editingDefault?.index === index ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus={editingDefault.field === 'unit'}
                              placeholder="Unit"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editUnitSpec}
                              onChange={(e) => setEditUnitSpec(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 1000 sq ft"
                            />
                            <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-700">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-700">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEditDefault(index, 'unit')}
                          className="text-xs sm:text-sm text-gray-500 cursor-pointer hover:text-blue-600"
                        >
                          {formatUnitDisplay(material)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 px-1">
              💡 Click on any value to edit. These are the default materials from the calculator.
            </p>
          </div>

          {/* Custom Materials Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Custom Materials</h2>
              <button
                onClick={() => setShowAddMaterial(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 min-h-[120px]">
              {getCurrentCustom().length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {getCurrentCustom().map((material) => (
                    <div key={material.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 px-3 bg-white rounded-md gap-3 sm:gap-0">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                        <div className="font-medium text-sm sm:text-base text-gray-900">{material.name}</div>
                        <div className="text-sm sm:text-base text-gray-700">${material.price.toFixed(2)}</div>
                        <div className="text-xs sm:text-sm text-gray-500">{getUnitLabel(material.unit, material.metadata?.unitSpec)}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteCustomMaterial(material.id)}
                        className="sm:ml-4 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm w-full sm:w-auto"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm sm:text-base text-gray-500">
                  No custom materials added yet. Click "Add Material" to create your own.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddMaterial && (
        <AddMaterialModal
          category={activeTab}
          onClose={() => setShowAddMaterial(false)}
          onAdd={handleAddCustomMaterial}
        />
      )}
    </div>
  );
};

export default ConfigureSidingCalculator;
