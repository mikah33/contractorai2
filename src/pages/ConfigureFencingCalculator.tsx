import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, RotateCcw, Trash2, Edit2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customCalculatorService } from '../services/customCalculatorService';
import { CustomMaterial } from '../types/custom-calculator';

// Default post materials from FencingCalculator
const DEFAULT_POST_MATERIALS = [
  { name: 'Wood Post', unit: 'per post', price: 24.98, category: 'posts', unitSpec: '8 ft height' },
  { name: 'Vinyl 5x5 Post', unit: 'per post', price: 42.00, category: 'posts', unitSpec: '8 ft height' },
  { name: 'Vinyl 4x4 Post', unit: 'per post', price: 27.00, category: 'posts', unitSpec: '8 ft height' },
  { name: 'Metal Post', unit: 'per post', price: 42.00, category: 'posts', unitSpec: '8 ft height' }
];

// Default panel materials from FencingCalculator
const DEFAULT_PANEL_MATERIALS = [
  // Privacy fence materials
  { name: 'Privacy Fence - Wood Panel', unit: 'per panel', price: 45.98, category: 'panels', unitSpec: '6 ft x 8 ft' },
  { name: 'Privacy Fence - Vinyl Panel', unit: 'per panel', price: 89.98, category: 'panels', unitSpec: '6 ft x 8 ft' },
  { name: 'Privacy Fence - Metal Panel', unit: 'per panel', price: 79.98, category: 'panels', unitSpec: '6 ft x 8 ft' },
  { name: 'Privacy Fence - Composite Panel', unit: 'per panel', price: 129.98, category: 'panels', unitSpec: '6 ft x 8 ft' },
  // Picket fence materials
  { name: 'Picket Fence - Wood Picket', unit: 'per picket', price: 2.98, category: 'panels', unitSpec: '3.5 ft height' },
  { name: 'Picket Fence - Vinyl Picket', unit: 'per picket', price: 4.98, category: 'panels', unitSpec: '3.5 ft height' },
  { name: 'Picket Fence - Metal Picket', unit: 'per picket', price: 3.98, category: 'panels', unitSpec: '3.5 ft height' },
  { name: 'Picket Fence - Composite Picket', unit: 'per picket', price: 6.98, category: 'panels', unitSpec: '3.5 ft height' },
  // Chain link
  { name: 'Chain-Link Fabric', unit: 'per sq ft', price: 5.98, category: 'panels', unitSpec: '50 ft roll' },
  // Ranch rail
  { name: 'Ranch Rail - Wood', unit: 'per rail', price: 14.98, category: 'panels', unitSpec: '8 ft length' },
  { name: 'Ranch Rail - Vinyl', unit: 'per rail', price: 24.98, category: 'panels', unitSpec: '8 ft length' },
  // Panel fence
  { name: 'Wood Panel (8ft)', unit: 'per panel', price: 69.98, category: 'panels', unitSpec: '6 ft x 8 ft' },
  { name: 'Vinyl Panel (8ft)', unit: 'per panel', price: 129.98, category: 'panels', unitSpec: '6 ft x 8 ft' },
  { name: 'Composite Panel (8ft)', unit: 'per panel', price: 189.98, category: 'panels', unitSpec: '6 ft x 8 ft' }
];

// Default gate materials from FencingCalculator
const DEFAULT_GATE_MATERIALS = [
  // Single gates
  { name: 'Single Gate - Wood', unit: 'per gate', price: 129.98, category: 'gates', unitSpec: '4 ft x 6 ft' },
  { name: 'Single Gate - Vinyl', unit: 'per gate', price: 199.98, category: 'gates', unitSpec: '4 ft x 6 ft' },
  { name: 'Single Gate - Metal', unit: 'per gate', price: 169.98, category: 'gates', unitSpec: '4 ft x 6 ft' },
  { name: 'Single Gate - Composite', unit: 'per gate', price: 249.98, category: 'gates', unitSpec: '4 ft x 6 ft' },
  // Double gates
  { name: 'Double Gate - Wood', unit: 'per gate', price: 249.98, category: 'gates', unitSpec: '8 ft x 6 ft' },
  { name: 'Double Gate - Vinyl', unit: 'per gate', price: 399.98, category: 'gates', unitSpec: '8 ft x 6 ft' },
  { name: 'Double Gate - Metal', unit: 'per gate', price: 329.98, category: 'gates', unitSpec: '8 ft x 6 ft' },
  { name: 'Double Gate - Composite', unit: 'per gate', price: 499.98, category: 'gates', unitSpec: '8 ft x 6 ft' },
  // Rolling gates
  { name: 'Rolling Gate - Wood', unit: 'per gate', price: 399.98, category: 'gates', unitSpec: '12 ft x 6 ft' },
  { name: 'Rolling Gate - Vinyl', unit: 'per gate', price: 599.98, category: 'gates', unitSpec: '12 ft x 6 ft' },
  { name: 'Rolling Gate - Metal', unit: 'per gate', price: 499.98, category: 'gates', unitSpec: '12 ft x 6 ft' },
  { name: 'Rolling Gate - Composite', unit: 'per gate', price: 799.98, category: 'gates', unitSpec: '12 ft x 6 ft' }
];

// Default component materials from FencingCalculator
const DEFAULT_COMPONENT_MATERIALS = [
  { name: 'Concrete Mix (60lb bag)', unit: 'per bag', price: 6.98, category: 'components', unitSpec: '60 lb bag' },
  { name: 'Post Spike', unit: 'per piece', price: 12.98, category: 'components', unitSpec: 'standard 4x4' },
  { name: 'Mounting Bracket', unit: 'per piece', price: 14.98, category: 'components', unitSpec: 'heavy duty' },
  { name: 'Kickboard (8ft)', unit: 'per piece', price: 8.98, category: 'components', unitSpec: '8 ft x 6 in' },
  { name: 'Gate Hardware - Single', unit: 'per set', price: 49.98, category: 'components', unitSpec: 'hinges & latch' },
  { name: 'Gate Hardware - Double', unit: 'per set', price: 89.98, category: 'components', unitSpec: 'hinges & latch' },
  { name: 'Gate Hardware - Rolling', unit: 'per set', price: 149.98, category: 'components', unitSpec: 'track & wheels' }
];

const UNIT_OPTIONS = [
  { value: 'post', label: 'per post' },
  { value: 'panel', label: 'per panel' },
  { value: 'picket', label: 'per picket' },
  { value: 'rail', label: 'per rail' },
  { value: 'gate', label: 'per gate' },
  { value: 'linear_foot', label: 'per linear foot' },
  { value: 'sq_ft', label: 'per sq ft' },
  { value: 'piece', label: 'per piece' },
  { value: 'bag', label: 'per bag' },
  { value: 'set', label: 'per set' },
  { value: 'unit', label: 'per unit' }
];

const ConfigureFencingCalculator = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'posts' | 'panels' | 'gates' | 'components'>('posts');
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Default materials with editable state
  const [postDefaults, setPostDefaults] = useState(DEFAULT_POST_MATERIALS);
  const [panelDefaults, setPanelDefaults] = useState(DEFAULT_PANEL_MATERIALS);
  const [gateDefaults, setGateDefaults] = useState(DEFAULT_GATE_MATERIALS);
  const [componentDefaults, setComponentDefaults] = useState(DEFAULT_COMPONENT_MATERIALS);

  // Custom materials (added by user)
  const [customPosts, setCustomPosts] = useState<CustomMaterial[]>([]);
  const [customPanels, setCustomPanels] = useState<CustomMaterial[]>([]);
  const [customGates, setCustomGates] = useState<CustomMaterial[]>([]);
  const [customComponents, setCustomComponents] = useState<CustomMaterial[]>([]);

  // Editing state
  const [editingDefaultIndex, setEditingDefaultIndex] = useState<number | null>(null);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editUnit, setEditUnit] = useState('post');
  const [editUnitSpec, setEditUnitSpec] = useState('');

  // Add material modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newUnit, setNewUnit] = useState('post');
  const [newUnitSpec, setNewUnitSpec] = useState('');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const configResult = await customCalculatorService.getOrCreateConfig('fencing');
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
          const posts = materials.filter(m => m.category === 'posts');
          const panels = materials.filter(m => m.category === 'panels');
          const gates = materials.filter(m => m.category === 'gates');
          const components = materials.filter(m => m.category === 'components');

          // For simplicity, treat all loaded materials as custom for now
          setCustomPosts(posts);
          setCustomPanels(panels);
          setCustomGates(gates);
          setCustomComponents(components);
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
    setEditUnit('post');
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
      const updater = category === 'posts' ? setPostDefaults :
                     category === 'panels' ? setPanelDefaults :
                     category === 'gates' ? setGateDefaults :
                     setComponentDefaults;

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

    const material = [...customPosts, ...customPanels, ...customGates, ...customComponents].find(m => m.id === editingCustomId);

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
      setNewUnit('post');
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
      setPostDefaults(DEFAULT_POST_MATERIALS);
      setPanelDefaults(DEFAULT_PANEL_MATERIALS);
      setGateDefaults(DEFAULT_GATE_MATERIALS);
      setComponentDefaults(DEFAULT_COMPONENT_MATERIALS);
      await loadConfiguration();
    } else {
      alert('Failed to reset configuration');
    }
  };

  const getUnitValue = (label: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.label === label);
    return option?.value || 'post';
  };

  const getUnitLabel = (value: string, spec?: string): string => {
    const option = UNIT_OPTIONS.find(opt => opt.value === value);
    const baseLabel = option?.label || 'per post';
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
      case 'posts': return postDefaults;
      case 'panels': return panelDefaults;
      case 'gates': return gateDefaults;
      case 'components': return componentDefaults;
    }
  };

  const getCurrentCustom = () => {
    switch (activeSection) {
      case 'posts': return customPosts;
      case 'panels': return customPanels;
      case 'gates': return customGates;
      case 'components': return customComponents;
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
            <h1 className="text-2xl font-bold text-gray-900">Configure Fencing Calculator</h1>
            <p className="text-gray-600 mt-1">Customize materials and pricing for your fencing estimates</p>
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
            {(['posts', 'panels', 'gates', 'components'] as const).map((section) => (
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
                  placeholder={activeSection === 'posts' ? 'e.g., Premium Cedar Post' :
                              activeSection === 'panels' ? 'e.g., Custom Wood Panel' :
                              activeSection === 'gates' ? 'e.g., Decorative Iron Gate' :
                              'e.g., Premium Gate Hardware'}
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
                  setNewUnit('post');
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

export default ConfigureFencingCalculator;
