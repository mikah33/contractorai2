import { useState, useEffect } from 'react';
import { X, Send, Clock, User, UserPlus, Calendar as CalendarIcon, Mail } from 'lucide-react';
import { CalendarEvent } from '../../services/calendarService';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface NotificationWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
}

interface EmailSlot {
  email: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

const NotificationWebhookModal = ({ isOpen, onClose, event }: NotificationWebhookModalProps) => {
  const { user } = useAuthStore();
  const [triggerTime, setTriggerTime] = useState('');
  const [message, setMessage] = useState('');
  const [emailSlots, setEmailSlots] = useState<EmailSlot[]>(
    Array(10).fill(null).map(() => ({ email: '', name: '' }))
  );
  const [isSending, setIsSending] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showNewEmployeeForm, setShowNewEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    role: ''
  });
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);

  // Calendar event configuration
  const [eventConfig, setEventConfig] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    eventType: '',
    status: ''
  });

  // Fetch employees when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const fetchEmployees = async () => {
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('user_id', user.id);

          if (error) throw error;
          if (data) setEmployees(data);
        } catch (error) {
          console.error('Error fetching employees:', error);
        }
      };

      fetchEmployees();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (event && isOpen) {
      // Populate event configuration from the selected event
      setEventConfig({
        title: event.title || '',
        description: event.description || '',
        location: event.location || '',
        startDate: event.start_date || '',
        endDate: event.end_date || '',
        eventType: event.event_type || '',
        status: event.status || ''
      });

      // Set default trigger time to 1 hour before event
      if (event.start_date) {
        const eventStart = new Date(event.start_date);
        const oneHourBefore = new Date(eventStart.getTime() - 60 * 60 * 1000);
        setTriggerTime(oneHourBefore.toISOString().slice(0, 16));
      }
    }
  }, [event, isOpen]);

  const handleEmailChange = (index: number, field: 'email' | 'name', value: string) => {
    const newSlots = [...emailSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setEmailSlots(newSlots);
  };

  const handleAddEmployee = () => {
    if (!selectedEmployee) return;

    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return;

    // Find first empty slot
    const emptySlotIndex = emailSlots.findIndex(slot => !slot.email);
    if (emptySlotIndex === -1) {
      alert('All email slots are full. Remove an email to add more.');
      return;
    }

    // Check if employee already added
    const alreadyAdded = emailSlots.some(slot => slot.email === employee.email);
    if (alreadyAdded) {
      alert('This employee is already added to the recipient list.');
      return;
    }

    const newSlots = [...emailSlots];
    newSlots[emptySlotIndex] = { email: employee.email, name: employee.name };
    setEmailSlots(newSlots);
    setSelectedEmployee('');
  };

  const handleCreateEmployee = async () => {
    if (!user) return;

    // Validate required fields
    if (!newEmployee.name.trim() || !newEmployee.email.trim()) {
      alert('Please enter both name and email for the new employee.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployee.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsCreatingEmployee(true);
    try {
      // Create new employee in database
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          user_id: user.id,
          name: newEmployee.name.trim(),
          email: newEmployee.email.trim(),
          phone: newEmployee.phone.trim() || null,
          role: newEmployee.role.trim() || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to local employees list
      setEmployees([...employees, data]);

      // Add to email slots immediately
      const emptySlotIndex = emailSlots.findIndex(slot => !slot.email);
      if (emptySlotIndex !== -1) {
        const newSlots = [...emailSlots];
        newSlots[emptySlotIndex] = { email: data.email, name: data.name };
        setEmailSlots(newSlots);
      }

      // Reset form and hide it
      setNewEmployee({ name: '', email: '', phone: '', role: '' });
      setShowNewEmployeeForm(false);

      alert('✅ Employee created and added to recipients!');
    } catch (error) {
      console.error('Error creating employee:', error);
      alert(`Failed to create employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const handleSendNotification = async (isTest = false) => {
    if (!event) return;

    setIsSending(true);
    try {
      // Filter out empty email slots
      const validEmails = emailSlots.filter(slot => slot.email.trim() !== '');

      const payload = {
        event: {
          id: event.id,
          title: eventConfig.title || event.title,
          description: eventConfig.description || event.description,
          start_date: eventConfig.startDate || event.start_date,
          end_date: eventConfig.endDate || event.end_date,
          location: eventConfig.location || event.location,
          event_type: eventConfig.eventType || event.event_type,
          status: eventConfig.status || event.status,
          project_id: event.project_id,
          client_id: event.client_id,
        },
        notification: {
          trigger_time: isTest ? new Date().toISOString() : triggerTime,
          message: message,
          recipients: validEmails.map(slot => ({
            email: slot.email,
            name: slot.name || slot.email.split('@')[0]
          })),
          is_test: isTest
        },
        timestamp: new Date().toISOString()
      };

      console.log('📤 Sending webhook payload:', payload);

      const response = await fetch('https://contractorai.app.n8n.cloud/webhook/110a2ba9-93f2-4574-b2f6-3dc1d2f69637', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log('📥 Webhook response:', response.status, responseText);

      if (response.ok) {
        alert(isTest ? '✅ Test notification sent successfully! Check console for details.' : 'Notification scheduled successfully!');
        if (!isTest) {
          onClose();
        }
      } else {
        throw new Error(`Failed to send notification: ${response.status} ${responseText}`);
      }
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      alert(`Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                Send Notification for: {event.title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Calendar Event Configuration */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Calendar Event Details (editable)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={eventConfig.title}
                      onChange={(e) => setEventConfig({ ...eventConfig, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Event title..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={eventConfig.startDate.slice(0, 16)}
                      onChange={(e) => setEventConfig({ ...eventConfig, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={eventConfig.endDate.slice(0, 16)}
                      onChange={(e) => setEventConfig({ ...eventConfig, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={eventConfig.location}
                      onChange={(e) => setEventConfig({ ...eventConfig, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Event location..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Event Type
                    </label>
                    <select
                      value={eventConfig.eventType}
                      onChange={(e) => setEventConfig({ ...eventConfig, eventType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="task">Task</option>
                      <option value="milestone">Milestone</option>
                      <option value="meeting">Meeting</option>
                      <option value="delivery">Delivery</option>
                      <option value="inspection">Inspection</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={eventConfig.status}
                      onChange={(e) => setEventConfig({ ...eventConfig, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={eventConfig.description}
                      onChange={(e) => setEventConfig({ ...eventConfig, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Event description..."
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  These details will be sent in the notification. Edit them if needed.
                </p>
              </div>

              {/* Trigger Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Notification Trigger Time
                </label>
                <input
                  type="datetime-local"
                  value={triggerTime}
                  onChange={(e) => setTriggerTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">When to send the notification (separate from event time)</p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message for employees:
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Enter your message here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Employee Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employees as Recipients
                </label>

                {/* Employee Selection */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an employee to add...</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddEmployee}
                      disabled={!selectedEmployee}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {employees.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        No employees found. Create a new employee below.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Don't see who you're looking for?
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNewEmployeeForm(!showNewEmployeeForm)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      {showNewEmployeeForm ? 'Cancel' : 'Create New Employee'}
                    </button>
                  </div>
                </div>

                {/* New Employee Form */}
                {showNewEmployeeForm && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h5 className="text-sm font-semibold text-green-900 mb-3">Create New Employee</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          placeholder="John Doe"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={newEmployee.email}
                          onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                          placeholder="john@example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Phone (optional)
                        </label>
                        <input
                          type="tel"
                          value={newEmployee.phone}
                          onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                          placeholder="(555) 123-4567"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Role (optional)
                        </label>
                        <input
                          type="text"
                          value={newEmployee.role}
                          onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                          placeholder="Project Manager"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateEmployee}
                        disabled={isCreatingEmployee || !newEmployee.name.trim() || !newEmployee.email.trim()}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {isCreatingEmployee ? 'Creating...' : 'Create & Add to Recipients'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewEmployeeForm(false);
                          setNewEmployee({ name: '', email: '', phone: '', role: '' });
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      This employee will be saved to your account and automatically added to the recipient list.
                    </p>
                  </div>
                )}

                {/* Added Employees Display */}
                <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                  {emailSlots.filter(slot => slot.email).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No employees added yet. Select employees from the dropdown above.
                    </p>
                  ) : (
                    emailSlots
                      .filter(slot => slot.email)
                      .map((slot, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{slot.name}</p>
                              <p className="text-xs text-gray-500">{slot.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newSlots = [...emailSlots];
                              const actualIndex = emailSlots.findIndex(s => s.email === slot.email);
                              newSlots[actualIndex] = { email: '', name: '' };
                              setEmailSlots(newSlots);
                            }}
                            className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {emailSlots.filter(s => s.email).length} employee(s) added
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            <button
              onClick={() => handleSendNotification(false)}
              disabled={isSending || !triggerTime || emailSlots.every(s => !s.email)}
              className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? 'Sending...' : 'Schedule Notification'}
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationWebhookModal;
