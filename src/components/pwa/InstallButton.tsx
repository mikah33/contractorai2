import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import InstallPrompt from './InstallPrompt';
import { isIOS, isInStandaloneMode } from '../../utils/pwaInstall';

interface InstallButtonProps {
  variant?: 'primary' | 'secondary' | 'minimal';
  className?: string;
}

const InstallButton = ({ variant = 'primary', className = '' }: InstallButtonProps) => {
  const [showPrompt, setShowPrompt] = useState(false);

  // Don't show button if already installed or not on iOS
  if (!isIOS() || isInStandaloneMode()) {
    return null;
  }

  const handleClick = () => {
    setShowPrompt(true);
  };

  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200';

  const variantClasses = {
    primary: 'bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 hover:shadow-lg',
    secondary: 'bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 hover:bg-blue-50',
    minimal: 'text-blue-600 hover:text-blue-700 px-4 py-2 hover:bg-blue-50'
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      >
        <Smartphone className="w-5 h-5" />
        <span>Install App</span>
      </button>

      {showPrompt && (
        <InstallPrompt showOnLoad={false} />
      )}
    </>
  );
};

export default InstallButton;
