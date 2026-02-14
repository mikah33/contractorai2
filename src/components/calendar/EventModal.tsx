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
        <div className="fixed inset-0 bg-black/80 transition-opacity" onClick={onClose}></div>

        <div className="relative bg-[#1C1C1E] rounded-2xl shadow-xl max-w-2xl w-full mx-4 border border-[#3A3A3C]">
          <div className="flex items-center justify-between p-4 border-b border-[#3A3A3C]">
            <h3 className="text-lg font-semibold text-white">
              {event ? (isEditing ? 'Edit Event' : 'Event Details') : 'Add New Event'}
            </h3>
            <div className="flex items-center gap-2">
              {event && !isEditing && (
                <>
                  <button
                    onClick={() => setShowNotificationModal(true)}
                    className="text-green-500 hover:text-green-400 p-2 rounded-lg hover:bg-green-500/10"
                    title="Send Notification"
                  >
                    <Bell className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowManageNotificationsModal(true)}
                    className="text-blue-500 hover:text-blue-400 p-2 rounded-lg hover:bg-blue-500/10"
                    title="Manage Scheduled Notifications"
                  >
                    <BellOff className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-500 hover:text-blue-400 p-2 rounded-lg hover:bg-blue-500/10"
                    title="Edit Event"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10"
                    title="Delete Event"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Event Title</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                ) : (
                  <p className="text-white font-medium">{formData.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Start Date & Time</label>
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      value={formData.start}
                      onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  ) : (
                    <p className="text-white">{formData.start ? format(new Date(formData.start), 'PPp') : 'No date'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">End Date & Time</label>
                  {isEditing ? (
                    <input
                      type="datetime-local"
                      value={formData.end}
                      onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  ) : (
                    <p className="text-white">{formData.end ? format(new Date(formData.end), 'PPp') : 'No date'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Event Type</label>
                  {isEditing ? (
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="task">Task</option>
                      <option value="milestone">Milestone</option>
                      <option value="meeting">Meeting</option>
                      <option value="delivery">Delivery</option>
                      <option value="inspection">Inspection</option>
                    </select>
                  ) : (
                    <p className="text-white capitalize">{formData.type}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Status</label>
                  {isEditing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  ) : (
                    <p className="text-white capitalize">{formData.status.replace('_', ' ')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Location</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 123 Main St, City, State"
                  />
                ) : (
                  <div>
                    {formData.location ? (
                      <MapLink address={formData.location} className="text-sm" />
                    ) : (
                      <p className="text-zinc-500 text-sm">No location specified</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  ></textarea>
                ) : (
                  <p className="text-white whitespace-pre-wrap">{formData.description || 'No description provided'}</p>
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
                      className="h-4 w-4 text-blue-600 bg-[#2C2C2E] border-[#3A3A3C] rounded focus:ring-blue-500"
                    />
                    <label htmlFor="weatherSensitive" className="ml-2 block text-sm text-zinc-300">
                      Weather Sensitive Task
                    </label>
                  </>
                ) : (
                  <p className="text-sm text-zinc-300">
                    {formData.weatherSensitive ? '🌦️ Weather Sensitive Task' : 'Not weather sensitive'}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-sm font-medium text-white hover:bg-[#3A3A3C] transition-colors"
              >
                {isEditing ? 'Cancel' : 'Close'}
              </button>
              {isEditing && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors"
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