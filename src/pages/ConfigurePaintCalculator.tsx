import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, RotateCcw, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customCalculatorService } from '../services/customCalculatorService';
import { CustomMaterial } from '../types/custom-calculator';

// Default paint materials from PaintCalculator.tsx
const DEFAULT_PAINT_MATERIALS = [
  // Interior Paint
  { name: 'Interior Paint - Economy', unit: 'per gallon (400 sq ft coverage)', price: 25.98, category: 'paint', unitSpec: '400 sq ft coverage' },
  { name: 'Interior Paint - Standard', unit: 'per gallon (400 sq ft coverage)', price: 35.98, category: 'paint', unitSpec: '400 sq ft coverage' },
  { name: 'Interior Paint - Premium', unit: 'per gallon (400 sq ft coverage)', price: 45.98, category: 'paint', unitSpec: '400 sq ft coverage' },
  // Exterior Paint
  { name: 'Exterior Paint - Economy', unit: 'per gallon (350 sq ft coverage)', price: 30.98, category: 'paint', unitSpec: '350 sq ft coverage' },
  { name: 'Exterior Paint - Standard', unit: 'per gallon (350 sq ft coverage)', price: 40.98, category: 'paint', unitSpec: '350 sq ft coverage' },
  { name: 'Exterior Paint - Premium', unit: 'per gallon (350 sq ft coverage)', price: 50.98, category: 'paint', unitSpec: '350 sq ft coverage' }
];

const DEFAULT_PRIMER_MATERIALS = [
  { name: 'Interior Primer', unit: 'per gallon', price: 25.98, category: 'primer', unitSpec: '' },
  { name: 'Exterior Primer', unit: 'per gallon', price: 30.98, category: 'primer', unitSpec: '' }
];

const DEFAULT_SUPPLY_MATERIALS = [
  { name: 'Paint Roller Frame', unit: 'per unit', price: 8.98, category: 'supplies', unitSpec: '' },
  { name: 'Roller Cover', unit: 'per unit', price: 4.98, category: 'supplies', unitSpec: '' },
  { name: 'Paint Brush Set', unit: 'per set', price: 12.98, category: 'supplies', unitSpec: '' },
  { name: 'Painter\'s Tape', unit: 'per roll', price: 6.98, category: 'supplies', unitSpec: '' },
  { name: 'Drop Cloth', unit: 'per unit', price: 15.98, category: 'supplies', unitSpec: '' },
  { name: 'Paint Tray', unit: 'per unit', price: 3.98, category: 'supplies', unitSpec: '' }
];

interface AddMaterialModalProps {
  category: string;
  onClose: () => void;
  onAdd: (material: { name: string; price: number; unit: string; category: string; metadata?: any }) => Promise<void>;
}

