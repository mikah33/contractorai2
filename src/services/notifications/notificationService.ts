/**
 * Notification Service for ContractorAI
 * Handles local and push notifications
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import type {
  NotificationPermissionStatus,
  CalendarReminderOptions,
  ScheduledNotification,
  NotificationReceived,
  PushNotificationToken,
  TaskDeadlineNotification,
  InvoiceReminderNotification,
} from './notificationTypes';

class NotificationService {
  private isNativePlatform: boolean;
  private listeners: Map<string, (notification: NotificationReceived) => void> = new Map();

  constructor() {
    this.isNativePlatform = Capacitor.isNativePlatform();
    this.initialize();
  }

  /**
   * Initialize notification service
   */
  private async initialize() {
    if (!this.isNativePlatform) {
      console.log('Not on native platform - notifications limited');
      return;
    }

    try {
      // Register for local notifications
      await LocalNotifications.requestPermissions();

      // Set up listeners
      await this.setupListeners();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  /**
   * Set up notification event listeners
   */
  private async setupListeners() {
    // Local notification received
    await LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Local notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Local notification clicked/opened
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('Local notification action:', action);
      this.handleNotificationAction(action);
    });

    // Push notification registration
    await PushNotifications.addListener('registration', (token) => {
      console.log('Push notification token:', token.value);
      this.handlePushTokenRegistration(token);
    });

    // Push notification received
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      this.handlePushNotificationReceived(notification);
    });

    // Push notification action
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push notification action:', action);
      this.handlePushNotificationAction(action);
    });
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const localPerms = await LocalNotifications.requestPermissions();

      // Also request push notification permissions if native
      if (this.isNativePlatform) {
        const pushPerms = await PushNotifications.requestPermissions();

        // Register for push notifications if granted
        if (pushPerms.receive === 'granted') {
          await PushNotifications.register();
        }
      }

      return {
        receive: localPerms.display,
        display: localPerms.display,
      };
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return {
        receive: 'denied',
        display: 'denied',
      };
    }
  }

  /**
   * Check notification permissions status
   */
  async checkPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const perms = await LocalNotifications.checkPermissions();
      return {
        receive: perms.display,
        display: perms.display,
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return {
        receive: 'denied',
        display: 'denied',
      };
    }
  }

  /**
   * Schedule a calendar reminder notification
   */
  async scheduleCalendarReminder(options: CalendarReminderOptions): Promise<void> {
    try {
      // Calculate notification time (event time - reminder minutes)
      const notificationTime = new Date(options.scheduleAt);
      notificationTime.setMinutes(notificationTime.getMinutes() - options.reminderMinutes);

      // Don't schedule if time is in the past
      if (notificationTime <= new Date()) {
        console.warn('Notification time is in the past, skipping schedule');
        return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: parseInt(options.id.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 1000000),
            title: options.title,
            body: options.body,
            schedule: {
              at: notificationTime,
            },
            extra: {
              ...options.data,
              type: 'calendar_event',
              eventTime: options.scheduleAt.toISOString(),
            },
            sound: 'default',
            smallIcon: 'ic_stat_icon_config_sample',
          },
        ],
      });

      console.log(`Scheduled notification for ${notificationTime.toLocaleString()}`);
    } catch (error) {
      console.error('Failed to schedule calendar reminder:', error);
      throw error;
    }
  }

  /**
   * Schedule an immediate test notification
   */
  async scheduleImmediateNotification(options: { title: string; body: string; id: string }): Promise<void> {
    try {
      const notificationId = parseInt(options.id.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 1000000);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: options.title,
            body: options.body,
            schedule: {
              at: new Date(Date.now() + 1000), // 1 second from now
            },
            sound: 'default',
          },
        ],
      });

      console.log('Scheduled immediate notification');
    } catch (error) {
      console.error('Failed to schedule immediate notification:', error);
      throw error;
    }
  }

  /**
   * Schedule task deadline notification
   */
  async scheduleTaskDeadline(options: TaskDeadlineNotification): Promise<void> {
    try {
      // Notify 1 hour before deadline
      const notificationTime = new Date(options.dueDate);
      notificationTime.setHours(notificationTime.getHours() - 1);

      if (notificationTime <= new Date()) {
        console.warn('Task deadline notification time is in the past');
        return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: parseInt(options.taskId.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 1000000),
            title: options.title,
            body: options.body,
            schedule: {
              at: notificationTime,
            },
            extra: {
              type: 'task_deadline',
              taskId: options.taskId,
              priority: options.priority,
            },
            sound: 'default',
          },
        ],
      });
    } catch (error) {
      console.error('Failed to schedule task deadline notification:', error);
      throw error;
    }
  }

  /**
   * Schedule invoice reminder notification
   */
  async scheduleInvoiceReminder(options: InvoiceReminderNotification): Promise<void> {
    try {
      const daysBefore = options.daysBefore || 3;
      const notificationTime = new Date(options.dueDate);
      notificationTime.setDate(notificationTime.getDate() - daysBefore);
      notificationTime.setHours(9, 0, 0, 0); // 9 AM on that day

      if (notificationTime <= new Date()) {
        console.warn('Invoice reminder time is in the past');
        return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: parseInt(options.invoiceId.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 1000000),
            title: `Invoice Due: ${options.clientName}`,
            body: `$${options.amount.toFixed(2)} due in ${daysBefore} days`,
            schedule: {
              at: notificationTime,
            },
            extra: {
              type: 'invoice_due',
              invoiceId: options.invoiceId,
              amount: options.amount,
            },
            sound: 'default',
          },
        ],
      });
    } catch (error) {
      console.error('Failed to schedule invoice reminder:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      const id = parseInt(notificationId.replace(/\D/g, '').slice(0, 9)) || 0;
      await LocalNotifications.cancel({
        notifications: [{ id }],
      });
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      throw error;
    }
  }

  /**
   * Cancel multiple notifications
   */
  async cancelNotifications(notificationIds: string[]): Promise<void> {
    try {
      const notifications = notificationIds.map(id => ({
        id: parseInt(id.replace(/\D/g, '').slice(0, 9)) || 0,
      }));

      await LocalNotifications.cancel({ notifications });
      console.log(`Cancelled ${notificationIds.length} notifications`);
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
      throw error;
    }
  }

  /**
   * Get all pending (scheduled) notifications
   */
  async getPendingNotifications(): Promise<ScheduledNotification[]> {
    try {
      const result = await LocalNotifications.getPending();
      return result.notifications.map(n => ({
        id: n.id.toString(),
        title: n.title || '',
        body: n.body || '',
        schedule: {
          at: new Date(n.schedule?.at || Date.now()),
        },
        extra: n.extra,
      }));
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }

  /**
   * Clear all delivered notifications from notification center
   */
  async clearDeliveredNotifications(): Promise<void> {
    try {
      const delivered = await LocalNotifications.getDeliveredNotifications();
      if (delivered.notifications.length > 0) {
        await LocalNotifications.removeDeliveredNotifications({
          notifications: delivered.notifications,
        });
      }
    } catch (error) {
      console.error('Failed to clear delivered notifications:', error);
    }
  }

  /**
   * Set app badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    if (!this.isNativePlatform) return;

    try {
      // Badge handling would be platform-specific
      // This is a placeholder for iOS badge management
      console.log(`Setting badge count to ${count}`);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  /**
   * Clear app badge
   */
  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Get device push notification token
   */
  async getDeviceToken(): Promise<PushNotificationToken | null> {
    if (!this.isNativePlatform) return null;

    try {
      // Token is received via the registration listener
      // This is just a placeholder to check registration status
      return null; // Token comes through the listener
    } catch (error) {
      console.error('Failed to get device token:', error);
      return null;
    }
  }

  /**
   * Add listener for notification events
   */
  addListener(eventName: string, callback: (notification: NotificationReceived) => void): void {
    this.listeners.set(eventName, callback);
  }

  /**
   * Remove listener
   */
  removeListener(eventName: string): void {
    this.listeners.delete(eventName);
  }

  // Private handler methods
  private handleNotificationReceived(notification: any): void {
    const received: NotificationReceived = {
      id: notification.id?.toString() || '',
      title: notification.title || '',
      body: notification.body || '',
      data: notification.extra || {},
    };

    this.listeners.get('received')?.call(null, received);
  }

  private handleNotificationAction(action: any): void {
    const received: NotificationReceived = {
      id: action.notification.id?.toString() || '',
      title: action.notification.title || '',
      body: action.notification.body || '',
      data: action.notification.extra || {},
      actionId: action.actionId,
    };

    this.listeners.get('action')?.call(null, received);
  }

  private handlePushTokenRegistration(token: any): void {
    // Store token for push notifications
    // You would typically send this to your backend
    console.log('Push token registered:', token.value);
    localStorage.setItem('push_token', token.value);
  }

  private handlePushNotificationReceived(notification: any): void {
    console.log('Push notification received (foreground):', notification);
  }

  private handlePushNotificationAction(action: any): void {
    console.log('Push notification action:', action);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
