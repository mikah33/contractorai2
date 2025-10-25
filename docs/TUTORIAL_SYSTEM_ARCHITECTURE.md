# Tutorial System Architecture Specification
## ContractorAI Onboarding System

**Version:** 1.0
**Last Updated:** 2025-10-06
**Author:** System Architecture Designer

---

## Executive Summary

This document provides a comprehensive technical specification for implementing an interactive, progressive disclosure-based tutorial system for the ContractorAI contractor management application. The system will guide new users through core features using spotlight-based overlays, progressive step-by-step walkthroughs, and mobile-responsive design patterns.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Architecture Overview](#2-architecture-overview)
3. [Component Design](#3-component-design)
4. [State Management](#4-state-management)
5. [Data Structures](#5-data-structures)
6. [Integration Strategy](#6-integration-strategy)
7. [Technology Stack](#7-technology-stack)
8. [Implementation Phases](#8-implementation-phases)
9. [Architecture Decision Records](#9-architecture-decision-records)
10. [Quality Attributes](#10-quality-attributes)

---

## 1. System Requirements

### 1.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Tutorial accessible from sidebar navigation (above Dashboard) | MUST |
| FR-2 | Step-by-step walkthrough with "Next" button progression | MUST |
| FR-3 | Overlay/spotlight effect highlighting current feature | MUST |
| FR-4 | Simple explanations for each feature | MUST |
| FR-5 | Only activated when user clicks "Tutorial" | MUST |
| FR-6 | Skip/Exit option available at any time | MUST |
| FR-7 | Progress indicator showing current step | MUST |
| FR-8 | Mobile-responsive design | MUST |
| FR-9 | Tutorial completion tracking | SHOULD |
| FR-10 | Ability to restart tutorial | SHOULD |
| FR-11 | Analytics tracking for tutorial engagement | COULD |

### 1.2 Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| Performance | Initial load time | < 200ms |
| Performance | Step transition animation | < 100ms |
| Accessibility | WCAG 2.1 AA compliance | 100% |
| Browser Support | Modern browsers (Chrome, Firefox, Safari, Edge) | Last 2 versions |
| Mobile Support | iOS Safari, Chrome Mobile | iOS 14+, Android 10+ |
| Bundle Size | Tutorial code addition | < 15KB gzipped |

---

## 2. Architecture Overview

### 2.1 System Architecture Diagram (C4 - Context Level)

```
┌─────────────────────────────────────────────────────────────┐
│                    ContractorAI Application                  │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Sidebar    │───>│   Tutorial   │───>│  Main Pages  │  │
│  │  Navigation  │    │   System     │    │   (Routed)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                            │                                 │
│                            v                                 │
│                   ┌──────────────────┐                      │
│                   │  Tutorial Store  │                      │
│                   │    (Zustand)     │                      │
│                   └──────────────────┘                      │
│                            │                                 │
│                            v                                 │
│                   ┌──────────────────┐                      │
│                   │   LocalStorage   │                      │
│                   │  (Persistence)   │                      │
│                   └──────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Architecture Diagram (C4 - Component Level)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Tutorial System                              │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    TutorialProvider                         │   │
│  │  (Context Provider - manages global tutorial state)        │   │
│  └────────────────────┬───────────────────────────────────────┘   │
│                       │                                             │
│         ┌─────────────┼─────────────┬──────────────────┐          │
│         │             │             │                  │          │
│    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐      ┌─────▼─────┐    │
│    │Tutorial │  │Spotlight│  │Tutorial │      │ Progress  │    │
│    │ Overlay │  │Component│  │ Tooltip │      │Indicator  │    │
│    └─────────┘  └─────────┘  └─────────┘      └───────────┘    │
│                                                                     │
│    ┌────────────────────────────────────────────────────┐        │
│    │           TutorialControls                         │        │
│    │  (Next, Previous, Skip, Exit buttons)             │        │
│    └────────────────────────────────────────────────────┘        │
│                                                                     │
│    ┌────────────────────────────────────────────────────┐        │
│    │          useTutorialStore (Zustand)                │        │
│    │  - currentStep                                     │        │
│    │  - isActive                                        │        │
│    │  - completedSteps                                 │        │
│    │  - tutorialCompleted                              │        │
│    └────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow Diagram

```
User Clicks Tutorial Button
        │
        ▼
Trigger Tutorial Start
        │
        ▼
Initialize Tutorial State (Zustand)
        │
        ▼
Render Tutorial Overlay
        │
        ▼
┌───────────────────────┐
│   Step Progression    │
│   ┌───────────────┐   │
│   │ 1. Highlight  │   │
│   │    Element    │   │
│   └───────┬───────┘   │
│           ▼           │
│   ┌───────────────┐   │
│   │ 2. Show       │   │
│   │    Tooltip    │   │
│   └───────┬───────┘   │
│           ▼           │
│   ┌───────────────┐   │
│   │ 3. Wait for   │   │
│   │    User Click │   │
│   └───────┬───────┘   │
│           │           │
│           ▼           │
│    [Next/Skip/Exit]   │
└───────────┬───────────┘
            │
            ▼
    Update State & Persist
            │
            ▼
    Move to Next Step / Complete
```

---

## 3. Component Design

### 3.1 Component Hierarchy

```
src/
├── components/
│   ├── tutorial/
│   │   ├── TutorialProvider.tsx          # Context provider
│   │   ├── TutorialOverlay.tsx           # Main overlay component
│   │   ├── TutorialSpotlight.tsx         # Spotlight effect
│   │   ├── TutorialTooltip.tsx           # Tooltip with content
│   │   ├── TutorialControls.tsx          # Next/Skip/Exit buttons
│   │   ├── TutorialProgressBar.tsx       # Progress indicator
│   │   └── TutorialTrigger.tsx           # Sidebar trigger button
│   └── layout/
│       └── Sidebar.tsx                    # Modified to include trigger
├── stores/
│   └── tutorialStore.ts                   # Zustand store
├── hooks/
│   ├── useTutorial.ts                     # Custom hook
│   └── useTutorialStep.ts                 # Step-specific hook
├── config/
│   └── tutorialSteps.ts                   # Tutorial step definitions
└── types/
    └── tutorial.ts                         # TypeScript types
```

### 3.2 Component Specifications

#### 3.2.1 TutorialProvider

**Purpose:** Global context provider for tutorial state management.

**Props:**
```typescript
interface TutorialProviderProps {
  children: React.ReactNode;
}
```

**Responsibilities:**
- Initialize tutorial state on mount
- Provide tutorial context to child components
- Handle tutorial lifecycle (start, pause, complete, reset)
- Persist state changes to localStorage

**Dependencies:**
- `useTutorialStore` (Zustand)
- `tutorialSteps` configuration

---

#### 3.2.2 TutorialOverlay

**Purpose:** Main overlay component that orchestrates the tutorial experience.

**Props:**
```typescript
interface TutorialOverlayProps {
  isActive: boolean;
  currentStep: number;
  onComplete: () => void;
  onSkip: () => void;
}
```

**Responsibilities:**
- Render dark overlay backdrop
- Coordinate spotlight and tooltip positioning
- Handle keyboard navigation (Esc to exit, Arrow keys for navigation)
- Manage z-index layering

**Visual Specs:**
- Backdrop: `rgba(0, 0, 0, 0.7)` with blur effect
- Z-index: `9999`
- Animation: Fade in/out (300ms)

---

#### 3.2.3 TutorialSpotlight

**Purpose:** Highlight specific UI elements with spotlight effect.

**Props:**
```typescript
interface TutorialSpotlightProps {
  targetElement: HTMLElement | null;
  padding?: number;
  borderRadius?: number;
}
```

**Responsibilities:**
- Calculate target element position and dimensions
- Create SVG mask for spotlight effect
- Handle responsive positioning on window resize
- Smooth transition between highlighted elements

**Implementation Approach:**
```typescript
// Use SVG mask technique for crisp edges
<svg className="tutorial-spotlight-mask">
  <defs>
    <mask id="spotlight-mask">
      <rect fill="white" width="100%" height="100%" />
      <rect
        x={targetRect.left - padding}
        y={targetRect.top - padding}
        width={targetRect.width + padding * 2}
        height={targetRect.height + padding * 2}
        rx={borderRadius}
        fill="black"
      />
    </mask>
  </defs>
  <rect
    fill="rgba(0,0,0,0.7)"
    width="100%"
    height="100%"
    mask="url(#spotlight-mask)"
  />
</svg>
```

---

#### 3.2.4 TutorialTooltip

**Purpose:** Display step content and explanations.

**Props:**
```typescript
interface TutorialTooltipProps {
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  targetElement: HTMLElement | null;
  showArrow?: boolean;
}
```

**Responsibilities:**
- Position tooltip relative to highlighted element
- Auto-adjust position to stay within viewport
- Render markdown content if needed
- Display step number and title

**Visual Specs:**
- Max width: 400px (desktop), 90vw (mobile)
- Background: White with subtle shadow
- Arrow pointer to highlighted element
- Padding: 24px
- Font size: 16px (title), 14px (description)

**Positioning Algorithm:**
```typescript
// Use Floating UI library for intelligent positioning
const { x, y, strategy, middlewareData } = useFloating({
  placement: preferredPosition,
  middleware: [
    offset(10),
    flip(),
    shift({ padding: 8 }),
    arrow({ element: arrowRef })
  ]
});
```

---

#### 3.2.5 TutorialControls

**Purpose:** Navigation controls for tutorial progression.

**Props:**
```typescript
interface TutorialControlsProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onExit: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}
```

**Responsibilities:**
- Render Next, Previous, Skip, Exit buttons
- Enable/disable buttons based on current step
- Handle keyboard shortcuts (Enter for Next, Esc for Exit)

**Visual Layout:**
```
┌────────────────────────────────────┐
│  [Skip Tutorial]    [Exit (×)]     │
│                                    │
│  [← Previous]  [Next →]  [Finish] │
└────────────────────────────────────┘
```

---

#### 3.2.6 TutorialProgressBar

**Purpose:** Visual indicator of tutorial progress.

**Props:**
```typescript
interface TutorialProgressBarProps {
  currentStep: number;
  totalSteps: number;
  showStepNumber?: boolean;
}
```

**Visual Specs:**
- Width: 100%
- Height: 4px
- Background: `rgba(255, 255, 255, 0.2)`
- Progress fill: Teal gradient
- Show "Step X of Y" text

---

#### 3.2.7 TutorialTrigger

**Purpose:** Sidebar button to start tutorial.

**Props:**
```typescript
interface TutorialTriggerProps {
  onClick: () => void;
}
```

**Visual Integration:**
- Position: Top of sidebar navigation (above Dashboard)
- Icon: Graduation cap or help circle
- Text: "Tutorial" or "Quick Tour"
- Highlight on first login (pulsing animation)

---

## 4. State Management

### 4.1 Zustand Store Design

**File:** `src/stores/tutorialStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  tooltipPosition: 'top' | 'bottom' | 'left' | 'right';
  route?: string; // Optional route to navigate to
  beforeShow?: () => Promise<void>; // Async setup function
  onNext?: () => void; // Callback after next
  spotlightPadding?: number;
  spotlightRadius?: number;
}

interface TutorialState {
  // State
  isActive: boolean;
  currentStepIndex: number;
  completedStepIds: string[];
  tutorialCompleted: boolean;
  hasSeenTutorial: boolean;
  isPaused: boolean;

  // Computed
  currentStep: TutorialStep | null;
  progress: number; // 0-100

  // Actions
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepIndex: number) => void;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  markStepComplete: (stepId: string) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      // Initial state
      isActive: false,
      currentStepIndex: 0,
      completedStepIds: [],
      tutorialCompleted: false,
      hasSeenTutorial: false,
      isPaused: false,

      // Computed values
      get currentStep() {
        const { currentStepIndex } = get();
        return tutorialSteps[currentStepIndex] || null;
      },

      get progress() {
        const { currentStepIndex } = get();
        return ((currentStepIndex + 1) / tutorialSteps.length) * 100;
      },

      // Actions
      startTutorial: () => set({
        isActive: true,
        currentStepIndex: 0,
        isPaused: false,
        hasSeenTutorial: true
      }),

      nextStep: () => set((state) => {
        const nextIndex = state.currentStepIndex + 1;
        if (nextIndex >= tutorialSteps.length) {
          return {
            isActive: false,
            tutorialCompleted: true
          };
        }
        return {
          currentStepIndex: nextIndex,
          completedStepIds: [
            ...state.completedStepIds,
            tutorialSteps[state.currentStepIndex].id
          ]
        };
      }),

      previousStep: () => set((state) => ({
        currentStepIndex: Math.max(0, state.currentStepIndex - 1)
      })),

      goToStep: (stepIndex: number) => set({
        currentStepIndex: stepIndex
      }),

      pauseTutorial: () => set({ isPaused: true }),

      resumeTutorial: () => set({ isPaused: false }),

      skipTutorial: () => set({
        isActive: false,
        isPaused: false,
        tutorialCompleted: true
      }),

      completeTutorial: () => set({
        isActive: false,
        tutorialCompleted: true,
        completedStepIds: tutorialSteps.map(s => s.id)
      }),

      resetTutorial: () => set({
        isActive: false,
        currentStepIndex: 0,
        completedStepIds: [],
        tutorialCompleted: false,
        isPaused: false
      }),

      markStepComplete: (stepId: string) => set((state) => ({
        completedStepIds: [...state.completedStepIds, stepId]
      }))
    }),
    {
      name: 'contractorai-tutorial',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        completedStepIds: state.completedStepIds,
        tutorialCompleted: state.tutorialCompleted,
        hasSeenTutorial: state.hasSeenTutorial
      })
    }
  )
);
```

### 4.2 State Persistence Strategy

**LocalStorage Schema:**
```json
{
  "contractorai-tutorial": {
    "state": {
      "completedStepIds": ["step-1", "step-2"],
      "tutorialCompleted": false,
      "hasSeenTutorial": true
    },
    "version": 1
  }
}
```

**Migration Strategy:**
- Version field for future schema changes
- Only persist completion state, not active state
- Clear on logout (optional, configurable)

---

## 5. Data Structures

### 5.1 Tutorial Step Configuration

**File:** `src/config/tutorialSteps.ts`

```typescript
import { TutorialStep } from '../types/tutorial';

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    targetSelector: 'body',
    title: 'Welcome to ContractorAI!',
    description: 'Let\'s take a quick tour of the platform. This will only take 2 minutes.',
    tooltipPosition: 'bottom',
    spotlightPadding: 0,
  },
  {
    id: 'dashboard',
    targetSelector: '[data-tutorial="dashboard-link"]',
    title: 'Dashboard Overview',
    description: 'Your central hub for project insights, revenue tracking, and quick stats.',
    tooltipPosition: 'right',
    route: '/',
    spotlightPadding: 8,
    spotlightRadius: 8
  },
  {
    id: 'pricing-calculator',
    targetSelector: '[data-tutorial="pricing-link"]',
    title: 'Pricing Calculator',
    description: 'Calculate accurate project estimates with our AI-powered pricing engine.',
    tooltipPosition: 'right',
    route: '/pricing'
  },
  {
    id: 'estimate-generator',
    targetSelector: '[data-tutorial="estimates-link"]',
    title: 'Estimate Generator',
    description: 'Create professional estimates and proposals in minutes.',
    tooltipPosition: 'right',
    route: '/estimates'
  },
  {
    id: 'project-manager',
    targetSelector: '[data-tutorial="projects-link"]',
    title: 'Project Manager',
    description: 'Track all your projects, timelines, and progress in one place.',
    tooltipPosition: 'right',
    route: '/projects'
  },
  {
    id: 'clients',
    targetSelector: '[data-tutorial="clients-link"]',
    title: 'Client Management',
    description: 'Organize client information, history, and communication.',
    tooltipPosition: 'right',
    route: '/clients'
  },
  {
    id: 'calendar',
    targetSelector: '[data-tutorial="calendar-link"]',
    title: 'Calendar',
    description: 'Schedule jobs, track deadlines, and manage your team\'s time.',
    tooltipPosition: 'right',
    route: '/calendar'
  },
  {
    id: 'finance-tracker',
    targetSelector: '[data-tutorial="finance-link"]',
    title: 'Finance Tracker',
    description: 'Monitor cash flow, invoices, and financial health.',
    tooltipPosition: 'right',
    route: '/finance'
  },
  {
    id: 'completion',
    targetSelector: 'body',
    title: 'You\'re All Set!',
    description: 'You can always restart this tutorial from the sidebar. Happy contracting!',
    tooltipPosition: 'bottom',
  }
];
```

### 5.2 TypeScript Type Definitions

**File:** `src/types/tutorial.ts`

```typescript
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  tooltipPosition: TooltipPosition;
  route?: string;
  beforeShow?: () => Promise<void>;
  onNext?: () => void;
  onPrevious?: () => void;
  spotlightPadding?: number;
  spotlightRadius?: number;
  highlightElement?: boolean; // Default true
  allowInteraction?: boolean; // Allow clicks on highlighted element
}

