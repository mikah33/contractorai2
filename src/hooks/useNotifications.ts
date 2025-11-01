/**
 * React Hook for Notifications
 * Provides easy access to notification functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notifications/notificationService';
import { calendarNotifications } from '../services/notifications/calendarNotifications';
import type {
  NotificationPermissionStatus,
  CalendarReminderOptions,
  CalendarEventNotification,
  NotificationReceived,
} from '../services/notifications/notificationTypes';

export function useNotifications() {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    receive: 'prompt',
    display: 'prompt',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<NotificationReceived | null>(null);

  // Check initial permission status
  useEffect(() => {
    checkPermissionStatus();
    setupListeners();
  }, []);

  const checkPermissionStatus = useCallback(async () => {
    try {
      const status = await notificationService.checkPermissions();
      setPermissionStatus(status);
      setHasPermission(status.display === 'granted');
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
    }
  }, []);

  const setupListeners = useCallback(() => {
    // Listen for notification received events
    notificationService.addListener('received', (notification: NotificationReceived) => {
      setLastNotification(notification);
    });

    // Listen for notification action events
    notificationService.addListener('action', (notification: NotificationReceived) => {
      setLastNotification(notification);
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const status = await notificationService.requestPermissions();
      setPermissionStatus(status);
      const granted = status.display === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scheduleReminder = useCallback(async (options: CalendarReminderOptions): Promise<void> => {
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    setIsLoading(true);
    try {
      await notificationService.scheduleCalendarReminder(options);
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission]);

  const scheduleEventNotifications = useCallback(
    async (event: CalendarEventNotification): Promise<void> => {
      if (!hasPermission) {
        throw new Error('Notification permission not granted');
      }

      setIsLoading(true);
      try {
        await calendarNotifications.createEventNotifications(event);
      } catch (error) {
        console.error('Failed to schedule event notifications:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [hasPermission]
  );

  const cancelEventNotifications = useCallback(async (eventId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await calendarNotifications.cancelEventNotifications(eventId);
    } catch (error) {
      console.error('Failed to cancel event notifications:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPendingNotifications = useCallback(async () => {
    try {
      return await notificationService.getPendingNotifications();
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }, []);

  const clearAllNotifications = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await notificationService.clearDeliveredNotifications();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testNotification = useCallback(async (): Promise<void> => {
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    try {
      await notificationService.scheduleImmediateNotification({
        id: 'test-notification',
        title: 'Test Notification',
        body: 'This is a test notification from ContractorAI',
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }, [hasPermission]);

  return {
    // State
    hasPermission,
    permissionStatus,
    isLoading,
    lastNotification,

    // Methods
    requestPermission,
    scheduleReminder,
    scheduleEventNotifications,
    cancelEventNotifications,
    getPendingNotifications,
    clearAllNotifications,
    testNotification,
    checkPermissionStatus,
  };
}

// Hook for notification badge management
export function useNotificationBadge() {
  const [badgeCount, setBadgeCount] = useState<number>(0);

  const updateBadge = useCallback(async (count: number) => {
    try {
      await notificationService.setBadgeCount(count);
      setBadgeCount(count);
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    try {
      await notificationService.clearBadge();
      setBadgeCount(0);
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  }, []);

  const incrementBadge = useCallback(async () => {
    const newCount = badgeCount + 1;
    await updateBadge(newCount);
  }, [badgeCount, updateBadge]);

  return {
    badgeCount,
    updateBadge,
    clearBadge,
    incrementBadge,
  };
}
