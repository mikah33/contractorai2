import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { format, differenceInSeconds } from 'date-fns';

export interface TimeEntry {
  id: string;
  employee_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  hourly_rate: number;
  total_pay: number | null;
  date: string;
  notes?: string;
  status: 'running' | 'paused' | 'completed';
  created_at: string;
}

interface DateRange {
  start: string;
  end: string;
}

interface TimesheetState {
  activeEntries: TimeEntry[];
  completedEntries: TimeEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchActiveEntries: () => Promise<void>;
  fetchCompletedEntries: (dateRange?: DateRange) => Promise<void>;
  startTimer: (employeeId: string, employeeName: string, hourlyRate: number) => Promise<void>;
  stopTimer: (entryId: string) => Promise<void>;
  pauseTimer: (entryId: string) => Promise<void>;
  resumeTimer: (entryId: string) => Promise<void>;
  syncWidgetData: () => void;
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

  return '00000000-0000-0000-0000-000000000000';
};

export const useTimesheetStore = create<TimesheetState>((set, get) => ({
  activeEntries: [],
  completedEntries: [],
  isLoading: false,
  error: null,

  fetchActiveEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'running')
        .order('start_time', { ascending: false });

      if (error) throw error;

      set({
        activeEntries: data || [],
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching active entries:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch active entries',
        isLoading: false
      });
    }
  },

  fetchCompletedEntries: async (dateRange?: DateRange) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();

      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('start_time', { ascending: false });

      if (dateRange) {
        query = query
          .gte('date', dateRange.start)
          .lte('date', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({
        completedEntries: data || [],
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching completed entries:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch completed entries',
        isLoading: false
      });
    }
  },

  startTimer: async (employeeId: string, employeeName: string, hourlyRate: number) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();
      const now = new Date();

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          employee_id: employeeId,
          user_id: userId,
          start_time: now.toISOString(),
          hourly_rate: hourlyRate,
          date: format(now, 'yyyy-MM-dd'),
          status: 'running'
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        activeEntries: [data, ...state.activeEntries],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error starting timer:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to start timer',
        isLoading: false
      });
    }
  },

  stopTimer: async (entryId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Find the active entry
      const entry = get().activeEntries.find(e => e.id === entryId);
      if (!entry) throw new Error('Active entry not found');

      const now = new Date();
      const start = new Date(entry.start_time);
      const durationMinutes = Math.round(differenceInSeconds(now, start) / 60);
      const totalHours = durationMinutes / 60;
      const totalPay = totalHours * entry.hourly_rate;

      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: now.toISOString(),
          duration_minutes: durationMinutes,
          total_pay: totalPay,
          status: 'completed'
        })
        .eq('id', entryId);

      if (error) throw error;

      const completedEntry: TimeEntry = {
        ...entry,
        end_time: now.toISOString(),
        duration_minutes: durationMinutes,
        total_pay: totalPay,
        status: 'completed'
      };

      set((state) => ({
        activeEntries: state.activeEntries.filter(e => e.id !== entryId),
        completedEntries: [completedEntry, ...state.completedEntries],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error stopping timer:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to stop timer',
        isLoading: false
      });
    }
  },

  pauseTimer: async (entryId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ status: 'paused' })
        .eq('id', entryId);

      if (error) throw error;

      set((state) => ({
        activeEntries: state.activeEntries.map(e =>
          e.id === entryId ? { ...e, status: 'paused' as const } : e
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error pausing timer:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to pause timer',
        isLoading: false
      });
    }
  },

  resumeTimer: async (entryId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ status: 'running' })
        .eq('id', entryId);

      if (error) throw error;

      set((state) => ({
        activeEntries: state.activeEntries.map(e =>
          e.id === entryId ? { ...e, status: 'running' as const } : e
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error resuming timer:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to resume timer',
        isLoading: false
      });
    }
  },

  syncWidgetData: () => {
    // Placeholder for future WidgetData plugin integration
    console.log('[TimesheetStore] syncWidgetData called — WidgetData plugin not yet integrated');
  }
}));

export default useTimesheetStore;
