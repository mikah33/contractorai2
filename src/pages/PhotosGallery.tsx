import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Image,
  Filter,
  Camera,
  Briefcase,
  Loader2,
  Sparkles,
  X,
  Download,
  Share2,
  Mail,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Calendar,
  Eye,
  Wand2,
  Info
} from 'lucide-react';
import usePhotosStore, { ProjectPhoto } from '../stores/photosStore';
import useProjectStore from '../stores/projectStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import SendEmailModal from '../components/email/SendEmailModal';
import PhotosTutorialModal from '../components/photos/PhotosTutorialModal';
import VisionCamModal from '../components/vision/VisionCamModal';
import { supabase } from '../lib/supabase';
import { useTheme, getThemeClasses } from '../contexts/ThemeContext';

type FilterType = 'all' | 'project' | 'general' | 'ai-generated';

const PhotosGallery: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { photos, isLoading, fetchAllPhotos, deletePhoto } = usePhotosStore();
  const { projects, fetchProjects } = useProjectStore();
  const { photosTutorialCompleted, checkPhotosTutorial, setPhotosTutorialCompleted } = useOnboardingStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAttachment, setEmailAttachment] = useState<{ url: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialUserId, setTutorialUserId] = useState<string | null>(null);
  const [showVisionCam, setShowVisionCam] = useState(false);
  const [visionCamImage, setVisionCamImage] = useState<string | null>(null);

  useEffect(() => {
    fetchAllPhotos();
    fetchProjects();

    // Check tutorial status
    const checkTutorial = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setTutorialUserId(user.id);
        const completed = await checkPhotosTutorial(user.id);
        if (!completed) {
          setShowTutorial(true);
        }
      }
    };
    checkTutorial();
  }, []);

  const filteredPhotos = photos.filter(photo => {
    if (filter === 'all') return true;
    if (filter === 'project') return photo.projectId !== null && photo.category !== 'ai-generated';
    if (filter === 'general') return photo.projectId === null && photo.category !== 'ai-generated';
    if (filter === 'ai-generated') return photo.category === 'ai-generated';
    return true;
  }).filter(photo => {
    if (selectedProjectId) return photo.projectId === selectedProjectId;
    return true;
  });

  // Photo action handlers
  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev'
      ? (currentIndex - 1 + filteredPhotos.length) % filteredPhotos.length
      : (currentIndex + 1) % filteredPhotos.length;

    setSelectedPhoto(filteredPhotos[newIndex]);
    setShowActionMenu(false);
  };

  const handleDownload = async () => {
    if (!selectedPhoto) return;
    try {
      const response = await fetch(selectedPhoto.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo-${selectedPhoto.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setShowActionMenu(false);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image');
    }
  };

  const handleShare = async () => {
    if (!selectedPhoto) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: selectedPhoto.caption || 'Photo',
          text: selectedPhoto.caption || 'Check out this photo',
          url: selectedPhoto.imageUrl
        });
      } else {
        await navigator.clipboard.writeText(selectedPhoto.imageUrl);
        alert('Link copied to clipboard!');
      }
      setShowActionMenu(false);
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleEmailPhoto = () => {
    if (!selectedPhoto) return;
    setEmailAttachment({
      url: selectedPhoto.imageUrl,
      name: selectedPhoto.caption || `Photo ${selectedPhoto.id}`
    });
    setShowActionMenu(false);
    setShowEmailModal(true);
  };

  const handleDelete = async (photoId: string) => {
    await deletePhoto(photoId);
    setDeleteConfirm(null);
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
    }
  };

  // Group photos by project
  const photosByProject = photos.reduce((acc, photo) => {
    const key = photo.projectId || 'general';
    if (!acc[key]) {
      acc[key] = {
        projectId: photo.projectId,
        projectName: photo.projectName || 'General Photos',
        photos: []
      };
    }
    acc[key].photos.push(photo);
    return acc;
  }, {} as Record<string, { projectId: string | null; projectName: string; photos: typeof photos }>);

  return (
    <div className={`min-h-screen ${themeClasses.bg.primary} pb-24`}>
      {/* Header */}
      <div className={`${themeClasses.bg.secondary} border-b ${themeClasses.border.primary} px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sticky top-0 z-10`}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 ${themeClasses.text.primary} ${themeClasses.hover.bg} rounded-lg`}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className={`text-xl font-bold ${themeClasses.text.primary}`}>Photo Gallery</h1>
            <p className={`text-sm ${themeClasses.text.secondary}`}>{photos.length} total photos</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => { setFilter('all'); setSelectedProjectId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'all' && !selectedProjectId
                ? 'bg-[#043d6b] text-white'
                : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} ${themeClasses.hover.text}`
            }`}
          >
            <Image className="w-4 h-4" />
            All
          </button>
          <button
            onClick={() => { setFilter('project'); setSelectedProjectId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'project' && !selectedProjectId
                ? 'bg-[#043d6b] text-white'
                : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} ${themeClasses.hover.text}`
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Projects
          </button>
          <button
            onClick={() => { setFilter('general'); setSelectedProjectId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'general'
                ? 'bg-[#043d6b] text-white'
                : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} ${themeClasses.hover.text}`
            }`}
          >
            <Camera className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => { setFilter('ai-generated'); setSelectedProjectId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === 'ai-generated'
                ? 'bg-purple-500 text-white'
                : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} ${themeClasses.hover.text}`
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Generated
          </button>
        </div>

        {/* Project Filter (when viewing project photos) */}
        {filter === 'project' && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {Object.values(photosByProject)
              .filter(g => g.projectId !== null)
              .map(group => (
                <button
                  key={group.projectId}
                  onClick={() => setSelectedProjectId(group.projectId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedProjectId === group.projectId
                      ? 'bg-[#043d6b]/30 text-[#043d6b] border border-[#043d6b]'
                      : `${themeClasses.bg.tertiary} ${themeClasses.text.secondary} border border-transparent`
                  }`}
                >
                  {group.projectName} ({group.photos.length})
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Vision Cam Announcement Card */}
      <div className="px-4 pt-4">
        <div className={`flex items-start gap-3 p-4 rounded-xl ${theme === 'light' ? 'bg-gradient-to-r from-purple-50 to-[#043d6b] border border-purple-200' : 'bg-gradient-to-r from-purple-500/10 to-[#043d6b]/10 border border-purple-500/30'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${theme === 'light' ? 'bg-purple-100' : 'bg-purple-500/20'}`}>
            <Wand2 className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <p className={`font-semibold ${themeClasses.text.primary} mb-1`}>Vision Cam Feature</p>
            <p className={`text-sm ${themeClasses.text.secondary}`}>
              Click on any photo and use the Vision Cam feature to convey your customer's project to them!
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#043d6b] animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className={`text-center py-12 ${themeClasses.bg.card} rounded-xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'}`}>
            <Image className={`w-12 h-12 ${themeClasses.text.muted} mx-auto mb-3`} />
            <p className={`${themeClasses.text.secondary} font-medium`}>No photos yet</p>
            <p className={`text-sm ${themeClasses.text.muted} mt-1`}>Use the + button to capture photos</p>
          </div>
        ) : (
          // Show grid view for all filters
          <div className="space-y-6">
            {filter === 'all' && !selectedProjectId ? (
              // Grouped by project view
              Object.values(photosByProject).map(group => (
                <div key={group.projectId || 'general'} className={`${themeClasses.bg.card} rounded-xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'} overflow-hidden`}>
                  <div className={`flex items-center justify-between p-4 border-b ${themeClasses.border.primary}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        group.projectId ? 'bg-[#043d6b]/20' : themeClasses.bg.tertiary
                      }`}>
                        {group.projectId ? (
                          <Briefcase className="w-5 h-5 text-[#043d6b]" />
                        ) : (
                          <Camera className={`w-5 h-5 ${themeClasses.text.muted}`} />
                        )}
                      </div>
                      <div>
                        <p className={`font-semibold ${themeClasses.text.primary}`}>{group.projectName}</p>
                        <p className={`text-xs ${themeClasses.text.muted}`}>{group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-4 gap-2">
                      {group.photos.slice(0, 8).map(photo => (
                        <img
                          key={photo.id}
                          src={photo.imageUrl}
                          alt={photo.caption || 'Photo'}
                          className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedPhoto(photo)}
                        />
                      ))}
                    </div>
                    {group.photos.length > 8 && (
                      <button
                        onClick={() => {
                          if (group.projectId) {
                            setFilter('project');
                            setSelectedProjectId(group.projectId);
                          } else {
                            setFilter('general');
                          }
                        }}
                        className="w-full mt-3 py-2 text-sm text-[#043d6b] font-medium"
                      >
                        View all {group.photos.length} photos
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : filteredPhotos.length === 0 ? (
              // No photos for this filter
              <div className={`text-center py-12 ${themeClasses.bg.card} rounded-xl border-2 ${theme === 'light' ? 'border-gray-300' : 'border-zinc-600'}`}>
                {filter === 'ai-generated' ? (
                  <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                ) : (
                  <Image className={`w-12 h-12 ${themeClasses.text.muted} mx-auto mb-3`} />
                )}
                <p className={`${themeClasses.text.secondary} font-medium`}>No photos in this category</p>
                <p className={`text-sm ${themeClasses.text.muted} mt-1`}>
                  {filter === 'project' ? 'Add photos to your projects' :
                   filter === 'ai-generated' ? 'Use Vision Cam to generate AI visualizations' :
                   'Take some general photos to see them here'}
                </p>
              </div>
            ) : (
              // Flat grid view for Projects/General filters
              <div className="grid grid-cols-3 gap-2">
                {filteredPhotos.map(photo => (
                  <div
                    key={photo.id}
                    className={`relative aspect-square rounded-lg overflow-hidden ${themeClasses.bg.tertiary} cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.imageUrl}
                      alt={photo.caption || 'Photo'}
                      className="w-full h-full object-cover"
                    />
                    {filter === 'project' && !selectedProjectId && photo.projectName && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white truncate">{photo.projectName}</p>
                      </div>
                    )}
                    {photo.category === 'ai-generated' && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Screen Photo Viewer */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50">
            <button
              onClick={() => { setSelectedPhoto(null); setShowActionMenu(false); }}
              className="p-2 text-white hover:bg-white/10 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center flex-1">
              {selectedPhoto.category === 'ai-generated' && (
                <div className="flex items-center justify-center gap-2 text-purple-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">AI Generated</span>
                </div>
              )}
              {selectedPhoto.projectName && (
                <div className="flex items-center justify-center gap-2 text-[#043d6b]">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedPhoto.projectName}</span>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs mt-1">
                <Calendar className="w-3 h-3" />
                {new Date(selectedPhoto.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="p-2 text-white hover:bg-white/10 rounded-lg"
            >
              <MoreVertical className="w-6 h-6" />
            </button>
          </div>

          {/* Action Menu Dropdown */}
          {showActionMenu && (
            <div className={`absolute top-16 right-4 ${themeClasses.bg.secondary} rounded-xl overflow-hidden shadow-2xl z-10 border ${themeClasses.border.primary}`}>
              <button
                onClick={() => {
                  if (selectedPhoto) {
                    setVisionCamImage(selectedPhoto.imageUrl);
                    setShowVisionCam(true);
                    setShowActionMenu(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 ${themeClasses.text.primary} hover:bg-purple-500/10 transition-colors`}
              >
                <Wand2 className="w-5 h-5 text-purple-500" />
                <span>Use Vision Cam</span>
              </button>
              <button
                onClick={handleDownload}
                className={`w-full flex items-center gap-3 px-4 py-3 ${themeClasses.text.primary} ${themeClasses.hover.bg} transition-colors border-t ${themeClasses.border.primary}`}
              >
                <Download className="w-5 h-5 text-[#043d6b]" />
                <span>Download</span>
              </button>
              <button
                onClick={handleShare}
                className={`w-full flex items-center gap-3 px-4 py-3 ${themeClasses.text.primary} ${themeClasses.hover.bg} transition-colors border-t ${themeClasses.border.primary}`}
              >
                <Share2 className="w-5 h-5 text-green-400" />
                <span>Share</span>
              </button>
              <button
                onClick={handleEmailPhoto}
                className={`w-full flex items-center gap-3 px-4 py-3 ${themeClasses.text.primary} ${themeClasses.hover.bg} transition-colors border-t ${themeClasses.border.primary}`}
              >
                <Mail className="w-5 h-5 text-cyan-400" />
                <span>Send Email</span>
              </button>
              <button
                onClick={() => { setDeleteConfirm(selectedPhoto.id); setShowActionMenu(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors border-t ${themeClasses.border.primary}`}
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Image */}
          <div className="flex-1 flex items-center justify-center relative" onClick={() => setShowActionMenu(false)}>
            <img
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.caption || 'Photo'}
              className="max-w-full max-h-full object-contain"
            />

            {/* Navigation Arrows */}
            {filteredPhotos.length > 1 && (
              <>
                <button
                  onClick={() => navigatePhoto('prev')}
                  className="absolute left-4 p-3 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => navigatePhoto('next')}
                  className="absolute right-4 p-3 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Caption */}
          {selectedPhoto.caption && (
            <div className="p-4 bg-black/50 text-center">
              <p className="text-white">{selectedPhoto.caption}</p>
            </div>
          )}

          {/* Photo Counter */}
          <div className="p-4 bg-black/50 text-center">
            <p className="text-zinc-400 text-sm">
              {filteredPhotos.findIndex(p => p.id === selectedPhoto.id) + 1} of {filteredPhotos.length}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteConfirm(null)} />
          <div className={`relative ${themeClasses.bg.secondary} rounded-2xl p-6 max-w-sm w-full`}>
            <h3 className={`text-lg font-bold ${themeClasses.text.primary} mb-2`}>Delete Photo?</h3>
            <p className={`${themeClasses.text.secondary} mb-6`}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 py-3 ${themeClasses.bg.tertiary} ${themeClasses.text.primary} rounded-xl font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setEmailAttachment(null);
        }}
        initialAttachments={emailAttachment ? [emailAttachment] : undefined}
      />

      {/* Photos Tutorial Modal */}
      <PhotosTutorialModal
        isOpen={showTutorial}
        onComplete={(dontShowAgain) => {
          setShowTutorial(false);
          if (dontShowAgain && tutorialUserId) {
            setPhotosTutorialCompleted(tutorialUserId, true);
          }
        }}
      />

      {/* Vision Cam Modal */}
      <VisionCamModal
        isOpen={showVisionCam}
        onClose={() => {
          setShowVisionCam(false);
          setVisionCamImage(null);
        }}
        initialImage={visionCamImage || undefined}
      />
    </div>
  );
};

export default PhotosGallery;
