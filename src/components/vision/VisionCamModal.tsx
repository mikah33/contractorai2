import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Image,
  Wand2,
  Loader2,
  Download,
  Share2,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RefreshCw,
  Check,
  Eye,
  Mail,
  History,
  Clock,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useProjectStore from '../../stores/projectStore';
import usePhotosStore from '../../stores/photosStore';
import {
  generateVisionImage,
  saveVisionImage,
  fileToBase64,
  GenerationProgress,
  VISION_PROMPT_SUGGESTIONS
} from '../../lib/ai/visionCam';
import SendEmailModal from '../email/SendEmailModal';

interface VisionCamModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string; // URL of image to start with
}

type Step = 'tutorial' | 'capture' | 'prompt' | 'generating' | 'result' | 'previous';

interface PreviousVision {
  id: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

const VisionCamModal: React.FC<VisionCamModalProps> = ({ isOpen, onClose, initialImage }) => {
  const { projects, fetchProjects } = useProjectStore();
  const { addPhoto } = usePhotosStore();

  const [step, setStep] = useState<Step>(initialImage ? 'prompt' : 'capture');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hideTutorialPermanently, setHideTutorialPermanently] = useState(false);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strength, setStrength] = useState(0.75); // Higher = more transformation

  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAttachments, setEmailAttachments] = useState<{ type: 'image' | 'file'; url: string; name: string }[]>([]);

  // Previous Visions state
  const [previousVisions, setPreviousVisions] = useState<PreviousVision[]>([]);
  const [isLoadingVisions, setIsLoadingVisions] = useState(false);
  const [selectedVision, setSelectedVision] = useState<PreviousVision | null>(null);

  // Store original image URL for regeneration
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch previous AI-generated visions
  const fetchPreviousVisions = async () => {
    setIsLoadingVisions(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('project_photos')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'ai-generated')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const visions: PreviousVision[] = (data || []).map((p: any) => ({
        id: p.id,
        imageUrl: p.image_url,
        caption: p.caption,
        createdAt: p.created_at,
        metadata: p.metadata
      }));

      setPreviousVisions(visions);
    } catch (err) {
      console.error('Error fetching previous visions:', err);
    } finally {
      setIsLoadingVisions(false);
    }
  };

  // Check if tutorial should be shown
  useEffect(() => {
    if (isOpen) {
      const tutorialHidden = localStorage.getItem('visionCamTutorialHidden');
      if (!tutorialHidden && !initialImage) {
        setShowTutorial(true);
        setStep('tutorial');
      }
      fetchProjects();
      fetchPreviousVisions(); // Load previous visions on open
    }
  }, [isOpen, fetchProjects]);

  // Set initial image from prop
  useEffect(() => {
    if (isOpen && initialImage) {
      setCapturedImage(initialImage);
      setOriginalImageUrl(initialImage);
      setStep('prompt');
    }
  }, [isOpen, initialImage]);

  const resetModal = () => {
    setStep('capture');
    setShowTutorial(false);
    setTutorialStep(0);
    setCapturedImage(null);
    setCapturedFile(null);
    setPrompt('');
    setGeneratedImage(null);
    setIsGenerating(false);
    setGenerationProgress(null);
    setError(null);
    setShowProjectPicker(false);
    setSelectedProjectId(null);
    setShowEmailModal(false);
    setEmailAttachments([]);
    setSelectedVision(null);
    setOriginalImageUrl(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleTutorialComplete = () => {
    if (hideTutorialPermanently) {
      localStorage.setItem('visionCamTutorialHidden', 'true');
    }
    setShowTutorial(false);
    setStep('capture');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    setCapturedFile(file);
    setStep('prompt');
    e.target.value = '';
  };

  const handleGenerate = async () => {
    // Check if we have either a captured file OR an originalImageUrl for regeneration
    if ((!capturedFile && !originalImageUrl) || !prompt.trim()) {
      setError('Please capture an image and enter a prompt');
      return;
    }

    setIsGenerating(true);
    setStep('generating');
    setError(null);

    try {
      let imageBase64: string | undefined;
      let sourceImageUrl: string | undefined = originalImageUrl || undefined;

      // If we have a captured file, convert to base64
      if (capturedFile) {
        setGenerationProgress({ status: 'uploading', message: 'Preparing image...' });
        imageBase64 = await fileToBase64(capturedFile);
      } else {
        setGenerationProgress({ status: 'uploading', message: 'Loading original image...' });
      }

      // Generate the vision image via Edge Function
      const result = await generateVisionImage(
        {
          prompt: prompt.trim(),
          imageBase64: imageBase64 || undefined,
          imageUrl: !imageBase64 ? originalImageUrl || undefined : undefined,
          strength: strength,
        },
        setGenerationProgress
      );

      setGeneratedImage(result.imageUrl);
      // Keep the original image URL for future regenerations
      const newOriginalUrl = result.originalImageUrl || originalImageUrl;
      setOriginalImageUrl(newOriginalUrl || null);
      setStep('result');

      // Auto-save to gallery with original image URL for regeneration
      setGenerationProgress({ status: 'saving', message: 'Saving to gallery...' });
      try {
        await saveVisionImage({
          imageUrl: result.imageUrl,
          prompt: prompt,
          projectId: undefined,
          originalImageUrl: newOriginalUrl
        });
        // Refresh previous visions list
        await fetchPreviousVisions();
      } catch (saveErr) {
        console.error('Auto-save error:', saveErr);
        // Don't show error to user, they can still manually save
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate image');
      setStep('prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToGallery = async (projectId?: string) => {
    if (!generatedImage) return;

    setIsSaving(true);
    try {
      // Save via Edge Function (handles download, upload, and database)
      const result = await saveVisionImage({
        imageUrl: generatedImage,
        prompt: prompt,
        projectId: projectId
      });

      // Refresh photos store to show new image
      const { fetchAllPhotos } = usePhotosStore.getState();
      await fetchAllPhotos();

      alert('Image saved to gallery!');
      setShowProjectPicker(false);
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Failed to save image: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!generatedImage) return;

    try {
      if (navigator.share) {
        const response = await fetch(generatedImage);
        const blob = await response.blob();
        const file = new File([blob], 'vision-render.jpg', { type: 'image/jpeg' });

        await navigator.share({
          title: 'Project Vision',
          text: prompt,
          files: [file]
        });
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(generatedImage);
        alert('Image URL copied to clipboard!');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      // On iOS, use the share sheet to save to photos
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], `vision-${Date.now()}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Use native share sheet - allows "Save Image" on iOS
        await navigator.share({
          files: [file],
          title: 'Vision Render',
          text: 'Save to your photos'
        });
      } else {
        // Fallback for web - open image in new tab
        window.open(generatedImage, '_blank');
      }
    } catch (err: any) {
      // User cancelled share - not an error
      if (err.name !== 'AbortError') {
        console.error('Download error:', err);
        // Last resort fallback - open in new tab
        window.open(generatedImage, '_blank');
      }
    }
  };

  const handleSendToEmail = () => {
    if (!generatedImage) return;
    setEmailAttachments([{
      type: 'image',
      url: generatedImage,
      name: `vision-render-${Date.now()}.jpg`
    }]);
    setShowEmailModal(true);
  };

  const handleDeleteVision = async (visionId: string) => {
    try {
      const { error } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', visionId);

      if (error) throw error;

      setPreviousVisions(prev => prev.filter(v => v.id !== visionId));
      if (selectedVision?.id === visionId) {
        setSelectedVision(null);
      }
    } catch (err) {
      console.error('Error deleting vision:', err);
      alert('Failed to delete vision');
    }
  };

  // Handle regeneration from a previous vision
  const handleRegenerate = (vision: PreviousVision) => {
    const origUrl = vision.metadata?.originalImageUrl;
    if (origUrl) {
      // Set the original image as the captured image for the prompt step
      setCapturedImage(origUrl);
      setOriginalImageUrl(origUrl);
      // Pre-fill the prompt with the previous prompt
      setPrompt(vision.caption || '');
      setSelectedVision(null);
      setStep('prompt');
    } else {
      alert('Original image not available for this vision. Try creating a new one.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  if (!isOpen) return null;

  const tutorialSteps = [
    {
      icon: Camera,
      title: 'Take a Photo',
      description: 'Capture your project site or area you want to visualize'
    },
    {
      icon: Wand2,
      title: 'Describe the Vision',
      description: 'Enter a prompt describing how you want it to look after renovation'
    },
    {
      icon: Share2,
      title: 'Save & Share',
      description: 'Attach to a project, save to gallery, or email directly to your client'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[200] bg-[#0F0F0F] flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={step === 'result' ? () => setStep('prompt') : handleClose}
          className="p-2 -ml-2 text-zinc-400 hover:text-white"
        >
          {step === 'result' ? <ChevronLeft className="w-6 h-6" /> : <X className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-[#043d6b] rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">Vision Cam</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Tutorial Step */}
      {step === 'tutorial' && (
        <div className="flex-1 flex flex-col p-6">
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500/20 to-[#043d6b]/20 rounded-2xl flex items-center justify-center mb-6">
              {React.createElement(tutorialSteps[tutorialStep].icon, {
                className: 'w-10 h-10 text-purple-400'
              })}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              {tutorialSteps[tutorialStep].title}
            </h2>
            <p className="text-zinc-400 text-center max-w-xs">
              {tutorialSteps[tutorialStep].description}
            </p>

            {/* Step indicators */}
            <div className="flex gap-2 mt-8">
              {tutorialSteps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === tutorialStep ? 'bg-purple-500' : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tutorial Navigation */}
          <div className="space-y-4 mt-8">
            {tutorialStep < tutorialSteps.length - 1 ? (
              <button
                onClick={() => setTutorialStep(prev => prev + 1)}
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-[#043d6b] text-white rounded-xl font-semibold active:scale-[0.98] transition-transform"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleTutorialComplete}
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-[#043d6b] text-white rounded-xl font-semibold active:scale-[0.98] transition-transform"
              >
                Get Started
              </button>
            )}

            <label className="flex items-center justify-center gap-2 text-sm text-zinc-500">
              <input
                type="checkbox"
                checked={hideTutorialPermanently}
                onChange={(e) => setHideTutorialPermanently(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
              />
              Don't show this again
            </label>
          </div>
        </div>
      )}

      {/* Capture Step */}
      {step === 'capture' && (
        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm space-y-4">
              {/* Previous Visions Button */}
              {previousVisions.length > 0 && (
                <button
                  onClick={() => setStep('previous')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/20 to-[#043d6b]/20 rounded-xl border border-purple-500/30 hover:border-purple-500/50 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center">
                      <History className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-white block">Previous Visions</span>
                      <span className="text-xs text-zinc-400">{previousVisions.length} saved</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-400" />
                </button>
              )}

              {/* Divider */}
              {previousVisions.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-zinc-500">Create New</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              )}

              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-purple-500/10 to-[#043d6b]/10 border-2 border-dashed border-purple-500/50 rounded-2xl hover:border-purple-500 active:scale-[0.98] transition-all"
              >
                <Camera className="w-16 h-16 text-purple-400 mb-4" />
                <span className="text-lg font-semibold text-white">Take Photo</span>
                <span className="text-sm text-zinc-500">Use your camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 p-4 bg-[#2C2C2E] rounded-xl border border-white/10 hover:border-purple-500/50 active:scale-[0.98] transition-all"
              >
                <Image className="w-6 h-6 text-zinc-400" />
                <span className="font-medium text-white">Choose from Gallery</span>
              </button>
            </div>
          </div>

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
        </div>
      )}

      {/* Prompt Step */}
      {step === 'prompt' && (
        <div className="flex-1 flex flex-col">
          {/* Image Preview */}
          {capturedImage && (
            <div className="relative aspect-video bg-black">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setCapturedFile(null);
                  setStep('capture');
                }}
                className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex-1 p-4 space-y-4">
            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Describe your vision
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Renovated with modern siding, new windows, and a landscaped front yard"
                rows={3}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-[#043d6b] focus:border-transparent resize-none"
              />
            </div>

            {/* Prompt Suggestions */}
            <div>
              <p className="text-xs text-zinc-500 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {VISION_PROMPT_SUGGESTIONS.slice(0, 4).map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(suggestion)}
                    className="px-3 py-1.5 bg-[#2C2C2E] rounded-full text-xs text-zinc-300 hover:bg-[#3C3C3E] active:scale-95 transition-all"
                  >
                    {suggestion.slice(0, 30)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Transformation Strength */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-400">
                  Transformation Strength
                </label>
                <span className="text-sm text-purple-400">{Math.round(strength * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={strength}
                onChange={(e) => setStrength(parseFloat(e.target.value))}
                className="w-full h-2 bg-[#2C2C2E] rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>Subtle changes</span>
                <span>Full renovation</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-[#043d6b] text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              <Sparkles className="w-5 h-5" />
              Generate Vision
            </button>
          </div>
        </div>
      )}

      {/* Previous Visions Gallery Step */}
      {step === 'previous' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Subheader */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
            <button
              onClick={() => setStep('capture')}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-white">Previous Visions</h2>
            <span className="text-xs text-zinc-500">({previousVisions.length})</span>
          </div>

          {/* Selected Vision View */}
          {selectedVision ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 bg-black flex items-center justify-center min-h-0 relative">
                <img
                  src={selectedVision.imageUrl}
                  alt="Vision"
                  className="max-w-full max-h-full object-contain"
                />
                <button
                  onClick={() => setSelectedVision(null)}
                  className="absolute top-3 left-3 p-2 bg-black/60 rounded-full text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              <div
                className="p-4 space-y-3 bg-[#1C1C1E] flex-shrink-0"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
              >
                {selectedVision.caption && (
                  <p className="text-sm text-zinc-400 text-center">"{selectedVision.caption}"</p>
                )}
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(selectedVision.createdAt)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleRegenerate(selectedVision)}
                    className="flex flex-col items-center gap-1 p-3 bg-[#2C2C2E] rounded-xl active:scale-95 transition-transform"
                  >
                    <RefreshCw className="w-5 h-5 text-green-400" />
                    <span className="text-xs text-zinc-300">Reprompt</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(selectedVision.imageUrl);
                        const blob = await response.blob();
                        const file = new File([blob], `vision-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                          await navigator.share({ files: [file], title: 'Vision Render' });
                        } else {
                          window.open(selectedVision.imageUrl, '_blank');
                        }
                      } catch (err) {
                        window.open(selectedVision.imageUrl, '_blank');
                      }
                    }}
                    className="flex flex-col items-center gap-1 p-3 bg-[#2C2C2E] rounded-xl active:scale-95 transition-transform"
                  >
                    <Download className="w-5 h-5 text-purple-400" />
                    <span className="text-xs text-zinc-300">Download</span>
                  </button>
                  <button
                    onClick={() => {
                      setEmailAttachments([{
                        type: 'image',
                        url: selectedVision.imageUrl,
                        name: `vision-${selectedVision.id}.jpg`
                      }]);
                      setShowEmailModal(true);
                    }}
                    className="flex flex-col items-center gap-1 p-3 bg-[#2C2C2E] rounded-xl active:scale-95 transition-transform"
                  >
                    <Mail className="w-5 h-5 text-[#043d6b]" />
                    <span className="text-xs text-zinc-300">Email</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this vision?')) {
                        handleDeleteVision(selectedVision.id);
                      }
                    }}
                    className="flex flex-col items-center gap-1 p-3 bg-[#2C2C2E] rounded-xl active:scale-95 transition-transform"
                  >
                    <Trash2 className="w-5 h-5 text-red-400" />
                    <span className="text-xs text-zinc-300">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Vision Grid */
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingVisions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
              ) : previousVisions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <History className="w-12 h-12 text-zinc-600 mb-3" />
                  <p className="text-zinc-500">No previous visions yet</p>
                  <button
                    onClick={() => setStep('capture')}
                    className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium"
                  >
                    Create Your First Vision
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {previousVisions.map((vision) => (
                    <button
                      key={vision.id}
                      onClick={() => setSelectedVision(vision)}
                      className="relative aspect-square rounded-xl overflow-hidden bg-[#2C2C2E] group"
                    >
                      <img
                        src={vision.imageUrl}
                        alt={vision.caption || 'Vision'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-active:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-[10px] text-zinc-400 truncate">
                          {formatDate(vision.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generating Step */}
      {step === 'generating' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-[#043d6b]/20 rounded-full flex items-center justify-center mb-6">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Creating Your Vision</h2>
          <p className="text-zinc-400 text-center mb-4">
            {generationProgress?.message || 'Processing...'}
          </p>
          {generationProgress?.progress && (
            <div className="w-48 h-2 bg-[#2C2C2E] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-[#043d6b] transition-all duration-300"
                style={{ width: `${generationProgress.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Result Step */}
      {step === 'result' && generatedImage && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Generated Image */}
          <div className="flex-1 bg-black flex items-center justify-center min-h-0">
            <img
              src={generatedImage}
              alt="Generated Vision"
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Actions */}
          <div
            className="p-4 space-y-3 bg-[#1C1C1E] flex-shrink-0"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <p className="text-sm text-zinc-400 text-center mb-2">"{prompt}"</p>

            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleDownload}
                className="flex flex-col items-center gap-1 p-3 bg-[#2C2C2E] rounded-xl active:scale-95 transition-transform"
              >
                <Download className="w-5 h-5 text-purple-400" />
                <span className="text-xs text-zinc-300">Download</span>
              </button>
              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-1 p-3 bg-[#2C2C2E] rounded-xl active:scale-95 transition-transform"
              >
                <Share2 className="w-5 h-5 text-purple-400" />
                <span className="text-xs text-zinc-300">Share</span>
              </button>
              <button
                onClick={handleSendToEmail}
                className="flex flex-col items-center gap-1 p-3 bg-[#2C2C2E] rounded-xl active:scale-95 transition-transform"
              >
                <Mail className="w-5 h-5 text-[#043d6b]" />
                <span className="text-xs text-zinc-300">Email</span>
              </button>
              <button
                onClick={() => setShowProjectPicker(true)}
                className="flex flex-col items-center gap-1 p-3 bg-[#2C2C2E] rounded-xl active:scale-95 transition-transform"
              >
                <Briefcase className="w-5 h-5 text-purple-400" />
                <span className="text-xs text-zinc-300">Attach</span>
              </button>
            </div>

            <div className="w-full py-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl font-medium flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              Auto-saved to Gallery
            </div>

            <button
              onClick={() => {
                setGeneratedImage(null);
                setStep('prompt');
              }}
              className="w-full py-2.5 text-zinc-400 text-sm font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generate Again
            </button>
          </div>
        </div>
      )}

      {/* Project Picker Modal */}
      {showProjectPicker && (
        <div className="fixed inset-0 z-[210] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowProjectPicker(false)}
          />
          <div className="relative w-full max-w-lg bg-[#1C1C1E] rounded-t-2xl max-h-[60vh] overflow-hidden">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#3A3A3C] rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 pb-4 border-b border-white/10">
              <h3 className="font-bold text-white">Attach to Project</h3>
              <button
                onClick={() => setShowProjectPicker(false)}
                className="p-2 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">No projects yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSaveToGallery(project.id)}
                      disabled={isSaving}
                      className="w-full flex items-center gap-3 p-3 bg-[#2C2C2E] rounded-lg hover:bg-[#3C3C3E] active:scale-[0.98] transition-all"
                    >
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white text-sm">{project.name}</p>
                        <p className="text-xs text-zinc-500">{project.client || 'No client'}</p>
                      </div>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setEmailAttachments([]);
        }}
        initialAttachments={emailAttachments}
      />
    </div>
  );
};

export default VisionCamModal;
