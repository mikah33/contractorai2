import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, Users, FileText, AlertTriangle, Trash2, Edit3, Bell, BellOff } from 'lucide-react';
import { useCalendarStoreSupabase } from '../../stores/calendarStoreSupabase';
import { CalendarEvent } from '../../services/calendarService';
import { format, parseISO } from 'date-fns';
import MapLink from '../common/MapLink';
import NotificationWebhookModal from './NotificationWebhookModal';
import ManageNotificationsModal from './ManageNotificationsModal';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  event?: CalendarEvent | null;
}

const EventModal = ({ isOpen, onClose, selectedDate, event }: EventModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showManageNotificationsModal, setShowManageNotificationsModal] = useState(false);

  // Helper function to set time to 9:00 AM (using local time)
  const getDefaultStartTime = (date?: Date) => {
    if (!date) return '';
    const newDate = new Date(date);
    newDate.setHours(9, 0, 0, 0);

    // Format as local datetime-local format: YYYY-MM-DDTHH:mm
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const hours = String(newDate.getHours()).padStart(2, '0');
    const minutes = String(newDate.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to set time to 10:00 AM (1 hour after start, using local time)
  const getDefaultEndTime = (date?: Date) => {
    if (!date) return '';
    const newDate = new Date(date);
    newDate.setHours(10, 0, 0, 0);

    // Format as local datetime-local format: YYYY-MM-DDTHH:mm
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    const hours = String(newDate.getHours()).padStart(2, '0');
    const minutes = String(newDate.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: getDefaultStartTime(selectedDate),
    end: getDefaultEndTime(selectedDate),
    type: 'task',
    status: 'pending',
    weatherSensitive: false,
    location: ''
  });

  const { addEvent, updateEvent, deleteEvent } = useCalendarStoreSupabase();

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      try {
        // Ensure we have valid date strings
        const startDate = event.start_date || '';
        const endDate = event.end_date || event.start_date || '';

        setFormData({
          title: event.title || '',
          description: event.description || '',
          start: startDate.slice(0, 16),
          end: endDate.slice(0, 16),
          type: event.event_type || 'task',
          status: event.status || 'pending',
          weatherSensitive: event.weather_sensitive || false,
          location: event.location || ''
        });
        setIsEditing(false); // Start in view mode
      } catch (error) {
        console.error('Error initializing event data:', error);
        console.error('Event data:', event);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        start: getDefaultStartTime(selectedDate),
        end: getDefaultEndTime(selectedDate),
        type: 'task',
        status: 'pending',
        weatherSensitive: false,
        location: ''
      });
      setIsEditing(true); // New event starts in edit mode
    }
  }, [event, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (event) {
      // Update existing event
      await updateEvent(event.id, {
        title: formData.title,
        description: formData.description,
        start_date: formData.start,
        end_date: formData.end,
        event_type: formData.type as any,
        status: formData.status as any,
        weather_sensitive: formData.weatherSensitive,
        location: formData.location
      });
    } else {
      // Create new event
      const newEvent = {
        title: formData.title,
        description: formData.description,
        start_date: formData.start,
        end_date: formData.end,
        event_type: formData.type as any,
        status: formData.status as any,
        weather_sensitive: formData.weatherSensitive,
        location: formData.location
      };
      await addEvent(newEvent);
    }

    onClose();
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (event && window.confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(event.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              {event ? (isEditing ? 'Edit Event' : 'Event Details') : 'Add New Event'}
            </h3>
            <div className="flex items-center gap-2">
              {event && !isEditing && (
                <>
                  <button
                    onClick={() => setShowNotificationModal(true)}
                    className="text-green-600 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full p-1"
                    title="Send Notification"
                  >
                    <Bell className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowManageNotificationsModal(true)}
                    className="text-orange-600 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-full p-1"
                    title="Manage Scheduled Notifications"
                  >
                    <BellOff className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
                    title="Edit Event"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full p-1"
                    title="Delete Event"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Title</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                ) : (
                  <p className="mt-1 text-gray-900 font-medium">{formData.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date & Time</label>
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      value={formData.start}
                      onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{formData.start ? format(new Date(formData.start), 'PPp') : 'No date'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date & Time</label>
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      value={formData.end}
                      onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{formData.end ? format(new Date(formData.end), 'PPp') : 'No date'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                  {isEditing ? (
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="task">Task</option>
                      <option value="milestone">Milestone</option>
                      <option value="meeting">Meeting</option>
                      <option value="delivery">Delivery</option>
                      <option value="inspection">Inspection</option>
                    </select>
                  ) : (
                    <p className="mt-1 text-gray-900 capitalize">{formData.type}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  {isEditing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  ) : (
                    <p className="mt-1 text-gray-900 capitalize">{formData.status.replace('_', ' ')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., 123 Main St, City, State or Client's Office"
                  />
                ) : (
                  <div className="mt-1">
                    {formData.location ? (
                      <MapLink address={formData.location} className="text-sm" />
                    ) : (
                      <p className="text-gray-400 text-sm">No location specified</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  ></textarea>
                ) : (
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{formData.description || 'No description provided'}</p>
                )}
              </div>

              <div className="flex items-center">
                {isEditing ? (
                  <>
                    <input
                      type="checkbox"
                      id="weatherSensitive"
                      checked={formData.weatherSensitive}
                      onChange={(e) => setFormData({ ...formData, weatherSensitive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="weatherSensitive" className="ml-2 block text-sm text-gray-700">
                      Weather Sensitive Task
                    </label>
                  </>
                ) : (
                  <p className="text-sm text-gray-700">
                    {formData.weatherSensitive ? '🌦️ Weather Sensitive Task' : 'Not weather sensitive'}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isEditing ? 'Cancel' : 'Close'}
              </button>
              {isEditing && (
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {event ? 'Save Changes' : 'Add Event'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <NotificationWebhookModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        event={event}
      />

      <ManageNotificationsModal
        isOpen={showManageNotificationsModal}
        onClose={() => setShowManageNotificationsModal(false)}
        event={event}
      />
    </div>
  );
};

export default EventModal;