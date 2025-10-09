# Tutorial System Implementation Guide
## Quick Reference for Developers

**Version:** 1.0
**Date:** 2025-10-06

---

## Quick Start

### Installation Dependencies

```bash
npm install @floating-ui/react framer-motion
```

### Development Checklist

- [ ] Read main architecture document (`TUTORIAL_SYSTEM_ARCHITECTURE.md`)
- [ ] Set up Zustand store with persistence
- [ ] Create tutorial configuration file
- [ ] Add `data-tutorial` attributes to target elements
- [ ] Build core components (Overlay, Spotlight, Tooltip)
- [ ] Integrate with Sidebar and App
- [ ] Test on mobile devices
- [ ] Run accessibility audit

---

## Component Quick Reference

### 1. Starting the Tutorial

```typescript
// In any component
import { useTutorialStore } from '@/stores/tutorialStore';

const MyComponent = () => {
  const { startTutorial, isActive } = useTutorialStore();

  return (
    <button onClick={startTutorial}>
      Start Tutorial
    </button>
  );
};
```

### 2. Adding Tutorial Target Elements

```tsx
// Add data-tutorial attribute to any element
<div data-tutorial="feature-name">
  Feature content
</div>

// In Sidebar links
<Link
  to="/dashboard"
  data-tutorial="dashboard-link"
  className="..."
>
  Dashboard
</Link>
```

### 3. Creating Tutorial Steps

```typescript
// src/config/tutorialSteps.ts
export const tutorialSteps: TutorialStep[] = [
  {
    id: 'step-unique-id',
    targetSelector: '[data-tutorial="element-id"]',
    title: 'Step Title',
    description: 'Clear explanation of the feature',
    tooltipPosition: 'right', // 'top' | 'bottom' | 'left' | 'right'
    route: '/dashboard', // Optional: navigate to this route
    spotlightPadding: 8, // Optional: padding around highlighted element
    spotlightRadius: 8, // Optional: border radius of spotlight
  },
  // ... more steps
];
```

---

## Common Patterns

### Pattern 1: Async Step Setup

```typescript
{
  id: 'async-step',
  targetSelector: '[data-tutorial="dynamic-content"]',
  title: 'Dynamic Feature',
  description: 'This feature loads asynchronously',
  tooltipPosition: 'bottom',
  beforeShow: async () => {
    // Wait for element to exist in DOM
    await waitForElement('[data-tutorial="dynamic-content"]', 5000);

    // Or fetch data
    await fetchRequiredData();
  }
}
```

### Pattern 2: Step Callbacks

```typescript
{
  id: 'step-with-actions',
  targetSelector: '[data-tutorial="feature"]',
  title: 'Interactive Step',
  description: 'Try clicking the button',
  tooltipPosition: 'top',
  onNext: () => {
    // Track analytics
    analytics.track('tutorial_step_completed', { step: 'feature' });

    // Reset UI state
    resetFeatureState();
  },
  onPrevious: () => {
    // Clean up if going back
    cleanupState();
  }
}
```

### Pattern 3: Conditional Steps

```typescript
// In tutorialSteps.ts
export const getTutorialSteps = (userRole: string): TutorialStep[] => {
  const baseSteps = [...commonSteps];

  if (userRole === 'admin') {
    baseSteps.push(...adminSteps);
  }

  return baseSteps;
};
```

---

## Styling Guide

### Custom CSS Classes

```css
/* src/components/tutorial/styles/tutorial.css */

/* Overlay backdrop */
.tutorial-overlay {
  @apply fixed inset-0 z-[9999];
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(2px);
}

/* Spotlight mask */
.tutorial-spotlight-mask {
  @apply absolute inset-0 pointer-events-none;
}

/* Tooltip container */
.tutorial-tooltip {
  @apply bg-white rounded-lg shadow-2xl;
  max-width: min(400px, 90vw);
  padding: 24px;
}

/* Tooltip arrow */
.tutorial-tooltip-arrow {
  @apply absolute w-4 h-4 bg-white transform rotate-45;
}

/* Progress bar */
.tutorial-progress {
  @apply h-1 bg-teal-500 transition-all duration-300;
}

/* Mobile adaptations */
@media (max-width: 640px) {
  .tutorial-tooltip {
    @apply fixed bottom-0 left-0 right-0 rounded-b-none;
    max-width: 100%;
  }

  .tutorial-controls {
    @apply flex-col gap-2;
  }
}
```

### Tailwind Classes Reference

