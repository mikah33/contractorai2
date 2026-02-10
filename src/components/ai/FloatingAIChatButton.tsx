import React from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface FloatingAIChatButtonProps {
  onClick: () => void;
  mode?: 'estimates' | 'projects' | 'clients' | 'finance' | 'general';
  className?: string;
}

const FloatingAIChatButton: React.FC<FloatingAIChatButtonProps> = ({
  onClick,
  mode = 'general',
  className = ''
}) => {
  const { theme } = useTheme();
  const getModeConfig = () => {
    switch (mode) {
      case 'estimates':
        return {
          gradient: 'from-orange-500 to-orange-600',
          shadow: 'shadow-orange-500/25',
          text: 'Ask about estimates'
        };
      case 'projects':
        return {
          gradient: 'from-purple-500 to-purple-600',
          shadow: 'shadow-purple-500/25',
          text: 'Ask about projects'
        };
      case 'clients':
        return {
          gradient: 'from-blue-500 to-blue-600',
          shadow: 'shadow-blue-500/25',
          text: 'Ask about clients'
        };
      case 'finance':
        return {
          gradient: 'from-green-500 to-green-600',
          shadow: 'shadow-green-500/25',
          text: 'Ask about finances'
        };
      default:
        return {
          gradient: 'from-orange-500 to-orange-600',
          shadow: 'shadow-orange-500/25',
          text: 'Ask Contractor AI'
        };
    }
  };

  const config = getModeConfig();

  return (
    <div className={`fixed bottom-[140px] right-6 z-50 ${className}`}>
      {/* Main AI Button */}
      <button
        onClick={onClick}
        className={`
          relative group
          w-16 h-16
          bg-gradient-to-r ${config.gradient}
          rounded-full
          shadow-xl ${config.shadow}
          hover:scale-110
          active:scale-95
          transition-all duration-300 ease-out
          flex items-center justify-center
          ring-4 ring-white/20
          hover:ring-white/40
          animate-pulse hover:animate-none
        `}
      >
        {/* Animated Background Ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent animate-spin opacity-50 group-hover:opacity-70"></div>

        {/* Main Icon */}
        <div className="relative z-10 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white drop-shadow-lg" />
        </div>

        {/* Pulse Animation */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${config.gradient} animate-ping opacity-30`}></div>
      </button>

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className={`${theme === 'light' ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'} text-sm font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap`}>
          {config.text}
          <div className={`absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${theme === 'light' ? 'border-t-gray-800' : 'border-t-gray-900'}`}></div>
        </div>
      </div>

      {/* Secondary Action Button - Message History */}
      <button
        onClick={onClick}
        className={`
          absolute -top-14 -left-2
          w-10 h-10
          ${theme === 'light' ? 'bg-gray-700/90 hover:bg-gray-600' : 'bg-gray-800/90 hover:bg-gray-700'}
          backdrop-blur-sm
          text-white
          rounded-full
          shadow-lg
          active:scale-95
          transition-all duration-200
          flex items-center justify-center
          opacity-0 group-hover:opacity-100
          transform translate-y-2 group-hover:translate-y-0
        `}
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </div>
  );
};

export default FloatingAIChatButton;