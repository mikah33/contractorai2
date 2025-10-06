import { useState, useMemo, useCallback, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addMonths, subMonths, isToday } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Download, List, Grid, Clock, Check, AlertCircle, PenTool as Tool } from 'lucide-react';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';
import { CalendarEvent } from '../services/calendarService';
import EventModal from '../components/calendar/EventModal';
import { checkUpcomingEvents } from '../utils/notifications';
import { useData } from '../contexts/DataContext';

type ViewType = 'month' | 'week' | 'day';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
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
    fetchEvents();
  }, []);

  // Check for upcoming events and schedule notifications
  useEffect(() => {
    if (events.length > 0 && profile?.calendar_reminders) {
      checkUpcomingEvents(events);
    }
  }, [events, profile]);

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

  const renderMonthView = () => {
    const weeks = [];
    let currentWeek = startOfWeek(currentDate);

    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        const date = addDays(currentWeek, day);
        const dayEvents = getEventsByDate(date);
        const isSelected = selectedDate && isSameDay(date, selectedDate);

        days.push(
          <div
            key={date.toString()}
            className={`min-h-[80px] sm:min-h-[100px] md:min-h-[120px] p-1 sm:p-2 border border-gray-200 cursor-pointer ${
              isToday(date) ? 'bg-blue-50' : ''
            } ${isSelected ? 'ring-2 ring-blue-500' : ''} hover:bg-gray-50 transition-colors`}
            onClick={() => handleDateClick(date)}
          >
            <div className={`font-medium text-xs sm:text-sm ${
              isToday(date) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-900'
            }`}>
              {format(date, 'd')}
            </div>
            <div className="mt-1 space-y-1 overflow-hidden">
              {dayEvents.slice(0, 2).map(event => (
                <div
                  key={event.id}
                  className={`px-1 sm:px-2 py-0.5 sm:py-1 text-xs rounded-md border ${getEventColor(event.event_type)} ${
                    event.auto_generated ? 'border-blue-500' : ''
                  } hover:opacity-75 truncate`}
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

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayEvents = getEventsByDate(date);

      days.push(
        <div key={i} className="flex-1 min-w-0">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-2">
            <div className="font-medium">{format(date, 'EEE')}</div>
            <div className="text-sm text-gray-500">{format(date, 'MMM d')}</div>
          </div>
          <div className="divide-y divide-gray-200">
            {Array.from({ length: 24 }).map((_, hour) => (
              <div key={hour} className="group relative min-h-[48px] hover:bg-gray-50 cursor-pointer">
                <div className="absolute w-full h-full"></div>
                {dayEvents
                  .filter(event => {
                    const eventHour = parseISO(event.start_date).getHours();
                    return eventHour === hour;
                  })
                  .map(event => (
                    <div
                      key={event.id}
                      className={`absolute w-full p-2 rounded-md border ${getEventColor(event.event_type)} ${
                        event.auto_generated ? 'border-blue-500' : ''
                      } hover:opacity-75`}
                      style={{
                        top: `${parseISO(event.start_date).getMinutes()}%`,
                        height: '48px'
                      }}
                    >
                      <div className="flex items-center">
                        {getStatusIcon(event.status)}
                        <span className="ml-1 font-medium text-xs">{event.title}</span>
                      </div>
                      <div className="text-xs opacity-75">
                        {format(parseISO(event.start_date), 'h:mm a')}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex divide-x divide-gray-200 h-[calc(100vh-300px)] overflow-y-auto">
        {days}
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
                    className={`p-3 rounded-lg border ${getEventColor(event.event_type)} ${
                      event.auto_generated ? 'border-blue-500' : ''
                    } hover:opacity-75`}
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Project Calendar</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your project schedules and deadlines
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleExportClick}
            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 w-full sm:w-auto"
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleAddEvent}
            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
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
                  <span className="hidden sm:inline">Month</span>
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
                  <span className="hidden sm:inline">Week</span>
                </button>
                <button
                  onClick={() => handleViewChange('day')}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ${
                    view === 'day'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4 sm:hidden" />
                  <span className="hidden sm:inline">Day</span>
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
        onClose={() => setShowEventModal(false)}
        selectedDate={selectedDate || currentDate}
      />
    </div>
  );
};

export default Calendar;