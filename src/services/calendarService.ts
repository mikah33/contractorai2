import { supabase } from '../lib/supabase';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  event_type: 'task' | 'meeting' | 'deadline' | 'milestone' | 'project_start' | 'project_end' | 'estimate_expires' | 'custom';
  status: 'pending' | 'completed' | 'cancelled';
  user_id: string;
  project_id?: string;
  estimate_id?: string;
  task_id?: string;
  weather_sensitive?: boolean;
  auto_generated?: boolean;
  created_at?: string;
}

export class CalendarService {
  // Fetch all events for a user
  static async fetchEvents(userId: string): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  // Fetch events within a date range
  static async fetchEventsByDateRange(userId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching calendar events by date range:', error);
      return [];
    }
  }

  // Create a new event
  static async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    try {
      let userId = event.user_id;

      // Try to get authenticated user first
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
        } else {
          // Fallback for development mode
          console.warn('No authenticated user, using development mode for calendar');
          userId = '00000000-0000-0000-0000-000000000000';
        }
      }

      const eventData = {
        ...event,
        user_id: userId,
        created_at: new Date().toISOString()
      };

      console.log('Creating event with data:', eventData);

      const { data, error } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating event:', error);
        throw error;
      }
      
      console.log('Event created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  // Update an existing event
  static async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  // Delete an event
  static async deleteEvent(eventId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  // Sync project dates to calendar
  static async syncProjectDates(projectId: string, projectData: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      console.log('Syncing project dates to calendar for project:', projectId, projectData);

      // Delete existing auto-generated events for this project
      await supabase
        .from('calendar_events')
        .delete()
        .eq('project_id', projectId)
        .eq('auto_generated', true);

      // Support both camelCase and snake_case
      const startDate = projectData.start_date || projectData.startDate;
      const endDate = projectData.end_date || projectData.endDate;
      const projectName = projectData.name || projectData.projectName;

      // Create project start event if start_date exists
      if (startDate) {
        console.log('Creating project start event:', startDate);
        await this.createEvent({
          title: `Project Start: ${projectName}`,
          start_date: startDate,
          event_type: 'project_start',
          status: 'pending',
          user_id: userId,
          project_id: projectId,
          auto_generated: true,
        });
      } else {
        console.log('No start date found for project');
      }

      // Create project deadline event if end_date exists
      if (endDate) {
        console.log('Creating project end event:', endDate);
        await this.createEvent({
          title: `Project Deadline: ${projectName}`,
          start_date: endDate,
          event_type: 'project_end',
          status: 'pending',
          user_id: userId,
          project_id: projectId,
          auto_generated: true,
        });
      } else {
        console.log('No end date found for project');
      }
    } catch (error) {
      console.error('Error syncing project dates:', error);
    }
  }

  // Sync estimate dates to calendar
  static async syncEstimateDates(estimateId: string, estimateData: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete existing auto-generated events for this estimate
      await supabase
        .from('calendar_events')
        .delete()
        .eq('estimate_id', estimateId)
        .eq('auto_generated', true);

      // Create estimate expiry event if expires_at exists
      if (estimateData.expires_at) {
        await this.createEvent({
          title: `Estimate Expires: ${estimateData.title}`,
          description: `Estimate for ${estimateData.client_name || 'Client'} expires`,
          start_date: estimateData.expires_at,
          event_type: 'estimate_expires',
          status: 'pending',
          estimate_id: estimateId,
          auto_generated: true,
        });

        // Create follow-up event 3 days before expiry
        const expiryDate = new Date(estimateData.expires_at);
        const followUpDate = new Date(expiryDate.getTime() - 3 * 24 * 60 * 60 * 1000);
        
        await this.createEvent({
          title: `Follow up: ${estimateData.title}`,
          description: `Follow up with ${estimateData.client_name || 'Client'} about estimate`,
          start_date: followUpDate.toISOString(),
          event_type: 'task',
          status: 'pending',
          estimate_id: estimateId,
          auto_generated: true,
        });
      }
    } catch (error) {
      console.error('Error syncing estimate dates:', error);
    }
  }

  // Sync task dates to calendar
  static async syncTaskDates(taskId: string, taskData: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete existing auto-generated events for this task
      await supabase
        .from('calendar_events')
        .delete()
        .eq('task_id', taskId)
        .eq('auto_generated', true);

      // Create task due date event if due_date exists
      if (taskData.due_date) {
        await this.createEvent({
          title: `Task Due: ${taskData.title}`,
          description: taskData.description || '',
          start_date: taskData.due_date,
          event_type: 'task',
          status: 'pending',
          task_id: taskId,
          project_id: taskData.project_id,
          auto_generated: true,
        });
      }
    } catch (error) {
      console.error('Error syncing task dates:', error);
    }
  }

  // Generate project milestones
  static async generateProjectMilestones(projectId: string, projectData: any): Promise<CalendarEvent[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const milestones: CalendarEvent[] = [];
      
      if (projectData.start_date && projectData.end_date) {
        const startDate = new Date(projectData.start_date);
        const endDate = new Date(projectData.end_date);
        const projectDuration = endDate.getTime() - startDate.getTime();
        const daysInProject = Math.ceil(projectDuration / (1000 * 60 * 60 * 24));

        // Create milestone at 25% completion
        const milestone25 = new Date(startDate.getTime() + projectDuration * 0.25);
        milestones.push({
          id: '',
          title: `${projectData.name} - 25% Milestone`,
          description: 'Project should be 25% complete',
          start_date: milestone25.toISOString(),
          event_type: 'milestone',
          status: 'pending',
          user_id: user.id,
          project_id: projectId,
          auto_generated: true,
        });

        // Create milestone at 50% completion
        const milestone50 = new Date(startDate.getTime() + projectDuration * 0.5);
        milestones.push({
          id: '',
          title: `${projectData.name} - 50% Milestone`,
          description: 'Project should be 50% complete',
          start_date: milestone50.toISOString(),
          event_type: 'milestone',
          status: 'pending',
          user_id: user.id,
          project_id: projectId,
          auto_generated: true,
        });

        // Create milestone at 75% completion
        const milestone75 = new Date(startDate.getTime() + projectDuration * 0.75);
        milestones.push({
          id: '',
          title: `${projectData.name} - 75% Milestone`,
          description: 'Project should be 75% complete',
          start_date: milestone75.toISOString(),
          event_type: 'milestone',
          status: 'pending',
          user_id: user.id,
          project_id: projectId,
          auto_generated: true,
        });

        // Create events for all milestones
        for (const milestone of milestones) {
          await this.createEvent(milestone);
        }
      }

      return milestones;
    } catch (error) {
      console.error('Error generating project milestones:', error);
      return [];
    }
  }

  // Get events by project
  static async getEventsByProject(projectId: string): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching events by project:', error);
      return [];
    }
  }

  // Get events by estimate
  static async getEventsByEstimate(estimateId: string): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching events by estimate:', error);
      return [];
    }
  }
}