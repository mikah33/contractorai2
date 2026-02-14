import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Search,
  Briefcase,
  Calendar,
  X,
  ArrowLeft,
  Trash2,
  Pencil,
  Building2,
  DollarSign,
  FileText,
  Settings
} from 'lucide-react';
import { useClientsStore } from '../stores/clientsStore';
import useProjectStore from '../stores/projectStore';
import AIChatPopup from '../components/ai/AIChatPopup';
import AddChoiceModal from '../components/common/AddChoiceModal';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';

interface ClientsHubProps {
  embedded?: boolean;
  searchQuery?: string;
}

const ClientsHub: React.FC<ClientsHubProps> = ({ embedded = false, searchQuery: externalSearchQuery }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { clients, fetchClients, loading, deleteClient, addClient, updateClient } = useClientsStore();
  const { projects, fetchProjects } = useProjectStore();
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  // Use external search query if provided (embedded mode)
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = externalSearchQuery !== undefined ? () => {} : setInternalSearchQuery;
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isUpdatingClient, setIsUpdatingClient] = useState(false);
  const [editClientForm, setEditClientForm] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'prospect'
  });
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    status: 'prospect' as 'active' | 'inactive' | 'prospect'
  });

  useEffect(() => {
    fetchClients();
    fetchProjects();
  }, [fetchClients, fetchProjects]);

  // Hide navbar when any modal is open
  useEffect(() => {
    const isModalOpen = showManualForm || showEditForm || showAddChoice || selectedClient !== null;
    if (isModalOpen) {
      document.body.classList.add('modal-active');
    } else {
      document.body.classList.remove('modal-active');
    }
    return () => {
      document.body.classList.remove('modal-active');
    };
  }, [showManualForm, showEditForm, showAddChoice, selectedClient]);

  // Auto-select client from URL params
  useEffect(() => {
    const clientId = searchParams.get('id');
    if (clientId && clients.length > 0 && !selectedClient) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClient(client);
        // Clear the URL param after selecting
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, clients, selectedClient, setSearchParams]);

  // Get projects associated with a client
  const getClientProjects = (clientId: string, clientName: string) => {
    return projects.filter(p =>
      p.client_id === clientId ||
      p.clientId === clientId ||
      (p.client_name && p.client_name.toLowerCase() === clientName.toLowerCase()) ||
      (p.client && p.client.toLowerCase() === clientName.toLowerCase())
    );
  };

  // Calculate total revenue from client's projects
  const getClientRevenue = (clientId: string, clientName: string) => {
    const clientProjects = getClientProjects(clientId, clientName);
    return clientProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-700 border border-blue-300';
      case 'inactive':
        return 'bg-zinc-100 text-zinc-600 border border-zinc-300';
      case 'prospect':
        return 'bg-amber-100 text-amber-700 border border-amber-300';
      default:
        return 'bg-zinc-100 text-zinc-600 border border-zinc-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditClient = (client: any) => {
    setEditClientForm({
      id: client.id,
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip: client.zip || '',
      notes: client.notes || '',
      status: client.status || 'active'
    });
    setShowEditForm(true);
  };

  const handleUpdateClient = async () => {
    if (isUpdatingClient) return;
    if (!editClientForm.name.trim()) return;

    console.log('🔵 handleUpdateClient called with:', editClientForm);
    setIsUpdatingClient(true);
    try {
      await updateClient(editClientForm.id, {
        name: editClientForm.name.trim(),
        email: editClientForm.email.trim(),
        phone: editClientForm.phone.trim(),
        company: editClientForm.company.trim() || undefined,
        address: editClientForm.address.trim() || undefined,
        city: editClientForm.city.trim() || undefined,
        state: editClientForm.state.trim() || undefined,
        zip: editClientForm.zip.trim() || undefined,
        notes: editClientForm.notes.trim() || undefined,
        status: editClientForm.status
      });
      console.log('✅ updateClient completed, forcing refresh...');
      await fetchClients(true); // Force refresh
      // Update selectedClient if it was being edited
      if (selectedClient && selectedClient.id === editClientForm.id) {
        // Need to get fresh data after fetch
        const freshClients = useClientsStore.getState().clients;
        const updated = freshClients.find(c => c.id === editClientForm.id);
        if (updated) {
          console.log('📝 Updating selectedClient with fresh data:', updated);
          setSelectedClient(updated);
        }
      }
      setShowEditForm(false);
    } catch (error) {
      console.error('❌ Error updating client:', error);
    } finally {
      setIsUpdatingClient(false);
    }
  };

  const handleAIChat = () => {
    setShowAIChat(true);
  };

  const handleManual = () => {
    setShowAddChoice(false);
    setNewClientForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      notes: '',
      status: 'prospect'
    });
    setShowManualForm(true);
  };

  const handleCreateClient = async () => {
    if (isCreatingClient) return;
    if (!newClientForm.name.trim()) return;

    setIsCreatingClient(true);
    try {
      await addClient({
        name: newClientForm.name.trim(),
        email: newClientForm.email.trim(),
        phone: newClientForm.phone.trim(),
        company: newClientForm.company.trim() || undefined,
        address: newClientForm.address.trim() || undefined,
        city: newClientForm.city.trim() || undefined,
        state: newClientForm.state.trim() || undefined,
        zip: newClientForm.zip.trim() || undefined,
        notes: newClientForm.notes.trim() || undefined,
        status: newClientForm.status
      });
      await fetchClients();
      setShowManualForm(false);
      setNewClientForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        notes: '',
        status: 'prospect'
      });
    } catch (error) {
      console.error('Error creating client:', error);
    } finally {
      setIsCreatingClient(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} ${themeClasses.bg.primary} ${embedded ? '' : 'pb-40'}`}>
      {/* Fixed Header with safe area background - hidden when embedded */}
      {!embedded && (
        <>
          <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
            <div className="pt-[env(safe-area-inset-top)]">
              <div className="px-4 pb-5 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-7 h-7 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Clients</h1>
                      <p className={`text-base ${themeClasses.text.secondary}`}>{clients.length} total</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/settings')}
                    className={`w-14 h-14 ${themeClasses.bg.tertiary} rounded-xl flex items-center justify-center hover:opacity-80 transition-colors`}
                  >
                    <Settings className={`w-7 h-7 ${themeClasses.text.secondary}`} />
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${themeClasses.text.muted}`} />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 ${themeClasses.bg.input} rounded-lg border ${themeClasses.border.primary} ${themeClasses.text.primary} placeholder-gray-400 focus:ring-2 focus:ring-blue-500 transition-all`}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Spacer for fixed header */}
          <div className="pt-[calc(env(safe-area-inset-top)+130px)]" />
        </>
      )}

      {/* Add Client Card */}
      <div className="px-4 pb-4 -mt-1">
        <div className={`${themeClasses.bg.card} rounded-2xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-6 relative overflow-hidden`}>
          {/* Background decorations */}
          <div className="absolute -right-6 -top-6 w-44 h-44 bg-blue-500/10 rounded-full" />
          <div className="absolute right-16 top-20 w-28 h-28 bg-blue-500/5 rounded-full" />

          <div className="relative min-h-[240px] flex flex-col">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className={`font-bold ${themeClasses.text.primary} text-xl`}>Add Client</h3>
                <p className={`${themeClasses.text.secondary} text-base`}>Manage your customers</p>
              </div>
            </div>

            <p className={`${themeClasses.text.secondary} italic text-base flex-1`}>
              Add new clients manually or use AI to help organize your customer information.
            </p>

            <div className="space-y-3 mt-auto">
              <button
                onClick={() => setShowManualForm(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-blue-500 text-white rounded-xl font-semibold text-lg hover:bg-blue-600 active:scale-[0.98] transition-all"
              >
                <Plus className="w-6 h-6" />
                Add Client
              </button>
              <button
                onClick={() => setShowAIChat(true)}
                className={`w-full flex items-center justify-center gap-2 px-5 py-4 ${theme === 'light' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-xl font-semibold text-lg active:scale-[0.98] transition-all`}
              >
                <Sparkles className="w-6 h-6" />
                AI Assistant
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'light' ? 'border-gray-800' : 'border-white'}`}></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Users className={`w-12 h-12 ${themeClasses.text.muted} mx-auto mb-3`} />
            <p className={`${themeClasses.text.secondary} font-medium`}>No clients yet</p>
            <p className={`text-sm ${themeClasses.text.muted} mt-1`}>Tap + to add your first client</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const clientProjects = getClientProjects(client.id, client.name);
            const totalRevenue = getClientRevenue(client.id, client.name);

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`${themeClasses.bg.card} rounded-2xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} overflow-hidden active:scale-[0.99] transition-transform shadow-sm`}
              >
                {/* Header with avatar and status */}
                <div className="p-3 md:p-4 pb-2 md:pb-3">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 font-bold text-base md:text-lg">
                      {getInitials(client.name || 'NA')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold ${themeClasses.text.primary} truncate text-base md:text-lg`}>
                          {client.name || 'Unknown Client'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </span>
                      </div>
                      {client.company && (
                        <div className={`flex items-center gap-1 text-sm ${themeClasses.text.secondary} mt-0.5`}>
                          <Building2 className="w-3.5 h-3.5" />
                          <span className="truncate">{client.company}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="px-3 md:px-4 pb-2 md:pb-3 flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 text-sm">
                  {client.email && (
                    <div className={`flex items-center gap-1.5 ${themeClasses.text.secondary}`}>
                      <Mail className={`w-4 h-4 ${themeClasses.text.muted}`} />
                      <span className="truncate max-w-[180px]">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className={`flex items-center gap-1.5 ${themeClasses.text.secondary}`}>
                      <Phone className={`w-4 h-4 ${themeClasses.text.muted}`} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>

                {/* Address - Always visible */}
                <div className="px-3 md:px-4 pb-2 md:pb-3">
                  {(client.address || client.city || client.state) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const addressParts = [client.address, client.city, client.state, client.zip].filter(Boolean);
                        const fullAddress = addressParts.join(', ');
                        const encodedAddress = encodeURIComponent(fullAddress);
                        window.open(`maps://maps.apple.com/?q=${encodedAddress}`, '_blank');
                      }}
                      className={`flex items-center gap-2 ${theme === 'light' ? 'text-blue-600 active:text-blue-500' : 'text-white active:text-zinc-300'} text-sm`}
                    >
                      <div className={`w-7 h-7 rounded-lg ${theme === 'light' ? 'bg-blue-100 border border-blue-300' : 'bg-blue-500/20 border border-blue-500/40'} flex items-center justify-center`}>
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">
                          {client.address || [client.city, client.state].filter(Boolean).join(', ')}
                        </p>
                        {client.address && (client.city || client.state) && (
                          <p className="text-xs text-zinc-500">
                            {[client.city, client.state, client.zip].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto text-blue-500" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClient(client);
                      }}
                      className="flex items-center gap-2 text-zinc-500 text-sm"
                    >
                      <div className={`w-7 h-7 rounded-lg ${theme === 'light' ? 'bg-zinc-100 border border-zinc-300' : 'bg-zinc-700 border border-zinc-600'} flex items-center justify-center`}>
                        <MapPin className={`w-4 h-4 ${themeClasses.text.muted}`} />
                      </div>
                      <span className="italic">Needs address</span>
                      <Pencil className="w-3 h-3 ml-1" />
                    </button>
                  )}
                </div>

                {/* Stats Row */}
                <div className={`px-3 md:px-4 py-2 md:py-3 ${theme === 'light' ? 'bg-blue-50 border-t border-blue-200' : 'bg-blue-500/10 border-t border-blue-500/30'} flex items-center justify-between`}>
                  <div className="flex items-center gap-3 md:gap-4">
                    {/* Projects */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${clientProjects.length > 0 ? (theme === 'light' ? 'bg-blue-100 border border-blue-300' : 'bg-blue-500/20 border border-blue-500/40') : (theme === 'light' ? 'bg-zinc-100 border border-zinc-300' : 'bg-zinc-700 border border-zinc-600')}`}>
                        <Briefcase className={`w-4 h-4 ${clientProjects.length > 0 ? 'text-blue-600' : 'text-zinc-500'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${clientProjects.length > 0 ? (theme === 'light' ? 'text-blue-700' : 'text-white') : themeClasses.text.muted}`}>
                          {clientProjects.length}
                        </p>
                        <p className={`text-xs ${themeClasses.text.secondary}`}>Projects</p>
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${totalRevenue > 0 ? (theme === 'light' ? 'bg-blue-100 border border-blue-300' : 'bg-blue-500/20 border border-blue-500/40') : (theme === 'light' ? 'bg-zinc-100 border border-zinc-300' : 'bg-zinc-700 border border-zinc-600')}`}>
                        <DollarSign className={`w-4 h-4 ${totalRevenue > 0 ? 'text-blue-600' : 'text-zinc-500'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${totalRevenue > 0 ? (theme === 'light' ? 'text-blue-700' : 'text-white') : themeClasses.text.muted}`}>
                          {formatCurrency(totalRevenue)}
                        </p>
                        <p className={`text-xs ${themeClasses.text.secondary}`}>Revenue</p>
                      </div>
                    </div>
                  </div>

                  {/* Date Added */}
                  {formatDate(client.createdAt) && (
                    <div className={`flex items-center gap-1 text-xs ${themeClasses.text.secondary}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(client.createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Choice Modal */}
      <AddChoiceModal
        isOpen={showAddChoice}
        onClose={() => setShowAddChoice(false)}
        onAIChat={handleAIChat}
        onManual={handleManual}
        title="Add Client"
        aiLabel="AI Assistant"
        aiDescription="Tell me about your client and I'll add them"
        manualLabel="Manual Entry"
        manualDescription="Enter client details yourself"
      />

      {/* AI Chat Popup */}
      <AIChatPopup
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        mode="crm"
      />

      {/* Manual Create Client Modal */}
      {showManualForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowManualForm(false)}
          />
          <div className="relative bg-[#1C1C1E] rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-[#1C1C1E] px-4 py-4 border-b border-blue-500/30 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">New Client</h2>
              <button
                onClick={() => setShowManualForm(false)}
                className="p-2 text-zinc-400 active:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 md:p-4 space-y-3 md:space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Client name"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Company</label>
                <input
                  type="text"
                  value={newClientForm.company}
                  onChange={(e) => setNewClientForm({ ...newClientForm, company: e.target.value })}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Company name"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Address</label>
                <input
                  type="text"
                  value={newClientForm.address}
                  onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="123 Main St"
                />
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-6 gap-2 md:gap-3">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">City</label>
                  <input
                    type="text"
                    value={newClientForm.city}
                    onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="City"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">State</label>
                  <input
                    type="text"
                    value={newClientForm.state}
                    onChange={(e) => setNewClientForm({ ...newClientForm, state: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="SC"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Zip</label>
                  <input
                    type="text"
                    value={newClientForm.zip}
                    onChange={(e) => setNewClientForm({ ...newClientForm, zip: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="29401"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Status</label>
                <select
                  value={newClientForm.status}
                  onChange={(e) => setNewClientForm({ ...newClientForm, status: e.target.value as 'active' | 'inactive' | 'prospect' })}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
                <textarea
                  value={newClientForm.notes}
                  onChange={(e) => setNewClientForm({ ...newClientForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  placeholder="Additional notes about this client..."
                />
              </div>
            </div>

            {/* Create Button */}
            <div className="sticky bottom-0 bg-[#1C1C1E] p-3 md:p-4 border-t border-blue-500/30">
              <button
                onClick={handleCreateClient}
                disabled={!newClientForm.name.trim() || isCreatingClient}
                className="w-full py-3 md:py-4 rounded-xl font-semibold text-white bg-blue-500 shadow-lg shadow-blue-500/20 active:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingClient ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowEditForm(false)}
          />
          <div className="relative bg-[#1C1C1E] rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-[#1C1C1E] px-4 py-4 border-b border-blue-500/30 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Edit Client</h2>
              <button
                onClick={() => setShowEditForm(false)}
                className="p-2 text-zinc-400 active:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editClientForm.name}
                  onChange={(e) => setEditClientForm({ ...editClientForm, name: e.target.value })}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Client name"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Company</label>
                <input
                  type="text"
                  value={editClientForm.company}
                  onChange={(e) => setEditClientForm({ ...editClientForm, company: e.target.value })}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Company name"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={editClientForm.email}
                    onChange={(e) => setEditClientForm({ ...editClientForm, email: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editClientForm.phone}
                    onChange={(e) => setEditClientForm({ ...editClientForm, phone: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Address</label>
                <input
                  type="text"
                  value={editClientForm.address}
                  onChange={(e) => setEditClientForm({ ...editClientForm, address: e.target.value })}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="123 Main St"
                />
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-6 gap-2 md:gap-3">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">City</label>
                  <input
                    type="text"
                    value={editClientForm.city}
                    onChange={(e) => setEditClientForm({ ...editClientForm, city: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="City"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">State</label>
                  <input
                    type="text"
                    value={editClientForm.state}
                    onChange={(e) => setEditClientForm({ ...editClientForm, state: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="SC"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Zip</label>
                  <input
                    type="text"
                    value={editClientForm.zip}
                    onChange={(e) => setEditClientForm({ ...editClientForm, zip: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="29401"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Status</label>
                <select
                  value={editClientForm.status}
                  onChange={(e) => setEditClientForm({ ...editClientForm, status: e.target.value as 'active' | 'inactive' | 'prospect' })}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
                <textarea
                  value={editClientForm.notes}
                  onChange={(e) => setEditClientForm({ ...editClientForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  placeholder="Additional notes about this client..."
                />
              </div>
            </div>

            {/* Update Button */}
            <div className="sticky bottom-0 bg-[#1C1C1E] p-3 md:p-4 border-t border-blue-500/30">
              <button
                onClick={handleUpdateClient}
                disabled={!editClientForm.name.trim() || isUpdatingClient}
                className="w-full py-3 md:py-4 rounded-xl font-semibold text-white bg-blue-500 shadow-lg shadow-blue-500/20 active:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingClient ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal - Slide Up */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setSelectedClient(null)}
          />

          {/* Slide-up Modal */}
          <div className="absolute inset-x-0 bottom-0 top-12 bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="bg-white px-4 py-4 border-b-2 border-blue-400 flex-shrink-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedClient(null)}
                  className="flex items-center gap-2 text-zinc-600 active:text-black"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditClient(selectedClient)}
                    className="p-2 text-blue-500 active:text-blue-600 active:bg-blue-100 rounded-xl"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete "${selectedClient.name}"? This cannot be undone.`)) {
                        try {
                          await deleteClient(selectedClient.id);
                          setSelectedClient(null);
                        } catch (error) {
                          console.error('Error deleting client:', error);
                          alert('Failed to delete client.');
                        }
                      }
                    }}
                    className="p-2 text-red-500 active:text-red-600 active:bg-red-100 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Client Title */}
              <div className="mt-3 flex items-center gap-3">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg shadow-blue-500/20">
                  {getInitials(selectedClient.name || 'NA')}
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-black">{selectedClient.name || 'Unknown Client'}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedClient.company && (
                      <span className="text-sm text-zinc-600">{selectedClient.company}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedClient.status)}`}>
                      {selectedClient.status.charAt(0).toUpperCase() + selectedClient.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-4 pb-24 bg-zinc-50">

              {/* Contact Info Card */}
              <div className="bg-white border-2 border-blue-400 rounded-2xl p-3 md:p-4 shadow-sm">
                <label className="text-xs text-zinc-600 font-medium mb-3 block">Contact Information</label>
                <div className="space-y-3">
                  {selectedClient.email && (
                    <a href={`mailto:${selectedClient.email}`} className="flex items-center gap-3 text-zinc-700 active:text-blue-600">
                      <div className="w-10 h-10 bg-blue-100 border border-blue-300 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Email</p>
                        <p className="font-medium text-black">{selectedClient.email}</p>
                      </div>
                    </a>
                  )}
                  {selectedClient.phone && (
                    <a href={`tel:${selectedClient.phone}`} className="flex items-center gap-3 text-zinc-700 active:text-blue-600">
                      <div className="w-10 h-10 bg-blue-100 border border-blue-300 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Phone</p>
                        <p className="font-medium text-black">{selectedClient.phone}</p>
                      </div>
                    </a>
                  )}
                  {(selectedClient.address || selectedClient.city || selectedClient.state) && (
                    <div className="flex items-center gap-3 text-zinc-700">
                      <div className="w-10 h-10 bg-blue-100 border border-blue-300 rounded-xl flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Address</p>
                        <p className="font-medium text-black">
                          {[selectedClient.address, selectedClient.city, selectedClient.state, selectedClient.zip]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Projects Card */}
              <div className="bg-white border-2 border-blue-400 rounded-2xl p-3 md:p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-zinc-600 font-medium">Projects</label>
                  <button
                    onClick={() => {
                      setSelectedClient(null);
                      navigate('/projects-hub');
                    }}
                    className="text-xs text-blue-600 font-medium"
                  >
                    View All
                  </button>
                </div>
                {(() => {
                  const clientProjects = getClientProjects(selectedClient.id, selectedClient.name);
                  if (clientProjects.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <Briefcase className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500">No projects yet</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {clientProjects.slice(0, 5).map((project: any) => (
                        <div
                          key={project.id}
                          onClick={() => {
                            setSelectedClient(null);
                            navigate('/projects-hub', { state: { selectedProjectId: project.id } });
                          }}
                          className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl active:bg-blue-100"
                        >
                          <div className="w-10 h-10 bg-blue-100 border border-blue-300 rounded-xl flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-black truncate">{project.name}</p>
                            <p className="text-xs text-zinc-600">
                              {project.status === 'active' ? 'Active' : project.status === 'completed' ? 'Completed' : 'On Hold'}
                              {project.budget ? ` • ${formatCurrency(project.budget)}` : ''}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-blue-500" />
                        </div>
                      ))}
                      {clientProjects.length > 5 && (
                        <p className="text-center text-xs text-zinc-500 pt-2">
                          +{clientProjects.length - 5} more projects
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Revenue Summary Card */}
              <div className="bg-white border-2 border-blue-400 rounded-2xl p-3 md:p-4 shadow-sm">
                <label className="text-xs text-zinc-600 font-medium mb-3 block">Revenue Summary</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(getClientRevenue(selectedClient.id, selectedClient.name))}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">Total Budget</p>
                  </div>
                  <div className="flex-1 text-center p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">
                      {getClientProjects(selectedClient.id, selectedClient.name).length}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">Total Projects</p>
                  </div>
                </div>
              </div>

              {/* Notes Card */}
              {selectedClient.notes && (
                <div className="bg-white border-2 border-blue-400 rounded-2xl p-3 md:p-4 shadow-sm">
                  <label className="text-xs text-zinc-600 font-medium mb-2 block">Notes</label>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selectedClient.notes}</p>
                </div>
              )}

              {/* Client Since */}
              {formatDate(selectedClient.createdAt) && (
                <div className="text-center text-xs text-zinc-600 pt-2">
                  Client since {formatDate(selectedClient.createdAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientsHub;
