import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  DollarSign,
  Briefcase,
  ChevronRight,
  Plus,
  ArrowRight,
  Settings,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  ChevronLeft,
  Star,
  Newspaper,
  RefreshCw
} from 'lucide-react';
import { useFinanceStore } from '../stores/financeStoreSupabase';
import useProjectStore from '../stores/projectStore';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';
import { useData } from '../contexts/DataContext';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useNewsStore, type NewsArticle } from '../stores/newsStore';
import DashboardTutorialModal from '../components/dashboard/DashboardTutorialModal';
import NewsModal from '../components/news/NewsModal';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { financialSummary, calculateFinancialSummary, payments, receipts, fetchPayments, fetchReceipts } = useFinanceStore();
  const { projects, fetchProjects } = useProjectStore();
  const { events, fetchEvents, updateEvent, getEventsByDateRange } = useCalendarStoreSupabase();
  const { profile } = useData();
  const { user } = useAuthStore();
  const { dashboardTutorialCompleted, checkDashboardTutorial, setDashboardTutorialCompleted } = useOnboardingStore();
  const { articles: newsArticles, isLoading: newsLoading, fetchNews, refreshNews } = useNewsStore();
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

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
    fetchProjects();
    fetchPayments();
    fetchReceipts();
    fetchEvents();
    fetchNews();
  }, []);

  useEffect(() => {
    calculateFinancialSummary();
  }, [payments, receipts]);


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
    { id: 'finance', label: 'Finance', icon: DollarSign, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-500', href: '/finance-hub' },
    { id: 'projects', label: 'Projects', icon: Briefcase, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-500', href: '/projects-hub' },
    { id: 'jobs', label: 'Jobs', icon: Calendar, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-500', href: '/jobs-hub' },
    { id: 'goals', label: 'Goals', icon: Target, bgColor: 'bg-orange-500/20', iconColor: 'text-orange-500', href: '/business-hub' },
  ];

  // Get active projects count
  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'active').length;

  // Get upcoming jobs from calendar (next 7 days)
  const getUpcomingJobs = () => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return getEventsByDateRange(now, weekFromNow)
      .filter(event =>
        event.event_type === 'task' ||
        event.event_type === 'meeting' ||
        event.event_type === 'delivery' ||
        event.event_type === 'inspection'
      )
      .filter(event => event.status !== 'cancelled')
      .slice(0, 3); // Show only first 3
  };

  const upcomingJobs = getUpcomingJobs();

  // Handle job completion toggle
  const handleJobToggle = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await updateEvent(jobId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  // Get priority color based on event type and date
  const getPriorityInfo = (event: any) => {
    const eventDate = new Date(event.start_date);
    const now = new Date();
    const daysDiff = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) {
      return { label: 'High Priority', color: 'bg-red-500/20 text-red-400' };
    } else if (daysDiff <= 3) {
      return { label: 'Medium', color: 'bg-amber-500/20 text-amber-400' };
    } else {
      return { label: 'Low', color: 'bg-green-500/20 text-green-400' };
    }
  };

  // Format date for display
  const formatJobDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const jobDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (jobDate.getTime() === today.getTime()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (jobDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000) {
      return `Tomorrow ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className={`min-h-full ${themeClasses.bg.primary} pb-24`}>

      {/* Dashboard Tutorial Modal */}
      <DashboardTutorialModal
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Header - background extends into safe area, content pushed down */}
      <div className={`${themeClasses.bg.secondary} ${themeClasses.border.primary} border-b sticky top-0 z-10 pt-[env(safe-area-inset-top)]`}>
        <div className="px-2 pb-2 pt-1 max-w-5xl mx-auto">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Home className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={`text-base font-bold ${themeClasses.text.primary}`}>Dashboard</h1>
              <p className={`text-xs ${themeClasses.text.secondary} leading-tight`}>Welcome back, {displayName}!</p>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center hover:bg-orange-500/30 transition-colors border border-orange-500/40"
            >
              <Settings className="w-5 h-5 text-orange-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-2 py-2 space-y-2 max-w-5xl mx-auto">
        {/* News Carousel */}
        <div className="bg-white rounded-lg border-2 border-orange-400 overflow-hidden mb-2 shadow-sm">
          <div className="p-2 border-b border-orange-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                <Newspaper className="w-3 h-3 text-orange-600" />
              </div>
              <h2 className="font-semibold text-black">Industry News</h2>
            </div>
            <button
              onClick={() => refreshNews()}
              className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
              title="Refresh news"
            >
              <RefreshCw className={`w-4 h-4 ${newsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-3 p-3">
              {newsLoading && newsArticles.length === 0 ? (
                // Loading skeleton
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex-shrink-0 w-64 p-3 bg-zinc-100 rounded-lg border border-zinc-200 animate-pulse">
                      <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-zinc-200 rounded w-full mb-1"></div>
                      <div className="h-3 bg-zinc-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </>
              ) : newsArticles.length > 0 ? (
                // Real news articles
                newsArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className="flex-shrink-0 w-64 p-3 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 text-left transition-colors active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs font-medium text-orange-600 truncate">{article.source_name}</span>
                    </div>
                    <h3 className="font-semibold text-sm text-black mb-1 line-clamp-2">{article.title}</h3>
                    <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">{article.summary}</p>
                  </button>
                ))
              ) : (
                // Fallback static items when no news
                <>
                  <div className="flex-shrink-0 w-64 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <h3 className="font-semibold text-sm text-black mb-1">Construction Permits Up 15%</h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">Building permits increased significantly in Q4, creating new opportunities for contractors.</p>
                  </div>
                  <div className="flex-shrink-0 w-64 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <h3 className="font-semibold text-sm text-black mb-1">New Safety Regulations</h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">Updated OSHA guidelines for 2026 now in effect. Stay compliant with our resources.</p>
                  </div>
                  <div className="flex-shrink-0 w-64 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <h3 className="font-semibold text-sm text-black mb-1">Material Costs Stable</h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">Lumber and steel prices remain steady, providing better project predictability.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Preview Cards - Updated Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Enhanced Finance Card */}
          <button
            onClick={() => navigate('/finance-hub')}
            className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-2 text-left ${themeClasses.hover.bg} transition-colors`}
          >
            <div className="flex items-center gap-1 mb-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <p className={`font-semibold ${themeClasses.text.primary} text-xs`}>Finance</p>
                <p className={`text-xs ${themeClasses.text.muted}`}>This month</p>
              </div>
            </div>
            <div className="space-y-1">
              <div>
                <p className={`text-xs ${themeClasses.text.muted}`}>Revenue</p>
                <p className="text-xs font-bold text-green-400">{formatCurrency(financialSummary?.totalRevenue || 0)}</p>
              </div>
              <div>
                <p className={`text-xs ${themeClasses.text.muted}`}>Profit</p>
                <p className={`text-xs font-bold ${(financialSummary?.profit || 0) >= 0 ? 'text-orange-500' : 'text-red-400'}`}>
                  {formatCurrency(financialSummary?.profit || 0)}
                </p>
              </div>
            </div>
          </button>

          {/* Projects Card */}
          <button
            onClick={() => navigate('/projects-hub')}
            className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-2 text-left ${themeClasses.hover.bg} transition-colors`}
          >
            <div className="flex items-center gap-1 mb-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <p className={`font-semibold ${themeClasses.text.primary} text-xs`}>Projects</p>
                <p className={`text-xs ${themeClasses.text.muted}`}>{projects.length} total</p>
              </div>
            </div>
            <div className="space-y-1">
              <div>
                <p className={`text-xs ${themeClasses.text.muted}`}>Active</p>
                <p className="text-xs font-bold text-orange-500">{activeProjects}</p>
              </div>
              <div>
                <p className={`text-xs ${themeClasses.text.muted}`}>Completed</p>
                <p className="text-xs font-bold text-green-400">{projects.filter(p => p.status === 'completed').length}</p>
              </div>
            </div>
          </button>

          {/* Jobs Card */}
          <button
            onClick={() => navigate('/jobs-hub')}
            className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-2 text-left ${themeClasses.hover.bg} transition-colors`}
          >
            <div className="flex items-center gap-1 mb-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <p className={`font-semibold ${themeClasses.text.primary} text-xs`}>Jobs</p>
                <p className={`text-xs ${themeClasses.text.muted}`}>Upcoming</p>
              </div>
            </div>
            <div className="space-y-1">
              <div>
                <p className={`text-xs ${themeClasses.text.muted}`}>Today</p>
                <p className="text-xs font-bold text-orange-500">
                  {events.filter(e => {
                    const today = new Date();
                    const eventDate = new Date(e.start_date);
                    return eventDate.toDateString() === today.toDateString() &&
                           ['task', 'meeting', 'delivery', 'inspection'].includes(e.event_type) &&
                           e.status !== 'cancelled';
                  }).length}
                </p>
              </div>
              <div>
                <p className={`text-xs ${themeClasses.text.muted}`}>This week</p>
                <p className="text-xs font-bold text-blue-400">{upcomingJobs.length}</p>
              </div>
            </div>
          </button>

          {/* Goals Card */}
          <button
            onClick={() => navigate('/business-hub')}
            className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} p-2 text-left ${themeClasses.hover.bg} transition-colors`}
          >
            <div className="flex items-center gap-1 mb-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <p className={`font-semibold ${themeClasses.text.primary} text-xs`}>Goals</p>
                <p className={`text-xs ${themeClasses.text.muted}`}>Monthly</p>
              </div>
            </div>
            <div className="space-y-1">
              <div>
                <p className={`text-xs ${themeClasses.text.muted}`}>Revenue</p>
                <p className="text-xs font-bold text-green-400">75%</p>
              </div>
              <div>
                <p className={`text-xs ${themeClasses.text.muted}`}>Projects</p>
                <p className="text-xs font-bold text-orange-500">90%</p>
              </div>
            </div>
          </button>
        </div>

        {/* Upcoming Jobs Section */}
        <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} overflow-hidden`}>
          <div className={`flex items-center justify-between p-2 border-b ${themeClasses.border.primary}`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <h2 className={`font-semibold ${themeClasses.text.primary}`}>Upcoming Jobs</h2>
                <p className="text-xs text-zinc-500">Next 7 days</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/jobs-hub')}
              className="flex items-center gap-1 text-sm text-orange-500 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {upcomingJobs.length === 0 ? (
            <div className="p-3 text-center">
              <Calendar className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">No upcoming jobs scheduled</p>
              <button
                onClick={() => navigate('/jobs-hub')}
                className={`mt-3 flex items-center gap-2 px-4 py-2.5 ${themeClasses.button.primary} rounded-md font-medium ${themeClasses.button.primaryHover} active:scale-95 transition-all mx-auto`}
              >
                <Plus className="w-4 h-4" /> Add Job
              </button>
            </div>
          ) : (
            <div className="divide-y divide-orange-500/10">
              {upcomingJobs.map((job) => {
                const priorityInfo = getPriorityInfo(job);
                const isCompleted = job.status === 'completed';

                return (
                  <div key={job.id} className="flex items-center gap-3 p-2 hover:bg-[#2C2C2E] active:bg-[#3A3A3C] transition-colors">
                    <button
                      onClick={() => handleJobToggle(job.id, job.status)}
                      className={`w-5 h-5 rounded-full border-2 transition-colors flex items-center justify-center ${
                        isCompleted
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-zinc-600 hover:border-orange-500 hover:bg-orange-500/20'
                      }`}
                    >
                      <CheckCircle2 className={`w-3 h-3 transition-colors ${
                        isCompleted
                          ? 'text-green-500'
                          : 'text-zinc-600 hover:text-orange-500'
                      }`} />
                    </button>
                    <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-3 h-3 text-orange-500" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`font-medium truncate ${isCompleted ? 'text-zinc-400 line-through' : 'text-white'}`}>
                        {job.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatJobDate(job.start_date)}</span>
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${isCompleted ? 'text-green-400' : 'text-white'}`}>
                        {isCompleted ? 'Done' : job.event_type.charAt(0).toUpperCase() + job.event_type.slice(1)}
                      </p>
                      <p className="text-xs text-zinc-500">{job.location || 'No location'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => navigate('/jobs-hub')}
            className="w-full p-3 text-center text-sm text-orange-500 font-medium bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
          >
            See all upcoming jobs <ArrowRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>

        {/* Enhanced Finance Dashboard */}
        <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} overflow-hidden`}>
          <div className={`flex items-center justify-between p-2 border-b ${themeClasses.border.primary}`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <h2 className={`font-semibold ${themeClasses.text.primary}`}>Financial Overview</h2>
                <p className="text-xs text-zinc-500">This month</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/finance-hub')}
              className="flex items-center gap-1 text-sm text-orange-500 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                <p className="text-xs text-green-800 font-medium mb-1">Total Revenue</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(financialSummary?.totalRevenue || 0)}</p>
                <p className="text-xs text-green-700 font-medium">+12% from last month</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-lg border border-orange-500/40">
                <p className="text-xs text-orange-800 font-medium mb-1">Net Profit</p>
                <p className={`text-lg font-bold ${(financialSummary?.profit || 0) >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                  {formatCurrency(financialSummary?.profit || 0)}
                </p>
                <p className="text-xs text-orange-700 font-medium">+8% from last month</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-white rounded-lg border border-zinc-400">
                <p className="text-xs text-black font-medium">Pending</p>
                <p className="text-sm font-bold text-amber-600">{formatCurrency(25000)}</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-zinc-400">
                <p className="text-xs text-black font-medium">Expenses</p>
                <p className="text-sm font-bold text-red-600">{formatCurrency(financialSummary?.totalExpenses || 0)}</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-zinc-400">
                <p className="text-xs text-black font-medium">Collections</p>
                <p className="text-sm font-bold text-blue-600">{formatCurrency(18750)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        <div className={`${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} overflow-hidden`}>
          <div className={`flex items-center justify-between p-2 border-b ${themeClasses.border.primary}`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-3 h-3 text-orange-500" />
              </div>
              <div>
                <h2 className={`font-semibold ${themeClasses.text.primary}`}>Projects</h2>
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
                className={`mt-3 flex items-center gap-2 px-4 py-2.5 ${themeClasses.button.primary} rounded-md font-medium ${themeClasses.button.primaryHover} active:scale-95 transition-all mx-auto`}
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
                  className="w-full flex items-center gap-3 p-2 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
                >
                  <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-3 h-3 text-orange-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-black">{project.name}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
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
                    <p className="text-sm font-medium text-black">{formatCurrency(project.budget)}</p>
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

      {/* News Article Modal */}
      <NewsModal
        article={selectedArticle}
        isOpen={selectedArticle !== null}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
};

export default Dashboard;
