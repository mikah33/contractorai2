import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  Plus,
  BarChart3,
  Settings,
  X,
  DollarSign,
  Briefcase,
  Sparkles,
  Calculator,
  Mail,
  UserPlus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronRight,
  CreditCard,
  Camera,
  History,
  Trash2,
  MessageSquare,
  Eye,
  Scan
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { CalendarEvent } from '../../services/calendarService';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';
import NotificationWebhookModal from '../calendar/NotificationWebhookModal';
import PhotoUploadModal from '../photos/PhotoUploadModal';
import VisionCamModal from '../vision/VisionCamModal';
import SendEmailModal from '../email/SendEmailModal';
import LiDARScannerModal from '../lidar/LiDARScannerModal';
import { PlanCreationModal } from '../plans';
import { format, parseISO } from 'date-fns';
import { contractorChatHistoryManager, ContractorChatSession } from '../../lib/ai/contractorChatHistory';
import AIChatPopup from '../ai/AIChatPopup';
import { ContractorMode } from '../../lib/ai/contractor-config';

interface MobileBottomNavProps {
  className?: string;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVisionCamModal, setShowVisionCamModal] = useState(false);
  const [showLiDARScanner, setShowLiDARScanner] = useState(false);
  const [showPlanCreation, setShowPlanCreation] = useState(false);
  const [lidarPlanId, setLidarPlanId] = useState<string | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [showEmailOptions, setShowEmailOptions] = useState(false);
  const [chatHistory, setChatHistory] = useState<ContractorChatSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedChatSession, setSelectedChatSession] = useState<ContractorChatSession | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Fetch events when event picker is opened
  useEffect(() => {
    if (showEventPicker && user) {
      const fetchEvents = async () => {
        setLoadingEvents(true);
        try {
          const { data } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', user.id)
            .order('start_date', { ascending: true });
          if (data) setEvents(data);
        } catch (error) {
          console.error('Error fetching events:', error);
        } finally {
          setLoadingEvents(false);
        }
      };
      fetchEvents();
    }
  }, [showEventPicker, user]);

  // Fetch chat history when history modal is opened
  useEffect(() => {
    if (showChatHistory) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const sessions = await contractorChatHistoryManager.getAllSessions();
          setChatHistory(sessions);
        } catch (error) {
          console.error('Error fetching chat history:', error);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [showChatHistory]);

  const handleDeleteChatSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await contractorChatHistoryManager.deleteSession(sessionId);
    const sessions = await contractorChatHistoryManager.getAllSessions();
    setChatHistory(sessions);
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'estimating': return <Calculator className="w-5 h-5 text-orange-500" />;
      case 'projects': return <Briefcase className="w-5 h-5 text-purple-500" />;
      case 'finance': return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'crm': return <UserPlus className="w-5 h-5 text-blue-500" />;
      default: return <MessageSquare className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'estimating': return 'Estimating';
      case 'projects': return 'Projects';
      case 'finance': return 'Finance';
      case 'crm': return 'Clients';
      default: return 'General';
    }
  };

  const navItems = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Jobs', icon: Briefcase, href: '/jobs-hub' },
    { name: 'AI', icon: Plus, href: '#', isCenter: true },
    { name: 'Finance', icon: DollarSign, href: '/finance-hub' },
    { name: 'Marketing', icon: BarChart3, href: '/ad-analyzer' },
  ];

  const aiModes = [
    {
      id: 'estimating',
      name: 'Estimating',
      icon: Calculator,
      description: 'Create construction estimates'
    },
    {
      id: 'projects',
      name: 'Projects',
      icon: Briefcase,
      description: 'Manage teams & schedules'
    },
    {
      id: 'collect-payment',
      name: 'Payment',
      icon: CreditCard,
      description: 'Collect payment from clients'
    },
    {
      id: 'finance',
      name: 'Finance',
      icon: DollarSign,
      description: 'Track expenses & revenue'
    },
    {
      id: 'clients',
      name: 'Clients',
      icon: UserPlus,
      description: 'Manage your clients'
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      description: 'Send emails to clients & team'
    },
  ];

  const handleAIClick = () => {
    setShowAIModal(true);
  };

  const handleModeSelect = (modeId: string) => {
    setShowAIModal(false);
    // Navigate to the appropriate hub page for each mode
    switch (modeId) {
      case 'estimating':
        navigate('/estimates-hub');
        break;
      case 'projects':
        navigate('/projects-hub');
        break;
      case 'photos':
        setShowPhotoModal(true);
        break;
      case 'vision-cam':
        setShowVisionCamModal(true);
        break;
      case 'lidar-scan':
        setShowPlanCreation(true);
        break;
      case 'collect-payment':
        navigate('/finance-hub', { state: { openPaymentCollection: true } });
        break;
      case 'finance':
        navigate('/finance-hub');
        break;
      case 'email':
        setShowEmailOptions(true);
        break;
      case 'send-email':
        setShowEmailOptions(false);
        setShowSendEmailModal(true);
        break;
      case 'email-notification':
        setShowEmailOptions(false);
        setShowEventPicker(true);
        break;
      case 'clients':
        navigate('/clients-hub');
        break;
      default:
        navigate(`/ai-team?mode=${modeId}`);
    }
  };

  return (
    <>
      {/* Unified Bottom Navigation Bar with AI Search */}
      <nav className={`fixed bottom-0 left-0 right-0 ${themeClasses.bg.secondary} border-t ${themeClasses.border.primary} z-[100] pb-safe ${className} ${showAIModal || showEventPicker || showNotificationModal || showPhotoModal || showVisionCamModal || showLiDARScanner || showPlanCreation || showChatHistory || showSendEmailModal || showEmailOptions || location.pathname === '/ai-team' ? 'hidden' : ''}`}>
        {/* Nav Icons Row */}
        <div className={`flex items-center justify-around h-16 ${themeClasses.bg.secondary}`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;

            if (item.isCenter) {
              return (
                <button
                  key={item.name}
                  onClick={handleAIClick}
                  className="relative -mt-10 w-[72px] h-[72px] bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
                >
                  <Plus className="w-9 h-9 text-white" />
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-orange-500' : 'text-zinc-500'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'text-orange-500' : 'text-zinc-500'}`} />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* AI Search Bar Row */}
        <div className="px-4 pb-2">
          <button
            onClick={handleAIClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 ${themeClasses.bg.card} rounded-xl border ${theme === 'light' ? 'border-orange-300' : 'border-orange-500/30'} active:scale-[0.98] transition-transform`}
          >
            <div className="w-7 h-7 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-orange-500" />
            </div>
            <span className={`flex-1 text-left text-sm ${themeClasses.text.secondary}`}>Ask Contractor AI anything...</span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${theme === 'light' ? 'bg-gray-200' : 'bg-zinc-800'} text-orange-500`}>
              <Sparkles className="w-4 h-4" />
            </div>
          </button>
        </div>
      </nav>

      {/* AI Mode Selection Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAIModal(false)}
          />

          {/* Modal Content */}
          <div className={`relative w-full max-w-lg ${themeClasses.bg.modal} rounded-t-2xl pb-safe animate-slide-up`}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className={`w-10 h-1 ${themeClasses.bg.tertiary} rounded-full`} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${themeClasses.text.primary}`}>Contractor AI</h2>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>What would you like help with?</p>
                </div>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mode Options */}
            <div className="px-5 pb-4 grid grid-cols-2 gap-2.5">
              {aiModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  className={`flex flex-col items-center p-3.5 ${theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'} rounded-xl border border-gray-200 hover:border-gray-300 active:scale-[0.98] transition-all`}
                >
                  <div className="w-11 h-11 bg-orange-500/20 rounded-xl flex items-center justify-center mb-2">
                    <mode.icon className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className={`font-semibold text-sm ${themeClasses.text.primary}`}>{mode.name}</span>
                  <span className={`text-xs ${themeClasses.text.secondary} text-center mt-0.5`}>{mode.description}</span>
                </button>
              ))}
            </div>

            {/* Plan Creation Button - LiDAR */}
            <div className="px-5 pb-2.5">
              <button
                onClick={() => handleModeSelect('lidar-scan')}
                className={`w-full flex items-center gap-4 p-3.5 ${theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'} rounded-xl border border-gray-200 hover:border-gray-300 active:scale-[0.98] transition-all`}
              >
                <div className="w-11 h-11 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Scan className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className={`font-semibold ${themeClasses.text.primary}`}>Plan Creation</span>
                  <p className={`text-xs ${themeClasses.text.secondary}`}>Scan rooms or draw floor plans</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Vision Cam Button - Above Photos */}
            <div className="px-5 pb-2.5">
              <button
                onClick={() => handleModeSelect('vision-cam')}
                className={`w-full flex items-center gap-4 p-3.5 ${theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'} rounded-xl border border-gray-200 hover:border-gray-300 active:scale-[0.98] transition-all`}
              >
                <div className="w-11 h-11 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className={`font-semibold ${themeClasses.text.primary}`}>Vision Cam</span>
                  <p className={`text-xs ${themeClasses.text.secondary}`}>AI-powered project visualization</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Photos Button - Full Width */}
            <div className="px-5 pb-2.5">
              <button
                onClick={() => handleModeSelect('photos')}
                className={`w-full flex items-center gap-4 p-3.5 ${theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'} rounded-t-xl border border-gray-200 border-b-0 hover:border-gray-300 active:scale-[0.98] transition-all`}
              >
                <div className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className={`font-semibold ${themeClasses.text.primary}`}>Photos</span>
                  <p className={`text-xs ${themeClasses.text.secondary}`}>Capture & organize project photos</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              {/* Gallery Button - Attached below Photos */}
              <button
                onClick={() => {
                  setShowAIModal(false);
                  navigate('/photos-gallery');
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 ${theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'} rounded-b-xl border border-gray-200 border-t-0 hover:border-gray-300 active:scale-[0.98] transition-all`}
              >
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Camera className="w-4 h-4 text-orange-400" />
                </div>
                <span className={`text-sm font-medium ${themeClasses.text.primary}`}>Gallery</span>
                <ChevronRight className={`w-4 h-4 ${themeClasses.text.secondary} ml-auto`} />
              </button>
            </div>

            {/* Chat History Button - Full Width */}
            <div className="px-5 pb-2.5">
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setShowChatHistory(true);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 ${theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'} rounded-xl border ${themeClasses.border.primary} ${themeClasses.hover.bg} active:scale-[0.98] transition-all`}
              >
                <div className={`w-8 h-8 ${themeClasses.bg.tertiary} rounded-lg flex items-center justify-center`}>
                  <History className={`w-4 h-4 ${themeClasses.text.secondary}`} />
                </div>
                <span className={`text-sm font-medium ${themeClasses.text.primary}`}>AI Chat History</span>
                <ChevronRight className={`w-4 h-4 ${themeClasses.text.secondary} ml-auto`} />
              </button>
            </div>

            {/* Settings Button - Full Width */}
            <div className="px-4 pb-6">
              <button
                onClick={() => {
                  setShowAIModal(false);
                  navigate('/settings');
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 ${theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'} rounded-lg border ${themeClasses.border.primary} ${themeClasses.hover.bg} active:scale-[0.98] transition-all`}
              >
                <div className={`w-8 h-8 ${themeClasses.bg.tertiary} rounded-md flex items-center justify-center`}>
                  <Settings className={`w-4 h-4 ${themeClasses.text.secondary}`} />
                </div>
                <span className={`text-sm font-medium ${themeClasses.text.primary}`}>Settings</span>
                <ChevronRight className={`w-4 h-4 ${themeClasses.text.secondary} ml-auto`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Options Modal */}
      {showEmailOptions && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowEmailOptions(false)}
          />

          {/* Modal */}
          <div className={`relative w-full max-w-lg ${themeClasses.bg.modal} rounded-2xl overflow-hidden animate-slide-up`}>
            {/* Handle */}
            <div className="flex justify-center pt-4 pb-3">
              <div className={`w-12 h-1.5 ${themeClasses.bg.tertiary} rounded-full`} />
            </div>

            {/* Header */}
            <div className={`flex items-center justify-between px-6 pb-5 border-b border-blue-500/30`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Mail className="w-7 h-7 text-blue-500" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Email</h2>
                  <p className={`text-base ${themeClasses.text.secondary}`}>Choose what to send</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailOptions(false)}
                className={`p-3 ${themeClasses.text.secondary} ${themeClasses.hover.text} rounded-xl bg-gray-100`}
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Email Options */}
            <div className="p-6 pb-10 space-y-4">
              <button
                onClick={() => handleModeSelect('send-email')}
                className={`w-full flex items-center gap-5 p-5 ${themeClasses.bg.card} rounded-2xl border-2 border-blue-500/30 hover:border-blue-500 active:scale-[0.98] transition-all`}
              >
                <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`text-xl font-bold ${themeClasses.text.primary}`}>Send Email</h3>
                  <p className={`text-base ${themeClasses.text.secondary}`}>Compose a new email to clients or team</p>
                </div>
                <ChevronRight className="w-7 h-7 text-blue-500" />
              </button>

              <button
                onClick={() => handleModeSelect('email-notification')}
                className={`w-full flex items-center gap-5 p-5 ${themeClasses.bg.card} rounded-2xl border-2 border-blue-500/30 hover:border-blue-500 active:scale-[0.98] transition-all`}
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <CalendarIcon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`text-xl font-bold ${themeClasses.text.primary}`}>Email About Event</h3>
                  <p className={`text-base ${themeClasses.text.secondary}`}>Notify about a calendar event</p>
                </div>
                <ChevronRight className="w-7 h-7 text-blue-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Picker Modal */}
      {showEventPicker && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowEventPicker(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg md:max-w-2xl bg-[#1C1C1E] rounded-t-2xl md:rounded-2xl md:mx-4 max-h-[80vh] overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#3A3A3C] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-orange-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Send Email</h2>
                  <p className="text-sm text-zinc-400">Select an event to notify about</p>
                </div>
              </div>
              <button
                onClick={() => setShowEventPicker(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Events List */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingEvents ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium">No events yet</p>
                  <p className="text-sm text-zinc-500 mt-1">Create an event first to send notifications</p>
                  <button
                    onClick={() => {
                      setShowEventPicker(false);
                      navigate('/calendar');
                    }}
                    className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md font-medium hover:bg-orange-600 active:scale-95 transition-all"
                  >
                    Go to Calendar
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventPicker(false);
                        setShowNotificationModal(true);
                      }}
                      className="w-full flex items-center gap-3 p-4 bg-[#2C2C2E] rounded-lg border border-orange-500/30 hover:border-orange-500/60 active:scale-[0.98] transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CalendarIcon className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{event.title}</h3>
                        {event.start_date && (
                          <p className="text-sm text-zinc-400 mt-0.5">
                            <Clock className="w-3.5 h-3.5 inline mr-1" />
                            {format(parseISO(event.start_date), 'MMM d, yyyy • h:mm a')}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {event.location}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat History Modal */}
      {showChatHistory && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowChatHistory(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg md:max-w-2xl bg-[#1C1C1E] rounded-t-2xl md:rounded-2xl md:mx-4 max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#3A3A3C] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center">
                  <History className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Chat History</h2>
                  <p className="text-sm text-zinc-400">All your AI conversations</p>
                </div>
              </div>
              <button
                onClick={() => setShowChatHistory(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* History List */}
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium">No chat history yet</p>
                  <p className="text-sm text-zinc-500 mt-1">Start a conversation with any AI assistant</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatHistory.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setSelectedChatSession(session);
                        setShowChatHistory(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 bg-[#2C2C2E] rounded-lg border border-white/10 hover:border-orange-500/50 active:scale-[0.98] transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-[#3A3A3C] rounded-lg flex items-center justify-center flex-shrink-0">
                        {getModeIcon(session.mode || 'general')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded text-zinc-300">
                            {getModeLabel(session.mode || 'general')}
                          </span>
                        </div>
                        <p className="font-medium text-white truncate mt-1">
                          {session.messages[1]?.content?.slice(0, 50) || 'New conversation'}...
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {session.messages.length} messages • {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteChatSession(e, session.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationWebhookModal
        isOpen={showNotificationModal}
        onClose={() => {
          setShowNotificationModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
      />

      {/* Vision Cam Modal */}
      <VisionCamModal
        isOpen={showVisionCamModal}
        onClose={() => setShowVisionCamModal(false)}
      />

      {/* Plan Creation Modal */}
      <PlanCreationModal
        isOpen={showPlanCreation}
        onClose={() => setShowPlanCreation(false)}
        onStartLiDAR={(planId) => {
          setLidarPlanId(planId);
          setShowLiDARScanner(true);
        }}
      />

      {/* LiDAR Scanner Modal */}
      <LiDARScannerModal
        isOpen={showLiDARScanner}
        onClose={() => {
          setShowLiDARScanner(false);
          setLidarPlanId(null);
        }}
        projectId={lidarPlanId || undefined}
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={showSendEmailModal}
        onClose={() => setShowSendEmailModal(false)}
      />

      {/* AI Chat Popup for loaded history sessions */}
      {selectedChatSession && (
        <AIChatPopup
          isOpen={true}
          onClose={() => setSelectedChatSession(null)}
          mode={(selectedChatSession.mode || 'general') as ContractorMode}
          initialSession={selectedChatSession}
        />
      )}
    </>
  );
};

export default MobileBottomNav;
