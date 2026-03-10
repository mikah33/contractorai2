import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import WidgetData from '../plugins/widgetData';

export interface OutreachAttempt {
  date: string;
  method: 'call' | 'text' | 'email';
  notes?: string;
}

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
  status: 'new' | 'contacted' | 'quoted' | 'converted' | 'lost' | 'cold' | 'dead';
  notes: string | null;
  outreachCount: number;
  outreachAttempts: OutreachAttempt[];
  nextOutreachDate: string | null;
  coldSince: string | null;
  deadSince: string | null;
  createdAt: string;
  updatedAt: string;
}

// Smart spacing: days to add after each attempt
const OUTREACH_SPACING = [0, 2, 2, 3, 6]; // attempts 1-5
const COLD_FOLLOWUP_DAYS = [30, 35]; // days after cold_since for attempts 6-7

const getNextOutreachDate = (attemptNumber: number, coldSince: string | null): Date | null => {
  const now = new Date();
  if (attemptNumber < 5) {
    // Active outreach: add days from spacing schedule
    const daysToAdd = OUTREACH_SPACING[attemptNumber] || 2;
    now.setDate(now.getDate() + daysToAdd);
    return now;
  }
  if (attemptNumber >= 5 && attemptNumber < 7 && coldSince) {
    // Cold follow-up
    const cold = new Date(coldSince);
    const daysAfterCold = COLD_FOLLOWUP_DAYS[attemptNumber - 5];
    if (daysAfterCold !== undefined) {
      cold.setDate(cold.getDate() + daysAfterCold);
      return cold;
    }
  }
  return null; // No more outreach needed
};

const scheduleOutreachNotification = async (lead: Lead, nextDate: Date, attemptNumber: number) => {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    const scheduleDate = new Date(nextDate);
    const totalAttempts = lead.outreachCount >= 5 ? 7 : 5;

    // Smart spacing: schedule time based on priority
    if (attemptNumber >= 3 || lead.status === 'cold') {
      // High priority (near cold / cold follow-up): 9 AM
      scheduleDate.setHours(9, 0, 0, 0);
    } else if (attemptNumber >= 1) {
      // Medium priority (active outreach): 12 PM
      scheduleDate.setHours(12, 0, 0, 0);
    } else {
      // Low priority (new lead, first contact): 3 PM
      scheduleDate.setHours(15, 0, 0, 0);
    }

    // If the scheduled time already passed today, try next slot or tomorrow 9 AM
    if (scheduleDate <= new Date()) {
      const now = new Date();
      if (now.getHours() < 12) {
        scheduleDate.setHours(12, 0, 0, 0);
      } else if (now.getHours() < 15) {
        scheduleDate.setHours(15, 0, 0, 0);
      } else {
        // All slots passed today — schedule tomorrow 9 AM
        scheduleDate.setDate(scheduleDate.getDate() + 1);
        scheduleDate.setHours(9, 0, 0, 0);
      }
      if (scheduleDate <= new Date()) return; // Still in the past somehow, bail
    }

    // Urgency-based notification message
    let title: string;
    let body: string;
    if (attemptNumber >= 5) {
      // Cold follow-up (attempts 6-7)
      title = `Last chance — Follow up with ${lead.name}`;
      body = 'Cold lead — this may be your last shot';
    } else if (attemptNumber >= 3) {
      // Near cold (attempts 4-5)
      title = `Call ${lead.name} today — going cold soon`;
      body = `Attempt ${attemptNumber + 1}/${totalAttempts}`;
    } else if (attemptNumber >= 1) {
      // Active outreach (attempts 2-3)
      title = `Call ${lead.name} today`;
      body = `Attempt ${attemptNumber + 1}/${totalAttempts} — don't let this one slip`;
    } else {
      // New lead (first attempt)
      title = `New lead — Call ${lead.name} today`;
      body = 'First contact — strike while the iron is hot';
    }

    const notifId = parseInt(lead.id.replace(/\D/g, '').slice(0, 7) + String(attemptNumber).padStart(2, '0')) || Math.floor(Math.random() * 1000000);

    console.log(`[Outreach] Scheduling: "${title}" for ${scheduleDate.toLocaleString()} (id: ${notifId})`);
    await LocalNotifications.schedule({
      notifications: [{
        id: notifId,
        title,
        body,
        schedule: { at: scheduleDate },
        extra: { type: 'outreach_reminder', leadId: lead.id, attemptNumber: attemptNumber + 1 },
        sound: 'default',
      }],
    });
  } catch (e) {
    console.error('Failed to schedule outreach notification:', e);
  }
};

