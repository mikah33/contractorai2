import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';

export interface Lead {
  id: string;
  contractorId: string;
  source: 'website_widget' | 'facebook_lead_ad' | 'website' | 'manual' | 'referral';
  calculatorType: string | null;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  projectDetails: Record<string, any>;
  estimatedValue: number | null;
  status: 'new' | 'contacted' | 'quoted' | 'converted' | 'lost';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadsState {
  leads: Lead[];
  isLoading: boolean;
  error: string | null;
  newLeadsCount: number;
  hasLoadedOnce: boolean;
  realtimeChannel: any | null;

  fetchLeads: (force?: boolean) => Promise<void>;
  addLead: (lead: Partial<Lead>) => Promise<void>;
  updateLeadStatus: (id: string, status: Lead['status']) => Promise<void>;
  updateLeadNotes: (id: string, notes: string) => Promise<void>;
  convertToClient: (leadId: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  subscribeToNewLeads: () => void;
  unsubscribeFromLeads: () => void;
  syncWidgetData: () => void;
}

const mapLeadFromDb = (row: any): Lead => ({
  id: row.id,
  contractorId: row.contractor_id,
  source: row.source,
  calculatorType: row.calculator_type || null,
  name: row.name,
  email: row.email || '',
  phone: row.phone || null,
  address: row.address || null,
  projectDetails: row.project_details || {},
  estimatedValue: row.estimated_value || null,
  status: row.status || 'new',
  notes: row.notes || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getCurrentUserId = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch (error) {
    console.log('Auth not available');
  }
  return '00000000-0000-0000-0000-000000000000';
};

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  isLoading: false,
  error: null,
  newLeadsCount: 0,
  hasLoadedOnce: false,
  realtimeChannel: null,

  fetchLeads: async (force = false) => {
    const state = get();
    if (state.hasLoadedOnce && !force && state.leads.length > 0) return;
    if (state.isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const leads = (data || []).map(mapLeadFromDb);
      const newCount = leads.filter(l => l.status === 'new').length;

      set({
        leads,
        newLeadsCount: newCount,
        isLoading: false,
        hasLoadedOnce: true,
      });

      // Sync widget data on native platforms
      get().syncWidgetData();
    } catch (error) {
      console.error('Error fetching leads:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch leads',
        isLoading: false,
      });
    }
  },

  addLead: async (leadData) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('leads')
        .insert({
          contractor_id: userId,
          source: leadData.source || 'manual',
          calculator_type: leadData.calculatorType || 'general',
          name: leadData.name,
          email: leadData.email || '',
          phone: leadData.phone || null,
          address: leadData.address || null,
          project_details: leadData.projectDetails || {},
          estimated_value: leadData.estimatedValue || null,
          status: 'new',
          notes: leadData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newLead = mapLeadFromDb(data);
      set((state) => ({
        leads: [newLead, ...state.leads],
        newLeadsCount: state.newLeadsCount + 1,
        isLoading: false,
      }));

      get().syncWidgetData();
    } catch (error) {
      console.error('Error adding lead:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add lead',
        isLoading: false,
      });
    }
  },

  updateLeadStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      set((state) => {
        const updated = state.leads.map(l =>
          l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l
        );
        return {
          leads: updated,
          newLeadsCount: updated.filter(l => l.status === 'new').length,
        };
      });

      get().syncWidgetData();
    } catch (error) {
      console.error('Error updating lead status:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update lead' });
    }
  },

  updateLeadNotes: async (id, notes) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        leads: state.leads.map(l =>
          l.id === id ? { ...l, notes, updatedAt: new Date().toISOString() } : l
        ),
      }));
    } catch (error) {
      console.error('Error updating lead notes:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update notes' });
    }
  },

  convertToClient: async (leadId) => {
    const lead = get().leads.find(l => l.id === leadId);
    if (!lead) return;

    try {
      const userId = await getCurrentUserId();

      // Create a client from the lead
      const { error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: userId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone || null,
          address: lead.address || null,
          status: 'active',
          notes: `Converted from ${lead.source} lead. ${lead.notes || ''}`.trim(),
        });

      if (clientError) throw clientError;

      // Mark lead as converted
      await get().updateLeadStatus(leadId, 'converted');
    } catch (error) {
      console.error('Error converting lead to client:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to convert lead' });
    }
  },

  deleteLead: async (id) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => {
        const filtered = state.leads.filter(l => l.id !== id);
        return {
          leads: filtered,
          newLeadsCount: filtered.filter(l => l.status === 'new').length,
        };
      });

      get().syncWidgetData();
    } catch (error) {
      console.error('Error deleting lead:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to delete lead' });
    }
  },

  subscribeToNewLeads: () => {
    const existing = get().realtimeChannel;
    if (existing) return; // Already subscribed

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const newLead = mapLeadFromDb(payload.new);
          set((state) => ({
            leads: [newLead, ...state.leads],
            newLeadsCount: state.newLeadsCount + 1,
          }));
          get().syncWidgetData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          const updatedLead = mapLeadFromDb(payload.new);
          set((state) => {
            const updated = state.leads.map(l =>
              l.id === updatedLead.id ? updatedLead : l
            );
            return {
              leads: updated,
              newLeadsCount: updated.filter(l => l.status === 'new').length,
            };
          });
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromLeads: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ realtimeChannel: null });
    }
  },

  syncWidgetData: () => {
    if (Capacitor.getPlatform() !== 'ios') return;

    const state = get();
    const recentLeads = state.leads
      .filter(l => l.status === 'new')
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        name: l.name,
        source: l.source,
        calculatorType: l.calculatorType,
        estimatedValue: l.estimatedValue,
        createdAt: l.createdAt,
      }));

    // Will be wired to WidgetData Capacitor plugin in Phase 4
    try {
      const { WidgetData } = (window as any).Capacitor?.Plugins || {};
      if (WidgetData?.updateLeadsWidget) {
        WidgetData.updateLeadsWidget({
          newCount: state.newLeadsCount,
          recentLeads,
        });
      }
    } catch {
      // Plugin not available yet
    }
  },
}));

export default useLeadsStore;