```typescript
// Common class combinations
const tooltipClasses = "bg-white rounded-lg shadow-2xl p-6 max-w-md";
const controlsClasses = "flex items-center justify-between gap-4 mt-6";
const progressClasses = "w-full h-1 bg-gray-200 rounded-full overflow-hidden";
const spotlightClasses = "absolute pointer-events-none z-[10000]";
```

---

## State Management Examples

### Reading Tutorial State

```typescript
import { useTutorialStore } from '@/stores/tutorialStore';

const Component = () => {
  const {
    isActive,
    currentStep,
    progress,
    currentStepIndex,
    tutorialCompleted
  } = useTutorialStore();

  return (
    <div>
      {isActive && <p>Step {currentStepIndex + 1}: {currentStep?.title}</p>}
      <progress value={progress} max={100} />
    </div>
  );
};
```

### Updating Tutorial State

```typescript
const Component = () => {
  const {
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    resetTutorial
  } = useTutorialStore();

  return (
    <div>
      <button onClick={startTutorial}>Start</button>
      <button onClick={nextStep}>Next</button>
      <button onClick={previousStep}>Back</button>
      <button onClick={skipTutorial}>Skip</button>
      <button onClick={resetTutorial}>Reset</button>
    </div>
  );
};
```

### Custom Hook for Tutorial Logic

```typescript
// src/hooks/useTutorial.ts
import { useEffect } from 'react';
import { useTutorialStore } from '@/stores/tutorialStore';
import { useNavigate, useLocation } from 'react-router-dom';

export const useTutorial = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStep, isActive, nextStep, previousStep } = useTutorialStore();

  // Auto-navigate to step route
  useEffect(() => {
    if (isActive && currentStep?.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }
  }, [currentStep, isActive, navigate, location]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          nextStep();
          break;
        case 'ArrowLeft':
          previousStep();
          break;
        case 'Escape':
          skipTutorial();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, previousStep]);

  return { currentStep, isActive };
};
```

---

## Accessibility Implementation

### ARIA Attributes

```typescript
// TutorialOverlay.tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="tutorial-step-title"
  aria-describedby="tutorial-step-description"
  className="tutorial-overlay"
>
  <div className="tutorial-tooltip">
    <h2 id="tutorial-step-title">{step.title}</h2>
    <p id="tutorial-step-description">{step.description}</p>

    <div role="navigation" aria-label="Tutorial controls">
      <button aria-label="Previous step">Previous</button>
      <button aria-label="Next step">Next</button>
      <button aria-label="Skip tutorial">Skip</button>
    </div>
  </div>
</div>
```

### Focus Management

```typescript
// Trap focus within tutorial overlay
import { useFocusTrap } from '@/hooks/useFocusTrap';

const TutorialOverlay = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef, isActive);

  return (
    <div ref={overlayRef} className="tutorial-overlay">
      {/* Content */}
    </div>
  );
};
```

### Keyboard Navigation

```typescript
const TUTORIAL_KEYS = {
  NEXT: ['Enter', 'ArrowRight'],
  PREVIOUS: ['ArrowLeft'],
  EXIT: ['Escape'],
  SKIP: ['s', 'S']
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (TUTORIAL_KEYS.NEXT.includes(e.key)) {
    e.preventDefault();
    nextStep();
  } else if (TUTORIAL_KEYS.PREVIOUS.includes(e.key)) {
    e.preventDefault();
    previousStep();
  } else if (TUTORIAL_KEYS.EXIT.includes(e.key)) {
    e.preventDefault();
    skipTutorial();
  }
};
```

---

## Animation Examples

### Framer Motion Variants

```typescript
import { motion, AnimatePresence } from 'framer-motion';

// Overlay fade in/out
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

// Tooltip slide in
const tooltipVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 }
  }
};

// Spotlight transition
const spotlightVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3 }
  }
};

// Usage
<AnimatePresence>
  {isActive && (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="tutorial-overlay"
    >
      <motion.div
        variants={tooltipVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="tutorial-tooltip"
      >
        {/* Tooltip content */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### Reduced Motion Support

```typescript
import { useReducedMotion } from 'framer-motion';

const TutorialTooltip = () => {
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      }
    : {
        hidden: { opacity: 0, scale: 0.95, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0 }
      };

  return <motion.div variants={variants} />;
};
```

---

## Mobile Responsive Patterns

### Touch Gestures

```typescript
import { useSwipeable } from 'react-swipeable';

const TutorialOverlay = () => {
  const handlers = useSwipeable({
    onSwipedLeft: () => nextStep(),
    onSwipedRight: () => previousStep(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: false,
    delta: 50 // Minimum swipe distance
  });

  return (
    <div {...handlers} className="tutorial-overlay">
      {/* Content */}
    </div>
  );
};
```

### Responsive Tooltip Positioning

```typescript
const getResponsivePosition = (
  preferredPosition: TooltipPosition,
  isMobile: boolean
): TooltipPosition => {
  if (isMobile) {
    // Always show at bottom on mobile for better UX
    return 'bottom';
  }
  return preferredPosition;
};

// Usage
const position = getResponsivePosition(
  step.tooltipPosition,
  window.innerWidth < 640
);
```

### Mobile-Specific Styles

```typescript
// Detect mobile
const isMobile = window.innerWidth < 640;

const tooltipStyles = isMobile
  ? {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      borderRadius: '16px 16px 0 0',
      maxWidth: '100%'
    }
  : {
      position: 'absolute',
      maxWidth: '400px',
      borderRadius: '8px'
    };
```

---

## Testing Examples

### Unit Tests (Vitest)

```typescript
// __tests__/tutorialStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useTutorialStore } from '@/stores/tutorialStore';

describe('Tutorial Store', () => {
  beforeEach(() => {
    const { resetTutorial } = useTutorialStore.getState();
    resetTutorial();
  });

  it('should start tutorial', () => {
    const { startTutorial, isActive } = useTutorialStore.getState();
    startTutorial();
    expect(isActive).toBe(true);
  });

  it('should progress to next step', () => {
    const { startTutorial, nextStep, currentStepIndex } = useTutorialStore.getState();
    startTutorial();
    nextStep();
    expect(currentStepIndex).toBe(1);
  });

  it('should skip tutorial', () => {
    const { startTutorial, skipTutorial, isActive, tutorialCompleted } =
      useTutorialStore.getState();
    startTutorial();
    skipTutorial();
    expect(isActive).toBe(false);
    expect(tutorialCompleted).toBe(true);
  });
});
```

### Component Tests (React Testing Library)

```typescript
// __tests__/TutorialOverlay.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';

describe('TutorialOverlay', () => {
  it('renders when active', () => {
    render(<TutorialOverlay isActive={true} currentStep={0} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onNext when Next button clicked', () => {
    const onNext = vi.fn();
    render(
      <TutorialOverlay
        isActive={true}
        currentStep={0}
        onNext={onNext}
      />
    );

    fireEvent.click(screen.getByText('Next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('handles Escape key to exit', () => {
    const onExit = vi.fn();
    render(
      <TutorialOverlay
        isActive={true}
        currentStep={0}
        onExit={onExit}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onExit).toHaveBeenCalled();
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/tutorial.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Tutorial Flow', () => {
  test('completes full tutorial', async ({ page }) => {
    await page.goto('/');

    // Start tutorial
    await page.click('[data-testid="tutorial-trigger"]');
    await expect(page.locator('.tutorial-overlay')).toBeVisible();

    // Progress through steps
    const totalSteps = 8;
    for (let i = 0; i < totalSteps; i++) {
      await expect(page.locator('.tutorial-tooltip')).toBeVisible();
      await page.click('button:has-text("Next")');
    }

    // Verify completion
    await expect(page.locator('.tutorial-overlay')).not.toBeVisible();
  });

  test('allows skipping tutorial', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="tutorial-trigger"]');

    await page.click('button:has-text("Skip")');
    await expect(page.locator('.tutorial-overlay')).not.toBeVisible();
  });

  test('persists progress in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="tutorial-trigger"]');
    await page.click('button:has-text("Next")');

    // Reload page
    await page.reload();

    // Check localStorage
    const storedState = await page.evaluate(() =>
      localStorage.getItem('contractorai-tutorial')
    );
    expect(storedState).toBeTruthy();
  });
});
```

---

## Performance Optimization

### Lazy Loading Tutorial Components

```typescript
// App.tsx
import { lazy, Suspense } from 'react';
const TutorialOverlay = lazy(() => import('./components/tutorial/TutorialOverlay'));

function App() {
  return (
    <div>
      <Suspense fallback={null}>
        <TutorialOverlay />
      </Suspense>
    </div>
  );
}
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

const TutorialSpotlight = ({ targetElement }: Props) => {
  // Memoize expensive calculations
  const spotlightPosition = useMemo(() => {
    if (!targetElement) return null;
    return calculateSpotlightPosition(targetElement);
  }, [targetElement]);

  // Memoize callbacks
  const handleResize = useCallback(() => {
    recalculatePosition();
  }, [recalculatePosition]);

  return <div style={spotlightPosition} />;
};
```

### Debounced Resize Handler

```typescript
import { useEffect, useRef } from 'react';

const useDebouncedResize = (callback: () => void, delay = 150) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleResize = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(callback, delay);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [callback, delay]);
};
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Spotlight Not Highlighting Correct Element

