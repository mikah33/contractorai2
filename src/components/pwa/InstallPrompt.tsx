import { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';
import { shouldShowInstallPrompt, dismissInstallPrompt, isIOS } from '../../utils/pwaInstall';

interface InstallPromptProps {
  showOnLoad?: boolean;
}

const InstallPrompt = ({ showOnLoad = true }: InstallPromptProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (showOnLoad && shouldShowInstallPrompt()) {
      // Show the prompt after a short delay to avoid overwhelming the user
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showOnLoad]);

  const handleClose = () => {
    setIsVisible(false);
    dismissInstallPrompt();
  };

  const handleInstall = () => {
    // For iOS, we can't trigger install automatically, so just keep modal open
    // User needs to follow the instructions
  };

  if (!isVisible || !isIOS()) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-slide-up">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Install ContractorAI
          </h2>
          <p className="text-gray-600">
            Get the full app experience on your iPhone
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-4 mb-6">
          {/* Step 1 */}
          <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-xl">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
              1
            </div>
            <div className="flex-1">
              <p className="text-gray-800 font-medium mb-2">
                Tap the <strong>Share</strong> button
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Share className="w-5 h-5 text-blue-600" />
                <span>(at the bottom of your screen)</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-xl">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
              2
            </div>
            <div className="flex-1">
              <p className="text-gray-800 font-medium mb-2">
                Scroll and tap <strong>"Add to Home Screen"</strong>
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Look for this icon in the menu</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-xl">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
              3
            </div>
            <div className="flex-1">
              <p className="text-gray-800 font-medium">
                Tap <strong>"Add"</strong> in the top right corner
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            Why install?
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>✓ Launch instantly from your home screen</li>
            <li>✓ Works offline for estimates and projects</li>
            <li>✓ Full-screen experience without browser bars</li>
            <li>✓ Faster access to all your tools</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={handleInstall}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Got it, let's install!
          </button>
          <button
            onClick={handleClose}
            className="w-full text-gray-600 py-2 rounded-lg font-medium hover:text-gray-800 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default InstallPrompt;
