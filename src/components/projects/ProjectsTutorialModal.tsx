import React, { useState } from 'react';
import {
  Briefcase,
  Sparkles,
  Users,
  Calendar,
  UserPlus,
  ChevronRight,
  X
} from 'lucide-react';

interface ProjectsTutorialModalProps {
  isOpen: boolean;
  onComplete: (dontShowAgain: boolean) => void;
}

const ProjectsTutorialModal: React.FC<ProjectsTutorialModalProps> = ({
  isOpen,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const tutorialSteps = [
    {
      icon: Briefcase,
      title: 'Welcome to Projects',
      description: 'Your command center for managing all your jobs. Track progress, teams, and schedules in one place.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: Sparkles,
      title: 'AI Project Manager',
      description: 'Click "AI Project Manager" to add projects using AI. Just describe your job and AI will organize everything for you.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: Users,
      title: 'Assign Teams',
      description: 'Add team members to projects. Assign employees to specific jobs and track who\'s working on what.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: Calendar,
      title: 'Manage Schedules',
      description: 'Set start and end dates for projects. Keep track of deadlines and milestones for every job.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      icon: UserPlus,
      title: 'Attach Customers & Employees',
      description: 'Link customers and employees directly to projects. Keep all your contacts organized by job.',
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

export default ProjectsTutorialModal;
