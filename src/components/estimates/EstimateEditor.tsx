import { useState } from 'react';
import { Plus, Trash2, Image, Settings, Palette, DollarSign, Calendar, User, Briefcase, FileText, Tag, Info, Edit2, Users } from 'lucide-react';
import { Estimate, EstimateItem } from '../../types/estimates';
import { supabase } from '../../lib/supabase';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';

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
  // Early return if no estimate provided
  if (!estimate) {
    return <div className="p-6 text-center text-gray-500">No estimate data available</div>;
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
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Edit Estimate</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveSection('details')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                activeSection === 'details'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveSection('items')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                activeSection === 'items'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Line Items
            </button>
            <button
              onClick={() => setActiveSection('branding')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                activeSection === 'branding'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Branding
            </button>
            <button
              onClick={() => setActiveSection('terms')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                activeSection === 'terms'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Terms & Notes
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeSection === 'details' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Estimate Title</label>
              <input
                type="text"
                value={safeEstimate.title}
                onChange={(e) => handleUpdateField('title', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={safeEstimate.clientName || ''}
                    onChange={(e) => handleUpdateField('clientName', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.name}>{client.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Project</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={safeEstimate.projectId}
                    onChange={(e) => handleUpdateField('projectId', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Created Date</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={safeEstimate.createdAt ? safeEstimate.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleUpdateField('createdAt', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={safeEstimate.expiresAt ? safeEstimate.expiresAt.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    onChange={(e) => handleUpdateField('expiresAt', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={safeEstimate.taxRate}
                  onChange={(e) => handleUpdateField('taxRate', parseFloat(e.target.value))}
                  className="block w-full px-3 py-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'items' && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {safeEstimate.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={item.type}
                          onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="material">Material</option>
                          <option value="labor">Labor</option>
                          <option value="equipment">Equipment</option>
                          <option value="other">Other</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                            className="block w-full pl-7 pr-3 py-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => onRemoveItem(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Add new item row */}
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={newItem.description}
                        onChange={(e) => handleNewItemChange('description', e.target.value)}
                        placeholder="Enter description"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={newItem.type}
                        onChange={(e) => handleNewItemChange('type', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="material">Material</option>
                        <option value="labor">Labor</option>
                        <option value="equipment">Equipment</option>
                        <option value="other">Other</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.quantity}
                        onChange={(e) => handleNewItemChange('quantity', parseFloat(e.target.value))}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={newItem.unit}
                        onChange={(e) => handleNewItemChange('unit', e.target.value)}
                        placeholder="each"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newItem.unitPrice}
                          onChange={(e) => handleNewItemChange('unitPrice', parseFloat(e.target.value))}
                          className="block w-full pl-7 pr-3 py-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(newItem.quantity * newItem.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={handleAddNewItem}
                        disabled={!newItem.description || newItem.quantity <= 0 || newItem.unitPrice <= 0}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Auto-populate Labor Button */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleAutoPopulateLabor}
                disabled={!safeEstimate.projectId}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!safeEstimate.projectId ? "Select a project first" : "Add team members as labor items"}
              >
                <Users className="h-5 w-5 mr-2" />
                Auto-populate Labor from Project
              </button>
            </div>

            {/* Totals Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <table className="min-w-full">
                <tfoot>
                  <tr>
                    <td colSpan={5} className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      Subtotal
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                      ${safeEstimate.subtotal.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      Tax ({safeEstimate.taxRate}%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${safeEstimate.taxAmount.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ${safeEstimate.total.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  // Add a section header
                  const sectionHeader: EstimateItem = {
                    id: `item-${Date.now()}`,
                    description: 'New Section',
                    quantity: 0,
                    unit: '',
                    unitPrice: 0,
                    totalPrice: 0,
                    type: 'section'
                  };
                  onAddItem(sectionHeader);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section Header
              </button>
            </div>
          </div>
        )}

        {activeSection === 'branding' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Logo</label>
                <div className="mt-1">
                  {profile?.logo_url ? (
                    <div className="space-y-2">
                      <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 inline-block">
                        <img
                          src={profile.logo_url}
                          alt="Company Logo"
                          className="h-24 w-auto object-contain"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        This logo will appear on all your estimates.{' '}
                        <button
                          onClick={() => navigate('/settings')}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          Change in Settings
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Image className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-1">No company logo uploaded</p>
                      <button
                        onClick={() => navigate('/settings')}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Upload logo in Settings
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Font Family</label>
                <select
                  value={safeEstimate.branding.fontFamily}
                  onChange={(e) => handleBrandingChange('fontFamily', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="Poppins, sans-serif">Poppins</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Georgia, serif">Georgia</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                <div className="mt-1 flex items-center space-x-3">
                  <div
                    className="h-10 w-10 rounded-md border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: safeEstimate.branding.primaryColor }}
                  ></div>
                  <select
                    value={safeEstimate.branding.primaryColor}
                    onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="#3b82f6">Blue</option>
                    <option value="#ef4444">Red</option>
                    <option value="#10b981">Green</option>
                    <option value="#f59e0b">Orange</option>
                    <option value="#8b5cf6">Purple</option>
                    <option value="#ec4899">Pink</option>
                    <option value="#14b8a6">Teal</option>
                    <option value="#f97316">Burnt Orange</option>
                    <option value="#6366f1">Indigo</option>
                    <option value="#84cc16">Lime</option>
                    <option value="#06b6d4">Cyan</option>
                    <option value="#64748b">Slate</option>
                    <option value="#1f2937">Dark Gray</option>
                    <option value="#000000">Black</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
                <div className="mt-1 flex items-center space-x-3">
                  <div
                    className="h-10 w-10 rounded-md border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: safeEstimate.branding.secondaryColor }}
                  ></div>
                  <select
                    value={safeEstimate.branding.secondaryColor}
                    onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="#1e40af">Dark Blue</option>
                    <option value="#b91c1c">Dark Red</option>
                    <option value="#047857">Dark Green</option>
                    <option value="#d97706">Dark Orange</option>
                    <option value="#6d28d9">Dark Purple</option>
                    <option value="#be185d">Dark Pink</option>
                    <option value="#0f766e">Dark Teal</option>
                    <option value="#c2410c">Dark Burnt Orange</option>
                    <option value="#4338ca">Dark Indigo</option>
                    <option value="#65a30d">Dark Lime</option>
                    <option value="#0e7490">Dark Cyan</option>
                    <option value="#475569">Dark Slate</option>
                    <option value="#111827">Almost Black</option>
                    <option value="#000000">Black</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Branding Tips</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Use your company's logo for brand recognition</li>
                      <li>Choose colors that match your brand identity</li>
                      <li>Select fonts that are easy to read and professional</li>
                      <li>Maintain consistent branding across all estimates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'terms' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
              <textarea
                rows={4}
                value={safeEstimate.terms}
                onChange={(e) => handleUpdateField('terms', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter terms and conditions..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={4}
                value={safeEstimate.notes}
                onChange={(e) => handleUpdateField('notes', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter additional notes..."
              />
            </div>
            
            {profile?.default_terms && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Company Default Terms</h3>
                    <p className="mt-1 text-xs text-blue-600">
                      Your default terms from Settings are automatically applied to new estimates. You can edit them above or change the defaults in Settings.
                    </p>
                    <button
                      onClick={() => navigate('/settings')}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Edit default terms in Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimateEditor;