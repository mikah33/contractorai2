/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 60% Dominant - Backgrounds
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
        },
        // 30% Secondary - Surfaces
        surface: {
          primary: 'var(--color-surface-primary)',
          secondary: 'var(--color-surface-secondary)',
          elevated: 'var(--color-surface-elevated)',
        },
        // 10% Accent - Brand
        brand: {
          50: 'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          300: 'var(--color-brand-300)',
          400: 'var(--color-brand-400)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: 'var(--color-brand-700)',
          800: 'var(--color-brand-800)',
          900: 'var(--color-brand-900)',
        },
        // RAG Status Colors
        status: {
          red: {
            50: 'var(--color-status-red-50)',
            100: 'var(--color-status-red-100)',
            200: 'var(--color-status-red-200)',
            500: 'var(--color-status-red-500)',
            600: 'var(--color-status-red-600)',
            700: 'var(--color-status-red-700)',
            800: 'var(--color-status-red-800)',
            text: 'var(--color-status-red-text)',
          },
          amber: {
            50: 'var(--color-status-amber-50)',
            100: 'var(--color-status-amber-100)',
            200: 'var(--color-status-amber-200)',
            500: 'var(--color-status-amber-500)',
            600: 'var(--color-status-amber-600)',
            700: 'var(--color-status-amber-700)',
            800: 'var(--color-status-amber-800)',
            text: 'var(--color-status-amber-text)',
          },
          green: {
            50: 'var(--color-status-green-50)',
            100: 'var(--color-status-green-100)',
            200: 'var(--color-status-green-200)',
            500: 'var(--color-status-green-500)',
            600: 'var(--color-status-green-600)',
            700: 'var(--color-status-green-700)',
            800: 'var(--color-status-green-800)',
            text: 'var(--color-status-green-text)',
          },
        },
        // Text Colors
        content: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
          inverse: 'var(--color-text-inverse)',
        },
        // Border Colors
        border: {
          light: 'var(--color-border-light)',
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'tablet': '768px',
        'ipad': '820px',
        'lg': '1024px',
        'ipad-pro': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      fontSize: {
        // Fluid typography using clamp
        'xs': ['clamp(0.75rem, 1.5vw, 0.875rem)', { lineHeight: '1rem' }],
        'sm': ['clamp(0.875rem, 1.75vw, 1rem)', { lineHeight: '1.25rem' }],
        'base': ['clamp(1rem, 2vw, 1.125rem)', { lineHeight: '1.5rem' }],
        'lg': ['clamp(1.125rem, 2.25vw, 1.25rem)', { lineHeight: '1.75rem' }],
        'xl': ['clamp(1.25rem, 2.5vw, 1.5rem)', { lineHeight: '1.75rem' }],
        '2xl': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '2rem' }],
        '3xl': ['clamp(1.875rem, 3.75vw, 2.5rem)', { lineHeight: '2.25rem' }],
        '4xl': ['clamp(2.25rem, 4.5vw, 3rem)', { lineHeight: '2.5rem' }],
      },
      spacing: {
        'fluid-xs': 'var(--spacing-xs)',
        'fluid-sm': 'var(--spacing-sm)',
        'fluid-md': 'var(--spacing-md)',
        'fluid-lg': 'var(--spacing-lg)',
        'fluid-xl': 'var(--spacing-xl)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      fontFamily: {
        sans: ['SF Pro Display', 'SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
