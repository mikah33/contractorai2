/**
 * Notification Types for ContractorAI
 * Defines all notification-related types and interfaces
 */

export interface NotificationPermissionStatus {
  receive: 'granted' | 'denied' | 'prompt';
  display: 'granted' | 'denied' | 'prompt';
}

export interface CalendarReminderOptions {
  id: string;
  title: string;
  body: string;
  scheduleAt: Date;
  reminderMinutes: number; // How many minutes before event to remind
  data?: Record<string, any>;
}

export interface CalendarEventNotification {
  eventId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  reminders: ReminderTime[];
}

export interface ReminderTime {
  minutes: number; // Minutes before event
}

export interface AppointmentReminder extends CalendarEventNotification {
  appointmentId: string;
  clientName?: string;
  serviceType?: string;
}

export interface TaskDeadlineNotification {
  taskId: string;
  title: string;
  body: string;
  dueDate: Date;
  priority?: 'low' | 'medium' | 'high';
}

export interface InvoiceReminderNotification {
  invoiceId: string;
  clientName: string;
  amount: number;
  dueDate: Date;
  daysBefore?: number;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  schedule: {
    at: Date;
  };
  extra?: Record<string, any>;
}

export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
}

export interface NotificationWithActions extends ScheduledNotification {
  actions: NotificationAction[];
  categoryId: string;
}

export interface NotificationReceived {
  id: string;
  title: string;
  body: string;
  data: Record<string, any>;
  actionId?: string;
}

export type NotificationType =
  | 'calendar_event'
  | 'appointment'
  | 'task_deadline'
  | 'invoice_due'
  | 'project_update'
  | 'client_message'
  | 'system_alert';

export interface NotificationMetadata {
  type: NotificationType;
  entityId: string;
  timestamp: number;
  [key: string]: any;
}

// Push notification types
export interface PushNotificationToken {
  value: string;
  platform: 'ios' | 'android' | 'web';
}

export interface PushNotificationPayload {
  notification: {
    title: string;
    body: string;
    badge?: number;
    sound?: string;
    image?: string;
  };
  data: NotificationMetadata;
  token?: string;
}
