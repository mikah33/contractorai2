import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  ChevronRight,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Search,
  DollarSign,
  ArrowLeft,
  Trash2,
  Send,
  Camera,
  FileText,
  X,
  Pencil,
  Settings
} from 'lucide-react';
import useProjectStore from '../stores/projectStore';
import { useEmployeesStore } from '../stores/employeesStore';
import usePhotosStore from '../stores/photosStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import AIChatPopup from '../components/ai/AIChatPopup';
import AddChoiceModal from '../components/common/AddChoiceModal';
import PhotoGallery from '../components/photos/PhotoGallery';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';
import ProjectsTutorialModal from '../components/projects/ProjectsTutorialModal';
import VisionCamModal from '../components/vision/VisionCamModal';
import { estimateService } from '../services/estimateService';
import { supabase } from '../lib/supabase';

const ProjectsHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const {
    projects,
    fetchProjects,
    loading,
    deleteProject,
    updateProject,
    addProject,
    addComment,
    addTask,
    addTeamMember,
    removeTeamMember,
    progressUpdates,
    fetchProgressUpdates,
    addProgressUpdate
  } = useProjectStore();
  const { photos: projectPhotos, fetchPhotos: fetchProjectPhotos } = usePhotosStore();
  const { projectsTutorialCompleted, checkProjectsTutorial, setProjectsTutorialCompleted } = useOnboardingStore();
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showVisionCam, setShowVisionCam] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectEstimates, setProjectEstimates] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTaskId, setUploadTaskId] = useState('');
  const [uploadImages, setUploadImages] = useState<File[]>([]);
  const [uploadPreviewUrls, setUploadPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    assignee: [] as string[],
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'todo' as 'todo' | 'in-progress' | 'completed'
  });
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [editBudget, setEditBudget] = useState({ budget: 0, spent: 0 });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({
    name: '',
    client: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'active' as 'active' | 'completed' | 'on-hold'
  });
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    client: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'active' as 'active' | 'completed' | 'on-hold'
  });

  // Employees store
  const { employees, fetchEmployees } = useEmployeesStore();

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, [fetchProjects, fetchEmployees]);

  // Hide navbar when any modal is open
  useEffect(() => {
    const isModalOpen = showManualForm || showEditProjectModal || showAddChoice || showPhotoGallery;
    if (isModalOpen) {
      document.body.classList.add('modal-active');
    } else {
      document.body.classList.remove('modal-active');
    }
    return () => {
      document.body.classList.remove('modal-active');
    };
  }, [showManualForm, showEditProjectModal, showAddChoice, showPhotoGallery]);

  // Check tutorial status on mount
  useEffect(() => {
    const checkTutorial = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setUserId(user.id);
        const completed = await checkProjectsTutorial(user.id);
        if (!completed) {
          setShowTutorial(true);
        }
      }
    };
    checkTutorial();
  }, []);

  const handleTutorialComplete = async (dontShowAgain: boolean) => {
    setShowTutorial(false);
    if (dontShowAgain && userId) {
      await setProjectsTutorialCompleted(userId, true);
    }
  };

  // Handle returning from estimate editor or Dashboard - auto-select the project
  useEffect(() => {
    if (projects.length === 0 || selectedProject) return;

    // Check URL params first
    const projectId = searchParams.get('id');
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        setSearchParams({}, { replace: true });
        return;
      }
    }

    // Then check location state
    const state = location.state as { selectedProjectId?: string } | null;
    if (state?.selectedProjectId) {
      const project = projects.find(p => p.id === state.selectedProjectId);
      if (project) {
        setSelectedProject(project);
      }
      // Clear the navigation state so refreshing doesn't re-select
      window.history.replaceState({}, document.title);
    }
  }, [location.state, projects, searchParams, selectedProject, setSearchParams]);

  // Fetch estimates when a project is selected
  useEffect(() => {
    const fetchProjectEstimates = async () => {
      if (selectedProject) {
        try {
          const result = await estimateService.getEstimates();
          if (result.success && result.data) {
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
  }, [selectedProject]);

  // Load progress updates and photos when project changes
  useEffect(() => {
    if (selectedProject?.id) {
      fetchProgressUpdates(selectedProject.id);
      fetchProjectPhotos(selectedProject.id);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-400';
      case 'in_progress':
        return theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400';
      case 'on_hold':
        return theme === 'light' ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-500/20 text-yellow-400';
      case 'cancelled':
        return theme === 'light' ? 'bg-red-100 text-red-700' : 'bg-red-500/20 text-red-400';
      case 'not_started':
      default:
        return theme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-zinc-800 text-zinc-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'on_hold':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Briefcase className="w-4 h-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredProjects = projects.filter(proj =>
    proj.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject(project);
    }
  };

  const handleAddComment = async () => {
    if (!selectedProject || !newComment.trim()) return;
    try {
      await addComment(selectedProject.id, {
        author: 'Current User',
        content: newComment
      }, undefined);
      const updatedProject = projects.find(p => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAIChat = () => {
    setShowAIChat(true);
  };

  const handleManual = () => {
    setShowAddChoice(false);
    setShowManualForm(true);
  };

  const handleCreateProject = async () => {
    if (!newProjectForm.name.trim() || isCreatingProject) {
      if (!newProjectForm.name.trim()) {
        alert('Please enter a project name');
      }
      return;
    }

    setIsCreatingProject(true);
    try {
      await addProject({
        name: newProjectForm.name.trim(),
        client: newProjectForm.client.trim() || undefined,
        description: newProjectForm.description.trim() || undefined,
        budget: newProjectForm.budget ? parseFloat(newProjectForm.budget) : 0,
        startDate: newProjectForm.startDate || undefined,
        endDate: newProjectForm.endDate || undefined,
        priority: newProjectForm.priority,
        status: newProjectForm.status
      });

      // Reset form and close modal
      setNewProjectForm({
        name: '',
        client: '',
        description: '',
        budget: '',
        startDate: '',
        endDate: '',
        priority: 'medium',
        status: 'active'
      });
      setShowManualForm(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const openEditProjectModal = () => {
    if (selectedProject) {
      setEditProjectForm({
        name: selectedProject.name || '',
        client: selectedProject.client_name || selectedProject.client || '',
        description: selectedProject.description || '',
        budget: selectedProject.budget?.toString() || '',
        startDate: selectedProject.start_date || selectedProject.startDate || '',
        endDate: selectedProject.end_date || selectedProject.endDate || '',
        priority: selectedProject.priority || 'medium',
        status: selectedProject.status || 'active'
      });
      setShowEditProjectModal(true);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !editProjectForm.name.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      await updateProject(selectedProject.id, {
        name: editProjectForm.name.trim(),
        client: editProjectForm.client.trim() || undefined,
        description: editProjectForm.description.trim() || undefined,
        budget: editProjectForm.budget ? parseFloat(editProjectForm.budget) : 0,
        startDate: editProjectForm.startDate || undefined,
        endDate: editProjectForm.endDate || undefined,
        priority: editProjectForm.priority,
        status: editProjectForm.status
      });

      // Refresh and update selected project
      await fetchProjects();
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
      setShowEditProjectModal(false);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project');
    }
  };

  // Handler for AI to update project
  const handleAIProjectUpdate = async (updates: any) => {
    try {
      // If no project selected, create a new one
      if (!selectedProject) {
        if (updates.name) {
          await addProject({
            name: updates.name,
            client: updates.client || '',
            status: updates.status || 'active',
            priority: updates.priority || 'medium',
            startDate: updates.startDate || new Date().toISOString().split('T')[0],
            endDate: updates.endDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
            budget: updates.budget || 0,
            description: updates.description || ''
          });
          await fetchProjects();
          setShowAIChat(false);
        }
        return;
      }

      // Update existing project
      await updateProject(selectedProject.id, updates);
      await fetchProjects();
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    } catch (error) {
      console.error('Error updating/creating project via AI:', error);
      alert('Failed to save project: ' + (error as any)?.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`min-h-full ${themeClasses.bg.primary} pb-24`}>
      {/* Projects Tutorial Modal */}
      <ProjectsTutorialModal
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Header */}
      <div className={`${themeClasses.bg.secondary} ${themeClasses.border.primary} border-b px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sticky top-0 z-10`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${themeClasses.text.primary}`}>Projects</h1>
              <p className={`text-sm ${themeClasses.text.secondary}`}>{projects.length} total</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/settings')}
              className={`w-10 h-10 ${themeClasses.bg.tertiary} rounded-lg flex items-center justify-center ${themeClasses.hover.bg} transition-colors`}
            >
              <Settings className={`w-5 h-5 ${themeClasses.text.secondary}`} />
            </button>
            <button
              onClick={() => setShowAddChoice(true)}
              className={`flex items-center gap-2 px-4 py-2.5 ${themeClasses.button.primary} rounded-md font-medium ${themeClasses.button.primaryHover} active:scale-95 transition-all`}
            >
              <Plus className="w-5 h-5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${themeClasses.text.muted}`} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 ${themeClasses.bg.input} rounded-lg border ${themeClasses.border.input} ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} ${themeClasses.focus.ring} ${themeClasses.focus.border} outline-none transition-all`}
          />
        </div>
      </div>

      {/* AI Chat Quick Access */}
      <div className="px-4 py-3">
        <button
          onClick={handleAIChat}
          className={`w-full flex items-center gap-3 p-4 ${themeClasses.bg.card} rounded-lg border border-orange-500/30 active:scale-[0.98] transition-transform hover:border-orange-500/50`}
        >
          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 text-left">
            <p className={`font-semibold ${themeClasses.text.primary}`}>AI Project Manager</p>
            <p className={`text-sm ${themeClasses.text.secondary}`}>Check availability, assign teams, manage schedules</p>
          </div>
          <ChevronRight className={`w-5 h-5 ${themeClasses.text.muted}`} />
        </button>
      </div>

      {/* Projects List */}
      <div className="px-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'light' ? 'border-gray-600' : 'border-white'}`}></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className={`w-12 h-12 ${theme === 'light' ? 'text-gray-400' : 'text-zinc-600'} mx-auto mb-3`} />
            <p className={`${themeClasses.text.secondary} font-medium`}>No projects yet</p>
            <p className={`text-sm ${themeClasses.text.muted} mt-1`}>Tap + to create your first project</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              className={`w-full text-left ${themeClasses.bg.card} rounded-2xl border-2 border-gray-300 shadow-sm overflow-hidden active:scale-[0.98] transition-transform hover:border-gray-400`}
            >
              <div className="p-6">
                {/* Header: Name + Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold ${themeClasses.text.primary} text-xl`}>
                      {project.name || 'Untitled Project'}
                    </h3>
                    {project.client_name && (
                      <p className={`text-base ${themeClasses.text.secondary} mt-1`}>{project.client_name}</p>
                    )}
                  </div>
                  <span className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0 ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)}
                    {formatStatus(project.status)}
                  </span>
                </div>

                {/* Description preview */}
                {project.description && (
                  <p className={`text-base ${themeClasses.text.secondary} line-clamp-2 mb-4`}>
                    {project.description}
                  </p>
                )}

                {/* Progress bar */}
                {typeof project.progress === 'number' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className={`font-medium ${themeClasses.text.muted}`}>Progress</span>
                      <span className={`font-bold ${theme === 'light' ? 'text-gray-700' : 'text-zinc-300'}`}>{project.progress}%</span>
                    </div>
                    <div className={`h-3 ${theme === 'light' ? 'bg-gray-200' : 'bg-zinc-800'} rounded-full overflow-hidden`}>
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Info row */}
                <div className={`flex items-center gap-4 text-sm ${themeClasses.text.muted} flex-wrap`}>
                  {project.start_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  {project.team_members && project.team_members.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {project.team_members.length}
                    </div>
                  )}
                  {project.budget > 0 && (
                    <div className="flex items-center gap-1.5 font-semibold text-green-600">
                      <DollarSign className="w-4 h-4" />
                      {formatCurrency(project.budget)}
                    </div>
                  )}
                  <div className="flex-1" />
                  <ChevronRight className={`w-6 h-6 text-orange-500`} />
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Add Choice Modal */}
      <AddChoiceModal
        isOpen={showAddChoice}
        onClose={() => setShowAddChoice(false)}
        onAIChat={handleAIChat}
        onManual={handleManual}
        title="Create Project"
        aiLabel="AI Assistant"
        aiDescription="Let AI help you set up and organize your project"
        manualLabel="Manual Entry"
        manualDescription="Enter project details yourself"
      />

      {/* AI Chat Popup */}
      <AIChatPopup
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        mode="projects"
        onProjectUpdate={handleAIProjectUpdate}
        projectContext={selectedProject ? {
          id: selectedProject.id,
          name: selectedProject.name,
          client: selectedProject.client_name || selectedProject.client,
          description: selectedProject.description,
          status: selectedProject.status,
          priority: selectedProject.priority,
          startDate: selectedProject.start_date || selectedProject.startDate,
          endDate: selectedProject.end_date || selectedProject.endDate,
          budget: selectedProject.budget,
          spent: selectedProject.spent,
          progress: selectedProject.progress,
          team: selectedProject.team_members || selectedProject.team
        } : undefined}
      />

      {/* Vision Cam Modal */}
      <VisionCamModal
        isOpen={showVisionCam}
        onClose={() => setShowVisionCam(false)}
      />

      {/* Project Details Modal - Slide Up */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 overflow-hidden pb-16">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setSelectedProject(null)}
          />

          {/* Slide-up Modal */}
          <div className="absolute inset-x-0 bottom-16 top-12 bg-gray-50 rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={openEditProjectModal}
                    className="p-2 text-orange-500 active:text-orange-600 active:bg-orange-50 rounded-xl"
                  >
                    <Pencil className="w-5 h-5" />
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
              </div>

              {/* Project Title */}
              <div className="mt-3">
                <h1 className="text-xl font-bold text-gray-900">{selectedProject.name || 'Untitled Project'}</h1>
                {(selectedProject.client_name || selectedProject.client) && (
                  <button
                    onClick={() => {
                      // Navigate to clients page with this client selected for editing
                      navigate('/clients', {
                        state: {
                          editClientId: selectedProject.client_id || selectedProject.clientId,
                          editClientName: selectedProject.client_name || selectedProject.client
                        }
                      });
                    }}
                    className="text-sm text-orange-500 active:text-orange-600 flex items-center gap-1"
                  >
                    {selectedProject.client_name || selectedProject.client}
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {!(selectedProject.client_name || selectedProject.client) && (
                  <p className="text-sm text-gray-500">No client assigned</p>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">

              {/* Vision Cam Card */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-400 rounded-3xl p-8 shadow-md">
                <button
                  onClick={() => setShowVisionCam(true)}
                  className="w-full flex items-center gap-6 active:scale-[0.98] transition-transform"
                >
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-2xl text-gray-900">Vision Cam</p>
                    <p className="text-lg text-gray-600 mt-1">Show your customer their vision before you build it</p>
                  </div>
                  <ChevronRight className="w-8 h-8 text-orange-400" />
                </button>
              </div>

              {/* Budget Card */}
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-lg font-semibold text-gray-600">Budget</label>
                  <button
                    onClick={() => {
                      setEditBudget({ budget: selectedProject.budget || 0, spent: selectedProject.spent || 0 });
                      setShowEditBudgetModal(true);
                    }}
                    className="text-lg text-orange-500 font-bold"
                  >
                    Edit
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base text-gray-500 mb-1">Spent</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(selectedProject.spent || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base text-gray-500 mb-1">Budget</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(selectedProject.budget || 0)}</p>
                  </div>
                </div>
                {selectedProject.budget > 0 && (
                  <div className="mt-6">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ((selectedProject.spent || 0) / selectedProject.budget) > 0.9 ? 'bg-red-500' :
                          ((selectedProject.spent || 0) / selectedProject.budget) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(((selectedProject.spent || 0) / selectedProject.budget) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Team Card */}
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-lg font-semibold text-gray-600">Team</label>
                  <button
                    onClick={() => {
                      setSelectedEmployeeId('');
                      setShowEditTeamModal(true);
                    }}
                    className="text-lg text-orange-500 font-bold"
                  >
                    Add Member
                  </button>
                </div>
                {(selectedProject.team_members || selectedProject.team || []).length === 0 ? (
                  <p className="text-xl text-gray-400">No team members assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {(selectedProject.team_members || selectedProject.team || []).map((member: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 bg-gray-50 rounded-full px-5 py-3">
                        <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-lg text-white font-bold">
                          {(typeof member === 'string' ? member : member.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-xl text-gray-700 font-semibold">{typeof member === 'string' ? member : member.name}</span>
                        <button
                          onClick={async () => {
                            const memberName = typeof member === 'string' ? member : member.name;
                            if (window.confirm(`Remove ${memberName} from team?`)) {
                              await removeTeamMember(selectedProject.id, memberName);
                              const updated = projects.find(p => p.id === selectedProject.id);
                              if (updated) setSelectedProject(updated);
                            }
                          }}
                          className="ml-2 text-gray-400 active:text-red-500"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks Card */}
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-lg font-semibold text-gray-600">Tasks</label>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="text-lg text-orange-500 font-bold"
                  >
                    Add Task
                  </button>
                </div>
                {(selectedProject.tasks || []).length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-400">No tasks yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(selectedProject.tasks || []).slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center gap-5 p-5 bg-gray-50 rounded-2xl">
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xl font-semibold truncate ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {task.title}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(selectedProject.tasks || []).length > 5 && (
                      <p className="text-base text-gray-500 text-center pt-4">
                        +{(selectedProject.tasks || []).length - 5} more tasks
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Comments Card */}
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <label className="block text-lg font-semibold text-gray-600 mb-6">Comments</label>

                {(selectedProject.comments || []).length === 0 ? (
                  <p className="text-xl text-gray-400 mb-6">No comments yet</p>
                ) : (
                  <div className="space-y-5 mb-6 max-h-80 overflow-y-auto">
                    {(selectedProject.comments || []).slice(-3).map((comment: any) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 flex-shrink-0">
                          {comment.author.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 rounded-2xl px-5 py-4">
                            <p className="text-lg text-gray-900">{comment.content}</p>
                          </div>
                          <p className="text-base text-gray-400 mt-2">{comment.author} • {new Date(comment.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment Input */}
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-6 py-4 text-lg border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-6 py-4 bg-orange-500 text-white rounded-2xl active:bg-orange-600"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Estimates Card */}
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-lg font-semibold text-gray-600">Estimates</label>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-lg text-orange-500 font-bold"
                  >
                    Create New
                  </button>
                </div>
                {projectEstimates.length === 0 ? (
                  <div className="text-center py-10">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-400">No estimates yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectEstimates.slice(0, 3).map((estimate) => (
                      <button
                        key={estimate.id}
                        onClick={() => navigate('/estimates', { state: { editEstimateId: estimate.id, returnTo: '/projects-hub', returnProjectId: selectedProject.id } })}
                        className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl active:bg-gray-100 text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-xl font-bold text-gray-900 truncate">{estimate.title}</p>
                          <p className="text-base text-gray-500 mt-1">{new Date(estimate.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-5">
                          <p className="text-2xl font-bold text-green-600">${estimate.total?.toFixed(2) || '0.00'}</p>
                          <span className={`text-base px-4 py-1.5 rounded-full ${
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
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-lg font-semibold text-gray-600">Project Photos ({projectPhotos.length})</label>
                  <button
                    onClick={() => setShowPhotoGallery(true)}
                    className="text-lg text-orange-500 font-bold"
                  >
                    View All
                  </button>
                </div>
                {projectPhotos.length === 0 ? (
                  <div className="text-center py-10">
                    <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-400">No photos yet</p>
                    <p className="text-base text-gray-400 mt-2">Use the + button to add photos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {projectPhotos.slice(0, 6).map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.imageUrl}
                        alt={photo.caption || 'Project photo'}
                        className="w-full aspect-square object-cover rounded-2xl cursor-pointer hover:opacity-90"
                        onClick={() => setShowPhotoGallery(true)}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Task</h2>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 active:text-gray-500 p-1 rounded-full active:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value as 'low' | 'medium' | 'high'})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowTaskModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 bg-white active:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedProject && newTask.title) {
                    try {
                      await addTask(selectedProject.id, newTask);
                      setShowTaskModal(false);
                      setNewTask({
                        title: '',
                        assignee: [],
                        dueDate: '',
                        priority: 'medium',
                        status: 'todo'
                      });
                      const updated = projects.find(p => p.id === selectedProject.id);
                      if (updated) setSelectedProject(updated);
                    } catch (error) {
                      console.error('Error adding task:', error);
                    }
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl active:bg-orange-600"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Upload Progress Update</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 active:text-gray-500 p-1 rounded-full active:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the progress update"
                ></textarea>
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
                    const urls = files.map(file => URL.createObjectURL(file));
                    setUploadPreviewUrls(urls);
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer active:border-gray-400"
                >
                  {uploadPreviewUrls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {uploadPreviewUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <img src={url} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-xl" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newImages = uploadImages.filter((_, i) => i !== index);
                              const newUrls = uploadPreviewUrls.filter((_, i) => i !== index);
                              setUploadImages(newImages);
                              setUploadPreviewUrls(newUrls);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
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
                        Tap to select photos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadDescription('');
                  setUploadTaskId('');
                  setUploadImages([]);
                  setUploadPreviewUrls([]);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 bg-white active:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedProject) return;

                  const newProgressUpdate = {
                    projectId: selectedProject.id,
                    date: new Date().toISOString(),
                    description: uploadDescription,
                    photos: [],
                    taskId: uploadTaskId,
                    postedBy: 'Current User'
                  };

                  await addProgressUpdate(newProgressUpdate, uploadImages);

                  uploadPreviewUrls.forEach(url => URL.revokeObjectURL(url));

                  setShowUploadModal(false);
                  setUploadDescription('');
                  setUploadTaskId('');
                  setUploadImages([]);
                  setUploadPreviewUrls([]);
                }}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl active:bg-orange-600"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {showEditBudgetModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Edit Budget</h2>
              <button
                onClick={() => setShowEditBudgetModal(false)}
                className="text-gray-400 active:text-gray-500 p-1 rounded-full active:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={editBudget.budget || ''}
                    onChange={(e) => setEditBudget({...editBudget, budget: parseFloat(e.target.value) || 0})}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Spent</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={editBudget.spent || ''}
                    onChange={(e) => setEditBudget({...editBudget, spent: parseFloat(e.target.value) || 0})}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowEditBudgetModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 bg-white active:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedProject) {
                    try {
                      await updateProject(selectedProject.id, {
                        budget: editBudget.budget,
                        spent: editBudget.spent
                      });
                      setShowEditBudgetModal(false);
                      await fetchProjects();
                      const updated = projects.find(p => p.id === selectedProject.id);
                      if (updated) setSelectedProject({...updated, budget: editBudget.budget, spent: editBudget.spent});
                    } catch (error) {
                      console.error('Error updating budget:', error);
                    }
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl active:bg-orange-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {showEditTeamModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Team Member</h2>
              <button
                onClick={() => setShowEditTeamModal(false)}
                className="text-gray-400 active:text-gray-500 p-1 rounded-full active:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                {employees.filter(e => e.status === 'active').length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">No employees found</p>
                    <button
                      onClick={() => {
                        setShowEditTeamModal(false);
                        navigate('/employees');
                      }}
                      className="text-sm text-orange-500 font-medium"
                    >
                      Add Employees
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select an employee...</option>
                    {employees
                      .filter(e => e.status === 'active')
                      .map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} {emp.jobTitle ? `- ${emp.jobTitle}` : ''}
                        </option>
                      ))
                    }
                  </select>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditTeamModal(false);
                  setSelectedEmployeeId('');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 bg-white active:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
                  if (selectedProject && selectedEmployee) {
                    try {
                      await addTeamMember(
                        selectedProject.id,
                        selectedEmployee.name,
                        selectedEmployee.email || undefined,
                        selectedEmployee.jobTitle || undefined
                      );
                      setShowEditTeamModal(false);
                      setSelectedEmployeeId('');
                      await fetchProjects();
                      const updated = projects.find(p => p.id === selectedProject.id);
                      if (updated) setSelectedProject(updated);
                    } catch (error) {
                      console.error('Error adding team member:', error);
                    }
                  }
                }}
                disabled={!selectedEmployeeId}
                className={`flex-1 px-4 py-2.5 rounded-xl ${
                  selectedEmployeeId
                    ? 'bg-orange-500 text-white active:bg-orange-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Project Modal */}
      {showManualForm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center modal-open">
          <div
            className={`absolute inset-0 ${theme === 'light' ? 'bg-black/50' : 'bg-black/70'}`}
            onClick={() => setShowManualForm(false)}
          />
          <div className={`relative ${themeClasses.bg.modal} rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up pb-safe`}>
            <div className={`sticky top-0 ${themeClasses.bg.modal} px-4 py-4 border-b border-orange-500/30 flex items-center justify-between z-10`}>
              <button
                onClick={() => setShowManualForm(false)}
                className={`${themeClasses.text.secondary} text-base font-medium ${themeClasses.hover.text}`}
              >
                Cancel
              </button>
              <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>New Project</h2>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectForm.name.trim() || isCreatingProject}
                className={`text-orange-500 text-base font-semibold active:text-orange-400 disabled:${themeClasses.text.muted} disabled:cursor-not-allowed`}
              >
                {isCreatingProject ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Project Name */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Project Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  placeholder="e.g., Kitchen Renovation"
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} ${themeClasses.focus.border} focus:ring-2 focus:ring-orange-500/20 outline-none`}
                />
              </div>

              {/* Client Name */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Client Name</label>
                <input
                  type="text"
                  value={newProjectForm.client}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, client: e.target.value })}
                  placeholder="e.g., John Smith"
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} ${themeClasses.focus.border} focus:ring-2 focus:ring-orange-500/20 outline-none`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Description</label>
                <textarea
                  value={newProjectForm.description}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} ${themeClasses.focus.border} focus:ring-2 focus:ring-orange-500/20 outline-none resize-none`}
                />
              </div>

              {/* Budget */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Budget</label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${themeClasses.text.muted}`}>$</span>
                  <input
                    type="number"
                    value={newProjectForm.budget}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, budget: e.target.value })}
                    placeholder="0"
                    className={`w-full pl-8 pr-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} placeholder-${theme === 'light' ? 'gray-400' : 'zinc-500'} ${themeClasses.focus.border} focus:ring-2 focus:ring-orange-500/20 outline-none`}
                  />
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Start Date</label>
                  <input
                    type="date"
                    value={newProjectForm.startDate}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-orange-500/20 outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>End Date</label>
                  <input
                    type="date"
                    value={newProjectForm.endDate}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, endDate: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-orange-500/20 outline-none`}
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Priority</label>
                <select
                  value={newProjectForm.priority}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-orange-500/20 outline-none`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Status</label>
                <select
                  value={newProjectForm.status}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, status: e.target.value as 'active' | 'completed' | 'on-hold' })}
                  className={`w-full px-4 py-3 rounded-xl ${themeClasses.bg.input} border ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.focus.border} focus:ring-2 focus:ring-orange-500/20 outline-none`}
                >
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center modal-open">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowEditProjectModal(false)}
          />
          <div className="relative bg-[#1C1C1E] rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up pb-safe">
            <div className="sticky top-0 bg-[#1C1C1E] px-4 py-4 border-b border-orange-500/30 flex items-center justify-between z-10">
              <button
                onClick={() => setShowEditProjectModal(false)}
                className="text-zinc-400 text-base font-medium active:text-zinc-300"
              >
                Cancel
              </button>
              <h2 className="text-lg font-semibold text-white">Edit Project</h2>
              <button
                onClick={handleUpdateProject}
                disabled={!editProjectForm.name.trim()}
                className="text-orange-500 text-base font-semibold active:text-orange-400 disabled:text-zinc-600 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Project Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={editProjectForm.name}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
                  placeholder="e.g., Kitchen Renovation"
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                />
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Client Name</label>
                <input
                  type="text"
                  value={editProjectForm.client}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, client: e.target.value })}
                  placeholder="e.g., John Smith"
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
                <textarea
                  value={editProjectForm.description}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Budget</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    value={editProjectForm.budget}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, budget: e.target.value })}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editProjectForm.startDate}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, startDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editProjectForm.endDate}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, endDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Priority</label>
                <select
                  value={editProjectForm.priority}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
                <select
                  value={editProjectForm.status}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, status: e.target.value as 'active' | 'completed' | 'on-hold' })}
                  className="w-full px-4 py-3 rounded-xl bg-[#262626] border border-[#3A3A3C] text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      {showPhotoGallery && selectedProject && (
        <div className="fixed inset-0 z-50 bg-[#0F0F0F] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#1C1C1E] border-b border-orange-500/30 px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setShowPhotoGallery(false)}
              className="p-2 text-white hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">{selectedProject.name}</h2>
              <p className="text-sm text-zinc-400">{projectPhotos.length} photo{projectPhotos.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="p-4">
            <PhotoGallery projectId={selectedProject.id} />
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectsHub;
