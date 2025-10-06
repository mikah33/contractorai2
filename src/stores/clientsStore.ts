import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  company?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'prospect';
  createdAt: string;
  updatedAt: string;
}

interface ClientsState {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive' | 'prospect';
  hasLoadedOnce: boolean;

  // Actions
  fetchClients: (force?: boolean) => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: 'all' | 'active' | 'inactive' | 'prospect') => void;
}

// Helper function to get current user ID
const getCurrentUserId = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }
  } catch (error) {
    console.log('Auth not available, using development mode');
  }
  
  // For development - return a consistent UUID
  // This should match a user in your profiles table
  return '00000000-0000-0000-0000-000000000000';
};

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  isLoading: false,
  error: null,
  searchTerm: '',
  statusFilter: 'all',
  hasLoadedOnce: false,

  fetchClients: async (force = false) => {
    const state = get();

    // Skip if already loaded and not forcing refresh
    if (state.hasLoadedOnce && !force && state.clients.length > 0) {
      console.log('✅ Using cached clients data');
      return;
    }

    // Skip if currently loading
    if (state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      // Fetch ALL clients - RLS will filter by user automatically
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      set({
        clients: data?.map(client => ({
          id: client.id,
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zip: client.zip || '',
          company: client.company || '',
          notes: client.notes || '',
          status: client.status || 'active',
          createdAt: client.created_at,
          updatedAt: client.updated_at
        })) || [],
        isLoading: false,
        hasLoadedOnce: true
      });
    } catch (error) {
      console.error('Error fetching clients:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch clients',
        isLoading: false 
      });
    }
  },

  addClient: async (clientData) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();
      
      // Insert client with user_id matching SQL structure exactly
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: clientData.name,
          email: clientData.email || null,
          phone: clientData.phone || null,
          address: clientData.address || null,
          city: clientData.city || null,
          state: clientData.state || null,
          zip: clientData.zip || null,
          company: clientData.company || null,
          status: clientData.status || 'active',
          notes: clientData.notes || null,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      const newClient: Client = {
        id: data.id,
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        company: data.company || '',
        notes: data.notes || '',
        status: data.status || 'active',
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      set((state) => ({
        clients: [newClient, ...state.clients],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error adding client:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add client',
        isLoading: false 
      });
    }
  },

  updateClient: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();
      
      // Update client - RLS will ensure only owner can update
      const { data, error } = await supabase
        .from('clients')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedClient: Client = {
        id: data.id,
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        company: data.company || '',
        notes: data.notes || '',
        status: data.status || 'active',
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      set((state) => ({
        clients: state.clients.map(client => 
          client.id === id ? updatedClient : client
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating client:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update client',
        isLoading: false 
      });
    }
  },

  deleteClient: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();
      
      // Delete client - RLS will ensure only owner can delete
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        clients: state.clients.filter(client => client.id !== id),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deleting client:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete client',
        isLoading: false 
      });
    }
  },

  setSearchTerm: (term) => set({ searchTerm: term }),
  setStatusFilter: (status) => set({ statusFilter: status })
}));

export default useClientsStore;