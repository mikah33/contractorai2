import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme, getThemeClasses } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  showLabel = false,
  className = ''
}) => {
  const { theme, toggleTheme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  const sizeClasses = {
    sm: showLabel ? 'px-3 py-1.5 gap-1.5' : 'w-8 h-8',
    md: showLabel ? 'px-4 py-2 gap-2' : 'w-10 h-10',
    lg: showLabel ? 'px-5 py-2.5 gap-2.5' : 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        ${themeClasses.button.secondary}
        ${themeClasses.button.secondaryHover}
        border ${themeClasses.border.secondary}
        rounded-xl transition-all duration-200
        flex items-center justify-center
        active:scale-95 font-medium
        ${className}
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className={iconSizes[size]} />
      ) : (
        <Sun className={iconSizes[size]} />
      )}

      {showLabel && (
        <span className={`${textSizes[size]} font-medium`}>
          {theme === 'light' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;