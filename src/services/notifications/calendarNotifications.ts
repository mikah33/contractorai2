/**
 * Calendar-specific notification handlers
 */

import { notificationService } from './notificationService';
import type {
  CalendarEventNotification,
  AppointmentReminder,
} from './notificationTypes';

class CalendarNotifications {
  /**
   * Create notifications for a calendar event with multiple reminders
   */
  async createEventNotifications(event: CalendarEventNotification): Promise<void> {
    try {
      const notifications = event.reminders.map(async (reminder) => {
        const notificationId = `${event.eventId}-${reminder.minutes}`;

        await notificationService.scheduleCalendarReminder({
          id: notificationId,
          title: event.title,
          body: this.formatEventBody(event),
          scheduleAt: event.startTime,
          reminderMinutes: reminder.minutes,
          data: {
            eventId: event.eventId,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime?.toISOString(),
            location: event.location,
          },
        });
      });

      await Promise.all(notifications);
      console.log(`Created ${event.reminders.length} notifications for event ${event.eventId}`);
    } catch (error) {
      console.error('Failed to create event notifications:', error);
      throw error;
    }
  }

  /**
   * Create appointment-specific reminders
   */
  async createAppointmentReminders(appointment: AppointmentReminder): Promise<void> {
    try {
      // Default reminders if none provided
      const reminders = appointment.reminders.length > 0
        ? appointment.reminders
        : [
            { minutes: 60 },  // 1 hour before
            { minutes: 15 },  // 15 minutes before
          ];

      await this.createEventNotifications({
        ...appointment,
        reminders,
      });
    } catch (error) {
      console.error('Failed to create appointment reminders:', error);
      throw error;
    }
  }

  /**
   * Cancel all notifications for a specific event
   */
  async cancelEventNotifications(eventId: string): Promise<void> {
    try {
      // Get all pending notifications
      const pending = await notificationService.getPendingNotifications();

      // Filter notifications for this event
      const eventNotifications = pending.filter(n =>
        n.extra?.eventId === eventId || n.id.startsWith(eventId)
      );

      if (eventNotifications.length > 0) {
        const ids = eventNotifications.map(n => n.id);
        await notificationService.cancelNotifications(ids);
        console.log(`Cancelled ${ids.length} notifications for event ${eventId}`);
      }
    } catch (error) {
      console.error('Failed to cancel event notifications:', error);
      throw error;
    }
  }

  /**
   * Update event notifications (cancel old, create new)
   */
  async updateEventNotifications(event: CalendarEventNotification): Promise<void> {
    try {
      await this.cancelEventNotifications(event.eventId);
      await this.createEventNotifications(event);
    } catch (error) {
      console.error('Failed to update event notifications:', error);
      throw error;
    }
  }

  /**
   * Get all pending notifications for events
   */
  async getEventNotifications(eventId?: string): Promise<any[]> {
    try {
      const pending = await notificationService.getPendingNotifications();

      if (eventId) {
        return pending.filter(n =>
          n.extra?.eventId === eventId || n.id.startsWith(eventId)
        );
      }

      return pending.filter(n => n.extra?.type === 'calendar_event');
    } catch (error) {
      console.error('Failed to get event notifications:', error);
      return [];
    }
  }

  /**
   * Create recurring event notifications
   * For events that repeat (daily, weekly, monthly)
   */
  async createRecurringEventNotifications(
    event: CalendarEventNotification,
    occurrences: Date[]
  ): Promise<void> {
    try {
      const allNotifications = occurrences.flatMap((occurrence, index) => {
        return event.reminders.map(async (reminder) => {
          const notificationId = `${event.eventId}-${index}-${reminder.minutes}`;

          await notificationService.scheduleCalendarReminder({
            id: notificationId,
            title: event.title,
            body: this.formatEventBody(event),
            scheduleAt: occurrence,
            reminderMinutes: reminder.minutes,
            data: {
              eventId: event.eventId,
              occurrenceIndex: index,
              startTime: occurrence.toISOString(),
              location: event.location,
            },
          });
        });
      });

      await Promise.all(allNotifications);
      console.log(`Created notifications for ${occurrences.length} occurrences of event ${event.eventId}`);
    } catch (error) {
      console.error('Failed to create recurring event notifications:', error);
      throw error;
    }
  }

  /**
   * Format event body text for notification
   */
  private formatEventBody(event: CalendarEventNotification): string {
    let body = '';

    if (event.description) {
      body += event.description;
    }

    if (event.location) {
      body += body ? ` • ${event.location}` : event.location;
    }

    if (event.startTime) {
      const timeStr = event.startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      body += body ? ` • ${timeStr}` : timeStr;
    }

    return body || 'Upcoming event';
  }

  /**
   * Create smart reminders based on event type and time
   */
  async createSmartReminders(event: CalendarEventNotification): Promise<void> {
    try {
      const now = new Date();
      const eventTime = new Date(event.startTime);
      const hoursUntilEvent = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      let reminders: { minutes: number }[] = [];

      if (hoursUntilEvent > 24) {
        // Event more than 24 hours away
        reminders = [
          { minutes: 1440 }, // 1 day before
          { minutes: 180 },  // 3 hours before
          { minutes: 30 },   // 30 minutes before
        ];
      } else if (hoursUntilEvent > 3) {
        // Event within 24 hours
        reminders = [
          { minutes: 60 },   // 1 hour before
          { minutes: 15 },   // 15 minutes before
        ];
      } else if (hoursUntilEvent > 0.25) {
        // Event within 3 hours
        reminders = [
          { minutes: 15 },   // 15 minutes before
        ];
      }

      await this.createEventNotifications({
        ...event,
        reminders,
      });
    } catch (error) {
      console.error('Failed to create smart reminders:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const calendarNotifications = new CalendarNotifications();
