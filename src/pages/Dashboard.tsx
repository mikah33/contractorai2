import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Camera,
  MapPin,
  Navigation,
  ClipboardList,
  FileCheck,
  Bell,
  X as XIcon,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
import { supabase } from '../lib/supabase';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';


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
  const [tasks, setTasks] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [businessLocation, setBusinessLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [taskLocations, setTaskLocations] = useState<{lat: number, lng: number, name: string, address: string}[]>([]);
  const [approvedEstimates, setApprovedEstimates] = useState<any[]>([]);
  const [declinedEstimates, setDeclinedEstimates] = useState<any[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Create custom clipboard marker icon with label
  const createMarkerIcon = (label: string) => new L.DivIcon({
    className: 'custom-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="
          background: white;
          padding: 6px 12px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          margin-bottom: 8px;
          white-space: nowrap;
          font-weight: 700;
          font-size: 14px;
          color: #1f2937;
          border: 2px solid #043d6b;
        ">${label}</div>
        <div style="
          background: #043d6b;
          width: 44px;
          height: 44px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(4, 61, 107, 0.5);
          border: 3px solid white;
        ">
          <svg style="transform: rotate(45deg); width: 22px; height: 22px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [120, 90],
    iconAnchor: [60, 90],
    popupAnchor: [0, -90]
  });

  // Create home marker icon for business location
  const createHomeMarkerIcon = () => new L.DivIcon({
    className: 'custom-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="
          background: white;
          padding: 6px 12px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          margin-bottom: 8px;
          white-space: nowrap;
          font-weight: 700;
          font-size: 14px;
          color: #1f2937;
          border: 2px solid #10b981;
        ">Home Base</div>
        <div style="
          background: #10b981;
          width: 44px;
          height: 44px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
          border: 3px solid white;
        ">
          <svg style="transform: rotate(45deg); width: 22px; height: 22px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [120, 90],
    iconAnchor: [60, 90],
    popupAnchor: [0, -90]
  });
  const [taskCardIndex, setTaskCardIndex] = useState(0);
  const taskCarouselRef = useRef<HTMLDivElement>(null);
  const taskTouchStartX = useRef(0);
  const taskTouchEndX = useRef(0);
  const [topCardIndex, setTopCardIndex] = useState(0);

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

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to a fallback location if geolocation fails
          setUserLocation({ lat: 33.8361, lng: -81.1637 }); // Default SC location
        }
      );
    }

    // Fetch tasks from tasks table
    const fetchTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('tasks')
            .select('*, projects(name, address)')
            .eq('user_id', user.id)
            .neq('status', 'done')
            .order('due_date', { ascending: true })
            .limit(10);
          setTasks(data || []);

          // Filter for today's tasks
          const today = new Date().toISOString().split('T')[0];
          const todayData = (data || []).filter(t => t.due_date === today);
          setTodayTasks(todayData);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };
    fetchTasks();
  }, []);

  // Geocode business address from profile
  useEffect(() => {
    const geocodeBusinessAddress = async () => {
      if (!profile?.address) return;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(profile.address)}&limit=1`,
          { headers: { 'User-Agent': 'ContractorAI-App' } }
        );
        const data = await response.json();
        if (data && data[0]) {
          setBusinessLocation({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            address: profile.address
          });
        }
      } catch (error) {
        console.error('Business address geocoding error:', error);
      }
    };

    geocodeBusinessAddress();
  }, [profile?.address]);

  useEffect(() => {
    calculateFinancialSummary();
  }, [payments, receipts]);

  // Geocode task addresses
  useEffect(() => {
    const geocodeAddresses = async () => {
      const tasksWithAddresses = todayTasks.filter(t => t.projects?.address);
      if (tasksWithAddresses.length === 0) return;

      const locations: {lat: number, lng: number, name: string, address: string}[] = [];

      for (const task of tasksWithAddresses) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(task.projects.address)}&limit=1`,
            { headers: { 'User-Agent': 'ContractorAI-App' } }
          );
          const data = await response.json();
          if (data && data[0]) {
            locations.push({
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              name: task.projects.name || task.title,
              address: task.projects.address
            });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        }
      }

      setTaskLocations(locations);
    };

    if (todayTasks.length > 0) {
      geocodeAddresses();
    }
  }, [todayTasks]);

  // Fetch approved and declined estimates for notifications
  useEffect(() => {
    const fetchEstimateResponses = async () => {
      if (!user?.id) return;

      try {
        // Fetch approved estimates
        const { data: approved, error: approvedError } = await supabase
          .from('estimate_email_responses')
          .select(`
            *,
            estimate:estimates(title, total)
          `)
          .eq('user_id', user.id)
          .eq('accepted', true)
          .order('responded_at', { ascending: false })
          .limit(3);

        if (approvedError) {
          console.error('Error fetching approved estimates:', approvedError);
        } else {
          const filtered = (approved || []).filter(e => !dismissedNotifications.has(e.id));
          setApprovedEstimates(filtered);
        }

        // Fetch declined estimates
        const { data: declined, error: declinedError } = await supabase
          .from('estimate_email_responses')
          .select(`
            *,
            estimate:estimates(title, total)
          `)
          .eq('user_id', user.id)
          .eq('declined', true)
          .order('responded_at', { ascending: false })
          .limit(3);

        if (declinedError) {
          console.error('Error fetching declined estimates:', declinedError);
        } else {
          setDeclinedEstimates(declined || []);
        }
      } catch (err) {
        console.error('Error fetching estimate responses:', err);
      }
    };

    fetchEstimateResponses();

    // Set up real-time subscription for estimate updates
    const channel = supabase
      .channel('estimate-responses')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'estimate_email_responses',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchEstimateResponses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, dismissedNotifications]);

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => new Set([...prev, id]));
    setApprovedEstimates(prev => prev.filter(e => e.id !== id));
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
    { id: 'finance', label: 'Finance', icon: DollarSign, bgColor: 'bg-[#043d6b]/20', iconColor: 'text-[#043d6b]', href: '/finance-hub' },
    { id: 'projects', label: 'Projects', icon: Briefcase, bgColor: 'bg-[#043d6b]/20', iconColor: 'text-[#043d6b]', href: '/projects-hub' },
    { id: 'jobs', label: 'Jobs', icon: Calendar, bgColor: 'bg-[#043d6b]/20', iconColor: 'text-[#043d6b]', href: '/jobs-hub' },
    { id: 'goals', label: 'Goals', icon: Target, bgColor: 'bg-[#043d6b]/20', iconColor: 'text-[#043d6b]', href: '/business-hub' },
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

      {/* Fixed Header with solid background */}
      <div className={`fixed top-0 left-0 right-0 z-40 ${theme === 'light' ? 'bg-white' : 'bg-zinc-900'}`}>
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="px-4 pb-4 pt-3 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-zinc-400'}`}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <h1 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'} mt-1`}>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {displayName}!
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Bleed Map Section - Ends just past Today's Tasks cards */}
      <div className="absolute top-0 left-0 right-0 z-0" style={{ height: '72vh', minHeight: '520px', maxHeight: '650px' }}>
        {/* Map Container */}
        <div className="h-full w-full">
          {taskLocations.length > 0 ? (
            <MapContainer
              center={[taskLocations[0].lat, taskLocations[0].lng]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
              dragging={false}
              touchZoom={true}
              scrollWheelZoom={true}
              doubleClickZoom={true}
            >
              <TileLayer
                url={theme === 'light'
                  ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                }
              />
              {/* Business location home marker */}
              {businessLocation && (
                <Marker
                  position={[businessLocation.lat, businessLocation.lng]}
                  icon={createHomeMarkerIcon()}
                >
                  <Popup>
                    <div className="text-center p-1">
                      <p className="font-bold text-gray-900 text-base">Home Base</p>
                      <p className="text-gray-600 text-sm mt-1">{businessLocation.address}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
              {taskLocations.map((location, index) => (
                <Marker
                  key={index}
                  position={[location.lat, location.lng]}
                  icon={createMarkerIcon(location.name)}
                >
                  <Popup>
                    <div className="text-center p-1">
                      <p className="font-bold text-gray-900 text-base">{location.name}</p>
                      <p className="text-gray-600 text-sm mt-1">{location.address}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : businessLocation ? (
            <MapContainer
              center={[businessLocation.lat, businessLocation.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
              dragging={false}
              touchZoom={true}
              scrollWheelZoom={true}
              doubleClickZoom={true}
            >
              <TileLayer
                url={theme === 'light'
                  ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                }
              />
              {/* Business location home marker */}
              <Marker
                position={[businessLocation.lat, businessLocation.lng]}
                icon={createHomeMarkerIcon()}
              >
                <Popup>
                  <div className="text-center p-1">
                    <p className="font-bold text-gray-900 text-base">Home Base</p>
                    <p className="text-gray-600 text-sm mt-1">{businessLocation.address}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : userLocation ? (
            <MapContainer
              center={[userLocation.lat, userLocation.lng]}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
              dragging={false}
              touchZoom={true}
              scrollWheelZoom={true}
              doubleClickZoom={true}
            >
              <TileLayer
                url={theme === 'light'
                  ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                }
              />
            </MapContainer>
          ) : (
            <div className={`flex items-center justify-center h-full ${theme === 'light' ? 'bg-gray-50' : 'bg-zinc-800'}`}>
              <div className="text-center">
                <Navigation className={`w-10 h-10 ${themeClasses.text.muted} mx-auto mb-3 animate-pulse`} />
                <p className={`text-sm ${themeClasses.text.muted}`}>Loading map...</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Fade Gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '40%',
            background: theme === 'light'
              ? 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0) 100%)'
              : 'linear-gradient(to top, rgba(24,24,27,1) 0%, rgba(24,24,27,0.9) 40%, rgba(24,24,27,0) 100%)'
          }}
        />

        </div>

      {/* Spacer to push content below map */}
      <div style={{ height: 'calc(52vh - 60px)', minHeight: '280px', maxHeight: '400px' }} />

      {/* Today's Tasks Section - Transparent so map shows behind */}
      <div className="relative z-20">
        <div className="px-4 pt-4">
          {/* Section Header with View All */}
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Today's Tasks</h2>
            <button
              onClick={() => navigate('/search', { state: { initialCategory: 'tasks' } })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'} text-sm font-medium active:scale-95 transition-all`}
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div
            ref={taskCarouselRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
            style={{ scrollPaddingLeft: '16px' }}
          >
            {todayTasks.length === 0 ? (
              <div
                className={`flex-shrink-0 snap-start ${theme === 'light' ? 'bg-stone-100 border-stone-200' : 'bg-zinc-800/95 border-zinc-700'} border rounded-2xl`}
                style={{ width: 'calc(100vw - 80px)', minWidth: '280px', maxWidth: '340px' }}
              >
                <div className="p-6 flex items-center justify-center" style={{ minHeight: '120px' }}>
                  <p className={`text-base font-medium ${theme === 'light' ? 'text-gray-500' : 'text-zinc-400'}`}>No visits scheduled today</p>
                </div>
              </div>
            ) : (
              todayTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`flex-shrink-0 snap-start ${theme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-zinc-800/95 border border-zinc-700'} rounded-2xl text-left overflow-hidden`}
                  style={{ width: 'calc(100vw - 80px)', minWidth: '280px', maxWidth: '340px' }}
                >
                  <button
                    onClick={() => navigate('/search', { state: { initialCategory: 'tasks' } })}
                    className="w-full p-4 flex items-start gap-3 active:scale-[0.98] transition-all"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${theme === 'light' ? 'bg-[#043d6b]/20' : 'bg-[#043d6b]/20'}`}>
                      <ClipboardList className="w-6 h-6 text-[#043d6b]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-lg font-bold ${themeClasses.text.primary} line-clamp-1`}>{task.title}</p>
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-zinc-400'} mt-0.5`}>
                        {task.projects?.name || 'No project assigned'}
                      </p>
                    </div>
                  </button>
                  {task.projects?.address && (
                    <a
                      href={`https://maps.apple.com/?q=${encodeURIComponent(task.projects.address)}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`flex items-center gap-1.5 px-4 pb-4 -mt-2 ${theme === 'light' ? 'text-[#043d6b] hover:text-[#035291]' : 'text-[#043d6b] hover:text-[#035291]'} text-sm`}
                    >
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate underline">{task.projects.address}</span>
                    </a>
                  )}
                </div>
              ))
            )}

            {/* Add Task Card - Partially Visible */}
            <button
              onClick={() => navigate('/search', { state: { initialCategory: 'tasks' } })}
              className={`flex-shrink-0 snap-start border border-dashed ${theme === 'light' ? 'border-green-400 bg-green-50/50 hover:bg-green-100/50' : 'border-green-600 bg-green-900/20 hover:bg-green-900/30'} rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all`}
              style={{ width: '100px', minHeight: '100px' }}
            >
              <Plus className={`w-8 h-8 ${theme === 'light' ? 'text-green-600' : 'text-green-500'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content below tasks - Solid background */}
      <div className={`relative z-20 ${themeClasses.bg.primary}`}>
        {/* Approved Estimates Notification */}
        {approvedEstimates.length > 0 && (
          <div className="px-4 pt-4">
            <div className={`rounded-xl overflow-hidden ${theme === 'light' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-800'}`}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-green-100' : 'bg-green-800'}`}>
                    <Bell className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className={`font-bold ${theme === 'light' ? 'text-green-800' : 'text-green-300'}`}>
                    Estimate{approvedEstimates.length > 1 ? 's' : ''} Approved!
                  </h3>
                </div>

                <div className="space-y-2">
                  {approvedEstimates.map((estimate) => (
                    <div
                      key={estimate.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${theme === 'light' ? 'bg-white' : 'bg-zinc-800'}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${theme === 'light' ? 'bg-green-100' : 'bg-green-900/50'}`}>
                        <FileCheck className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${themeClasses.text.primary} truncate`}>
                          {estimate.customer_name || 'Customer'}
                        </p>
                        <p className={`text-sm ${themeClasses.text.muted}`}>
                          {estimate.estimate?.title || 'Estimate'} • ${estimate.estimate?.total ? Number(estimate.estimate.total).toLocaleString() : '0'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <button
                          onClick={() => dismissNotification(estimate.id)}
                          className={`p-1.5 rounded-lg ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-zinc-700'}`}
                        >
                          <XIcon className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className={`text-sm mt-3 ${theme === 'light' ? 'text-green-700' : 'text-green-400'}`}>
                  <CreditCard className="w-4 h-4 inline mr-1" />
                  Payment links have been sent automatically
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Declined Estimates Notification */}
        {declinedEstimates.length > 0 && (
          <div className="px-4 pt-4">
            <div className={`rounded-xl overflow-hidden ${theme === 'light' ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200' : 'bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-800'}`}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-red-100' : 'bg-red-800'}`}>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <h3 className={`font-bold ${theme === 'light' ? 'text-red-800' : 'text-red-300'}`}>
                    Estimate{declinedEstimates.length > 1 ? 's' : ''} Declined
                  </h3>
                </div>

                <div className="space-y-2">
                  {declinedEstimates.map((estimate) => (
                    <div
                      key={estimate.id}
                      className={`flex flex-col gap-2 p-3 rounded-lg ${theme === 'light' ? 'bg-white' : 'bg-zinc-800'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${theme === 'light' ? 'bg-red-100' : 'bg-red-900/50'}`}>
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${themeClasses.text.primary} truncate`}>
                            {estimate.customer_name || 'Customer'}
                          </p>
                          <p className={`text-sm ${themeClasses.text.muted}`}>
                            {estimate.estimate?.title || 'Estimate'} • ${estimate.estimate?.total ? Number(estimate.estimate.total).toLocaleString() : '0'}
                          </p>
                        </div>
                      </div>
                      <div className={`mt-1 p-3 rounded-lg ${theme === 'light' ? 'bg-red-50 border border-red-100' : 'bg-red-900/20 border border-red-800/50'}`}>
                        <p className={`text-sm font-medium ${theme === 'light' ? 'text-red-800' : 'text-red-300'} mb-1`}>
                          Customer Feedback:
                        </p>
                        <p className={`text-sm ${theme === 'light' ? 'text-red-700' : 'text-red-400'}`}>
                          {estimate.declined_reason || 'No reason provided'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 pb-2 space-y-2 max-w-5xl mx-auto px-4">
        {/* Feature Cards Carousel */}
        <div
          className="overflow-x-auto scrollbar-hide snap-x snap-mandatory py-2"
          onScroll={(e) => {
            const container = e.currentTarget;
            const scrollLeft = container.scrollLeft;
            const cardWidth = container.offsetWidth;
            const newIndex = Math.round(scrollLeft / cardWidth);
            if (newIndex !== topCardIndex) {
              setTopCardIndex(newIndex);
            }
          }}
        >
          <div className="flex gap-4 px-4" style={{ width: 'max-content' }}>
            {/* Create Estimate Card */}
            <div
              className={`${themeClasses.bg.card} rounded-xl border ${theme === 'light' ? 'border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'border-zinc-600 shadow-xl shadow-black/30'} p-5 text-left transition-colors flex-shrink-0 flex flex-col relative overflow-hidden snap-center`}
              style={{ width: 'calc(100vw - 48px)', maxWidth: '380px', minHeight: '240px' }}
            >
              {/* Background payment card visual */}
              <div className="absolute top-4 right-4 w-36 h-24 bg-gradient-to-br from-[#043d6b] to-[#032b4d] rounded-xl shadow-lg transform rotate-6 opacity-20">
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <div className="w-6 h-4 bg-white/30 rounded"></div>
                </div>
              </div>
              <div className="absolute top-10 right-10 w-36 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg transform -rotate-3 opacity-15">
                <CreditCard className="absolute top-2 right-2 w-6 h-6 text-white/50" />
              </div>

              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-14 h-14 bg-[#043d6b] rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(4,61,107,0.3)]">
                  <Calculator className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className={`font-bold ${themeClasses.text.primary} text-xl`}>Create Estimate</p>
                  <p className={`text-sm ${themeClasses.text.muted}`}>Send & get paid</p>
                </div>
              </div>

              <div className="flex-1" />

              <p className={`text-lg ${themeClasses.text.secondary} mb-4 relative z-10 leading-snug font-semibold italic`}>
                Create professional estimates and collect payments directly in the app.
              </p>

              <div className="relative z-10">
                <button
                  onClick={() => setShowAddChoice(true)}
                  className="w-full py-3.5 px-4 bg-[#043d6b] hover:bg-[#035291] text-white text-base font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(4,61,107,0.3)]"
                >
                  <Calculator className="w-5 h-5" />
                  Create an Estimate
                </button>
              </div>
            </div>

            {/* Vision Cam Card */}
            <div
              className={`${themeClasses.bg.card} rounded-xl border ${theme === 'light' ? 'border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)]' : 'border-zinc-600 shadow-xl shadow-black/30'} p-5 text-left transition-colors flex-shrink-0 flex flex-col relative overflow-hidden snap-center`}
              style={{ width: 'calc(100vw - 48px)', maxWidth: '380px', minHeight: '240px' }}
            >
              {/* Background camera visuals */}
              <div className="absolute top-2 right-2 opacity-25">
                <Camera className="w-24 h-24 text-[#043d6b] transform rotate-12" />
              </div>
              <div className="absolute top-12 right-12 opacity-30">
                <Camera className="w-20 h-20 text-[#032b4d] transform -rotate-6" />
              </div>

              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-14 h-14 bg-[#043d6b] rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(4,61,107,0.3)]">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className={`font-bold ${themeClasses.text.primary} text-xl`}>Vision Cam</p>
                  <p className={`text-sm ${themeClasses.text.muted}`}>AI-powered visualization</p>
                </div>
              </div>

              <div className="flex-1" />

              <p className={`text-lg ${themeClasses.text.secondary} mb-4 relative z-10 leading-snug font-semibold italic`}>
                Use AI to show your customer their vision for their project.
              </p>

              <div className="mt-auto relative z-10">
                <button
                  onClick={() => setShowVisionCam(true)}
                  className="w-full py-3.5 px-4 bg-[#043d6b] hover:bg-[#035291] text-white text-base font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(4,61,107,0.3)]"
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
            <div className={`w-2 h-2 rounded-full transition-colors ${topCardIndex === 0 ? 'bg-[#043d6b]' : theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'}`}></div>
            <div className={`w-2 h-2 rounded-full transition-colors ${topCardIndex === 1 ? 'bg-[#043d6b]' : theme === 'light' ? 'bg-gray-300' : 'bg-zinc-600'}`}></div>
          </div>

          {/* Discover More Section */}
          <div className="mt-6">
            <h3 className={`text-lg font-bold ${themeClasses.text.primary} mb-3`}>Discover More</h3>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/ad-analyzer')}
                className={`flex-1 bg-gradient-to-br from-[#043d6b] to-[#022a4a] rounded-xl p-4 text-left active:scale-[0.98] transition-all shadow-lg`}
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <p className="text-white font-bold text-base">Website + Marketing</p>
                <p className="text-white/70 text-sm mt-1">Build your online presence</p>
              </button>
              <button
                onClick={() => navigate('/ad-analyzer')}
                className={`flex-1 bg-gradient-to-br from-[#035291] to-[#043d6b] rounded-xl p-4 text-left active:scale-[0.98] transition-all shadow-lg`}
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <p className="text-white font-bold text-base">Ads & Lead Gen</p>
                <p className="text-white/70 text-sm mt-1">Grow your customer base</p>
              </button>
            </div>
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