export interface TutorialConfig {
  steps: TutorialStep[];
  autoStart?: boolean; // Auto-start on first login
  showProgressBar?: boolean;
  allowKeyboardNavigation?: boolean;
  persistProgress?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export interface TutorialAnalytics {
  stepViews: Record<string, number>;
  completionRate: number;
  averageTimePerStep: Record<string, number>;
  skipRate: number;
  exitPoints: Record<string, number>;
}
```

---

## 6. Integration Strategy

### 6.1 Routing Strategy

**Decision:** Stay on current page, navigate programmatically when needed.

**Rationale:**
- Reduces complexity
- Maintains tutorial context
- Better user experience (no full page reloads)

**Implementation:**
```typescript
// In TutorialOverlay component
const navigate = useNavigate();

useEffect(() => {
  const step = currentStep;
  if (step?.route && location.pathname !== step.route) {
    navigate(step.route);
  }
}, [currentStep, navigate, location]);
```

### 6.2 Sidebar Integration

**Modified Sidebar Component:**

```typescript
// src/components/layout/Sidebar.tsx
const navigation = [
  {
    name: 'Tutorial',
    icon: GraduationCap,
    onClick: () => startTutorial(),
    type: 'button',
    highlight: !hasSeenTutorial
  },
  { name: 'Dashboard', icon: Home, href: '/', 'data-tutorial': 'dashboard-link' },
  // ... rest of navigation
];
```

### 6.3 App-Level Integration

**Modified App.tsx:**

```typescript
import { TutorialProvider } from './components/tutorial/TutorialProvider';
import TutorialOverlay from './components/tutorial/TutorialOverlay';

function App() {
  return (
    <TutorialProvider>
      <DataProvider>
        <div className="flex h-screen bg-gray-50">
          <Sidebar ... />
          <main>
            <Routes>...</Routes>
          </main>
          <TutorialOverlay />
        </div>
      </DataProvider>
    </TutorialProvider>
  );
}
```

### 6.4 Target Element Markup

**Add data attributes to tutorial targets:**

```typescript
// Example: Dashboard link in Sidebar
<Link
  to="/"
  data-tutorial="dashboard-link"
  className="..."
>
  Dashboard
</Link>
```

---

## 7. Technology Stack

### 7.1 Library Selection

Based on research and project requirements:

| Library | Purpose | Justification |
|---------|---------|---------------|
| **Zustand** | State management | Already in project, lightweight, TypeScript-friendly |
| **React Router** | Navigation | Already in project |
| **Floating UI** | Tooltip positioning | Industry standard, 30KB, intelligent positioning |
| **Framer Motion** | Animations | Smooth transitions, 40KB, React-optimized |
| **lucide-react** | Icons | Already in project |

### 7.2 Alternative Considered: Pre-built Libraries

**Options evaluated:**
- **Driver.js** (9KB): Lightweight, no dependencies
- **Shepherd.js** (20KB): Feature-rich, requires Popper.js
- **Intro.js** (15KB): Popular, licensing concerns for commercial use
- **React Joyride** (25KB): React-specific, mature

**Decision: Build Custom Solution**

**Rationale:**
1. **Bundle Size:** Custom solution ~12KB vs 20-25KB for full-featured library
2. **Flexibility:** Full control over styling and behavior
3. **Integration:** Seamless Zustand integration
4. **Learning Curve:** Team already familiar with React patterns
5. **No Licensing Issues:** Avoid commercial licensing fees
6. **Tailwind Styling:** Direct integration with existing design system

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up Zustand store
- [ ] Create TypeScript types
- [ ] Define tutorial steps configuration
- [ ] Build TutorialProvider context

### Phase 2: Core Components (Week 2)
- [ ] TutorialOverlay component
- [ ] TutorialSpotlight component
- [ ] TutorialTooltip component
- [ ] Basic positioning logic

### Phase 3: Controls & Navigation (Week 3)
- [ ] TutorialControls component
- [ ] TutorialProgressBar component
- [ ] Keyboard navigation
- [ ] Route navigation logic

### Phase 4: Integration (Week 4)
- [ ] Integrate with Sidebar
- [ ] Add data-tutorial attributes
- [ ] App-level integration
- [ ] LocalStorage persistence

### Phase 5: Polish & Testing (Week 5)
- [ ] Mobile responsive design
- [ ] Animations and transitions
- [ ] Accessibility audit
- [ ] Cross-browser testing
- [ ] Analytics integration (optional)

---

## 9. Architecture Decision Records

### ADR-001: State Management with Zustand

**Status:** Accepted
**Date:** 2025-10-06

**Context:**
Need to manage tutorial state across components and persist user progress.

**Decision:**
Use Zustand with localStorage persistence.

**Consequences:**
- **Positive:** Lightweight, TypeScript-friendly, already in project
- **Positive:** Built-in persistence middleware
- **Positive:** No provider hell, direct store access
- **Negative:** Learning curve for team unfamiliar with Zustand

**Alternatives Considered:**
- React Context: Too verbose, performance concerns
- Redux: Overkill for this use case
- Component state: Can't share across routes

---

### ADR-002: Custom Implementation vs Pre-built Library

**Status:** Accepted
**Date:** 2025-10-06

**Context:**
Evaluate building custom tutorial system vs using existing library.

**Decision:**
Build custom solution using Floating UI for positioning.

**Consequences:**
- **Positive:** Full control over features and styling
- **Positive:** Smaller bundle size
- **Positive:** No licensing concerns
- **Negative:** More development time
- **Negative:** Need to implement accessibility features ourselves

---

### ADR-003: Routing Strategy - In-Place vs Full Navigation

**Status:** Accepted
**Date:** 2025-10-06

**Context:**
Determine if tutorial should navigate between pages or highlight elements in place.

**Decision:**
Use programmatic navigation with React Router, maintain tutorial overlay across routes.

**Consequences:**
- **Positive:** Smoother user experience
- **Positive:** Tutorial context persists
- **Positive:** Can demonstrate features in their actual locations
- **Negative:** Requires careful overlay positioning on route change

---

### ADR-004: Spotlight Implementation - CSS vs SVG

**Status:** Accepted
**Date:** 2025-10-06

**Context:**
Choose technique for creating spotlight effect around highlighted elements.

**Decision:**
Use SVG mask with dynamic positioning.

**Consequences:**
- **Positive:** Crisp edges, smooth animations
- **Positive:** Works on all modern browsers
- **Positive:** Better performance than multiple DOM elements
- **Negative:** Slightly more complex than CSS box-shadow

---

### ADR-005: Persistence Strategy

**Status:** Accepted
**Date:** 2025-10-06

**Context:**
Decide what tutorial state to persist and where.

**Decision:**
Persist completion status and step progress in localStorage, not database.

**Consequences:**
- **Positive:** Fast, no network requests
- **Positive:** Works offline
- **Positive:** No database schema changes
- **Negative:** Cleared if user clears browser data
- **Negative:** Not synced across devices

---

## 10. Quality Attributes

### 10.1 Performance Requirements

**Metrics:**
- Tutorial initialization: < 200ms
- Step transition: < 100ms (60fps animations)
- Memory footprint: < 5MB
- Bundle size impact: < 15KB gzipped

**Optimization Strategies:**
- Lazy load tutorial components
- Use CSS transforms for animations (GPU-accelerated)
- Debounce window resize events
- Memoize expensive calculations (element positions)

### 10.2 Accessibility Requirements

**WCAG 2.1 AA Compliance:**

| Criterion | Implementation |
|-----------|----------------|
| **1.4.3 Contrast** | Ensure 4.5:1 contrast ratio for text |
| **2.1.1 Keyboard** | Full keyboard navigation (Tab, Enter, Esc, Arrows) |
| **2.4.3 Focus Order** | Logical focus sequence |
| **2.4.7 Focus Visible** | Clear focus indicators |
| **4.1.2 Name, Role, Value** | Proper ARIA labels |

**ARIA Attributes:**
```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="tutorial-title"
  aria-describedby="tutorial-description"
>
  <h2 id="tutorial-title">{step.title}</h2>
  <p id="tutorial-description">{step.description}</p>
</div>
```

**Keyboard Shortcuts:**
- `Enter`: Next step
- `Esc`: Exit tutorial
- `→`: Next step
- `←`: Previous step
- `Tab`: Navigate between controls

### 10.3 Mobile Responsiveness

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adaptations:**
- Full-screen tooltips on mobile
- Swipe gestures for next/previous
- Larger touch targets (44x44px minimum)
- Simplified spotlight effect
- Bottom-aligned controls

**Touch Gestures:**
```typescript
const swipeHandlers = useSwipeable({
  onSwipedLeft: () => nextStep(),
  onSwipedRight: () => previousStep(),
  preventDefaultTouchmoveEvent: true,
  trackMouse: false
});
```

### 10.4 Browser Compatibility

**Supported Browsers:**
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions (iOS 14+)

**Polyfills Needed:**
- None (using modern React + Vite build)

**Graceful Degradation:**
- Fallback to simple modal if SVG masks not supported
- Disable animations if `prefers-reduced-motion`

---

## 11. Code Structure Recommendations

### 11.1 File Organization

```
src/
├── components/
│   └── tutorial/
│       ├── index.ts                      # Barrel export
│       ├── TutorialProvider.tsx          # ~80 lines
│       ├── TutorialOverlay.tsx           # ~150 lines
│       ├── TutorialSpotlight.tsx         # ~120 lines
│       ├── TutorialTooltip.tsx           # ~100 lines
│       ├── TutorialControls.tsx          # ~80 lines
│       ├── TutorialProgressBar.tsx       # ~50 lines
│       └── styles/
│           └── tutorial.css              # Shared styles
├── hooks/
│   ├── useTutorial.ts                    # ~40 lines
│   ├── useTutorialStep.ts                # ~60 lines
│   └── useElementPosition.ts             # ~50 lines
├── stores/
│   └── tutorialStore.ts                  # ~120 lines
├── config/
│   └── tutorialSteps.ts                  # ~100 lines
├── types/
│   └── tutorial.ts                       # ~60 lines
└── utils/
    ├── tutorialHelpers.ts                # ~80 lines
    └── positioning.ts                    # ~100 lines
```

### 11.2 Naming Conventions

**Components:** PascalCase (e.g., `TutorialOverlay`)
**Hooks:** camelCase with `use` prefix (e.g., `useTutorial`)
**Types:** PascalCase with suffix (e.g., `TutorialStep`)
**Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_PADDING`)

### 11.3 Testing Strategy

**Unit Tests:**
- Zustand store actions
- Utility functions (positioning, helpers)
- Custom hooks

**Integration Tests:**
- Component interactions
- Navigation between steps
- LocalStorage persistence

**E2E Tests:**
- Complete tutorial flow
- Skip/Exit functionality
- Mobile responsive behavior

**Test Coverage Target:** 80%

---

## 12. Security Considerations

### 12.1 XSS Prevention

- Sanitize any user-generated content in tooltips
- Use React's built-in XSS protection (no `dangerouslySetInnerHTML` unless necessary)
- Validate data from localStorage before hydration

### 12.2 localStorage Security

- No sensitive data in tutorial state
- Validate schema on load
- Handle corrupted data gracefully

```typescript
const safeParseState = (storedValue: string) => {
  try {
    const parsed = JSON.parse(storedValue);
    return validateTutorialState(parsed) ? parsed : getDefaultState();
  } catch {
    return getDefaultState();
  }
};
```

---

## 13. Analytics & Monitoring (Optional)

### 13.1 Events to Track

```typescript
// Tutorial started
analytics.track('tutorial_started', {
  timestamp: Date.now()
});

// Step viewed
analytics.track('tutorial_step_viewed', {
  stepId: string,
  stepIndex: number,
  timeOnPreviousStep: number
});

// Tutorial completed
analytics.track('tutorial_completed', {
  totalTime: number,
  stepsCompleted: number
});

// Tutorial skipped
analytics.track('tutorial_skipped', {
  lastStep: string,
  percentComplete: number
});
```

### 13.2 Metrics Dashboard

**KPIs to Monitor:**
- Completion rate
- Average time per step
- Drop-off points
- Skip rate
- Mobile vs Desktop completion rates

---

## 14. Future Enhancements

### 14.1 Phase 2 Features (Future)

- [ ] Multi-language support (i18n)
- [ ] Video tutorials embedded in tooltips
- [ ] Conditional branching based on user role
- [ ] Interactive "try it yourself" steps
- [ ] Tutorial replay on specific features
- [ ] Contextual help triggers (show tutorial step when user struggles)
- [ ] A/B testing different tutorial flows
- [ ] Tutorial templates for new features

### 14.2 Advanced Capabilities

- [ ] AI-powered personalized tutorial paths
- [ ] Voice-guided tutorial option
- [ ] Gamification (badges, achievements)
- [ ] Social sharing (completed tutorial)
- [ ] Admin dashboard to edit tutorial steps without code changes

---

## 15. Success Metrics

### 15.1 Definition of Done

- [ ] Tutorial accessible from sidebar
- [ ] All 8 core features covered
- [ ] Mobile responsive (tested on iOS/Android)
- [ ] < 15KB bundle size impact
- [ ] 80%+ test coverage
- [ ] WCAG 2.1 AA compliant
- [ ] Works on all target browsers
- [ ] No performance regressions

### 15.2 Success Criteria (Post-Launch)

- **User Engagement:** 60%+ of new users start tutorial
- **Completion Rate:** 40%+ complete entire tutorial
- **Support Reduction:** 20% reduction in "how do I..." support tickets
- **Feature Discovery:** 30% increase in feature usage post-tutorial

---

## 16. References

### 16.1 Research Sources

1. **Driver.js Documentation:** https://driverjs.com/
2. **Shepherd.js Guide:** https://shepherdjs.dev/
3. **Floating UI Docs:** https://floating-ui.com/
4. **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
5. **Progressive Disclosure Patterns:** Nielsen Norman Group
6. **React Performance Optimization:** React.dev

### 16.2 Design Inspiration

- **Notion** onboarding flow
- **Linear** product tour
- **Figma** interactive tutorials
- **Airtable** guided setup

---

## Appendix A: Sample Step Implementation

```typescript
// Example: Dashboard step with async setup
{
  id: 'dashboard-stats',
  targetSelector: '[data-tutorial="stat-cards"]',
  title: 'Key Metrics at a Glance',
  description: 'Track your revenue, active projects, and pending estimates in real-time.',
  tooltipPosition: 'bottom',
  route: '/',
  beforeShow: async () => {
    // Ensure data is loaded before showing step
    await waitForElement('[data-tutorial="stat-cards"]');
  },
  onNext: () => {
    // Track analytics
    analytics.track('dashboard_step_completed');
  },
  spotlightPadding: 16,
  spotlightRadius: 12
}
```

