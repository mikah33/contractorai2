import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Images,
  Camera,
  Plus,
  ChevronDown,
  ChevronUp,
  Briefcase,
  X,
  Trash2,
  MessageSquare,
  Eye,
  Search,
  FolderPlus,
  Loader2,
  ImageIcon
} from 'lucide-react';
// Uses native file inputs with capture="environment" for fastest iOS camera access
import usePhotosStore, { ProjectPhoto } from '../stores/photosStore';
import useProjectStore from '../stores/projectStore';
import VisionCamModal from '../components/vision/VisionCamModal';
import { supabase } from '../lib/supabase';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';

const GalleryHub: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  const { photos, isLoading: photosLoading, fetchAllPhotos, addPhoto, updatePhoto, deletePhoto } = usePhotosStore();
  const { projects, fetchProjects, loading: projectsLoading } = useProjectStore();

  // Expand/collapse
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());
  const [unassignedExpanded, setUnassignedExpanded] = useState(true);

  // Camera capture
  const [captureForProjectId, setCaptureForProjectId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Image viewer
  const [viewingPhoto, setViewingPhoto] = useState<ProjectPhoto | null>(null);
  const [showViewerNotes, setShowViewerNotes] = useState(false);
  const [viewerNotes, setViewerNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVisionCam, setShowVisionCam] = useState(false);
  const [showViewerAttach, setShowViewerAttach] = useState(false);

  // Project search
  const [projectSearch, setProjectSearch] = useState('');

  // File inputs - camera and gallery picker
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllPhotos();
    fetchProjects();
  }, []);

  // Derived data
  const unassignedPhotos = photos.filter(p => !p.projectId);
  const photosByProject = photos.reduce((acc, photo) => {
    if (photo.projectId) {
      if (!acc[photo.projectId]) acc[photo.projectId] = [];
      acc[photo.projectId].push(photo);
    }
    return acc;
  }, {} as Record<string, ProjectPhoto[]>);

  // Toggle expand
  const toggleProject = (id: string) => {
    setExpandedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Camera capture - uses native file inputs for fastest iOS camera
  const handleTakePhoto = (forProjectId: string | null) => {
    setCaptureForProjectId(forProjectId);
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleAddFromGallery = (forProjectId: string | null) => {
    setCaptureForProjectId(forProjectId);
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = '';

    // Auto-save immediately - no preview screen
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';
      const projectId = captureForProjectId;
      const fileName = `${userId}/${projectId || 'general'}/${Date.now()}.jpg`;

      let bucketName = 'project-photos';
      let { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, file);

      if (uploadError?.message?.includes('not found')) {
        bucketName = 'receipt-images';
        const result = await supabase.storage.from(bucketName).upload(fileName, file);
        uploadError = result.error;
      }

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);

      await addPhoto({
        userId,
        projectId: projectId,
        imageUrl: publicUrl,
        caption: undefined,
        category: projectId ? 'project' : 'general',
        isProgressPhoto: !!projectId,
        metadata: {}
      });

      await fetchAllPhotos();
    } catch (error) {
      console.error('Save photo error:', error);
    } finally {
      setIsUploading(false);
      setCaptureForProjectId(null);
    }
  };

  // Image viewer actions
  const openViewer = (photo: ProjectPhoto) => {
    setViewingPhoto(photo);
    setViewerNotes(photo.caption || '');
  };

  const closeViewer = () => {
    setViewingPhoto(null);
    setShowViewerNotes(false);
    setShowDeleteConfirm(false);
    setShowVisionCam(false);
    setShowViewerAttach(false);
  };

  const handleSaveNotes = async () => {
    if (!viewingPhoto) return;
    setSavingNotes(true);
    await updatePhoto(viewingPhoto.id, { caption: viewerNotes });
    setViewingPhoto({ ...viewingPhoto, caption: viewerNotes });
    setSavingNotes(false);
    setShowViewerNotes(false);
    await fetchAllPhotos();
  };

  const handleDeletePhoto = async () => {
    if (!viewingPhoto) return;
    await deletePhoto(viewingPhoto.id);
    closeViewer();
    await fetchAllPhotos();
  };

  const handleAttachToProject = async (projectId: string) => {
    if (viewingPhoto) {
      await updatePhoto(viewingPhoto.id, { projectId });
      closeViewer();
      await fetchAllPhotos();
    }
    setShowViewerAttach(false);
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const isLoading = photosLoading || projectsLoading;

  // Thumbnail component
  const PhotoThumb = ({ photo }: { photo: ProjectPhoto }) => (
    <button
      onClick={() => openViewer(photo)}
      className="aspect-square rounded-lg overflow-hidden bg-zinc-800 relative"
    >
      <img
        src={photo.imageUrl}
        alt={photo.caption || ''}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {photo.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
          <MessageSquare className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </button>
  );

  return (
    <div className={`min-h-screen ${themeClasses.bg.primary} pb-24`}>
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-40 ${themeClasses.bg.secondary} border-b ${themeClasses.border.primary}`}>
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="px-4 pb-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-theme/15 rounded-xl flex items-center justify-center">
                <Images className="w-6 h-6 text-theme" />
              </div>
              <div className="flex-1">
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Gallery</h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>{photos.length} photos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-[calc(env(safe-area-inset-top)+88px)]" />

      {isLoading && photos.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-theme" />
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {/* Quick Photo CTA */}
          <div className="flex gap-3">
            <button
              onClick={() => handleTakePhoto(null)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-theme rounded-xl active:scale-[0.98] transition-transform"
            >
              <Camera className="w-5 h-5 text-white" />
              <span className="text-white font-semibold text-sm">Take Photo</span>
            </button>
            <button
              onClick={() => handleAddFromGallery(null)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 ${themeClasses.bg.card} border ${themeClasses.border.primary} rounded-xl active:scale-[0.98] transition-transform`}
            >
              <ImageIcon className="w-5 h-5 text-theme" />
              <span className={`font-semibold text-sm ${themeClasses.text.primary}`}>From Gallery</span>
            </button>
          </div>

          {/* Projects */}
          <div>
            <h2 className={`font-bold text-lg ${themeClasses.text.primary} mb-3`}>Projects</h2>
            <div className="space-y-3">
              {projects.map(project => {
                const projectPhotos = photosByProject[project.id] || [];
                const isExpanded = expandedProjectIds.has(project.id);

                return (
                  <div key={project.id} className={`${themeClasses.bg.card} rounded-xl border ${themeClasses.border.primary} overflow-hidden`}>
                    <div className="flex items-center p-4">
                      <button
                        onClick={() => toggleProject(project.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className="w-9 h-9 bg-theme/15 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-4.5 h-4.5 text-theme" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${themeClasses.text.primary} truncate`}>{project.name}</p>
                          <p className={`text-xs ${themeClasses.text.secondary}`}>{projectPhotos.length} photos</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-zinc-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleTakePhoto(project.id)}
                        className="ml-3 flex items-center gap-1.5 px-3 py-2 bg-theme rounded-lg active:scale-95 transition-transform"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-semibold">Add Image</span>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {projectPhotos.length === 0 ? (
                          <p className={`text-center py-4 text-sm ${themeClasses.text.muted}`}>No photos yet</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {projectPhotos.map(photo => (
                              <PhotoThumb key={photo.id} photo={photo} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {projects.length === 0 && !projectsLoading && (
                <p className={`text-center py-8 ${themeClasses.text.muted}`}>No projects yet</p>
              )}
            </div>

            {/* Unassigned Photos */}
            <div className={`${themeClasses.bg.card} rounded-xl border ${themeClasses.border.primary} overflow-hidden`}>
              <button
                onClick={() => setUnassignedExpanded(!unassignedExpanded)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-zinc-500/15 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-4.5 h-4.5 text-zinc-500" />
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${themeClasses.text.primary}`}>Unassigned Photos</p>
                    <p className={`text-xs ${themeClasses.text.secondary}`}>{unassignedPhotos.length} photos</p>
                  </div>
                </div>
                {unassignedExpanded ? (
                  <ChevronUp className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                )}
              </button>
              {unassignedExpanded && (
                <div className="px-4 pb-4">
                  {unassignedPhotos.length === 0 ? (
                    <p className={`text-center py-4 text-sm ${themeClasses.text.muted}`}>No unassigned photos</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {unassignedPhotos.map(photo => (
                        <PhotoThumb key={photo.id} photo={photo} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== SAVING OVERLAY ===== */}
      {isUploading && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center">
          <div className={`${themeClasses.bg.card} rounded-2xl p-8 flex flex-col items-center gap-3`}>
            <Loader2 className="w-8 h-8 animate-spin text-theme" />
            <p className={`font-semibold ${themeClasses.text.primary}`}>Saving photo...</p>
          </div>
        </div>
      )}

      {/* ===== IMAGE VIEWER ===== */}
      {viewingPhoto && !showVisionCam && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col">
          {/* Close */}
          <div className="absolute top-0 right-0 z-10 pt-[calc(env(safe-area-inset-top)+12px)] pr-4">
            <button onClick={closeViewer} className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={viewingPhoto.imageUrl} alt={viewingPhoto.caption || ''} className="max-w-full max-h-full object-contain rounded-lg" />
          </div>

          {/* Caption display */}
          {viewingPhoto.caption && (
            <div className="px-4 pb-2">
              <p className="text-white/70 text-sm text-center">{viewingPhoto.caption}</p>
            </div>
          )}

          {/* Bottom action bar */}
          <div className="pb-[calc(env(safe-area-inset-bottom)+16px)] px-4 pt-3 bg-black/80">
            <div className={`grid ${viewingPhoto.projectId ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
              <button
                onClick={() => { setViewerNotes(viewingPhoto.caption || ''); setShowViewerNotes(true); }}
                className="flex flex-col items-center gap-1.5 py-3 bg-white/10 rounded-xl active:bg-white/20"
              >
                <MessageSquare className="w-5 h-5 text-white" />
                <span className="text-white text-xs font-medium">Notes</span>
              </button>
              <button
                onClick={() => setShowVisionCam(true)}
                className="flex flex-col items-center gap-1.5 py-3 bg-white/10 rounded-xl active:bg-white/20"
              >
                <Eye className="w-5 h-5 text-white" />
                <span className="text-white text-xs font-medium">Vision</span>
              </button>
              {!viewingPhoto.projectId && (
                <button
                  onClick={() => { setProjectSearch(''); setShowViewerAttach(true); }}
                  className="flex flex-col items-center gap-1.5 py-3 bg-white/10 rounded-xl active:bg-white/20"
                >
                  <FolderPlus className="w-5 h-5 text-white" />
                  <span className="text-white text-xs font-medium">Attach</span>
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex flex-col items-center gap-1.5 py-3 bg-red-500/20 rounded-xl active:bg-red-500/30"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-xs font-medium">Remove</span>
              </button>
            </div>
          </div>

          {/* Notes Bottom Sheet */}
          {showViewerNotes && (
            <div className="fixed inset-0 z-[120] flex items-end">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowViewerNotes(false)} />
              <div className={`relative w-full ${themeClasses.bg.secondary} rounded-t-2xl pb-[env(safe-area-inset-bottom)]`}>
                <div className="w-10 h-1 bg-zinc-400 rounded-full mx-auto mt-3 mb-4" />
                <div className="px-4 pb-4">
                  <h3 className={`font-bold text-lg ${themeClasses.text.primary} mb-3`}>Photo Notes</h3>
                  <textarea
                    value={viewerNotes}
                    onChange={(e) => setViewerNotes(e.target.value)}
                    placeholder="Add notes to this photo..."
                    className={`w-full h-28 p-3 ${themeClasses.bg.input} ${themeClasses.text.primary} rounded-xl border ${themeClasses.border.primary} resize-none focus:ring-2 focus:ring-theme outline-none`}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="w-full mt-3 py-3 bg-theme text-white rounded-xl font-semibold active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Viewer Attach to Project Sheet */}
          {showViewerAttach && (
            <div className="fixed inset-0 z-[120] flex items-end">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowViewerAttach(false)} />
              <div className={`relative w-full max-h-[70vh] ${themeClasses.bg.secondary} rounded-t-2xl pb-[env(safe-area-inset-bottom)] flex flex-col`}>
                <div className="w-10 h-1 bg-zinc-400 rounded-full mx-auto mt-3 mb-4" />
                <div className="px-4 pb-2">
                  <h3 className={`font-bold text-lg ${themeClasses.text.primary} mb-3`}>Attach to Project</h3>
                  <div className={`flex items-center gap-2 px-3 py-2.5 ${themeClasses.bg.input} rounded-lg border ${themeClasses.border.primary} mb-3`}>
                    <Search className="w-4 h-4 text-zinc-400" />
                    <input
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search projects..."
                      className={`flex-1 bg-transparent outline-none text-sm ${themeClasses.text.primary}`}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  {filteredProjects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => handleAttachToProject(project.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl active:bg-theme/10"
                    >
                      <Briefcase className="w-5 h-5 text-theme" />
                      <span className={`font-medium ${themeClasses.text.primary}`}>{project.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirm */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" />
              <div className={`relative ${themeClasses.bg.card} rounded-2xl p-6 mx-8 max-w-sm w-full`}>
                <h3 className={`font-bold text-lg ${themeClasses.text.primary} mb-2`}>Delete Photo?</h3>
                <p className={`${themeClasses.text.secondary} text-sm mb-6`}>Are you sure you want to delete this photo? This cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`flex-1 py-3 rounded-xl font-semibold border ${themeClasses.border.primary} ${themeClasses.text.primary} active:scale-[0.98]`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePhoto}
                    className="flex-1 py-3 rounded-xl font-semibold bg-red-500 text-white active:scale-[0.98]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vision Cam Modal */}
      <VisionCamModal
        isOpen={showVisionCam}
        onClose={() => setShowVisionCam(false)}
        initialImage={viewingPhoto?.imageUrl || undefined}
      />
    </div>
  );
};

export default GalleryHub;
