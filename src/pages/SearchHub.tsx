import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  FileText,
  Briefcase,
  Calendar,
  X,
  ChevronRight,
  Clock,
  CheckCircle,
  Plus,
  UserPlus,
  DollarSign,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';
import { useClientsStore } from '../stores/clientsStore';
import useEstimateStore from '../stores/estimateStore';
import useProjectStore from '../stores/projectStore';
import { useCalendarStoreSupabase } from '../stores/calendarStoreSupabase';
import { supabase } from '../lib/supabase';

// Import hub components
import ClientsHub from './ClientsHub';
import EstimatesHub from './EstimatesHub';
import ProjectsHub from './ProjectsHub';
import TodoHub from './TodoHub';

type SearchCategory = 'all' | 'clients' | 'estimates' | 'projects' | 'tasks';

const SearchHub: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>(() => {
    const state = location.state as { initialCategory?: SearchCategory } | null;
    return state?.initialCategory || 'all';
  });

  // Fetch data from all stores
  const { clients, fetchClients } = useClientsStore();
  const { estimates, fetchEstimates } = useEstimateStore();
  const { projects, fetchProjects } = useProjectStore();
  const { events, fetchEvents } = useCalendarStoreSupabase();
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchClients();
    fetchEstimates();
    fetchProjects();
    fetchEvents();

    const fetchTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });
          setTasks(data || []);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };
    fetchTasks();
  }, []);

  // Filter results based on search query
  const filteredClients = (clients || []).filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEstimates = (estimates || []).filter(e =>
    e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = (projects || []).filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTasks = (tasks || []).filter(t =>
    t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasResults = searchQuery && (
    filteredClients.length > 0 ||
    filteredEstimates.length > 0 ||
    filteredProjects.length > 0 ||
    filteredTasks.length > 0
  );

  // Dashboard stats
  const getClientStats = () => {
    const total = (clients || []).length;
    const recent = (clients || []).filter(c => {
      const createdAt = new Date(c.created_at || c.createdAt);
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return createdAt > lastWeek;
    }).length;
    return { total, recent };
  };

  const getEstimateStats = () => {
    const pending = (estimates || []).filter(e => e.status === 'pending' || e.status === 'draft').length;
    const approved = (estimates || []).filter(e => e.status === 'approved' || e.status === 'sent').length;
    const totalValue = (estimates || []).reduce((sum, e) => sum + (e.total || 0), 0);
    return { pending, approved, totalValue };
  };

  const getTaskStats = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcoming = (events || []).filter(event => {
      const eventDate = new Date(event.start_date);
      return (event.status === 'pending' || event.status === 'in_progress') && eventDate >= todayStart;
    }).length;
    const overdue = (events || []).filter(event => {
      const eventDate = new Date(event.start_date);
      return (event.status === 'pending' || event.status === 'in_progress') && eventDate < todayStart;
    }).length;
    const completed = (events || []).filter(event => event.status === 'completed').length;
    return { upcoming, overdue, completed };
  };

  const getProjectStats = () => {
    const active = (projects || []).filter(p => p.status === 'active' || p.status === 'in_progress').length;
    const completed = (projects || []).filter(p => p.status === 'completed').length;
    const avgProgress = (projects || []).length > 0
      ? Math.round((projects || []).reduce((sum, p) => sum + (p.progress || 0), 0) / (projects || []).length)
      : 0;
    return { active, completed, avgProgress };
  };

  // Hub cards data
  const hubCards = [
    {
      id: 'clients' as SearchCategory,
      title: 'Clients',
      icon: Users,
      href: '/clients-hub',
      cta: 'Add Client',
      ctaIcon: UserPlus,
      ctaState: { openCreate: true },
    },
    {
      id: 'estimates' as SearchCategory,
      title: 'Estimates',
      icon: FileText,
      href: '/estimates-hub',
      cta: 'New Estimate',
      ctaIcon: Plus,
      ctaState: { openCreate: true },
    },
    {
      id: 'tasks' as SearchCategory,
      title: 'Tasks',
      icon: Calendar,
      href: '/todo-hub',
      cta: 'Add Task',
      ctaIcon: Plus,
      ctaState: { openCreateTask: true },
    },
    {
      id: 'projects' as SearchCategory,
      title: 'Projects',
      icon: Briefcase,
      href: '/projects-hub',
      cta: 'New Project',
      ctaIcon: Plus,
      ctaState: { openNewProject: true },
    },
  ];

  const renderCardStats = (cardId: string) => {
    switch (cardId) {
      case 'clients': {
        const stats = getClientStats();
        return (
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <Users className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">{stats.total} Total</span>
            </div>
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <UserPlus className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">{stats.recent} This Week</span>
            </div>
          </div>
        );
      }
      case 'estimates': {
        const stats = getEstimateStats();
        return (
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">{stats.pending} Pending</span>
            </div>
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">{stats.approved} Approved</span>
            </div>
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">${stats.totalValue.toLocaleString()}</span>
            </div>
          </div>
        );
      }
      case 'tasks': {
        const stats = getTaskStats();
        return (
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">{stats.upcoming} Upcoming</span>
            </div>
            {stats.overdue > 0 && (
              <div className="flex items-center gap-1.5 bg-red-100 px-2.5 py-1 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-medium text-red-700">{stats.overdue} Overdue</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">{stats.completed} Done</span>
            </div>
          </div>
        );
      }
      case 'projects': {
        const stats = getProjectStats();
        return (
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <Briefcase className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">{stats.active} Active</span>
            </div>
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">{stats.completed} Done</span>
            </div>
            <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-theme" />
              <span className="text-xs font-medium text-theme">{stats.avgProgress}% Avg</span>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Render dashboard cards (default view)
  const renderDashboardCards = () => (
    <div className="space-y-3">
      {hubCards.map((card) => (
        <div
          key={card.id}
          className={`${themeClasses.bg.card} rounded-xl border ${themeClasses.border.primary} overflow-hidden active:scale-[0.99] transition-transform`}
        >
          <button
            onClick={() => navigate(card.href)}
            className="w-full p-4 pb-2 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-theme/15 rounded-xl flex items-center justify-center">
                  <card.icon className="w-5 h-5 text-theme" />
                </div>
                <h3 className={`font-bold text-lg ${themeClasses.text.primary}`}>{card.title}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-theme" />
            </div>
            {renderCardStats(card.id)}
          </button>
          <div className="px-4 pb-4 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(card.href, { state: card.ctaState });
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-theme text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              <card.ctaIcon className="w-4 h-4" />
              {card.cta}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // Render search results
  const renderSearchResults = () => {
    if (!searchQuery) return renderDashboardCards();

    if (!hasResults) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className={`w-20 h-20 ${theme === 'light' ? 'bg-gray-100' : 'bg-zinc-800'} rounded-full flex items-center justify-center mb-6`}>
            <Search className={`w-10 h-10 ${themeClasses.text.muted}`} />
          </div>
          <h2 className={`text-xl font-bold ${themeClasses.text.primary} mb-2`}>No results found</h2>
          <p className={`text-center ${themeClasses.text.secondary} max-w-xs`}>
            Try a different search term
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Clients Results */}
        {filteredClients.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-theme" />
              <h3 className={`font-semibold ${themeClasses.text.primary}`}>Clients ({filteredClients.length})</h3>
            </div>
            <div className="space-y-2">
              {filteredClients.slice(0, 3).map((client) => (
                <button
                  key={client.id}
                  onClick={() => setActiveCategory('clients')}
                  className={`w-full ${themeClasses.bg.card} rounded-xl border ${themeClasses.border.primary} p-4 flex items-center justify-between active:scale-[0.99] transition-transform`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-theme/20 rounded-lg flex items-center justify-center text-theme font-bold text-sm">
                      {client.name?.slice(0, 2).toUpperCase() || 'NA'}
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${themeClasses.text.primary}`}>{client.name}</p>
                      {client.company && <p className={`text-sm ${themeClasses.text.secondary}`}>{client.company}</p>}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted}`} />
                </button>
              ))}
              {filteredClients.length > 3 && (
                <button onClick={() => setActiveCategory('clients')} className="text-theme hover:text-[#035291] text-sm font-medium">
                  View all {filteredClients.length} clients →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Estimates Results */}
        {filteredEstimates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-theme" />
              <h3 className={`font-semibold ${themeClasses.text.primary}`}>Estimates ({filteredEstimates.length})</h3>
            </div>
            <div className="space-y-2">
              {filteredEstimates.slice(0, 3).map((estimate) => (
                <button
                  key={estimate.id}
                  onClick={() => setActiveCategory('estimates')}
                  className={`w-full ${themeClasses.bg.card} rounded-xl border ${themeClasses.border.primary} p-4 flex items-center justify-between active:scale-[0.99] transition-transform`}
                >
                  <div className="text-left">
                    <p className={`font-medium ${themeClasses.text.primary}`}>{estimate.title || 'Untitled'}</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>{estimate.client_name} • ${estimate.total?.toLocaleString()}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted}`} />
                </button>
              ))}
              {filteredEstimates.length > 3 && (
                <button onClick={() => setActiveCategory('estimates')} className="text-theme hover:text-[#035291] text-sm font-medium">
                  View all {filteredEstimates.length} estimates →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Projects Results */}
        {filteredProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-5 h-5 text-theme" />
              <h3 className={`font-semibold ${themeClasses.text.primary}`}>Projects ({filteredProjects.length})</h3>
            </div>
            <div className="space-y-2">
              {filteredProjects.slice(0, 3).map((project) => (
                <button
                  key={project.id}
                  onClick={() => setActiveCategory('projects')}
                  className={`w-full ${themeClasses.bg.card} rounded-xl border ${themeClasses.border.primary} p-4 flex items-center justify-between active:scale-[0.99] transition-transform`}
                >
                  <div className="text-left">
                    <p className={`font-medium ${themeClasses.text.primary}`}>{project.name}</p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>{project.client_name} • {project.status}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted}`} />
                </button>
              ))}
              {filteredProjects.length > 3 && (
                <button onClick={() => setActiveCategory('projects')} className="text-theme hover:text-[#035291] text-sm font-medium">
                  View all {filteredProjects.length} projects →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tasks Results */}
        {filteredTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-theme" />
              <h3 className={`font-semibold ${themeClasses.text.primary}`}>Tasks ({filteredTasks.length})</h3>
            </div>
            <div className="space-y-2">
              {filteredTasks.slice(0, 3).map((task) => (
                <button
                  key={task.id}
                  onClick={() => setActiveCategory('tasks')}
                  className={`w-full ${themeClasses.bg.card} rounded-xl border ${themeClasses.border.primary} p-4 flex items-center justify-between active:scale-[0.99] transition-transform`}
                >
                  <div className="flex items-center gap-3">
                    {task.status === 'done' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-theme" />
                    )}
                    <div className="text-left">
                      <p className={`font-medium ${themeClasses.text.primary}`}>{task.title}</p>
                      {task.due_date && <p className={`text-sm ${themeClasses.text.secondary}`}>Due: {new Date(task.due_date).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted}`} />
                </button>
              ))}
              {filteredTasks.length > 3 && (
                <button onClick={() => setActiveCategory('tasks')} className="text-theme hover:text-[#035291] text-sm font-medium">
                  View all {filteredTasks.length} tasks →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render the appropriate content based on active category
  const renderContent = () => {
    switch (activeCategory) {
      case 'clients':
        return <ClientsHub embedded searchQuery={searchQuery} />;
      case 'estimates':
        return <EstimatesHub embedded searchQuery={searchQuery} />;
      case 'projects':
        return <ProjectsHub embedded searchQuery={searchQuery} />;
      case 'tasks':
        return <TodoHub embedded searchQuery={searchQuery} />;
      default:
        return renderSearchResults();
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg.primary} pb-40`}>
      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="px-4 pb-4 pt-4">
            <h1 className={`text-2xl font-bold ${themeClasses.text.primary} mb-4`}>Job Hub</h1>

            {/* Search Input */}
            <div className={`flex items-center gap-3 px-4 py-3 ${themeClasses.bg.card} rounded-xl border ${themeClasses.border.secondary}`}>
              <Search className={`w-5 h-5 ${themeClasses.text.muted}`} />
              <input
                type="text"
                placeholder="Search jobs, clients, estimates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeCategory !== 'all') setActiveCategory('all');
                }}
                className={`flex-1 bg-transparent border-0 outline-none ${themeClasses.text.primary} placeholder:${themeClasses.text.muted}`}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); }} className={themeClasses.text.muted}>
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="pt-[calc(env(safe-area-inset-top)+120px)]" />

      {/* Content */}
      <div className={activeCategory === 'all' ? 'px-4' : ''}>
        {renderContent()}
      </div>
    </div>
  );
};

export default SearchHub;
