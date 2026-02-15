import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Camera,
  Eye,
  Briefcase,
  Images,
  Loader2,
  Check,
  ChevronRight,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useProjectStore from '../../stores/projectStore';
import usePhotosStore from '../../stores/photosStore';
import VisionCamModal from '../vision/VisionCamModal';

interface CameraHubProps {
  isOpen: boolean;
  onClose: () => void;
}

type CameraMode = 'regular' | 'project';

const CameraHub: React.FC<CameraHubProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { projects, fetchProjects } = useProjectStore();
  const { addPhotos } = usePhotosStore();

  const [mode, setMode] = useState<CameraMode>('regular');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showVisionCam, setShowVisionCam] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      // Auto-trigger camera when modal opens
      setTimeout(() => {
        cameraInputRef.current?.click();
      }, 100);
    }
  }, [isOpen, fetchProjects]);

  const resetState = () => {
    setMode('regular');
    setSelectedProjectId(null);
    setSelectedProjectName('');
    setShowProjectPicker(false);
    setShowVisionCam(false);
    setCapturedPhoto(null);
    setCapturedFile(null);
    setIsUploading(false);
    setUploadSuccess(false);
    setProjectSearch('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // User cancelled - close if no photo taken yet
      if (!capturedPhoto) {
        handleClose();
      }
      return;
    }

    const url = URL.createObjectURL(file);
    setCapturedPhoto(url);
    setCapturedFile(file);
    e.target.value = '';
  };

  const handleUploadPhoto = async () => {
    if (!capturedFile) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      const fileName = `${userId}/${selectedProjectId || 'general'}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(fileName, capturedFile);

      let publicUrl = '';
      if (uploadError) {
        // Try fallback bucket
        const { error: fallbackError } = await supabase.storage
          .from('receipt-images')
          .upload(fileName, capturedFile);

        if (fallbackError) throw fallbackError;

        const { data } = supabase.storage
          .from('receipt-images')
          .getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      } else {
        const { data } = supabase.storage
          .from('project-photos')
          .getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      // Save to database
      await addPhotos([{
        userId,
        projectId: selectedProjectId,
        imageUrl: publicUrl,
        category: selectedProjectId ? 'project' : 'general',
        isProgressPhoto: !!selectedProjectId,
        metadata: {}
      }]);

      // Clean up
      if (capturedPhoto?.startsWith('blob:')) {
        URL.revokeObjectURL(capturedPhoto);
      }

      setUploadSuccess(true);
      setTimeout(() => {
        setCapturedPhoto(null);
        setCapturedFile(null);
        setUploadSuccess(false);
        // Trigger camera again for next photo
        cameraInputRef.current?.click();
      }, 1500);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to save photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProjectSelect = (projectId: string, projectName: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
    setMode('project');
    setShowProjectPicker(false);
  };

  const handleTakeAnother = () => {
    if (capturedPhoto?.startsWith('blob:')) {
      URL.revokeObjectURL(capturedPhoto);
    }
    setCapturedPhoto(null);
    setCapturedFile(null);
    cameraInputRef.current?.click();
  };

  const handleOpenGallery = () => {
    handleClose();
    setTimeout(() => navigate('/photos-gallery'), 100);
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p.client && p.client.toLowerCase().includes(projectSearch.toLowerCase()))
  );

  if (!isOpen) return null;

  // If Vision Cam is open, show that instead
  if (showVisionCam) {
    return (
      <VisionCamModal
        isOpen={true}
        onClose={() => setShowVisionCam(false)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={handleClose}
          className="p-2 -ml-2 text-white/70 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          {mode === 'project' && selectedProjectName && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#043d6b] rounded-full">
              <Briefcase className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">{selectedProjectName}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleOpenGallery}
          className="p-2 -mr-2 text-white/70 hover:text-white"
        >
          <Images className="w-6 h-6" />
        </button>
      </div>

      {/* Camera View Area */}
      <div className="flex-1 flex items-center justify-center bg-zinc-900 relative">
        {capturedPhoto ? (
          // Preview captured photo
          <div className="relative w-full h-full">
            <img
              src={capturedPhoto}
              alt="Captured"
              className="w-full h-full object-contain"
            />

            {/* Upload overlay */}
            {uploadSuccess && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white font-semibold">Photo Saved!</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Placeholder when no photo
          <div className="flex flex-col items-center gap-4 text-white/50">
            <Camera className="w-20 h-20" />
            <p className="text-lg">Tap capture to take a photo</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div
        className="bg-black px-6 py-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        {capturedPhoto && !uploadSuccess ? (
          // Photo taken - show save/retake options
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleTakeAnother}
              className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-medium active:scale-95 transition-transform"
            >
              Retake
            </button>
            <button
              onClick={handleUploadPhoto}
              disabled={isUploading}
              className="flex-1 py-3 bg-[#043d6b] text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save Photo
                </>
              )}
            </button>
          </div>
        ) : (
          // Camera mode - show mode buttons and capture
          <div className="flex items-center justify-between">
            {/* Left: Vision Cam */}
            <button
              onClick={() => setShowVisionCam(true)}
              className="flex flex-col items-center gap-1.5 p-3 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-[#043d6b] rounded-xl flex items-center justify-center">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-white/70 font-medium">Vision</span>
            </button>

            {/* Center: Capture Button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 bg-white rounded-full" />
            </button>

            {/* Right: Project Photos */}
            <button
              onClick={() => setShowProjectPicker(true)}
              className={`flex flex-col items-center gap-1.5 p-3 active:scale-95 transition-transform ${
                mode === 'project' ? 'opacity-100' : 'opacity-70'
              }`}
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                mode === 'project'
                  ? 'bg-[#043d6b]'
                  : 'bg-zinc-800 border-2 border-zinc-600'
              }`}>
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-white/70 font-medium">Project</span>
            </button>
          </div>
        )}
      </div>

      {/* Hidden camera inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Project Picker Bottom Sheet */}
      {showProjectPicker && (
        <div className="fixed inset-0 z-[210] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowProjectPicker(false)}
          />
          <div className="relative w-full max-w-lg bg-[#1C1C1E] rounded-t-2xl max-h-[70vh] overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#3A3A3C] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-lg">Select Project</h3>
              <button
                onClick={() => setShowProjectPicker(false)}
                className="p-2 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#2C2C2E] rounded-xl">
                <Search className="w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none"
                />
              </div>
            </div>

            {/* Clear Project Option */}
            {mode === 'project' && (
              <div className="px-4 pb-2">
                <button
                  onClick={() => {
                    setMode('regular');
                    setSelectedProjectId(null);
                    setSelectedProjectName('');
                    setShowProjectPicker(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl text-zinc-400 active:scale-[0.98] transition-all"
                >
                  <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center">
                    <X className="w-5 h-5 text-zinc-400" />
                  </div>
                  <span className="font-medium">Clear Project Selection</span>
                </button>
              </div>
            )}

            {/* Project List */}
            <div className="px-4 pb-6 overflow-y-auto max-h-[50vh]">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">No projects found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id, project.name)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl active:scale-[0.98] transition-all ${
                        selectedProjectId === project.id
                          ? 'bg-[#043d6b] border-2 border-[#043d6b]'
                          : 'bg-[#2C2C2E] hover:bg-[#3C3C3E]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedProjectId === project.id
                          ? 'bg-white/20'
                          : 'bg-[#043d6b]/20'
                      }`}>
                        <Briefcase className={`w-5 h-5 ${
                          selectedProjectId === project.id ? 'text-white' : 'text-[#043d6b]'
                        }`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${
                          selectedProjectId === project.id ? 'text-white' : 'text-white'
                        }`}>{project.name}</p>
                        <p className={`text-sm ${
                          selectedProjectId === project.id ? 'text-white/70' : 'text-zinc-500'
                        }`}>{project.client || 'No client'}</p>
                      </div>
                      {selectedProjectId === project.id && (
                        <Check className="w-5 h-5 text-white" />
                      )}
                      <ChevronRight className={`w-5 h-5 ${
                        selectedProjectId === project.id ? 'text-white/50' : 'text-zinc-600'
                      }`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraHub;
