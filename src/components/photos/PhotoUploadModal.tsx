import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Camera,
  Image,
  FolderPlus,
  Briefcase,
  ChevronRight,
  Check,
  Loader2,
  Trash2,
  Plus,
  Images
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useProjectStore from '../../stores/projectStore';
import usePhotosStore from '../../stores/photosStore';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'choose-destination' | 'capture-photos' | 'review';

interface PhotoItem {
  id: string;
  url: string;
  file?: File;
}

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { projects, fetchProjects, addProject } = useProjectStore();
  const { addPhotos } = usePhotosStore();
  const [step, setStep] = useState<Step>('choose-destination');
  const [destination, setDestination] = useState<'project' | 'new-project' | 'none' | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, fetchProjects]);

  const resetModal = () => {
    setStep('choose-destination');
    setDestination(null);
    setSelectedProjectId(null);
    setNewProjectName('');
    setPhotos([]);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      resetModal();
      onClose();
    }, 300);
  };

  const handleViewGallery = () => {
    handleClose();
    setTimeout(() => navigate('/photos-gallery'), 350);
  };

  const handleDestinationSelect = (dest: 'project' | 'new-project' | 'none') => {
    setDestination(dest);
    if (dest === 'none') {
      setStep('capture-photos');
    }
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setStep('capture-photos');
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      await addProject({
        name: newProjectName.trim(),
        client: '',
        status: 'active',
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 0,
        description: ''
      });

      // Get the newly created project
      await fetchProjects(true);
      const newProject = projects.find(p => p.name === newProjectName.trim());
      if (newProject) {
        setSelectedProjectId(newProject.id);
      }
      setStep('capture-photos');
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newPhotos.push({
        id: `${Date.now()}-${i}`,
        url,
        file
      });
    }
    setPhotos(prev => [...prev, ...newPhotos]);

    // Clear input so same file can be selected again
    e.target.value = '';
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo?.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  const handleUploadPhotos = async () => {
    if (photos.length === 0) {
      alert('Please add at least one photo');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      const uploadedUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (!photo.file) continue;

        const fileName = `${userId}/${selectedProjectId || 'general'}/${Date.now()}-${i}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('project-photos')
          .upload(fileName, photo.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          // Try receipt-images bucket as fallback
          const { error: fallbackError } = await supabase.storage
            .from('receipt-images')
            .upload(fileName, photo.file);

          if (fallbackError) {
            console.error('Fallback upload error:', fallbackError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('receipt-images')
            .getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('project-photos')
            .getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        }

        setUploadProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      // Save photo records to database using the photos store
      if (uploadedUrls.length > 0) {
        const photoRecords = uploadedUrls.map(url => ({
          userId,
          projectId: selectedProjectId,
          imageUrl: url,
          category: selectedProjectId ? 'project' : 'general',
          isProgressPhoto: !!selectedProjectId,
          metadata: {}
        }));

        await addPhotos(photoRecords);
      }

      // Clean up blob URLs
      photos.forEach(photo => {
        if (photo.url.startsWith('blob:')) {
          URL.revokeObjectURL(photo.url);
        }
      });

      alert(`Successfully uploaded ${uploadedUrls.length} photo(s)!`);
      handleClose();
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  // Theme-aware colors
  const bgModal = theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]';
  const bgCard = theme === 'light' ? 'bg-gray-100' : 'bg-[#2C2C2E]';
  const bgCardHover = theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-[#3C3C3E]';
  const bgHandle = theme === 'light' ? 'bg-gray-300' : 'bg-[#3A3A3C]';
  const textPrimary = theme === 'light' ? 'text-gray-900' : 'text-white';
  const textSecondary = theme === 'light' ? 'text-gray-500' : 'text-zinc-400';
  const textMuted = theme === 'light' ? 'text-gray-400' : 'text-zinc-500';
  const borderColor = theme === 'light' ? 'border-gray-200' : 'border-[#043d6b]/30';
  const inputBg = theme === 'light' ? 'bg-gray-100 border-gray-300' : 'bg-[#2C2C2E] border-[#3A3A3C]';
  const inputText = theme === 'light' ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-zinc-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg ${bgModal} rounded-2xl max-h-[85vh] overflow-hidden shadow-2xl transition-all duration-300 ${
          isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.2] translate-y-[60%]'
        }`}
        style={{ transformOrigin: 'bottom center' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 pt-5 pb-4 border-b ${borderColor}`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#043d6b]/20 rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-[#043d6b]" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>
                {step === 'choose-destination' && 'Add Photos'}
                {step === 'capture-photos' && 'Capture Photos'}
                {step === 'review' && 'Review Photos'}
              </h2>
              <p className={`text-sm ${textSecondary}`}>
                {step === 'choose-destination' && 'Where should these photos go?'}
                {step === 'capture-photos' && (selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name || 'Project' : 'General photos')}
                {step === 'review' && `${photos.length} photo(s) ready`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 ${textSecondary} hover:${textPrimary} rounded-lg transition-colors`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[65vh]">
          {/* Step 1: Choose Destination */}
          {step === 'choose-destination' && (
            <div className="space-y-3">
              {/* View Gallery Button */}
              <button
                onClick={handleViewGallery}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${bgCard} border-transparent ${bgCardHover}`}
              >
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Images className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${textPrimary}`}>View Gallery</p>
                  <p className={`text-sm ${textSecondary}`}>Browse previously taken photos</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${textMuted}`} />
              </button>

              <div className={`border-t ${theme === 'light' ? 'border-gray-200' : 'border-zinc-700'} my-3`} />

              {/* Attach to existing project */}
              <button
                onClick={() => handleDestinationSelect('project')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  destination === 'project'
                    ? 'bg-[#043d6b]/20 border-[#043d6b]'
                    : `${bgCard} border-transparent ${bgCardHover}`
                }`}
              >
                <div className="w-12 h-12 bg-[#043d6b]/20 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-[#043d6b]" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${textPrimary}`}>Attach to Project</p>
                  <p className={`text-sm ${textSecondary}`}>Add photos to an existing project</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${textMuted}`} />
              </button>

              {/* Create new project */}
              <button
                onClick={() => handleDestinationSelect('new-project')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  destination === 'new-project'
                    ? 'bg-[#043d6b]/20 border-[#043d6b]'
                    : `${bgCard} border-transparent ${bgCardHover}`
                }`}
              >
                <div className="w-12 h-12 bg-[#043d6b]/20 rounded-xl flex items-center justify-center">
                  <FolderPlus className="w-6 h-6 text-[#043d6b]" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${textPrimary}`}>Create New Project</p>
                  <p className={`text-sm ${textSecondary}`}>Start a new project with these photos</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${textMuted}`} />
              </button>

              {/* Just take photos */}
              <button
                onClick={() => handleDestinationSelect('none')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  destination === 'none'
                    ? 'bg-[#043d6b]/20 border-[#043d6b]'
                    : `${bgCard} border-transparent ${bgCardHover}`
                }`}
              >
                <div className={`w-12 h-12 ${theme === 'light' ? 'bg-gray-200' : 'bg-zinc-700'} rounded-xl flex items-center justify-center`}>
                  <Image className={`w-6 h-6 ${textSecondary}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${textPrimary}`}>Just Take Photos</p>
                  <p className={`text-sm ${textSecondary}`}>Save without attaching to a project</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${textMuted}`} />
              </button>

              {/* Project List */}
              {destination === 'project' && (
                <div className="mt-4 space-y-2">
                  <p className={`text-sm font-medium ${textSecondary} mb-2`}>Select a project:</p>
                  {projects.length === 0 ? (
                    <div className={`text-center py-6 ${bgCard} rounded-xl`}>
                      <Briefcase className={`w-10 h-10 ${textMuted} mx-auto mb-2`} />
                      <p className={textMuted}>No projects yet</p>
                      <button
                        onClick={() => handleDestinationSelect('new-project')}
                        className="mt-3 text-[#043d6b] text-sm font-medium"
                      >
                        Create a new project
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSelect(project.id)}
                          className={`w-full flex items-center gap-3 p-3 ${bgCard} rounded-lg ${bgCardHover} active:scale-[0.98] transition-all`}
                        >
                          <div className="w-8 h-8 bg-[#043d6b]/20 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-[#043d6b]" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className={`font-medium ${textPrimary} text-sm`}>{project.name}</p>
                            <p className={`text-xs ${textMuted}`}>{project.client || 'No client'}</p>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New Project Form */}
              {destination === 'new-project' && (
                <div className="mt-4 space-y-3">
                  <p className={`text-sm font-medium ${textSecondary}`}>Project name:</p>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className={`w-full px-4 py-3 ${inputBg} border rounded-xl ${inputText} focus:ring-2 focus:ring-[#043d6b] focus:border-transparent`}
                    autoFocus
                  />
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className={`w-full py-3 bg-[#043d6b] text-white rounded-xl font-semibold hover:bg-[#035291] disabled:${theme === 'light' ? 'bg-gray-300 text-gray-500' : 'bg-zinc-700 text-zinc-500'} active:scale-[0.98] transition-all`}
                  >
                    Create & Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Capture Photos */}
          {step === 'capture-photos' && (
            <div className="space-y-4">
              {/* Camera/Upload buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-6 ${bgCard} border-2 border-dashed border-[#043d6b]/50 rounded-xl hover:border-[#043d6b] active:scale-[0.98] transition-all`}
                >
                  <Camera className="w-10 h-10 text-[#043d6b] mb-2" />
                  <span className={`text-sm font-medium ${textPrimary}`}>Take Photo</span>
                  <span className={`text-xs ${textMuted}`}>Use camera</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-6 ${bgCard} border-2 border-dashed border-[#043d6b]/50 rounded-xl hover:border-[#043d6b] active:scale-[0.98] transition-all`}
                >
                  <Image className="w-10 h-10 text-[#043d6b] mb-2" />
                  <span className={`text-sm font-medium ${textPrimary}`}>Gallery</span>
                  <span className={`text-xs ${textMuted}`}>Choose photos</span>
                </button>
              </div>

              {/* Hidden inputs */}
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
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Photo Grid */}
              {photos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${textSecondary}`}>
                      {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-[#043d6b] text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add more
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
                        <img
                          src={photo.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              {photos.length > 0 && (
                <button
                  onClick={handleUploadPhotos}
                  disabled={isUploading}
                  className={`w-full py-3.5 bg-[#043d6b] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#035291] disabled:${theme === 'light' ? 'bg-gray-300' : 'bg-zinc-700'} active:scale-[0.98] transition-all`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Upload {photos.length} Photo{photos.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}

              {/* Back button */}
              <button
                onClick={() => {
                  setStep('choose-destination');
                  setDestination(null);
                }}
                className={`w-full py-2.5 ${textSecondary} text-sm font-medium`}
              >
                ← Back to destination
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoUploadModal;
