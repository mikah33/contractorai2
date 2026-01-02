import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserCheck,
  Plus,
  ChevronRight,
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
  Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import useProjectStore from '../stores/projectStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import TeamsTutorialModal from '../components/employees/TeamsTutorialModal';

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

const EmployeesHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, fetchProjects } = useProjectStore();
  const { teamsTutorialCompleted, checkTeamsTutorial, setTeamsTutorialCompleted } = useOnboardingStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialUserId, setTutorialUserId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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

  const [newForm, setNewForm] = useState({
    name: '',
    job_title: '',
    email: '',
    phone: '',
    hourly_rate: 25,
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  // Hide navbar when any modal is open
  useEffect(() => {
    const isModalOpen = showManualForm || showEditForm || selectedEmployee !== null;
    if (isModalOpen) {
      document.body.classList.add('modal-active');
    } else {
      document.body.classList.remove('modal-active');
    }
    return () => {
      document.body.classList.remove('modal-active');
    };
  }, [showManualForm, showEditForm, selectedEmployee]);

  useEffect(() => {
    fetchEmployees();
    fetchProjects();

    // Check tutorial status
    const checkTutorial = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setTutorialUserId(user.id);
        const completed = await checkTeamsTutorial(user.id);
        if (!completed) {
          setShowTutorial(true);
        }
      }
    };
    checkTutorial();
  }, []);

  // Auto-select employee from URL params
  useEffect(() => {
    const employeeId = searchParams.get('id');
    if (employeeId && employees.length > 0 && !selectedEmployee) {
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        setSelectedEmployee(employee);
        // Clear the URL param after selecting
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, employees, selectedEmployee, setSearchParams]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'inactive': return 'bg-zinc-800 text-zinc-400';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      if (selectedEmployee && selectedEmployee.id === editForm.id) {
        const updated = employees.find(e => e.id === editForm.id);
        if (updated) setSelectedEmployee(updated);
      }
      setShowEditForm(false);
    } catch (error) {
      console.error('Error updating employee:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManual = () => {
    setNewForm({
      name: '',
      job_title: '',
      email: '',
      phone: '',
      hourly_rate: 25,
      status: 'active',
      notes: ''
    });
    setShowManualForm(true);
  };

  const handleCreateEmployee = async () => {
    if (isCreating) return;
    if (!newForm.name.trim()) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('employees')
        .insert({
          user_id: user.id,
          name: newForm.name.trim(),
          job_title: newForm.job_title.trim(),
          email: newForm.email.trim(),
          phone: newForm.phone.trim(),
          hourly_rate: newForm.hourly_rate,
          status: newForm.status,
          notes: newForm.notes.trim() || null
        });

      if (error) throw error;
      await fetchEmployees();
      setShowManualForm(false);
      setNewForm({
        name: '',
        job_title: '',
        email: '',
        phone: '',
        hourly_rate: 25,
        status: 'active',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating employee:', error);
    } finally {
      setIsCreating(false);
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
      alert('Failed to delete team member.');
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

  // Get projects assigned to an employee (by name match in team or assigned fields)
  const getEmployeeProjects = (employeeName: string) => {
    if (!employeeName) return [];
    return projects.filter(p => {
      // Handle team/assigned_to which could be string, array, or null
      let teamMembers = p.team || p.assigned_to || '';
      // Convert array to string if needed
      if (Array.isArray(teamMembers)) {
        teamMembers = teamMembers.join(',');
      }
      // Ensure it's a string
      if (typeof teamMembers !== 'string') {
        teamMembers = String(teamMembers || '');
      }
      return teamMembers.toLowerCase().includes(employeeName.toLowerCase());
    });
  };

  return (
    <div className="min-h-full bg-[#0F0F0F] pb-24">
      {/* Header */}
      <div className="bg-[#1C1C1E] border-b border-orange-500/30 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Team</h1>
              <p className="text-sm text-zinc-400">{employees.length} members</p>
            </div>
          </div>
          <button
            onClick={handleManual}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-md font-medium hover:bg-zinc-200 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Add</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#262626] rounded-lg border border-[#3A3A3C] text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-500 focus:bg-[#2C2C2E] transition-all"
          />
        </div>
      </div>

      {/* Team List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No team members yet</p>
            <p className="text-sm text-zinc-500 mt-1">Tap + to add your first team member</p>
          </div>
        ) : (
          filteredEmployees.map((employee) => {
            const employeeProjects = getEmployeeProjects(employee.name);

            return (
              <div
                key={employee.id}
                onClick={() => setSelectedEmployee(employee)}
                className="bg-[#1C1C1E] rounded-2xl border border-orange-500/30 overflow-hidden active:scale-[0.99] transition-transform"
              >
                {/* Header with avatar and status */}
                <div className="p-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 font-bold text-lg">
                      {getInitials(employee.name || 'NA')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white truncate text-lg">
                          {employee.name || 'Unknown'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.status || 'active')}`}>
                          {(employee.status || 'active').charAt(0).toUpperCase() + (employee.status || 'active').slice(1)}
                        </span>
                      </div>
                      {employee.job_title && (
                        <div className="flex items-center gap-1 text-sm text-zinc-400 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span className="truncate">{employee.job_title}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {employee.email && (
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Mail className="w-4 h-4 text-zinc-500" />
                      <span className="truncate max-w-[180px]">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Phone className="w-4 h-4 text-zinc-500" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                </div>

                {/* Stats Row */}
                <div className="px-4 py-3 bg-[#171717] border-t border-orange-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Hourly Rate */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-900/30">
                        <DollarSign className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          ${employee.hourly_rate || 0}/hr
                        </p>
                        <p className="text-xs text-zinc-500">Rate</p>
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${employeeProjects.length > 0 ? 'bg-purple-900/30' : 'bg-zinc-800'}`}>
                        <Briefcase className={`w-4 h-4 ${employeeProjects.length > 0 ? 'text-purple-400' : 'text-zinc-500'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${employeeProjects.length > 0 ? 'text-white' : 'text-zinc-500'}`}>
                          {employeeProjects.length}
                        </p>
                        <p className="text-xs text-zinc-500">Projects</p>
                      </div>
                    </div>
                  </div>

                  {/* Date Added */}
                  {formatDate(employee.created_at) && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(employee.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Create Employee Modal */}
      {showManualForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowManualForm(false)}
          />
          <div className="relative bg-[#1C1C1E] rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-[#1C1C1E] px-4 py-4 border-b border-orange-500/30 flex items-center justify-between z-10">
              <button
                onClick={() => setShowManualForm(false)}
                className="text-zinc-400 text-base font-medium active:text-zinc-300"
              >
                Cancel
              </button>
              <h2 className="text-lg font-semibold text-white">New Team Member</h2>
              <button
                onClick={handleCreateEmployee}
                disabled={!newForm.name.trim() || isCreating}
                className="text-orange-500 text-base font-semibold active:text-orange-400 disabled:text-zinc-600 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  placeholder="Full name"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Job Title</label>
                <input
                  type="text"
                  value={newForm.job_title}
                  onChange={(e) => setNewForm({ ...newForm, job_title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  placeholder="e.g., Foreman, Carpenter, Electrician"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newForm.email}
                    onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Hourly Rate & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Hourly Rate</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      value={newForm.hourly_rate}
                      onChange={(e) => setNewForm({ ...newForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                      placeholder="25"
                      min="0"
                      step="0.50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
                  <select
                    value={newForm.status}
                    onChange={(e) => setNewForm({ ...newForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
                <textarea
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowEditForm(false)}
          />
          <div className="relative bg-[#1C1C1E] rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-[#1C1C1E] px-4 py-4 border-b border-orange-500/30 flex items-center justify-between z-10">
              <button
                onClick={() => setShowEditForm(false)}
                className="text-zinc-400 text-base font-medium active:text-zinc-300"
              >
                Cancel
              </button>
              <h2 className="text-lg font-semibold text-white">Edit Team Member</h2>
              <button
                onClick={handleUpdateEmployee}
                disabled={!editForm.name.trim() || isUpdating}
                className="text-orange-500 text-base font-semibold active:text-orange-400 disabled:text-zinc-600 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  placeholder="Full name"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Job Title</label>
                <input
                  type="text"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  placeholder="e.g., Foreman, Carpenter, Electrician"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Hourly Rate & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Hourly Rate</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      value={editForm.hourly_rate}
                      onChange={(e) => setEditForm({ ...editForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                      placeholder="25"
                      min="0"
                      step="0.50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none"
                  placeholder="Additional notes..."
                />
              </div>
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
          <div className="absolute inset-x-0 bottom-0 top-12 bg-[#0F0F0F] rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="bg-[#1C1C1E] px-4 py-4 border-b border-orange-500/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="flex items-center gap-2 text-zinc-400 active:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditEmployee(selectedEmployee)}
                    className="p-2 text-purple-400 active:text-purple-300 active:bg-purple-500/10 rounded-xl"
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
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/20">
                  {getInitials(selectedEmployee.name || 'NA')}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{selectedEmployee.name || 'Unknown'}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedEmployee.job_title && (
                      <span className="text-sm text-zinc-400">{selectedEmployee.job_title}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedEmployee.status || 'active')}`}>
                      {(selectedEmployee.status || 'active').charAt(0).toUpperCase() + (selectedEmployee.status || 'active').slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">

              {/* Contact Info Card */}
              <div className="bg-[#1C1C1E] border border-orange-500/30 rounded-2xl p-4">
                <label className="text-xs text-zinc-500 mb-3 block">Contact Information</label>
                <div className="space-y-3">
                  {selectedEmployee.email && (
                    <a href={`mailto:${selectedEmployee.email}`} className="flex items-center gap-3 text-zinc-300 active:text-purple-400">
                      <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Email</p>
                        <p className="font-medium">{selectedEmployee.email}</p>
                      </div>
                    </a>
                  )}
                  {selectedEmployee.phone && (
                    <a href={`tel:${selectedEmployee.phone}`} className="flex items-center gap-3 text-zinc-300 active:text-green-400">
                      <div className="w-10 h-10 bg-green-900/30 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Phone</p>
                        <p className="font-medium">{selectedEmployee.phone}</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>

              {/* Pay Info Card */}
              <div className="bg-[#1C1C1E] border border-orange-500/30 rounded-2xl p-4">
                <label className="text-xs text-zinc-500 mb-3 block">Compensation</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center p-3 bg-green-900/20 rounded-xl">
                    <p className="text-2xl font-bold text-green-400">
                      ${selectedEmployee.hourly_rate || 0}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Hourly Rate</p>
                  </div>
                  <div className="flex-1 text-center p-3 bg-purple-900/20 rounded-xl">
                    <p className="text-2xl font-bold text-purple-400">
                      {getEmployeeProjects(selectedEmployee.name).length}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Active Projects</p>
                  </div>
                </div>
              </div>

              {/* Projects Card */}
              <div className="bg-[#1C1C1E] border border-orange-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-zinc-500">Assigned Projects</label>
                  <button
                    onClick={() => {
                      setSelectedEmployee(null);
                      navigate('/projects-hub');
                    }}
                    className="text-xs text-purple-400 font-medium"
                  >
                    View All
                  </button>
                </div>
                {(() => {
                  const empProjects = getEmployeeProjects(selectedEmployee.name);
                  if (empProjects.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <Briefcase className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500">No projects assigned</p>
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
                          className="flex items-center gap-3 p-3 bg-[#262626] rounded-xl active:bg-[#2C2C2E]"
                        >
                          <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{project.name}</p>
                            <p className="text-xs text-zinc-500">
                              {project.status === 'active' || project.status === 'in_progress' ? 'Active' : project.status === 'completed' ? 'Completed' : 'On Hold'}
                              {project.budget ? ` • ${formatCurrency(project.budget)}` : ''}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Notes Card */}
              {selectedEmployee.notes && (
                <div className="bg-[#1C1C1E] border border-orange-500/30 rounded-2xl p-4">
                  <label className="text-xs text-zinc-500 mb-2 block">Notes</label>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedEmployee.notes}</p>
                </div>
              )}

              {/* Member Since */}
              {formatDate(selectedEmployee.created_at) && (
                <div className="text-center text-xs text-zinc-500 pt-2">
                  Team member since {formatDate(selectedEmployee.created_at)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Teams Tutorial Modal */}
      <TeamsTutorialModal
        isOpen={showTutorial}
        onComplete={(dontShowAgain) => {
          setShowTutorial(false);
          if (dontShowAgain && tutorialUserId) {
            setTeamsTutorialCompleted(tutorialUserId, true);
          }
        }}
      />
    </div>
  );
};

export default EmployeesHub;
