import React, { useState, useRef, useEffect } from 'react';
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
  Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useProjectStore from '../../stores/projectStore';
import usePhotosStore from '../../stores/photosStore';

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
  const { projects, fetchProjects, addProject } = useProjectStore();
  const { addPhotos } = usePhotosStore();
  const [step, setStep] = useState<Step>('choose-destination');
  const [destination, setDestination] = useState<'project' | 'new-project' | 'none' | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
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
    resetModal();
    onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#1C1C1E] rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#3A3A3C] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Camera className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {step === 'choose-destination' && 'Add Photos'}
                {step === 'capture-photos' && 'Capture Photos'}
                {step === 'review' && 'Review Photos'}
              </h2>
              <p className="text-sm text-zinc-400">
                {step === 'choose-destination' && 'Where should these photos go?'}
                {step === 'capture-photos' && (selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name || 'Project' : 'General photos')}
                {step === 'review' && `${photos.length} photo(s) ready`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[65vh]">
          {/* Step 1: Choose Destination */}
          {step === 'choose-destination' && (
            <div className="space-y-3">
              {/* Attach to existing project */}
              <button
                onClick={() => handleDestinationSelect('project')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  destination === 'project'
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-[#2C2C2E] border-transparent hover:border-blue-500/50'
                }`}
              >
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Attach to Project</p>
                  <p className="text-sm text-zinc-400">Add photos to an existing project</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500" />
              </button>

              {/* Create new project */}
              <button
                onClick={() => handleDestinationSelect('new-project')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  destination === 'new-project'
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-[#2C2C2E] border-transparent hover:border-blue-500/50'
                }`}
              >
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <FolderPlus className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Create New Project</p>
                  <p className="text-sm text-zinc-400">Start a new project with these photos</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500" />
              </button>

              {/* Just take photos */}
              <button
                onClick={() => handleDestinationSelect('none')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  destination === 'none'
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-[#2C2C2E] border-transparent hover:border-blue-500/50'
                }`}
              >
                <div className="w-12 h-12 bg-zinc-700 rounded-xl flex items-center justify-center">
                  <Image className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Just Take Photos</p>
                  <p className="text-sm text-zinc-400">Save without attaching to a project</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500" />
              </button>

              {/* Project List */}
              {destination === 'project' && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-zinc-400 mb-2">Select a project:</p>
                  {projects.length === 0 ? (
                    <div className="text-center py-6 bg-[#2C2C2E] rounded-xl">
                      <Briefcase className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-500">No projects yet</p>
                      <button
                        onClick={() => handleDestinationSelect('new-project')}
                        className="mt-3 text-blue-500 text-sm font-medium"
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
                          className="w-full flex items-center gap-3 p-3 bg-[#2C2C2E] rounded-lg hover:bg-[#3C3C3E] active:scale-[0.98] transition-all"
                        >
                          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-white text-sm">{project.name}</p>
                            <p className="text-xs text-zinc-500">{project.client || 'No client'}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New Project Form */}
              {destination === 'new-project' && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-zinc-400">Project name:</p>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#3A3A3C] rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold disabled:bg-zinc-700 disabled:text-zinc-500 active:scale-[0.98] transition-all"
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
                  className="flex flex-col items-center justify-center p-6 bg-[#2C2C2E] border-2 border-dashed border-blue-500/50 rounded-xl hover:border-blue-500 active:scale-[0.98] transition-all"
                >
                  <Camera className="w-10 h-10 text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-white">Take Photo</span>
                  <span className="text-xs text-zinc-500">Use camera</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 bg-[#2C2C2E] border-2 border-dashed border-blue-500/50 rounded-xl hover:border-blue-500 active:scale-[0.98] transition-all"
                >
                  <Image className="w-10 h-10 text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-white">Gallery</span>
                  <span className="text-xs text-zinc-500">Choose photos</span>
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
                    <p className="text-sm font-medium text-zinc-400">
                      {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-blue-500 text-sm font-medium"
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
                  className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-zinc-700 active:scale-[0.98] transition-all"
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
                className="w-full py-2.5 text-zinc-400 text-sm font-medium"
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
