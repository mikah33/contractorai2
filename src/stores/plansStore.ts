import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface PlanScan {
  id: string;
  plan_id: string;
  scan_type: 'lidar' | 'panorama' | 'ai_design';
  data_url: string | null;
  thumbnail_url: string | null;
  prompt: string | null;
  parent_scan_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Plan {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  scans?: PlanScan[];
  project_name?: string;
}

interface AIGenerationStatus {
  count: number;
  limit: number;
  billingCycleStart: string;
}

interface PlansState {
  plans: Plan[];
  currentPlan: Plan | null;
  isLoading: boolean;
  error: string | null;
  aiGenerationStatus: AIGenerationStatus | null;

  // Actions
  fetchPlans: () => Promise<void>;
  fetchPlanById: (planId: string) => Promise<Plan | null>;
  createPlan: (name: string, projectId?: string, description?: string) => Promise<Plan | null>;
  updatePlan: (planId: string, updates: Partial<Plan>) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;

  // Scan actions
  addScan: (planId: string, scanType: PlanScan['scan_type'], dataUrl: string, metadata?: Record<string, any>, prompt?: string, parentScanId?: string) => Promise<PlanScan | null>;
  deleteScan: (scanId: string) => Promise<void>;

  // AI generation tracking
  fetchAIGenerationStatus: () => Promise<AIGenerationStatus | null>;
  canGenerateAI: () => boolean;
  incrementAIGeneration: () => Promise<number>;

  setCurrentPlan: (plan: Plan | null) => void;
}

const AI_GENERATION_LIMIT = 5;

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: [],
  currentPlan: null,
  isLoading: false,
  error: null,
  aiGenerationStatus: null,

  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch plans with their scans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select(`
          *,
          scans:plan_scans(*),
          project:projects(name)
        `)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      const plans = (plansData || []).map((plan: any) => ({
        ...plan,
        project_name: plan.project?.name || null,
        scans: plan.scans || []
      }));

      set({ plans, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchPlanById: async (planId: string) => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select(`
          *,
          scans:plan_scans(*),
          project:projects(name)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;

      const plan = {
        ...data,
        project_name: data.project?.name || null,
        scans: data.scans || []
      };

      set({ currentPlan: plan });
      return plan;
    } catch (error: any) {
      console.error('Error fetching plan:', error);
      return null;
    }
  },

  createPlan: async (name: string, projectId?: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('plans')
        .insert({
          user_id: user.id,
          name,
          project_id: projectId || null,
          description: description || null
        })
        .select()
        .single();

      if (error) throw error;

      const newPlan = { ...data, scans: [] };
      set(state => ({ plans: [newPlan, ...state.plans] }));
      return newPlan;
    } catch (error: any) {
      console.error('Error creating plan:', error);
      set({ error: error.message });
      return null;
    }
  },

  updatePlan: async (planId: string, updates: Partial<Plan>) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;

      set(state => ({
        plans: state.plans.map(p => p.id === planId ? { ...p, ...updates } : p),
        currentPlan: state.currentPlan?.id === planId ? { ...state.currentPlan, ...updates } : state.currentPlan
      }));
    } catch (error: any) {
      console.error('Error updating plan:', error);
      set({ error: error.message });
    }
  },

  deletePlan: async (planId: string) => {
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      set(state => ({
        plans: state.plans.filter(p => p.id !== planId),
        currentPlan: state.currentPlan?.id === planId ? null : state.currentPlan
      }));
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      set({ error: error.message });
    }
  },

  addScan: async (planId: string, scanType: PlanScan['scan_type'], dataUrl: string, metadata?: Record<string, any>, prompt?: string, parentScanId?: string) => {
    try {
      const { data, error } = await supabase
        .from('plan_scans')
        .insert({
          plan_id: planId,
          scan_type: scanType,
          data_url: dataUrl,
          thumbnail_url: dataUrl, // Use same URL for thumbnail for now
          prompt: prompt || null,
          parent_scan_id: parentScanId || null,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => {
        const updatedPlans = state.plans.map(p => {
          if (p.id === planId) {
            return { ...p, scans: [...(p.scans || []), data] };
          }
          return p;
        });

        const updatedCurrentPlan = state.currentPlan?.id === planId
          ? { ...state.currentPlan, scans: [...(state.currentPlan.scans || []), data] }
          : state.currentPlan;

        return { plans: updatedPlans, currentPlan: updatedCurrentPlan };
      });

      // Also update the plan's thumbnail if this is the first scan
      const plan = get().plans.find(p => p.id === planId);
      if (plan && !plan.thumbnail_url) {
        await get().updatePlan(planId, { thumbnail_url: dataUrl });
      }

      return data;
    } catch (error: any) {
      console.error('Error adding scan:', error);
      set({ error: error.message });
      return null;
    }
  },

  deleteScan: async (scanId: string) => {
    try {
      const { error } = await supabase
        .from('plan_scans')
        .delete()
        .eq('id', scanId);

      if (error) throw error;

      set(state => {
        const updatedPlans = state.plans.map(p => ({
          ...p,
          scans: (p.scans || []).filter(s => s.id !== scanId)
        }));

        const updatedCurrentPlan = state.currentPlan
          ? { ...state.currentPlan, scans: (state.currentPlan.scans || []).filter(s => s.id !== scanId) }
          : null;

        return { plans: updatedPlans, currentPlan: updatedCurrentPlan };
      });
    } catch (error: any) {
      console.error('Error deleting scan:', error);
      set({ error: error.message });
    }
  },

  fetchAIGenerationStatus: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .rpc('get_ai_generation_count', { p_user_id: user.id });

      if (error) throw error;

      const status: AIGenerationStatus = {
        count: data?.[0]?.generation_count || 0,
        limit: AI_GENERATION_LIMIT,
        billingCycleStart: data?.[0]?.billing_cycle_start || new Date().toISOString()
      };

      set({ aiGenerationStatus: status });
      return status;
    } catch (error: any) {
      console.error('Error fetching AI generation status:', error);
      return null;
    }
  },

  canGenerateAI: () => {
    const status = get().aiGenerationStatus;
    if (!status) return true; // Allow if we haven't loaded status yet
    return status.count < status.limit;
  },

  incrementAIGeneration: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('increment_ai_generation', { p_user_id: user.id });

      if (error) throw error;

      const newCount = data || 0;
      set(state => ({
        aiGenerationStatus: state.aiGenerationStatus
          ? { ...state.aiGenerationStatus, count: newCount }
          : { count: newCount, limit: AI_GENERATION_LIMIT, billingCycleStart: new Date().toISOString() }
      }));

      return newCount;
    } catch (error: any) {
      console.error('Error incrementing AI generation:', error);
      return -1;
    }
  },

  setCurrentPlan: (plan: Plan | null) => {
    set({ currentPlan: plan });
  }
}));
