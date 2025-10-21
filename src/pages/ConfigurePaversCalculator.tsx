import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, RotateCcw, Trash2, Edit2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customCalculatorService } from '../services/customCalculatorService';
import { CustomMaterial } from '../types/custom-calculator';

// Default paver materials from PaversCalculator (lines 50-60)
const DEFAULT_BASE_MATERIALS = [
  { name: 'Base Material', unit: 'per cubic yard', price: 45, category: 'base', unitSpec: '' }
];

const DEFAULT_BEDDING_MATERIALS = [
  { name: 'Sand', unit: 'per cubic yard', price: 55, category: 'bedding', unitSpec: '' },
  { name: 'Stone Dust', unit: 'per cubic yard', price: 55, category: 'bedding', unitSpec: '' },
  { name: '3/8" Stone', unit: 'per cubic yard', price: 55, category: 'bedding', unitSpec: '' }
];

const DEFAULT_EDGE_MATERIALS = [
  { name: 'Edge Blocks 4x8', unit: 'per piece', price: 1.50, category: 'edging', unitSpec: '' },
  { name: 'Edge Blocks 6x9', unit: 'per piece', price: 2.00, category: 'edging', unitSpec: '' },
  { name: 'Edge Blocks 6x12', unit: 'per piece', price: 2.25, category: 'edging', unitSpec: '' },
  { name: 'Edge Blocks Custom', unit: 'per piece', price: 2.00, category: 'edging', unitSpec: '' }
];

const DEFAULT_PAVER_MATERIALS = [
  { name: 'Polymeric Sand', unit: 'per 60lb bag', price: 45, category: 'pavers', unitSpec: '' }
];

const UNIT_OPTIONS = [
  { value: 'cubic_yard', label: 'per cubic yard' },
  { value: 'bag', label: 'per 60lb bag' },
  { value: 'piece', label: 'per piece' },
  { value: 'square_foot', label: 'per square foot' },
  { value: 'pallet', label: 'per pallet' },
  { value: 'unit', label: 'per unit' }
];

