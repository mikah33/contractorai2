import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Circle,
  AlertCircle,
  Briefcase,
  X,
  ChevronLeft,
  Filter,
  Bell,
  BellOff,
  Pencil,
  Trash2,
  Settings,
  Sparkles,
  User,
  Users,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Send,
  Calculator,
  Mail,
  Smartphone,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, isToday, isTomorrow, isPast, addMonths, subMonths, startOfMonth, endOfMonth, endOfWeek } from 'date-fns';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';
import useProjectStore from '../stores/projectStore';
import { useClientsStore } from '../stores/clientsStore';
import { useEmployeesStore } from '../stores/employeesStore';
// Finance store for future invoice creation
// import { useFinanceStore } from '../stores/financeStoreSupabase';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notifications/notificationService';
import AIChatPopup from '../components/ai/AIChatPopup';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';
import { estimateService } from '../services/estimateService';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  due_date: string | null;
  due_time?: string | null;
  priority: 'low' | 'medium' | 'high';
  project_id: string | null;
  project_name?: string;
  project_address?: string;
  client_id?: string | null;
  client_name?: string;
  assigned_employees?: string[];
  reminder_enabled?: boolean;
  reminder_minutes?: number;
  reminder_recipients?: 'self' | 'client' | 'employees' | 'all';
  reminder_email?: boolean;
  reminder_push?: boolean;
  estimate_id?: string | null;
  invoice_id?: string | null;
  send_invoice_on_complete?: boolean;
  line_items?: LineItem[];
}

interface TodoHubProps {
  embedded?: boolean;
  searchQuery?: string;
}

