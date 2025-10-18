import { useState, useEffect } from 'react';
import { X, Trash2, Clock, Mail, AlertCircle } from 'lucide-react';
import { CalendarEvent } from '../../services/calendarService';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';

interface ManageNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
}

interface ScheduledNotification {
  id: string;
  recipient_email: string;
  recipient_name: string;
  event_title: string;
  trigger_time: string;
  message: string;
  status: string;
  created_at: string;
}

const ManageNotificationsModal = ({ isOpen, onClose, event }: ManageNotificationsModalProps) => {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingIds, setCancelingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && event) {
      fetchNotifications();
    }
  }, [isOpen, event]);

  const fetchNotifications = async () => {
    if (!event) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('event_title', event.title)
        .eq('status', 'pending')
        .order('trigger_time', { ascending: true });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      alert('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelNotification = async (id: string, recipientEmail: string) => {
    const confirmed = confirm(
      `Are you sure you want to cancel the notification for ${recipientEmail}?`
    );

    if (!confirmed) return;

    setCancelingIds(prev => new Set(prev).add(id));

    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== id));

      alert(`✅ Notification cancelled for ${recipientEmail}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
      alert(`Failed to cancel notification for ${recipientEmail}`);
    } finally {
      setCancelingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleCancelAll = async () => {
    const confirmed = confirm(
      `Are you sure you want to cancel ALL ${notifications.length} pending notifications for this event?`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('event_title', event!.title)
        .eq('status', 'pending');

      if (error) throw error;

      setNotifications([]);
      alert(`✅ All ${notifications.length} notifications cancelled`);
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
      alert('Failed to cancel notifications');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Manage Scheduled Notifications
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900">{event.title}</h4>
              <p className="text-xs text-blue-700 mt-1">
                Event Date: {format(parseISO(event.start_date), 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No pending notifications for this event</p>
                <p className="text-sm text-gray-500 mt-2">
                  Click the Bell icon to schedule notifications
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {notifications.length} pending notification{notifications.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={handleCancelAll}
                    className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Cancel All
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900">
                              {notification.recipient_name}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            {notification.recipient_email}
                          </div>
                          <div className="mt-2 flex items-center text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            Will send: {format(parseISO(notification.trigger_time), 'MMM d, yyyy h:mm a')}
                          </div>
                          {notification.message && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              Message: "{notification.message}"
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleCancelNotification(notification.id, notification.recipient_email)}
                          disabled={cancelingIds.has(notification.id)}
                          className="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cancel this notification"
                        >
                          {cancelingIds.has(notification.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageNotificationsModal;