const ConfigurePaversCalculator = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'base' | 'bedding' | 'edging' | 'pavers'>('base');
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Default materials with editable state
  const [baseDefaults, setBaseDefaults] = useState(DEFAULT_BASE_MATERIALS);
  const [beddingDefaults, setBeddingDefaults] = useState(DEFAULT_BEDDING_MATERIALS);
  const [edgingDefaults, setEdgingDefaults] = useState(DEFAULT_EDGE_MATERIALS);
  const [paverDefaults, setPaverDefaults] = useState(DEFAULT_PAVER_MATERIALS);

  // Custom materials (added by user)
  const [customBase, setCustomBase] = useState<CustomMaterial[]>([]);
  const [customBedding, setCustomBedding] = useState<CustomMaterial[]>([]);
  const [customEdging, setCustomEdging] = useState<CustomMaterial[]>([]);
  const [customPavers, setCustomPavers] = useState<CustomMaterial[]>([]);

  // Editing state
  const [editingDefaultIndex, setEditingDefaultIndex] = useState<number | null>(null);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editUnit, setEditUnit] = useState('cubic_yard');
  const [editUnitSpec, setEditUnitSpec] = useState('');

  // Add material modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newUnit, setNewUnit] = useState('cubic_yard');
  const [newUnitSpec, setNewUnitSpec] = useState('');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const configResult = await customCalculatorService.getOrCreateConfig('pavers');
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

          // Separate custom materials from defaults
          const base = materials.filter(m => m.category === 'base');
          const bedding = materials.filter(m => m.category === 'bedding');
          const edging = materials.filter(m => m.category === 'edging');
          const pavers = materials.filter(m => m.category === 'pavers');

          // For simplicity, treat all loaded materials as custom for now
          setCustomBase(base);
          setCustomBedding(bedding);
          setCustomEdging(edging);
          setCustomPavers(pavers);
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      alert('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const startEditDefault = (index: number, material: any) => {
    setEditingDefaultIndex(index);
    setEditName(material.name);
    setEditPrice(material.price);
    setEditUnit(getUnitValue(material.unit));
    setEditUnitSpec(material.unitSpec || '');
  };

  const startEditCustom = (material: CustomMaterial) => {
    setEditingCustomId(material.id);
    setEditName(material.name);
    setEditPrice(material.price);
    setEditUnit(material.unit);
    setEditUnitSpec(material.metadata?.unitSpec || '');
  };

  const cancelEdit = () => {
    setEditingDefaultIndex(null);
    setEditingCustomId(null);
    setEditName('');
    setEditPrice(0);
    setEditUnit('cubic_yard');
    setEditUnitSpec('');
  };

  const saveDefaultEdit = async (index: number, category: string) => {
    if (!configId) return;

    const result = await customCalculatorService.addMaterial(configId, {
      name: editName,
      price: editPrice,
      unit: editUnit,
      category,
      metadata: editUnitSpec ? { unitSpec: editUnitSpec } : undefined
    });

    if (result.success) {
      // Update the default material display
      const updater = category === 'base' ? setBaseDefaults :
                     category === 'bedding' ? setBeddingDefaults :
                     category === 'edging' ? setEdgingDefaults :
                     setPaverDefaults;

      updater(prev => prev.map((item, i) =>
        i === index ? { ...item, name: editName, price: editPrice, unit: getUnitLabel(editUnit) } : item
      ));

      await loadConfiguration();
      cancelEdit();
    } else {
      alert('Failed to update material');
    }
  };

  const saveCustomEdit = async () => {
    if (!editingCustomId) return;

    const customMaterials = getCurrentCustom();
    const material = customMaterials.find(m => m.id === editingCustomId);

    const result = await customCalculatorService.updateMaterial(editingCustomId, {
      name: editName,
      price: editPrice,
      unit: editUnit,
      metadata: { ...material?.metadata, unitSpec: editUnitSpec }
    });

    if (result.success) {
      await loadConfiguration();
      cancelEdit();
    } else {
      alert('Failed to update material');
    }
  };

  const handleAddMaterial = async () => {
    if (!configId || !newName || typeof newPrice !== 'number') return;

    const category = activeSection;
    const result = await customCalculatorService.addMaterial(configId, {
      name: newName,
      price: newPrice,
      unit: newUnit,
      category,
      metadata: newUnitSpec ? { unitSpec: newUnitSpec } : undefined
    });

    if (result.success) {
      await loadConfiguration();
      setShowAddModal(false);
      setNewName('');
      setNewPrice(0);
      setNewUnit('cubic_yard');
      setNewUnitSpec('');
    } else {
      alert('Failed to add material');
    }
  };

  const handleDeleteCustom = async (materialId: string) => {
    if (!confirm('Permanently delete this material? This cannot be undone.')) return;

    const result = await customCalculatorService.deleteMaterial(materialId);
    if (result.success) {
      await loadConfiguration();
    } else {
      alert('Failed to delete material');
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all custom materials? This cannot be undone.')) return;
    if (!configId) return;

    const result = await customCalculatorService.resetConfiguration(configId);
    if (result.success) {
      setBaseDefaults(DEFAULT_BASE_MATERIALS);
      setBeddingDefaults(DEFAULT_BEDDING_MATERIALS);
      setEdgingDefaults(DEFAULT_EDGE_MATERIALS);
      setPaverDefaults(DEFAULT_PAVER_MATERIALS);
      await loadConfiguration();
    } else {
      alert('Failed to reset configuration');
    }
  };

  const getUnitValue = (label: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.label === label);
    return option?.value || 'cubic_yard';
  };

  const getUnitLabel = (value: string, spec?: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.value === value);
    const baseLabel = option?.label || 'per cubic yard';
    return spec ? `${baseLabel} (${spec})` : baseLabel;
  };

  const formatUnitDisplay = (material: any): string => {
    if (material.unitSpec) {
      return getUnitLabel(material.unit || getUnitValue(material.unit), material.unitSpec);
    }
    return material.unit?.startsWith('per ') ? material.unit : getUnitLabel(material.unit || getUnitValue(material.unit));
  };

  const getCurrentDefaults = () => {
    switch (activeSection) {
      case 'base': return baseDefaults;
      case 'bedding': return beddingDefaults;
      case 'edging': return edgingDefaults;
      case 'pavers': return paverDefaults;
    }
  };

  const getCurrentCustom = () => {
    switch (activeSection) {
      case 'base': return customBase;
      case 'bedding': return customBedding;
      case 'edging': return customEdging;
      case 'pavers': return customPavers;
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
            <h1 className="text-2xl font-bold text-gray-900">Configure Pavers Calculator</h1>
            <p className="text-gray-600 mt-1">Customize materials and pricing for your paver installation estimates</p>
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
            {(['base', 'bedding', 'edging', 'pavers'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === section
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Default {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Materials
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add New Material
            </button>
          </div>

          {/* Default Materials */}
          <div className="space-y-3 mb-8">
            {getCurrentDefaults().map((material, index) => (
              <div key={index} className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg border border-blue-100">
                {editingDefaultIndex === index ? (
                  <>
                    <div className="flex-1 grid grid-cols-4 gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Material name"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(parseFloat(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Price"
                      />
                      <select
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {UNIT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editUnitSpec}
                        onChange={(e) => setEditUnitSpec(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., 1000 sq ft"
                      />
                    </div>
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => saveDefaultEdit(index, activeSection)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{material.name}</div>
                      <div className="text-sm text-gray-600">
                        ${material.price.toFixed(2)} {formatUnitDisplay(material)}
                      </div>
                    </div>
                    <button
                      onClick={() => startEditDefault(index, material)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Edit Price"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Custom Materials */}
          {getCurrentCustom().length > 0 && (
            <>
              <h3 className="text-md font-semibold text-gray-900 mb-3">Custom Materials</h3>
              <div className="space-y-3">
                {getCurrentCustom().map((material) => (
                  <div key={material.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    {editingCustomId === material.id ? (
                      <>
                        <div className="flex-1 grid grid-cols-4 gap-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseFloat(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <select
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {UNIT_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editUnitSpec}
                            onChange={(e) => setEditUnitSpec(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., 1000 sq ft"
                          />
                        </div>
                        <div className="flex gap-2 ml-3">
                          <button
                            onClick={saveCustomEdit}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{material.name}</div>
                          <div className="text-sm text-gray-600">
                            ${material.price.toFixed(2)} {getUnitLabel(material.unit, material.metadata?.unitSpec)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditCustom(material)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustom(material.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {getCurrentCustom().length === 0 && (
            <div className="text-center py-6 text-gray-500 border-t border-gray-200 mt-6">
              No custom materials added yet. Click "Add New Material" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add New {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Material</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={activeSection === 'base' ? 'e.g., Crushed Stone Base' :
                              activeSection === 'bedding' ? 'e.g., Premium Bedding Sand' :
                              activeSection === 'edging' ? 'e.g., Custom Edge Blocks' :
                              'e.g., Premium Joint Sand'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {UNIT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 1000 sq ft, 165 linear ft, 100 count"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewName('');
                  setNewPrice(0);
                  setNewUnit('cubic_yard');
                  setNewUnitSpec('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMaterial}
                disabled={!newName || typeof newPrice !== 'number'}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                Add Material
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurePaversCalculator;
