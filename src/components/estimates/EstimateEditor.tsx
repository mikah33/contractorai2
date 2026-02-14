import { useState } from 'react';
import { Plus, Trash2, Image, Settings, Palette, DollarSign, Calendar, User, Briefcase, FileText, Tag, Info, Edit2, Users, X, Package, Wrench, HardHat, MoreHorizontal } from 'lucide-react';
import { Estimate, EstimateItem } from '../../types/estimates';
import { supabase } from '../../lib/supabase';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { useClientsStore } from '../../stores/clientsStore';
import useProjectStore from '../../stores/projectStore';

interface EstimateEditorProps {
  estimate: Estimate;
  onUpdateEstimate: (estimate: Estimate) => void;
  onAddItem: (item: EstimateItem) => void;
  onUpdateItem: (index: number, item: EstimateItem) => void;
  onRemoveItem: (index: number) => void;
  onLogoUpload: () => void;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

const EstimateEditor: React.FC<EstimateEditorProps> = ({
  estimate,
  onUpdateEstimate,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onLogoUpload,
  clients,
  projects
}) => {
  const { profile } = useData();
  const navigate = useNavigate();
  const { addClient } = useClientsStore();
  const { addProject } = useProjectStore();
  // Early return if no estimate provided
  if (!estimate) {
    return <div className="p-6 text-center text-gray-400">No estimate data available</div>;
  }
  
  // Ensure estimate has all required properties with defaults
  const safeEstimate = {
    ...estimate,
    items: estimate.items || [],
    branding: estimate.branding || {
      logo: '',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      fontFamily: 'Inter, sans-serif'
    },
    customFields: estimate.customFields || {},
    createdAt: estimate.createdAt || new Date().toISOString(),
    expiresAt: estimate.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    taxRate: estimate.taxRate || 0,
    taxAmount: estimate.taxAmount || 0,
    subtotal: estimate.subtotal || 0,
    total: estimate.total || 0
  };
  
  const [newItem, setNewItem] = useState<EstimateItem>({
    id: '',
    description: '',
    quantity: 1,
    unit: 'each',
    unitPrice: 0,
    totalPrice: 0,
    type: 'material'
  });

  const [activeSection, setActiveSection] = useState<'details' | 'items' | 'branding' | 'terms'>('details');

  // Quick-create states
  const [showQuickClientForm, setShowQuickClientForm] = useState(false);
  const [showQuickProjectForm, setShowQuickProjectForm] = useState(false);
  const [quickClientData, setQuickClientData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  const [quickProjectData, setQuickProjectData] = useState({
    name: '',
    description: ''
  });
  
  const handleUpdateField = (field: keyof Estimate, value: any) => {
    onUpdateEstimate({
      ...safeEstimate,
      [field]: value
    });
  };

  const handleAddNewItem = () => {
    const itemWithId = {
      ...newItem,
      id: `item-${Date.now()}`,
      totalPrice: newItem.quantity * newItem.unitPrice
    };

    onAddItem(itemWithId);

    // Reset form
    setNewItem({
      id: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unitPrice: 0,
      totalPrice: 0,
      type: 'material'
    });
  };

  const handleQuickAddItem = (type: 'material' | 'labor' | 'equipment' | 'other') => {
    const itemWithId: EstimateItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unit: type === 'labor' ? 'hour' : 'each',
      unitPrice: 0,
      totalPrice: 0,
      type: type
    };

    onAddItem(itemWithId);
  };

  const handleItemChange = (index: number, field: keyof EstimateItem, value: any) => {
    const updatedItem = { ...safeEstimate.items[index], [field]: value };
    
    // Recalculate total price if quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
    }
    
    onUpdateItem(index, updatedItem);
  };

  const handleNewItemChange = (field: keyof EstimateItem, value: any) => {
    const updatedItem = { ...newItem, [field]: value };
    
    // Recalculate total price if quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
    }
    
