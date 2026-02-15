import React, { useState, useEffect, useRef } from 'react';
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
  Target,
  ChevronLeft,
  Calculator,
  CreditCard,
  Camera
} from 'lucide-react';
import { useFinanceStore } from '../stores/financeStoreSupabase';
import useProjectStore from '../stores/projectStore';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';
import { useData } from '../contexts/DataContext';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import DashboardTutorialModal from '../components/dashboard/DashboardTutorialModal';
import AddChoiceModal from '../components/common/AddChoiceModal';
import AIChatPopup from '../components/ai/AIChatPopup';
import VisionCamModal from '../components/vision/VisionCamModal';
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showVisionCam, setShowVisionCam] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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
    { id: 'finance', label: 'Finance', icon: DollarSign, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500', href: '/finance-hub' },
    { id: 'projects', label: 'Projects', icon: Briefcase, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500', href: '/projects-hub' },
    { id: 'jobs', label: 'Jobs', icon: Calendar, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500', href: '/jobs-hub' },
    { id: 'goals', label: 'Goals', icon: Target, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-500', href: '/business-hub' },
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
    <div className={`min-h-full ${themeClasses.bg.primary} pb-60`}>
      {/* Dashboard Tutorial Modal */}
      <DashboardTutorialModal
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Fixed Header with safe area background */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="px-4 pb-5 pt-4 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Home className="w-7 h-7 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Home</h1>
                <p className={`text-base ${themeClasses.text.secondary}`}>Welcome back, {displayName}!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="pt-[calc(env(safe-area-inset-top)+100px)]" />

      <div className="py-2 space-y-2 max-w-5xl mx-auto">
        {/* Feature Cards Carousel */}
        <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-4 px-4 pb-2" style={{ width: 'max-content' }}>
            {/* Create Estimate Card */}
            <div
              className={`${themeClasses.bg.card} rounded-xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-5 text-left transition-colors flex-shrink-0 flex flex-col relative overflow-hidden snap-center`}
              style={{ width: 'calc(100vw - 48px)', maxWidth: '380px', minHeight: '240px' }}
            >
              {/* Background payment card visual */}
              <div className="absolute top-4 right-4 w-36 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg transform rotate-6 opacity-20">
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <div className="w-6 h-4 bg-white/30 rounded"></div>
                </div>
              </div>
              <div className="absolute top-10 right-10 w-36 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg transform -rotate-3 opacity-15">
                <CreditCard className="absolute top-2 right-2 w-6 h-6 text-white/50" />
              </div>

              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calculator className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className={`font-bold ${themeClasses.text.primary} text-xl`}>Create Estimate</p>
                  <p className={`text-sm ${themeClasses.text.muted}`}>Send & get paid</p>
                </div>
              </div>

              <p className={`text-sm ${themeClasses.text.secondary} mb-3 relative z-10 leading-snug font-medium italic`}>
                Create professional estimates and collect payments directly in the app.
              </p>

              <div className="mt-auto relative z-10">
                <button
                  onClick={() => setShowAddChoice(true)}
                  className="w-full py-3.5 px-4 bg-blue-500 hover:bg-blue-600 text-white text-base font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <Calculator className="w-5 h-5" />
                  Create an Estimate
                </button>
              </div>
            </div>

            {/* Vision Cam Card */}
            <div
              className={`${themeClasses.bg.card} rounded-xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-5 text-left transition-colors flex-shrink-0 flex flex-col relative overflow-hidden snap-center`}
              style={{ width: 'calc(100vw - 48px)', maxWidth: '380px', minHeight: '240px' }}
            >
              {/* Background camera visuals */}
              <div className="absolute top-2 right-2 opacity-25">
                <Camera className="w-24 h-24 text-blue-600 transform rotate-12" />
              </div>
              <div className="absolute top-12 right-12 opacity-30">
                <Camera className="w-20 h-20 text-blue-700 transform -rotate-6" />
              </div>

              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className={`font-bold ${themeClasses.text.primary} text-xl`}>Vision Cam</p>
                  <p className={`text-sm ${themeClasses.text.muted}`}>AI-powered visualization</p>
                </div>
              </div>

              <p className={`text-sm ${themeClasses.text.secondary} mb-3 relative z-10 leading-snug font-medium italic`}>
                Use AI to show your customer their vision for their project.
              </p>

              <div className="mt-auto relative z-10">
                <button
                  onClick={() => setShowVisionCam(true)}
                  className="w-full py-3.5 px-4 bg-blue-500 hover:bg-blue-600 text-white text-base font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  <Camera className="w-5 h-5" />
                  Use Vision Cam Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Dots Indicator */}
        <div className="flex justify-center gap-2 pb-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <div className={`w-2 h-2 rounded-full ${theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'}`}></div>
        </div>

        {/* Upcoming Jobs Section */}
        <div className={`mx-2 ${themeClasses.bg.card} rounded-lg border ${themeClasses.border.secondary} overflow-hidden`}>
          <div className={`flex items-center justify-between p-2 border-b ${themeClasses.border.primary}`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-3 h-3 text-blue-500" />
              </div>
              <div>
                <h2 className={`font-semibold ${themeClasses.text.primary}`}>Upcoming Jobs</h2>
                <p className="text-xs text-zinc-500">Next 7 days</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/jobs-hub')}
              className="flex items-center gap-1 text-sm text-blue-500 font-medium"
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
            <div className="divide-y divide-blue-500/10">
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
                          : 'border-zinc-600 hover:border-blue-500 hover:bg-blue-500/20'
                      }`}
                    >
                      <CheckCircle2 className={`w-3 h-3 transition-colors ${
                        isCompleted
                          ? 'text-green-500'
                          : 'text-zinc-600 hover:text-blue-500'
                      }`} />
                    </button>
                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-3 h-3 text-blue-500" />
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
            className="w-full p-3 text-center text-sm text-blue-500 font-medium bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
          >
            See all upcoming jobs <ArrowRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>

        {/* Quick Preview Cards - Carousel */}
        <div className="relative">
          <div
            ref={carouselRef}
            className="overflow-hidden rounded-lg"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchMove={(e) => { touchEndX.current = e.touches[0].clientX; }}
            onTouchEnd={() => {
              const diff = touchStartX.current - touchEndX.current;
              if (Math.abs(diff) > 50) {
                if (diff > 0 && currentCardIndex < 3) {
                  setCurrentCardIndex(prev => prev + 1);
                } else if (diff < 0 && currentCardIndex > 0) {
                  setCurrentCardIndex(prev => prev - 1);
                }
              }
            }}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentCardIndex * 100}%)` }}
            >
              {/* Finance Card */}
              <button
                onClick={() => navigate('/finance-hub')}
                className={`${themeClasses.bg.card} rounded-lg border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-5 text-left ${themeClasses.hover.bg} transition-colors w-full flex-shrink-0 min-h-[220px] flex flex-col`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-bold ${themeClasses.text.primary} text-xl`}>Finance</p>
                    <p className={`text-sm ${themeClasses.text.muted}`}>This month</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-blue-500 ml-auto" />
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 flex flex-col justify-center">
                    <p className={`text-sm ${themeClasses.text.muted} mb-1`}>Revenue</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(financialSummary?.totalRevenue || 0)}</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 flex flex-col justify-center">
                    <p className={`text-sm ${themeClasses.text.muted} mb-1`}>Profit</p>
                    <p className={`text-2xl font-bold ${(financialSummary?.profit || 0) >= 0 ? 'text-blue-500' : 'text-red-400'}`}>
                      {formatCurrency(financialSummary?.profit || 0)}
                    </p>
                  </div>
                </div>
              </button>

              {/* Projects Card */}
              <button
                onClick={() => navigate('/projects-hub')}
                className={`${themeClasses.bg.card} rounded-lg border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-5 text-left ${themeClasses.hover.bg} transition-colors w-full flex-shrink-0 min-h-[220px] flex flex-col`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-7 h-7 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-bold ${themeClasses.text.primary} text-xl`}>Projects</p>
                    <p className={`text-sm ${themeClasses.text.muted}`}>{projects.length} total</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-blue-500 ml-auto" />
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 flex flex-col justify-center">
                    <p className={`text-sm ${themeClasses.text.muted} mb-1`}>Active</p>
                    <p className="text-2xl font-bold text-blue-500">{activeProjects}</p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 flex flex-col justify-center">
                    <p className={`text-sm ${themeClasses.text.muted} mb-1`}>Completed</p>
                    <p className="text-2xl font-bold text-green-400">{projects.filter(p => p.status === 'completed').length}</p>
                  </div>
                </div>
              </button>

              {/* Jobs Card */}
              <button
                onClick={() => navigate('/jobs-hub')}
                className={`${themeClasses.bg.card} rounded-lg border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-5 text-left ${themeClasses.hover.bg} transition-colors w-full flex-shrink-0 min-h-[220px] flex flex-col`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-bold ${themeClasses.text.primary} text-xl`}>Jobs</p>
                    <p className={`text-sm ${themeClasses.text.muted}`}>Upcoming</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-blue-500 ml-auto" />
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 flex flex-col justify-center">
                    <p className={`text-sm ${themeClasses.text.muted} mb-1`}>Today</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {events.filter(e => {
                        const today = new Date();
                        const eventDate = new Date(e.start_date);
                        return eventDate.toDateString() === today.toDateString() &&
                               ['task', 'meeting', 'delivery', 'inspection'].includes(e.event_type) &&
                               e.status !== 'cancelled';
                      }).length}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 flex flex-col justify-center">
                    <p className={`text-sm ${themeClasses.text.muted} mb-1`}>This week</p>
                    <p className="text-2xl font-bold text-blue-400">{upcomingJobs.length}</p>
                  </div>
                </div>
              </button>

              {/* Goals Card */}
              <button
                onClick={() => navigate('/business-hub')}
                className={`${themeClasses.bg.card} rounded-lg border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} p-5 text-left ${themeClasses.hover.bg} transition-colors w-full flex-shrink-0 min-h-[220px] flex flex-col`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Target className="w-7 h-7 text-blue-500" />
                  </div>
                  <div>
                    <p className={`font-bold ${themeClasses.text.primary} text-xl`}>Goals</p>
                    <p className={`text-sm ${themeClasses.text.muted}`}>Monthly</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-blue-500 ml-auto" />
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 flex flex-col justify-center">
                    <p className={`text-sm ${themeClasses.text.muted} mb-1`}>Revenue</p>
                    <p className="text-2xl font-bold text-green-400">75%</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 flex flex-col justify-center">
                    <p className={`text-sm ${themeClasses.text.muted} mb-1`}>Projects</p>
                    <p className="text-2xl font-bold text-blue-500">90%</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() => setCurrentCardIndex(prev => Math.max(0, prev - 1))}
            className={`absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center transition-opacity ${currentCardIndex === 0 ? 'opacity-30' : 'opacity-100'}`}
            disabled={currentCardIndex === 0}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setCurrentCardIndex(prev => Math.min(3, prev + 1))}
            className={`absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center transition-opacity ${currentCardIndex === 3 ? 'opacity-30' : 'opacity-100'}`}
            disabled={currentCardIndex === 3}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-2">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                onClick={() => setCurrentCardIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentCardIndex === index
                    ? 'bg-blue-500 w-4'
                    : 'bg-zinc-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Create Estimate Choice Modal */}
      <AddChoiceModal
        isOpen={showAddChoice}
        onClose={() => setShowAddChoice(false)}
        onAIChat={() => setShowAIChat(true)}
        onManual={() => navigate('/pricing')}
        title="Create Estimate"
        aiLabel="AI Assistant"
        aiDescription="Describe your project and I'll build the estimate"
        manualLabel="Calculator"
        manualDescription="Use the pricing calculator manually"
      />

      {/* AI Chat Popup */}
      {showAIChat && (
        <AIChatPopup
          isOpen={showAIChat}
          onClose={() => setShowAIChat(false)}
          mode="estimating"
        />
      )}

      {/* Vision Cam Modal */}
      <VisionCamModal
        isOpen={showVisionCam}
        onClose={() => setShowVisionCam(false)}
      />
    </div>
  );
};

export default Dashboard;
