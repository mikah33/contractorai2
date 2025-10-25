import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Archive, Trash2, Save, RotateCcw, Loader2, Edit2, Check, X } from 'lucide-react';
import { customCalculatorService } from '../services/customCalculatorService';
import { CustomMaterial, CustomPricing } from '../types/custom-calculator';

// Default values extracted from DeckCalculator.tsx
const DEFAULT_DECKING_TYPES = [
  { id: '5/4-deck', name: '5/4" Deck Board', width: 5.5, spacing: 0.125, price: { '12': 15.98, '16': 21.98, '20': 27.98 } },
  { id: '2x6-pt', name: '2x6 PT Lumber', width: 5.5, spacing: 0.25, price: { '12': 12.98, '16': 17.98, '20': 22.98 } },
  { id: 'trex-enhance-basic', name: 'Trex Enhance Basic', width: 5.5, spacing: 0.25, price: { '12': 29.28, '16': 39.04, '20': 48.80 } },
  { id: 'trex-enhance-natural', name: 'Trex Enhance Natural', width: 5.5, spacing: 0.25, price: { '12': 40.92, '16': 54.56, '20': 68.20 } },
  { id: 'trex-select', name: 'Trex Select', width: 5.5, spacing: 0.25, price: { '12': 54.24, '16': 72.32, '20': 90.40 } },
  { id: 'trex-transcend', name: 'Trex Transcend', width: 5.5, spacing: 0.25, price: { '12': 81.60, '16': 108.80, '20': 136.00 } },
  { id: 'trex-lineage', name: 'Trex Lineage', width: 5.5, spacing: 0.25, price: { '12': 93.84, '16': 125.12, '20': 156.40 } },
  { id: 'deckorators-voyage', name: 'Deckorators Voyage', width: 5.5, spacing: 0.25, price: { '12': 84.00, '16': 112.00, '20': 140.00 } },
  { id: 'deckorators-vault', name: 'Deckorators Vault', width: 5.5, spacing: 0.25, price: { '12': 71.25, '16': 95.00, '20': 118.75 } },
  { id: 'deckorators-summit', name: 'Deckorators Summit', width: 5.5, spacing: 0.25, price: { '12': 63.75, '16': 85.00, '20': 106.25 } }
];

const DEFAULT_JOIST_SIZES = [
  { size: '2x6', price: { '12': 12.98, '16': 17.98, '20': 22.98 } },
  { size: '2x8', price: { '12': 17.98, '16': 23.98, '20': 29.98 } },
  { size: '2x10', price: { '12': 24.98, '16': 32.98, '20': 41.98 } },
  { size: '2x12', price: { '12': 32.98, '16': 43.98, '20': 54.98 } }
];

const DEFAULT_FASCIA_TYPES = [
  { id: 'pt', name: 'Pressure Treated', price: { '2x6': 12.98, '2x8': 17.98, '2x10': 24.98, '2x12': 32.98 } },
  { id: 'azek', name: 'Azek PVC', price: { '2x6': 45.98, '2x8': 59.98, '2x10': 79.98, '2x12': 99.98 } },
  { id: 'metal', name: 'Metal Stock', price: { '2x6': 29.98, '2x8': 39.98, '2x10': 49.98, '2x12': 59.98 } }
];

const DEFAULT_RAILING_TYPES = [
  { id: 'pt', name: 'Pressure Treated', pricePerFoot: 12.98, postPrice: 24.98 },
  { id: 'trex', name: 'Trex Composite', pricePerFoot: 45.98, postPrice: 89.98 }
];

const DEFAULT_HARDWARE = {
  joist_hanger: 1.98,
  hurricane_tie: 1.25,
  deck_screws: 39.98,
  concrete: 6.98,
  post_base: 12.98,
  triple_beam_per_ft: 16.00,
  post_4x4_per_ft: 6.00,
  post_6x6_per_ft: 9.00,
  ledger_2x6_per_ft: 1.75,
  ledger_2x8_per_ft: 2.00,
  ledger_2x10_per_ft: 2.32,
  ledger_2x12_per_ft: 2.89
};

