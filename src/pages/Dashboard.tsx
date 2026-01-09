import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  UserCheck,
  DollarSign,
  Briefcase,
  ChevronRight,
  Phone,
  Building2,
  Plus,
  ArrowRight,
  FileText
} from 'lucide-react';
import { useClientsStore } from '../stores/clientsStore';
import { useFinanceStore } from '../stores/financeStoreSupabase';
import useProjectStore from '../stores/projectStore';
import useEstimateStore from '../stores/estimateStore';
import { useData } from '../contexts/DataContext';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { supabase } from '../lib/supabase';
import DashboardTutorialModal from '../components/dashboard/DashboardTutorialModal';

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  hourly_rate: number;
  status: 'active' | 'inactive';
  created_at: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { clients, fetchClients } = useClientsStore();
  const { financialSummary, calculateFinancialSummary, payments, receipts, fetchPayments, fetchReceipts } = useFinanceStore();
  const { projects, fetchProjects } = useProjectStore();
  const { estimates, fetchEstimates } = useEstimateStore();
  const { profile } = useData();
  const { user } = useAuthStore();
  const { dashboardTutorialCompleted, checkDashboardTutorial, setDashboardTutorialCompleted } = useOnboardingStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  // Get display name from profile (company name or full name)
  const displayName = profile?.company || profile?.full_name || 'there';

  // Check if tutorial should be shown
  useEffect(() => {
    const checkTutorial = async () => {
      if (user?.id) {
        const completed = await checkDashboardTutorial(user.id);
        if (!completed) {
          setShowTutorial(true);
        }
      }
    };
    checkTutorial();
  }, [user?.id]);

  const handleTutorialComplete = async (dontShowAgain: boolean) => {
    setShowTutorial(false);
    if (dontShowAgain && user?.id) {
      await setDashboardTutorialCompleted(user.id, true);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchPayments();
    fetchReceipts();
    fetchEmployees();
    fetchEstimates();
  }, []);

  useEffect(() => {
    calculateFinancialSummary();
  }, [payments, receipts]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
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
      setLoadingEmployees(false);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const quickActions = [
    { id: 'clients', label: 'Clients', icon: Users, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-500', href: '/clients-hub' },
    { id: 'employees', label: 'Team', icon: UserCheck, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-500', href: '/employees-hub' },
    { id: 'finance', label: 'Finance', icon: DollarSign, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-500', href: '/finance-hub' },
    { id: 'projects', label: 'Projects', icon: Briefcase, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-500', href: '/projects-hub' },
  ];

  // Get top 3 clients
  const topClients = clients.slice(0, 3);
  // Get top 3 employees
  const topEmployees = employees.slice(0, 3);
  // Get top 3 estimates
  const topEstimates = estimates.slice(0, 3);
  // Get active projects count
  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'active').length;

  const getEstimateStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400';
      case 'sent':
        return 'bg-blue-500/20 text-blue-400';
      case 'declined':
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="min-h-full bg-[#0F0F0F] pb-24">

      {/* Dashboard Tutorial Modal */}
      <DashboardTutorialModal
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Header - background extends into safe area, content pushed down */}
      <div className="bg-[#1C1C1E] border-b border-orange-500/30 sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="px-2 pb-2 pt-1 max-w-5xl mx-auto">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Home className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-white">Dashboard</h1>
              <p className="text-xs text-zinc-400 leading-tight">Welcome back, {displayName}!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 py-2 space-y-2 max-w-5xl mx-auto">
        {/* Quick Preview Cards - Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Clients Card */}
          <button
            onClick={() => navigate('/clients-hub')}
            className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-2 text-left active:bg-[#2C2C2E] transition-colors"
          >
            <div className="flex items-center gap-1 mb-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-white text-xs">Clients</p>
                <p className="text-xs text-zinc-500">{clients.length} total</p>
              </div>
            </div>
            <div className="flex -space-x-1">
              {topClients.length > 0 ? (
                <>
                  {topClients.map((client) => (
                    <div key={client.id} className="w-6 h-6 bg-[#3A3A3C] rounded-full flex items-center justify-center text-white text-xs font-semibold border border-[#1C1C1E]">
                      {getInitials(client.name || 'NA')}
                    </div>
                  ))}
                  {clients.length > 3 && (
                    <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-500 text-xs font-semibold border border-[#1C1C1E]">
                      +{clients.length - 3}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-500">No clients yet</p>
              )}
            </div>
          </button>

          {/* Team Card */}
          <button
            onClick={() => navigate('/employees-hub')}
            className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-2 text-left active:bg-[#2C2C2E] transition-colors"
          >
            <div className="flex items-center gap-1 mb-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-white text-xs">Team</p>
                <p className="text-xs text-zinc-500">{employees.length} members</p>
              </div>
            </div>
            <div className="flex -space-x-2">
              {topEmployees.length > 0 ? (
                <>
                  {topEmployees.map((emp) => (
                    <div key={emp.id} className="w-6 h-6 bg-[#3A3A3C] rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-[#1C1C1E]">
                      {getInitials(emp.name || 'NA')}
                    </div>
                  ))}
                  {employees.length > 3 && (
                    <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-500 text-xs font-semibold border-2 border-[#1C1C1E]">
                      +{employees.length - 3}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-500">No team yet</p>
              )}
            </div>
          </button>

          {/* Finance Card */}
          <button
            onClick={() => navigate('/finance-hub')}
            className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-2 text-left active:bg-[#2C2C2E] transition-colors"
          >
            <div className="flex items-center gap-1 mb-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-white text-xs">Finance</p>
                <p className="text-xs text-zinc-500">This month</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-zinc-500">Revenue</p>
                <p className="text-xs font-bold text-green-400">{formatCurrency(financialSummary?.totalRevenue || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Profit</p>
                <p className={`text-xs font-bold ${(financialSummary?.profit || 0) >= 0 ? 'text-orange-500' : 'text-red-400'}`}>
                  {formatCurrency(financialSummary?.profit || 0)}
                </p>
              </div>
            </div>
          </button>

          {/* Projects Card */}
          <button
            onClick={() => navigate('/projects-hub')}
            className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 p-2 text-left active:bg-[#2C2C2E] transition-colors"
          >
            <div className="flex items-center gap-1 mb-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-white text-xs">Projects</p>
                <p className="text-xs text-zinc-500">{projects.length} total</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-zinc-500">Active</p>
                <p className="text-xs font-bold text-orange-500">{activeProjects}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Completed</p>
                <p className="text-xs font-bold text-green-400">{projects.filter(p => p.status === 'completed').length}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Estimates Section */}
        <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-orange-500/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Estimates</h2>
                <p className="text-xs text-zinc-500">{estimates.length} total</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/estimates-hub')}
              className="flex items-center gap-1 text-sm text-orange-500 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {topEstimates.length === 0 ? (
            <div className="p-3 text-center">
              <FileText className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">No estimates yet</p>
              <button
                onClick={() => navigate('/estimates-hub')}
                className="mt-3 flex items-center gap-1 text-sm text-orange-500 font-medium mx-auto"
              >
                <Plus className="w-4 h-4" /> Create Estimate
              </button>
            </div>
          ) : (
            <div className="divide-y divide-orange-500/10">
              {topEstimates.map((estimate) => (
                <button
                  key={estimate.id}
                  onClick={() => navigate('/estimates-hub')}
                  className="w-full flex items-center gap-3 p-2 hover:bg-[#2C2C2E] active:bg-[#3A3A3C] transition-colors"
                >
                  <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-3 h-3 text-orange-500" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-white truncate">{estimate.title || 'Untitled Estimate'}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      {estimate.client_name && <span className="truncate">{estimate.client_name}</span>}
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${getEstimateStatusColor(estimate.status)}`}>
                        {estimate.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">{formatCurrency(estimate.total || 0)}</p>
                    <p className="text-xs text-zinc-500">{new Date(estimate.created_at || '').toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {estimates.length > 3 && (
            <button
              onClick={() => navigate('/estimates-hub')}
              className="w-full p-3 text-center text-sm text-orange-500 font-medium bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
            >
              See all {estimates.length} estimates <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>

        {/* Clients Section */}
        <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-orange-500/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Clients</h2>
                <p className="text-xs text-zinc-500">{clients.length} total</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/clients-hub')}
              className="flex items-center gap-1 text-sm text-orange-500 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {topClients.length === 0 ? (
            <div className="p-3 text-center">
              <Users className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">No clients yet</p>
              <button
                onClick={() => navigate('/clients-hub')}
                className="mt-3 flex items-center gap-1 text-sm text-orange-500 font-medium mx-auto"
              >
                <Plus className="w-4 h-4" /> Add Client
              </button>
            </div>
          ) : (
            <div className="divide-y divide-orange-500/10">
              {topClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => navigate(`/clients-hub?id=${client.id}`)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-[#2C2C2E] active:bg-[#3A3A3C] transition-colors"
                >
                  <div className="w-6 h-6 bg-[#3A3A3C] rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                    {getInitials(client.name || 'NA')}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{client.name}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      {client.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {client.company}
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-500" />
                </button>
              ))}
            </div>
          )}

          {clients.length > 3 && (
            <button
              onClick={() => navigate('/clients-hub')}
              className="w-full p-3 text-center text-sm text-orange-500 font-medium bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
            >
              See all {clients.length} clients <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>

        {/* Employees Section */}
        <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-orange-500/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Team</h2>
                <p className="text-xs text-zinc-500">{employees.length} members</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/employees-hub')}
              className="flex items-center gap-1 text-sm text-orange-500 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loadingEmployees ? (
            <div className="p-3 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          ) : topEmployees.length === 0 ? (
            <div className="p-3 text-center">
              <UserCheck className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">No team members yet</p>
              <button
                onClick={() => navigate('/employees-hub')}
                className="mt-3 flex items-center gap-1 text-sm text-orange-500 font-medium mx-auto"
              >
                <Plus className="w-4 h-4" /> Add Team Member
              </button>
            </div>
          ) : (
            <div className="divide-y divide-orange-500/10">
              {topEmployees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => navigate(`/employees-hub?id=${employee.id}`)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-[#2C2C2E] active:bg-[#3A3A3C] transition-colors"
                >
                  <div className="w-6 h-6 bg-[#3A3A3C] rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                    {getInitials(employee.name || 'NA')}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{employee.name}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{employee.role || 'Team Member'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                        (employee.status || 'active') === 'active'
                          ? 'bg-orange-500/20 text-orange-500'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {employee.status || 'active'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">${employee.hourly_rate || 0}/hr</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {employees.length > 3 && (
            <button
              onClick={() => navigate('/employees-hub')}
              className="w-full p-3 text-center text-sm text-orange-500 font-medium bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
            >
              See all {employees.length} team members <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>

        {/* Recent Projects */}
        <div className="bg-[#1C1C1E] rounded-lg border border-orange-500/30 overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-orange-500/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Projects</h2>
                <p className="text-xs text-zinc-500">{projects.length} total</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/projects-hub')}
              className="flex items-center gap-1 text-sm text-orange-500 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="p-3 text-center">
              <Briefcase className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">No projects yet</p>
              <button
                onClick={() => navigate('/projects-hub')}
                className="mt-3 flex items-center gap-1 text-sm text-orange-500 font-medium mx-auto"
              >
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </div>
          ) : (
            <div className="divide-y divide-orange-500/10">
              {projects.slice(0, 3).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects-hub?id=${project.id}`)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-[#2C2C2E] active:bg-[#3A3A3C] transition-colors"
                >
                  <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-3 h-3 text-orange-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{project.name}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      {project.client_name && <span>{project.client_name}</span>}
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${
                        project.status === 'completed'
                          ? 'bg-orange-500/20 text-orange-500' :
                        project.status === 'in_progress' || project.status === 'active'
                          ? 'bg-orange-500/10 text-orange-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {(project.status || 'pending')?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {project.budget && (
                    <p className="text-sm font-medium text-white">{formatCurrency(project.budget)}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {projects.length > 3 && (
            <button
              onClick={() => navigate('/projects-hub')}
              className="w-full p-3 text-center text-sm text-orange-500 font-medium bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
            >
              See all {projects.length} projects <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