    setNewItem(updatedItem);
  };

  const handleBrandingChange = (field: keyof Estimate['branding'], value: string) => {
    onUpdateEstimate({
      ...safeEstimate,
      branding: {
        ...safeEstimate.branding,
        [field]: value
      }
    });
  };

  const handleClientChange = (value: string) => {
    if (value === '__CREATE_NEW__') {
      setShowQuickClientForm(true);
    } else {
      handleUpdateField('clientName', value);
      setShowQuickClientForm(false);
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === '__CREATE_NEW__') {
      setShowQuickProjectForm(true);
    } else {
      handleUpdateField('projectId', value);
      setShowQuickProjectForm(false);
    }
  };

  const handleQuickCreateClient = async () => {
    if (!quickClientData.name.trim()) {
      alert('Client name is required');
      return;
    }
    if (!quickClientData.email.trim()) {
      alert('Email is required');
      return;
    }
    if (!quickClientData.phone.trim()) {
      alert('Phone number is required');
      return;
    }

    try {
      console.log('🟢 Creating client with data:', quickClientData);
      await addClient({
        name: quickClientData.name,
        email: quickClientData.email,
        phone: quickClientData.phone,
        company: quickClientData.company,
        status: 'active'
      });
      console.log('🟢 Client created successfully!');

      // Update estimate with new client name
      handleUpdateField('clientName', quickClientData.name);

      // Reset and close form
      setQuickClientData({ name: '', email: '', phone: '', company: '' });
      setShowQuickClientForm(false);
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleQuickCreateProject = async () => {
    if (!quickProjectData.name.trim()) {
      alert('Project name is required');
      return;
    }

    if (!safeEstimate.clientName) {
      alert('Please select a client first before creating a project');
      return;
    }

    try {
      await addProject({
        name: quickProjectData.name,
        client: safeEstimate.clientName,
        description: quickProjectData.description,
        status: 'active',
        priority: 'medium',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 0
      });

      // Note: We can't immediately update projectId without fetching the new project
      // The projects list will refresh and user can select it
      alert('Project created successfully! Please select it from the dropdown.');

      // Reset and close form
      setQuickProjectData({ name: '', description: '' });
      setShowQuickProjectForm(false);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleAutoPopulateLabor = async () => {
    if (!safeEstimate.projectId) {
      alert('Please select a project first to auto-populate labor costs.');
      return;
    }

    try {
      // Fetch team members for this project
      const { data: teamMembers, error } = await supabase
        .from('project_team_members')
        .select('member_name, member_email, role, hourly_rate')
        .eq('project_id', safeEstimate.projectId);

      if (error) {
        console.error('Error fetching team members:', error);
        alert('Failed to fetch team members. Please try again.');
        return;
      }

      if (!teamMembers || teamMembers.length === 0) {
        alert('No team members found for this project. Add team members to the project first.');
        return;
      }

      // Create labor items for each team member
      teamMembers.forEach(member => {
        const laborItem: EstimateItem = {
          id: `labor-${Date.now()}-${Math.random()}`,
          description: `${member.member_name}${member.role ? ` (${member.role})` : ''}`,
          quantity: 0, // User will fill in hours
          unit: 'hour',
          unitPrice: member.hourly_rate || 0,
          totalPrice: 0,
          type: 'labor',
          notes: member.member_email ? `Contact: ${member.member_email}` : undefined
        };
        onAddItem(laborItem);
      });

      alert(`Added ${teamMembers.length} team member(s) to labor section. Enter hours for each.`);
    } catch (error) {
      console.error('Error auto-populating labor:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-gray-700/50">
      {/* Mobile-optimized header with horizontal scroll tabs */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Edit Estimate</h3>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setActiveSection('details')}
            className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
              activeSection === 'details'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-800 text-gray-300 active:bg-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveSection('items')}
            className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
              activeSection === 'items'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-800 text-gray-300 active:bg-gray-700'
            }`}
          >
            Line Items
          </button>
          <button
            onClick={() => setActiveSection('branding')}
            className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
              activeSection === 'branding'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-800 text-gray-300 active:bg-gray-700'
            }`}
          >
            Branding
          </button>
          <button
            onClick={() => setActiveSection('terms')}
            className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
              activeSection === 'terms'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-800 text-gray-300 active:bg-gray-700'
            }`}
          >
            Terms & Notes
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeSection === 'details' && (
          <div className="space-y-4">
            {/* Estimate Title */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Estimate Title</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={safeEstimate.title || ''}
                  onChange={(e) => handleUpdateField('title', e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 text-sm text-white border border-gray-600 rounded-xl bg-[#252542] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-500"
                  placeholder="Enter estimate title"
                />
              </div>
            </div>

            {/* Client & Project - Compact Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Client</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <select
                    value={showQuickClientForm ? '__CREATE_NEW__' : (safeEstimate.clientName || '')}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 text-sm text-white border border-gray-600 rounded-xl bg-[#252542] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="">Select</option>
                    <option value="__CREATE_NEW__">+ New</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.name}>{client.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Project</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <select
                    value={showQuickProjectForm ? '__CREATE_NEW__' : (safeEstimate.projectId || '')}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 text-sm text-white border border-gray-600 rounded-xl bg-[#252542] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none disabled:opacity-50"
                    disabled={!safeEstimate.clientName}
                  >
                    <option value="">Select</option>
                    <option value="__CREATE_NEW__">+ New</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                {!safeEstimate.clientName && (
                  <p className="mt-1 text-xs text-gray-500">Select client first</p>
                )}
              </div>
            </div>

            {/* Quick Create Client Form */}
            {showQuickClientForm && (
              <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-blue-300">New Client</h4>
                  <button onClick={() => { setShowQuickClientForm(false); setQuickClientData({ name: '', email: '', phone: '', company: '' }); }} className="text-blue-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <input type="text" placeholder="Name *" value={quickClientData.name} onChange={(e) => setQuickClientData({ ...quickClientData, name: e.target.value })} className="block w-full px-3 py-2 text-sm text-white bg-[#252542] border border-gray-600 rounded-lg placeholder-gray-500" />
                  <input type="email" placeholder="Email *" value={quickClientData.email} onChange={(e) => setQuickClientData({ ...quickClientData, email: e.target.value })} className="block w-full px-3 py-2 text-sm text-white bg-[#252542] border border-gray-600 rounded-lg placeholder-gray-500" />
                  <input type="tel" placeholder="Phone *" value={quickClientData.phone} onChange={(e) => setQuickClientData({ ...quickClientData, phone: e.target.value })} className="block w-full px-3 py-2 text-sm text-white bg-[#252542] border border-gray-600 rounded-lg placeholder-gray-500" />
                  <button onClick={handleQuickCreateClient} disabled={!quickClientData.name.trim() || !quickClientData.email.trim() || !quickClientData.phone.trim()} className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:bg-gray-600 disabled:text-gray-400">Create</button>
                </div>
              </div>
            )}

            {/* Quick Create Project Form */}
            {showQuickProjectForm && (
              <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-blue-300">New Project</h4>
                  <button onClick={() => { setShowQuickProjectForm(false); setQuickProjectData({ name: '', description: '' }); }} className="text-blue-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <input type="text" placeholder="Project Name *" value={quickProjectData.name} onChange={(e) => setQuickProjectData({ ...quickProjectData, name: e.target.value })} className="block w-full px-3 py-2 text-sm text-white bg-[#252542] border border-gray-600 rounded-lg placeholder-gray-500" />
                  <p className="text-xs text-blue-400">For: <strong>{safeEstimate.clientName}</strong></p>
                  <button onClick={handleQuickCreateProject} disabled={!quickProjectData.name.trim()} className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:bg-gray-600 disabled:text-gray-400">Create</button>
                </div>
              </div>
            )}

            {/* Dates - Side by Side with Icons */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Created</label>
                <div className="flex items-center border border-gray-600 rounded-xl bg-[#252542] overflow-hidden">
                  <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    type="date"
                    value={safeEstimate.createdAt ? safeEstimate.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleUpdateField('createdAt', e.target.value)}
                    className="flex-1 min-w-0 py-2.5 pr-2 text-sm text-white bg-transparent border-0 focus:ring-0 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Expires</label>
                <div className="flex items-center border border-gray-600 rounded-xl bg-[#252542] overflow-hidden">
                  <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    type="date"
                    value={safeEstimate.expiresAt ? safeEstimate.expiresAt.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    onChange={(e) => handleUpdateField('expiresAt', e.target.value)}
                    className="flex-1 min-w-0 py-2.5 pr-2 text-sm text-white bg-transparent border-0 focus:ring-0 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            {/* Tax Rate with Icon */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Tax Rate</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={safeEstimate.taxRate || 0}
                  onChange={(e) => handleUpdateField('taxRate', parseFloat(e.target.value) || 0)}
                  className="block w-full pl-9 pr-8 py-2.5 text-sm text-white border border-gray-600 rounded-xl bg-[#252542] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'items' && (
          <div className="space-y-4">
            {/* Line Items - Mobile Card Layout */}
            <div className="space-y-4">
              {safeEstimate.items.map((item, index) => (
                <div key={item.id} className="bg-[#252542] border border-gray-700/50 rounded-2xl p-4">
                  {/* Row 1: Description + Type */}
                  <div className="flex gap-3 mb-3">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="flex-1 min-w-0 px-4 py-3 text-base text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                    />
                    <select
                      value={item.type || 'material'}
                      onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                      className="px-3 py-3 text-sm text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="material">Material</option>
                      <option value="labor">Labor</option>
                      <option value="equipment">Equip</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Row 2: Qty, Unit, Price */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity || 0}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 text-base text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Unit</label>
                      <input
                        type="text"
                        value={item.unit || ''}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="each"
                        className="w-full px-3 py-2.5 text-base text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Unit Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || 0}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2.5 text-base text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Total + Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <div className="text-sm text-gray-400">
                      Line Total
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-green-400">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                      <button
                        onClick={() => onRemoveItem(index)}
                        className="p-2 text-red-400 active:text-red-500 active:bg-red-900/30 rounded-lg"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {safeEstimate.items.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm">No line items yet</p>
                  <p className="text-xs text-gray-500">Use the buttons below to add items</p>
                </div>
              )}
            </div>

            {/* Quick Add Line Item Buttons */}
            <div className="pt-4">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Quick Add</h4>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleQuickAddItem('material')}
                  className="flex flex-col items-center justify-center p-3 border-2 border-blue-700/50 rounded-xl text-blue-400 bg-blue-900/30 active:bg-blue-900/50"
                >
                  <Package className="h-5 w-5 mb-1" />
                  <span className="text-xs">Material</span>
                </button>

                <button
                  onClick={() => handleQuickAddItem('labor')}
                  className="flex flex-col items-center justify-center p-3 border-2 border-green-700/50 rounded-xl text-green-400 bg-green-900/30 active:bg-green-900/50"
                >
                  <HardHat className="h-5 w-5 mb-1" />
                  <span className="text-xs">Labor</span>
                </button>

                <button
                  onClick={() => handleQuickAddItem('equipment')}
                  className="flex flex-col items-center justify-center p-3 border-2 border-blue-700/50 rounded-xl text-blue-400 bg-orange-900/30 active:bg-orange-900/50"
                >
                  <Wrench className="h-5 w-5 mb-1" />
                  <span className="text-xs">Equip</span>
                </button>

                <button
                  onClick={() => handleQuickAddItem('other')}
                  className="flex flex-col items-center justify-center p-3 border-2 border-gray-600 rounded-xl text-gray-300 bg-gray-800 active:bg-gray-700"
                >
                  <MoreHorizontal className="h-5 w-5 mb-1" />
                  <span className="text-xs">Other</span>
                </button>
              </div>
            </div>

            {/* Totals Section */}
            <div className="bg-[#252542] border border-gray-700/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-medium text-white">${safeEstimate.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tax ({safeEstimate.taxRate}%)</span>
                <span className="font-medium text-white">${safeEstimate.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-gray-700/50">
                <span className="font-semibold text-white">Total</span>
                <span className="font-bold text-green-400">${safeEstimate.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Auto-populate labor button */}
            {safeEstimate.projectId && (
              <button
                onClick={handleAutoPopulateLabor}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-300 bg-[#252542] border border-gray-600 rounded-xl active:bg-gray-700"
              >
                <Users className="h-4 w-4" />
                Add employees for labor cost
              </button>
            )}
          </div>
        )}


        {activeSection === 'branding' && (
          <div className="space-y-4">
            {/* Company Logo Card */}
            <div className="bg-[#252542] border border-gray-700/50 rounded-2xl p-4">
              <label className="block text-xs text-gray-400 mb-2">Company Logo</label>
              {profile?.logo_url ? (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border border-gray-600 rounded-xl bg-[#1a1a2e] flex items-center justify-center overflow-hidden">
                    <img
                      src={profile.logo_url}
                      alt="Company Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-2">This logo will appear on all your estimates.</p>
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-sm text-blue-400 font-medium"
                    >
                      Change in Settings
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-600 rounded-xl bg-[#1a1a2e] flex items-center justify-center">
                    <Image className="h-8 w-8 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-2">No logo uploaded yet</p>
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-sm text-blue-400 font-medium"
                    >
                      Upload in Settings
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Font Family */}
            <div className="bg-[#252542] border border-gray-700/50 rounded-2xl p-4">
              <label className="block text-xs text-gray-400 mb-2">Font Family</label>
              <select
                value={safeEstimate.branding.fontFamily || 'Inter, sans-serif'}
                onChange={(e) => handleBrandingChange('fontFamily', e.target.value)}
                className="w-full px-4 py-3 text-base text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Inter, sans-serif">Inter</option>
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="Poppins, sans-serif">Poppins</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia</option>
              </select>
            </div>

            {/* Colors */}
            <div className="bg-[#252542] border border-gray-700/50 rounded-2xl p-4">
              <label className="block text-xs text-gray-400 mb-3">Brand Colors</label>

              {/* Primary Color */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl border border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: safeEstimate.branding.primaryColor }}
                />
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Primary</label>
                  <select
                    value={safeEstimate.branding.primaryColor || '#3b82f6'}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    className="w-full px-3 py-2.5 text-base text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="#3b82f6">Blue</option>
                    <option value="#ef4444">Red</option>
                    <option value="#10b981">Green</option>
                    <option value="#f59e0b">Orange</option>
                    <option value="#8b5cf6">Purple</option>
                    <option value="#ec4899">Pink</option>
                    <option value="#14b8a6">Teal</option>
                    <option value="#6366f1">Indigo</option>
                    <option value="#64748b">Slate</option>
                    <option value="#000000">Black</option>
                  </select>
                </div>
              </div>

              {/* Secondary Color */}
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl border border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: safeEstimate.branding.secondaryColor }}
                />
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Secondary</label>
                  <select
                    value={safeEstimate.branding.secondaryColor || '#1e40af'}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    className="w-full px-3 py-2.5 text-base text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="#1e40af">Dark Blue</option>
                    <option value="#b91c1c">Dark Red</option>
                    <option value="#047857">Dark Green</option>
                    <option value="#d97706">Dark Orange</option>
                    <option value="#6d28d9">Dark Purple</option>
                    <option value="#4338ca">Dark Indigo</option>
                    <option value="#475569">Dark Slate</option>
                    <option value="#111827">Almost Black</option>
                    <option value="#000000">Black</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Branding Tips */}
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-300 mb-1">Branding Tips</h4>
                  <p className="text-xs text-blue-400">Use your company logo and colors for professional, consistent estimates that build brand recognition.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'terms' && (
          <div className="space-y-4">
            {/* Terms & Conditions */}
            <div className="bg-[#252542] border border-gray-700/50 rounded-2xl p-4">
              <label className="block text-xs text-gray-400 mb-2">Terms & Conditions</label>
              <textarea
                rows={5}
                value={safeEstimate.terms || ''}
                onChange={(e) => handleUpdateField('terms', e.target.value)}
                className="w-full px-4 py-3 text-base text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-500"
                placeholder="Enter terms and conditions..."
              />
            </div>

            {/* Notes */}
            <div className="bg-[#252542] border border-gray-700/50 rounded-2xl p-4">
              <label className="block text-xs text-gray-400 mb-2">Notes</label>
              <textarea
                rows={5}
                value={safeEstimate.notes || ''}
                onChange={(e) => handleUpdateField('notes', e.target.value)}
                className="w-full px-4 py-3 text-base text-white border border-gray-600 rounded-xl bg-[#1a1a2e] focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-500"
                placeholder="Enter additional notes for the customer..."
              />
            </div>

            {/* Info Card */}
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-300 mb-1">Default Terms</h4>
                  <p className="text-xs text-blue-400 mb-2">Set default terms in Settings to auto-fill new estimates.</p>
                  <button
                    onClick={() => navigate('/settings')}
                    className="text-xs text-blue-400 font-medium"
                  >
                    Edit in Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimateEditor;