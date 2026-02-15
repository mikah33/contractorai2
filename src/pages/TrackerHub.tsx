import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Timer,
  Play,
  Square,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Search,
  Briefcase,
  X,
  ArrowLeft,
  Trash2,
  Pencil,
  DollarSign,
  Clock,
  Calendar,
  Users,
  AlertCircle,
  Car,
  MapPin,
  Navigation,
  Download,
  ChevronLeft,
  Check,
  Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useProjectStore from '../stores/projectStore';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';
import { format, differenceInSeconds, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO } from 'date-fns';

interface Employee {
  id: string;
  user_id: string;
  name: string;
  job_title: string;
  email: string;
  phone: string;
  hourly_rate: number;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  hourly_rate: number;
  total_pay: number | null;
  date: string;
  notes?: string;
  status: 'running' | 'completed';
  created_at: string;
}

interface ExpandedEmployeeData {
  todayEntries: TimeEntry[];
  weekEntries: TimeEntry[];
  todayTotal: number; // minutes
  weekTotal: number; // minutes
  todayEarnings: number;
  weekEarnings: number;
}

interface MileageTrip {
  id: string;
  user_id: string;
  employee_id: string | null;
  project_id: string | null;
  start_address: string;
  end_address: string;
  stops: string[];
  trip_date: string;
  total_miles: number;
  calculated_miles: number | null;
  purpose: string | null;
  notes: string | null;
  is_business: boolean;
  irs_rate: number;
  tax_deduction: number | null;
  created_at: string;
  // Joined data
  employee_name?: string;
  project_name?: string;
}

const IRS_MILEAGE_RATE = 0.67; // 2024 IRS standard mileage rate

