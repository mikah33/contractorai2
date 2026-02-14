import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  Briefcase,
  UserPlus,
  Calendar as CalendarIcon,
  ChevronRight,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Settings,
  UserCheck
} from 'lucide-react';
import useEstimateStore from '../stores/estimateStore';
import useProjectStore from '../stores/projectStore';
import useClientsStore from '../stores/clientsStore';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';
import useEmployeesStore from '../stores/employeesStore';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';

const JobsHub: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  // Data stores
  const { estimates, fetchEstimates, isLoading: estimatesLoading } = useEstimateStore();
  const { projects, fetchProjects, loading: projectsLoading } = useProjectStore();
  const { clients, fetchClients, loading: clientsLoading } = useClientsStore();
  const { events, fetchEvents, loading: calendarLoading } = useCalendarStoreSupabase();
  const { employees, fetchEmployees, loading: employeesLoading } = useEmployeesStore();

  // Fetch data on component mount
  useEffect(() => {
    fetchEstimates();
    fetchProjects();
    fetchClients();
    fetchEvents();
    fetchEmployees();
  }, [fetchEstimates, fetchProjects, fetchClients, fetchEvents, fetchEmployees]);

  // Calculate dashboard stats
  const getEstimateStats = () => {
    const pending = estimates.filter(e => e.status === 'pending' || e.status === 'draft').length;
    const approved = estimates.filter(e => e.status === 'approved' || e.status === 'sent').length;
    const totalValue = estimates.reduce((sum, e) => sum + (e.total || 0), 0);
    return { pending, approved, totalValue, total: estimates.length };
  };

  const getProjectStats = () => {
    const active = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const avgProgress = projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
      : 0;
    return { active, completed, avgProgress, total: projects.length };
  };

  const getClientStats = () => {
    const total = clients.length;
    const recent = clients.filter(c => {
      const createdAt = new Date(c.created_at || c.createdAt);
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return createdAt > lastWeek;
    }).length;
    return { total, recent };
  };

  const getTaskStats = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Upcoming: pending/in_progress events with start_date in the future
    const upcoming = events.filter(event => {
      const eventDate = new Date(event.start_date);
      return (event.status === 'pending' || event.status === 'in_progress') &&
             eventDate >= todayStart;
    }).length;

    // Overdue: pending/in_progress events with start_date in the past
    const overdue = events.filter(event => {
      const eventDate = new Date(event.start_date);
      return (event.status === 'pending' || event.status === 'in_progress') &&
             eventDate < todayStart;
    }).length;

    // Completed: events with completed status
    const completed = events.filter(event => event.status === 'completed').length;

    return { upcoming, overdue, completed };
  };

  const getTeamStats = () => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const onLeave = employees.filter(e => e.status === 'on_leave').length;
    return { total, active, onLeave };
  };

  // Render preview stats for each module
  const renderModulePreview = (moduleId: string) => {
    const isLoading = estimatesLoading || projectsLoading || clientsLoading || calendarLoading || employeesLoading;

    if (isLoading) {
      return (
        <div className="mt-3 flex gap-4">
          <div className="h-4 w-16 bg-zinc-700 rounded animate-pulse"></div>
          <div className="h-4 w-16 bg-zinc-700 rounded animate-pulse"></div>
          <div className="h-4 w-20 bg-zinc-700 rounded animate-pulse"></div>
        </div>
      );
    }

    switch (moduleId) {
      case 'estimates':
        const estimateStats = getEstimateStats();
        return (
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{estimateStats.pending} Pending</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{estimateStats.approved} Approved</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">${estimateStats.totalValue.toLocaleString()}</span>
            </div>
          </div>
        );

      case 'projects':
        const projectStats = getProjectStats();
        return (
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <Briefcase className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{projectStats.active} Active</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{projectStats.completed} Done</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{projectStats.avgProgress}% Avg</span>
            </div>
          </div>
        );

      case 'clients':
        const clientStats = getClientStats();
        return (
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <Users className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{clientStats.total} Total</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <UserPlus className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{clientStats.recent} This Week</span>
            </div>
          </div>
        );

      case 'calendar':
        const taskStats = getTaskStats();
        return (
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <CalendarIcon className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{taskStats.upcoming} Upcoming</span>
            </div>
            <div className="flex items-center gap-1.5 bg-red-100 border border-red-300 px-2.5 py-1 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-xs font-medium text-red-700">{taskStats.overdue} Overdue</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{taskStats.completed} Done</span>
            </div>
          </div>
        );

      case 'team':
        const teamStats = getTeamStats();
        return (
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <Users className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{teamStats.total} Total</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
              <UserCheck className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">{teamStats.active} Active</span>
            </div>
            {teamStats.onLeave > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs font-medium text-orange-700">{teamStats.onLeave} On Leave</span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const jobModules = [
    {
      id: 'estimates',
      title: 'Estimates',
      description: 'Create & manage project estimates',
      icon: Calculator,
      href: '/estimates-hub',
      color: 'orange',
      stats: 'Quick estimate tools'
    },
    {
      id: 'projects',
      title: 'Projects',
      description: 'Track active projects & schedules',
      icon: Briefcase,
      href: '/projects-hub',
      color: 'orange',
      stats: 'Project management'
    },
    {
      id: 'clients',
      title: 'Clients',
      description: 'Manage client relationships',
      icon: UserPlus,
      href: '/clients-hub',
      color: 'orange',
      stats: 'CRM & contacts'
    },
    {
      id: 'calendar',
      title: 'Tasks & Calendar',
      description: 'Schedule appointments & jobs',
      icon: CalendarIcon,
      href: '/todo-hub',
      color: 'orange',
      stats: 'Time management'
    },
    {
      id: 'team',
      title: 'Team',
      description: 'Manage employees & crews',
      icon: UserCheck,
      href: '/employees-hub',
      color: 'orange',
      stats: 'Team management'
    }
  ];


  const getColorClasses = (color: string) => {
    // Always use orange theme with dark mode support
    return {
      bg: themeClasses.bg.secondary,
      border: 'border-orange-400',
      hoverBorder: 'hover:border-orange-500',
      iconBg: 'bg-orange-500',
      iconText: 'text-white',
      accent: 'text-orange-600'
    };
  };

  return (
    <div className={`min-h-full ${themeClasses.bg.primary} pb-24`}>
      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="px-4 pb-5 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-7 h-7 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Jobs</h1>
                  <p className={`text-base ${themeClasses.text.secondary}`}>Manage your projects & clients</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className={`w-14 h-14 ${themeClasses.bg.tertiary} rounded-xl flex items-center justify-center hover:opacity-80 transition-colors`}
              >
                <Settings className={`w-7 h-7 ${themeClasses.text.secondary}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Spacer for fixed header */}
      <div className="pt-[calc(env(safe-area-inset-top)+100px)]" />

      <div className="px-4 py-4">
        {/* Job Modules */}
        <div>
          <h2 className={`text-lg font-bold ${themeClasses.text.primary} mb-4`}>Job Management</h2>
          <div className="grid grid-cols-1 gap-4">
            {jobModules.map((module) => {
              const colors = getColorClasses(module.color);
              return (
                <button
                  key={module.id}
                  onClick={() => navigate(module.href)}
                  className={`flex flex-col p-6 ${colors.bg} rounded-xl border-2 ${colors.border} ${colors.hoverBorder} active:scale-[0.98] transition-all text-left shadow-sm`}
                >
                  {/* Header with icon, title and navigation */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 ${colors.iconBg} rounded-xl flex items-center justify-center`}>
                      <module.icon className={`w-7 h-7 ${colors.iconText}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold ${themeClasses.text.primary} text-lg`}>{module.title}</h3>
                      <p className={`${themeClasses.text.secondary} text-sm`}>{module.description}</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-orange-500" />
                  </div>

                  {/* Dashboard Preview */}
                  <div className={`border-t border-orange-200/50 pt-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${themeClasses.text.secondary}`}>Quick Overview</span>
                      <span className={`text-xs font-medium ${colors.accent}`}>Live Data</span>
                    </div>
                    {renderModulePreview(module.id)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobsHub;