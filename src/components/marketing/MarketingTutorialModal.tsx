import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Rocket, Globe, MessageSquare, PhoneOff, Star, Target, TrendingUp, Megaphone, DollarSign } from 'lucide-react';

interface MarketingTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (dontShowAgain: boolean) => void;
}

const tutorialSteps = [
  {
    icon: Rocket,
    title: 'Take Control of Your Company',
    description: 'Let ContractorAI help you grow your business with powerful marketing tools that bring in leads and keep customers coming back.'
  },
  {
    icon: Globe,
    title: 'Connect Your Website',
    description: 'Hook your website directly up to ContractorAI to instantly convert your website leads into clients. All leads sync automatically to your Clients tab.'
  },
  {
    icon: MessageSquare,
    title: 'Message Leads Seamlessly',
    description: 'Respond to new leads directly from the ContractorAI app. Text or email them back instantly to close more deals.'
  },
  {
    icon: PhoneOff,
    title: 'Missed Call Text-Back',
    description: 'Never lose a lead from a missed call again. Our system automatically sends a text to anyone you miss, so you can follow up when you\'re ready.'
  },
  {
    icon: Star,
    title: '5-Star Reviews on Autopilot',
    description: 'After completing a job, tap one button to instantly send your customer a request to leave a Google review. Build your reputation effortlessly.'
  },
  {
    icon: Target,
    title: 'Text Remarketing Campaigns',
    description: 'Run promotions to your past customers with text remarketing. Re-engage old clients and turn them into repeat business.'
  },
  {
    icon: TrendingUp,
    title: 'Weekly Local SEO Updates',
    description: 'We give your website weekly local SEO updates to keep you ranking higher on Google. Stay ahead of your competition.'
  },
  {
    icon: Megaphone,
    title: 'Ads Management',
    description: 'Need your ads managed? Let the ContractorAI team set up your Meta & Google ads for success. Just $899.99/month + your ad spend budget.'
  }
];

export const MarketingTutorialModal: React.FC<MarketingTutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(dontShowAgain);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete(dontShowAgain);
  };

  const CurrentIcon = tutorialSteps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md bg-[#1C1C1E] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500/20 to-blue-600/20 px-4 py-6">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center mb-3">
              <CurrentIcon className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-white text-center">
              {tutorialSteps[currentStep].title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-zinc-300 text-center leading-relaxed">
            {tutorialSteps[currentStep].description}
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-1.5 px-6 pb-4">
          {tutorialSteps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-blue-500'
                  : index < currentStep
                  ? 'w-1.5 bg-blue-500/50'
                  : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="px-6 pb-4">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 py-3 bg-[#2C2C2E] text-white font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep < tutorialSteps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Don't Show Again */}
        <div className="px-6 pb-6">
          <label className="flex items-center justify-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-zinc-500 text-sm">Don't show this again</span>
          </label>
        </div>
      </div>
    </div>
  );
};
