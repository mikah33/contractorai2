import React, { useState, useEffect } from 'react';
import {
  X,
  Scan,
  Camera,
  FolderOpen,
  Plus,
  ChevronRight,
  Trash2,
  Eye,
  Wand2,
  Link as LinkIcon,
  Check,
  Loader2,
  MapPin,
  Box,
  Image,
  Sparkles,
  Lock
} from 'lucide-react';
import { usePlansStore, Plan, PlanScan } from '../../stores/plansStore';
import useProjectStore from '../../stores/projectStore';
import PanoramaViewer from './PanoramaViewer';
import PanoramaCaptureModal from './PanoramaCaptureModal';

interface PlanCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartLiDAR: (planId: string) => void;
}

// Beta testing password
const BETA_PASSWORD = '$EasyMoney10';

type TabType = 'new' | 'saved';

const PlanCreationModal: React.FC<PlanCreationModalProps> = ({
  isOpen,
  onClose,
  onStartLiDAR
}) => {
  // Beta access state
  const [isBetaUnlocked, setIsBetaUnlocked] = useState(() => {
    return sessionStorage.getItem('planCreationBetaUnlocked') === 'true';
  });
  const [betaPassword, setBetaPassword] = useState('');
  const [betaError, setBetaError] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('new');

  // New plan state
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedScanType, setSelectedScanType] = useState<'lidar' | 'panorama' | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);

  // Plan detail state
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPlanDetail, setShowPlanDetail] = useState(false);

  // Panorama state
  const [showPanoramaCapture, setShowPanoramaCapture] = useState(false);
  const [showPanoramaViewer, setShowPanoramaViewer] = useState(false);
  const [viewingPanorama, setViewingPanorama] = useState<{ before: string; after?: string } | null>(null);

  // AI Design state
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  // Link to project state
  const [showLinkProject, setShowLinkProject] = useState(false);

  // Store
  const {
    plans,
    isLoading,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    addScan,
    aiGenerationStatus,
    fetchAIGenerationStatus,
    canGenerateAI,
    incrementAIGeneration
  } = usePlansStore();

  const { projects, fetchProjects } = useProjectStore();

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && isBetaUnlocked) {
      fetchPlans();
      fetchProjects();
      fetchAIGenerationStatus();
    }
  }, [isOpen, isBetaUnlocked]);

  // Handle beta password
  const handleBetaSubmit = () => {
    if (betaPassword === BETA_PASSWORD) {
      setIsBetaUnlocked(true);
      sessionStorage.setItem('planCreationBetaUnlocked', 'true');
      setBetaError('');
    } else {
      setBetaError('Incorrect password');
    }
  };

  // Handle create plan
  const handleCreatePlan = async () => {
    if (!newPlanName.trim() || !selectedScanType) return;

    setCreatingPlan(true);
    const plan = await createPlan(newPlanName.trim(), selectedProjectId || undefined);
    setCreatingPlan(false);

    if (plan) {
      setShowCreatePlan(false);
      setNewPlanName('');
      setSelectedProjectId('');

      if (selectedScanType === 'lidar') {
        onStartLiDAR(plan.id);
        onClose();
      } else if (selectedScanType === 'panorama') {
        setSelectedPlan(plan);
        setShowPanoramaCapture(true);
      }

      setSelectedScanType(null);
    }
  };

  // Handle plan selection
  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPlanDetail(true);
  };

  // Handle delete plan
  const handleDeletePlan = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (confirm('Delete this plan and all its scans?')) {
      await deletePlan(planId);
    }
  };

  // Handle link to project
  const handleLinkProject = async (projectId: string) => {
    if (selectedPlan) {
      await updatePlan(selectedPlan.id, { project_id: projectId || null });
      setShowLinkProject(false);
      // Refresh plan data
      fetchPlans();
    }
  };

  // Handle panorama capture complete
  const handlePanoramaComplete = async (panoramaUrl: string) => {
    if (selectedPlan) {
      await addScan(selectedPlan.id, 'panorama', panoramaUrl);
      setShowPanoramaCapture(false);
      fetchPlans();
    }
  };

  // Handle AI design generation
  const handleGenerateAIDesign = async () => {
    if (!selectedPlan || !aiPrompt.trim()) return;

    const panoramaScan = selectedPlan.scans?.find(s => s.scan_type === 'panorama');
    if (!panoramaScan?.data_url) return;

    if (!canGenerateAI()) {
      alert('You have reached your free AI generation limit for this billing cycle.');
      return;
    }

    setGeneratingAI(true);

    try {
      // TODO: Call the AI transformation edge function
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Increment generation count
      await incrementAIGeneration();

      // Add the AI design scan
      // await addScan(selectedPlan.id, 'ai_design', transformedUrl, {}, aiPrompt, panoramaScan.id);

      setShowAIPrompt(false);
      setAIPrompt('');
      fetchPlans();
    } catch (error) {
      console.error('Error generating AI design:', error);
      alert('Failed to generate AI design. Please try again.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Get scan counts for a plan
  const getScanCounts = (plan: Plan) => {
    const scans = plan.scans || [];
    return {
      hasLidar: scans.some(s => s.scan_type === 'lidar'),
      hasPanorama: scans.some(s => s.scan_type === 'panorama'),
      aiDesignCount: scans.filter(s => s.scan_type === 'ai_design').length
    };
  };

  if (!isOpen) return null;

  // Beta password wall
  if (!isBetaUnlocked) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80">
        <div className="bg-[#1C1C1E] rounded-2xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Plan Creation</h2>
              <p className="text-sm text-zinc-400">Beta Access Required</p>
            </div>
          </div>

          <p className="text-zinc-400 mb-4">
            This feature is currently in beta testing. Enter the beta password to continue.
          </p>

          <input
            type="password"
            value={betaPassword}
            onChange={(e) => setBetaPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleBetaSubmit()}
            placeholder="Enter beta password"
            className="w-full px-4 py-3 bg-[#2C2C2E] border border-zinc-700 rounded-xl text-white placeholder-zinc-500 mb-3"
          />

          {betaError && (
            <p className="text-red-400 text-sm mb-3">{betaError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBetaSubmit}
              className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
            >
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-[#1A1A1A]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Plan Creation</h2>
              <p className="text-xs text-zinc-400">LiDAR & 360° Capture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'new'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            New Scan
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'saved'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Saved Plans
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ height: 'calc(100vh - 140px)' }}>
          {activeTab === 'new' && !showCreatePlan && (
            <div className="space-y-4">
              {/* LiDAR Scan Option */}
              <button
                onClick={() => {
                  setSelectedScanType('lidar');
                  setShowCreatePlan(true);
                }}
                className="w-full flex items-center gap-4 p-4 bg-[#1C1C1E] rounded-xl border border-cyan-500/30 hover:border-cyan-500 active:scale-[0.98] transition-all"
              >
                <div className="w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Scan className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white text-lg">LiDAR Scan</h3>
                  <p className="text-sm text-zinc-400">Floor plans with accurate dimensions</p>
                </div>
                <ChevronRight className="w-5 h-5 text-cyan-400" />
              </button>

              {/* 360° Capture Option */}
              <button
                onClick={() => {
                  setSelectedScanType('panorama');
                  setShowCreatePlan(true);
                }}
                className="w-full flex items-center gap-4 p-4 bg-[#1C1C1E] rounded-xl border border-purple-500/30 hover:border-purple-500 active:scale-[0.98] transition-all"
              >
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white text-lg">360° Capture</h3>
                  <p className="text-sm text-zinc-400">Immersive panorama with AI redesign</p>
                </div>
                <ChevronRight className="w-5 h-5 text-purple-400" />
              </button>

              {/* AI Generation Status */}
              {aiGenerationStatus && (
                <div className="mt-6 p-4 bg-[#1C1C1E] rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">AI Designs This Month</span>
                    <span className="text-sm font-medium text-white">
                      {aiGenerationStatus.count} / {aiGenerationStatus.limit} free
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${(aiGenerationStatus.count / aiGenerationStatus.limit) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create Plan Form */}
          {activeTab === 'new' && showCreatePlan && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowCreatePlan(false);
                  setSelectedScanType(null);
                }}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back
              </button>

              <div className="bg-[#1C1C1E] rounded-xl p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-4">
                  Create New {selectedScanType === 'lidar' ? 'LiDAR' : '360°'} Plan
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Plan Name *</label>
                    <input
                      type="text"
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      placeholder="e.g., Kitchen Remodel"
                      className="w-full px-4 py-3 bg-[#2C2C2E] border border-zinc-700 rounded-xl text-white placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Link to Project (Optional)</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-4 py-3 bg-[#2C2C2E] border border-zinc-700 rounded-xl text-white"
                    >
                      <option value="">No project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleCreatePlan}
                    disabled={!newPlanName.trim() || creatingPlan}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {creatingPlan ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Create & Start {selectedScanType === 'lidar' ? 'LiDAR Scan' : '360° Capture'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saved Plans List */}
          {activeTab === 'saved' && !showPlanDetail && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium">No saved plans yet</p>
                  <p className="text-sm text-zinc-500 mt-1">Create a new scan to get started</p>
                </div>
              ) : (
                plans.map(plan => {
                  const { hasLidar, hasPanorama, aiDesignCount } = getScanCounts(plan);

                  return (
                    <button
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full flex items-center gap-3 p-4 bg-[#1C1C1E] rounded-xl border border-white/10 hover:border-orange-500/50 active:scale-[0.98] transition-all text-left"
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                        {plan.thumbnail_url ? (
                          <img
                            src={plan.thumbnail_url}
                            alt={plan.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Box className="w-6 h-6 text-zinc-600" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{plan.name}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {new Date(plan.created_at).toLocaleDateString()}
                        </p>

                        {/* Status icons */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${hasLidar ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-700 text-zinc-500'}`}>
                            LiDAR {hasLidar ? '✓' : '–'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${hasPanorama ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-700 text-zinc-500'}`}>
                            360° {hasPanorama ? '✓' : '–'}
                          </span>
                          {aiDesignCount > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                              AI ×{aiDesignCount}
                            </span>
                          )}
                        </div>

                        {/* Project link */}
                        {plan.project_name && (
                          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" />
                            {plan.project_name}
                          </p>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeletePlan(e, plan.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Plan Detail View */}
          {activeTab === 'saved' && showPlanDetail && selectedPlan && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowPlanDetail(false);
                  setSelectedPlan(null);
                }}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to Plans
              </button>

              {/* Plan header */}
              <div className="bg-[#1C1C1E] rounded-xl p-4 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xl">{selectedPlan.name}</h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      Created {new Date(selectedPlan.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Link to project button */}
                  <button
                    onClick={() => setShowLinkProject(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {selectedPlan.project_name || 'Link Project'}
                  </button>
                </div>
              </div>

              {/* Scan Actions */}
              <div className="grid grid-cols-2 gap-3">
                {/* LiDAR */}
                {!selectedPlan.scans?.some(s => s.scan_type === 'lidar') ? (
                  <button
                    onClick={() => {
                      onStartLiDAR(selectedPlan.id);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-2 p-4 bg-[#1C1C1E] rounded-xl border border-cyan-500/30 hover:border-cyan-500 transition-all"
                  >
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                      <Plus className="w-6 h-6 text-cyan-400" />
                    </div>
                    <span className="text-sm font-medium text-white">Add LiDAR</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 bg-[#1C1C1E] rounded-xl border border-cyan-500/50">
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                      <Check className="w-6 h-6 text-cyan-400" />
                    </div>
                    <span className="text-sm font-medium text-cyan-400">LiDAR Done</span>
                  </div>
                )}

                {/* 360° Panorama */}
                {!selectedPlan.scans?.some(s => s.scan_type === 'panorama') ? (
                  <button
                    onClick={() => setShowPanoramaCapture(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-[#1C1C1E] rounded-xl border border-purple-500/30 hover:border-purple-500 transition-all"
                  >
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <Plus className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-white">Add 360°</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const panorama = selectedPlan.scans?.find(s => s.scan_type === 'panorama');
                      if (panorama?.data_url) {
                        const aiDesign = selectedPlan.scans?.find(s => s.scan_type === 'ai_design');
                        setViewingPanorama({
                          before: panorama.data_url,
                          after: aiDesign?.data_url || undefined
                        });
                        setShowPanoramaViewer(true);
                      }
                    }}
                    className="flex flex-col items-center gap-2 p-4 bg-[#1C1C1E] rounded-xl border border-purple-500/50 hover:border-purple-500 transition-all"
                  >
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <Eye className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-purple-400">View 360°</span>
                  </button>
                )}
              </div>

              {/* AI Design Section */}
              {selectedPlan.scans?.some(s => s.scan_type === 'panorama') && (
                <div className="bg-[#1C1C1E] rounded-xl p-4 border border-orange-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">AI Redesign</h4>
                      <p className="text-xs text-zinc-400">
                        {aiGenerationStatus
                          ? `${aiGenerationStatus.limit - aiGenerationStatus.count} free generations left`
                          : 'Transform your space with AI'}
                      </p>
                    </div>
                  </div>

                  {/* Existing AI designs */}
                  {selectedPlan.scans?.filter(s => s.scan_type === 'ai_design').map(scan => (
                    <div
                      key={scan.id}
                      className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg mb-2"
                    >
                      <Image className="w-5 h-5 text-orange-400" />
                      <span className="flex-1 text-sm text-white truncate">
                        {scan.prompt || 'AI Design'}
                      </span>
                      <button
                        onClick={() => {
                          const panorama = selectedPlan.scans?.find(s => s.scan_type === 'panorama');
                          if (panorama?.data_url && scan.data_url) {
                            setViewingPanorama({
                              before: panorama.data_url,
                              after: scan.data_url
                            });
                            setShowPanoramaViewer(true);
                          }
                        }}
                        className="p-1.5 text-orange-400 hover:bg-orange-500/20 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Add new AI design */}
                  <button
                    onClick={() => setShowAIPrompt(true)}
                    disabled={!canGenerateAI()}
                    className="w-full mt-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-5 h-5" />
                    {canGenerateAI() ? 'Generate AI Design' : 'Limit Reached'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Link to Project Modal */}
      {showLinkProject && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#1C1C1E] rounded-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-white text-lg mb-4">Link to Project</h3>
            <select
              value={selectedPlan?.project_id || ''}
              onChange={(e) => handleLinkProject(e.target.value)}
              className="w-full px-4 py-3 bg-[#2C2C2E] border border-zinc-700 rounded-xl text-white mb-4"
            >
              <option value="">No project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowLinkProject(false)}
              className="w-full py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* AI Prompt Modal */}
      {showAIPrompt && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#1C1C1E] rounded-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-white text-lg mb-2">Describe Your Vision</h3>
            <p className="text-sm text-zinc-400 mb-4">
              How would you like to transform this space?
            </p>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAIPrompt(e.target.value)}
              placeholder="e.g., Modern minimalist kitchen with white cabinets, marble countertops, and pendant lighting"
              rows={4}
              className="w-full px-4 py-3 bg-[#2C2C2E] border border-zinc-700 rounded-xl text-white placeholder-zinc-500 mb-4 resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAIPrompt(false);
                  setAIPrompt('');
                }}
                className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAIDesign}
                disabled={!aiPrompt.trim() || generatingAI}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panorama Capture Modal */}
      {showPanoramaCapture && selectedPlan && (
        <PanoramaCaptureModal
          isOpen={showPanoramaCapture}
          onClose={() => setShowPanoramaCapture(false)}
          onComplete={handlePanoramaComplete}
          planName={selectedPlan.name}
        />
      )}

      {/* Panorama Viewer */}
      {showPanoramaViewer && viewingPanorama && (
        <PanoramaViewer
          isOpen={showPanoramaViewer}
          onClose={() => {
            setShowPanoramaViewer(false);
            setViewingPanorama(null);
          }}
          beforeImageUrl={viewingPanorama.before}
          afterImageUrl={viewingPanorama.after}
          title={selectedPlan?.name}
        />
      )}
    </>
  );
};

export default PlanCreationModal;
