import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Users,
  UserCheck,
  DollarSign,
  Briefcase,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Phone,
  Mail,
  Building2,
  Calendar,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useClientsStore } from '../stores/clientsStore';
import { useFinanceStore } from '../stores/financeStoreSupabase';
import useProjectStore from '../stores/projectStore';
import { supabase } from '../lib/supabase';

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

const BusinessHub: React.FC = () => {
  const navigate = useNavigate();
  const { clients, fetchClients } = useClientsStore();
  const { financialSummary, calculateFinancialSummary, payments, receipts, fetchPayments, fetchReceipts } = useFinanceStore();
  const { projects, fetchProjects } = useProjectStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchPayments();
    fetchReceipts();
    fetchEmployees();
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
    { id: 'clients', label: 'Clients', icon: Users, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-100', iconColor: 'text-blue-600', href: '/clients-hub' },
    { id: 'employees', label: 'Team', icon: UserCheck, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-100', iconColor: 'text-purple-600', href: '/employees-hub' },
    { id: 'finance', label: 'Finance', icon: DollarSign, color: 'from-green-500 to-green-600', bgColor: 'bg-green-100', iconColor: 'text-green-600', href: '/finance-hub' },
    { id: 'projects', label: 'Projects', icon: Briefcase, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-100', iconColor: 'text-orange-600', href: '/projects-hub' },
  ];

  // Get top 3 clients
  const topClients = clients.slice(0, 3);
  // Get top 3 employees
  const topEmployees = employees.slice(0, 3);
  // Get active projects count
  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'active').length;

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Business Hub</h1>
            <p className="text-sm text-gray-500">Manage your business</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-500">Revenue</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(financialSummary?.totalRevenue || 0)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-500">Expenses</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(financialSummary?.totalExpenses || 0)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-500">Active Projects</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{activeProjects}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-500">Net Profit</span>
            </div>
            <p className={`text-xl font-bold ${(financialSummary?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(financialSummary?.profit || 0)}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => navigate(action.href)}
              className="flex flex-col items-center p-3 bg-white rounded-2xl border border-gray-200 active:scale-95 transition-transform"
            >
              <div className={`w-10 h-10 ${action.bgColor} rounded-xl flex items-center justify-center mb-2`}>
                <action.icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <span className="text-xs font-medium text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Clients Section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Clients</h2>
                <p className="text-xs text-gray-500">{clients.length} total</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/clients-hub')}
              className="flex items-center gap-1 text-sm text-blue-600 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {topClients.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No clients yet</p>
              <button
                onClick={() => navigate('/clients-hub')}
                className="mt-3 flex items-center gap-1 text-sm text-blue-600 font-medium mx-auto"
              >
                <Plus className="w-4 h-4" /> Add Client
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => navigate('/clients-hub')}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(client.name || 'NA')}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
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
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {clients.length > 3 && (
            <button
              onClick={() => navigate('/clients-hub')}
              className="w-full p-3 text-center text-sm text-blue-600 font-medium bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              See all {clients.length} clients <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>

        {/* Employees Section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Team</h2>
                <p className="text-xs text-gray-500">{employees.length} members</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/employees-hub')}
              className="flex items-center gap-1 text-sm text-purple-600 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loadingEmployees ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : topEmployees.length === 0 ? (
            <div className="p-6 text-center">
              <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No team members yet</p>
              <button
                onClick={() => navigate('/employees-hub')}
                className="mt-3 flex items-center gap-1 text-sm text-purple-600 font-medium mx-auto"
              >
                <Plus className="w-4 h-4" /> Add Team Member
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topEmployees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => navigate('/employees-hub')}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(employee.name || 'NA')}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{employee.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{employee.role || 'Team Member'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {employee.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">${employee.hourly_rate}/hr</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {employees.length > 3 && (
            <button
              onClick={() => navigate('/employees-hub')}
              className="w-full p-3 text-center text-sm text-purple-600 font-medium bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              See all {employees.length} team members <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>

        {/* Recent Projects */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Projects</h2>
                <p className="text-xs text-gray-500">{projects.length} total</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/projects-hub')}
              className="flex items-center gap-1 text-sm text-orange-600 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="p-6 text-center">
              <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No projects yet</p>
              <button
                onClick={() => navigate('/projects-hub')}
                className="mt-3 flex items-center gap-1 text-sm text-orange-600 font-medium mx-auto"
              >
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.slice(0, 3).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate('/projects-hub')}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {project.client_name && <span>{project.client_name}</span>}
                      <span className={`px-1.5 py-0.5 rounded ${
                        project.status === 'completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {project.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {project.budget && (
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(project.budget)}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {projects.length > 3 && (
            <button
              onClick={() => navigate('/projects-hub')}
              className="w-full p-3 text-center text-sm text-orange-600 font-medium bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              See all {projects.length} projects <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessHub;
