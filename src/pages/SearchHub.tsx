import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Users,
  FileText,
  Briefcase,
  Calendar,
  X,
  ChevronRight,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';
import { useClientsStore } from '../stores/clientsStore';
import useEstimateStore from '../stores/estimateStore';
import useProjectStore from '../stores/projectStore';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>(() => {
    // Check if initialCategory was passed via navigation state
    const state = location.state as { initialCategory?: SearchCategory } | null;
    return state?.initialCategory || 'all';
  });

  // Fetch data from all stores for universal search
  const { clients, fetchClients } = useClientsStore();
  const { estimates, fetchEstimates } = useEstimateStore();
  const { projects, fetchProjects } = useProjectStore();
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchClients();
    fetchEstimates();
    fetchProjects();

    // Fetch tasks directly from Supabase
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

  // Filter results based on search query (with fallback to empty arrays)
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

  const categories = [
    { id: 'tasks' as SearchCategory, label: 'Tasks', icon: Calendar, color: 'text-[#043d6b]', bgColor: 'bg-[#043d6b]/20' },
    { id: 'clients' as SearchCategory, label: 'Clients', icon: Users, color: 'text-[#043d6b]', bgColor: 'bg-[#043d6b]/20' },
    { id: 'estimates' as SearchCategory, label: 'Estimates', icon: FileText, color: 'text-[#043d6b]', bgColor: 'bg-[#043d6b]/20' },
    { id: 'projects' as SearchCategory, label: 'Projects', icon: Briefcase, color: 'text-[#043d6b]', bgColor: 'bg-[#043d6b]/20' },
  ];

  // Render the appropriate hub content based on active category
  const renderCategoryContent = () => {
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
        // Universal search - show results from all categories
        if (searchQuery && hasResults) {
          return (
            <div className="space-y-6">
              {/* Clients Results */}
              {filteredClients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-[#043d6b]" />
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
                          <div className="w-10 h-10 bg-[#043d6b]/20 rounded-lg flex items-center justify-center text-[#043d6b] font-bold text-sm">
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
                      <button onClick={() => setActiveCategory('clients')} className="text-[#043d6b] hover:text-[#035291] text-sm font-medium">
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
                    <FileText className="w-5 h-5 text-green-500" />
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
                      <button onClick={() => setActiveCategory('estimates')} className="text-[#043d6b] hover:text-[#035291] text-sm font-medium">
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
                    <Briefcase className="w-5 h-5 text-[#043d6b]" />
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
                      <button onClick={() => setActiveCategory('projects')} className="text-[#043d6b] hover:text-[#035291] text-sm font-medium">
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
                    <Calendar className="w-5 h-5 text-[#043d6b]" />
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
                            <Clock className="w-5 h-5 text-[#043d6b]" />
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
                      <button onClick={() => setActiveCategory('tasks')} className="text-[#043d6b] hover:text-[#035291] text-sm font-medium">
                        View all {filteredTasks.length} tasks →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }

        // No search or no results - show placeholder
        if (searchQuery && !hasResults) {
          return (
            <div className="flex flex-col items-center justify-center py-20">
              <div className={`w-20 h-20 ${theme === 'light' ? 'bg-gray-100' : 'bg-zinc-800'} rounded-full flex items-center justify-center mb-6`}>
                <Search className={`w-10 h-10 ${themeClasses.text.muted}`} />
              </div>
              <h2 className={`text-xl font-bold ${themeClasses.text.primary} mb-2`}>No results found</h2>
              <p className={`text-center ${themeClasses.text.secondary} max-w-xs`}>
                Try a different search term or select a category to browse
              </p>
            </div>
          );
        }

        return (
          <div className="flex flex-col items-center justify-center py-20">
            <div className={`w-20 h-20 ${theme === 'light' ? 'bg-gray-100' : 'bg-zinc-800'} rounded-full flex items-center justify-center mb-6`}>
              <Search className={`w-10 h-10 ${themeClasses.text.muted}`} />
            </div>
            <h2 className={`text-xl font-bold ${themeClasses.text.primary} mb-2`}>Find what you need</h2>
            <p className={`text-center ${themeClasses.text.secondary} max-w-xs`}>
              Search above or select a category to browse clients, estimates, projects, or tasks
            </p>
          </div>
        );
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent border-0 outline-none ${themeClasses.text.primary} placeholder:${themeClasses.text.muted}`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={themeClasses.text.muted}>
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? 'all' : cat.id)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl transition-all border-2 ${
                    activeCategory === cat.id
                      ? `${cat.bgColor} ${cat.color} border-current`
                      : `${theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-zinc-800 border-zinc-700'} ${themeClasses.text.secondary}`
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="pt-[calc(env(safe-area-inset-top)+168px)]" />

      {/* Content - Full hub embedded */}
      <div className={activeCategory === 'all' ? 'px-4' : ''}>
        {renderCategoryContent()}
      </div>
    </div>
  );
};

export default SearchHub;
