import React, { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import MaterialRequestModal from './MaterialRequestModal';

const MaterialRequestButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-medium text-sm md:text-base"
        aria-label="Request material to be added"
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
      >
        <Package className="w-5 h-5" />
        <span className="hidden sm:inline">Request Material</span>
        <Plus className="w-4 h-4" />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <MaterialRequestModal
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default MaterialRequestButton;
