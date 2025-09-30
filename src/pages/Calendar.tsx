import { useState, useMemo, useCallback, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addMonths, subMonths, isToday } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Filter, Download, List, Grid, Clock, Sparkles, Check, AlertCircle, PenTool as Tool } from 'lucide-react';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';
import { CalendarEvent } from '../services/calendarService';
import EventModal from '../components/calendar/EventModal';
import CalendarDebug from '../components/calendar/CalendarDebug';

type ViewType = 'month' | 'week' | 'day';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const { 
    events, 
    loading, 
    error,
    fetchEvents,
    getEventsByDate, 
    generateAIRecommendations 
  } = useCalendarStoreSupabase();

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, []);

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

  const handleGenerateAISchedule = useCallback(() => {
    console.log('Generating AI schedule for date:', currentDate);
    const newEvents = generateAIRecommendations('deck', currentDate);
    console.log('AI Generated Events:', newEvents);
  }, [currentDate, generateAIRecommendations]);

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
    setSelectedDate(date);
  };

  const handleAIInsightsToggle = () => {
    console.log('AI Insights toggled');
    setShowAIRecommendations(!showAIRecommendations);
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
            className={`min-h-[120px] p-2 border border-gray-200 cursor-pointer ${
              isToday(date) ? 'bg-blue-50' : ''
            } ${isSelected ? 'ring-2 ring-blue-500' : ''} hover:bg-gray-50`}
            onClick={() => handleDateClick(date)}
          >
            <div className="font-medium text-sm text-gray-900">
              {format(date, 'd')}
            </div>
            <div className="mt-1 space-y-1">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className={`px-2 py-1 text-xs rounded-md border ${getEventColor(event.event_type)} ${
                    event.auto_generated ? 'border-blue-500' : ''
                  } hover:opacity-75`}
                >
                  <div className="flex items-center">
                    {getStatusIcon(event.status)}
                    <span className="ml-1 font-medium">{event.title}</span>
                  </div>
                  {event.description && (
                    <div className="text-xs opacity-75">{event.description}</div>
                  )}
                </div>
              ))}
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

  const aiRecommendations = useMemo(() => [
    {
      type: 'optimization',
      message: 'Consider scheduling concrete work for next week when weather conditions will be optimal',
      confidence: 85,
      impact: 'high'
    },
    {
      type: 'warning',
      message: 'Potential resource conflict detected on March 20th',
      confidence: 90,
      impact: 'medium'
    },
    {
      type: 'suggestion',
      message: 'Based on past projects, electrical work typically takes 20% longer than scheduled',
      confidence: 75,
      impact: 'medium'
    },
    {
      type: 'optimization',
      message: 'Grouping similar tasks could reduce mobilization costs by 15%',
      confidence: 80,
      impact: 'high'
    }
  ], []);

  return (
    <div className="space-y-6">
      <CalendarDebug />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Calendar</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your project schedules and deadlines
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleFilterClick}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
          <button
            onClick={handleExportClick}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={handleAddEvent}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleDateChange('prev')}
                className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => handleDateChange('next')}
                className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex border border-gray-300 rounded-md">
                <button
                  onClick={() => handleViewChange('month')}
                  className={`px-4 py-2 text-sm font-medium ${
                    view === 'month'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => handleViewChange('week')}
                  className={`px-4 py-2 text-sm font-medium ${
                    view === 'week'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => handleViewChange('day')}
                  className={`px-4 py-2 text-sm font-medium ${
                    view === 'day'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  Day
                </button>
              </div>
              
              <button
                onClick={handleAIInsightsToggle}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                  showAIRecommendations
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Insights
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px mt-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
      </div>

      {showAIRecommendations && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">AI Schedule Recommendations</h3>
            <button
              onClick={handleGenerateAISchedule}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Schedule
            </button>
          </div>
          <div className="space-y-4">
            {aiRecommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start p-4 border rounded-lg bg-blue-50 border-blue-200"
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">{rec.message}</span>
                  </div>
                  <div className="mt-1 text-sm text-blue-700">
                    <span className="font-medium">Confidence:</span> {rec.confidence}% | 
                    <span className="font-medium ml-2">Impact:</span> {rec.impact}
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 active:text-blue-800">
                  <Check className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <EventModal 
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        selectedDate={selectedDate || currentDate}
      />
    </div>
  );
};

export default Calendar;