import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, RotateCcw, Trash2, Edit2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customCalculatorService } from '../services/customCalculatorService';
import { CustomMaterial } from '../types/custom-calculator';

// Default block materials from RetainingWallCalculator
const DEFAULT_BLOCK_MATERIALS = [
  { name: 'Standard Block 12"x8"x12"', unit: 'per block', price: 5.98, category: 'blocks', unitSpec: '100 blocks' },
  { name: 'Pinned Block 16"x6"x12"', unit: 'per block', price: 6.98, category: 'blocks', unitSpec: '100 blocks' },
  { name: 'Gravity Block 18"x8"x24"', unit: 'per block', price: 12.98, category: 'blocks', unitSpec: '50 blocks' },
  { name: 'Capstone Block', unit: 'per piece', price: 8.98, category: 'blocks', unitSpec: '100 pieces' }
];

const DEFAULT_CONCRETE_MATERIALS = [
  { name: 'Concrete Mix', unit: 'per cubic yard', price: 185, category: 'concrete', unitSpec: '10 cubic yards' },
  { name: 'Rebar', unit: 'per 20ft piece', price: 12.98, category: 'concrete', unitSpec: '50 pieces' }
];

const DEFAULT_TIMBER_MATERIALS = [
  { name: 'Pressure Treated 6x6 Timber', unit: 'per 8ft length', price: 24.98, category: 'timber', unitSpec: '20 lengths' }
];

const DEFAULT_BASE_DRAINAGE_MATERIALS = [
  { name: 'Gravel Base Material', unit: 'per cubic yard', price: 45, category: 'base-drainage', unitSpec: '10 cubic yards' },
  { name: 'Drainage Gravel', unit: 'per cubic yard', price: 55, category: 'base-drainage', unitSpec: '10 cubic yards' },
  { name: 'Drain Pipe', unit: 'per 10ft section', price: 8.98, category: 'base-drainage', unitSpec: '100 linear ft' }
];

const DEFAULT_REINFORCEMENT_MATERIALS = [
  { name: 'Geogrid Reinforcement', unit: 'per 200sf roll', price: 89.98, category: 'reinforcement', unitSpec: '1000 sq ft' },
  { name: 'Filter Fabric', unit: 'per 300sf roll', price: 45.98, category: 'reinforcement', unitSpec: '1500 sq ft' }
];

const UNIT_OPTIONS = [
  { value: 'block', label: 'per block' },
  { value: 'piece', label: 'per piece' },
  { value: 'cubic_yard', label: 'per cubic yard' },
  { value: 'length', label: 'per 8ft length' },
  { value: 'section', label: 'per 10ft section' },
  { value: 'roll_200', label: 'per 200sf roll' },
  { value: 'roll_300', label: 'per 300sf roll' },
  { value: 'piece_20ft', label: 'per 20ft piece' }
];

const ConfigureRetainingWallCalculator = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'blocks' | 'concrete' | 'timber' | 'base-drainage' | 'reinforcement'>('blocks');
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Default materials with editable state
  const [blockDefaults, setBlockDefaults] = useState(DEFAULT_BLOCK_MATERIALS);
  const [concreteDefaults, setConcreteDefaults] = useState(DEFAULT_CONCRETE_MATERIALS);
  const [timberDefaults, setTimberDefaults] = useState(DEFAULT_TIMBER_MATERIALS);
  const [baseDrainageDefaults, setBaseDrainageDefaults] = useState(DEFAULT_BASE_DRAINAGE_MATERIALS);
  const [reinforcementDefaults, setReinforcementDefaults] = useState(DEFAULT_REINFORCEMENT_MATERIALS);

  // Custom materials (added by user)
  const [customBlocks, setCustomBlocks] = useState<CustomMaterial[]>([]);
  const [customConcrete, setCustomConcrete] = useState<CustomMaterial[]>([]);
  const [customTimber, setCustomTimber] = useState<CustomMaterial[]>([]);
  const [customBaseDrainage, setCustomBaseDrainage] = useState<CustomMaterial[]>([]);
  const [customReinforcement, setCustomReinforcement] = useState<CustomMaterial[]>([]);

  // Editing state
  const [editingDefaultIndex, setEditingDefaultIndex] = useState<number | null>(null);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editUnit, setEditUnit] = useState('block');
  const [editUnitSpec, setEditUnitSpec] = useState('');

  // Add material modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newUnit, setNewUnit] = useState('block');
  const [newUnitSpec, setNewUnitSpec] = useState('');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const configResult = await customCalculatorService.getOrCreateConfig('retaining_wall');
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
          const blocks = materials.filter(m => m.category === 'blocks');
          const concrete = materials.filter(m => m.category === 'concrete');
          const timber = materials.filter(m => m.category === 'timber');
          const baseDrainage = materials.filter(m => m.category === 'base-drainage');
          const reinforcement = materials.filter(m => m.category === 'reinforcement');

          // For simplicity, treat all loaded materials as custom for now
          setCustomBlocks(blocks);
          setCustomConcrete(concrete);
          setCustomTimber(timber);
          setCustomBaseDrainage(baseDrainage);
          setCustomReinforcement(reinforcement);
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
    setEditUnit('block');
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
      const updater = category === 'blocks' ? setBlockDefaults :
                     category === 'concrete' ? setConcreteDefaults :
                     category === 'timber' ? setTimberDefaults :
                     category === 'base-drainage' ? setBaseDrainageDefaults :
                     setReinforcementDefaults;

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

    const material = [...customBlocks, ...customConcrete, ...customTimber, ...customBaseDrainage, ...customReinforcement]
      .find(m => m.id === editingCustomId);

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
      setNewUnit('block');
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
      setBlockDefaults(DEFAULT_BLOCK_MATERIALS);
      setConcreteDefaults(DEFAULT_CONCRETE_MATERIALS);
      setTimberDefaults(DEFAULT_TIMBER_MATERIALS);
      setBaseDrainageDefaults(DEFAULT_BASE_DRAINAGE_MATERIALS);
      setReinforcementDefaults(DEFAULT_REINFORCEMENT_MATERIALS);
      await loadConfiguration();
    } else {
      alert('Failed to reset configuration');
    }
  };

  const getUnitValue = (label: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.label === label);
    return option?.value || 'block';
  };

  const getUnitLabel = (value: string, spec?: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.value === value);
    const baseLabel = option?.label || 'per block';
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
      case 'blocks': return blockDefaults;
      case 'concrete': return concreteDefaults;
      case 'timber': return timberDefaults;
      case 'base-drainage': return baseDrainageDefaults;
      case 'reinforcement': return reinforcementDefaults;
    }
  };

  const getCurrentCustom = () => {
    switch (activeSection) {
      case 'blocks': return customBlocks;
      case 'concrete': return customConcrete;
      case 'timber': return customTimber;
      case 'base-drainage': return customBaseDrainage;
      case 'reinforcement': return customReinforcement;
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
            <h1 className="text-2xl font-bold text-gray-900">Configure Retaining Wall Calculator</h1>
            <p className="text-gray-600 mt-1">Customize materials and pricing for your retaining wall estimates</p>
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
            {(['blocks', 'concrete', 'timber', 'base-drainage', 'reinforcement'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === section
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {section === 'base-drainage' ? 'Base & Drainage' : section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Default {activeSection === 'base-drainage' ? 'Base & Drainage' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Materials
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
            <h3 className="text-lg font-semibold mb-4">Add New {activeSection === 'base-drainage' ? 'Base & Drainage' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Material</h3>
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
                  placeholder={activeSection === 'blocks' ? 'e.g., Premium Retaining Wall Block' :
                              activeSection === 'concrete' ? 'e.g., High-Strength Concrete Mix' :
                              activeSection === 'timber' ? 'e.g., Treated Pine Timber' :
                              activeSection === 'base-drainage' ? 'e.g., Crushed Stone Base' :
                              'e.g., Heavy-Duty Geogrid'}
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
                  setNewUnit('block');
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

export default ConfigureRetainingWallCalculator;
