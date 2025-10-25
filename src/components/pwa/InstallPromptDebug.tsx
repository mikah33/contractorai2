import { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';

// Debug version that always shows on iOS regardless of localStorage
const InstallPromptDebug = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // Collect debug info
    const info = {
      userAgent: navigator.userAgent,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isStandalone: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true,
      hasLocalStorage: localStorage.getItem('pwa-install-dismissed'),
      platform: navigator.platform,
      vendor: navigator.vendor,
    };
    setDebugInfo(info);

    // Always show after 2 seconds for debugging
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('pwa-install-dismissed');
    alert('LocalStorage cleared! Refresh the page.');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Install ContractorAI (DEBUG)
          </h2>
        </div>

        {/* Debug Info */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-bold text-sm mb-2">Debug Info:</h3>
          <div className="text-xs space-y-1 font-mono">
            <p>🔍 Is iOS: {debugInfo.isIOS ? '✅ YES' : '❌ NO'}</p>
            <p>📱 Standalone: {debugInfo.isStandalone ? '✅ YES' : '❌ NO'}</p>
            <p>💾 Dismissed: {debugInfo.hasLocalStorage ? '✅ YES' : '❌ NO'}</p>
            <p>🖥️ Platform: {debugInfo.platform}</p>
            <p className="break-all">🌐 UA: {debugInfo.userAgent?.substring(0, 50)}...</p>
          </div>
          <button
            onClick={clearLocalStorage}
            className="mt-3 w-full bg-yellow-600 text-white py-2 rounded-lg text-sm font-semibold"
          >
            Clear Dismissed Flag
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-4 mb-6">
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

        <button
          onClick={handleClose}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default InstallPromptDebug;
