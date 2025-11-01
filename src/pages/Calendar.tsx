import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, addDays, isSameDay, parseISO, addMonths, subMonths, isToday, startOfMonth, endOfMonth, endOfWeek } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Download, List, Grid, Clock, Check, AlertCircle, PenTool as Tool } from 'lucide-react';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';
import { CalendarEvent } from '../services/calendarService';
import EventModal from '../components/calendar/EventModal';
import NotificationBanner from '../components/calendar/NotificationBanner';
import { checkUpcomingEvents } from '../utils/notifications';
import { useData } from '../contexts/DataContext';

type ViewType = 'month' | 'week' | 'day';

const Calendar = () => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { profile } = useData();
  const {
    events,
    loading,
    error,
    fetchEvents,
    getEventsByDate
  } = useCalendarStoreSupabase();

  // Fetch events on component mount
  useEffect(() => {
    console.log('Calendar: Fetching events on mount');
    fetchEvents().then(() => {
      console.log('Calendar: Events fetched, count:', events.length);
      console.log('Calendar: Events:', events);
    });
  }, [fetchEvents]);

  // Check for upcoming events and schedule notifications
  useEffect(() => {
    if (events.length > 0 && profile?.calendar_reminders) {
      checkUpcomingEvents(events);
    }
  }, [events, profile]);

  // Update current time every minute for the current time indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to nearest event in week view
  useEffect(() => {
    if (view !== 'week') return;

    const scrollContainer = document.querySelector('.week-scroll-container');
    if (!scrollContainer) return;

    // Find the nearest upcoming event or use current time
    const now = new Date();
    const weekStart = startOfWeek(currentDate);
    const allWeekEvents = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayEvents = getEventsByDate(date);
      allWeekEvents.push(...dayEvents.filter(e => e.start_date));
    }

    // Find the next upcoming event
    const upcomingEvents = allWeekEvents
      .filter(e => {
        const eventTime = parseISO(e.start_date);
        return eventTime >= now;
      })
      .sort((a, b) => {
        const aTime = parseISO(a.start_date);
        const bTime = parseISO(b.start_date);
        return aTime.getTime() - bTime.getTime();
      });

    let scrollToHour = now.getHours();
    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      scrollToHour = parseISO(nextEvent.start_date).getHours();
    }

    // Each hour is 60px tall, scroll to put the target hour near the top
    const scrollPosition = Math.max(0, (scrollToHour - 2) * 60);

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      scrollContainer.scrollTop = scrollPosition;
    }, 100);
  }, [view, events, currentDate]);

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'task':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'milestone':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'meeting':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delivery':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'inspection':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'in_progress':
        return <Tool className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'delayed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleAddEvent = () => {
    console.log('Add Event button clicked');
    setShowEventModal(true);
  };

  const handleFilterClick = () => {
    console.log('Filter button clicked');
    // Add filter logic here
  };

  const handleExportClick = () => {
    console.log('Export button clicked');
    // Add export logic here
  };

  const handleViewChange = (newView: ViewType) => {
    console.log('View changed to:', newView);
    setView(newView);
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    console.log('Date navigation:', direction);
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    setSelectedDate(date);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent date click from triggering
    console.log('🔵 Event clicked:', event);
    console.log('🔵 Event start_date:', event.start_date);
    console.log('🔵 Event end_date:', event.end_date);
    console.log('🔵 Event type:', typeof event.start_date);
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  const renderMonthView = () => {
    const weeks = [];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    let currentWeek = calendarStart;

    while (currentWeek <= calendarEnd) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        const date = addDays(currentWeek, day);
        const dayEvents = getEventsByDate(date);
        const isSelected = selectedDate && isSameDay(date, selectedDate);
        const isCurrentMonth = date >= monthStart && date <= monthEnd;

        days.push(
          <div
            key={date.toString()}
            className={`min-h-[80px] sm:min-h-[100px] md:min-h-[120px] p-1 sm:p-2 border border-gray-200 cursor-pointer ${
              isToday(date) ? 'bg-blue-50' : ''
            } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${
              !isCurrentMonth ? 'bg-gray-50' : ''
            } hover:bg-gray-50 transition-colors`}
            onClick={() => handleDateClick(date)}
          >
            <div className={`font-medium text-xs sm:text-sm ${
              isToday(date) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' :
              isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {format(date, 'd')}
            </div>
            <div className="mt-1 space-y-1 overflow-hidden">
              {dayEvents.slice(0, 2).map(event => (
                <div
                  key={event.id}
                  onClick={(e) => handleEventClick(event, e)}
                  className={`px-1 sm:px-2 py-0.5 sm:py-1 text-xs rounded-md border ${getEventColor(event.event_type)} ${
                    event.auto_generated ? 'border-blue-500' : ''
                  } hover:opacity-75 hover:shadow-md cursor-pointer truncate transition-all`}
                >
                  <div className="flex items-center">
                    <span className="hidden sm:inline">{getStatusIcon(event.status)}</span>
                    <span className="ml-0 sm:ml-1 font-medium truncate">{event.title}</span>
                  </div>
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-gray-500 px-1 sm:px-2">
                  +{dayEvents.length - 2} more
                </div>
              )}
            </div>
          </div>
        );
      }
      weeks.push(
        <div key={currentWeek.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      currentWeek = addDays(currentWeek, 7);
    }

    return <div className="space-y-1">{weeks}</div>;
  };

  const renderWeekView = () => {
    const days = [];
    const weekStart = startOfWeek(currentDate);
    const now = currentTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayEvents = getEventsByDate(date);
      const isToday = isSameDay(date, now);

      days.push(
        <div key={i} className="flex-1 min-w-[120px] relative">
          {/* Improved Day Header */}
          <div className={`sticky top-0 z-20 bg-gradient-to-b ${isToday ? 'from-blue-50 to-white' : 'from-gray-50 to-white'} border-b-2 ${isToday ? 'border-blue-400' : 'border-gray-200'} p-3 text-center shadow-md`}>
            <div className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
              {format(date, 'EEE')}
            </div>
            <div className={`mt-1 ${isToday ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto font-bold' : 'text-2xl font-bold text-gray-900'}`}>
              {format(date, 'd')}
            </div>
            {isToday && (
              <div className="text-xs text-blue-600 font-medium mt-1">Today</div>
            )}
          </div>

          {/* Hour Grid */}
          <div className="divide-y divide-gray-100 relative">
            {Array.from({ length: 24 }).map((_, hour) => {
              const isCurrentHour = isToday && hour === currentHour;
              const isBusinessHour = hour >= 8 && hour < 18;

              return (
                <div key={hour} className={`group relative min-h-[60px] hover:bg-blue-50/30 cursor-pointer transition-colors ${isCurrentHour ? 'bg-blue-50/50' : isBusinessHour ? 'bg-white' : 'bg-gray-50/50'}`}>
                  {/* Time Label - Only show on first column */}
                  {i === 0 && (
                    <div className="absolute -left-16 top-0 w-14 text-xs font-medium text-gray-500 text-right pr-2 pt-1">
                      {format(new Date().setHours(hour, 0), 'h a')}
                    </div>
                  )}

                  <div className="flex-1 relative p-1">
                    {/* Hour Grid Lines */}
                    <div className="absolute inset-x-0 top-0 border-t border-gray-200"></div>
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-100"></div>

                    {/* Events */}
                    {dayEvents
                      .filter(event => {
                        if (!event.start_date) return false;
                        const eventHour = parseISO(event.start_date).getHours();
                        return eventHour === hour;
                      })
                      .map(event => {
                        if (!event.start_date || !event.end_date) return null;
                        const startTime = parseISO(event.start_date);
                        const endTime = parseISO(event.end_date);
                        const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
                        const heightPx = Math.max(40, (durationMinutes / 60) * 60);

                        return (
                          <div
                            key={event.id}
                            onClick={(e) => handleEventClick(event, e)}
                            className={`absolute left-1 right-1 p-2 rounded-lg border-l-4 shadow-sm ${getEventColor(event.event_type)} hover:shadow-lg hover:scale-[1.02] cursor-pointer transition-all duration-200`}
                            style={{
                              top: `${(startTime.getMinutes() / 60) * 100}%`,
                              height: `${heightPx}px`,
                              zIndex: 5
                            }}
                          >
                            <div className="flex items-start gap-1">
                              <div className="flex-shrink-0">
                                {getStatusIcon(event.status)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{event.title}</div>
                                <div className="text-xs opacity-75 mt-0.5">
                                  {format(startTime, 'h:mm a')}
                                </div>
                                {event.location && (
                                  <div className="text-xs opacity-75 truncate mt-0.5">
                                    📍 {event.location}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {/* Current Time Indicator */}
                    {isCurrentHour && (
                      <div
                        className="absolute left-0 right-0 z-20"
                        style={{
                          top: `${(currentMinute / 60) * 100}%`
                        }}
                      >
                        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                        <div className="absolute left-0 right-0 border-t-2 border-red-500 shadow-sm"></div>
                        <div className="absolute left-2 -top-4 text-xs font-bold text-red-600 bg-white px-2 py-0.5 rounded-full shadow-sm">
                          {format(now, 'h:mm a')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Time labels column */}
        <div className="absolute left-0 w-16 h-full pointer-events-none z-10"></div>

        {/* Week grid */}
        <div className="week-scroll-container flex border-l border-gray-200 ml-16 h-[calc(100vh-300px)] overflow-y-auto overflow-x-hidden shadow-inner bg-gray-50/30 scroll-smooth">
          {days}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsByDate(currentDate);

    return (
      <div className="space-y-4">
        <div className="text-xl font-semibold text-gray-900">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="group relative min-h-[64px] border-l-2 border-gray-200 pl-4 hover:bg-gray-50 cursor-pointer">
              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gray-200 group-hover:bg-gray-300">
                <div className="absolute -left-16 top-0 text-sm text-gray-500">
                  {format(new Date().setHours(hour, 0), 'h:mm a')}
                </div>
              </div>
              {dayEvents
                .filter(event => parseISO(event.start_date).getHours() === hour)
                .map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => handleEventClick(event, e)}
                    className={`p-3 rounded-lg border ${getEventColor(event.event_type)} ${
                      event.auto_generated ? 'border-blue-500' : ''
                    } hover:opacity-75 hover:shadow-md cursor-pointer transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{event.title}</div>
                      {getStatusIcon(event.status)}
                    </div>
                    <div className="mt-1 text-sm">
                      {event.description && (
                        <div className="text-sm text-gray-600">
                          {event.description}
                        </div>
                      )}
                      <div className="text-sm opacity-75 mt-1">
                        {format(parseISO(event.start_date), 'h:mm a')} -
                        {format(parseISO(event.end_date), 'h:mm a')}
                      </div>
                      {event.location && (
                        <div className="mt-1 text-sm text-gray-600">
                          📍 {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('calendar.subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleAddEvent}
            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('calendar.addEvent')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center justify-between sm:justify-start space-x-2 sm:space-x-4">
              <button
                onClick={() => handleDateChange('prev')}
                className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => handleDateChange('next')}
                className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => handleViewChange('month')}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ${
                    view === 'month'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <Grid className="w-4 h-4 sm:hidden" />
                  <span className="hidden sm:inline">{t('calendar.month')}</span>
                </button>
                <button
                  onClick={() => handleViewChange('week')}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ${
                    view === 'week'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <List className="w-4 h-4 sm:hidden" />
                  <span className="hidden sm:inline">{t('calendar.week')}</span>
                </button>
              </div>

            </div>
          </div>

          {view === 'month' && (
            <div className="grid grid-cols-7 gap-px mt-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.substring(0, 1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-2 sm:p-4 md:p-6">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
      </div>

      <EventModal
        isOpen={showEventModal}
        onClose={handleCloseModal}
        selectedDate={selectedDate || currentDate}
        event={selectedEvent}
      />

      <NotificationBanner />
    </div>
  );
};

export default Calendar;