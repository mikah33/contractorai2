import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, MoreVertical, Calendar, Users, CheckCircle, Clock, AlertCircle,
  MessageSquare, Upload, Camera, FileText, ChevronDown, ChevronUp, Trash2, Edit,
  Paperclip, Send, User, Sparkles, BarChart2, ArrowRight, Tag, Flag, Zap, DollarSign, X,
  Phone, Mail, Briefcase, StickyNote, UserPlus, ArrowLeft, Settings
} from 'lucide-react';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';
import TaskList from '../components/projects/TaskList';
import TeamMemberSelector from '../components/projects/TeamMemberSelector';
import ProjectProgressGallery from '../components/projects/ProjectProgressGallery';
import ProjectComments from '../components/projects/ProjectComments';
import useProjectStore from '../stores/projectStore';
import { useClientsStore } from '../stores/clientsStore';
import { estimateService } from '../services/estimateService';
import { supabase } from '../lib/supabase';
import AddClientModal from '../components/clients/AddClientModal';
import EditProjectModal from '../components/projects/EditProjectModal';

interface Project {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  progress: number;
  team: string[];
  description: string;
  tasks: Task[];
  comments: Comment[];
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed';
  assignee: string | string[]; // Support both single and multiple assignees
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  attachments?: string[];
}