const ConfigureDeckCalculator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  // Materials state
  const [deckBoards, setDeckBoards] = useState<CustomMaterial[]>([]);
  const [joists, setJoists] = useState<CustomMaterial[]>([]);
  const [fascia, setFascia] = useState<CustomMaterial[]>([]);
  const [railings, setRailings] = useState<CustomMaterial[]>([]);

  // Pricing overrides state
  const [hardwarePricing, setHardwarePricing] = useState(DEFAULT_HARDWARE);

  // UI state
  const [activeSection, setActiveSection] = useState<'deck-boards' | 'framing' | 'railings' | 'fascia' | 'posts' | 'hardware'>('deck-boards');
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<CustomMaterial | null>(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      // Get or create config
      const configResult = await customCalculatorService.getOrCreateConfig('deck');
      if (!configResult.success || !configResult.data) {
        throw new Error('Failed to load configuration');
      }

      const config = configResult.data;
      setConfigId(config.id);

      // Check if this is first time (not configured yet)
      if (!config.is_configured) {
        // Clone defaults
        await cloneDefaults(config.id);
      } else {
        // Load existing custom materials and pricing
        await loadCustomData(config.id);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      alert('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const cloneDefaults = async (configId: string) => {
    try {
      // Clone deck boards
      for (const board of DEFAULT_DECKING_TYPES) {
        await customCalculatorService.addMaterial(configId, {
          category: 'deck_boards',
          name: board.name,
          price: board.price['16'], // Default to 16ft price
          unit: 'per 16ft board'
        });
      }

      // Clone joists
      for (const joist of DEFAULT_JOIST_SIZES) {
        await customCalculatorService.addMaterial(configId, {
          category: 'joists',
          name: `${joist.size} Joist`,
          price: joist.price['16'],
          unit: 'per 16ft board'
        });
      }

      // Clone fascia
      for (const fasc of DEFAULT_FASCIA_TYPES) {
        await customCalculatorService.addMaterial(configId, {
          category: 'fascia',
          name: fasc.name,
          price: fasc.price['2x10'],
          unit: 'per 16ft board'
        });
      }

      // Clone railings
      for (const railing of DEFAULT_RAILING_TYPES) {
        await customCalculatorService.addMaterial(configId, {
          category: 'railings',
          name: railing.name,
          price: railing.pricePerFoot,
          unit: 'per linear foot'
        });
      }

      // Save hardware pricing
      for (const [key, value] of Object.entries(DEFAULT_HARDWARE)) {
        await customCalculatorService.updatePricing(configId, key, value);
      }

      // Mark as configured
      await customCalculatorService.markAsConfigured(configId);

      // Reload data
      await loadCustomData(configId);
    } catch (error) {
      console.error('Error cloning defaults:', error);
      alert('Failed to clone default values');
    }
  };

  const loadCustomData = async (configId: string) => {
    try {
      const materialsResult = await customCalculatorService.getMaterials(configId);
      if (materialsResult.success && materialsResult.data) {
        const materials = materialsResult.data;
        setDeckBoards(materials.filter(m => m.category === 'deck_boards'));
        setJoists(materials.filter(m => m.category === 'joists'));
        setFascia(materials.filter(m => m.category === 'fascia'));
        setRailings(materials.filter(m => m.category === 'railings'));
      }

      const pricingResult = await customCalculatorService.getPricingOverrides(configId);
      if (pricingResult.success && pricingResult.data) {
        const pricing: any = { ...DEFAULT_HARDWARE };
        pricingResult.data.forEach(p => {
          pricing[p.component_key] = p.value;
        });
        setHardwarePricing(pricing);
      }
    } catch (error) {
      console.error('Error loading custom data:', error);
    }
  };

  const handleSave = async () => {
    if (!configId) return;

    setSaving(true);
    try {
      // All changes are saved in real-time via the service
      // This just provides user feedback
      alert('✅ Configuration saved successfully!');
      navigate('/pricing');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!configId) return;

    if (!confirm('Are you sure you want to reset to default values? This will delete all your custom materials and pricing.')) {
      return;
    }

    setLoading(true);
    try {
      // Delete all custom materials
      const materialsResult = await customCalculatorService.getMaterials(configId);
      if (materialsResult.success && materialsResult.data) {
        for (const material of materialsResult.data) {
          await customCalculatorService.deleteMaterial(material.id);
        }
      }

      // Reclone defaults
      await cloneDefaults(configId);
    } catch (error) {
      console.error('Error resetting:', error);
      alert('Failed to reset configuration');
    } finally {
      setLoading(false);
    }
  };

  const renderMaterialList = (materials: CustomMaterial[], category: string) => {
    const activeMaterials = materials.filter(m => !m.is_archived);
    const archivedMaterials = materials.filter(m => m.is_archived);

    return (
      <div className="space-y-4">
        {/* Add Material Button - At Top */}
        <button
          onClick={() => setShowAddMaterial(true)}
          className="w-full py-3 sm:py-3 px-4 border-2 border-dashed border-blue-300 rounded-md text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium text-base sm:text-sm"
        >
          <Plus className="w-5 h-5" />
          Add Custom Material
        </button>

        {/* Active Materials */}
        <div>
          <h4 className="text-sm sm:text-sm font-medium text-gray-700 mb-3">Your Materials</h4>
          <div className="space-y-2">
            {activeMaterials.map(material => (
              <MaterialRow
                key={material.id}
                material={material}
                onEdit={() => setEditingMaterial(material)}
                onArchive={async () => {
                  await customCalculatorService.archiveMaterial(material.id);
                  await loadCustomData(configId!);
                }}
                onDelete={async () => {
                  if (confirm('Delete this material permanently?')) {
                    await customCalculatorService.deleteMaterial(material.id);
                    await loadCustomData(configId!);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Archived Materials */}
        {archivedMaterials.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <details className="group">
              <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Archived Materials ({archivedMaterials.length})
              </summary>
              <div className="mt-3 space-y-2 ml-6">
                {archivedMaterials.map(material => (
                  <div key={material.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span className="text-gray-500">{material.name}</span>
                    <button
                      onClick={async () => {
                        await customCalculatorService.unarchiveMaterial(material.id);
                        await loadCustomData(configId!);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Calculators</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configure Decking Calculator</h1>
              <p className="text-sm text-gray-600 mt-1 hidden sm:block">Customize materials and pricing for your deck projects</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2 font-medium text-base sm:text-sm"
              >
                <RotateCcw className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Reset to Defaults</span>
                <span className="sm:hidden">Reset</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-base sm:text-sm"
              >
                {saving ? <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-5 h-5 sm:w-4 sm:h-4" />}
                {saving ? 'Saving...' : 'Save & Close'}
              </button>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max" aria-label="Tabs">
              {[
                { id: 'deck-boards', label: 'Deck Boards', shortLabel: 'Boards' },
                { id: 'framing', label: 'Framing', shortLabel: 'Framing' },
                { id: 'railings', label: 'Railings', shortLabel: 'Rails' },
                { id: 'fascia', label: 'Fascia', shortLabel: 'Fascia' },
                { id: 'hardware', label: 'Hardware & Pricing', shortLabel: 'Hardware' }
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="hidden sm:inline">{section.label}</span>
                  <span className="sm:hidden">{section.shortLabel}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Section Content */}
          <div className="p-4 sm:p-6">
            {activeSection === 'deck-boards' && renderMaterialList(deckBoards, 'deck_boards')}
            {activeSection === 'framing' && renderMaterialList(joists, 'joists')}
            {activeSection === 'railings' && renderMaterialList(railings, 'railings')}
            {activeSection === 'fascia' && renderMaterialList(fascia, 'fascia')}
            {activeSection === 'hardware' && (
              <HardwarePricingSection
                pricing={hardwarePricing}
                configId={configId!}
                onUpdate={async (key, value) => {
                  await customCalculatorService.updatePricing(configId!, key, value);
                  setHardwarePricing(prev => ({ ...prev, [key]: value }));
                }}
              />
            )}
          </div>
        </div>

        {/* Add Material Modal */}
        {showAddMaterial && (
          <AddMaterialModal
            category={activeSection}
            configId={configId!}
            onClose={() => setShowAddMaterial(false)}
            onAdd={async () => {
              await loadCustomData(configId!);
              setShowAddMaterial(false);
            }}
          />
        )}

        {/* Edit Material Modal */}
        {editingMaterial && (
          <EditMaterialModal
            material={editingMaterial}
            onClose={() => setEditingMaterial(null)}
            onSave={async (updates) => {
              await customCalculatorService.updateMaterial(editingMaterial.id, updates);
              await loadCustomData(configId!);
              setEditingMaterial(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Add Material Modal Component
interface AddMaterialModalProps {
  category: string;
  configId: string;
  onClose: () => void;
  onAdd: () => Promise<void>;
}

const AddMaterialModal = ({ category, configId, onClose, onAdd }: AddMaterialModalProps) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [unit, setUnit] = useState('each');
  const [saving, setSaving] = useState(false);

  const getCategoryName = () => {
    switch (category) {
      case 'deck-boards': return 'deck_boards';
      case 'framing': return 'joists';
      case 'railings': return 'railings';
      case 'fascia': return 'fascia';
      default: return 'deck_boards';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || typeof price !== 'number') return;

    setSaving(true);
    try {
      await customCalculatorService.addMaterial(configId, {
        category: getCategoryName(),
        name,
        price,
        unit
      });
      await onAdd();
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Material</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="material-name" className="block text-sm font-medium text-gray-700 mb-1">
              Material Name
            </label>
            <input
              id="material-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Custom Composite Board"
              required
            />
          </div>

          <div>
            <label htmlFor="material-price" className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="material-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="material-unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              id="material-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="each">Each</option>
              <option value="per linear foot">Per Linear Foot</option>
              <option value="per square foot">Per Square Foot</option>
              <option value="per 12ft board">Per 12ft Board</option>
              <option value="per 16ft board">Per 16ft Board</option>
              <option value="per 20ft board">Per 20ft Board</option>
              <option value="per box">Per Box</option>
              <option value="per bag">Per Bag</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || typeof price !== 'number'}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Material
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Material Modal Component
interface EditMaterialModalProps {
  material: CustomMaterial;
  onClose: () => void;
  onSave: (updates: Partial<CustomMaterial>) => Promise<void>;
}

const EditMaterialModal = ({ material, onClose, onSave }: EditMaterialModalProps) => {
  const [name, setName] = useState(material.name);
  const [price, setPrice] = useState<number>(material.price);
  const [unit, setUnit] = useState(material.unit);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || typeof price !== 'number') return;

    setSaving(true);
    try {
      await onSave({ name, price, unit });
    } catch (error) {
      console.error('Error updating material:', error);
      alert('Failed to update material');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Material</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-material-name" className="block text-sm font-medium text-gray-700 mb-1">
              Material Name
            </label>
            <input
              id="edit-material-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Custom Composite Board"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-material-price" className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="edit-material-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-material-unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              id="edit-material-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="each">Each</option>
              <option value="per linear foot">Per Linear Foot</option>
              <option value="per square foot">Per Square Foot</option>
              <option value="per 12ft board">Per 12ft Board</option>
              <option value="per 16ft board">Per 16ft Board</option>
              <option value="per 20ft board">Per 20ft Board</option>
              <option value="per box">Per Box</option>
              <option value="per bag">Per Bag</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || typeof price !== 'number'}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Material Row Component
interface MaterialRowProps {
  material: CustomMaterial;
  onEdit: () => void;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const MaterialRow = ({ material, onEdit, onArchive, onDelete }: MaterialRowProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-gray-200 rounded-md hover:border-gray-300 transition-colors gap-3 sm:gap-0">
      <div className="flex-1">
        <p className="font-medium text-gray-900 text-sm sm:text-base">{material.name}</p>
        <p className="text-sm text-gray-500">${material.price.toFixed(2)} {material.unit}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex-1 sm:flex-none p-2 sm:p-2 text-blue-600 hover:bg-blue-50 rounded text-sm sm:text-base"
          title="Edit"
        >
          <Edit2 className="w-5 h-5 sm:w-4 sm:h-4 mx-auto" />
        </button>
        <button
          onClick={onArchive}
          className="flex-1 sm:flex-none p-2 sm:p-2 text-gray-600 hover:bg-gray-100 rounded text-sm sm:text-base"
          title="Archive"
        >
          <Archive className="w-5 h-5 sm:w-4 sm:h-4 mx-auto" />
        </button>
        <button
          onClick={onDelete}
          className="flex-1 sm:flex-none p-2 sm:p-2 text-red-600 hover:bg-red-50 rounded text-sm sm:text-base"
          title="Delete"
        >
          <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 mx-auto" />
        </button>
      </div>
    </div>
  );
};

// Hardware Pricing Section Component
interface HardwarePricingSectionProps {
  pricing: typeof DEFAULT_HARDWARE;
  configId: string;
  onUpdate: (key: string, value: number) => Promise<void>;
}

const HardwarePricingSection = ({ pricing, configId, onUpdate }: HardwarePricingSectionProps) => {
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [editingComponent, setEditingComponent] = useState<{ key: string; label: string; unit: string; price: number } | null>(null);
  const [customComponents, setCustomComponents] = useState<Array<{ key: string; label: string; unit: string }>>([]);

  useEffect(() => {
    loadCustomComponents();
  }, [pricing]);

  const loadCustomComponents = () => {
    // Find keys in pricing that aren't in default hardware
    const defaultKeys = Object.keys(DEFAULT_HARDWARE);
    const allKeys = Object.keys(pricing);
    const custom = allKeys
      .filter(key => !defaultKeys.includes(key))
      .map(key => ({
        key,
        label: formatLabel(key),
        unit: 'each' // Default unit for custom components
      }));
    setCustomComponents(custom);
  };

  const formatLabel = (key: string) => {
    // Convert snake_case to Title Case
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleDeleteComponent = async (key: string) => {
    if (!confirm(`Delete ${formatLabel(key)}?`)) return;

    try {
      // Delete from database by setting value to 0 or removing the pricing override
      const { data: pricingOverrides } = await customCalculatorService.getPricingOverrides(configId);
      if (pricingOverrides) {
        const override = pricingOverrides.find(p => p.component_key === key);
        if (override) {
          // We need to add a delete method to the service
          // For now, we'll just reload
          await loadCustomComponents();
        }
      }
    } catch (error) {
      console.error('Error deleting component:', error);
    }
  };

  const defaultHardwareItems = [
    { key: 'joist_hanger', label: 'Joist Hanger', unit: 'each', isDefault: true },
    { key: 'hurricane_tie', label: 'Hurricane Tie', unit: 'each', isDefault: true },
    { key: 'deck_screws', label: 'Deck Screws', unit: 'per box', isDefault: true },
    { key: 'concrete', label: 'Concrete', unit: 'per bag', isDefault: true },
    { key: 'post_base', label: 'Post Base', unit: 'each', isDefault: true },
    { key: 'triple_beam_per_ft', label: 'Triple Beam', unit: 'per linear foot', isDefault: true },
    { key: 'post_4x4_per_ft', label: '4x4 Post', unit: 'per linear foot', isDefault: true },
    { key: 'post_6x6_per_ft', label: '6x6 Post', unit: 'per linear foot', isDefault: true },
    { key: 'ledger_2x6_per_ft', label: 'Ledger Board 2x6', unit: 'per linear foot', isDefault: true },
    { key: 'ledger_2x8_per_ft', label: 'Ledger Board 2x8', unit: 'per linear foot', isDefault: true },
    { key: 'ledger_2x10_per_ft', label: 'Ledger Board 2x10', unit: 'per linear foot', isDefault: true },
    { key: 'ledger_2x12_per_ft', label: 'Ledger Board 2x12', unit: 'per linear foot', isDefault: true }
  ];

  const allItems = [...defaultHardwareItems, ...customComponents.map(c => ({ ...c, isDefault: false }))];

  return (
    <div className="space-y-4">
      {/* Add Component Button - At Top */}
      <button
        onClick={() => setShowAddComponent(true)}
        className="w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-md text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="w-5 h-5" />
        Add Custom Hardware Component
      </button>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Hardware & Component Pricing</h4>
        <div className="space-y-2">
          {allItems.map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:border-gray-300 transition-colors">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.unit}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">${(pricing[item.key as keyof typeof pricing] || 0).toFixed(2)}</span>
                <button
                  onClick={() => setEditingComponent({
                    key: item.key,
                    label: item.label,
                    unit: item.unit,
                    price: pricing[item.key as keyof typeof pricing] || 0
                  })}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {!item.isDefault && (
                  <button
                    onClick={() => handleDeleteComponent(item.key)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Component Modal */}
      {showAddComponent && (
        <AddHardwareComponentModal
          configId={configId}
          onClose={() => setShowAddComponent(false)}
          onAdd={async (key: string, value: number) => {
            await onUpdate(key, value);
            setShowAddComponent(false);
            loadCustomComponents();
          }}
        />
      )}

      {/* Edit Component Modal */}
      {editingComponent && (
        <EditHardwareComponentModal
          component={editingComponent}
          onClose={() => setEditingComponent(null)}
          onSave={async (key: string, value: number) => {
            await onUpdate(key, value);
            setEditingComponent(null);
            loadCustomComponents();
          }}
        />
      )}
    </div>
  );
};

// Add Hardware Component Modal
interface AddHardwareComponentModalProps {
  configId: string;
  onClose: () => void;
  onAdd: (key: string, value: number) => Promise<void>;
}

const AddHardwareComponentModal = ({ configId, onClose, onAdd }: AddHardwareComponentModalProps) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [unit, setUnit] = useState('each');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || typeof price !== 'number') return;

    setSaving(true);
    try {
      // Convert name to snake_case for key
      const key = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      await onAdd(key, price);
    } catch (error) {
      console.error('Error adding component:', error);
      alert('Failed to add hardware component');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Hardware Component</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="component-name" className="block text-sm font-medium text-gray-700 mb-1">
              Component Name
            </label>
            <input
              id="component-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Stainless Steel Nails"
              required
            />
          </div>

          <div>
            <label htmlFor="component-price" className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="component-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="component-unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              id="component-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="each">Each</option>
              <option value="per linear foot">Per Linear Foot</option>
              <option value="per square foot">Per Square Foot</option>
              <option value="per box">Per Box</option>
              <option value="per bag">Per Bag</option>
              <option value="per pound">Per Pound</option>
              <option value="per gallon">Per Gallon</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || typeof price !== 'number'}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Component
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Hardware Component Modal
interface EditHardwareComponentModalProps {
  component: { key: string; label: string; unit: string; price: number };
  onClose: () => void;
  onSave: (key: string, value: number) => Promise<void>;
}

const EditHardwareComponentModal = ({ component, onClose, onSave }: EditHardwareComponentModalProps) => {
  const [price, setPrice] = useState<number>(component.price);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof price !== 'number') return;

    setSaving(true);
    try {
      await onSave(component.key, price);
    } catch (error) {
      console.error('Error updating component:', error);
      alert('Failed to update hardware component');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Hardware Component</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Component Name
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
              {component.label}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
              {component.unit}
            </div>
          </div>

          <div>
            <label htmlFor="edit-component-price" className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="edit-component-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || typeof price !== 'number'}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigureDeckCalculator;
