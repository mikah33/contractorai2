import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface OnboardingState {
  profileCompleted: boolean | null;
  dashboardTutorialCompleted: boolean | null;
  visionCamTutorialCompleted: boolean | null;
  tasksTutorialCompleted: boolean | null;
  estimatingTutorialCompleted: boolean | null;
  projectsTutorialCompleted: boolean | null;
  paymentsTutorialCompleted: boolean | null;
  financeTutorialCompleted: boolean | null;
  teamsTutorialCompleted: boolean | null;
  emailTutorialCompleted: boolean | null;
  photosTutorialCompleted: boolean | null;
  marketingTutorialCompleted: boolean | null;
  loading: boolean;
  checkOnboardingStatus: (userId: string) => Promise<boolean>;
  markProfileCompleted: (userId: string) => Promise<void>;
  checkDashboardTutorial: (userId: string) => Promise<boolean>;
  setDashboardTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkVisionCamTutorial: (userId: string) => Promise<boolean>;
  setVisionCamTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkTasksTutorial: (userId: string) => Promise<boolean>;
  setTasksTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkEstimatingTutorial: (userId: string) => Promise<boolean>;
  setEstimatingTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkProjectsTutorial: (userId: string) => Promise<boolean>;
  setProjectsTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkPaymentsTutorial: (userId: string) => Promise<boolean>;
  setPaymentsTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkFinanceTutorial: (userId: string) => Promise<boolean>;
  setFinanceTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkTeamsTutorial: (userId: string) => Promise<boolean>;
  setTeamsTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkEmailTutorial: (userId: string) => Promise<boolean>;
  setEmailTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkPhotosTutorial: (userId: string) => Promise<boolean>;
  setPhotosTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  checkMarketingTutorial: (userId: string) => Promise<boolean>;
  setMarketingTutorialCompleted: (userId: string, completed: boolean) => Promise<void>;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  profileCompleted: null,
  dashboardTutorialCompleted: null,
  visionCamTutorialCompleted: null,
  tasksTutorialCompleted: null,
  estimatingTutorialCompleted: null,
  projectsTutorialCompleted: null,
  paymentsTutorialCompleted: null,
  financeTutorialCompleted: null,
  teamsTutorialCompleted: null,
  emailTutorialCompleted: null,
  photosTutorialCompleted: null,
  marketingTutorialCompleted: null,
  loading: false,

  checkOnboardingStatus: async (userId: string): Promise<boolean> => {
    if (!userId) return false;

    set({ loading: true });

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('profile_completed, dashboard_tutorial_completed, vision_cam_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no record exists, user hasn't completed onboarding
        if (error.code === 'PGRST116') {
          console.log('[Onboarding] No onboarding record found, needs setup');
          set({
            profileCompleted: false,
            dashboardTutorialCompleted: false,
            visionCamTutorialCompleted: false,
            loading: false
          });
          return false;
        }
        console.error('[Onboarding] Error checking status:', error);
        set({ loading: false });
        return false;
      }

      const completed = data?.profile_completed || false;
      console.log('[Onboarding] Status:', completed ? 'completed' : 'needs setup');
      set({
        profileCompleted: completed,
        dashboardTutorialCompleted: data?.dashboard_tutorial_completed || false,
        visionCamTutorialCompleted: data?.vision_cam_tutorial_completed || false,
        loading: false
      });
      return completed;
    } catch (error) {
      console.error('[Onboarding] Error:', error);
      set({ loading: false });
      return false;
    }
  },

  markProfileCompleted: async (userId: string): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          profile_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('[Onboarding] Error marking complete:', error);
        throw error;
      }

      console.log('[Onboarding] Marked as completed');
      set({ profileCompleted: true });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
      throw error;
    }
  },

  checkDashboardTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true; // Default to completed if no user

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('dashboard_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No record exists, tutorial not completed
          set({ dashboardTutorialCompleted: false });
          return false;
        }
        console.error('[Onboarding] Error checking dashboard tutorial:', error);
        return true; // Default to completed on error
      }

      const completed = data?.dashboard_tutorial_completed || false;
      set({ dashboardTutorialCompleted: completed });
      return completed;
    } catch (error) {
      console.error('[Onboarding] Error:', error);
      return true;
    }
  },

  setDashboardTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          dashboard_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('[Onboarding] Error setting dashboard tutorial:', error);
        throw error;
      }

      console.log('[Onboarding] Dashboard tutorial set to:', completed);
      set({ dashboardTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
      throw error;
    }
  },

  checkVisionCamTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('vision_cam_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ visionCamTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.vision_cam_tutorial_completed || false;
      set({ visionCamTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setVisionCamTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          vision_cam_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ visionCamTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  checkTasksTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('tasks_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ tasksTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.tasks_tutorial_completed || false;
      set({ tasksTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setTasksTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          tasks_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ tasksTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  checkEstimatingTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('estimating_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ estimatingTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.estimating_tutorial_completed || false;
      set({ estimatingTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setEstimatingTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          estimating_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ estimatingTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  checkProjectsTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('projects_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ projectsTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.projects_tutorial_completed || false;
      set({ projectsTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setProjectsTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          projects_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ projectsTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  checkPaymentsTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('payments_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ paymentsTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.payments_tutorial_completed || false;
      set({ paymentsTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setPaymentsTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          payments_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ paymentsTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  checkFinanceTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('finance_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ financeTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.finance_tutorial_completed || false;
      set({ financeTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setFinanceTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          finance_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ financeTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  checkTeamsTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('teams_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ teamsTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.teams_tutorial_completed || false;
      set({ teamsTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setTeamsTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          teams_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ teamsTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  checkEmailTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('email_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ emailTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.email_tutorial_completed || false;
      set({ emailTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setEmailTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          email_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ emailTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  checkPhotosTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('photos_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ photosTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.photos_tutorial_completed || false;
      set({ photosTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setPhotosTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          photos_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ photosTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  checkMarketingTutorial: async (userId: string): Promise<boolean> => {
    if (!userId) return true;

    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('marketing_tutorial_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ marketingTutorialCompleted: false });
          return false;
        }
        return true;
      }

      const completed = data?.marketing_tutorial_completed || false;
      set({ marketingTutorialCompleted: completed });
      return completed;
    } catch (error) {
      return true;
    }
  },

  setMarketingTutorialCompleted: async (userId: string, completed: boolean): Promise<void> => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: userId,
          marketing_tutorial_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      set({ marketingTutorialCompleted: completed });
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  },

  reset: () => {
    set({
      profileCompleted: null,
      dashboardTutorialCompleted: null,
      visionCamTutorialCompleted: null,
      tasksTutorialCompleted: null,
      estimatingTutorialCompleted: null,
      projectsTutorialCompleted: null,
      paymentsTutorialCompleted: null,
      financeTutorialCompleted: null,
      teamsTutorialCompleted: null,
      emailTutorialCompleted: null,
      photosTutorialCompleted: null,
      marketingTutorialCompleted: null,
      loading: false
    });
  }
}));
