import React, { useState } from 'react';
import {
  Camera,
  Image,
  FolderPlus,
  Briefcase,
  Cloud,
  ChevronRight,
  X
} from 'lucide-react';

interface PhotosTutorialModalProps {
  isOpen: boolean;
  onComplete: (dontShowAgain: boolean) => void;
}

const PhotosTutorialModal: React.FC<PhotosTutorialModalProps> = ({
  isOpen,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const tutorialSteps = [
    {
      icon: Camera,
      title: 'Welcome to Photos',
      description: 'Capture and organize job site photos. Document your work and keep everything in one place.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: Image,
      title: 'Take Pictures',
      description: 'Snap photos directly from the app. Capture before, during, and after shots of your projects.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: Briefcase,
      title: 'Attach to Projects',
      description: 'Link photos to specific projects. Keep all job documentation organized and easy to find.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: Cloud,
      title: 'Store in Your Account',
      description: 'Photos are saved to your account. Access them from any device, anytime you need them.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: FolderPlus,
      title: 'Create Projects On-the-Fly',
      description: 'Start a new project while adding photos. Perfect for documenting new jobs from the field.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    }
  ];

  const currentTutorial = tutorialSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(dontShowAgain);
    }
  };

  const handleSkip = () => {
    onComplete(dontShowAgain);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm bg-[#1C1C1E] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/30">
          <span className="text-xs text-blue-500 font-semibold">
            {currentStep + 1} of {tutorialSteps.length}
          </span>
          <button
            onClick={handleSkip}
            className="p-1 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`w-20 h-20 ${currentTutorial.bgColor} rounded-2xl flex items-center justify-center mb-6`}>
            <currentTutorial.icon className={`w-10 h-10 ${currentTutorial.color}`} />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            {currentTutorial.title}
          </h2>

          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            {currentTutorial.description}
          </p>

          {/* Step Indicators */}
          <div className="flex gap-2 mb-8">
            {tutorialSteps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-blue-500' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 space-y-4">
          <button
            onClick={handleNext}
            className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {currentStep < tutorialSteps.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            ) : (
              'Get Started'
            )}
          </button>

          <label className="flex items-center justify-center gap-2 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
            />
            Don't show this again
          </label>
        </div>
      </div>
    </div>
  );
};

export default PhotosTutorialModal;