const TrackerHub: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { projects, fetchProjects } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'timesheets' | 'mileage'>('timesheets');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, ExpandedEmployeeData>>({});

  // Timer display state (updates every second for running timers)
  const [timerTick, setTimerTick] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual entry modal
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryEmployee, setManualEntryEmployee] = useState<Employee | null>(null);
  const [manualEntryForm, setManualEntryForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    minutes: '',
    notes: ''
  });

  // Stop timer modal
  const [showStopModal, setShowStopModal] = useState(false);
  const [stoppingEntry, setStoppingEntry] = useState<{ entry: TimeEntry; employee: Employee } | null>(null);
  const [stopNotes, setStopNotes] = useState('');

  // Employee detail modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    job_title: '',
    email: '',
    phone: '',
    hourly_rate: 0,
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  // Mileage tracking state
  const [mileageTrips, setMileageTrips] = useState<MileageTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [tripWizardStep, setTripWizardStep] = useState(1); // 1: Addresses, 2: Details, 3: Confirm
  const [tripForm, setTripForm] = useState({
    startAddress: '',
    endAddress: '',
    stops: [] as string[],
    date: format(new Date(), 'yyyy-MM-dd'),
    purpose: '',
    notes: '',
    projectId: '',
    employeeId: '',
    isBusiness: true,
    totalMiles: '',
    calculatedMiles: null as number | null
  });
  const [newStop, setNewStop] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState<'start' | 'end' | 'stop' | null>(null);

  // Start timer every second for running timers
  useEffect(() => {
    const hasRunningTimers = timeEntries.some(e => e.status === 'running');
    if (hasRunningTimers) {
      timerRef.current = setInterval(() => {
        setTimerTick(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeEntries]);

  useEffect(() => {
    fetchEmployees();
    fetchTimeEntries();
    fetchProjects();
    fetchMileageTrips();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all entries from the past 7 days plus running entries
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .or(`date.gte.${format(weekStart, 'yyyy-MM-dd')},status.eq.running`)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const fetchMileageTrips = async () => {
    try {
      setLoadingTrips(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('mileage_trips')
        .select(`
          *,
          employees:employee_id (name),
          projects:project_id (name)
        `)
        .eq('user_id', user.id)
        .order('trip_date', { ascending: false });

      if (error) throw error;

      // Transform data to include employee/project names
      const transformedTrips = (data || []).map((trip: any) => ({
        ...trip,
        employee_name: trip.employees?.name || null,
        project_name: trip.projects?.name || null
      }));

      setMileageTrips(transformedTrips);
    } catch (error) {
      console.error('Error fetching mileage trips:', error);
    } finally {
      setLoadingTrips(false);
    }
  };

  const getRunningEntry = (employeeId: string): TimeEntry | undefined => {
    return timeEntries.find(e => e.employee_id === employeeId && e.status === 'running');
  };

  const calculateRunningDuration = (entry: TimeEntry): number => {
    const start = new Date(entry.start_time);
    return differenceInSeconds(new Date(), start);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHoursMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const startTimer = async (employee: Employee) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          employee_id: employee.id,
          user_id: user.id,
          start_time: now.toISOString(),
          hourly_rate: employee.hourly_rate,
          date: format(now, 'yyyy-MM-dd'),
          status: 'running'
        })
        .select()
        .single();

      if (error) throw error;
      setTimeEntries(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Failed to start timer');
    }
  };

  const initiateStopTimer = (entry: TimeEntry, employee: Employee) => {
    setStoppingEntry({ entry, employee });
    setStopNotes('');
    setShowStopModal(true);
  };

  const confirmStopTimer = async () => {
    if (!stoppingEntry) return;
    const { entry, employee } = stoppingEntry;

    try {
      const now = new Date();
      const start = new Date(entry.start_time);
      const durationMinutes = Math.round(differenceInSeconds(now, start) / 60);
      const totalPay = (durationMinutes / 60) * entry.hourly_rate;

      // Update time entry
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({
          end_time: now.toISOString(),
          duration_minutes: durationMinutes,
          total_pay: totalPay,
          status: 'completed',
          notes: stopNotes || null
        })
        .eq('id', entry.id);

      if (updateError) throw updateError;

      // Create expense entry for labor
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: expenseError } = await supabase
          .from('finance_expenses')
          .insert({
            vendor: `Labor - ${employee.name}`,
            amount: totalPay,
            date: format(now, 'yyyy-MM-dd'),
            category: 'labor',
            status: 'verified',
            notes: `${formatHoursMinutes(durationMinutes)} worked at $${entry.hourly_rate}/hr${stopNotes ? ` - ${stopNotes}` : ''}`,
            user_id: user.id
          });

        if (expenseError) {
          console.error('Error creating expense:', expenseError);
        }
      }

      // Update local state
      setTimeEntries(prev => prev.map(e =>
        e.id === entry.id
          ? { ...e, end_time: now.toISOString(), duration_minutes: durationMinutes, total_pay: totalPay, status: 'completed' as const, notes: stopNotes || undefined }
          : e
      ));

      setShowStopModal(false);
      setStoppingEntry(null);
    } catch (error) {
      console.error('Error stopping timer:', error);
      alert('Failed to stop timer');
    }
  };

  const openManualEntry = (employee: Employee) => {
    setManualEntryEmployee(employee);
    setManualEntryForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      hours: '',
      minutes: '',
      notes: ''
    });
    setShowManualEntry(true);
  };

  const submitManualEntry = async () => {
    if (!manualEntryEmployee) return;

    const hours = parseInt(manualEntryForm.hours) || 0;
    const minutes = parseInt(manualEntryForm.minutes) || 0;
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) {
      alert('Please enter a valid time');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const entryDate = parseISO(manualEntryForm.date);
      const totalPay = (totalMinutes / 60) * manualEntryEmployee.hourly_rate;

      // Create time entry
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          employee_id: manualEntryEmployee.id,
          user_id: user.id,
          start_time: entryDate.toISOString(),
          end_time: entryDate.toISOString(),
          duration_minutes: totalMinutes,
          hourly_rate: manualEntryEmployee.hourly_rate,
          total_pay: totalPay,
          date: manualEntryForm.date,
          status: 'completed',
          notes: manualEntryForm.notes || `Manual entry: ${formatHoursMinutes(totalMinutes)}`
        })
        .select()
        .single();

      if (error) throw error;

      // Create expense entry
      const { error: expenseError } = await supabase
        .from('finance_expenses')
        .insert({
          vendor: `Labor - ${manualEntryEmployee.name}`,
          amount: totalPay,
          date: manualEntryForm.date,
          category: 'labor',
          status: 'verified',
          notes: `${formatHoursMinutes(totalMinutes)} worked at $${manualEntryEmployee.hourly_rate}/hr (manual entry)${manualEntryForm.notes ? ` - ${manualEntryForm.notes}` : ''}`,
          user_id: user.id
        });

      if (expenseError) {
        console.error('Error creating expense:', expenseError);
      }

      setTimeEntries(prev => [data, ...prev]);
      setShowManualEntry(false);
      setManualEntryEmployee(null);
    } catch (error) {
      console.error('Error creating manual entry:', error);
      alert('Failed to create entry');
    }
  };

  // Employee detail/edit handlers
  const handleEditEmployee = (employee: Employee) => {
    setEditForm({
      id: employee.id,
      name: employee.name || '',
      job_title: employee.job_title || '',
      email: employee.email || '',
      phone: employee.phone || '',
      hourly_rate: employee.hourly_rate || 0,
      status: employee.status || 'active',
      notes: employee.notes || ''
    });
    setShowEditForm(true);
  };

  const handleUpdateEmployee = async () => {
    if (isUpdating) return;
    if (!editForm.name.trim()) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: editForm.name.trim(),
          job_title: editForm.job_title.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          hourly_rate: editForm.hourly_rate,
          status: editForm.status,
          notes: editForm.notes.trim() || null
        })
        .eq('id', editForm.id);

      if (error) throw error;
      await fetchEmployees();

      // Update selectedEmployee if it's the one being edited
      if (selectedEmployee && selectedEmployee.id === editForm.id) {
        setSelectedEmployee({
          ...selectedEmployee,
          name: editForm.name.trim(),
          job_title: editForm.job_title.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          hourly_rate: editForm.hourly_rate,
          status: editForm.status,
          notes: editForm.notes.trim() || undefined
        });
      }
      setShowEditForm(false);
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchEmployees();
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getEmployeeProjects = (employeeName: string) => {
    if (!employeeName) return [];
    return projects.filter(p => {
      let teamMembers = p.team || p.assigned_to || '';
      if (Array.isArray(teamMembers)) {
        teamMembers = teamMembers.join(',');
      }
      if (typeof teamMembers !== 'string') {
        teamMembers = String(teamMembers || '');
      }
      return teamMembers.toLowerCase().includes(employeeName.toLowerCase());
    });
  };

  const loadExpandedData = async (employeeId: string) => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

    const employeeEntries = timeEntries.filter(e => e.employee_id === employeeId);

    const todayEntries = employeeEntries.filter(e => {
      const entryDate = parseISO(e.date);
      return entryDate >= todayStart && entryDate <= todayEnd;
    });

    const weekEntries = employeeEntries.filter(e => {
      const entryDate = parseISO(e.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    const employee = employees.find(emp => emp.id === employeeId);
    const hourlyRate = employee?.hourly_rate || 0;

    const todayTotal = todayEntries.reduce((sum, e) => {
      if (e.status === 'running') {
        return sum + Math.round(calculateRunningDuration(e) / 60);
      }
      return sum + (e.duration_minutes || 0);
    }, 0);

    const weekTotal = weekEntries.reduce((sum, e) => {
      if (e.status === 'running') {
        return sum + Math.round(calculateRunningDuration(e) / 60);
      }
      return sum + (e.duration_minutes || 0);
    }, 0);

    const todayEarnings = (todayTotal / 60) * hourlyRate;
    const weekEarnings = (weekTotal / 60) * hourlyRate;

    setExpandedData(prev => ({
      ...prev,
      [employeeId]: {
        todayEntries,
        weekEntries,
        todayTotal,
        weekTotal,
        todayEarnings,
        weekEarnings
      }
    }));
  };

  const toggleExpanded = (employeeId: string) => {
    if (expandedEmployeeId === employeeId) {
      setExpandedEmployeeId(null);
    } else {
      setExpandedEmployeeId(employeeId);
      loadExpandedData(employeeId);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mileage tracking functions
  const resetTripForm = () => {
    setTripForm({
      startAddress: '',
      endAddress: '',
      stops: [],
      date: format(new Date(), 'yyyy-MM-dd'),
      purpose: '',
      notes: '',
      projectId: '',
      employeeId: '',
      isBusiness: true,
      totalMiles: '',
      calculatedMiles: null
    });
    setNewStop('');
    setTripWizardStep(1);
  };

  const addStop = () => {
    if (newStop.trim()) {
      setTripForm(prev => ({
        ...prev,
        stops: [...prev.stops, newStop.trim()]
      }));
      setNewStop('');
    }
  };

  const removeStop = (index: number) => {
    setTripForm(prev => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index)
    }));
  };

  const useProjectAddress = (addressType: 'start' | 'end' | 'stop', projectAddress: string) => {
    if (addressType === 'start') {
      setTripForm(prev => ({ ...prev, startAddress: projectAddress }));
    } else if (addressType === 'end') {
      setTripForm(prev => ({ ...prev, endAddress: projectAddress }));
    } else {
      setTripForm(prev => ({
        ...prev,
        stops: [...prev.stops, projectAddress]
      }));
    }
    setShowProjectPicker(null);
  };

  const saveTrip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const miles = parseFloat(tripForm.totalMiles);
      if (isNaN(miles) || miles <= 0) {
        alert('Please enter valid miles');
        return;
      }

      const tripData = {
        user_id: user.id,
        start_address: tripForm.startAddress.trim(),
        end_address: tripForm.endAddress.trim(),
        stops: tripForm.stops,
        trip_date: tripForm.date,
        total_miles: miles,
        calculated_miles: tripForm.calculatedMiles,
        purpose: tripForm.purpose.trim() || null,
        notes: tripForm.notes.trim() || null,
        employee_id: tripForm.employeeId || null,
        project_id: tripForm.projectId || null,
        is_business: tripForm.isBusiness,
        irs_rate: IRS_MILEAGE_RATE
      };

      const { error } = await supabase
        .from('mileage_trips')
        .insert(tripData);

      if (error) throw error;

      await fetchMileageTrips();
      setShowAddTrip(false);
      resetTripForm();
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('Failed to save trip');
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('mileage_trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
      setMileageTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  };

  const exportTripsToCSV = () => {
    if (mileageTrips.length === 0) {
      alert('No trips to export');
      return;
    }

    const headers = ['Date', 'Start Address', 'End Address', 'Stops', 'Miles', 'Business', 'Tax Deduction', 'Purpose', 'Employee', 'Project', 'Notes'];
    const rows = mileageTrips.map(trip => [
      trip.trip_date,
      trip.start_address,
      trip.end_address,
      (trip.stops || []).join('; '),
      trip.total_miles.toString(),
      trip.is_business ? 'Yes' : 'No',
      `$${(trip.tax_deduction || 0).toFixed(2)}`,
      trip.purpose || '',
      trip.employee_name || '',
      trip.project_name || '',
      trip.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mileage-trips-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // Calculate mileage stats
  const getMileageStats = () => {
    const thisMonth = mileageTrips.filter(t => {
      const tripDate = parseISO(t.trip_date);
      const now = new Date();
      return tripDate.getMonth() === now.getMonth() && tripDate.getFullYear() === now.getFullYear();
    });

    const thisYear = mileageTrips.filter(t => {
      const tripDate = parseISO(t.trip_date);
      return tripDate.getFullYear() === new Date().getFullYear();
    });

    const businessTrips = mileageTrips.filter(t => t.is_business);

    return {
      totalTrips: mileageTrips.length,
      monthMiles: thisMonth.reduce((sum, t) => sum + t.total_miles, 0),
      yearMiles: thisYear.reduce((sum, t) => sum + t.total_miles, 0),
      yearDeduction: businessTrips.filter(t => parseISO(t.trip_date).getFullYear() === new Date().getFullYear())
        .reduce((sum, t) => sum + (t.tax_deduction || 0), 0)
    };
  };

  // Calculate quick stats for each employee
  const getEmployeeQuickStats = (employeeId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEntries = timeEntries.filter(e => e.employee_id === employeeId && e.date === today);
    const runningEntry = getRunningEntry(employeeId);

    let todayMinutes = todayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    if (runningEntry) {
      todayMinutes += Math.round(calculateRunningDuration(runningEntry) / 60);
    }

    const employee = employees.find(emp => emp.id === employeeId);
    const todayEarnings = (todayMinutes / 60) * (employee?.hourly_rate || 0);

    return { todayMinutes, todayEarnings, isRunning: !!runningEntry, runningEntry };
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg.primary} pb-40`}>
      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="px-4 pb-4 pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Timer className="w-7 h-7 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Tracker</h1>
                  <p className={`text-base ${themeClasses.text.secondary}`}>Employee time tracking</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className={`flex rounded-xl ${themeClasses.bg.tertiary} p-1`}>
              <button
                onClick={() => setActiveTab('timesheets')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'timesheets'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : `${themeClasses.text.secondary}`
                }`}
              >
                Employee Timesheets
              </button>
              <button
                onClick={() => setActiveTab('mileage')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'mileage'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : `${themeClasses.text.secondary}`
                }`}
              >
                <Car className="w-4 h-4" />
                Miles Tracking
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Spacer for fixed header */}
      <div className="pt-[calc(env(safe-area-inset-top)+155px)]" />

      {activeTab === 'timesheets' && (
        <>
          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${themeClasses.text.muted}`} />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 ${themeClasses.bg.input} rounded-lg border ${themeClasses.border.input} ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} focus:ring-2 focus:ring-blue-500 transition-all`}
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="px-4 py-2 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'light' ? 'border-gray-900' : 'border-white'}`}></div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className={`w-12 h-12 ${themeClasses.text.muted} mx-auto mb-3`} />
                <p className={`${themeClasses.text.secondary} font-medium`}>No employees found</p>
                <p className={`text-sm ${themeClasses.text.muted} mt-1`}>Add team members in the Team tab</p>
                <button
                  onClick={() => navigate('/employees-hub')}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium"
                >
                  Go to Team
                </button>
              </div>
            ) : (
              filteredEmployees.map((employee) => {
                const stats = getEmployeeQuickStats(employee.id);
                const isExpanded = expandedEmployeeId === employee.id;
                const data = expandedData[employee.id];

                return (
                  <div
                    key={employee.id}
                    className={`${themeClasses.bg.card} rounded-2xl border ${themeClasses.border.secondary} overflow-hidden`}
                  >
                    {/* Main Row */}
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 font-bold text-sm">
                          {getInitials(employee.name || 'NA')}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold ${themeClasses.text.primary} truncate`}>
                            {employee.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-sm ${themeClasses.text.secondary}`}>
                              ${employee.hourly_rate}/hr
                            </span>
                            {employee.job_title && (
                              <>
                                <span className={themeClasses.text.muted}>•</span>
                                <span className={`text-sm ${themeClasses.text.muted} truncate`}>
                                  {employee.job_title}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Timer Button */}
                        {stats.isRunning ? (
                          <button
                            onClick={() => initiateStopTimer(stats.runningEntry!, employee)}
                            className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
                          >
                            <Square className="w-6 h-6 text-white" fill="white" />
                          </button>
                        ) : (
                          <button
                            onClick={() => startTimer(employee)}
                            className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
                          >
                            <Play className="w-6 h-6 text-white" fill="white" />
                          </button>
                        )}
                      </div>

                      {/* Running Timer Display */}
                      {stats.isRunning && stats.runningEntry && (
                        <div className={`mt-3 p-3 rounded-xl ${theme === 'light' ? 'bg-red-50 border border-red-200' : 'bg-red-500/10 border border-red-500/30'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              <span className={`text-sm font-medium ${theme === 'light' ? 'text-red-700' : 'text-red-400'}`}>
                                Timer Running
                              </span>
                            </div>
                            <span className={`text-lg font-mono font-bold ${theme === 'light' ? 'text-red-700' : 'text-red-400'}`}>
                              {formatDuration(calculateRunningDuration(stats.runningEntry))}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Quick Stats */}
                      <div className={`mt-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-4 h-4 ${themeClasses.text.muted}`} />
                            <span className={`text-sm ${themeClasses.text.secondary}`}>
                              Today: {formatHoursMinutes(stats.todayMinutes)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className={`w-4 h-4 text-emerald-500`} />
                            <span className={`text-sm font-medium text-emerald-500`}>
                              ${stats.todayEarnings.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleExpanded(employee.id)}
                          className={`flex items-center gap-1 text-sm ${themeClasses.text.secondary} active:opacity-70`}
                        >
                          {isExpanded ? (
                            <>
                              <span>Less</span>
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <span>More</span>
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Section */}
                    {isExpanded && data && (
                      <div className={`border-t ${themeClasses.border.primary} p-4 space-y-4`}>
                        {/* Week Summary */}
                        <div className={`grid grid-cols-2 gap-3`}>
                          <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-blue-50' : 'bg-blue-500/10'}`}>
                            <p className={`text-xs ${themeClasses.text.muted} mb-1`}>This Week</p>
                            <p className={`text-lg font-bold ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>
                              {formatHoursMinutes(data.weekTotal)}
                            </p>
                          </div>
                          <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-emerald-50' : 'bg-emerald-500/10'}`}>
                            <p className={`text-xs ${themeClasses.text.muted} mb-1`}>Week Earnings</p>
                            <p className={`text-lg font-bold text-emerald-500`}>
                              ${data.weekEarnings.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Today's Entries */}
                        {data.todayEntries.length > 0 && (
                          <div>
                            <p className={`text-xs font-medium ${themeClasses.text.muted} mb-2`}>Today's Entries</p>
                            <div className="space-y-2">
                              {data.todayEntries.map(entry => (
                                <div
                                  key={entry.id}
                                  className={`flex items-center justify-between p-2 rounded-lg ${themeClasses.bg.tertiary}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {entry.status === 'running' ? (
                                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    ) : (
                                      <div className={`w-2 h-2 rounded-full ${theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'}`} />
                                    )}
                                    <span className={`text-sm ${themeClasses.text.secondary}`}>
                                      {entry.status === 'running'
                                        ? formatDuration(calculateRunningDuration(entry))
                                        : formatHoursMinutes(entry.duration_minutes || 0)
                                      }
                                    </span>
                                  </div>
                                  <span className={`text-sm font-medium ${entry.status === 'running' ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {entry.status === 'running'
                                      ? `$${((calculateRunningDuration(entry) / 3600) * entry.hourly_rate).toFixed(2)}`
                                      : `$${(entry.total_pay || 0).toFixed(2)}`
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => openManualEntry(employee)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl ${themeClasses.bg.tertiary} ${themeClasses.text.secondary} font-medium active:opacity-70`}
                          >
                            <Plus className="w-4 h-4" />
                            Add Manual Entry
                          </button>
                          <button
                            onClick={() => setSelectedEmployee(employee)}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${themeClasses.bg.tertiary} ${themeClasses.text.secondary} font-medium active:opacity-70`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'mileage' && (
        <div className="px-4 py-2 space-y-4">
          {/* Stats Cards */}
          {(() => {
            const stats = getMileageStats();
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-blue-200' : 'bg-blue-500/10'}`}>
                  <p className={`text-xs ${theme === 'light' ? 'text-blue-700' : themeClasses.text.muted} mb-1`}>This Month</p>
                  <p className={`text-lg font-bold ${theme === 'light' ? 'text-blue-800' : 'text-blue-400'}`}>
                    {stats.monthMiles.toFixed(1)} mi
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-purple-200' : 'bg-purple-500/10'}`}>
                  <p className={`text-xs ${theme === 'light' ? 'text-purple-700' : themeClasses.text.muted} mb-1`}>This Year</p>
                  <p className={`text-lg font-bold ${theme === 'light' ? 'text-purple-800' : 'text-purple-400'}`}>
                    {stats.yearMiles.toFixed(1)} mi
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-emerald-200' : 'bg-emerald-500/10'}`}>
                  <p className={`text-xs ${theme === 'light' ? 'text-emerald-700' : themeClasses.text.muted} mb-1`}>Tax Deduction</p>
                  <p className={`text-lg font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-500'}`}>
                    ${stats.yearDeduction.toFixed(0)}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                resetTripForm();
                setShowAddTrip(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-transform"
            >
              <Plus className="w-5 h-5" />
              Add Trip
            </button>
            <button
              onClick={exportTripsToCSV}
              className={`px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} ${themeClasses.text.secondary} font-medium active:opacity-70`}
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {/* Trip History */}
          <div>
            <h3 className={`text-sm font-medium ${themeClasses.text.muted} mb-3`}>Trip History</h3>
            {loadingTrips ? (
              <div className="flex items-center justify-center py-12">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'light' ? 'border-gray-900' : 'border-white'}`}></div>
              </div>
            ) : mileageTrips.length === 0 ? (
              <div className="text-center py-12">
                <Car className={`w-12 h-12 ${themeClasses.text.muted} mx-auto mb-3`} />
                <p className={`${themeClasses.text.secondary} font-medium`}>No trips recorded</p>
                <p className={`text-sm ${themeClasses.text.muted} mt-1`}>Add your first trip to start tracking miles</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mileageTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className={`${themeClasses.bg.card} rounded-2xl border ${themeClasses.border.secondary} p-4`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                            {format(parseISO(trip.trip_date), 'MMM d, yyyy')}
                          </span>
                          {trip.is_business && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 text-xs font-medium rounded-full">
                              Business
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${themeClasses.text.primary}`}>
                            {trip.total_miles} mi
                          </span>
                          {trip.is_business && trip.tax_deduction && (
                            <span className="text-sm font-medium text-emerald-500">
                              +${trip.tax_deduction.toFixed(2)} deduction
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this trip?')) {
                            deleteTrip(trip.id);
                          }
                        }}
                        className={`p-2 ${themeClasses.text.muted} active:text-red-500`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Route */}
                    <div className={`flex items-start gap-2 text-sm ${themeClasses.text.secondary}`}>
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <div className={`w-0.5 flex-1 ${theme === 'light' ? 'bg-gray-200' : 'bg-zinc-700'} my-1`} style={{ minHeight: '20px' }} />
                        {trip.stops && trip.stops.length > 0 && trip.stops.map((_, i) => (
                          <React.Fragment key={i}>
                            <div className={`w-2 h-2 ${theme === 'light' ? 'bg-gray-400' : 'bg-zinc-500'} rounded-full`} />
                            <div className={`w-0.5 flex-1 ${theme === 'light' ? 'bg-gray-200' : 'bg-zinc-700'} my-1`} style={{ minHeight: '20px' }} />
                          </React.Fragment>
                        ))}
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{trip.start_address}</p>
                        {trip.stops && trip.stops.length > 0 && trip.stops.map((stop: string, i: number) => (
                          <p key={i} className={`truncate ${themeClasses.text.muted} mt-2`}>{stop}</p>
                        ))}
                        <p className="truncate mt-2">{trip.end_address}</p>
                      </div>
                    </div>

                    {/* Meta info */}
                    {(trip.purpose || trip.employee_name || trip.project_name) && (
                      <div className={`flex flex-wrap gap-2 mt-3 pt-3 border-t ${themeClasses.border.primary}`}>
                        {trip.purpose && (
                          <span className={`text-xs ${themeClasses.text.muted}`}>
                            📝 {trip.purpose}
                          </span>
                        )}
                        {trip.employee_name && (
                          <span className={`text-xs ${themeClasses.text.muted}`}>
                            👤 {trip.employee_name}
                          </span>
                        )}
                        {trip.project_name && (
                          <span className={`text-xs ${themeClasses.text.muted}`}>
                            📁 {trip.project_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stop Timer Modal */}
      {showStopModal && stoppingEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowStopModal(false)}
          />
          <div className={`relative ${themeClasses.bg.secondary} rounded-2xl w-full max-w-md p-6 animate-slide-up`}>
            <h2 className={`text-xl font-bold ${themeClasses.text.primary} mb-2`}>Stop Timer</h2>
            <p className={`${themeClasses.text.secondary} mb-4`}>
              Stopping timer for <span className="font-semibold">{stoppingEntry.employee.name}</span>
            </p>

            {/* Timer Summary */}
            <div className={`p-4 rounded-xl ${themeClasses.bg.tertiary} mb-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={themeClasses.text.secondary}>Duration</span>
                <span className={`text-lg font-mono font-bold ${themeClasses.text.primary}`}>
                  {formatDuration(calculateRunningDuration(stoppingEntry.entry))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={themeClasses.text.secondary}>Earnings</span>
                <span className="text-lg font-bold text-emerald-500">
                  ${((calculateRunningDuration(stoppingEntry.entry) / 3600) * stoppingEntry.entry.hourly_rate).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                Notes (optional)
              </label>
              <textarea
                value={stopNotes}
                onChange={(e) => setStopNotes(e.target.value)}
                rows={2}
                className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none`}
                placeholder="What was worked on?"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowStopModal(false)}
                className={`flex-1 py-3 rounded-xl ${themeClasses.bg.tertiary} ${themeClasses.text.secondary} font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={confirmStopTimer}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium"
              >
                Stop & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && manualEntryEmployee && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowManualEntry(false)}
          />
          <div className={`relative ${themeClasses.bg.secondary} rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up`}>
            <div className={`sticky top-0 ${themeClasses.bg.secondary} px-4 py-4 border-b ${themeClasses.border.secondary} flex items-center justify-between z-10`}>
              <button
                onClick={() => setShowManualEntry(false)}
                className={`${themeClasses.text.secondary} text-base font-medium active:opacity-70`}
              >
                Cancel
              </button>
              <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Manual Entry</h2>
              <button
                onClick={submitManualEntry}
                className="text-blue-500 text-base font-semibold active:text-blue-400"
              >
                Save
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className={`p-4 rounded-xl ${themeClasses.bg.tertiary}`}>
                <p className={`text-sm ${themeClasses.text.muted}`}>Adding time for</p>
                <p className={`font-semibold ${themeClasses.text.primary}`}>{manualEntryEmployee.name}</p>
                <p className={`text-sm ${themeClasses.text.secondary}`}>${manualEntryEmployee.hourly_rate}/hr</p>
              </div>

              {/* Date */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Date</label>
                <input
                  type="date"
                  value={manualEntryForm.date}
                  onChange={(e) => setManualEntryForm({ ...manualEntryForm, date: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                />
              </div>

              {/* Hours & Minutes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Hours</label>
                  <input
                    type="number"
                    value={manualEntryForm.hours}
                    onChange={(e) => setManualEntryForm({ ...manualEntryForm, hours: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Minutes</label>
                  <input
                    type="number"
                    value={manualEntryForm.minutes}
                    onChange={(e) => setManualEntryForm({ ...manualEntryForm, minutes: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    placeholder="0"
                    min="0"
                    max="59"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Notes</label>
                <textarea
                  value={manualEntryForm.notes}
                  onChange={(e) => setManualEntryForm({ ...manualEntryForm, notes: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none`}
                  placeholder="What was worked on?"
                />
              </div>

              {/* Calculated Pay */}
              {(parseInt(manualEntryForm.hours) > 0 || parseInt(manualEntryForm.minutes) > 0) && (
                <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-emerald-50' : 'bg-emerald-500/10'}`}>
                  <div className="flex items-center justify-between">
                    <span className={themeClasses.text.secondary}>Total Pay</span>
                    <span className="text-xl font-bold text-emerald-500">
                      ${(((parseInt(manualEntryForm.hours) || 0) * 60 + (parseInt(manualEntryForm.minutes) || 0)) / 60 * manualEntryEmployee.hourly_rate).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[200] overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 transition-opacity"
            onClick={() => setSelectedEmployee(null)}
          />

          {/* Slide-up Modal */}
          <div className={`absolute inset-x-0 bottom-0 top-12 ${themeClasses.bg.primary} rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden`}>
            {/* Header */}
            <div className={`${themeClasses.bg.secondary} px-4 py-4 border-b ${themeClasses.border.secondary} flex-shrink-0`}>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className={`flex items-center gap-2 ${themeClasses.text.secondary} active:opacity-70`}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditEmployee(selectedEmployee)}
                    className="p-2 text-blue-400 active:text-blue-300 active:bg-blue-500/10 rounded-xl"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${selectedEmployee.name}"? This cannot be undone.`)) {
                        handleDeleteEmployee(selectedEmployee.id);
                      }
                    }}
                    className="p-2 text-red-400 active:text-red-300 active:bg-red-500/10 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Employee Title */}
              <div className="mt-3 flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                  {getInitials(selectedEmployee.name || 'NA')}
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${themeClasses.text.primary}`}>{selectedEmployee.name || 'Unknown'}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedEmployee.job_title && (
                      <span className={`text-sm ${themeClasses.text.secondary}`}>{selectedEmployee.job_title}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedEmployee.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {(selectedEmployee.status || 'active').charAt(0).toUpperCase() + (selectedEmployee.status || 'active').slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">

              {/* Contact Info Card */}
              <div className={`${themeClasses.bg.card} border ${themeClasses.border.secondary} rounded-2xl p-4`}>
                <label className={`text-xs ${themeClasses.text.muted} mb-3 block`}>Contact Information</label>
                <div className="space-y-3">
                  {selectedEmployee.email && (
                    <a href={`mailto:${selectedEmployee.email}`} className={`flex items-center gap-3 ${themeClasses.text.secondary} active:text-blue-400`}>
                      <div className="w-10 h-10 bg-blue-900/30 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className={`text-xs ${themeClasses.text.muted}`}>Email</p>
                        <p className="font-medium">{selectedEmployee.email}</p>
                      </div>
                    </a>
                  )}
                  {selectedEmployee.phone && (
                    <a href={`tel:${selectedEmployee.phone}`} className={`flex items-center gap-3 ${themeClasses.text.secondary} active:text-blue-400`}>
                      <div className="w-10 h-10 bg-blue-900/30 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className={`text-xs ${themeClasses.text.muted}`}>Phone</p>
                        <p className="font-medium">{selectedEmployee.phone}</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>

              {/* Pay Info Card */}
              <div className={`${themeClasses.bg.card} border ${themeClasses.border.secondary} rounded-2xl p-4`}>
                <label className={`text-xs ${themeClasses.text.muted} mb-3 block`}>Compensation</label>
                <div className="flex items-center gap-4">
                  <div className={`flex-1 text-center p-3 rounded-xl ${theme === 'light' ? 'bg-emerald-100' : 'bg-emerald-900/30'}`}>
                    <p className={`text-2xl font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      ${selectedEmployee.hourly_rate || 0}
                    </p>
                    <p className={`text-xs ${themeClasses.text.muted} mt-1`}>Hourly Rate</p>
                  </div>
                  <div className={`flex-1 text-center p-3 rounded-xl ${theme === 'light' ? 'bg-blue-100' : 'bg-blue-900/20'}`}>
                    <p className={`text-2xl font-bold ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>
                      {getEmployeeProjects(selectedEmployee.name).length}
                    </p>
                    <p className={`text-xs ${themeClasses.text.muted} mt-1`}>Active Projects</p>
                  </div>
                </div>
              </div>

              {/* Projects Card */}
              <div className={`${themeClasses.bg.card} border ${themeClasses.border.secondary} rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <label className={`text-xs ${themeClasses.text.muted}`}>Assigned Projects</label>
                  <button
                    onClick={() => {
                      setSelectedEmployee(null);
                      navigate('/projects-hub');
                    }}
                    className="text-xs text-blue-400 font-medium"
                  >
                    View All
                  </button>
                </div>
                {(() => {
                  const empProjects = getEmployeeProjects(selectedEmployee.name);
                  if (empProjects.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <Briefcase className={`w-8 h-8 ${themeClasses.text.muted} mx-auto mb-2`} />
                        <p className={`text-sm ${themeClasses.text.muted}`}>No projects assigned</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {empProjects.slice(0, 5).map((project: any) => (
                        <div
                          key={project.id}
                          onClick={() => {
                            setSelectedEmployee(null);
                            navigate('/projects-hub');
                          }}
                          className={`flex items-center gap-3 p-3 ${themeClasses.bg.tertiary} rounded-xl ${themeClasses.hover.bg}`}
                        >
                          <div className="w-10 h-10 bg-blue-900/30 rounded-xl flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${themeClasses.text.primary} truncate`}>{project.name}</p>
                            <p className={`text-xs ${themeClasses.text.muted}`}>
                              {project.status === 'active' || project.status === 'in_progress' ? 'Active' : project.status === 'completed' ? 'Completed' : 'On Hold'}
                              {project.budget ? ` • ${formatCurrency(project.budget)}` : ''}
                            </p>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${themeClasses.text.muted}`} />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Notes Card */}
              {selectedEmployee.notes && (
                <div className={`${themeClasses.bg.card} border ${themeClasses.border.secondary} rounded-2xl p-4`}>
                  <label className={`text-xs ${themeClasses.text.muted} mb-2 block`}>Notes</label>
                  <p className={`text-sm ${themeClasses.text.secondary} whitespace-pre-wrap`}>{selectedEmployee.notes}</p>
                </div>
              )}

              {/* Member Since */}
              {formatDate(selectedEmployee.created_at) && (
                <div className={`text-center text-xs ${themeClasses.text.muted} pt-2`}>
                  Team member since {formatDate(selectedEmployee.created_at)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Trip Wizard Modal */}
      {showAddTrip && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowAddTrip(false)}
          />
          <div className={`relative ${themeClasses.bg.secondary} rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up`}>
            {/* Header */}
            <div className={`sticky top-0 ${themeClasses.bg.secondary} px-4 py-4 border-b ${themeClasses.border.secondary} z-10`}>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (tripWizardStep > 1) {
                      setTripWizardStep(tripWizardStep - 1);
                    } else {
                      setShowAddTrip(false);
                    }
                  }}
                  className={`flex items-center gap-1 ${themeClasses.text.secondary} text-base font-medium active:opacity-70`}
                >
                  <ChevronLeft className="w-5 h-5" />
                  {tripWizardStep > 1 ? 'Back' : 'Cancel'}
                </button>
                <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                  Add Trip
                </h2>
                <div className="w-16" /> {/* Spacer */}
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex-1 flex items-center">
                    <div className={`flex-1 h-1 rounded-full transition-colors ${
                      step <= tripWizardStep
                        ? 'bg-blue-500'
                        : theme === 'light' ? 'bg-gray-200' : 'bg-zinc-700'
                    }`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className={`text-xs ${tripWizardStep >= 1 ? 'text-blue-500' : themeClasses.text.muted}`}>Addresses</span>
                <span className={`text-xs ${tripWizardStep >= 2 ? 'text-blue-500' : themeClasses.text.muted}`}>Details</span>
                <span className={`text-xs ${tripWizardStep >= 3 ? 'text-blue-500' : themeClasses.text.muted}`}>Confirm</span>
              </div>
            </div>

            <div className="p-4 pb-8">
              {/* Step 1: Addresses */}
              {tripWizardStep === 1 && (
                <div className="space-y-4">
                  {/* Start Address */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                        Starting Address <span className="text-red-400">*</span>
                      </label>
                      <button
                        onClick={() => setShowProjectPicker(showProjectPicker === 'start' ? null : 'start')}
                        className="text-xs text-blue-500 font-medium"
                      >
                        Use Project Address
                      </button>
                    </div>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500`} />
                      <input
                        type="text"
                        value={tripForm.startAddress}
                        onChange={(e) => setTripForm({ ...tripForm, startAddress: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                        placeholder="123 Main St, City, State"
                      />
                    </div>
                    {showProjectPicker === 'start' && (
                      <div className={`mt-2 p-2 rounded-xl ${themeClasses.bg.tertiary} max-h-40 overflow-y-auto`}>
                        {projects.filter(p => p.address).map(p => (
                          <button
                            key={p.id}
                            onClick={() => useProjectAddress('start', p.address!)}
                            className={`w-full text-left px-3 py-2 rounded-lg ${themeClasses.hover.bg} ${themeClasses.text.secondary}`}
                          >
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className={`text-xs ${themeClasses.text.muted} truncate`}>{p.address}</p>
                          </button>
                        ))}
                        {projects.filter(p => p.address).length === 0 && (
                          <p className={`text-sm ${themeClasses.text.muted} text-center py-2`}>No project addresses available</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stops */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                        Stops (optional)
                      </label>
                      <button
                        onClick={() => setShowProjectPicker(showProjectPicker === 'stop' ? null : 'stop')}
                        className="text-xs text-blue-500 font-medium"
                      >
                        Add from Project
                      </button>
                    </div>
                    {tripForm.stops.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {tripForm.stops.map((stop, index) => (
                          <div key={index} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${themeClasses.bg.tertiary}`}>
                            <div className={`w-2 h-2 rounded-full ${theme === 'light' ? 'bg-gray-400' : 'bg-zinc-500'}`} />
                            <span className={`flex-1 text-sm ${themeClasses.text.secondary} truncate`}>{stop}</span>
                            <button
                              onClick={() => removeStop(index)}
                              className="text-red-400 active:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newStop}
                        onChange={(e) => setNewStop(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addStop()}
                        className={`flex-1 px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                        placeholder="Add a stop address"
                      />
                      <button
                        onClick={addStop}
                        disabled={!newStop.trim()}
                        className="px-4 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {showProjectPicker === 'stop' && (
                      <div className={`mt-2 p-2 rounded-xl ${themeClasses.bg.tertiary} max-h-40 overflow-y-auto`}>
                        {projects.filter(p => p.address).map(p => (
                          <button
                            key={p.id}
                            onClick={() => useProjectAddress('stop', p.address!)}
                            className={`w-full text-left px-3 py-2 rounded-lg ${themeClasses.hover.bg} ${themeClasses.text.secondary}`}
                          >
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className={`text-xs ${themeClasses.text.muted} truncate`}>{p.address}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* End Address */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                        Ending Address <span className="text-red-400">*</span>
                      </label>
                      <button
                        onClick={() => setShowProjectPicker(showProjectPicker === 'end' ? null : 'end')}
                        className="text-xs text-blue-500 font-medium"
                      >
                        Use Project Address
                      </button>
                    </div>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500`} />
                      <input
                        type="text"
                        value={tripForm.endAddress}
                        onChange={(e) => setTripForm({ ...tripForm, endAddress: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                        placeholder="456 Oak Ave, City, State"
                      />
                    </div>
                    {showProjectPicker === 'end' && (
                      <div className={`mt-2 p-2 rounded-xl ${themeClasses.bg.tertiary} max-h-40 overflow-y-auto`}>
                        {projects.filter(p => p.address).map(p => (
                          <button
                            key={p.id}
                            onClick={() => useProjectAddress('end', p.address!)}
                            className={`w-full text-left px-3 py-2 rounded-lg ${themeClasses.hover.bg} ${themeClasses.text.secondary}`}
                          >
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className={`text-xs ${themeClasses.text.muted} truncate`}>{p.address}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setTripWizardStep(2)}
                    disabled={!tripForm.startAddress.trim() || !tripForm.endAddress.trim()}
                    className="w-full py-4 bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Step 2: Details */}
              {tripWizardStep === 2 && (
                <div className="space-y-4">
                  {/* Date */}
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                      Trip Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={tripForm.date}
                      onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    />
                  </div>

                  {/* Miles */}
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                      Total Miles <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Navigation className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${themeClasses.text.muted}`} />
                      <input
                        type="number"
                        value={tripForm.totalMiles}
                        onChange={(e) => setTripForm({ ...tripForm, totalMiles: e.target.value })}
                        className={`w-full pl-10 pr-16 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                        placeholder="0.0"
                        step="0.1"
                        min="0"
                      />
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${themeClasses.text.muted}`}>miles</span>
                    </div>
                    {tripForm.totalMiles && parseFloat(tripForm.totalMiles) > 0 && tripForm.isBusiness && (
                      <p className="text-sm text-emerald-500 mt-1">
                        ≈ ${(parseFloat(tripForm.totalMiles) * IRS_MILEAGE_RATE).toFixed(2)} tax deduction
                      </p>
                    )}
                  </div>

                  {/* Business Trip Toggle */}
                  <div className={`flex items-center justify-between p-4 rounded-xl ${themeClasses.bg.tertiary}`}>
                    <div>
                      <p className={`font-medium ${themeClasses.text.primary}`}>Business Trip</p>
                      <p className={`text-sm ${themeClasses.text.muted}`}>Track for IRS tax deduction at ${IRS_MILEAGE_RATE}/mi</p>
                    </div>
                    <button
                      onClick={() => setTripForm({ ...tripForm, isBusiness: !tripForm.isBusiness })}
                      className={`w-14 h-8 rounded-full transition-colors ${
                        tripForm.isBusiness ? 'bg-blue-500' : theme === 'light' ? 'bg-gray-200' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                        tripForm.isBusiness ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                      Purpose (optional)
                    </label>
                    <input
                      type="text"
                      value={tripForm.purpose}
                      onChange={(e) => setTripForm({ ...tripForm, purpose: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                      placeholder="e.g., Client meeting, Site inspection"
                    />
                  </div>

                  {/* Link to Employee/Project */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Employee</label>
                      <select
                        value={tripForm.employeeId}
                        onChange={(e) => setTripForm({ ...tripForm, employeeId: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                      >
                        <option value="">None</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Project</label>
                      <select
                        value={tripForm.projectId}
                        onChange={(e) => setTripForm({ ...tripForm, projectId: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                      >
                        <option value="">None</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Notes (optional)</label>
                    <textarea
                      value={tripForm.notes}
                      onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })}
                      rows={2}
                      className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none`}
                      placeholder="Additional details..."
                    />
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setTripWizardStep(3)}
                    disabled={!tripForm.totalMiles || parseFloat(tripForm.totalMiles) <= 0}
                    className="w-full py-4 bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Review Trip
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Step 3: Confirm */}
              {tripWizardStep === 3 && (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className={`${themeClasses.bg.tertiary} rounded-2xl p-4 space-y-4`}>
                    <div className="flex items-center justify-between">
                      <span className={themeClasses.text.secondary}>Date</span>
                      <span className={`font-medium ${themeClasses.text.primary}`}>
                        {format(parseISO(tripForm.date), 'MMM d, yyyy')}
                      </span>
                    </div>

                    <div className={`border-t ${themeClasses.border.primary} pt-4`}>
                      <p className={`text-xs ${themeClasses.text.muted} mb-2`}>Route</p>
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center pt-1">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <div className={`w-0.5 flex-1 ${theme === 'light' ? 'bg-gray-200' : 'bg-zinc-700'} my-1`} style={{ minHeight: '20px' }} />
                          {tripForm.stops.map((_, i) => (
                            <React.Fragment key={i}>
                              <div className={`w-2 h-2 ${theme === 'light' ? 'bg-gray-400' : 'bg-zinc-500'} rounded-full`} />
                              <div className={`w-0.5 flex-1 ${theme === 'light' ? 'bg-gray-200' : 'bg-zinc-700'} my-1`} style={{ minHeight: '20px' }} />
                            </React.Fragment>
                          ))}
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                        </div>
                        <div className={`flex-1 min-w-0 text-sm ${themeClasses.text.secondary}`}>
                          <p className="truncate">{tripForm.startAddress}</p>
                          {tripForm.stops.map((stop, i) => (
                            <p key={i} className={`truncate ${themeClasses.text.muted} mt-2`}>{stop}</p>
                          ))}
                          <p className="truncate mt-2">{tripForm.endAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`border-t ${themeClasses.border.primary} pt-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={themeClasses.text.secondary}>Total Miles</span>
                        <span className={`text-xl font-bold ${themeClasses.text.primary}`}>
                          {tripForm.totalMiles} mi
                        </span>
                      </div>
                      {tripForm.isBusiness && (
                        <div className="flex items-center justify-between">
                          <span className={themeClasses.text.secondary}>Tax Deduction</span>
                          <span className="text-lg font-bold text-emerald-500">
                            ${(parseFloat(tripForm.totalMiles) * IRS_MILEAGE_RATE).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {(tripForm.purpose || tripForm.employeeId || tripForm.projectId) && (
                      <div className={`border-t ${themeClasses.border.primary} pt-4 space-y-2`}>
                        {tripForm.purpose && (
                          <div className="flex items-center justify-between">
                            <span className={themeClasses.text.secondary}>Purpose</span>
                            <span className={`font-medium ${themeClasses.text.primary}`}>{tripForm.purpose}</span>
                          </div>
                        )}
                        {tripForm.employeeId && (
                          <div className="flex items-center justify-between">
                            <span className={themeClasses.text.secondary}>Employee</span>
                            <span className={`font-medium ${themeClasses.text.primary}`}>
                              {employees.find(e => e.id === tripForm.employeeId)?.name || 'Unknown'}
                            </span>
                          </div>
                        )}
                        {tripForm.projectId && (
                          <div className="flex items-center justify-between">
                            <span className={themeClasses.text.secondary}>Project</span>
                            <span className={`font-medium ${themeClasses.text.primary}`}>
                              {projects.find(p => p.id === tripForm.projectId)?.name || 'Unknown'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {tripForm.notes && (
                      <div className={`border-t ${themeClasses.border.primary} pt-4`}>
                        <p className={`text-xs ${themeClasses.text.muted} mb-1`}>Notes</p>
                        <p className={`text-sm ${themeClasses.text.secondary}`}>{tripForm.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Trip Type Badge */}
                  <div className={`flex justify-center`}>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      tripForm.isBusiness
                        ? 'bg-blue-500/20 text-blue-500'
                        : theme === 'light' ? 'bg-gray-200 text-gray-600' : 'bg-zinc-700 text-zinc-300'
                    }`}>
                      {tripForm.isBusiness ? '💼 Business Trip' : '🏠 Personal Trip'}
                    </span>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={saveTrip}
                    className="w-full py-4 bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Save Trip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditForm && (
        <div className="fixed inset-0 z-[210] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowEditForm(false)}
          />
          <div className={`relative ${themeClasses.bg.secondary} rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up`}>
            <div className={`sticky top-0 ${themeClasses.bg.secondary} px-4 py-4 border-b ${themeClasses.border.secondary} flex items-center justify-between z-10`}>
              <button
                onClick={() => setShowEditForm(false)}
                className={`${themeClasses.text.secondary} text-base font-medium active:opacity-70`}
              >
                Cancel
              </button>
              <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Edit Employee</h2>
              <button
                onClick={handleUpdateEmployee}
                disabled={!editForm.name.trim() || isUpdating}
                className={`text-blue-500 text-base font-semibold active:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                  placeholder="Full name"
                />
              </div>

              {/* Role */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Job Title</label>
                <input
                  type="text"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                  placeholder="e.g., Foreman, Carpenter, Electrician"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Hourly Rate & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Hourly Rate</label>
                  <div className="relative">
                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${themeClasses.text.muted}`}>$</span>
                    <input
                      type="number"
                      value={editForm.hourly_rate}
                      onChange={(e) => setEditForm({ ...editForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                      className={`w-full pl-8 pr-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                      placeholder="25"
                      min="0"
                      step="0.50"
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                    className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.tertiary} border ${themeClasses.border.primary} ${themeClasses.text.primary} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none`}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackerHub;
