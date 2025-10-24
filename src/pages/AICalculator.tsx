import React from 'react';
import { Sparkles } from 'lucide-react';
import AIChatbot from '../components/ai-calculator/AIChatbot';

const AICalculator: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-500 rounded-lg">
              <img
                src="/src/assets/icons/hank-logo.svg"
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

          {/* Info Banner */}
          <div className="mt-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-gray-900 mb-1">
                  How it works:
                </p>
                <ul className="space-y-1">
                  <li>• Tell me what you need estimated (deck, concrete, roofing, etc.)</li>
                  <li>• I'll ask for dimensions and materials</li>
                  <li>• Add custom items like permits, labor, or special materials</li>
                  <li>• I remember your preferences for faster estimates next time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <AIChatbot />

        {/* Footer Tip */}
        <div className="mt-4 text-center text-sm text-gray-500">
          💡 Tip: I can calculate materials for all 21 trade types, plus add custom items like permits and labor
        </div>
      </div>
    </div>
  );
};

export default AICalculator;