const TodoHub: React.FC<TodoHubProps> = ({ embedded = false, searchQuery: externalSearchQuery }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { events, fetchEvents } = useCalendarStoreSupabase();
  const { projects, fetchProjects, addProject } = useProjectStore();
  const { clients, fetchClients, addClient } = useClientsStore();
  const { employees, fetchEmployees } = useEmployeesStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue'>('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    due_date: '',
    due_time: '09:00',
    priority: 'medium' as 'low' | 'medium' | 'high',
    project_id: '',
    reminder_enabled: true,
    reminder_minutes: 60,
    reminder_recipients: 'self' as 'self' | 'client' | 'employees' | 'all',
    reminder_email: false,
    reminder_push: true,
    // New fields
    client_id: '',
    assigned_employees: [] as string[],
    line_items: [] as LineItem[],
    send_invoice_on_complete: false
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showEditTask, setShowEditTask] = useState(false);
  const [showQuickAddProject, setShowQuickAddProject] = useState(false);
  const [quickProjectName, setQuickProjectName] = useState('');
  // New state for enhanced form
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEmployeeSelect, setShowEmployeeSelect] = useState(false);
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [showLineItems, setShowLineItems] = useState(false);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false);
  const [completedTaskForInvoice, setCompletedTaskForInvoice] = useState<Task | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [showInlineAI, setShowInlineAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [editTask, setEditTask] = useState({
    title: '',
    due_date: '',
    due_time: '09:00',
    priority: 'medium' as 'low' | 'medium' | 'high',
    project_id: '',
    status: 'todo' as 'todo' | 'in-progress' | 'done',
    reminder_enabled: false,
    reminder_minutes: 60,
    reminder_recipients: 'self' as 'self' | 'client' | 'employees' | 'all',
    reminder_email: false,
    reminder_push: true,
    client_id: '',
    assigned_employees: [] as string[],
    line_items: [] as LineItem[],
    send_invoice_on_complete: false
  });
  const [showEditLineItems, setShowEditLineItems] = useState(false);
  const [editAiPrompt, setEditAiPrompt] = useState('');
  const [editAiLoading, setEditAiLoading] = useState(false);
  const [showEditInlineAI, setShowEditInlineAI] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editDatePickerMonth, setEditDatePickerMonth] = useState(new Date());
  // New Project modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectFormData, setNewProjectFormData] = useState({
    name: '',
    clientId: '',
    client: '',
    address: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
    status: 'active' as 'active' | 'completed' | 'on-hold'
  });
  const [npStartDatePicker, setNpStartDatePicker] = useState(false);
  const [npEndDatePicker, setNpEndDatePicker] = useState(false);
  const [npStartMonth, setNpStartMonth] = useState(new Date());
  const [npEndMonth, setNpEndMonth] = useState(new Date());
  const [showNpAddClient, setShowNpAddClient] = useState(false);
  const [npNewClient, setNpNewClient] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '' });

  useEffect(() => {
    fetchTasks();
    fetchEvents();
    fetchProjects();
    fetchClients();
    fetchEmployees();
  }, []);

  // Get user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Handle navigation from Projects to create task with project pre-selected
  useEffect(() => {
    const state = location.state as {
      openCreateTask?: boolean;
      preselectedProjectId?: string;
      preselectedProjectName?: string;
      returnTo?: string;
      returnProjectId?: string;
    } | null;

    if (state?.openCreateTask) {
      // Open the create task form
      setShowAddTask(true);

      // Pre-select the project if provided
      if (state.preselectedProjectId) {
        setNewTask(prev => ({
          ...prev,
          project_id: state.preselectedProjectId || ''
        }));
      }

      // Clear the navigation state so refreshing doesn't re-open
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleAIChat = () => {
    setShowAIChat(true);
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name, address)')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const mappedTasks = (data || []).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status as 'todo' | 'in-progress' | 'done',
        due_date: t.due_date,
        due_time: t.due_time,
        priority: (t.priority || 'medium') as 'low' | 'medium' | 'high',
        project_id: t.project_id,
        project_name: t.projects?.name,
        project_address: t.projects?.address,
        client_id: t.client_id,
        assigned_employees: t.assigned_employees || [],
        reminder_enabled: t.reminder_enabled || false,
        reminder_minutes: t.reminder_minutes || 60,
        reminder_recipients: t.reminder_recipients || 'self',
        reminder_email: t.reminder_email || false,
        reminder_push: t.reminder_push !== false,
        line_items: t.line_items || [],
        send_invoice_on_complete: t.send_invoice_on_complete || false
      }));

      setTasks(mappedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      alert('Please enter a task name');
      return;
    }

    if (!newTask.project_id) {
      alert('Please select a project for this task');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to add tasks');
        return;
      }

      // Combine date and time if both provided
      let dueDateTime = newTask.due_date || null;
      if (newTask.due_date && newTask.due_time) {
        dueDateTime = `${newTask.due_date}T${newTask.due_time}:00`;
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: newTask.title.trim(),
          due_date: dueDateTime,
          due_time: newTask.due_time || null,
          priority: newTask.priority,
          project_id: newTask.project_id || null,
          status: 'todo',
          client_id: newTask.client_id || null,
          assigned_employees: newTask.assigned_employees || [],
          reminder_enabled: newTask.reminder_enabled,
          reminder_minutes: newTask.reminder_minutes,
          reminder_recipients: newTask.reminder_recipients,
          reminder_email: newTask.reminder_email,
          reminder_push: newTask.reminder_push,
          line_items: newTask.line_items || []
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        alert('Error saving task: ' + error.message);
        throw error;
      }

      // Schedule push notification if enabled and there's a due date
      if (task && newTask.reminder_enabled && newTask.reminder_push && dueDateTime) {
        try {
          const dueDate = new Date(dueDateTime);

          // Only schedule if the due date is in the future
          if (dueDate > new Date()) {
            await notificationService.scheduleTaskDeadline({
              taskId: task.id,
              title: `Task Reminder: ${task.title}`,
              body: newTask.priority === 'high' ? '⚠️ High priority task due soon!' : 'Task due soon',
              dueDate,
              priority: newTask.priority,
              reminderMinutes: newTask.reminder_minutes
            });
            console.log('Task push notification scheduled for', newTask.reminder_minutes, 'minutes before');
          }
        } catch (notifError) {
          console.warn('Failed to schedule task notification:', notifError);
        }
      }

      // TODO: Schedule email notification if enabled
      // Email reminders will be handled by a backend cron job that checks
      // tasks with reminder_email=true and sends at the appropriate time

      // If task has line items and a project, also save as an estimate for that project
      if (task && newTask.line_items && newTask.line_items.length > 0 && newTask.project_id) {
        try {
          const project = projects.find(p => p.id === newTask.project_id);
          const subtotal = newTask.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
          const taxRate = 0;
          const taxAmount = subtotal * (taxRate / 100);
          const total = subtotal + taxAmount;

          // Generate a UUID for the estimate
          const estimateId = crypto.randomUUID();

          await estimateService.saveEstimate({
            id: estimateId,
            title: `Estimate for: ${task.title}`,
            projectId: newTask.project_id,
            projectName: project?.name || '',
            status: 'draft',
            items: newTask.line_items.map(item => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit || 'each',
              unitPrice: item.unit_price,
              total: item.quantity * item.unit_price
            })),
            subtotal,
            taxRate,
            taxAmount,
            total,
            createdAt: new Date().toISOString()
          });

          // Link the estimate to the task
          await supabase
            .from('tasks')
            .update({ estimate_id: estimateId })
            .eq('id', task.id);

          console.log('Estimate saved to project and linked to task:', estimateId);
        } catch (estError) {
          console.warn('Failed to save estimate to project:', estError);
        }
      }

      await fetchTasks();
      setShowAddTask(false);
      setShowAddClient(false);
      setShowEmployeeSelect(false);
      setShowLineItems(false);
      setNewTask({
        title: '',
        due_date: '',
        due_time: '09:00',
        priority: 'medium',
        project_id: '',
        reminder_enabled: true,
        reminder_minutes: 60,
        reminder_recipients: 'self',
        reminder_email: false,
        reminder_push: true,
        client_id: '',
        assigned_employees: [],
        line_items: [],
        send_invoice_on_complete: false
      });
    } catch (error: any) {
      console.error('Error adding task:', error);
      alert('Failed to add task: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleOpenEditTask = (task: Task) => {
    setSelectedTask(task);
    // Parse date and time
    let dateStr = '';
    let timeStr = '09:00';
    if (task.due_date) {
      const d = parseISO(task.due_date);
      dateStr = format(d, 'yyyy-MM-dd');
      // Use saved due_time if available, otherwise extract from due_date
      timeStr = task.due_time || format(d, 'HH:mm');
    }

    console.log('Loading task for edit:', {
      title: task.title,
      project_id: task.project_id,
      client_id: task.client_id,
      assigned_employees: task.assigned_employees,
      reminder_enabled: task.reminder_enabled,
      due_time: task.due_time
    });

    setEditTask({
      title: task.title,
      due_date: dateStr,
      due_time: timeStr,
      priority: task.priority,
      project_id: task.project_id || '',
      status: task.status,
      reminder_enabled: task.reminder_enabled || false,
      reminder_minutes: task.reminder_minutes || 60,
      reminder_recipients: task.reminder_recipients || 'self',
      reminder_email: task.reminder_email || false,
      reminder_push: task.reminder_push !== false,
      client_id: task.client_id || '',
      assigned_employees: task.assigned_employees || [],
      line_items: task.line_items || [],
      send_invoice_on_complete: task.send_invoice_on_complete || false
    });
    setShowEditLineItems(false);
    setShowEditInlineAI(false);
    setShowEditDatePicker(false);
    setEditDatePickerMonth(task.due_date ? parseISO(task.due_date) : new Date());
    setShowEditTask(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask || !editTask.title.trim()) {
      alert('Please enter a task name');
      return;
    }

    try {
      // Combine date and time
      let dueDateTime = null;
      if (editTask.due_date) {
        // Ensure time is in HH:mm format (no extra seconds)
        const timeStr = editTask.due_time.substring(0, 5);
        dueDateTime = `${editTask.due_date}T${timeStr}:00`;
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          title: editTask.title,
          due_date: dueDateTime,
          due_time: editTask.due_time || null,
          priority: editTask.priority,
          project_id: editTask.project_id || null,
          status: editTask.status,
          client_id: editTask.client_id || null,
          assigned_employees: editTask.assigned_employees || [],
          reminder_enabled: editTask.reminder_enabled,
          reminder_minutes: editTask.reminder_minutes,
          reminder_recipients: editTask.reminder_recipients,
          reminder_email: editTask.reminder_email,
          reminder_push: editTask.reminder_push,
          line_items: editTask.line_items || [],
          send_invoice_on_complete: editTask.send_invoice_on_complete
        })
        .eq('id', selectedTask.id);

      if (error) {
        alert('Error updating task: ' + error.message);
        throw error;
      }

      // If task has line items and a project, also save/update estimate for that project
      if (editTask.line_items && editTask.line_items.length > 0 && editTask.project_id) {
        try {
          const project = projects.find(p => p.id === editTask.project_id);
          const subtotal = editTask.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
          const taxRate = 0;
          const taxAmount = subtotal * (taxRate / 100);
          const total = subtotal + taxAmount;

          // Use existing estimate_id if task already has one, otherwise create new
          const estimateId = selectedTask.estimate_id || crypto.randomUUID();

          await estimateService.saveEstimate({
            id: estimateId,
            title: `Estimate for: ${editTask.title}`,
            projectId: editTask.project_id,
            projectName: project?.name || '',
            status: 'draft',
            items: editTask.line_items.map(item => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit || 'each',
              unitPrice: item.unit_price,
              total: item.quantity * item.unit_price
            })),
            subtotal,
            taxRate,
            taxAmount,
            total,
            createdAt: new Date().toISOString()
          });

          // Link the estimate to the task if not already linked
          if (!selectedTask.estimate_id) {
            await supabase
              .from('tasks')
              .update({ estimate_id: estimateId })
              .eq('id', selectedTask.id);
          }

          console.log('Estimate saved/updated for project:', editTask.project_id);
        } catch (estError) {
          console.warn('Failed to update estimate for project:', estError);
        }
      }

      setShowEditTask(false);
      setSelectedTask(null);
      await fetchTasks();
    } catch (error: any) {
      console.error('Error updating task:', error);
      alert('Failed to update task: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!window.confirm('Delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;

      setShowEditTask(false);
      setSelectedTask(null);
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (selectedDate) {
      filtered = filtered.filter(t =>
        t.due_date && isSameDay(parseISO(t.due_date), selectedDate)
      );
    } else {
      switch (filter) {
        case 'today':
          filtered = filtered.filter(t => t.due_date && isToday(parseISO(t.due_date)));
          break;
        case 'upcoming':
          filtered = filtered.filter(t => {
            if (!t.due_date) return false;
            const dueDate = parseISO(t.due_date);
            return !isPast(dueDate) || isToday(dueDate);
          });
          break;
        case 'overdue':
          filtered = filtered.filter(t => {
            if (!t.due_date || t.status === 'done') return false;
            return isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date));
          });
          break;
      }
    }

    return filtered;
  }, [tasks, filter, selectedDate]);

  // Calendar generation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  // Get tasks and events for a specific date
  const getItemsForDate = (date: Date) => {
    const taskCount = tasks.filter(t =>
      t.due_date && isSameDay(parseISO(t.due_date), date)
    ).length;

    const eventCount = events.filter(e =>
      e.start_date && isSameDay(parseISO(e.start_date), date)
    ).length;

    return { taskCount, eventCount };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-[#043d6b]" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return format(date, 'MMM d') + ' (Overdue)';
    return format(date, 'MMM d');
  };

  // Today's events
  const todayEvents = events.filter(e =>
    e.start_date && isToday(parseISO(e.start_date))
  );

  // Stats
  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const overdueCount = tasks.filter(t =>
    t.due_date && t.status !== 'done' && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
  ).length;
  const completedToday = tasks.filter(t =>
    t.status === 'done' && t.due_date && isToday(parseISO(t.due_date))
  ).length;

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} ${themeClasses.bg.primary} ${embedded ? '' : 'pb-40'}`}>
      {/* Header - hidden when embedded */}
      {!embedded && (
        <>
          <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
            <div className="pt-[env(safe-area-inset-top)]">
              <div className="px-4 pb-5 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#043d6b]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-7 h-7 text-[#043d6b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Tasks & Calendar</h1>
                      <p className={`text-base ${themeClasses.text.secondary}`}>{format(new Date(), 'EEEE, MMM d')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#043d6b] text-white rounded-lg font-medium hover:bg-[#035291] active:scale-95 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              <button
                onClick={() => { setFilter('all'); setSelectedDate(null); }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === 'all' && !selectedDate ? 'bg-[#043d6b]/20 text-[#043d6b]' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                onClick={() => { setFilter('today'); setSelectedDate(null); }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === 'today' && !selectedDate ? 'bg-[#043d6b]/20 text-[#043d6b]' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`
                }`}
              >
                Today ({tasks.filter(t => t.due_date && isToday(parseISO(t.due_date))).length})
              </button>
              {overdueCount > 0 && (
                <button
                  onClick={() => { setFilter('overdue'); setSelectedDate(null); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    filter === 'overdue' && !selectedDate ? 'bg-[#043d6b]/20 text-[#043d6b]' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`
                  }`}
                >
                  Overdue ({overdueCount})
                </button>
              )}
                </div>
              </div>
            </div>
          </div>
          {/* Spacer for fixed header */}
          <div className="pt-[calc(env(safe-area-inset-top)+155px)]" />
        </>
      )}

      {/* Content */}
      <div className={`px-4 pb-4 space-y-4 ${embedded ? '-mt-1' : 'pt-4'}`}>
        {/* Add Task Card */}
        <div className={`${themeClasses.bg.card} rounded-2xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-6 relative overflow-hidden`}>
          {/* Background decorations */}
          <div className="absolute -right-6 -top-6 w-44 h-44 bg-[#043d6b]/10 rounded-full" />
          <div className="absolute right-16 top-20 w-28 h-28 bg-[#043d6b]/5 rounded-full" />

          <div className="relative min-h-[240px] flex flex-col">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 bg-[#043d6b]/20 rounded-2xl flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-[#043d6b]" />
              </div>
              <div>
                <h3 className={`font-bold ${themeClasses.text.primary} text-xl`}>Add Task</h3>
                <p className={`${themeClasses.text.secondary} text-base`}>Stay organized & on schedule</p>
              </div>
            </div>

            <p className={`${themeClasses.text.secondary} italic text-base flex-1`}>
              Create tasks with due dates, priorities, and project assignments to keep your work on track.
            </p>

            <div className="mt-auto">
              <button
                onClick={() => setShowAddTask(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-[#043d6b] text-white rounded-2xl font-medium text-base hover:bg-[#035291] active:scale-[0.98] transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Task
              </button>
            </div>
          </div>
        </div>

        {/* Today's Events */}
        {todayEvents.length > 0 && !selectedDate && filter === 'all' && (
          <div className={`${themeClasses.bg.card} rounded-2xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} overflow-hidden`}>
            <div className={`flex items-center justify-between p-4 border-b ${themeClasses.border.primary}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#043d6b]/20 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4 text-[#043d6b]" />
                </div>
                <div>
                  <h2 className={`font-semibold ${themeClasses.text.primary}`}>Today's Events</h2>
                  <p className={`text-xs ${themeClasses.text.muted}`}>{todayEvents.length} scheduled</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/calendar')}
                className={`text-sm ${themeClasses.text.secondary} font-medium flex items-center gap-1`}
              >
                Calendar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className={`divide-y ${themeClasses.border.primary}`}>
              {todayEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#043d6b]/20 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-[#043d6b]" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${themeClasses.text.primary}`}>{event.title}</p>
                    {event.start_date && (
                      <p className={`text-sm ${themeClasses.text.secondary}`}>
                        {format(parseISO(event.start_date), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className={`${themeClasses.bg.card} rounded-2xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} overflow-hidden`}>
          <div className={`flex items-center justify-between p-4 border-b ${themeClasses.border.primary}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#043d6b]/20 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-[#043d6b]" />
              </div>
              <div>
                <h2 className={`font-semibold ${themeClasses.text.primary}`}>
                  {selectedDate ? format(selectedDate, 'MMM d') + ' Tasks' : 'Tasks'}
                </h2>
                <p className={`text-xs ${themeClasses.text.muted}`}>{filteredTasks.length} items</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'light' ? 'border-gray-900' : 'border-white'} mx-auto`}></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-6 text-center">
              <ClipboardList className={`w-10 h-10 ${themeClasses.text.muted} mx-auto mb-2`} />
              <p className={`${themeClasses.text.secondary} text-sm`}>No tasks found</p>
              <button
                onClick={() => setShowAddTask(true)}
                className={`mt-3 flex items-center gap-1 text-sm ${themeClasses.text.primary} font-medium mx-auto`}
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          ) : (
            <div className={`divide-y ${themeClasses.border.primary}`}>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 flex items-start gap-3 ${themeClasses.hover.bg} cursor-pointer`}
                  onClick={() => handleOpenEditTask(task)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task.id, task.status);
                    }}
                    className="mt-0.5"
                  >
                    {getStatusIcon(task.status)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.status === 'done' ? `${themeClasses.text.muted} line-through` : themeClasses.text.primary}`}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {task.due_date && (
                        <span className={`text-xs ${
                          task.status !== 'done' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
                            ? 'text-red-400'
                            : themeClasses.text.muted
                        }`}>
                          {formatDueDate(task.due_date)}
                        </span>
                      )}
                      {task.project_name && (
                        <span className={`text-xs ${themeClasses.text.muted} flex items-center gap-1`}>
                          <Briefcase className="w-3 h-3" />
                          {task.project_name}
                        </span>
                      )}
                    </div>
                    {/* Clickable Address Box - below the Today/medium line */}
                    {task.project_address && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const encodedAddress = encodeURIComponent(task.project_address || '');
                          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                          const mapsUrl = isIOS
                            ? `maps://maps.apple.com/?q=${encodedAddress}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                          window.open(mapsUrl, '_blank');
                        }}
                        className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${theme === 'light' ? 'bg-[#043d6b]/10 text-[#043d6b] border border-[#043d6b]/20' : 'bg-[#043d6b]/15 text-[#043d6b] border border-[#043d6b]/30'} active:scale-[0.98] transition-transform`}
                      >
                        <MapPin className="w-4 h-4" />
                        <span>{task.project_address}</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </button>
                    )}
                  </div>
                  <Pencil className={`w-4 h-4 ${themeClasses.text.muted} flex-shrink-0 mt-1`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini Calendar */}
        <div className={`${themeClasses.bg.card} rounded-2xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-4`}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className={`p-2 rounded-lg ${themeClasses.hover.bg}`}
            >
              <ChevronLeft className={`w-5 h-5 ${themeClasses.text.secondary}`} />
            </button>
            <h3 className={`font-semibold ${themeClasses.text.primary}`}>
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className={`p-2 rounded-lg ${themeClasses.hover.bg}`}
            >
              <ChevronRight className={`w-5 h-5 ${themeClasses.text.secondary}`} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className={`text-center text-xs font-medium ${themeClasses.text.muted} py-1`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const { taskCount, eventCount } = getItemsForDate(day);
              const hasItems = taskCount > 0 || eventCount > 0;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-[#043d6b] text-white'
                      : isToday(day)
                      ? 'bg-[#043d6b]/20 text-[#043d6b] font-semibold'
                      : isCurrentMonth
                      ? `${themeClasses.text.primary} ${themeClasses.hover.bg}`
                      : themeClasses.text.muted
                  }`}
                >
                  {format(day, 'd')}
                  {hasItems && !isSelected && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {taskCount > 0 && <div className="w-1 h-1 rounded-full bg-[#043d6b]" />}
                      {eventCount > 0 && <div className={`w-1 h-1 rounded-full ${theme === 'light' ? 'bg-gray-400' : 'bg-zinc-400'}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className={`w-full mt-3 py-2 text-sm ${themeClasses.text.secondary} font-medium`}
            >
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowAddTask(false);
              setShowQuickAddProject(false);
              setQuickProjectName('');
            }}
          />
          <div className={`relative ${themeClasses.bg.secondary} rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-slide-up pb-32`}>
            <div className={`sticky top-0 ${themeClasses.bg.secondary} px-4 py-4 border-b ${themeClasses.border.primary} flex items-center justify-between z-10`}>
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setShowQuickAddProject(false);
                  setQuickProjectName('');
                }}
                className={`${themeClasses.text.secondary} text-base font-medium active:opacity-70`}
              >
                Cancel
              </button>
              <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>New Task</h2>
              <button
                onClick={handleAddTask}
                disabled={!newTask.title.trim()}
                className={`text-[#043d6b] text-base font-semibold active:text-[#035291] disabled:${themeClasses.text.muted}`}
              >
                Save
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                  Task Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} focus:border-[#043d6b] focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                  placeholder="What needs to be done?"
                />
              </div>

              {/* Date & Time Picker */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Due Date & Time</label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-[#043d6b]" />
                    <span className={newTask.due_date ? themeClasses.text.primary : themeClasses.text.muted}>
                      {newTask.due_date
                        ? `${format(parseISO(newTask.due_date), 'MMM d, yyyy')} at ${newTask.due_time}`
                        : 'Select date and time...'}
                    </span>
                  </div>
                  {showDatePicker ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showDatePicker && (
                  <div className={`mt-2 p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => setDatePickerMonth(subMonths(datePickerMonth, 1))}
                        className={`p-2 rounded-lg ${themeClasses.hover.bg}`}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className={`font-semibold ${themeClasses.text.primary}`}>
                        {format(datePickerMonth, 'MMMM yyyy')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDatePickerMonth(addMonths(datePickerMonth, 1))}
                        className={`p-2 rounded-lg ${themeClasses.hover.bg}`}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className={`text-center text-xs font-medium ${themeClasses.text.muted} py-1`}>
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const monthStart = startOfMonth(datePickerMonth);
                        const monthEnd = endOfMonth(datePickerMonth);
                        const startDate = startOfWeek(monthStart);
                        const endDate = endOfWeek(monthEnd);
                        const days = [];
                        let day = startDate;

                        while (day <= endDate) {
                          const currentDay = day;
                          const isCurrentMonth = currentDay.getMonth() === datePickerMonth.getMonth();
                          const isSelected = newTask.due_date && isSameDay(currentDay, parseISO(newTask.due_date));
                          const isTodays = isToday(currentDay);
                          const dayStr = format(currentDay, 'yyyy-MM-dd');

                          days.push(
                            <button
                              key={dayStr}
                              type="button"
                              onClick={() => {
                                setNewTask(prev => ({ ...prev, due_date: dayStr }));
                              }}
                              className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-[#043d6b] text-white font-semibold'
                                  : isTodays
                                    ? `${themeClasses.bg.tertiary} ${themeClasses.text.primary} font-semibold`
                                    : isCurrentMonth
                                      ? `${themeClasses.text.primary} ${themeClasses.hover.bg}`
                                      : `${themeClasses.text.muted} opacity-50`
                              }`}
                            >
                              {format(currentDay, 'd')}
                            </button>
                          );
                          day = addDays(day, 1);
                        }
                        return days;
                      })()}
                    </div>

                    {/* Quick Date Options */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-dashed" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#3f3f46' }}>
                      <button
                        type="button"
                        onClick={() => setNewTask(prev => ({ ...prev, due_date: format(new Date(), 'yyyy-MM-dd') }))}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg ${
                          newTask.due_date === format(new Date(), 'yyyy-MM-dd')
                            ? 'bg-[#043d6b] text-white'
                            : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTask(prev => ({ ...prev, due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd') }))}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg ${
                          newTask.due_date === format(addDays(new Date(), 1), 'yyyy-MM-dd')
                            ? 'bg-[#043d6b] text-white'
                            : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`
                        }`}
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTask(prev => ({ ...prev, due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd') }))}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg ${
                          newTask.due_date === format(addDays(new Date(), 7), 'yyyy-MM-dd')
                            ? 'bg-[#043d6b] text-white'
                            : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`
                        }`}
                      >
                        Next Week
                      </button>
                    </div>

                    {/* Time Picker */}
                    {newTask.due_date && (
                      <div className="mt-4 pt-3 border-t border-dashed" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#3f3f46' }}>
                        <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2`}>Select Time</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setNewTask(prev => ({ ...prev, due_time: time }))}
                              className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                                newTask.due_time === time
                                  ? 'bg-[#043d6b] text-white'
                                  : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} ${themeClasses.hover.bg}`
                              }`}
                            >
                              {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                            </button>
                          ))}
                        </div>
                        {/* Custom time input */}
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`text-xs ${themeClasses.text.muted}`}>Custom:</span>
                          <input
                            type="time"
                            value={newTask.due_time}
                            onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                            className={`flex-1 px-3 py-2 rounded-lg border ${themeClasses.border.input} ${themeClasses.bg.secondary} ${themeClasses.text.primary} text-sm`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reminder Section */}
              {newTask.due_date && (
                <div className={`${themeClasses.bg.input} rounded-xl p-4 space-y-4`}>
                  {/* Toggle Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {newTask.reminder_enabled ? (
                        <Bell className={`w-5 h-5 ${themeClasses.text.primary}`} />
                      ) : (
                        <BellOff className={`w-5 h-5 ${themeClasses.text.muted}`} />
                      )}
                      <div>
                        <p className={`font-medium ${themeClasses.text.primary}`}>Reminder</p>
                        <p className={`text-xs ${themeClasses.text.muted}`}>
                          {newTask.reminder_enabled
                            ? `${newTask.reminder_minutes >= 1440 ? `${Math.floor(newTask.reminder_minutes / 1440)} day${newTask.reminder_minutes >= 2880 ? 's' : ''}` : `${newTask.reminder_minutes} min`} before • ${newTask.reminder_recipients === 'self' ? 'Just me' : newTask.reminder_recipients === 'client' ? 'Client' : newTask.reminder_recipients === 'employees' ? 'Team' : 'Everyone'}`
                            : 'No notification'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newEnabled = !newTask.reminder_enabled;
                        setNewTask({ ...newTask, reminder_enabled: newEnabled });
                        if (newEnabled) setShowReminderOptions(true);
                      }}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        newTask.reminder_enabled ? 'bg-[#043d6b]' : theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full shadow transition-transform ${
                          newTask.reminder_enabled ? 'translate-x-6 bg-white' : theme === 'light' ? 'translate-x-1 bg-white' : 'translate-x-1 bg-zinc-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Expanded Options */}
                  {newTask.reminder_enabled && (
                    <div className="space-y-4 pt-2 border-t border-zinc-700/30">
                      {/* When to remind */}
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2`}>When to remind</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: '15 min', value: 15 },
                            { label: '30 min', value: 30 },
                            { label: '1 hour', value: 60 },
                            { label: '1 day', value: 1440 },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setNewTask({ ...newTask, reminder_minutes: opt.value })}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                newTask.reminder_minutes === opt.value
                                  ? 'bg-[#043d6b] text-white'
                                  : `${themeClasses.bg.secondary} ${themeClasses.text.secondary}`
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Who to notify */}
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2`}>Who to notify</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: 'Just me', value: 'self' as const },
                            { label: 'Client', value: 'client' as const, disabled: !newTask.client_id },
                            { label: 'Team', value: 'employees' as const, disabled: newTask.assigned_employees.length === 0 },
                            { label: 'Everyone', value: 'all' as const, disabled: !newTask.client_id && newTask.assigned_employees.length === 0 },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => !opt.disabled && setNewTask({ ...newTask, reminder_recipients: opt.value })}
                              disabled={opt.disabled}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                opt.disabled
                                  ? `${themeClasses.bg.secondary} ${themeClasses.text.muted} opacity-50 cursor-not-allowed`
                                  : newTask.reminder_recipients === opt.value
                                    ? 'bg-[#043d6b] text-white'
                                    : `${themeClasses.bg.secondary} ${themeClasses.text.secondary}`
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {(newTask.reminder_recipients !== 'self' && !newTask.client_id && newTask.assigned_employees.length === 0) && (
                          <p className={`text-xs ${themeClasses.text.muted} mt-1`}>Add a client or employees above to notify them</p>
                        )}
                      </div>

                      {/* How to notify */}
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2`}>How to notify</label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setNewTask({ ...newTask, reminder_push: !newTask.reminder_push })}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              newTask.reminder_push
                                ? 'bg-[#043d6b]/20 text-[#043d6b] border border-[#043d6b]/50'
                                : `${themeClasses.bg.secondary} ${themeClasses.text.secondary} border ${themeClasses.border.input}`
                            }`}
                          >
                            <Smartphone className="w-4 h-4" />
                            Push
                            {newTask.reminder_push && <Check className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewTask({ ...newTask, reminder_email: !newTask.reminder_email })}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              newTask.reminder_email
                                ? 'bg-[#043d6b]/20 text-[#043d6b] border border-[#043d6b]/50'
                                : `${themeClasses.bg.secondary} ${themeClasses.text.secondary} border ${themeClasses.border.input}`
                            }`}
                          >
                            <Mail className="w-4 h-4" />
                            Email
                            {newTask.reminder_email && <Check className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Project <span className="text-red-400">*</span></label>
                {!showQuickAddProject ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowProjectSelect(!showProjectSelect)}
                      className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} flex items-center justify-between`}
                    >
                      <span className={!newTask.project_id ? themeClasses.text.muted : ''}>
                        {newTask.project_id
                          ? projects.find(p => p.id === newTask.project_id)?.name
                          : 'Select a project...'}
                      </span>
                      {showProjectSelect ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {showProjectSelect && (
                      <div className={`absolute z-50 left-0 right-0 mt-1 ${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.input} shadow-lg max-h-48 overflow-y-auto`}>
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setNewTask({ ...newTask, project_id: p.id });
                              setShowProjectSelect(false);
                            }}
                            className={`w-full px-4 py-3 text-left ${themeClasses.text.primary} ${themeClasses.hover.bg} ${newTask.project_id === p.id ? 'bg-[#043d6b]/20' : ''}`}
                          >
                            {p.name}
                          </button>
                        ))}
                        {projects.length === 0 && (
                          <div className={`px-4 py-3 text-sm ${themeClasses.text.muted}`}>No projects found. Create one below.</div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowNewProjectModal(true)}
                      className="flex items-center gap-2 text-[#043d6b] text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Project
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickProjectName}
                        onChange={(e) => setQuickProjectName(e.target.value)}
                        className={`flex-1 px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.input} rounded-xl ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} focus:ring-2 focus:ring-[#043d6b] focus:border-transparent`}
                        placeholder="Enter project name..."
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (quickProjectName.trim()) {
                            try {
                              await addProject({
                                name: quickProjectName.trim(),
                                client: '',
                                status: 'active',
                                priority: 'medium',
                                startDate: new Date().toISOString().split('T')[0],
                                endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                                budget: 0,
                                description: ''
                              });
                              await fetchProjects();
                              // Find the newly created project and select it
                              const newProjects = useProjectStore.getState().projects;
                              const newProject = newProjects.find(p => p.name === quickProjectName.trim());
                              if (newProject) {
                                setNewTask(prev => ({ ...prev, project_id: newProject.id }));
                              }
                              setQuickProjectName('');
                              setShowQuickAddProject(false);
                            } catch (error) {
                              console.error('Error adding project:', error);
                              alert('Failed to create project');
                            }
                          }
                        }}
                        className="px-4 py-3 bg-[#043d6b] text-white rounded-xl font-medium active:bg-[#035291]"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickProjectName('');
                          setShowQuickAddProject(false);
                        }}
                        className="px-4 py-3 bg-zinc-700 text-white rounded-xl font-medium active:bg-zinc-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">Enter name and tap check to create project</p>
                  </div>
                )}
              </div>

              {/* Project Address Map */}
              {newTask.project_id && (() => {
                const selectedProject = projects.find(p => p.id === newTask.project_id);
                if (selectedProject?.address) {
                  return (
                    <div className={`${themeClasses.bg.secondary} border ${themeClasses.border.primary} rounded-xl overflow-hidden`}>
                      <div className="p-3 border-b border-zinc-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span className={`text-sm font-medium ${themeClasses.text.primary}`}>Job Location</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedProject.address)}`;
                            window.open(url, '_blank');
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-[#043d6b]/20 text-[#043d6b] rounded-lg text-xs font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </button>
                      </div>
                      <p className={`px-3 py-2 text-xs ${themeClasses.text.muted}`}>{selectedProject.address}</p>
                      <div className="h-32 bg-gray-100 overflow-hidden">
                        <iframe
                          src={`https://www.google.com/maps?q=${encodeURIComponent(selectedProject.address)}&output=embed&z=15`}
                          width="100%"
                          height="100%"
                          style={{ border: 0, maxWidth: '100%' }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Client Section */}
              <div className="relative">
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Client</label>
                {!showAddClient ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowClientSelect(!showClientSelect)}
                      className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} flex items-center justify-between`}
                    >
                      <span className={!newTask.client_id ? themeClasses.text.muted : ''}>
                        {newTask.client_id
                          ? (() => {
                              const client = clients.find(c => c.id === newTask.client_id);
                              if (!client) return 'Select a client (optional)...';
                              return client.name || (client.first_name || client.last_name)
                                ? (client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim())
                                : client.email || 'Unnamed Client';
                            })()
                          : 'Select a client (optional)...'}
                      </span>
                      {showClientSelect ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {showClientSelect && (
                      <div className={`absolute z-50 left-0 right-0 mt-1 ${themeClasses.bg.secondary} rounded-xl border ${themeClasses.border.input} shadow-lg max-h-60 overflow-y-auto`}>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTask({ ...newTask, client_id: '' });
                            setShowClientSelect(false);
                          }}
                          className={`w-full px-4 py-4 text-left text-base ${themeClasses.text.muted} ${themeClasses.hover.bg} ${!newTask.client_id ? 'bg-[#043d6b]/20' : ''}`}
                        >
                          No client selected
                        </button>
                        {clients.map((c) => {
                          const displayName = c.name || (c.first_name || c.last_name)
                            ? (c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim())
                            : c.email || 'Unnamed Client';
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setNewTask({ ...newTask, client_id: c.id });
                                setShowClientSelect(false);
                              }}
                              className={`w-full px-4 py-4 text-left ${themeClasses.text.primary} ${themeClasses.hover.bg} ${newTask.client_id === c.id ? 'bg-[#043d6b]/20' : ''}`}
                            >
                              <span className="text-base font-medium">{displayName}</span>
                              {displayName !== c.email && c.email && (
                                <span className={`block text-sm ${themeClasses.text.muted}`}>{c.email}</span>
                              )}
                            </button>
                          );
                        })}
                        {clients.length === 0 && (
                          <div className={`px-4 py-4 text-base ${themeClasses.text.muted}`}>No clients found</div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowAddClient(true)}
                      className="flex items-center gap-2 text-[#043d6b] text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Client
                    </button>
                  </div>
                ) : (
                  <div className={`space-y-3 p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newClient.first_name}
                        onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })}
                        className={`px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                        placeholder="First Name"
                      />
                      <input
                        type="text"
                        value={newClient.last_name}
                        onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })}
                        className={`px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                        placeholder="Last Name"
                      />
                    </div>
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className={`w-full px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className={`w-full px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                      placeholder="Phone"
                    />
                    <input
                      type="text"
                      value={newClient.address}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                      className={`w-full px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                      placeholder="Property Address"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (newClient.first_name.trim() && newClient.last_name.trim()) {
                            try {
                              await addClient({
                                first_name: newClient.first_name.trim(),
                                last_name: newClient.last_name.trim(),
                                email: newClient.email.trim(),
                                phone: newClient.phone.trim(),
                                address: newClient.address.trim(),
                                company: '',
                                notes: '',
                                source: 'task_form'
                              });
                              await fetchClients();
                              const newClients = useClientsStore.getState().clients;
                              const createdClient = newClients.find(c =>
                                c.first_name === newClient.first_name.trim() &&
                                c.last_name === newClient.last_name.trim()
                              );
                              if (createdClient) {
                                setNewTask(prev => ({ ...prev, client_id: createdClient.id }));
                              }
                              setNewClient({ first_name: '', last_name: '', email: '', phone: '', address: '' });
                              setShowAddClient(false);
                            } catch (error) {
                              console.error('Error adding client:', error);
                              alert('Failed to create client');
                            }
                          }
                        }}
                        className="flex-1 py-2 bg-[#043d6b] text-white rounded-lg font-medium text-sm"
                      >
                        Create Client
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewClient({ first_name: '', last_name: '', email: '', phone: '', address: '' });
                          setShowAddClient(false);
                        }}
                        className={`px-4 py-2 ${themeClasses.bg.tertiary} ${themeClasses.text.secondary} rounded-lg font-medium text-sm`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Assigned Employees Section */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Assigned Employees</label>
                <button
                  type="button"
                  onClick={() => setShowEmployeeSelect(!showEmployeeSelect)}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} flex items-center justify-between`}
                >
                  <span className={newTask.assigned_employees.length === 0 ? themeClasses.text.muted : ''}>
                    {newTask.assigned_employees.length === 0
                      ? 'Select employees...'
                      : `${newTask.assigned_employees.length} employee(s) selected`}
                  </span>
                  {showEmployeeSelect ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showEmployeeSelect && (
                  <div className={`mt-2 p-2 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input} max-h-40 overflow-y-auto`}>
                    {employees.length === 0 ? (
                      <p className={`text-sm ${themeClasses.text.muted} text-center py-2`}>No employees found. Add employees in Settings → Team.</p>
                    ) : (
                      employees.map((emp) => (
                        <label key={emp.id} className={`flex items-center gap-3 p-2 rounded-lg ${themeClasses.hover.bg} cursor-pointer`}>
                          <input
                            type="checkbox"
                            checked={newTask.assigned_employees.includes(emp.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask(prev => ({ ...prev, assigned_employees: [...prev.assigned_employees, emp.name] }));
                              } else {
                                setNewTask(prev => ({ ...prev, assigned_employees: prev.assigned_employees.filter(n => n !== emp.name) }));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#043d6b] focus:ring-[#043d6b]"
                          />
                          <span className={`text-sm ${themeClasses.text.primary}`}>{emp.name}</span>
                          {emp.job_title && <span className={`text-xs ${themeClasses.text.muted}`}>({emp.job_title})</span>}
                        </label>
                      ))
                    )}
                  </div>
                )}

                {/* Selected employees chips */}
                {newTask.assigned_employees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newTask.assigned_employees.map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 px-3 py-1 bg-[#043d6b]/20 text-[#043d6b] rounded-full text-sm">
                        {name}
                        <button
                          type="button"
                          onClick={() => setNewTask(prev => ({ ...prev, assigned_employees: prev.assigned_employees.filter(n => n !== name) }))}
                          className="hover:text-[#043d6b]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Estimate & Line Items Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowLineItems(!showLineItems)}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#043d6b]" />
                    <span>Estimate & Line Items</span>
                    {newTask.line_items.length > 0 && (
                      <span className="px-2 py-0.5 bg-[#043d6b] text-white rounded-full text-xs">{newTask.line_items.length}</span>
                    )}
                  </div>
                  {showLineItems ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showLineItems && (
                  <div className={`mt-2 p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                    {/* Tab buttons */}
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setShowInlineAI(false)}
                        className={`flex-1 py-2 px-3 ${!showInlineAI ? 'bg-[#043d6b] text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.primary}`} rounded-lg text-sm font-medium flex items-center justify-center gap-2`}
                      >
                        <Calculator className="w-4 h-4" />
                        Line Items
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInlineAI(true)}
                        className={`flex-1 py-2 px-3 ${showInlineAI ? 'bg-[#043d6b] text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.primary}`} rounded-lg text-sm font-medium flex items-center justify-center gap-2`}
                      >
                        <Sparkles className="w-4 h-4" />
                        AI Estimate
                      </button>
                    </div>

                    {/* AI Estimate Inline Chat */}
                    {showInlineAI && (
                      <div className="mb-4">
                        <div className={`p-3 ${themeClasses.bg.secondary} rounded-lg mb-3`}>
                          <p className={`text-sm ${themeClasses.text.secondary} mb-2`}>
                            Describe your project and I'll generate line items for your estimate:
                          </p>
                          <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g., Install new deck 12x16 ft with composite decking, railing, and stairs..."
                            className={`w-full px-3 py-2 ${themeClasses.bg.input} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} text-sm resize-none ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'}`}
                            rows={3}
                          />
                          <button
                            type="button"
                            disabled={!aiPrompt.trim() || aiLoading}
                            onClick={async () => {
                              if (!aiPrompt.trim()) return;
                              setAiLoading(true);

                              try {
                                // Call the real contractor-chat AI for accurate estimates
                                const { data, error } = await supabase.functions.invoke('contractor-chat', {
                                  body: {
                                    messages: [
                                      { role: 'user', content: `Generate a detailed estimate for: ${aiPrompt}. Include all materials, labor, and any other costs with accurate quantities and prices.` }
                                    ],
                                    currentEstimate: [],
                                    mode: 'estimating'
                                  }
                                });

                                if (error) throw error;

                                // Convert the AI response to our LineItem format
                                const generatedItems: LineItem[] = (data?.updatedEstimate || []).map((item: any) => ({
                                  id: crypto.randomUUID(),
                                  description: item.name || item.description,
                                  quantity: item.quantity || 1,
                                  unitPrice: item.unitPrice || 0,
                                  total: item.totalPrice || (item.quantity * item.unitPrice) || 0
                                }));

                                if (generatedItems.length === 0) {
                                  // Fallback if no items generated
                                  alert('Could not generate estimate. Please try a more specific description.');
                                  setAiLoading(false);
                                  return;
                                }

                                // Add generated items to line items
                                setNewTask(prev => ({
                                  ...prev,
                                  line_items: [...prev.line_items, ...generatedItems]
                                }));

                                setShowInlineAI(false); // Switch back to line items view
                                setAiPrompt('');
                              } catch (err: any) {
                                console.error('AI estimate error:', err);
                                alert('Failed to generate estimate: ' + (err.message || 'Unknown error'));
                              } finally {
                                setAiLoading(false);
                              }
                            }}
                            className={`mt-2 w-full py-2.5 px-4 bg-[#043d6b] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {aiLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate Line Items
                              </>
                            )}
                          </button>
                        </div>
                        <p className={`text-xs ${themeClasses.text.muted} text-center`}>
                          AI will generate line items based on your description
                        </p>
                      </div>
                    )}

                    {/* Line items list - show when not in AI mode */}
                    {!showInlineAI && (
                    <>
                    <div className="space-y-2 mb-3">
                      {newTask.line_items.map((item, idx) => (
                        <div key={item.id} className={`flex items-center gap-2 p-2 ${themeClasses.bg.secondary} rounded-lg`}>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...newTask.line_items];
                              updated[idx] = { ...updated[idx], description: e.target.value };
                              setNewTask(prev => ({ ...prev, line_items: updated }));
                            }}
                            className={`flex-1 px-2 py-1 ${themeClasses.bg.input} rounded text-sm ${themeClasses.text.primary}`}
                            placeholder="Description"
                          />
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...newTask.line_items];
                              const qty = parseFloat(e.target.value) || 0;
                              updated[idx] = { ...updated[idx], quantity: qty, total: qty * updated[idx].unitPrice };
                              setNewTask(prev => ({ ...prev, line_items: updated }));
                            }}
                            className={`w-16 px-2 py-1 ${themeClasses.bg.input} rounded text-sm text-center ${themeClasses.text.primary}`}
                            placeholder="Qty"
                          />
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const updated = [...newTask.line_items];
                              const price = parseFloat(e.target.value) || 0;
                              updated[idx] = { ...updated[idx], unitPrice: price, total: updated[idx].quantity * price };
                              setNewTask(prev => ({ ...prev, line_items: updated }));
                            }}
                            className={`w-20 px-2 py-1 ${themeClasses.bg.input} rounded text-sm text-center ${themeClasses.text.primary}`}
                            placeholder="Price"
                          />
                          <span className={`w-20 text-sm text-right ${themeClasses.text.primary}`}>
                            ${item.total.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewTask(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== idx) }));
                            }}
                            className="text-red-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add line item button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newItem: LineItem = {
                          id: crypto.randomUUID(),
                          description: '',
                          quantity: 1,
                          unitPrice: 0,
                          total: 0
                        };
                        setNewTask(prev => ({ ...prev, line_items: [...prev.line_items, newItem] }));
                      }}
                      className="flex items-center gap-2 text-[#043d6b] text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Line Item
                    </button>
                    </>
                    )}

                    {/* Totals */}
                    {newTask.line_items.length > 0 && (
                      <div className={`mt-4 pt-3 border-t ${themeClasses.border.primary}`}>
                        <div className="flex justify-between text-sm">
                          <span className={themeClasses.text.secondary}>Subtotal</span>
                          <span className={themeClasses.text.primary}>
                            ${newTask.line_items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className={themeClasses.text.secondary}>Tax (8%)</span>
                          <span className={themeClasses.text.primary}>
                            ${(newTask.line_items.reduce((sum, item) => sum + item.total, 0) * 0.08).toFixed(2)}
                          </span>
                        </div>
                        <div className={`flex justify-between font-semibold mt-2 pt-2 border-t ${themeClasses.border.primary}`}>
                          <span className={themeClasses.text.primary}>Total</span>
                          <span className="text-[#043d6b]">
                            ${(newTask.line_items.reduce((sum, item) => sum + item.total, 0) * 1.08).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice Section - only show if line items exist */}
              {newTask.line_items.length > 0 && (
                <div className={`p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className={`w-5 h-5 ${newTask.send_invoice_on_complete ? 'text-green-500' : themeClasses.text.muted}`} />
                      <div>
                        <p className={`font-medium ${themeClasses.text.primary}`}>Invoice on Completion</p>
                        <p className={`text-xs ${themeClasses.text.muted}`}>
                          {newTask.send_invoice_on_complete ? 'Will prompt to send invoice when job is done' : 'No automatic invoice'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, send_invoice_on_complete: !prev.send_invoice_on_complete }))}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        newTask.send_invoice_on_complete ? 'bg-green-500' : theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full shadow transition-transform ${
                          newTask.send_invoice_on_complete ? 'translate-x-6 bg-white' : theme === 'light' ? 'translate-x-1 bg-white' : 'translate-x-1 bg-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTask && selectedTask && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowEditTask(false); setSelectedTask(null); }}
          />
          <div className={`relative ${themeClasses.bg.secondary} rounded-t-3xl w-full max-w-full max-h-[90vh] overflow-y-auto overflow-x-hidden animate-slide-up pb-[env(safe-area-inset-bottom)]`}>
            <div className={`sticky top-0 ${themeClasses.bg.secondary} px-4 py-4 border-b ${themeClasses.border.primary} flex items-center justify-between z-10`}>
              <button
                onClick={() => { setShowEditTask(false); setSelectedTask(null); }}
                className={`${themeClasses.text.secondary} text-base font-medium active:opacity-70`}
              >
                Cancel
              </button>
              <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Edit Task</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteTask}
                  className="text-red-400 active:text-red-300"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleUpdateTask}
                  disabled={!editTask.title.trim()}
                  className={`text-[#043d6b] text-base font-semibold active:text-[#035291] disabled:${themeClasses.text.muted}`}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="p-4 pb-32 space-y-4">
              {/* Task Name */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                  Task Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editTask.title}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} focus:border-[#043d6b] focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                  placeholder="What needs to be done?"
                />
              </div>

              {/* Status */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Status</label>
                <div className="flex gap-2">
                  {(['todo', 'in-progress', 'done'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditTask({ ...editTask, status: s })}
                      className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${
                        editTask.status === s
                          ? s === 'done' ? 'bg-green-500 text-white'
                            : s === 'in-progress' ? 'bg-[#043d6b] text-white'
                            : 'bg-zinc-500 text-white'
                          : `${themeClasses.bg.input} ${themeClasses.text.secondary}`
                      }`}
                    >
                      {s === 'todo' ? 'To Do' : s === 'in-progress' ? 'In Progress' : 'Done'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date & Time */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Due Date & Time</label>
                <button
                  type="button"
                  onClick={() => setShowEditDatePicker(!showEditDatePicker)}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-[#043d6b]" />
                    <span className={editTask.due_date ? themeClasses.text.primary : themeClasses.text.muted}>
                      {editTask.due_date
                        ? `${format(parseISO(editTask.due_date), 'MMM d, yyyy')} at ${editTask.due_time || '09:00'}`
                        : 'Select date and time...'}
                    </span>
                  </div>
                  {showEditDatePicker ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showEditDatePicker && (
                  <div className={`mt-2 p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                    <div className="flex items-center justify-between mb-4">
                      <button type="button" onClick={() => setEditDatePickerMonth(subMonths(editDatePickerMonth, 1))} className={`p-2 rounded-lg ${themeClasses.hover.bg}`}><ChevronLeft className="w-5 h-5" /></button>
                      <span className={`font-semibold ${themeClasses.text.primary}`}>{format(editDatePickerMonth, 'MMMM yyyy')}</span>
                      <button type="button" onClick={() => setEditDatePickerMonth(addMonths(editDatePickerMonth, 1))} className={`p-2 rounded-lg ${themeClasses.hover.bg}`}><ChevronRight className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className={`text-center text-xs font-medium ${themeClasses.text.muted} py-1`}>{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const ms = startOfMonth(editDatePickerMonth);
                        const me = endOfMonth(editDatePickerMonth);
                        const cs = startOfWeek(ms);
                        const ce = endOfWeek(me);
                        const days = [];
                        let d = cs;
                        while (d <= ce) {
                          const cd = d;
                          const isCur = cd.getMonth() === editDatePickerMonth.getMonth();
                          const isSel = editTask.due_date && isSameDay(cd, parseISO(editTask.due_date));
                          const isTod = isToday(cd);
                          const ds = format(cd, 'yyyy-MM-dd');
                          days.push(
                            <button key={ds} type="button" onClick={() => setEditTask(prev => ({ ...prev, due_date: ds }))}
                              className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${isSel ? 'bg-[#043d6b] text-white font-semibold' : isTod ? `${themeClasses.bg.tertiary} ${themeClasses.text.primary} font-semibold` : isCur ? `${themeClasses.text.primary} ${themeClasses.hover.bg}` : `${themeClasses.text.muted} opacity-50`}`}
                            >{format(cd, 'd')}</button>
                          );
                          d = addDays(d, 1);
                        }
                        return days;
                      })()}
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-dashed" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#3f3f46' }}>
                      <button type="button" onClick={() => setEditTask(prev => ({ ...prev, due_date: format(new Date(), 'yyyy-MM-dd') }))}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg ${editTask.due_date === format(new Date(), 'yyyy-MM-dd') ? 'bg-[#043d6b] text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`}`}>Today</button>
                      <button type="button" onClick={() => setEditTask(prev => ({ ...prev, due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd') }))}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg ${editTask.due_date === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? 'bg-[#043d6b] text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`}`}>Tomorrow</button>
                      <button type="button" onClick={() => setEditTask(prev => ({ ...prev, due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd') }))}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg ${editTask.due_date === format(addDays(new Date(), 7), 'yyyy-MM-dd') ? 'bg-[#043d6b] text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`}`}>Next Week</button>
                    </div>
                    {editTask.due_date && (
                      <div className="mt-4 pt-3 border-t border-dashed" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#3f3f46' }}>
                        <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2`}>Select Time</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((time) => (
                            <button key={time} type="button" onClick={() => setEditTask(prev => ({ ...prev, due_time: time }))}
                              className={`py-2 text-xs font-medium rounded-lg transition-colors ${editTask.due_time === time ? 'bg-[#043d6b] text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} ${themeClasses.hover.bg}`}`}
                            >{format(new Date(`2000-01-01T${time}`), 'h:mm a')}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Project */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Project</label>
                <select
                  value={editTask.project_id}
                  onChange={(e) => setEditTask({ ...editTask, project_id: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} focus:border-[#043d6b] focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Project Address Map */}
              {editTask.project_id && (() => {
                const selectedProject = projects.find(p => p.id === editTask.project_id);
                if (selectedProject?.address) {
                  return (
                    <div className={`${themeClasses.bg.secondary} border ${themeClasses.border.primary} rounded-xl overflow-hidden`}>
                      <div className="p-3 border-b border-zinc-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span className={`text-sm font-medium ${themeClasses.text.primary}`}>Job Location</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedProject.address)}`;
                            window.open(url, '_blank');
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-[#043d6b]/20 text-[#043d6b] rounded-lg text-xs font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </button>
                      </div>
                      <p className={`px-3 py-2 text-xs ${themeClasses.text.muted}`}>{selectedProject.address}</p>
                      <div className="h-32 bg-gray-100 overflow-hidden">
                        <iframe
                          src={`https://www.google.com/maps?q=${encodeURIComponent(selectedProject.address)}&output=embed&z=15`}
                          width="100%"
                          height="100%"
                          style={{ border: 0, maxWidth: '100%' }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Client */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Client</label>
                <select
                  value={editTask.client_id}
                  onChange={(e) => setEditTask({ ...editTask, client_id: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} focus:border-[#043d6b] focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                >
                  <option value="">Select a client (optional)...</option>
                  {clients.map((c) => {
                    const displayName = c.name || (c.first_name || c.last_name)
                      ? (c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim())
                      : c.email || 'Unnamed Client';
                    return (
                      <option key={c.id} value={c.id}>{displayName}</option>
                    );
                  })}
                </select>
              </div>

              {/* Assigned Employees */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Assigned Employees</label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !editTask.assigned_employees?.includes(e.target.value)) {
                      setEditTask({
                        ...editTask,
                        assigned_employees: [...(editTask.assigned_employees || []), e.target.value]
                      });
                    }
                  }}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} focus:border-[#043d6b] focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                >
                  <option value="">Select employees...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.name} disabled={editTask.assigned_employees?.includes(emp.name)}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                {editTask.assigned_employees && editTask.assigned_employees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editTask.assigned_employees.map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 px-3 py-1 bg-[#043d6b]/20 text-[#043d6b] rounded-full text-sm">
                        {name}
                        <button
                          type="button"
                          onClick={() => setEditTask({
                            ...editTask,
                            assigned_employees: editTask.assigned_employees?.filter(n => n !== name) || []
                          })}
                          className="hover:text-[#043d6b]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Reminder Section */}
              {editTask.due_date && (
                <div className={`${themeClasses.bg.input} rounded-xl p-4 space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {editTask.reminder_enabled ? (
                        <Bell className={`w-5 h-5 ${themeClasses.text.primary}`} />
                      ) : (
                        <BellOff className={`w-5 h-5 ${themeClasses.text.muted}`} />
                      )}
                      <div>
                        <p className={`font-medium ${themeClasses.text.primary}`}>Reminder</p>
                        <p className={`text-xs ${themeClasses.text.muted}`}>
                          {editTask.reminder_enabled
                            ? `${editTask.reminder_minutes >= 1440 ? `${Math.floor(editTask.reminder_minutes / 1440)} day` : `${editTask.reminder_minutes} min`} before • ${editTask.reminder_recipients === 'self' ? 'Just me' : editTask.reminder_recipients === 'client' ? 'Client' : 'Everyone'}`
                            : 'No notification'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditTask({ ...editTask, reminder_enabled: !editTask.reminder_enabled })}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        editTask.reminder_enabled ? 'bg-[#043d6b]' : theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full shadow transition-transform ${
                        editTask.reminder_enabled ? 'translate-x-6 bg-white' : theme === 'light' ? 'translate-x-1 bg-white' : 'translate-x-1 bg-zinc-400'
                      }`} />
                    </button>
                  </div>

                  {editTask.reminder_enabled && (
                    <div className="space-y-4 pt-2 border-t border-zinc-700/30">
                      {/* When to remind */}
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2`}>When to remind</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: '15 min', value: 15 },
                            { label: '30 min', value: 30 },
                            { label: '1 hour', value: 60 },
                            { label: '1 day', value: 1440 },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setEditTask({ ...editTask, reminder_minutes: opt.value })}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                editTask.reminder_minutes === opt.value
                                  ? 'bg-[#043d6b] text-white'
                                  : `${themeClasses.bg.secondary} ${themeClasses.text.secondary}`
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Who to notify */}
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2`}>Who to notify</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: 'Just me', value: 'self' as const },
                            { label: 'Client', value: 'client' as const, disabled: !editTask.client_id },
                            { label: 'Team', value: 'employees' as const, disabled: !editTask.assigned_employees?.length },
                            { label: 'Everyone', value: 'all' as const, disabled: !editTask.client_id && !editTask.assigned_employees?.length },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => !opt.disabled && setEditTask({ ...editTask, reminder_recipients: opt.value })}
                              disabled={opt.disabled}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                opt.disabled
                                  ? `${themeClasses.bg.secondary} ${themeClasses.text.muted} opacity-50 cursor-not-allowed`
                                  : editTask.reminder_recipients === opt.value
                                    ? 'bg-[#043d6b] text-white'
                                    : `${themeClasses.bg.secondary} ${themeClasses.text.secondary}`
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* How to notify */}
                      <div>
                        <label className={`block text-xs font-medium ${themeClasses.text.muted} mb-2`}>How to notify</label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setEditTask({ ...editTask, reminder_push: !editTask.reminder_push })}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              editTask.reminder_push
                                ? 'bg-[#043d6b]/20 text-[#043d6b] border border-[#043d6b]/50'
                                : `${themeClasses.bg.secondary} ${themeClasses.text.secondary} border ${themeClasses.border.input}`
                            }`}
                          >
                            <Smartphone className="w-4 h-4" />
                            Push
                            {editTask.reminder_push && <Check className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditTask({ ...editTask, reminder_email: !editTask.reminder_email })}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              editTask.reminder_email
                                ? 'bg-[#043d6b]/20 text-[#043d6b] border border-[#043d6b]/50'
                                : `${themeClasses.bg.secondary} ${themeClasses.text.secondary} border ${themeClasses.border.input}`
                            }`}
                          >
                            <Mail className="w-4 h-4" />
                            Email
                            {editTask.reminder_email && <Check className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estimate & Line Items Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowEditLineItems(!showEditLineItems)}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#043d6b]" />
                    <span>Estimate & Line Items</span>
                    {editTask.line_items && editTask.line_items.length > 0 && (
                      <span className="px-2 py-0.5 bg-[#043d6b] text-white rounded-full text-xs">{editTask.line_items.length}</span>
                    )}
                  </div>
                  {showEditLineItems ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showEditLineItems && (
                  <div className={`mt-2 p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                    {/* Tab buttons */}
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setShowEditInlineAI(false)}
                        className={`flex-1 py-2 px-3 ${!showEditInlineAI ? 'bg-[#043d6b] text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.primary}`} rounded-lg text-sm font-medium flex items-center justify-center gap-2`}
                      >
                        <Calculator className="w-4 h-4" />
                        Line Items
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEditInlineAI(true)}
                        className={`flex-1 py-2 px-3 ${showEditInlineAI ? 'bg-[#043d6b] text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.primary}`} rounded-lg text-sm font-medium flex items-center justify-center gap-2`}
                      >
                        <Sparkles className="w-4 h-4" />
                        AI Estimate
                      </button>
                    </div>

                    {/* AI Estimate Inline Chat */}
                    {showEditInlineAI && (
                      <div className="mb-4">
                        <div className={`p-3 ${themeClasses.bg.secondary} rounded-lg mb-3`}>
                          <p className={`text-sm ${themeClasses.text.secondary} mb-2`}>
                            Describe your project and I'll generate line items for your estimate:
                          </p>
                          <textarea
                            value={editAiPrompt}
                            onChange={(e) => setEditAiPrompt(e.target.value)}
                            placeholder="e.g., Install new deck 12x16 ft with composite decking, railing, and stairs..."
                            className={`w-full px-3 py-2 ${themeClasses.bg.input} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} text-sm resize-none ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'}`}
                            rows={3}
                          />
                          <button
                            type="button"
                            disabled={!editAiPrompt.trim() || editAiLoading}
                            onClick={async () => {
                              if (!editAiPrompt.trim()) return;
                              setEditAiLoading(true);

                              try {
                                // Call the real contractor-chat AI for accurate estimates
                                const { data, error } = await supabase.functions.invoke('contractor-chat', {
                                  body: {
                                    messages: [
                                      { role: 'user', content: `Generate a detailed estimate for: ${editAiPrompt}. Include all materials, labor, and any other costs with accurate quantities and prices.` }
                                    ],
                                    currentEstimate: [],
                                    mode: 'estimating'
                                  }
                                });

                                if (error) throw error;

                                // Convert the AI response to our LineItem format
                                const generatedItems: LineItem[] = (data?.updatedEstimate || []).map((item: any) => ({
                                  id: crypto.randomUUID(),
                                  description: item.name || item.description,
                                  quantity: item.quantity || 1,
                                  unitPrice: item.unitPrice || 0,
                                  total: item.totalPrice || (item.quantity * item.unitPrice) || 0
                                }));

                                if (generatedItems.length === 0) {
                                  alert('Could not generate estimate. Please try a more specific description.');
                                  setEditAiLoading(false);
                                  return;
                                }

                                // Add generated items to line items
                                setEditTask(prev => ({
                                  ...prev,
                                  line_items: [...(prev.line_items || []), ...generatedItems]
                                }));

                                setShowEditInlineAI(false); // Switch back to line items view
                                setEditAiPrompt('');
                              } catch (err: any) {
                                console.error('AI estimate error:', err);
                                alert('Failed to generate estimate: ' + (err.message || 'Unknown error'));
                              } finally {
                                setEditAiLoading(false);
                              }
                            }}
                            className={`mt-2 w-full py-2.5 px-4 bg-[#043d6b] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {editAiLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate Line Items
                              </>
                            )}
                          </button>
                        </div>
                        <p className={`text-xs ${themeClasses.text.muted} text-center`}>
                          AI will generate line items based on your description
                        </p>
                      </div>
                    )}

                    {/* Line items list - show when not in AI mode */}
                    {!showEditInlineAI && (
                    <>
                    <div className="space-y-2 mb-3">
                      {(editTask.line_items || []).map((item, idx) => (
                        <div key={item.id} className={`flex items-center gap-2 p-2 ${themeClasses.bg.secondary} rounded-lg`}>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...(editTask.line_items || [])];
                              updated[idx] = { ...updated[idx], description: e.target.value };
                              setEditTask(prev => ({ ...prev, line_items: updated }));
                            }}
                            className={`flex-1 px-2 py-1 ${themeClasses.bg.input} rounded text-sm ${themeClasses.text.primary}`}
                            placeholder="Description"
                          />
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...(editTask.line_items || [])];
                              const qty = parseFloat(e.target.value) || 0;
                              updated[idx] = { ...updated[idx], quantity: qty, total: qty * updated[idx].unitPrice };
                              setEditTask(prev => ({ ...prev, line_items: updated }));
                            }}
                            className={`w-16 px-2 py-1 ${themeClasses.bg.input} rounded text-sm text-center ${themeClasses.text.primary}`}
                            placeholder="Qty"
                          />
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const updated = [...(editTask.line_items || [])];
                              const price = parseFloat(e.target.value) || 0;
                              updated[idx] = { ...updated[idx], unitPrice: price, total: updated[idx].quantity * price };
                              setEditTask(prev => ({ ...prev, line_items: updated }));
                            }}
                            className={`w-20 px-2 py-1 ${themeClasses.bg.input} rounded text-sm text-center ${themeClasses.text.primary}`}
                            placeholder="Price"
                          />
                          <span className={`w-20 text-sm text-right ${themeClasses.text.primary}`}>
                            ${item.total.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditTask(prev => ({ ...prev, line_items: (prev.line_items || []).filter((_, i) => i !== idx) }));
                            }}
                            className="text-red-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add line item button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newItem: LineItem = {
                          id: crypto.randomUUID(),
                          description: '',
                          quantity: 1,
                          unitPrice: 0,
                          total: 0
                        };
                        setEditTask(prev => ({ ...prev, line_items: [...(prev.line_items || []), newItem] }));
                      }}
                      className="flex items-center gap-2 text-[#043d6b] text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Line Item
                    </button>
                    </>
                    )}

                    {/* Totals */}
                    {editTask.line_items && editTask.line_items.length > 0 && (
                      <div className={`mt-4 pt-3 border-t ${themeClasses.border.primary}`}>
                        <div className="flex justify-between text-sm">
                          <span className={themeClasses.text.secondary}>Subtotal</span>
                          <span className={themeClasses.text.primary}>
                            ${editTask.line_items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className={themeClasses.text.secondary}>Tax (8%)</span>
                          <span className={themeClasses.text.primary}>
                            ${(editTask.line_items.reduce((sum, item) => sum + item.total, 0) * 0.08).toFixed(2)}
                          </span>
                        </div>
                        <div className={`flex justify-between font-semibold mt-2 pt-2 border-t ${themeClasses.border.primary}`}>
                          <span className={themeClasses.text.primary}>Total</span>
                          <span className="text-[#043d6b]">
                            ${(editTask.line_items.reduce((sum, item) => sum + item.total, 0) * 1.08).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice Section - only show if line items exist */}
              {editTask.line_items && editTask.line_items.length > 0 && (
                <div className={`p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className={`w-5 h-5 ${editTask.send_invoice_on_complete ? 'text-green-500' : themeClasses.text.muted}`} />
                      <div>
                        <p className={`font-medium ${themeClasses.text.primary}`}>Invoice on Completion</p>
                        <p className={`text-xs ${themeClasses.text.muted}`}>
                          {editTask.send_invoice_on_complete ? 'Will prompt to send invoice when job is done' : 'No automatic invoice'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditTask(prev => ({ ...prev, send_invoice_on_complete: !prev.send_invoice_on_complete }))}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        editTask.send_invoice_on_complete ? 'bg-green-500' : theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full shadow transition-transform ${
                          editTask.send_invoice_on_complete ? 'translate-x-6 bg-white' : theme === 'light' ? 'translate-x-1 bg-white' : 'translate-x-1 bg-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className={`absolute inset-0 ${theme === 'light' ? 'bg-black/50' : 'bg-black/70'}`}
            onClick={() => setShowNewProjectModal(false)}
          />
          <div className={`relative ${themeClasses.bg.modal} rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up pb-safe`}>
            <div className={`sticky top-0 ${themeClasses.bg.modal} px-4 py-4 border-b border-[#043d6b]/30 flex items-center justify-between z-10`}>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className={`${themeClasses.text.secondary} text-base font-medium ${themeClasses.hover.text}`}
              >
                Cancel
              </button>
              <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>New Project</h2>
              <div className="w-16"></div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Project Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newProjectFormData.name}
                  onChange={(e) => setNewProjectFormData({ ...newProjectFormData, name: e.target.value })}
                  placeholder="e.g., Kitchen Renovation"
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Client</label>
                {!showNpAddClient ? (
                  <div className="space-y-2">
                    <select
                      value={newProjectFormData.clientId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedClient = clients.find(c => c.id === selectedId);
                        setNewProjectFormData({
                          ...newProjectFormData,
                          clientId: selectedId,
                          client: selectedClient?.name || selectedClient?.email || ''
                        });
                      }}
                      className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                    >
                      <option value="">Select a client (optional)...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name || c.email || 'Unnamed Client'}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNpAddClient(true)}
                      className="flex items-center gap-2 text-[#043d6b] text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Client
                    </button>
                  </div>
                ) : (
                  <div className={`space-y-3 p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={npNewClient.first_name}
                        onChange={(e) => setNpNewClient({ ...npNewClient, first_name: e.target.value })}
                        className={`px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                        placeholder="First Name"
                      />
                      <input
                        type="text"
                        value={npNewClient.last_name}
                        onChange={(e) => setNpNewClient({ ...npNewClient, last_name: e.target.value })}
                        className={`px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                        placeholder="Last Name"
                      />
                    </div>
                    <input
                      type="email"
                      value={npNewClient.email}
                      onChange={(e) => setNpNewClient({ ...npNewClient, email: e.target.value })}
                      className={`w-full px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={npNewClient.phone}
                      onChange={(e) => setNpNewClient({ ...npNewClient, phone: e.target.value })}
                      className={`w-full px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                      placeholder="Phone"
                    />
                    <input
                      type="text"
                      value={npNewClient.address}
                      onChange={(e) => setNpNewClient({ ...npNewClient, address: e.target.value })}
                      className={`w-full px-3 py-2 ${themeClasses.bg.secondary} border ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} text-sm`}
                      placeholder="Property Address"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (npNewClient.first_name.trim() && npNewClient.last_name.trim()) {
                            try {
                              const fullName = `${npNewClient.first_name.trim()} ${npNewClient.last_name.trim()}`;
                              await addClient({
                                name: fullName,
                                email: npNewClient.email.trim(),
                                phone: npNewClient.phone.trim(),
                                address: npNewClient.address.trim(),
                                company: '',
                                notes: '',
                                status: 'active'
                              } as any);
                              await fetchClients();
                              const updatedClients = useClientsStore.getState().clients;
                              const createdClient = updatedClients.find(c =>
                                c.name === fullName
                              );
                              if (createdClient) {
                                setNewProjectFormData(prev => ({
                                  ...prev,
                                  clientId: createdClient.id,
                                  client: createdClient.name || `${createdClient.first_name || ''} ${createdClient.last_name || ''}`.trim()
                                }));
                              }
                              setNpNewClient({ first_name: '', last_name: '', email: '', phone: '', address: '' });
                              setShowNpAddClient(false);
                            } catch (error) {
                              console.error('Error adding client:', error);
                              alert('Failed to create client');
                            }
                          }
                        }}
                        className="flex-1 py-2 bg-[#043d6b] text-white rounded-lg font-medium text-sm"
                      >
                        Create Client
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNpNewClient({ first_name: '', last_name: '', email: '', phone: '', address: '' });
                          setShowNpAddClient(false);
                        }}
                        className={`px-4 py-2 ${themeClasses.bg.tertiary} ${themeClasses.text.secondary} rounded-lg font-medium text-sm`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Project Address</label>
                <input
                  type="text"
                  value={newProjectFormData.address}
                  onChange={(e) => setNewProjectFormData({ ...newProjectFormData, address: e.target.value })}
                  placeholder="e.g., 123 Main St, City, State 12345"
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Description</label>
                <textarea
                  value={newProjectFormData.description}
                  onChange={(e) => setNewProjectFormData({ ...newProjectFormData, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-[#043d6b]/20 outline-none resize-none`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Budget</label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${themeClasses.text.muted}`}>$</span>
                  <input
                    type="number"
                    value={newProjectFormData.budget}
                    onChange={(e) => setNewProjectFormData({ ...newProjectFormData, budget: e.target.value })}
                    placeholder="0"
                    className={`w-full pl-8 pr-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                  />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Start Date</label>
                <button
                  type="button"
                  onClick={() => setNpStartDatePicker(!npStartDatePicker)}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-[#043d6b]" />
                    <span className={newProjectFormData.startDate ? themeClasses.text.primary : themeClasses.text.muted}>
                      {newProjectFormData.startDate
                        ? format(parseISO(newProjectFormData.startDate), 'MMM d, yyyy')
                        : 'Select start date...'}
                    </span>
                  </div>
                  {npStartDatePicker ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {npStartDatePicker && (
                  <div className={`mt-2 p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                    <div className="flex items-center justify-between mb-4">
                      <button type="button" onClick={() => setNpStartMonth(subMonths(npStartMonth, 1))} className={`p-2 rounded-lg ${themeClasses.hover.bg}`}><ChevronLeft className="w-5 h-5" /></button>
                      <span className={`font-semibold ${themeClasses.text.primary}`}>{format(npStartMonth, 'MMMM yyyy')}</span>
                      <button type="button" onClick={() => setNpStartMonth(addMonths(npStartMonth, 1))} className={`p-2 rounded-lg ${themeClasses.hover.bg}`}><ChevronRight className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className={`text-center text-xs font-medium ${themeClasses.text.muted} py-1`}>{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const ms = startOfMonth(npStartMonth);
                        const me = endOfMonth(npStartMonth);
                        const cs = startOfWeek(ms);
                        const ce = endOfWeek(me);
                        const days = [];
                        let d = cs;
                        while (d <= ce) {
                          const cd = d;
                          const isCur = cd.getMonth() === npStartMonth.getMonth();
                          const isSel = newProjectFormData.startDate && isSameDay(cd, parseISO(newProjectFormData.startDate));
                          const isTod = isToday(cd);
                          const ds = format(cd, 'yyyy-MM-dd');
                          days.push(
                            <button key={ds} type="button" onClick={() => { setNewProjectFormData(prev => ({ ...prev, startDate: ds })); setNpStartDatePicker(false); }}
                              className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${isSel ? 'bg-[#043d6b] text-white font-semibold' : isTod ? `${themeClasses.bg.tertiary} ${themeClasses.text.primary} font-semibold` : isCur ? `${themeClasses.text.primary} ${themeClasses.hover.bg}` : `${themeClasses.text.muted} opacity-50`}`}
                            >{format(cd, 'd')}</button>
                          );
                          d = addDays(d, 1);
                        }
                        return days;
                      })()}
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-dashed" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#3f3f46' }}>
                      <button type="button" onClick={() => { setNewProjectFormData(prev => ({ ...prev, startDate: format(new Date(), 'yyyy-MM-dd') })); setNpStartDatePicker(false); }} className={`flex-1 py-2 text-xs font-medium rounded-lg ${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`}>Today</button>
                      <button type="button" onClick={() => { setNewProjectFormData(prev => ({ ...prev, startDate: format(addDays(new Date(), 7), 'yyyy-MM-dd') })); setNpStartDatePicker(false); }} className={`flex-1 py-2 text-xs font-medium rounded-lg ${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`}>Next Week</button>
                    </div>
                  </div>
                )}
              </div>

              {/* End Date */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>End Date</label>
                <button
                  type="button"
                  onClick={() => setNpEndDatePicker(!npEndDatePicker)}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-green-500" />
                    <span className={newProjectFormData.endDate ? themeClasses.text.primary : themeClasses.text.muted}>
                      {newProjectFormData.endDate
                        ? format(parseISO(newProjectFormData.endDate), 'MMM d, yyyy')
                        : 'Select end date...'}
                    </span>
                  </div>
                  {npEndDatePicker ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {npEndDatePicker && (
                  <div className={`mt-2 p-4 ${themeClasses.bg.input} rounded-xl border ${themeClasses.border.input}`}>
                    <div className="flex items-center justify-between mb-4">
                      <button type="button" onClick={() => setNpEndMonth(subMonths(npEndMonth, 1))} className={`p-2 rounded-lg ${themeClasses.hover.bg}`}><ChevronLeft className="w-5 h-5" /></button>
                      <span className={`font-semibold ${themeClasses.text.primary}`}>{format(npEndMonth, 'MMMM yyyy')}</span>
                      <button type="button" onClick={() => setNpEndMonth(addMonths(npEndMonth, 1))} className={`p-2 rounded-lg ${themeClasses.hover.bg}`}><ChevronRight className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className={`text-center text-xs font-medium ${themeClasses.text.muted} py-1`}>{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const ms = startOfMonth(npEndMonth);
                        const me = endOfMonth(npEndMonth);
                        const cs = startOfWeek(ms);
                        const ce = endOfWeek(me);
                        const days = [];
                        let d = cs;
                        while (d <= ce) {
                          const cd = d;
                          const isCur = cd.getMonth() === npEndMonth.getMonth();
                          const isSel = newProjectFormData.endDate && isSameDay(cd, parseISO(newProjectFormData.endDate));
                          const isTod = isToday(cd);
                          const ds = format(cd, 'yyyy-MM-dd');
                          days.push(
                            <button key={ds} type="button" onClick={() => { setNewProjectFormData(prev => ({ ...prev, endDate: ds })); setNpEndDatePicker(false); }}
                              className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${isSel ? 'bg-green-500 text-white font-semibold' : isTod ? `${themeClasses.bg.tertiary} ${themeClasses.text.primary} font-semibold` : isCur ? `${themeClasses.text.primary} ${themeClasses.hover.bg}` : `${themeClasses.text.muted} opacity-50`}`}
                            >{format(cd, 'd')}</button>
                          );
                          d = addDays(d, 1);
                        }
                        return days;
                      })()}
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-dashed" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#3f3f46' }}>
                      <button type="button" onClick={() => { setNewProjectFormData(prev => ({ ...prev, endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd') })); setNpEndDatePicker(false); }} className={`flex-1 py-2 text-xs font-medium rounded-lg ${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`}>+30 Days</button>
                      <button type="button" onClick={() => { setNewProjectFormData(prev => ({ ...prev, endDate: format(addDays(new Date(), 60), 'yyyy-MM-dd') })); setNpEndDatePicker(false); }} className={`flex-1 py-2 text-xs font-medium rounded-lg ${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`}>+60 Days</button>
                      <button type="button" onClick={() => { setNewProjectFormData(prev => ({ ...prev, endDate: format(addDays(new Date(), 90), 'yyyy-MM-dd') })); setNpEndDatePicker(false); }} className={`flex-1 py-2 text-xs font-medium rounded-lg ${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`}>+90 Days</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Status</label>
                <select
                  value={newProjectFormData.status}
                  onChange={(e) => setNewProjectFormData({ ...newProjectFormData, status: e.target.value as 'active' | 'completed' | 'on-hold' })}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-[#043d6b]/20 outline-none`}
                >
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Save Button */}
              <div className="pt-6 pb-6">
                <button
                  onClick={async () => {
                    if (!newProjectFormData.name.trim() || isCreatingProject) return;
                    setIsCreatingProject(true);
                    try {
                      await addProject({
                        name: newProjectFormData.name.trim(),
                        clientId: newProjectFormData.clientId || undefined,
                        client: newProjectFormData.client.trim() || undefined,
                        address: newProjectFormData.address.trim() || undefined,
                        description: newProjectFormData.description.trim() || undefined,
                        budget: newProjectFormData.budget ? parseFloat(newProjectFormData.budget) : 0,
                        startDate: newProjectFormData.startDate || undefined,
                        endDate: newProjectFormData.endDate || undefined,
                        status: newProjectFormData.status
                      });
                      await fetchProjects();
                      // Auto-select the newly created project in the task form
                      const updatedProjects = useProjectStore.getState().projects;
                      const created = updatedProjects.find(p => p.name === newProjectFormData.name.trim());
                      if (created) {
                        setNewTask(prev => ({ ...prev, project_id: created.id }));
                      }
                      setNewProjectFormData({ name: '', clientId: '', client: '', address: '', description: '', budget: '', startDate: '', endDate: '', status: 'active' });
                      setShowNewProjectModal(false);
                    } catch (error) {
                      console.error('Error creating project:', error);
                      alert('Failed to create project');
                    } finally {
                      setIsCreatingProject(false);
                    }
                  }}
                  disabled={!newProjectFormData.name.trim() || isCreatingProject}
                  className="w-full py-4 text-base font-medium rounded-2xl text-white bg-[#043d6b] hover:bg-[#035291] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {isCreatingProject ? 'Saving...' : 'Add Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Popup */}
      <AIChatPopup
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        mode="general"
      />
    </div>
  );
};

export default TodoHub;