const ProjectManager: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const location = useLocation();
  const {
    projects,
    progressUpdates,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
    addComment,
    addTask,
    updateTask,
    deleteTask,
    deleteComment,
    addTeamMember,
    removeTeamMember,
    fetchProgressUpdates,
    addProgressUpdate,
    deleteProgressUpdate
  } = useProjectStore();
  const { clients, fetchClients } = useClientsStore();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTaskId, setUploadTaskId] = useState('');
  const [uploadImages, setUploadImages] = useState<File[]>([]);
  const [uploadPreviewUrls, setUploadPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newComment, setNewComment] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    assignee: [] as string[],
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'todo' as 'todo' | 'in-progress' | 'completed'
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'team' | 'progress' | 'comments' | 'estimates'>('overview');
  const [projectEstimates, setProjectEstimates] = useState<any[]>([]);
  const [fullTeamMembers, setFullTeamMembers] = useState<any[]>([]);
  
  // Form state for new project
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    clientId: '',
    status: 'active' as const,
    priority: 'medium' as const,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    budget: 0,
    description: ''
  });

  // Fetch projects and clients on mount (cached if already loaded)
  useEffect(() => {
    fetchProjects(); // Will use cache if already loaded
    fetchClients();
  }, []); // Empty deps - only run once on mount

  // Handle navigation state to select a specific project
  useEffect(() => {
    const state = location.state as { selectedProjectId?: string } | null;
    if (state?.selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === state.selectedProjectId);
      if (project) {
        setSelectedProject(project as Project);
      }
      // Clear the navigation state so refreshing doesn't re-select
      window.history.replaceState({}, document.title);
    }
  }, [location.state, projects]);

  // Fetch estimates when estimates tab is selected
  useEffect(() => {
    const fetchProjectEstimates = async () => {
      if (activeTab === 'estimates' && selectedProject) {
        try {
          const result = await estimateService.getEstimates();
          if (result.success && result.data) {
            // Filter estimates for current project
            const filtered = result.data.filter((est: any) => est.projectId === selectedProject.id);
            setProjectEstimates(filtered);
          }
        } catch (error) {
          console.error('Error fetching project estimates:', error);
          setProjectEstimates([]);
        }
      }
    };

    fetchProjectEstimates();
  }, [activeTab, selectedProject]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      // Legacy status mapping for existing data
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleAddComment = async () => {
    if (!selectedProject || !newComment.trim()) return;
    
    console.log('Adding comment:', { projectId: selectedProject.id, comment: newComment });
    try {
      await addComment(selectedProject.id, {
        author: 'Current User',
        content: newComment
      }, undefined);
      console.log('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
    }

    // Update selected project with new comment
    const updatedProject = projects.find(p => p.id === selectedProject.id);
    if (updatedProject) {
      setSelectedProject(updatedProject);
    }

    setNewComment('');
  };
  
  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.budget) {
      alert('Please enter project name and budget');
      return;
    }

    try {
      console.log('🚀 Creating project with data:', {
        name: newProject.name,
        client: newProject.client || 'Direct Client',
        clientId: newProject.clientId || undefined,
        status: newProject.status,
        priority: newProject.priority,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        budget: newProject.budget,
        description: newProject.description
      });

      await addProject({
        name: newProject.name,
        client: newProject.client || 'Direct Client',
        clientId: newProject.clientId || undefined,
        status: newProject.status,
        priority: newProject.priority,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        budget: newProject.budget,
        description: newProject.description
      });
      
      // Reset form and close modal
      setNewProject({
        name: '',
        client: '',
        clientId: '',
        status: 'active',
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        budget: 0,
        description: ''
      });
      setShowProjectModal(false);
      await fetchProjects(); // Refresh project list
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  // Fetch full team member details from database
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (selectedProject?.id) {
        try {
          console.log('🔵 Fetching team members for project:', selectedProject.id);
          const { data, error } = await supabase
            .from('project_team_members')
            .select('*')
            .eq('project_id', selectedProject.id);

          if (error) {
            console.error('❌ Error fetching team members:', error);
            setFullTeamMembers([]);
          } else {
            console.log('✅ Fetched team members:', data);
            setFullTeamMembers(data || []);
          }
        } catch (error) {
          console.error('❌ Error fetching team members:', error);
          setFullTeamMembers([]);
        }
      } else {
        setFullTeamMembers([]);
      }
    };

    fetchTeamMembers();
  }, [selectedProject?.id, activeTab]); // Added activeTab to refetch when switching to team tab

  // Get team members with full data from database
  const teamMembers = fullTeamMembers.map(tm => ({
    id: tm.id,
    name: tm.member_name,
    role: tm.member_role || '',
    email: tm.member_email || '',
    phone: tm.member_phone || '',
    permissions: tm.permissions || []
  }));

  console.log('👥 Team members for display:', teamMembers);

  // Load progress updates when project changes
  useEffect(() => {
    if (selectedProject?.id) {
      fetchProgressUpdates(selectedProject.id);
    }
  }, [selectedProject?.id]);

  // Sync selectedProject with updated projects from store
  useEffect(() => {
    if (selectedProject && projects.length > 0) {
      const updatedProject = projects.find(p => p.id === selectedProject.id);
      if (updatedProject && JSON.stringify(updatedProject) !== JSON.stringify(selectedProject)) {
        setSelectedProject(updatedProject);
      }
    }
  }, [projects]);

  // Handle modal closing
  const handleCloseModals = () => {
    setShowProjectModal(false);
    setShowTaskModal(false);
    setShowUploadModal(false);
  };

  return (
    <div className={`min-h-full ${themeClasses.bg.primary} pb-24`}>
      {/* Header */}
      <div className={`${themeClasses.bg.secondary} border-b ${themeClasses.border.primary} px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sticky top-0 z-10`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${themeClasses.text.primary}`}>{t('projects.title')}</h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>{t('projects.subtitle')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center hover:bg-blue-500/30 transition-colors border border-blue-500/40"
            >
              <Settings className="w-5 h-5 text-blue-500" />
            </button>
            <button
              onClick={() => setShowProjectModal(true)}
              className={`flex items-center gap-2 px-4 py-2.5 ${themeClasses.button.primary} rounded-md font-medium ${themeClasses.button.primaryHover} active:scale-95 transition-all`}
            >
              <Plus className="w-5 h-5" />
              <span>{t('projects.newProject')}</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mt-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('projects.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{t('projects.allStatus')}</option>
            <option value="active">{t('projects.active')}</option>
            <option value="on_hold">{t('projects.onHold')}</option>
            <option value="cancelled">{t('projects.cancelled')}</option>
            <option value="completed">{t('projects.completed')}</option>
          </select>

        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className={`flex-1 p-6 ${selectedProject ? 'mr-96' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                      <p className="text-sm text-gray-600">{project.client}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Flag className={`w-4 h-4 ${getPriorityColor(project.priority)}`} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                        }}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit project"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{t('projects.progress')}</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(project.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>${project.spent.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Users className="w-4 h-4 text-gray-400" />
                    <div className="flex -space-x-2">
                      {(project.team || []).slice(0, 3).map((member, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white border-2 border-white"
                        >
                          {member.split(' ').map(n => n[0]).join('')}
                        </div>
                      ))}
                      {(project.team || []).length > 3 && (
                        <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs text-white border-2 border-white">
                          +{(project.team || []).length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Project Details Modal - Slide Up */}
        {selectedProject && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 transition-opacity"
              onClick={() => setSelectedProject(null)}
            />

            {/* Slide-up Modal */}
            <div className="absolute inset-x-0 bottom-0 top-12 bg-gray-50 rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
              {/* Header */}
              <div className="bg-white px-4 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="flex items-center gap-2 text-gray-600 active:text-gray-900"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete "${selectedProject.name}"? This cannot be undone.`)) {
                        try {
                          await deleteProject(selectedProject.id);
                          setSelectedProject(null);
                        } catch (error) {
                          console.error('Error deleting project:', error);
                          alert('Failed to delete project.');
                        }
                      }
                    }}
                    className="p-2 text-red-400 active:text-red-600 active:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Project Title */}
                <div className="mt-3">
                  <h1 className="text-xl font-bold text-gray-900">{selectedProject.name}</h1>
                  <p className="text-sm text-gray-500">{selectedProject.client}</p>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">

                {/* Status & Progress Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedProject.status)}`}>
                      {selectedProject.status.replace('-', ' ').replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{selectedProject.progress}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all"
                      style={{ width: `${selectedProject.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                      {selectedProject.endDate && ` - ${new Date(selectedProject.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </div>
                  </div>
                </div>

                {/* Budget Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <label className="block text-xs text-gray-500 mb-3">Budget</label>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Spent</p>
                      <p className="text-lg font-bold text-gray-900">${selectedProject.spent.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="text-lg font-bold text-green-600">${selectedProject.budget.toLocaleString()}</p>
                    </div>
                  </div>
                  {selectedProject.budget > 0 && (
                    <div className="mt-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (selectedProject.spent / selectedProject.budget) > 0.9 ? 'bg-red-500' :
                            (selectedProject.spent / selectedProject.budget) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((selectedProject.spent / selectedProject.budget) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Team Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-gray-500">Team</label>
                    <button
                      onClick={() => {
                        // Open team member selector
                        setEditingProject(selectedProject);
                      }}
                      className="text-xs text-purple-600 font-medium"
                    >
                      Manage
                    </button>
                  </div>
                  {(selectedProject.team || []).length === 0 ? (
                    <p className="text-sm text-gray-400">No team members assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(selectedProject.team || []).map((member, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5">
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                            {member.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-sm text-gray-700">{member}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasks Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-gray-500">Tasks</label>
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="text-xs text-purple-600 font-medium"
                    >
                      Add Task
                    </button>
                  </div>
                  {(selectedProject.tasks || []).length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No tasks yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedProject.tasks || []).slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            task.status === 'completed' ? 'bg-green-500' :
                            task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-300'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {task.title}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(selectedProject.tasks || []).length > 5 && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          +{(selectedProject.tasks || []).length - 5} more tasks
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Comments Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <label className="block text-xs text-gray-500 mb-3">Comments</label>

                  {(selectedProject.comments || []).length === 0 ? (
                    <p className="text-sm text-gray-400 mb-3">No comments yet</p>
                  ) : (
                    <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                      {(selectedProject.comments || []).slice(-3).map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                            {comment.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="bg-gray-50 rounded-xl px-3 py-2">
                              <p className="text-sm text-gray-900">{comment.content}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{comment.author} • {new Date(comment.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-base border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <button
                      onClick={handleAddComment}
                      className="px-4 py-2.5 bg-purple-600 text-white rounded-xl active:bg-purple-700"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Estimates Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-gray-500">Estimates</label>
                    <button
                      onClick={() => window.location.href = `/estimates?project_id=${selectedProject.id}`}
                      className="text-xs text-purple-600 font-medium"
                    >
                      Create New
                    </button>
                  </div>
                  {projectEstimates.length === 0 ? (
                    <div className="text-center py-6">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No estimates yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectEstimates.slice(0, 3).map((estimate) => (
                        <button
                          key={estimate.id}
                          onClick={() => window.location.href = `/estimates?id=${estimate.id}`}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl active:bg-gray-100 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{estimate.title}</p>
                            <p className="text-xs text-gray-500">{new Date(estimate.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="text-sm font-bold text-green-600">${estimate.total?.toFixed(2) || '0.00'}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              estimate.status === 'approved' ? 'bg-green-100 text-green-700' :
                              estimate.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {estimate.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Progress Photos Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-gray-500">Progress Photos</label>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="text-xs text-purple-600 font-medium"
                    >
                      Upload
                    </button>
                  </div>
                  {progressUpdates.length === 0 ? (
                    <div className="text-center py-6">
                      <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No progress photos</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {progressUpdates.slice(0, 6).map((update) => (
                        update.photos?.slice(0, 1).map((photo, idx) => (
                          <img
                            key={`${update.id}-${idx}`}
                            src={photo}
                            alt="Progress"
                            className="w-full aspect-square object-cover rounded-xl"
                            onClick={() => window.open(photo, '_blank')}
                          />
                        ))
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
              <button 
                onClick={() => setShowProjectModal(false)}
                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input 
                  type="text" 
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <div className="flex gap-2">
                  <select
                    value={newProject.clientId}
                    onChange={(e) => {
                      const clientId = e.target.value;
                      const client = clients.find(c => c.id === clientId);
                      setNewProject({
                        ...newProject,
                        clientId: clientId,
                        client: client?.name || ''
                      });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('projects.selectClient')}</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.company ? `- ${client.company}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddClientModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add New
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({...newProject, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({...newProject, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({...newProject, status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">{t('projects.active')}</option>
                    <option value="on_hold">{t('projects.onHold')}</option>
                    <option value="cancelled">{t('projects.cancelled')}</option>
                    <option value="completed">{t('projects.completed')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({...newProject, priority: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">{t('common.low')}</option>
                    <option value="medium">{t('common.medium')}</option>
                    <option value="high">{t('common.high')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={newProject.budget || ''}
                    onChange={(e) => setNewProject({...newProject, budget: parseFloat(e.target.value) || 0})}
                    className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter budget amount"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter project description"
                ></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button 
                onClick={() => setShowProjectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddClientModal}
        onAdd={async (clientData: any) => {
          try {
            const { addClient } = useClientsStore.getState();
            await addClient(clientData);
            await fetchClients(); // Refresh client list
            setShowAddClientModal(false);
          } catch (error) {
            console.error('Error adding client:', error);
            alert('Failed to add client');
          }
        }}
        onClose={() => setShowAddClientModal(false)}
      />

      {/* Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          clients={clients}
          onSave={async (updatedProject) => {
            await updateProject(updatedProject.id, updatedProject);
            await fetchProjects(); // Refresh projects
            setEditingProject(null);
          }}
          onClose={() => setEditingProject(null)}
          onAddClient={() => setShowAddClientModal(true)}
        />
      )}

      {/* New Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Task</h2>
              <button 
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                <input 
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter task description"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignees (select multiple)</label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                    {teamMembers.length === 0 ? (
                      <p className="text-sm text-gray-500">No team members available. Add team members first.</p>
                    ) : (
                      <div className="space-y-2">
                        {teamMembers.map(member => (
                          <label key={member.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={newTask.assignee.includes(member.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTask({...newTask, assignee: [...newTask.assignee, member.name]});
                                } else {
                                  setNewTask({...newTask, assignee: newTask.assignee.filter(a => a !== member.name)});
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{member.name}</span>
                            {member.role && <span className="text-xs text-gray-500">({member.role})</span>}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {newTask.assignee.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {newTask.assignee.map(assignee => (
                        <span key={assignee} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {assignee}
                          <button
                            type="button"
                            onClick={() => setNewTask({...newTask, assignee: newTask.assignee.filter(a => a !== assignee)})}
                            className="ml-1.5 inline-flex items-center justify-center flex-shrink-0 h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input 
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({...newTask, status: e.target.value as 'todo' | 'in-progress' | 'completed'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <option value="todo">{t('tasks.todo')}</option>
                    <option value="in-progress">{t('tasks.inProgress')}</option>
                    <option value="completed">{t('tasks.completed')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value as 'low' | 'medium' | 'high'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <option value="low">{t('common.low')}</option>
                    <option value="medium">{t('common.medium')}</option>
                    <option value="high">{t('common.high')}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button 
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (selectedProject && newTask.title) {
                    console.log('Adding task:', { projectId: selectedProject.id, task: newTask });
                    try {
                      await addTask(selectedProject.id, newTask);
                      console.log('Task added successfully');
                      setShowTaskModal(false);
                      setNewTask({
                        title: '',
                        assignee: [],
                        dueDate: '',
                        priority: 'medium',
                        status: 'todo'
                      });
                      // Refresh the selected project
                      const updated = projects.find(p => p.id === selectedProject.id);
                      if (updated) setSelectedProject(updated);
                    } catch (error) {
                      console.error('Error adding task:', error);
                    }
                  } else {
                    console.error('Cannot add task - missing project or title');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Upload Progress Update</h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe the progress update"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Related Task</label>
                <select
                  value={uploadTaskId}
                  onChange={(e) => setUploadTaskId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <option value="">{t('projects.selectTask')}</option>
                  {selectedProject?.tasks.map(task => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setUploadImages(files);
                    
                    // Create preview URLs
                    const urls = files.map(file => URL.createObjectURL(file));
                    setUploadPreviewUrls(urls);
                  }}
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400">
                  {uploadPreviewUrls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {uploadPreviewUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <img src={url} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newImages = uploadImages.filter((_, i) => i !== index);
                              const newUrls = uploadPreviewUrls.filter((_, i) => i !== index);
                              setUploadImages(newImages);
                              setUploadPreviewUrls(newUrls);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-1 text-sm text-gray-600">
                        Click to select photos or drag and drop
                      </p>
                      <button 
                        type="button"
                        className="mt-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Select Photos
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button 
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadDescription('');
                  setUploadTaskId('');
                  setUploadImages([]);
                  setUploadPreviewUrls([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!selectedProject) return;
                  
                  // Create the progress update
                  const newProgressUpdate = {
                    projectId: selectedProject.id,
                    date: new Date().toISOString(),
                    description: uploadDescription,
                    photos: [], // Will be filled by uploaded URLs
                    taskId: uploadTaskId,
                    postedBy: 'Current User' // Replace with actual user
                  };
                  
                  console.log('Creating progress update:', newProgressUpdate);
                  console.log('Uploading images:', uploadImages);
                  
                  // Save to database with image files
                  await addProgressUpdate(newProgressUpdate, uploadImages);
                  
                  // Show success
                  alert(`Progress update saved with ${uploadImages.length} photo(s)!`);
                  
                  // Clean up preview URLs
                  uploadPreviewUrls.forEach(url => URL.revokeObjectURL(url));
                  
                  // Close modal and reset
                  setShowUploadModal(false);
                  setUploadDescription('');
                  setUploadTaskId('');
                  setUploadImages([]);
                  setUploadPreviewUrls([]);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Upload Progress
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectManager;