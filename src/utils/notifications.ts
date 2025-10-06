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
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
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
    setTimeout(() => {
      showNotification('Upcoming Event', {
        body: `${eventTitle} starts in ${reminderMinutes} minutes`,
        tag: `event-${eventDate.getTime()}`,
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
  const upcomingWindow = 24 * 60 * 60 * 1000; // 24 hours

  events.forEach((event) => {
    const eventDate = new Date(event.start);
    const timeUntilEvent = eventDate.getTime() - now.getTime();

    // Schedule notifications for events within the next 24 hours
    if (timeUntilEvent > 0 && timeUntilEvent < upcomingWindow) {
      // 15 minutes before
      scheduleCalendarNotification(event.title, eventDate, 15);
      // 1 hour before
      scheduleCalendarNotification(event.title, eventDate, 60);
    }
  });
};