const AddMaterialModal = ({ category, onClose, onAdd }: AddMaterialModalProps) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [unit, setUnit] = useState('per gallon');
  const [newUnitSpec, setNewUnitSpec] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || typeof price !== 'number') return;

    setSaving(true);
    try {
      await onAdd({
        name,
        price,
        unit,
        category,
        metadata: newUnitSpec ? { unitSpec: newUnitSpec } : undefined
      });
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
                placeholder="e.g., Premium Interior Paint - Eggshell"
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
                <option value="per gallon">per gallon</option>
                <option value="per quart">per quart</option>
                <option value="per unit">per unit</option>
                <option value="per roll">per roll</option>
                <option value="per set">per set</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Specification (Optional)
              </label>
              <input
                type="text"
                value={newUnitSpec}
                onChange={(e) => setNewUnitSpec(e.target.value)}
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

const ConfigurePaintCalculator = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'paint' | 'primer' | 'supplies'>('paint');
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Default materials state (editable)
  const [paintDefaults, setPaintDefaults] = useState(DEFAULT_PAINT_MATERIALS);
  const [primerDefaults, setPrimerDefaults] = useState(DEFAULT_PRIMER_MATERIALS);
  const [supplyDefaults, setSupplyDefaults] = useState(DEFAULT_SUPPLY_MATERIALS);

  // Custom materials from database
  const [customPaint, setCustomPaint] = useState<CustomMaterial[]>([]);
  const [customPrimer, setCustomPrimer] = useState<CustomMaterial[]>([]);
  const [customSupplies, setCustomSupplies] = useState<CustomMaterial[]>([]);

  // UI state
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [editingDefault, setEditingDefault] = useState<{ index: number; field: 'name' | 'price' | 'unit' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editUnitSpec, setEditUnitSpec] = useState('');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const configResult = await customCalculatorService.getOrCreateConfig('paint');
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
          setCustomPaint(materials.filter(m => m.category === 'paint'));
          setCustomPrimer(materials.filter(m => m.category === 'primer'));
          setCustomSupplies(materials.filter(m => m.category === 'supplies'));
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      alert('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomMaterial = async (material: { name: string; price: number; unit: string; category: string; metadata?: any }) => {
    if (!configId) return;

    const result = await customCalculatorService.addMaterial(configId, material);
    if (result.success) {
      await loadConfiguration();
      setShowAddMaterial(false);
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
    const materials = activeTab === 'paint' ? paintDefaults : activeTab === 'primer' ? primerDefaults : supplyDefaults;
    const value = field === 'price' ? materials[index][field].toString() : materials[index][field];
    setEditValue(value);
    setEditUnitSpec((materials[index] as any).unitSpec || '');
    setEditingDefault({ index, field });
  };

  const handleSaveEdit = () => {
    if (!editingDefault) return;

    const { index, field } = editingDefault;
    const newValue = field === 'price' ? parseFloat(editValue) : editValue;

    if (activeTab === 'paint') {
      const updated = [...paintDefaults];
      updated[index] = {
        ...updated[index],
        [field]: newValue,
        unitSpec: editUnitSpec
      };
      setPaintDefaults(updated);
    } else if (activeTab === 'primer') {
      const updated = [...primerDefaults];
      updated[index] = {
        ...updated[index],
        [field]: newValue,
        unitSpec: editUnitSpec
      };
      setPrimerDefaults(updated);
    } else {
      const updated = [...supplyDefaults];
      updated[index] = {
        ...updated[index],
        [field]: newValue,
        unitSpec: editUnitSpec
      };
      setSupplyDefaults(updated);
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
      setPaintDefaults(DEFAULT_PAINT_MATERIALS);
      setPrimerDefaults(DEFAULT_PRIMER_MATERIALS);
      setSupplyDefaults(DEFAULT_SUPPLY_MATERIALS);
      await loadConfiguration();
    } else {
      alert('Failed to reset configuration');
    }
  };

  const getCurrentDefaults = () => {
    switch (activeTab) {
      case 'paint': return paintDefaults;
      case 'primer': return primerDefaults;
      case 'supplies': return supplyDefaults;
    }
  };

  const getCurrentCustom = () => {
    switch (activeTab) {
      case 'paint': return customPaint;
      case 'primer': return customPrimer;
      case 'supplies': return customSupplies;
    }
  };

  const UNIT_OPTIONS = [
    { value: 'per gallon', label: 'per gallon' },
    { value: 'per quart', label: 'per quart' },
    { value: 'per unit', label: 'per unit' },
    { value: 'per roll', label: 'per roll' },
    { value: 'per set', label: 'per set' }
  ];

  const getUnitValue = (unit: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.label === unit || opt.value === unit);
    return option?.value || 'per gallon';
  };

  const getUnitLabel = (value: string, spec?: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.value === value);
    const baseLabel = option?.label || 'per gallon';
    return spec ? `${baseLabel} (${spec})` : baseLabel;
  };

  const formatUnitDisplay = (material: any): string => {
    if (material.unitSpec) {
      return getUnitLabel(material.unit || getUnitValue(material.unit), material.unitSpec);
    }
    return material.unit?.startsWith('per ') ? material.unit : getUnitLabel(material.unit || getUnitValue(material.unit));
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
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pricing Calculator
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configure Paint Calculator</h1>
            <p className="text-gray-600 mt-1">Customize materials and pricing for your painting estimates</p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6">
            {(['paint', 'primer', 'supplies'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
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

        <div className="p-6">
          {/* Default Materials Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Materials</h2>
            <div className="bg-blue-50 rounded-lg border border-blue-100 p-4 space-y-3">
              {getCurrentDefaults().map((material, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded-md">
                  {editingDefault?.index === index ? (
                    <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                      <input
                        type="text"
                        value={editingDefault.field === 'name' ? editValue : material.name}
                        onChange={(e) => editingDefault.field === 'name' && setEditValue(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        readOnly={editingDefault.field !== 'name'}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editingDefault.field === 'price' ? editValue : material.price}
                        onChange={(e) => editingDefault.field === 'price' && setEditValue(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        readOnly={editingDefault.field !== 'price'}
                      />
                      <input
                        type="text"
                        value={editingDefault.field === 'unit' ? editValue : material.unit}
                        onChange={(e) => editingDefault.field === 'unit' && setEditValue(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        readOnly={editingDefault.field !== 'unit'}
                      />
                      <input
                        type="text"
                        value={editUnitSpec}
                        onChange={(e) => setEditUnitSpec(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., 1000 sq ft"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-700">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                      <div
                        onClick={() => handleEditDefault(index, 'name')}
                        className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                      >
                        {material.name}
                      </div>
                      <div
                        onClick={() => handleEditDefault(index, 'price')}
                        className="text-gray-700 cursor-pointer hover:text-blue-600"
                      >
                        ${material.price.toFixed(2)}
                      </div>
                      <div
                        onClick={() => handleEditDefault(index, 'unit')}
                        className="text-sm text-gray-500 cursor-pointer hover:text-blue-600"
                      >
                        {formatUnitDisplay(material)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Click on any value to edit. These are the default materials from the calculator.
            </p>
          </div>

          {/* Custom Materials Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Custom Materials</h2>
              <button
                onClick={() => setShowAddMaterial(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Material
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 min-h-[120px]">
              {getCurrentCustom().length > 0 ? (
                <div className="space-y-3">
                  {getCurrentCustom().map((material) => (
                    <div key={material.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-md">
                      <div className="flex-1 grid grid-cols-3 gap-4">
                        <div className="font-medium text-gray-900">{material.name}</div>
                        <div className="text-gray-700">${material.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">
                          {getUnitLabel(material.unit, material.metadata?.unitSpec)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCustomMaterial(material.id)}
                        className="ml-4 px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
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

export default ConfigurePaintCalculator;
