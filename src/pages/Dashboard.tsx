import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Activity, Users, DollarSign, TrendingUp, CalendarRange, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import ProjectSummaryCard from '../components/dashboard/ProjectSummaryCard';
import StatCard from '../components/dashboard/StatCard';
import RecentEstimatesTable from '../components/dashboard/RecentEstimatesTable';
import FinanceSummaryChart from '../components/dashboard/FinanceSummaryChart';
import ConnectionTest from '../components/ConnectionTest';
import { useCachedProjects, useCachedEstimates, useCachedEvents } from '../hooks/useCachedData';
import { useFinanceStore } from '../stores/financeStoreSupabase';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Use React Query cached data - instant loading!
  const { projects } = useCachedProjects();
  const { estimates } = useCachedEstimates();
  const { events } = useCachedEvents();
  const { financialSummary } = useFinanceStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Debug: Log when component mounts and data state
  useEffect(() => {
    console.log('📊 Dashboard mounted with cached data');
    console.log('  Projects:', projects.length, '(cached)');
    console.log('  Estimates:', estimates.length, '(cached)');
    console.log('  Events:', events.length, '(cached)');
    console.log('  Financial Summary:', financialSummary);
  }, [projects.length, estimates.length, events.length]);

  // No more fetchProjects/fetchEstimates needed! React Query handles it

  // Debug: Log events when they change
  useEffect(() => {
    console.log('📅 Calendar events loaded:', events.length);
    events.forEach(e => {
      const eventDate = e.start_date ? new Date(e.start_date) : null;
      const isValidDate = eventDate && !isNaN(eventDate.getTime());
      console.log(`  Event: "${e.title}" on ${e.start_date} - Valid: ${isValidDate}`);
    });
  }, [events]);

  // Calculate dashboard statistics
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const pendingEstimates = estimates.filter(e => e.status === 'draft' || e.status === 'sent').length;

  // Get total revenue from finance store (sum of completed payments)
  const totalRevenue = financialSummary.totalRevenue;

  const newClients = new Set(projects.map(p => p.client)).size;

  const handleNewProject = () => {
    navigate('/projects');
  };

  const handleNewEstimate = () => {
    navigate('/estimates');
  };

  const handleViewAllDeadlines = () => {
    navigate('/calendar');
  };

  const handleViewAllEstimates = () => {
    navigate('/estimates');
  };

  const handleViewAllProjects = () => {
    navigate('/projects');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleNewProject}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('common.newProject')}
          </button>
          <button
            onClick={handleNewEstimate}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('common.newEstimate')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.activeProjects')}
          value={activeProjects.toString()}
          change={`+${activeProjects}`}
          positive={true}
          icon={<Activity className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          title={t('dashboard.pendingEstimates')}
          value={pendingEstimates.toString()}
          change={`+${pendingEstimates}`}
          positive={true}
          icon={<FileText className="w-6 h-6 text-amber-500" />}
        />
        <StatCard
          title={t('common.totalRevenue')}
          value={`$${totalRevenue.toLocaleString()}`}
          change="+0%"
          positive={true}
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          title={t('common.totalClients')}
          value={newClients.toString()}
          change={`+${newClients}`}
          positive={true}
          icon={<Users className="w-6 h-6 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.financialOverview')}</h2>
              <select className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>{t('dashboard.last30Days')}</option>
                <option>{t('dashboard.last90Days')}</option>
                <option>{t('dashboard.thisYear')}</option>
              </select>
            </div>
            <FinanceSummaryChart />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.calendar')}</h2>
              <button
                onClick={handleViewAllDeadlines}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {t('common.viewFull')}
              </button>
            </div>

            {/* Mini Calendar */}
            <div className="space-y-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {(() => {
                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const today = new Date();
                  const days = [];

                  // Empty cells for days before month starts
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }

                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const dateStr = date.toISOString().split('T')[0];
                    const isToday = date.toDateString() === today.toDateString();
                    const hasEvent = events.some(e => {
                      if (!e.start_date) return false;
                      try {
                        const eventDate = new Date(e.start_date);
                        if (isNaN(eventDate.getTime())) return false;
                        const eventDateStr = eventDate.toISOString().split('T')[0];
                        return eventDateStr === dateStr;
                      } catch {
                        return false;
                      }
                    });

                    days.push(
                      <div
                        key={day}
                        className={`aspect-square flex items-center justify-center text-xs rounded-md cursor-pointer
                          ${isToday ? 'bg-orange-500 text-white font-semibold' : ''}
                          ${hasEvent && !isToday ? 'bg-blue-100 text-blue-700' : ''}
                          ${!isToday && !hasEvent ? 'hover:bg-gray-100' : ''}
                        `}
                        onClick={() => navigate('/calendar')}
                      >
                        {day}
                      </div>
                    );
                  }

                  return days;
                })()}
              </div>

              {/* Upcoming events */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">{t('common.upcomingEvents')}</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {events
                    .filter(e => {
                      if (!e.start_date) return false;
                      const eventDate = new Date(e.start_date);
                      if (isNaN(eventDate.getTime())) return false;
                      return eventDate >= new Date();
                    })
                    .sort((a, b) => {
                      const dateA = new Date(a.start_date).getTime();
                      const dateB = new Date(b.start_date).getTime();
                      return dateA - dateB;
                    })
                    .slice(0, 3)
                    .map(event => {
                      const eventDate = new Date(event.start_date);
                      return (
                        <div key={event.id} className="text-xs flex items-start space-x-2">
                          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                            event.event_type === 'meeting' ? 'bg-blue-500' :
                            event.event_type === 'deadline' ? 'bg-red-500' :
                            event.event_type === 'task' ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{event.title}</p>
                            <p className="text-gray-500">
                              {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  {events.filter(e => {
                    if (!e.start_date) return false;
                    const eventDate = new Date(e.start_date);
                    return !isNaN(eventDate.getTime()) && eventDate >= new Date();
                  }).length === 0 && (
                    <p className="text-xs text-gray-500">{t('common.noUpcomingEvents')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recentEstimates')}</h2>
            <button
              onClick={handleViewAllEstimates}
              className="text-blue-600 hover:text-blue-800"
            >
              {t('common.viewAll')}
            </button>
          </div>
          <RecentEstimatesTable />
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.projectStatus')}</h2>
            <button
              onClick={handleViewAllProjects}
              className="text-blue-600 hover:text-blue-800"
            >
              {t('common.viewAll')}
            </button>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 3).map((project) => (
              <ProjectSummaryCard key={project.id} project={{
                id: parseInt(project.id) || 0,
                name: project.name,
                client: project.client,
                progress: project.progress,
                status: project.status === 'active' ? 'In Progress' :
                       project.status === 'completed' ? 'Completed' :
                       project.status === 'on_hold' ? 'On Hold' : 'Cancelled'
              }} />
            ))}
            {projects.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {t('dashboard.noProjectsYet')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;