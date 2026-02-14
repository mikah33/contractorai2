import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, then system preference, default to dark
    const saved = localStorage.getItem('contractorai-theme') as Theme;
    if (saved && (saved === 'light' || saved === 'dark')) {
      return saved;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }

    return 'dark';
  });

  useEffect(() => {
    // Save to localStorage whenever theme changes
    localStorage.setItem('contractorai-theme', theme);

    // Update document class for global styling
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#ffffff' : '#0F0F0F');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility function to get theme-aware classes
export const getThemeClasses = (theme: Theme) => ({
  // Backgrounds
  bg: {
    primary: theme === 'light' ? 'bg-white' : 'bg-[#0F0F0F]',
    secondary: theme === 'light' ? 'bg-gray-50' : 'bg-[#1C1C1E]',
    tertiary: theme === 'light' ? 'bg-gray-100' : 'bg-[#262626]',
    card: theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]',
    input: theme === 'light' ? 'bg-gray-50' : 'bg-[#262626]',
    modal: theme === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'
  },

  // Text colors
  text: {
    primary: theme === 'light' ? 'text-gray-900' : 'text-white',
    secondary: theme === 'light' ? 'text-gray-700' : 'text-zinc-400',
    muted: theme === 'light' ? 'text-gray-600' : 'text-zinc-500',
    inverse: theme === 'light' ? 'text-white' : 'text-black'
  },

  // Borders
  border: {
    primary: theme === 'light' ? 'border-gray-200' : 'border-blue-500/30',
    secondary: theme === 'light' ? 'border-gray-300' : 'border-[#3A3A3C]',
    input: theme === 'light' ? 'border-gray-200' : 'border-[#3A3A3C]'
  },

  // Shadows
  shadow: {
    card: theme === 'light' ? 'shadow-sm' : 'shadow-xl',
    button: theme === 'light' ? 'shadow-sm' : 'shadow-lg'
  },

  // Interactive states
  hover: {
    bg: theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10',
    text: theme === 'light' ? 'hover:text-gray-900' : 'hover:text-white'
  },

  // Focus states
  focus: {
    ring: theme === 'light' ? 'focus:ring-blue-500' : 'focus:ring-blue-500',
    border: theme === 'light' ? 'focus:border-blue-500' : 'focus:border-blue-500'
  },

  // Button styles
  button: {
    primary: 'bg-white text-black',
    secondary: theme === 'light' ? 'bg-gray-200 text-gray-800' : 'bg-[#2C2C2E] text-white',
    primaryHover: 'hover:bg-zinc-200',
    secondaryHover: theme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-[#3A3A3C]'
  }
});