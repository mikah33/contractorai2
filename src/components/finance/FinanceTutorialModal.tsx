import React, { useState } from 'react';
import {
  DollarSign,
  BarChart3,
  ArrowUpRight,
  Receipt,
  FileText,
  ChevronRight,
  X
} from 'lucide-react';

interface FinanceTutorialModalProps {
  isOpen: boolean;
  onComplete: (dontShowAgain: boolean) => void;
}

const FinanceTutorialModal: React.FC<FinanceTutorialModalProps> = ({
  isOpen,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const tutorialSteps = [
    {
      icon: DollarSign,
      title: 'Welcome to Finance',
      description: 'Your complete financial hub. Track income, expenses, and profits all in one place.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20'
    },
    {
      icon: BarChart3,
      title: 'Dashboard Overview',
      description: 'See your P&L at a glance with recent transactions. Quick access to all financial sections.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20'
    },
    {
      icon: ArrowUpRight,
      title: 'Track Revenue',
      description: 'Record payments and link them to projects. Analyze your profits by job or time period.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20'
    },
    {
      icon: Receipt,
      title: 'Manage Expenses',
      description: 'Upload receipts with photo scanning. Set up recurring expenses for subscriptions and regular costs.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20'
    },
    {
      icon: FileText,
      title: 'View Reports',
      description: 'Analyze your profit margins and financial health. Export reports for taxes and bookkeeping.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20'
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500/30">
          <span className="text-xs text-orange-500 font-semibold">
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
                  i === currentStep ? 'bg-orange-500' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 space-y-4">
          <button
            onClick={handleNext}
            className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
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
              className="rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
            />
            Don't show this again
          </label>
        </div>
      </div>
    </div>
  );
};

export default FinanceTutorialModal;