const scheduleAllOutreachReminders = async (leads: Lead[]) => {
  if (Capacitor.getPlatform() === 'web') return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let scheduled = 0;
  let skipped = 0;
  for (const lead of leads) {
    if (['converted', 'lost', 'dead'].includes(lead.status)) { skipped++; continue; }

    let nextDate: Date;
    if (lead.nextOutreachDate) {
      nextDate = new Date(lead.nextOutreachDate);
      const nextDateDay = new Date(nextDate);
      nextDateDay.setHours(0, 0, 0, 0);
      if (nextDateDay < today) { skipped++; continue; }
    } else if (lead.status === 'new' && lead.outreachCount === 0) {
      nextDate = new Date();
    } else {
      skipped++;
      continue;
    }

    await scheduleOutreachNotification(lead, nextDate, lead.outreachCount);
    scheduled++;
  }
  console.log(`[Outreach] Batch: ${scheduled} scheduled, ${skipped} skipped out of ${leads.length} leads`);
};

const cancelOutreachNotifications = async (leadId: string) => {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    // Cancel all possible outreach notification IDs for this lead
    const baseId = parseInt(leadId.replace(/\D/g, '').slice(0, 7)) || 0;
    const ids = Array.from({ length: 7 }, (_, i) =>
      ({ id: parseInt(String(baseId) + String(i + 1).padStart(2, '0')) || baseId + i })
    );
    await LocalNotifications.cancel({ notifications: ids });
  } catch {
    // Ignore cancel errors
  }
};

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
  logOutreach: (id: string, method: OutreachAttempt['method'], notes?: string) => Promise<void>;
  getLeadsNeedingAction: () => Lead[];
  checkColdLeadsForFollowUp: () => Promise<void>;
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
  outreachCount: row.outreach_count || 0,
  outreachAttempts: row.outreach_attempts || [],
  nextOutreachDate: row.next_outreach_date || null,
  coldSince: row.cold_since || null,
  deadSince: row.dead_since || null,
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

      get().syncWidgetData();
      // Schedule all pending outreach reminders
      scheduleAllOutreachReminders(leads);
      // Check for cold leads that need follow-up
      get().checkColdLeadsForFollowUp();
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
      const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() };

      // Cancel outreach notifications if lead is being moved to a terminal state
      if (['converted', 'lost'].includes(status)) {
        cancelOutreachNotifications(id);
        updateData.next_outreach_date = null;
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => {
        const updated = state.leads.map(l =>
          l.id === id ? { ...l, status, updatedAt: new Date().toISOString(), ...((['converted', 'lost'].includes(status)) ? { nextOutreachDate: null } : {}) } : l
        );
        return {
          leads: updated,
          newLeadsCount: updated.filter(l => l.status === 'new').length,
        };
      });

      get().syncWidgetData();

      // Sync status to Facebook if it's a Facebook lead (fire and forget)
      const lead = get().leads.find(l => l.id === id);
      if (lead?.source === 'facebook_lead_ad' && status !== 'new') {
        supabase.functions.invoke('fb-sync-lead-status', {
          body: { leadId: id, status },
        }).catch((err) => console.error('Failed to sync lead status to Facebook:', err));
      }
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

  logOutreach: async (id, method, notes) => {
    const lead = get().leads.find(l => l.id === id);
    if (!lead) return;

    const newAttempt: OutreachAttempt = {
      date: new Date().toISOString(),
      method,
      notes: notes || undefined,
    };

    const newCount = lead.outreachCount + 1;
    const newAttempts = [...lead.outreachAttempts, newAttempt];

    // Determine new status and lifecycle transitions
    let newStatus = lead.status === 'new' ? 'contacted' : lead.status;
    let coldSince = lead.coldSince;
    let deadSince = lead.deadSince;
    let nextOutreachDate: string | null = null;

    if (newCount >= 7) {
      // Cold follow-up complete → Dead
      newStatus = 'dead';
      deadSince = new Date().toISOString();
      nextOutreachDate = null;
      cancelOutreachNotifications(id);
    } else if (newCount >= 5 && !lead.coldSince) {
      // 5 attempts done → Cold
      newStatus = 'cold';
      coldSince = new Date().toISOString();
      nextOutreachDate = null;
      cancelOutreachNotifications(id);
    } else {
      // Calculate next outreach date
      const nextDate = getNextOutreachDate(newCount, coldSince);
      nextOutreachDate = nextDate ? nextDate.toISOString() : null;
      if (nextDate) {
        scheduleOutreachNotification({ ...lead, outreachCount: newCount }, nextDate, newCount);
      }
    }

    try {
      const updateData: Record<string, any> = {
        outreach_count: newCount,
        outreach_attempts: newAttempts,
        next_outreach_date: nextOutreachDate,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (coldSince && !lead.coldSince) updateData.cold_since = coldSince;
      if (deadSince) updateData.dead_since = deadSince;

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => {
        const updated = state.leads.map(l =>
          l.id === id ? {
            ...l,
            outreachCount: newCount,
            outreachAttempts: newAttempts,
            nextOutreachDate,
            status: newStatus as Lead['status'],
            coldSince: coldSince || l.coldSince,
            deadSince: deadSince || l.deadSince,
            updatedAt: new Date().toISOString(),
          } : l
        );
        return {
          leads: updated,
          newLeadsCount: updated.filter(l => l.status === 'new').length,
        };
      });

      get().syncWidgetData();
    } catch (error) {
      console.error('Error logging outreach:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to log outreach' });
    }
  },

  getLeadsNeedingAction: () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return get().leads.filter(l => {
      if (['converted', 'lost', 'dead', 'cold'].includes(l.status)) {
        // Cold leads only show if they have a next_outreach_date (i.e., 30-day follow-up activated)
        if (l.status === 'cold' && l.nextOutreachDate && new Date(l.nextOutreachDate) <= today) return true;
        return false;
      }
      // New leads with no outreach yet
      if (l.status === 'new' && l.outreachCount === 0) return true;
      // Leads with outreach due today or overdue
      if (l.nextOutreachDate && new Date(l.nextOutreachDate) <= today) return true;
      return false;
    });
  },

  checkColdLeadsForFollowUp: async () => {
    const now = new Date();
    const coldLeads = get().leads.filter(l =>
      l.status === 'cold' &&
      l.coldSince &&
      l.outreachCount === 5 &&
      !l.nextOutreachDate
    );

    for (const lead of coldLeads) {
      const coldDate = new Date(lead.coldSince!);
      const followUpDate = new Date(coldDate);
      followUpDate.setDate(followUpDate.getDate() + 30);

      if (now >= followUpDate) {
        // Time for cold follow-up — set next outreach date
        const nextDate = getNextOutreachDate(5, lead.coldSince);
        if (nextDate) {
          try {
            await supabase
              .from('leads')
              .update({
                next_outreach_date: nextDate.toISOString(),
                status: 'contacted',
                updated_at: new Date().toISOString(),
              })
              .eq('id', lead.id);

            set((state) => ({
              leads: state.leads.map(l =>
                l.id === lead.id ? { ...l, nextOutreachDate: nextDate.toISOString(), status: 'contacted' as const, updatedAt: new Date().toISOString() } : l
              ),
            }));

            scheduleOutreachNotification(lead, nextDate, 5);
          } catch (e) {
            console.error('Error activating cold follow-up:', e);
          }
        }
      }
    }
  },

  convertToClient: async (leadId) => {
    const lead = get().leads.find(l => l.id === leadId);
    if (!lead) return;

    try {
      const userId = await getCurrentUserId();

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

      await get().updateLeadStatus(leadId, 'converted');
    } catch (error) {
      console.error('Error converting lead to client:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to convert lead' });
    }
  },

  deleteLead: async (id) => {
    try {
      cancelOutreachNotifications(id);
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
    if (existing) return;

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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Send ALL active leads (not converted/lost/dead), sorted: action-due first, then new, then rest
    const activeLeads = state.leads
      .filter(l => !['converted', 'lost', 'dead'].includes(l.status))
      .sort((a, b) => {
        const aDue = a.nextOutreachDate && new Date(a.nextOutreachDate) <= today;
        const bDue = b.nextOutreachDate && new Date(b.nextOutreachDate) <= today;
        if (aDue && !bDue) return -1;
        if (!aDue && bDue) return 1;
        const aNew = a.status === 'new' && a.outreachCount === 0;
        const bNew = b.status === 'new' && b.outreachCount === 0;
        if (aNew && !bNew) return -1;
        if (!aNew && bNew) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 10)
      .map(l => {
        const totalAttempts = l.outreachCount >= 5 ? 7 : 5;
        let actionLabel = 'New lead';
        if (l.outreachCount > 0 && l.nextOutreachDate && new Date(l.nextOutreachDate) <= today) {
          actionLabel = `Call today (${l.outreachCount}/${totalAttempts})`;
        } else if (l.outreachCount > 0) {
          actionLabel = `Reached out ${l.outreachCount}/${totalAttempts}`;
        } else if (l.status === 'contacted') {
          actionLabel = 'Contacted';
        } else if (l.status === 'quoted') {
          actionLabel = 'Quoted';
        } else if (l.status === 'cold') {
          actionLabel = 'Cold - waiting';
        }
        return {
          id: l.id,
          name: l.name,
          source: l.source,
          calculatorType: l.calculatorType,
          estimatedValue: l.estimatedValue,
          createdAt: l.createdAt,
          outreachCount: l.outreachCount,
          totalOutreach: totalAttempts,
          actionLabel,
        };
      });

    const actionCount = activeLeads.length;

    try {
      WidgetData.updateLeadsWidget({
        newCount: actionCount,
        recentLeads: activeLeads,
      });
    } catch {
      // Plugin not available on web
    }
  },
}));

export default useLeadsStore;
