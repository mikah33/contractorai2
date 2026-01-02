import { create } from 'zustand';
import { parseISO, addDays } from 'date-fns';
import { CalendarService, CalendarEvent } from '../services/calendarService';
import { supabase } from '../lib/supabase';

interface CalendarState {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;

  // Fetch operations
  fetchEvents: () => Promise<void>;
  fetchEventsByDateRange: (startDate: string, endDate: string) => Promise<void>;

  // CRUD operations
  addEvent: (event: Partial<CalendarEvent>) => Promise<void>;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;

  // Sync operations
  syncProjectDates: (projectId: string, projectData: any) => Promise<void>;
  syncEstimateDates: (estimateId: string, estimateData: any) => Promise<void>;
  syncTaskDates: (taskId: string, taskData: any) => Promise<void>;
  syncNotifications: () => Promise<void>; // Sync all event notifications

  // Query operations
  getEventsByDate: (date: Date) => CalendarEvent[];
  getEventsByDateRange: (start: Date, end: Date) => CalendarEvent[];
  getEventsByProject: (projectId: string) => CalendarEvent[];
  getEventsByEstimate: (estimateId: string) => CalendarEvent[];
  getEventsByType: (eventType: string) => CalendarEvent[];

  // AI and generation
  generateProjectMilestones: (projectId: string, projectData: any) => Promise<void>;
  generateAIRecommendations: (projectType: string, startDate: Date) => CalendarEvent[];
}

// Sample AI-generated schedule templates based on project type
const aiTemplates: Record<string, Partial<CalendarEvent>[]> = {
  'deck': [
    { title: 'Site Preparation', event_type: 'task' },
    { title: 'Material Delivery', event_type: 'task' },
    { title: 'Foundation Work', event_type: 'task', weather_sensitive: true },
    { title: 'Framing', event_type: 'task' },
    { title: 'Decking Installation', event_type: 'task' },
    { title: 'Railing Installation', event_type: 'task' },
    { title: 'Final Inspection', event_type: 'milestone' }
  ],
  'bathroom': [
    { title: 'Demo Day', event_type: 'task' },
    { title: 'Plumbing Rough-in', event_type: 'task' },
    { title: 'Electrical Rough-in', event_type: 'task' },
    { title: 'Tile Work', event_type: 'task' },
    { title: 'Fixture Installation', event_type: 'task' },
    { title: 'Final Touches', event_type: 'task' }
  ],
  'kitchen': [
    { title: 'Kitchen Demo', event_type: 'task' },
    { title: 'Plumbing/Electrical Updates', event_type: 'task' },
    { title: 'Cabinet Installation', event_type: 'task' },
    { title: 'Countertop Measurement', event_type: 'milestone' },
    { title: 'Countertop Installation', event_type: 'task' },
    { title: 'Appliance Installation', event_type: 'task' },
    { title: 'Backsplash Installation', event_type: 'task' },
    { title: 'Final Walkthrough', event_type: 'milestone' }
  ]
};

