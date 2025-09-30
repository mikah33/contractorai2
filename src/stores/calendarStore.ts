import { create } from 'zustand';
import { parseISO, addDays } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  type: 'task' | 'milestone' | 'meeting' | 'delivery' | 'inspection';
  project: string;
  trade: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  priority: 'low' | 'medium' | 'high';
  assignees?: string[];
  attachments?: { name: string; url: string }[];
  aiGenerated?: boolean;
  weatherSensitive?: boolean;
  location?: string;
  notes?: string;
}

interface CalendarState {
  events: CalendarEvent[];
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (eventId: string) => void;
  getEventsByDate: (date: Date) => CalendarEvent[];
  getEventsByDateRange: (start: Date, end: Date) => CalendarEvent[];
  generateAIRecommendations: (projectType: string, startDate: Date) => CalendarEvent[];
}

// Sample AI-generated schedule templates based on project type
const aiTemplates: Record<string, Partial<CalendarEvent>[]> = {
  'deck': [
    { title: 'Site Preparation', type: 'task', duration: 1, trade: 'general' },
    { title: 'Material Delivery', type: 'delivery', duration: 1, trade: 'supply' },
    { title: 'Foundation Work', type: 'task', duration: 2, trade: 'concrete', weatherSensitive: true },
    { title: 'Framing', type: 'task', duration: 3, trade: 'carpentry' },
    { title: 'Decking Installation', type: 'task', duration: 2, trade: 'carpentry' },
    { title: 'Railing Installation', type: 'task', duration: 1, trade: 'carpentry' },
    { title: 'Final Inspection', type: 'inspection', duration: 1, trade: 'general' }
  ],
  'bathroom': [
    { title: 'Demo Day', type: 'task', duration: 1, trade: 'demolition' },
    { title: 'Plumbing Rough-in', type: 'task', duration: 2, trade: 'plumbing' },
    { title: 'Electrical Rough-in', type: 'task', duration: 1, trade: 'electrical' },
    { title: 'Tile Work', type: 'task', duration: 3, trade: 'tile' },
    { title: 'Fixture Installation', type: 'task', duration: 1, trade: 'plumbing' },
    { title: 'Final Touches', type: 'task', duration: 1, trade: 'general' }
  ]
};

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],

  addEvent: (event) => {
    set((state) => ({
      events: [...state.events, event]
    }));
  },

  updateEvent: (event) => {
    set((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e))
    }));
  },

  deleteEvent: (eventId) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== eventId)
    }));
  },

  getEventsByDate: (date) => {
    return get().events.filter((event) => {
      const eventDate = parseISO(event.start);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  },

  getEventsByDateRange: (start: Date, end: Date) => {
    return get().events.filter((event) => {
      const eventDate = parseISO(event.start);
      return eventDate >= start && eventDate <= end;
    });
  },

  generateAIRecommendations: (projectType: string, startDate: Date) => {
    const template = aiTemplates[projectType.toLowerCase()];
    if (!template) return [];

    let currentDate = startDate;
    const generatedEvents: CalendarEvent[] = [];

    template.forEach((event, index) => {
      const newEvent: CalendarEvent = {
        id: `ai-${Date.now()}-${index}`,
        title: event.title!,
        start: currentDate.toISOString(),
        end: addDays(currentDate, event.duration!).toISOString(),
        type: event.type!,
        project: `AI Generated - ${projectType}`,
        trade: event.trade!,
        status: 'pending',
        priority: 'medium',
        aiGenerated: true,
        weatherSensitive: event.weatherSensitive
      };

      generatedEvents.push(newEvent);
      currentDate = addDays(currentDate, event.duration!);
    });

    return generatedEvents;
  }
}));