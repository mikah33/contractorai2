import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { requestNotificationPermission, registerServiceWorker } from '../../utils/notifications';

const NotificationBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and not already granted
    const checkNotificationStatus = () => {
      const hasSeenBanner = localStorage.getItem('notification-banner-dismissed');

      if (!hasSeenBanner && 'Notification' in window && Notification.permission === 'default') {
        setShowBanner(true);
      }
    };

    checkNotificationStatus();
  }, []);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();

    if (granted) {
      // Register service worker
      await registerServiceWorker();
      setShowBanner(false);
      localStorage.setItem('notification-banner-dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-fade-in">
      <div className="bg-blue-600 text-white rounded-lg shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Stay on Schedule</h3>
            <p className="text-sm text-blue-100 mb-3">
              Get notified 1 day and 1 hour before your jobs start. Never miss an appointment!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                className="px-4 py-2 bg-white text-blue-600 rounded-md font-medium hover:bg-blue-50 transition-colors text-sm"
              >
                Enable Notifications
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors text-sm"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;