---

## Appendix B: Positioning Algorithm

```typescript
/**
 * Calculate optimal tooltip position to stay within viewport
 */
export const calculateTooltipPosition = (
  targetElement: HTMLElement,
  tooltipElement: HTMLElement,
  preferredPosition: TooltipPosition
): { x: number; y: number; position: TooltipPosition } => {
  const targetRect = targetElement.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  const spacing = 12; // Gap between target and tooltip

  const positions = {
    top: {
      x: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
      y: targetRect.top - tooltipRect.height - spacing
    },
    bottom: {
      x: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
      y: targetRect.bottom + spacing
    },
    left: {
      x: targetRect.left - tooltipRect.width - spacing,
      y: targetRect.top + (targetRect.height - tooltipRect.height) / 2
    },
    right: {
      x: targetRect.right + spacing,
      y: targetRect.top + (targetRect.height - tooltipRect.height) / 2
    }
  };

  // Check if preferred position fits
  const preferred = positions[preferredPosition];
  const fitsInViewport =
    preferred.x >= 0 &&
    preferred.y >= 0 &&
    preferred.x + tooltipRect.width <= viewport.width &&
    preferred.y + tooltipRect.height <= viewport.height;

  if (fitsInViewport) {
    return { ...preferred, position: preferredPosition };
  }

  // Try all positions, return first that fits
  const positionOrder: TooltipPosition[] = ['bottom', 'top', 'right', 'left'];
  for (const pos of positionOrder) {
    const coords = positions[pos];
    if (
      coords.x >= 0 &&
      coords.y >= 0 &&
      coords.x + tooltipRect.width <= viewport.width &&
      coords.y + tooltipRect.height <= viewport.height
    ) {
      return { ...coords, position: pos };
    }
  }

  // Fallback: center on screen
  return {
    x: (viewport.width - tooltipRect.width) / 2,
    y: (viewport.height - tooltipRect.height) / 2,
    position: 'bottom'
  };
};
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-06 | System Architect | Initial specification |

---

**END OF DOCUMENT**
