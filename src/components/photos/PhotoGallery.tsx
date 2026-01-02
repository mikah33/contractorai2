import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image,
  Calendar,
  Briefcase,
  Loader2,
  ZoomIn,
  Download,
  Share2,
  Mail,
  MoreVertical,
  Sparkles
} from 'lucide-react';
import usePhotosStore, { ProjectPhoto } from '../../stores/photosStore';
import SendEmailModal from '../email/SendEmailModal';

interface PhotoGalleryProps {
  projectId?: string;
  showProjectFilter?: boolean;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ projectId, showProjectFilter = false }) => {
  const { photos, isLoading, fetchPhotos, deletePhoto } = usePhotosStore();
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAttachment, setEmailAttachment] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    fetchPhotos(projectId);
  }, [projectId, fetchPhotos]);

  const handleDelete = async (photoId: string) => {
    await deletePhoto(photoId);
    setDeleteConfirm(null);
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
    }
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev'
      ? (currentIndex - 1 + photos.length) % photos.length
      : (currentIndex + 1) % photos.length;

    setSelectedPhoto(photos[newIndex]);
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
        // Fallback: copy link to clipboard
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 bg-[#1C1C1E] rounded-xl border border-orange-500/30">
        <Image className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 font-medium">No photos yet</p>
        <p className="text-sm text-zinc-500 mt-1">
          {projectId ? 'Add photos to this project using the + button' : 'Use the + button to capture photos'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 group"
          >
            <img
              src={photo.imageUrl}
              alt={photo.caption || 'Photo'}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                onClick={() => setSelectedPhoto(photo)}
                className="p-2 bg-black/50 rounded-full"
              >
                <ZoomIn className="w-5 h-5 text-white" />
              </button>
            </div>
            {photo.projectName && showProjectFilter && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-xs text-white truncate">{photo.projectName}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full Screen Viewer */}
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
                <div className="flex items-center justify-center gap-2 text-orange-500">
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
            <div className="absolute top-16 right-4 bg-[#2C2C2E] rounded-xl overflow-hidden shadow-2xl z-10 border border-zinc-700">
              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors"
              >
                <Download className="w-5 h-5 text-blue-400" />
                <span>Download</span>
              </button>
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors border-t border-zinc-700"
              >
                <Share2 className="w-5 h-5 text-green-400" />
                <span>Share</span>
              </button>
              <button
                onClick={handleEmailPhoto}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors border-t border-zinc-700"
              >
                <Mail className="w-5 h-5 text-cyan-400" />
                <span>Send Email</span>
              </button>
              <button
                onClick={() => { setDeleteConfirm(selectedPhoto.id); setShowActionMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors border-t border-zinc-700"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Image */}
          <div className="flex-1 flex items-center justify-center relative">
            <img
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.caption || 'Photo'}
              className="max-w-full max-h-full object-contain"
            />

            {/* Navigation Arrows */}
            {photos.length > 1 && (
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
              {photos.findIndex(p => p.id === selectedPhoto.id) + 1} of {photos.length}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[#1C1C1E] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Delete Photo?</h3>
            <p className="text-zinc-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-zinc-700 text-white rounded-xl font-medium"
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
    </>
  );
};

export default PhotoGallery;