export const useCalendarStoreSupabase = create<CalendarState>((set, get) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const events = await CalendarService.fetchEvents(user.id);
      set({ events, loading: false });
    } catch (error) {
      console.error('Error fetching events:', error);
      set({ error: 'Failed to fetch events', loading: false });
    }
  },

  fetchEventsByDateRange: async (startDate: string, endDate: string) => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const events = await CalendarService.fetchEventsByDateRange(user.id, startDate, endDate);
      set({ events, loading: false });
    } catch (error) {
      console.error('Error fetching events by date range:', error);
      set({ error: 'Failed to fetch events', loading: false });
    }
  },

  addEvent: async (event: Partial<CalendarEvent>) => {
    set({ loading: true, error: null });
    try {
      console.log('Adding event:', event);
      const newEvent = await CalendarService.createEvent(event);
      console.log('Event created:', newEvent);
      if (newEvent) {
        set((state) => ({
          events: [...state.events, newEvent],
          loading: false
        }));
        // Refresh events to ensure sync
        await get().fetchEvents();
      } else {
        console.error('Failed to create event - no data returned');
        set({ error: 'Failed to add event - no data returned', loading: false });
      }
    } catch (error) {
      console.error('Error adding event:', error);
      set({ error: `Failed to add event: ${error}`, loading: false });
    }
  },

  updateEvent: async (eventId: string, updates: Partial<CalendarEvent>) => {
    set({ loading: true, error: null });
    try {
      await CalendarService.updateEvent(eventId, updates);
      set((state) => ({
        events: state.events.map((e) => 
          e.id === eventId ? { ...e, ...updates } : e
        ),
        loading: false
      }));
    } catch (error) {
      console.error('Error updating event:', error);
      set({ error: 'Failed to update event', loading: false });
    }
  },

  deleteEvent: async (eventId: string) => {
    set({ loading: true, error: null });
    try {
      await CalendarService.deleteEvent(eventId);
      set((state) => ({
        events: state.events.filter((e) => e.id !== eventId),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting event:', error);
      set({ error: 'Failed to delete event', loading: false });
    }
  },

  syncProjectDates: async (projectId: string, projectData: any) => {
    try {
      await CalendarService.syncProjectDates(projectId, projectData);
      await get().fetchEvents(); // Refresh events after sync
    } catch (error) {
      console.error('Error syncing project dates:', error);
      set({ error: 'Failed to sync project dates' });
    }
  },

  syncEstimateDates: async (estimateId: string, estimateData: any) => {
    try {
      await CalendarService.syncEstimateDates(estimateId, estimateData);
      await get().fetchEvents(); // Refresh events after sync
    } catch (error) {
      console.error('Error syncing estimate dates:', error);
      set({ error: 'Failed to sync estimate dates' });
    }
  },

  syncTaskDates: async (taskId: string, taskData: any) => {
    try {
      await CalendarService.syncTaskDates(taskId, taskData);
      await get().fetchEvents(); // Refresh events after sync
    } catch (error) {
      console.error('Error syncing task dates:', error);
      set({ error: 'Failed to sync task dates' });
    }
  },

  syncNotifications: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user for notification sync');
        return;
      }
      await CalendarService.syncAllEventNotifications(user.id);
    } catch (error) {
      console.error('Error syncing notifications:', error);
    }
  },

  getEventsByDate: (date: Date) => {
    return get().events.filter((event) => {
      const eventDate = parseISO(event.start_date);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  },

  getEventsByDateRange: (start: Date, end: Date) => {
    return get().events.filter((event) => {
      const eventDate = parseISO(event.start_date);
      return eventDate >= start && eventDate <= end;
    });
  },

  getEventsByProject: (projectId: string) => {
    return get().events.filter((event) => event.project_id === projectId);
  },

  getEventsByEstimate: (estimateId: string) => {
    return get().events.filter((event) => event.estimate_id === estimateId);
  },

  getEventsByType: (eventType: string) => {
    return get().events.filter((event) => event.event_type === eventType);
  },

  generateProjectMilestones: async (projectId: string, projectData: any) => {
    try {
      await CalendarService.generateProjectMilestones(projectId, projectData);
      await get().fetchEvents(); // Refresh events after generation
    } catch (error) {
      console.error('Error generating project milestones:', error);
      set({ error: 'Failed to generate milestones' });
    }
  },

  generateAIRecommendations: (projectType: string, startDate: Date) => {
    const template = aiTemplates[projectType.toLowerCase()];
    if (!template) return [];

    let currentDate = startDate;
    const generatedEvents: CalendarEvent[] = [];

    template.forEach((eventTemplate, index) => {
      const duration = index === 0 ? 0 : Math.floor(Math.random() * 3) + 1; // Random 1-3 day duration
      currentDate = addDays(currentDate, duration);
      
      const event: CalendarEvent = {
        id: `ai-${Date.now()}-${index}`,
        title: eventTemplate.title || '',
        description: `AI-generated event for ${projectType} project`,
        start_date: currentDate.toISOString(),
        end_date: addDays(currentDate, 1).toISOString(),
        event_type: eventTemplate.event_type || 'task',
        status: 'pending',
        user_id: '',
        weather_sensitive: eventTemplate.weather_sensitive || false,
        auto_generated: true
      };
      
      generatedEvents.push(event);
    });

    return generatedEvents;
  }
}));