```typescript
// Problem: Element selector returns null
// Solution: Ensure element exists before showing step

const waitForElement = (selector: string, timeout = 5000): Promise<HTMLElement> => {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
};
```

#### Issue 2: Tooltip Positioned Off-Screen

```typescript
// Problem: Tooltip overflows viewport
// Solution: Use Floating UI with flip/shift middleware

import { useFloating, flip, shift, offset } from '@floating-ui/react';

const { x, y, strategy, refs } = useFloating({
  placement: preferredPosition,
  middleware: [
    offset(10),
    flip({ fallbackPlacements: ['top', 'bottom', 'left', 'right'] }),
    shift({ padding: 8 })
  ]
});
```

#### Issue 3: Tutorial State Not Persisting

```typescript
// Problem: localStorage not saving state
// Solution: Ensure Zustand persist middleware is configured

import { persist, createJSONStorage } from 'zustand/middleware';

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'contractorai-tutorial',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        // Only persist these fields
        completedStepIds: state.completedStepIds,
        tutorialCompleted: state.tutorialCompleted,
        hasSeenTutorial: state.hasSeenTutorial
      })
    }
  )
);
```

#### Issue 4: Mobile Gestures Not Working

```typescript
// Problem: Swipe gestures not detected
// Solution: Install react-swipeable and configure properly

import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: (eventData) => nextStep(),
  onSwipedRight: (eventData) => previousStep(),
  preventDefaultTouchmoveEvent: true,
  trackTouch: true,
  trackMouse: false, // Important: don't track mouse on desktop
  delta: 50, // Minimum swipe distance
  swipeDuration: 500, // Maximum swipe duration
  touchEventOptions: { passive: false } // Required for preventDefault
});

return <div {...handlers}>Content</div>;
```

---

## Debugging Tools

### Debug Mode

```typescript
// Add to tutorialStore.ts
const DEBUG = import.meta.env.DEV;

const log = (...args: any[]) => {
  if (DEBUG) {
    console.log('[Tutorial]', ...args);
  }
};

// Use throughout store
startTutorial: () => {
  log('Starting tutorial');
  set({ isActive: true, currentStepIndex: 0 });
},
```

### Visual Debug Overlay

```typescript
// TutorialDebugPanel.tsx (dev only)
import { useTutorialStore } from '@/stores/tutorialStore';

const TutorialDebugPanel = () => {
  if (import.meta.env.PROD) return null;

  const state = useTutorialStore();

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded text-xs z-[10001]">
      <h3 className="font-bold mb-2">Tutorial Debug</h3>
      <div>Active: {state.isActive ? 'Yes' : 'No'}</div>
      <div>Step: {state.currentStepIndex + 1} / {tutorialSteps.length}</div>
      <div>Progress: {state.progress.toFixed(1)}%</div>
      <div>Completed: {state.completedStepIds.length} steps</div>
      <div>Current ID: {state.currentStep?.id}</div>
      <div>Route: {state.currentStep?.route || 'none'}</div>
    </div>
  );
};
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Bundle size analyzed (`npm run build -- --analyze`)
- [ ] Lighthouse score > 90 (Performance, Accessibility)
- [ ] Cross-browser testing complete
- [ ] Mobile device testing complete
- [ ] Analytics integration verified
- [ ] Error tracking configured (Sentry/etc)

### Post-Deployment

- [ ] Monitor error rates
- [ ] Track tutorial completion rates
- [ ] Analyze user drop-off points
- [ ] Collect user feedback
- [ ] A/B test alternative flows (if applicable)

---

## Resources

### Documentation
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Floating UI Docs](https://floating-ui.com/)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [React Testing Library](https://testing-library.com/react)

### Tools
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Zustand DevTools](https://github.com/pmndrs/zustand#react-devtools)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Axe DevTools](https://www.deque.com/axe/devtools/)

### Design References
- [Material Design - Onboarding](https://m2.material.io/design/communication/onboarding.html)
- [Apple HIG - Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
- [Nielsen Norman Group - Onboarding UX](https://www.nngroup.com/articles/onboarding-mobile-app-users/)

---

## Support & Contribution

For questions or contributions:
1. Check existing issues in repository
2. Review architecture documentation
3. Follow component conventions
4. Write tests for new features
5. Update documentation

---

**Last Updated:** 2025-10-06
**Maintainer:** Development Team
