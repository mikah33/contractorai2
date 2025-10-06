import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Filter, MoreVertical, Calendar, Users, CheckCircle, Clock, AlertCircle,
  MessageSquare, Upload, Camera, FileText, ChevronDown, ChevronUp, Trash2, Edit,
  Paperclip, Send, User, Sparkles, BarChart2, ArrowRight, Tag, Flag, Zap, DollarSign, X,
  Phone, Mail, Briefcase, StickyNote, UserPlus
} from 'lucide-react';
import TaskList from '../components/projects/TaskList';
import TeamMemberSelector from '../components/projects/TeamMemberSelector';
import ProjectProgressGallery from '../components/projects/ProjectProgressGallery';
import ProjectComments from '../components/projects/ProjectComments';
import ProjectAIInsights from '../components/projects/ProjectAIInsights';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'team' | 'progress' | 'comments' | 'insights' | 'estimates'>('overview');
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

    // Debug tools disabled - enable if needed for troubleshooting
    // import('../components/projects/TestClientSave').then(({ testClientSave }) => {
    //   testClientSave();
    // });
    // import('../utils/debugClientSave').then(({ debugClientSave }) => {
    //   debugClientSave();
    // });
  }, []); // Empty deps - only run once on mount

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Manager</h1>
            <p className="text-gray-600">Manage your construction projects efficiently</p>
          </div>
          <button
            onClick={() => setShowProjectModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mt-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects..."
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
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
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
                      <span>Progress</span>
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
                      {project.team.slice(0, 3).map((member, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white border-2 border-white"
                        >
                          {member.split(' ').map(n => n[0]).join('')}
                        </div>
                      ))}
                      {project.team.length > 3 && (
                        <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs text-white border-2 border-white">
                          +{project.team.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Project Details Modal */}
        {selectedProject && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSelectedProject(null)} />
            
            {/* Modal */}
            <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-white rounded-lg shadow-2xl flex flex-col max-w-6xl mx-auto">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-white rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">{selectedProject.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedProject.client}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to delete "${selectedProject.name}"? This action cannot be undone.`)) {
                          try {
                            await deleteProject(selectedProject.id);
                            setSelectedProject(null);
                          } catch (error) {
                            console.error('Error deleting project:', error);
                            alert('Failed to delete project. Please try again.');
                          }
                        }
                      }}
                      className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      aria-label="Delete project"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Close details"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 bg-gray-50">
                <nav className="flex px-6 space-x-4 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === 'tasks'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('team')}
                  className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === 'team'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Team
                </button>
                <button
                  onClick={() => {
                    console.log('Progress tab clicked!');
                    setActiveTab('progress');
                  }}
                  className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === 'progress'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                  type="button"
                >
                  Progress
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === 'comments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Comments
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('insights')}
                  className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === 'insights'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  AI Insights
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('estimates')}
                  className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === 'estimates'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Estimates
                </button>
              </nav>
            </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 max-h-[calc(100vh-250px)]">
                {activeTab === 'overview' && (
                <>
                  {/* Project Status */}
                  <div className="mb-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedProject.status)}`}>
                      {selectedProject.status.replace('-', ' ')}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{selectedProject.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${selectedProject.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Budget</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Spent</span>
                        <span className="font-medium">${selectedProject.spent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Budget</span>
                        <span className="font-medium">${selectedProject.budget.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Team */}
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Team</h3>
                    <div className="space-y-2">
                      {selectedProject.team.map((member, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm text-white">
                            {member.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm text-gray-900">{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">Tasks</h3>
                      <button
                        onClick={() => setShowTaskModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Add Task
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(selectedProject.tasks || []).map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-4 h-4 rounded-full ${
                            task.status === 'completed' ? 'bg-green-500' :
                            task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-600">
                              {(() => {
                                const assignee = task.assignee;
                                if (Array.isArray(assignee)) {
                                  // Filter out UUID-like strings and keep only real names
                                  const filtered = assignee.filter(a => !a.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
                                  return filtered.length > 0 ? filtered.join(', ') : 'Unassigned';
                                }
                                // Check if single assignee is a UUID
                                if (typeof assignee === 'string' && assignee.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                                  return 'Unassigned';
                                }
                                return assignee || 'Unassigned';
                              })()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Comments</h3>
                    <div className="space-y-4 mb-4">
                      {selectedProject.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm">
                            {comment.author.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-900">{comment.content}</p>
                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {comment.attachments.map((attachment, idx) => {
                                    const isImage = attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                    return isImage ? (
                                      <img 
                                        key={idx} 
                                        src={attachment} 
                                        alt={`Attachment ${idx + 1}`}
                                        className="h-16 w-16 object-cover rounded cursor-pointer hover:opacity-75"
                                        onClick={() => window.open(attachment, '_blank')}
                                      />
                                    ) : (
                                      <a 
                                        key={idx}
                                        href={attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center bg-white border rounded px-2 py-1 text-xs hover:bg-gray-100"
                                      >
                                        <Paperclip className="h-3 w-3 mr-1" />
                                        File {idx + 1}
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {comment.author} • {new Date(comment.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Comment */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                      />
                      <button
                        onClick={handleAddComment}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'tasks' && (
                <div>
                  <TaskList 
                    tasks={selectedProject.tasks || []} 
                  team={teamMembers}
                  onAddTask={() => setShowTaskModal(true)}
                  onUpdateTask={async (taskId, updates) => {
                    console.log('Updating task:', taskId, updates);
                    try {
                      await updateTask(selectedProject.id, taskId, updates);
                      await fetchProjects(); // Refresh the data
                      const updatedProject = projects.find(p => p.id === selectedProject.id);
                      if (updatedProject) setSelectedProject(updatedProject);
                    } catch (error) {
                      console.error('Error updating task:', error);
                    }
                  }}
                  onDeleteTask={async (taskId) => {
                    console.log('Deleting task:', taskId);
                    try {
                      await deleteTask(selectedProject.id, taskId);
                      await fetchProjects(); // Refresh the data
                      const updatedProject = projects.find(p => p.id === selectedProject.id);
                      if (updatedProject) setSelectedProject(updatedProject);
                    } catch (error) {
                      console.error('Error deleting task:', error);
                    }
                  }}
                  onAddComment={async (taskId, comment) => {
                    console.log('Adding comment for task:', taskId, comment);
                    try {
                      await addComment(selectedProject.id, { author: 'Current User', content: `Task ${taskId}: ${comment}` });
                      await fetchProjects(); // Refresh the data
                      const updatedProject = projects.find(p => p.id === selectedProject.id);
                      if (updatedProject) setSelectedProject(updatedProject);
                    } catch (error) {
                      console.error('Error adding comment:', error);
                    }
                  }}
                />
                </div>
              )}

              {activeTab === 'team' && (
                <TeamMemberSelector 
                  team={teamMembers}
                  projectId={selectedProject.id}
                  addTeamMember={addTeamMember}
                  removeTeamMember={removeTeamMember}
                />
              )}

              {activeTab === 'progress' && (
                <ProjectProgressGallery 
                  progressUpdates={progressUpdates}
                  tasks={selectedProject.tasks || []}
                  team={teamMembers}
                  onUploadProgress={() => setShowUploadModal(true)}
                  onDeleteProgress={deleteProgressUpdate}
                />
              )}

              {activeTab === 'comments' && (
                <ProjectComments 
                  comments={selectedProject.comments.map(c => ({
                    id: c.id,
                    text: c.content,
                    date: c.timestamp,
                    author: c.author,
                    mentions: [],
                    attachments: c.attachments || []
                  }))}
                  team={teamMembers}
                  projectId={selectedProject.id}
                  onAddComment={async (comment, attachments) => {
                    console.log('Adding comment with attachments:', comment, attachments);
                    try {
                      await addComment(selectedProject.id, { 
                        author: 'Current User', 
                        content: comment 
                      }, attachments);
                      // The useEffect will handle updating selectedProject
                    } catch (error) {
                      console.error('Error adding comment:', error);
                    }
                  }}
                  onDeleteComment={async (commentId) => {
                    console.log('Deleting comment:', commentId);
                    try {
                      await deleteComment(selectedProject.id, commentId);
                      // The useEffect will handle updating selectedProject
                    } catch (error) {
                      console.error('Error deleting comment:', error);
                    }
                  }}
                />
              )}

              {activeTab === 'insights' && (
                <ProjectAIInsights project={selectedProject} />
              )}

              {activeTab === 'estimates' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Project Estimates</h3>
                    <button
                      onClick={() => window.location.href = `/estimates?project_id=${selectedProject.id}`}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Estimate
                    </button>
                  </div>

                  {projectEstimates.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No estimates for this project yet</p>
                      <button
                        onClick={() => window.location.href = `/estimates?project_id=${selectedProject.id}`}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Create First Estimate
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projectEstimates.map((estimate) => (
                        <div key={estimate.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="text-base font-medium text-gray-900">{estimate.title}</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {estimate.clientName || 'No client'} • {new Date(estimate.createdAt).toLocaleDateString()}
                              </p>
                              <div className="mt-2 flex items-center space-x-4">
                                <span className="text-sm text-gray-600">
                                  Items: {estimate.items?.length || 0}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  estimate.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                  estimate.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                  estimate.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {estimate.status}
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-lg font-semibold text-gray-900">
                                ${estimate.total?.toFixed(2) || '0.00'}
                              </p>
                              <button
                                onClick={() => window.location.href = `/estimates?id=${estimate.id}`}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                              >
                                View →
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                    <option value="">Select a client (optional)</option>
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
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select 
                    value={newProject.priority}
                    onChange={(e) => setNewProject({...newProject, priority: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
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
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select 
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value as 'low' | 'medium' | 'high'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
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
                  <option value="">Select a task</option>
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