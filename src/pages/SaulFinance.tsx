import React from 'react';
import SaulChatbot from '../components/ai-finance/SaulChatbot';
import saulLogo from '../assets/icons/saul-logo.svg';

const SaulFinance: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header - Hidden on mobile, shown on desktop */}
        <div className="hidden md:block mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
              <img
                src={saulLogo}
                alt="Saul"
                className="w-12 h-12"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Saul
              </h1>
              <p className="text-gray-600">
                Manage your finances through conversation
              </p>
            </div>
          </div>
        </div>

        {/* Mobile-only compact title */}
        <div className="md:hidden mb-2 flex items-center justify-center gap-2 bg-white rounded-lg shadow p-3">
          <img src={saulLogo} alt="Saul" className="w-8 h-8" />
          <h1 className="text-xl font-bold text-gray-900">Saul AI</h1>
        </div>

        {/* Chatbot */}
        <SaulChatbot />

        {/* Footer Tip - Hidden on mobile */}
        <div className="hidden sm:block mt-4 text-center text-sm text-gray-500">
          💡 Tip: I can track expenses, create invoices, manage budgets, and provide financial insights
        </div>
      </div>
    </div>
  );
};

export default SaulFinance;
