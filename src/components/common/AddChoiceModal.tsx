import React from 'react';
import { X, Bot, PenTool, Sparkles } from 'lucide-react';

interface AddChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAIChat: () => void;
  onManual: () => void;
  title?: string;
  aiLabel?: string;
  manualLabel?: string;
  aiDescription?: string;
  manualDescription?: string;
}

const AddChoiceModal: React.FC<AddChoiceModalProps> = ({
  isOpen,
  onClose,
  onAIChat,
  onManual,
  title = 'How would you like to add?',
  aiLabel = 'AI Assistant',
  manualLabel = 'Manual Entry',
  aiDescription = 'Let AI help you create it through conversation',
  manualDescription = 'Enter the details yourself'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-3">
          {/* AI Chat Option */}
          <button
            onClick={() => {
              onClose();
              onAIChat();
            }}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-transparent hover:border-blue-400 active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">{aiLabel}</p>
              <p className="text-sm text-gray-500">{aiDescription}</p>
            </div>
          </button>

          {/* Manual Option */}
          <button
            onClick={() => {
              onClose();
              onManual();
            }}
            className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl border-2 border-transparent hover:border-gray-300 active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <PenTool className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">{manualLabel}</p>
              <p className="text-sm text-gray-500">{manualDescription}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddChoiceModal;
