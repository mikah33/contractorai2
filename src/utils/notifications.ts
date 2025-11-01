// Notification utilities for calendar reminders

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers are not supported');
    return null;
  }

  try {
    // Check if service worker file exists before registering
    const response = await fetch('/sw.js', { method: 'HEAD' }).catch(() => null);

    if (!response || !response.ok) {
      console.warn('Service worker file not found, notifications will work without it');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.warn('Service Worker registration failed (non-critical):', error);
    return null;
  }
};

export const showNotification = async (
  title: string,
  options: {
    body: string;
    data?: any;
    tag?: string;
  }
) => {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    console.log('Notification permission denied');
    return;
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Use service worker to show notification
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body: options.body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      tag: options.tag || 'calendar-notification',
      requireInteraction: true,
      data: options.data || { url: '/calendar' }
    });
  } else {
    // Fallback to regular notification
    new Notification(title, {
      body: options.body,
      icon: '/logo.png',
      tag: options.tag || 'calendar-notification',
    });
  }
};

export const scheduleCalendarNotification = (
  eventTitle: string,
  eventDate: Date,
  reminderMinutes: number = 15
) => {
  const now = new Date();
  const reminderTime = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);
  const timeUntilReminder = reminderTime.getTime() - now.getTime();

  if (timeUntilReminder > 0) {
    // Format the reminder message based on time
    let message = '';
    if (reminderMinutes >= 1440) { // 1 day or more
      const days = Math.floor(reminderMinutes / 1440);
      message = `${eventTitle} starts in ${days} day${days > 1 ? 's' : ''}`;
    } else if (reminderMinutes >= 60) { // 1 hour or more
      const hours = Math.floor(reminderMinutes / 60);
      message = `${eventTitle} starts in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      message = `${eventTitle} starts in ${reminderMinutes} minute${reminderMinutes > 1 ? 's' : ''}`;
    }

    setTimeout(() => {
      showNotification('📅 Job Reminder', {
        body: message,
        tag: `event-${eventDate.getTime()}-${reminderMinutes}`,
        data: { url: '/calendar' }
      });
    }, timeUntilReminder);

    console.log(`Notification scheduled for ${eventTitle} at ${reminderTime}`);
    return true;
  }

  return false;
};

export const checkUpcomingEvents = async (events: any[]) => {
  const now = new Date();
  const upcomingWindow = 48 * 60 * 60 * 1000; // 48 hours (to catch 1 day before notifications)

  events.forEach((event) => {
    const eventDate = new Date(event.start_date || event.start);
    const timeUntilEvent = eventDate.getTime() - now.getTime();

    // Schedule notifications for events within the next 48 hours
    if (timeUntilEvent > 0 && timeUntilEvent < upcomingWindow) {
      // 1 day (24 hours) before
      const oneDayBefore = 24 * 60; // 1440 minutes
      if (timeUntilEvent > oneDayBefore * 60 * 1000) {
        scheduleCalendarNotification(event.title, eventDate, oneDayBefore);
      }

      // 1 hour before
      if (timeUntilEvent > 60 * 60 * 1000) {
        scheduleCalendarNotification(event.title, eventDate, 60);
      }
    }
  });
};
