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
import NotificationWebhookModal from '../calendar/NotificationWebhookModal';
import PhotoUploadModal from '../photos/PhotoUploadModal';
import VisionCamModal from '../vision/VisionCamModal';
import SendEmailModal from '../email/SendEmailModal';
import LiDARScannerModal from '../lidar/LiDARScannerModal';
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
  const [showAIModal, setShowAIModal] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVisionCamModal, setShowVisionCamModal] = useState(false);
  const [showLiDARScanner, setShowLiDARScanner] = useState(false);
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
    { name: 'Tasks', icon: ClipboardList, href: '/todo-hub' },
    { name: 'AI', icon: Plus, href: '#', isCenter: true },
    { name: 'Marketing', icon: BarChart3, href: '/ad-analyzer' },
    { name: 'Settings', icon: Settings, href: '/settings' },
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
        setShowLiDARScanner(true);
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
      {/* Bottom Navigation Bar - Sits above the AI search bar */}
      <nav className={`fixed bottom-[calc(52px+env(safe-area-inset-bottom))] left-0 right-0 bg-[#1C1C1E] border-t border-orange-500/30 z-[100] ${className} ${showAIModal || showEventPicker || showNotificationModal || showPhotoModal || showVisionCamModal || showLiDARScanner || showChatHistory || showSendEmailModal || showEmailOptions || location.pathname === '/ai-team' ? 'hidden' : ''}`}>
        <div className="flex items-center justify-around h-16 bg-[#1C1C1E]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;

            if (item.isCenter) {
              return (
                <button
                  key={item.name}
                  onClick={handleAIClick}
                  className="relative -mt-6 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
                >
                  <Plus className="w-7 h-7 text-white" />
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
      </nav>

      {/* AI Mode Selection Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAIModal(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md md:max-w-lg bg-[#1C1C1E] rounded-t-2xl md:rounded-2xl pb-safe md:pb-6 md:mx-4 animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#3A3A3C] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-6 pb-3 md:pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-white">Contractor AI</h2>
                  <p className="text-sm text-zinc-400">What would you like help with?</p>
                </div>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mode Options */}
            <div className="px-4 md:px-6 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {aiModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  className="flex flex-col items-center p-3 md:p-4 bg-[#2C2C2E] rounded-lg border border-orange-500/30 hover:border-orange-500/60 active:scale-[0.98] transition-all"
                >
                  <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3">
                    <mode.icon className="w-7 h-7 text-orange-500" />
                  </div>
                  <span className="font-semibold text-white">{mode.name}</span>
                  <span className="text-xs text-zinc-400 text-center mt-1">{mode.description}</span>
                </button>
              ))}
            </div>

            {/* Plan Creation Button - LiDAR */}
            <div className="px-4 pb-2">
              <button
                onClick={() => handleModeSelect('lidar-scan')}
                className="w-full flex items-center gap-4 p-3 md:p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/50 hover:border-cyan-500 active:scale-[0.98] transition-all mb-2"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Scan className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-white text-lg">Plan Creation</span>
                  <p className="text-sm text-zinc-400">Scan rooms or draw floor plans</p>
                </div>
                <ChevronRight className="w-6 h-6 text-cyan-400" />
              </button>
            </div>

            {/* Vision Cam Button - Above Photos */}
            <div className="px-4 pb-2">
              <button
                onClick={() => handleModeSelect('vision-cam')}
                className="w-full flex items-center gap-4 p-3 md:p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/50 hover:border-purple-500 active:scale-[0.98] transition-all mb-2"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Eye className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-white text-base md:text-lg">Vision Cam</span>
                  <p className="text-sm text-zinc-400">AI-powered project visualization</p>
                </div>
                <ChevronRight className="w-6 h-6 text-purple-400" />
              </button>
            </div>

            {/* Photos Button - Full Width */}
            <div className="px-4 pb-2">
              <button
                onClick={() => handleModeSelect('photos')}
                className="w-full flex items-center gap-4 p-3 md:p-4 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-t-lg border border-orange-500/50 border-b-0 hover:border-orange-500 active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-white text-base md:text-lg">Photos</span>
                  <p className="text-sm text-zinc-400">Capture & organize project photos</p>
                </div>
                <ChevronRight className="w-6 h-6 text-orange-500" />
              </button>
              {/* Gallery Button - Attached below Photos */}
              <button
                onClick={() => {
                  setShowAIModal(false);
                  navigate('/photos-gallery');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-[#2C2C2E] rounded-b-lg border border-orange-500/30 hover:border-orange-500/50 active:scale-[0.98] transition-all"
              >
                <div className="w-8 h-8 bg-orange-500/20 rounded-md flex items-center justify-center">
                  <Camera className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-sm font-medium text-zinc-300">Gallery</span>
                <ChevronRight className="w-4 h-4 text-zinc-500 ml-auto" />
              </button>
            </div>

            {/* Chat History Button - Full Width */}
            <div className="px-4 pb-6">
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setShowChatHistory(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-[#2C2C2E] rounded-lg border border-zinc-700 hover:border-zinc-500 active:scale-[0.98] transition-all"
              >
                <div className="w-8 h-8 bg-zinc-700 rounded-md flex items-center justify-center">
                  <History className="w-4 h-4 text-zinc-300" />
                </div>
                <span className="text-sm font-medium text-zinc-300">Chat History</span>
                <ChevronRight className="w-4 h-4 text-zinc-500 ml-auto" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Options Modal */}
      {showEmailOptions && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowEmailOptions(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg md:max-w-xl bg-[#1C1C1E] rounded-t-2xl md:rounded-2xl md:mx-4 overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#3A3A3C] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-white">Email</h2>
                  <p className="text-sm text-zinc-400">Choose what to send</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailOptions(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Email Options */}
            <div className="p-4 pb-8 space-y-3">
              <button
                onClick={() => handleModeSelect('send-email')}
                className="w-full flex items-center gap-4 p-3 md:p-4 bg-[#2C2C2E] rounded-xl border border-blue-500/30 hover:border-blue-500 active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white">Send Email</h3>
                  <p className="text-sm text-zinc-400">Compose a new email to clients or team</p>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </button>

              <button
                onClick={() => handleModeSelect('email-notification')}
                className="w-full flex items-center gap-4 p-3 md:p-4 bg-[#2C2C2E] rounded-xl border border-blue-500/30 hover:border-blue-500 active:scale-[0.98] transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white">Email About Event</h3>
                  <p className="text-sm text-zinc-400">Notify about a calendar event</p>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-400" />
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

      {/* LiDAR Scanner Modal */}
      <LiDARScannerModal
        isOpen={showLiDARScanner}
        onClose={() => setShowLiDARScanner(false)}
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
