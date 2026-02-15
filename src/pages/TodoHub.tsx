import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Calculator
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, isToday, isTomorrow, isPast, addMonths, subMonths, startOfMonth, endOfMonth, endOfWeek } from 'date-fns';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';
import useProjectStore from '../stores/projectStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useClientsStore } from '../stores/clientsStore';
import { useEmployeesStore } from '../stores/employeesStore';
// Finance store for future invoice creation
// import { useFinanceStore } from '../stores/financeStoreSupabase';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notifications/notificationService';
import AIChatPopup from '../components/ai/AIChatPopup';
import TasksTutorialModal from '../components/tasks/TasksTutorialModal';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';

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
  priority: 'low' | 'medium' | 'high';
  project_id: string | null;
  project_name?: string;
  client_id?: string | null;
  client_name?: string;
  assigned_employees?: string[];
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
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { events, fetchEvents } = useCalendarStoreSupabase();
  const { projects, fetchProjects, addProject } = useProjectStore();
  const { tasksTutorialCompleted, checkTasksTutorial, setTasksTutorialCompleted } = useOnboardingStore();
  const { clients, fetchClients, addClient } = useClientsStore();
  const { employees, fetchEmployees } = useEmployeesStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
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
  const [showLineItems, setShowLineItems] = useState(false);
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
    status: 'todo' as 'todo' | 'in-progress' | 'done'
  });

  useEffect(() => {
    fetchTasks();
    fetchEvents();
    fetchProjects();
    fetchClients();
    fetchEmployees();
  }, []);

  // Check tutorial status on mount
  useEffect(() => {
    const checkTutorial = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setUserId(user.id);
        const completed = await checkTasksTutorial(user.id);
        if (!completed) {
          setShowTutorial(true);
        }
      }
    };
    checkTutorial();
  }, []);

  const handleTutorialComplete = async (dontShowAgain: boolean) => {
    setShowTutorial(false);
    if (dontShowAgain && userId) {
      await setTasksTutorialCompleted(userId, true);
    }
  };

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
        .select('*, projects(name)')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const mappedTasks = (data || []).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status as 'todo' | 'in-progress' | 'done',
        due_date: t.due_date,
        priority: (t.priority || 'medium') as 'low' | 'medium' | 'high',
        project_id: t.project_id,
        project_name: t.projects?.name
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
          priority: newTask.priority,
          project_id: newTask.project_id,
          status: 'todo',
          // New enhanced fields
          client_id: newTask.client_id || null,
          assigned_employees: newTask.assigned_employees,
          line_items: newTask.line_items,
          send_invoice_on_complete: newTask.send_invoice_on_complete
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        alert('Error saving task: ' + error.message);
        throw error;
      }

      // Schedule notification if reminder is enabled and there's a due date
      if (task && newTask.reminder_enabled && dueDateTime) {
        try {
          const dueDate = new Date(dueDateTime);

          // Only schedule if the due date is in the future
          if (dueDate > new Date()) {
            await notificationService.scheduleTaskDeadline({
              taskId: task.id,
              title: `Task Reminder: ${task.title}`,
              body: newTask.priority === 'high' ? '⚠️ High priority task due soon!' : 'Task due soon',
              dueDate,
              priority: newTask.priority
            });
            console.log('Task notification scheduled');
          }
        } catch (notifError) {
          console.warn('Failed to schedule task notification:', notifError);
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
    // Parse date and time from due_date
    let dateStr = '';
    let timeStr = '09:00';
    if (task.due_date) {
      const d = parseISO(task.due_date);
      dateStr = format(d, 'yyyy-MM-dd');
      timeStr = format(d, 'HH:mm');
    }
    setEditTask({
      title: task.title,
      due_date: dateStr,
      due_time: timeStr,
      priority: task.priority,
      project_id: task.project_id || '',
      status: task.status
    });
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
        dueDateTime = `${editTask.due_date}T${editTask.due_time}:00`;
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          title: editTask.title,
          due_date: dueDateTime,
          priority: editTask.priority,
          project_id: editTask.project_id || null,
          status: editTask.status
        })
        .eq('id', selectedTask.id);

      if (error) {
        alert('Error updating task: ' + error.message);
        throw error;
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
        return <Clock className="w-5 h-5 text-blue-500" />;
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
      {/* Tasks Tutorial Modal */}
      <TasksTutorialModal
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Header - hidden when embedded */}
      {!embedded && (
        <>
          <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
            <div className="pt-[env(safe-area-inset-top)]">
              <div className="px-4 pb-5 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-7 h-7 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Tasks & Calendar</h1>
                      <p className={`text-base ${themeClasses.text.secondary}`}>{format(new Date(), 'EEEE, MMM d')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 active:scale-95 transition-all"
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
                  filter === 'all' && !selectedDate ? 'bg-blue-500/20 text-blue-500' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                onClick={() => { setFilter('today'); setSelectedDate(null); }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === 'today' && !selectedDate ? 'bg-blue-500/20 text-blue-500' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`
                }`}
              >
                Today ({tasks.filter(t => t.due_date && isToday(parseISO(t.due_date))).length})
              </button>
              {overdueCount > 0 && (
                <button
                  onClick={() => { setFilter('overdue'); setSelectedDate(null); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    filter === 'overdue' && !selectedDate ? 'bg-blue-500/20 text-blue-500' : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary}`
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
      <div className="px-4 pb-4 space-y-4 -mt-1">
        {/* Add Task Card */}
        <div className={`${themeClasses.bg.card} rounded-2xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-6 relative overflow-hidden`}>
          {/* Background decorations */}
          <div className="absolute -right-6 -top-6 w-44 h-44 bg-blue-500/10 rounded-full" />
          <div className="absolute right-16 top-20 w-28 h-28 bg-blue-500/5 rounded-full" />

          <div className="relative min-h-[240px] flex flex-col">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className={`font-bold ${themeClasses.text.primary} text-xl`}>Add Task</h3>
                <p className={`${themeClasses.text.secondary} text-base`}>Stay organized & on schedule</p>
              </div>
            </div>

            <p className={`${themeClasses.text.secondary} italic text-base flex-1`}>
              Create tasks with due dates, priorities, and project assignments to keep your work on track.
            </p>

            <div className="space-y-3 mt-auto">
              <button
                onClick={() => setShowAddTask(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-blue-500 text-white rounded-xl font-semibold text-lg hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-6 h-6" />
                Add Task
              </button>
              <button
                onClick={() => setShowAIChat(true)}
                className={`w-full flex items-center justify-center gap-2 px-5 py-4 ${theme === 'light' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-xl font-semibold text-lg active:scale-[0.98] transition-all`}
              >
                <Sparkles className="w-6 h-6" />
                AI Assistant
              </button>
            </div>
          </div>
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
                      ? 'bg-blue-500 text-white'
                      : isToday(day)
                      ? 'bg-blue-500/20 text-blue-500 font-semibold'
                      : isCurrentMonth
                      ? `${themeClasses.text.primary} ${themeClasses.hover.bg}`
                      : themeClasses.text.muted
                  }`}
                >
                  {format(day, 'd')}
                  {hasItems && !isSelected && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {taskCount > 0 && <div className="w-1 h-1 rounded-full bg-blue-500" />}
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

        {/* Today's Events */}
        {todayEvents.length > 0 && !selectedDate && filter === 'all' && (
          <div className={`${themeClasses.bg.card} rounded-2xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} overflow-hidden`}>
            <div className={`flex items-center justify-between p-4 border-b ${themeClasses.border.primary}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4 text-blue-500" />
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
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-blue-500" />
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
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-blue-500" />
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
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.project_name && (
                        <span className={`text-xs ${themeClasses.text.muted} flex items-center gap-1`}>
                          <Briefcase className="w-3 h-3" />
                          {task.project_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Pencil className={`w-4 h-4 ${themeClasses.text.muted} flex-shrink-0 mt-1`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
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
                className={`text-blue-500 text-base font-semibold active:text-blue-400 disabled:${themeClasses.text.muted}`}
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
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
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
                    <CalendarIcon className="w-5 h-5 text-blue-500" />
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
                                  ? 'bg-blue-500 text-white font-semibold'
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
                            ? 'bg-blue-500 text-white'
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
                            ? 'bg-blue-500 text-white'
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
                            ? 'bg-blue-500 text-white'
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
                                  ? 'bg-blue-500 text-white'
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

              {/* Reminder Toggle */}
              {newTask.due_date && (
                <div className={`${themeClasses.bg.input} rounded-xl p-4`}>
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
                          {newTask.reminder_enabled ? '1 hour before due time' : 'No notification'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNewTask({ ...newTask, reminder_enabled: !newTask.reminder_enabled })}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        newTask.reminder_enabled ? 'bg-blue-500' : theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full shadow transition-transform ${
                          newTask.reminder_enabled ? 'translate-x-6 bg-white' : theme === 'light' ? 'translate-x-1 bg-white' : 'translate-x-1 bg-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewTask({ ...newTask, priority: p })}
                      className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${
                        newTask.priority === p
                          ? p === 'high' ? 'bg-red-500 text-white'
                            : p === 'medium' ? 'bg-blue-500 text-white'
                            : 'bg-green-500 text-white'
                          : `${themeClasses.bg.input} ${themeClasses.text.secondary}`
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Project <span className="text-red-400">*</span></label>
                {!showQuickAddProject ? (
                  <div className="space-y-2">
                    <select
                      value={newTask.project_id}
                      onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    >
                      <option value="">Select a project...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddProject(true)}
                      className="flex items-center gap-2 text-blue-500 text-sm font-medium"
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
                        className={`flex-1 px-4 py-3 ${themeClasses.bg.input} border ${themeClasses.border.input} rounded-xl ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
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
                        className="px-4 py-3 bg-blue-500 text-white rounded-xl font-medium active:bg-blue-600"
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

              {/* Client Section */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Client</label>
                {!showAddClient ? (
                  <div className="space-y-2">
                    <select
                      value={newTask.client_id}
                      onChange={(e) => setNewTask({ ...newTask, client_id: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    >
                      <option value="">Select a client (optional)...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddClient(true)}
                      className="flex items-center gap-2 text-blue-500 text-sm font-medium"
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
                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium text-sm"
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
                            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
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
                      <span key={name} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-500 rounded-full text-sm">
                        {name}
                        <button
                          type="button"
                          onClick={() => setNewTask(prev => ({ ...prev, assigned_employees: prev.assigned_employees.filter(n => n !== name) }))}
                          className="hover:text-blue-400"
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
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span>Estimate & Line Items</span>
                    {newTask.line_items.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">{newTask.line_items.length}</span>
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
                        className={`flex-1 py-2 px-3 ${!showInlineAI ? 'bg-blue-500 text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.primary}`} rounded-lg text-sm font-medium flex items-center justify-center gap-2`}
                      >
                        <Calculator className="w-4 h-4" />
                        Line Items
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInlineAI(true)}
                        className={`flex-1 py-2 px-3 ${showInlineAI ? 'bg-blue-500 text-white' : `${themeClasses.bg.tertiary} ${themeClasses.text.primary}`} rounded-lg text-sm font-medium flex items-center justify-center gap-2`}
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

                              // Simulate AI generating line items (in production, call actual AI API)
                              setTimeout(() => {
                                // Generate sample line items based on keywords
                                const prompt = aiPrompt.toLowerCase();
                                const generatedItems: LineItem[] = [];

                                if (prompt.includes('deck') || prompt.includes('decking')) {
                                  generatedItems.push(
                                    { id: crypto.randomUUID(), description: 'Composite decking materials', quantity: 1, unitPrice: 2500, total: 2500 },
                                    { id: crypto.randomUUID(), description: 'Deck framing lumber', quantity: 1, unitPrice: 800, total: 800 },
                                    { id: crypto.randomUUID(), description: 'Hardware & fasteners', quantity: 1, unitPrice: 200, total: 200 },
                                    { id: crypto.randomUUID(), description: 'Labor - deck installation', quantity: 24, unitPrice: 75, total: 1800 }
                                  );
                                }
                                if (prompt.includes('railing') || prompt.includes('rail')) {
                                  generatedItems.push(
                                    { id: crypto.randomUUID(), description: 'Railing system', quantity: 1, unitPrice: 600, total: 600 },
                                    { id: crypto.randomUUID(), description: 'Labor - railing installation', quantity: 4, unitPrice: 75, total: 300 }
                                  );
                                }
                                if (prompt.includes('stair') || prompt.includes('steps')) {
                                  generatedItems.push(
                                    { id: crypto.randomUUID(), description: 'Stair materials', quantity: 1, unitPrice: 400, total: 400 },
                                    { id: crypto.randomUUID(), description: 'Labor - stair construction', quantity: 6, unitPrice: 75, total: 450 }
                                  );
                                }
                                if (prompt.includes('paint') || prompt.includes('painting')) {
                                  generatedItems.push(
                                    { id: crypto.randomUUID(), description: 'Paint & supplies', quantity: 1, unitPrice: 150, total: 150 },
                                    { id: crypto.randomUUID(), description: 'Labor - painting', quantity: 8, unitPrice: 65, total: 520 }
                                  );
                                }
                                if (prompt.includes('roof') || prompt.includes('roofing')) {
                                  generatedItems.push(
                                    { id: crypto.randomUUID(), description: 'Roofing materials (shingles)', quantity: 30, unitPrice: 45, total: 1350 },
                                    { id: crypto.randomUUID(), description: 'Underlayment & flashing', quantity: 1, unitPrice: 300, total: 300 },
                                    { id: crypto.randomUUID(), description: 'Labor - roof installation', quantity: 16, unitPrice: 85, total: 1360 }
                                  );
                                }
                                if (prompt.includes('plumb') || prompt.includes('pipe') || prompt.includes('faucet')) {
                                  generatedItems.push(
                                    { id: crypto.randomUUID(), description: 'Plumbing fixtures', quantity: 1, unitPrice: 350, total: 350 },
                                    { id: crypto.randomUUID(), description: 'Pipe & fittings', quantity: 1, unitPrice: 150, total: 150 },
                                    { id: crypto.randomUUID(), description: 'Labor - plumbing', quantity: 6, unitPrice: 95, total: 570 }
                                  );
                                }
                                if (prompt.includes('electric') || prompt.includes('wiring') || prompt.includes('outlet')) {
                                  generatedItems.push(
                                    { id: crypto.randomUUID(), description: 'Electrical materials', quantity: 1, unitPrice: 200, total: 200 },
                                    { id: crypto.randomUUID(), description: 'Labor - electrical work', quantity: 4, unitPrice: 95, total: 380 }
                                  );
                                }

                                // Default items if nothing specific matched
                                if (generatedItems.length === 0) {
                                  generatedItems.push(
                                    { id: crypto.randomUUID(), description: 'Materials', quantity: 1, unitPrice: 500, total: 500 },
                                    { id: crypto.randomUUID(), description: 'Labor', quantity: 8, unitPrice: 75, total: 600 }
                                  );
                                }

                                // Add generated items to line items
                                setNewTask(prev => ({
                                  ...prev,
                                  line_items: [...prev.line_items, ...generatedItems]
                                }));

                                setAiLoading(false);
                                setShowInlineAI(false); // Switch back to line items view
                                setAiPrompt('');
                              }, 1500);
                            }}
                            className={`mt-2 w-full py-2.5 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
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
                      className="flex items-center gap-2 text-blue-500 text-sm font-medium"
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
                          <span className="text-blue-500">
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowEditTask(false); setSelectedTask(null); }}
          />
          <div className={`relative ${themeClasses.bg.secondary} rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up mb-20`}>
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
                  className={`text-blue-500 text-base font-semibold active:text-blue-400 disabled:${themeClasses.text.muted}`}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                  Task Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editTask.title}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} ${theme === 'light' ? 'placeholder-gray-400' : 'placeholder-zinc-500'} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                  placeholder="What needs to be done?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Due Date</label>
                  <input
                    type="date"
                    value={editTask.due_date}
                    onChange={(e) => setEditTask({ ...editTask, due_date: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Time</label>
                  <input
                    type="time"
                    value={editTask.due_time}
                    onChange={(e) => setEditTask({ ...editTask, due_time: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border ${themeClasses.border.input} ${themeClasses.bg.input} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                  />
                </div>
              </div>

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
                            : s === 'in-progress' ? 'bg-blue-500 text-white'
                            : 'bg-zinc-500 text-white'
                          : `${themeClasses.bg.input} ${themeClasses.text.secondary}`
                      }`}
                    >
                      {s === 'todo' ? 'To Do' : s === 'in-progress' ? 'In Progress' : 'Done'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setEditTask({ ...editTask, priority: p })}
                      className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${
                        editTask.priority === p
                          ? p === 'high' ? 'bg-red-500 text-white'
                            : p === 'medium' ? 'bg-blue-500 text-white'
                            : 'bg-green-500 text-white'
                          : `${themeClasses.bg.input} ${themeClasses.text.secondary}`
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Project (Optional)</label>
                <select
                  value={editTask.project_id}
                  onChange={(e) => setEditTask({ ...editTask, project_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#3A3A3C] bg-[#262626] text-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 outline-none"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
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
