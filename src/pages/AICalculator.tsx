import React from 'react';
import { Sparkles } from 'lucide-react';
import AIChatbot from '../components/ai-calculator/AIChatbot';
import hankLogo from '../assets/icons/hank-logo.svg';

const AICalculator: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header - Hidden on mobile, shown on desktop */}
        <div className="hidden md:block mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-500 rounded-lg">
              <img
                src={hankLogo}
                alt="Hank"
                className="w-12 h-12"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Hank
              </h1>
              <p className="text-gray-600">
                Create estimates through conversation
              </p>
            </div>
          </div>
        </div>

        {/* Mobile-only compact title */}
        <div className="md:hidden mb-2 flex items-center justify-center gap-2 bg-white rounded-lg shadow p-3">
          <img src={hankLogo} alt="Hank" className="w-8 h-8" />
          <h1 className="text-xl font-bold text-gray-900">Hank AI</h1>
        </div>

        {/* Chatbot */}
        <AIChatbot />

        {/* Footer Tip - Hidden on mobile */}
        <div className="hidden sm:block mt-4 text-center text-sm text-gray-500">
          💡 Tip: I can calculate materials for all 21 trade types, plus add custom items like permits and labor
        </div>
      </div>
    </div>
  );
};

export default AICalculator;
