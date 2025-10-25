# Tutorial System Visual Diagrams
## Architecture Visualization and Component Interaction

**Version:** 1.0
**Date:** 2025-10-06

---

## Table of Contents

1. [Component Hierarchy Diagram](#component-hierarchy-diagram)
2. [State Flow Diagram](#state-flow-diagram)
3. [User Interaction Flow](#user-interaction-flow)
4. [Positioning Algorithm Flow](#positioning-algorithm-flow)
5. [Mobile vs Desktop Layout](#mobile-vs-desktop-layout)
6. [Integration with Existing App](#integration-with-existing-app)

---

## Component Hierarchy Diagram

```
App.tsx
  │
  ├─ TutorialProvider (Context)
  │   │
  │   ├─ Provides: useTutorialContext()
  │   └─ Manages: Tutorial lifecycle
  │
  ├─ DataProvider (Existing)
  │
  ├─ Sidebar.tsx
  │   │
  │   └─ TutorialTrigger (NEW)
  │       │
  │       ├─ Icon: GraduationCap
  │       ├─ Text: "Tutorial"
  │       ├─ Highlight: Pulse animation (first login)
  │       └─ onClick: startTutorial()
  │
  └─ TutorialOverlay (Conditionally rendered)
      │
      ├─ Portal to document.body
      │
      ├─ TutorialBackdrop
      │   │
      │   ├─ Dark overlay (rgba(0,0,0,0.7))
      │   ├─ Backdrop blur effect
      │   └─ onClick: Exit tutorial (optional)
      │
      ├─ TutorialSpotlight
      │   │
      │   ├─ SVG mask layer
      │   ├─ Calculates target position
      │   ├─ Animated transitions
      │   └─ Responsive to window resize
      │
      ├─ TutorialTooltip
      │   │
      │   ├─ Positioned relative to target
      │   ├─ Arrow pointer
      │   ├─ Step title & description
      │   │
      │   ├─ TutorialProgressBar
      │   │   ├─ Visual progress indicator
      │   │   └─ "Step X of Y" text
      │   │
      │   └─ TutorialControls
      │       ├─ Previous button
      │       ├─ Next button
      │       ├─ Skip button
      │       └─ Exit button
      │
      └─ Uses: useTutorialStore (Zustand)
```

---

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   TUTORIAL STATE MACHINE                     │
└─────────────────────────────────────────────────────────────┘

         ┌──────────────┐
         │   INACTIVE   │ (Initial State)
         └──────┬───────┘
                │
                │ startTutorial()
                ▼
         ┌──────────────┐
         │    ACTIVE    │
         │  (Step 0)    │
         └──────┬───────┘
                │
                │ nextStep()
                ▼
         ┌──────────────┐
         │    ACTIVE    │
         │  (Step 1)    │
         └──────┬───────┘
                │
         ┌──────┴──────┬──────────────┬─────────────┐
         │             │              │             │
         │ nextStep()  │ skipTutorial │ Esc key     │
         │             │              │             │
         ▼             ▼              ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐
    │ ACTIVE  │  │ COMPLETE │  │ SKIPPED  │  │  PAUSED │
    │(Step N) │  │          │  │          │  │         │
    └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘
         │            │             │             │
         │            │             │             │ resumeTutorial()
         │            ▼             ▼             │
         │       ┌────────────────────┐          │
         └──────>│   INACTIVE         │<─────────┘
                 │ (Tutorial Complete)│
                 └────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                   STATE TRANSITIONS                          │
└─────────────────────────────────────────────────────────────┘

Event: startTutorial()
  Before: { isActive: false, currentStepIndex: 0 }
  After:  { isActive: true, currentStepIndex: 0, hasSeenTutorial: true }

Event: nextStep()
  Before: { currentStepIndex: 2 }
  After:  { currentStepIndex: 3, completedStepIds: [...prev, 'step-2'] }

Event: skipTutorial()
  Before: { isActive: true, currentStepIndex: 3 }
  After:  { isActive: false, tutorialCompleted: true }

Event: resetTutorial()
  Before: { tutorialCompleted: true, completedStepIds: [...] }
  After:  { isActive: false, currentStepIndex: 0, completedStepIds: [] }
```

---

## User Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER JOURNEY - TUTORIAL                      │
└─────────────────────────────────────────────────────────────────┘

START: User logs in for the first time
  │
  ├─> Sidebar shows "Tutorial" button with pulsing animation
  │
  └─> User clicks "Tutorial" button
      │
      ├─> Tutorial overlay appears
      ├─> Backdrop darkens page
      └─> Welcome tooltip appears (center screen)
          │
          │ [User reads welcome message]
          │
          └─> User clicks "Next" or presses Enter
              │
              ├─> Navigate to Dashboard (if needed)
              ├─> Spotlight highlights Dashboard link
              ├─> Tooltip appears next to highlighted element
              │   ├─ Shows: "Dashboard Overview"
              │   ├─ Description: Feature explanation
              │   └─ Progress: "Step 2 of 9"
              │
              └─> User clicks "Next" or presses Enter
                  │
                  ├─> Repeat for each feature...
                  │
                  └─> Final step: "You're all set!"
                      │
                      ├─> User clicks "Finish"
                      │
                      └─> Tutorial closes
                          ├─> State saved to localStorage
                          ├─> tutorialCompleted = true
                          └─> User can continue using app


ALTERNATIVE PATHS:

Path 1: User clicks "Skip Tutorial"
  └─> Tutorial closes immediately
      ├─> tutorialCompleted = true
      └─> User can restart anytime

Path 2: User presses Escape key
  └─> Tutorial pauses
      ├─> Confirmation dialog: "Exit tutorial?"
      └─> User chooses:
          ├─> "Yes" → Tutorial closes
          └─> "No" → Tutorial resumes

Path 3: User navigates away (closes browser)
  └─> Progress saved in localStorage
      └─> On return: Tutorial can resume from last step (optional)


MOBILE INTERACTION:

Touch Gestures:
  ├─> Swipe Left → Next step
  ├─> Swipe Right → Previous step
  ├─> Tap backdrop → Exit (optional)
  └─> Tap "Next" button → Next step
```

---

## Positioning Algorithm Flow

```
┌─────────────────────────────────────────────────────────────────┐
│           TOOLTIP POSITIONING ALGORITHM                         │
└─────────────────────────────────────────────────────────────────┘

INPUT:
  ├─ targetElement: HTMLElement
  ├─ tooltipElement: HTMLElement
  └─ preferredPosition: 'top' | 'bottom' | 'left' | 'right'

STEP 1: Get Dimensions
  │
  ├─> targetRect = targetElement.getBoundingClientRect()
  │   ├─ x, y, width, height
  │   └─ top, bottom, left, right
  │
  └─> tooltipRect = tooltipElement.getBoundingClientRect()
      ├─ width, height
      └─ Calculate required space

STEP 2: Calculate All Possible Positions
  │
  ├─> Top Position
  │   ├─ x = targetRect.left + (targetRect.width - tooltipRect.width) / 2
  │   └─ y = targetRect.top - tooltipRect.height - spacing
  │
  ├─> Bottom Position
  │   ├─ x = targetRect.left + (targetRect.width - tooltipRect.width) / 2
  │   └─ y = targetRect.bottom + spacing
  │
  ├─> Left Position
  │   ├─ x = targetRect.left - tooltipRect.width - spacing
  │   └─ y = targetRect.top + (targetRect.height - tooltipRect.height) / 2
  │
  └─> Right Position
      ├─ x = targetRect.right + spacing
      └─ y = targetRect.top + (targetRect.height - tooltipRect.height) / 2

STEP 3: Check Viewport Boundaries
  │
  ├─> viewport = { width: window.innerWidth, height: window.innerHeight }
  │
  └─> For each position, check:
      ├─ x >= 0 (not off left edge)
      ├─ y >= 0 (not off top edge)
      ├─ x + tooltipWidth <= viewportWidth (not off right edge)
      └─ y + tooltipHeight <= viewportHeight (not off bottom edge)

STEP 4: Select Best Position
  │
  ├─> IF preferredPosition fits
  │   └─> RETURN preferredPosition
  │
  ├─> ELSE try fallback order: ['bottom', 'top', 'right', 'left']
  │   └─> RETURN first position that fits
  │
  └─> ELSE (none fit)
      └─> RETURN centered on screen (last resort)

STEP 5: Apply Position
  │
  └─> SET tooltip style:
      ├─ position: 'absolute'
      ├─ top: `${y}px`
      ├─ left: `${x}px`
      └─ transform: calculated for arrow alignment


┌─────────────────────────────────────────────────────────────────┐
│              SPOTLIGHT POSITIONING                              │
└─────────────────────────────────────────────────────────────────┘

INPUT:
  ├─ targetElement: HTMLElement
  ├─ padding: number (default 8px)
  └─ borderRadius: number (default 8px)

STEP 1: Get Target Position
  │
  └─> rect = targetElement.getBoundingClientRect()

STEP 2: Calculate Spotlight Dimensions
  │
  ├─ x = rect.left - padding
  ├─ y = rect.top - padding
  ├─ width = rect.width + (padding * 2)
  ├─ height = rect.height + (padding * 2)
  └─ radius = borderRadius

STEP 3: Create SVG Mask
  │
  └─> <svg>
      <defs>
        <mask id="spotlight-mask">
          <rect fill="white" width="100%" height="100%" />
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={radius}
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

STEP 4: Animate Transition
  │
  └─> Animate x, y, width, height over 300ms ease-out
```

---

## Mobile vs Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                    DESKTOP LAYOUT                               │
│                    (> 1024px width)                             │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                         Full Screen                               │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Dark Backdrop (rgba(0,0,0,0.7) + blur)                  │   │
│   │                                                          │   │
│   │    ┌──────────────┐                                     │   │
│   │    │ Sidebar      │    ┌─────────────────┐             │   │
│   │    │              │    │   Spotlight      │             │   │
│   │    │ [Tutorial]   │←   │   Highlighted    │             │   │
│   │    │ Dashboard    │ ◄──│   Element        │             │   │
│   │    │ Pricing      │    └─────────────────┘             │   │
│   │    │ ...          │                                     │   │
│   │    └──────────────┘            │                        │   │
│   │                                 ▼                        │   │
│   │                    ┌──────────────────────────┐         │   │
│   │                    │ ╭────────────────────╮   │         │   │
│   │                    │ │  Tooltip           │   │         │   │
│   │                    │ │                    │   │         │   │
│   │                    │ │  Step Title        │   │         │   │
│   │                    │ │  Description text  │   │         │   │
│   │                    │ │                    │   │         │   │
│   │                    │ │  Progress: █░░░░   │   │         │   │
│   │                    │ │                    │   │         │   │
│   │                    │ │ [Skip] [← Back]    │   │         │   │
│   │                    │ │        [Next →]    │   │         │   │
│   │                    │ ╰────────────────────╯   │         │   │
│   │                    └──────────────────────────┘         │   │
│   │                                 ▲                        │   │
│   │                                 └─ Arrow pointer        │   │
│   └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘

Tooltip Characteristics:
  ├─ Max width: 400px
  ├─ Padding: 24px
  ├─ Border radius: 8px
  ├─ Shadow: large, soft
  ├─ Position: Dynamically placed (top/bottom/left/right)
  └─ Arrow: Points to highlighted element


┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE LAYOUT                              │
│                    (< 640px width)                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│  Mobile Screen      │
│                     │
│ ┌─────────────────┐ │
│ │ Dark Backdrop   │ │
│ │                 │ │
│ │  ┌───────────┐  │ │
│ │  │Spotlight  │  │ │
│ │  │Highlighted│  │ │
│ │  │ Element   │  │ │
│ │  └───────────┘  │ │
│ │                 │ │
│ │                 │ │
│ │                 │ │
│ │                 │ │
│ │ ╭─────────────╮ │ │
│ │ │ TOOLTIP     │ │ │ ← Fixed bottom
│ │ │ (Full width)│ │ │
│ │ │             │ │ │
│ │ │ Step Title  │ │ │
│ │ │ Description │ │ │
│ │ │             │ │ │
│ │ │ Progress    │ │ │
│ │ │ ████░░░░░   │ │ │
│ │ │             │ │ │
│ │ │ [Skip]      │ │ │
│ │ │ [← Back]    │ │ │
│ │ │ [Next →]    │ │ │
│ │ ╰─────────────╯ │ │
│ └─────────────────┘ │
└─────────────────────┘
      ▲
      └─ Swipe gestures:
         ├─ Swipe Left = Next
         └─ Swipe Right = Previous

Mobile Adaptations:
  ├─ Tooltip always at bottom
  ├─ Full screen width
  ├─ Rounded top corners only
  ├─ Larger touch targets (48px height)
  ├─ Stacked buttons (vertical)
  ├─ No arrow pointer
  └─ Swipe gestures enabled
```

---

## Integration with Existing App

```
┌─────────────────────────────────────────────────────────────────┐
│                  APP INTEGRATION DIAGRAM                        │
└─────────────────────────────────────────────────────────────────┘

BEFORE (Current State):

App.tsx
  │
  ├─ DataProvider
  │   └─ useData() context
  │
  ├─ Sidebar (left)
  │   ├─ Navigation items
  │   └─ Subscription panel (bottom)
  │
  ├─ Header (top)
  │   └─ User menu
  │
  └─ Routes (main content)
      ├─ /dashboard
      ├─ /pricing
      ├─ /projects
      └─ ...


AFTER (With Tutorial):

App.tsx
  │
  ├─ TutorialProvider ◄─── NEW
  │   │
  │   └─ Provides: useTutorialContext()
  │
  ├─ DataProvider
  │   └─ useData() context
  │
  ├─ Sidebar (left) ◄─── MODIFIED
  │   │
  │   ├─ TutorialTrigger ◄─── NEW (top of nav)
  │   │   ├─ data-tutorial="tutorial-trigger"
  │   │   └─ onClick: startTutorial()
  │   │
  │   ├─ Navigation items ◄─── MODIFIED (add data-tutorial attrs)
  │   │   ├─ Dashboard: data-tutorial="dashboard-link"
  │   │   ├─ Pricing: data-tutorial="pricing-link"
  │   │   ├─ Projects: data-tutorial="projects-link"
  │   │   └─ ...
  │   │
  │   └─ Subscription panel (bottom)
  │
  ├─ Header (top)
  │   └─ User menu
  │
  ├─ Routes (main content)
  │   ├─ /dashboard
  │   ├─ /pricing
  │   ├─ /projects
  │   └─ ...
  │
  └─ Portal.createPortal() ◄─── NEW
      │
      └─> TutorialOverlay (rendered at document.body)
          │
          ├─ Only renders when isActive = true
          ├─ Z-index: 9999 (above everything)
          └─ Contains all tutorial UI


┌─────────────────────────────────────────────────────────────────┐
│                  DATA FLOW INTEGRATION                          │
└─────────────────────────────────────────────────────────────────┘

Component Tree                    State Management
───────────────                   ────────────────

App
 │
 ├─ TutorialProvider ─────────────> useTutorialStore (Zustand)
 │   │                               │
 │   └─ Children                     ├─ isActive
 │                                   ├─ currentStepIndex
 │                                   ├─ completedStepIds
 │                                   ├─ tutorialCompleted
 │                                   └─ Actions:
 ├─ Sidebar                              ├─ startTutorial()
 │   │                                   ├─ nextStep()
 │   └─ TutorialTrigger ─────────────>  ├─ previousStep()
 │        onClick()                      └─ skipTutorial()
 │
 └─ TutorialOverlay ─────────────────┐
      │                              │
      ├─ useEffect() ────────────────┤
      │  (watches currentStep)       │
      │                              │
      └─ Navigates routes ───────────┘
           via useNavigate()


                                    Persistence
                                    ───────────

                                    localStorage
                                         │
                                         ├─ completedStepIds
                                         ├─ tutorialCompleted
                                         └─ hasSeenTutorial

                                    Zustand persist middleware
                                    auto-syncs state ←→ localStorage
```

---

## Component Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              COMPONENT COMMUNICATION DIAGRAM                    │
└─────────────────────────────────────────────────────────────────┘

User Action: "Click Tutorial Button"
  │
  │ [1] TutorialTrigger.onClick()
  │
  └──> [2] useTutorialStore.startTutorial()
         │
         ├──> [3] State Update
         │     ├─ isActive = true
         │     ├─ currentStepIndex = 0
         │     └─ hasSeenTutorial = true
         │
         └──> [4] Re-render Subscribed Components
                │
                ├──> TutorialOverlay (now visible)
                │     │
                │     ├──> [5] useEffect: Detect currentStep change
                │     │
                │     └──> [6] Navigate to step.route (if needed)
                │           │
                │           └──> useNavigate('/dashboard')
                │
                ├──> TutorialSpotlight
                │     │
                │     └──> [7] Find target element
                │           │
                │           └──> document.querySelector(step.targetSelector)
                │                 │
                │                 └──> Calculate position & render
                │
                └──> TutorialTooltip
                      │
                      └──> [8] Position relative to target
                            │
                            ├──> Calculate optimal position
                            ├──> Render title & description
                            └──> Render controls


User Action: "Click Next Button"
  │
  │ [1] TutorialControls.onNext()
  │
  └──> [2] useTutorialStore.nextStep()
         │
         ├──> [3] State Update
         │     ├─ currentStepIndex += 1
         │     └─ completedStepIds.push(prevStep.id)
         │
         ├──> [4] Persist to localStorage
         │
         └──> [5] Re-render Components
                │
                ├──> TutorialOverlay (new step)
                ├──> TutorialSpotlight (animate to new target)
                └──> TutorialTooltip (new content)


Resize Event: "Window Resized"
  │
  │ [1] window.addEventListener('resize')
  │
  └──> [2] Debounced Handler (150ms)
         │
         └──> [3] Re-calculate Positions
                │
                ├──> TutorialSpotlight.recalculate()
                └──> TutorialTooltip.reposition()
```

---

## Accessibility Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   ACCESSIBILITY DIAGRAM                         │
└─────────────────────────────────────────────────────────────────┘

Screen Reader User Flow:

[1] User tabs to Tutorial button
    │
    ├─ Focus ring visible
    └─ Announces: "Tutorial button. Start guided tour of application"

[2] User presses Enter
    │
    └─ Tutorial starts

[3] Screen reader announces:
    │
    ├─ "Tutorial dialog opened"
    ├─ "Step 1 of 9"
    ├─ Reads title: "Welcome to ContractorAI"
    └─ Reads description: "Let's take a quick tour..."

[4] Focus moves to first control (Skip button)
    │
    └─ User can Tab through:
        ├─ Skip button
        ├─ Previous button (disabled)
        ├─ Next button
        └─ Exit button

[5] User presses Tab → focuses Next button
    │
    └─ Announces: "Next button. Move to step 2 of 9"

[6] User presses Enter → next step
    │
    └─ Screen reader announces:
        ├─ "Step 2 of 9"
        ├─ Reads new title
        └─ Reads new description

[7] User presses Escape → exit tutorial
    │
    └─ Screen reader announces:
        ├─ "Tutorial dialog closed"
        └─ Focus returns to Tutorial button


Keyboard Navigation:

┌────────────┬──────────────────────────────────┐
│    Key     │           Action                 │
├────────────┼──────────────────────────────────┤
│ Tab        │ Move focus to next control       │
│ Shift+Tab  │ Move focus to previous control   │
│ Enter      │ Activate focused control / Next  │
│ Space      │ Activate focused control         │
│ Arrow Right│ Next step                        │
│ Arrow Left │ Previous step                    │
│ Escape     │ Exit tutorial                    │
│ S          │ Skip tutorial                    │
└────────────┴──────────────────────────────────┘


ARIA Structure:

<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="tutorial-title"
  aria-describedby="tutorial-description"
  aria-live="polite"
>
  <h2 id="tutorial-title">Welcome to ContractorAI</h2>
  <p id="tutorial-description">Let's take a quick tour...</p>

  <div role="group" aria-label="Tutorial progress">
    <div aria-label="Step 1 of 9">
      <div role="progressbar" aria-valuenow="11" aria-valuemin="0" aria-valuemax="100">
        Progress: 11%
      </div>
    </div>
  </div>

  <nav aria-label="Tutorial controls">
    <button aria-label="Skip tutorial">Skip</button>
    <button aria-label="Previous step" aria-disabled="true">Previous</button>
    <button aria-label="Next step">Next</button>
    <button aria-label="Exit tutorial">Exit</button>
  </nav>
</div>
```

---

## Performance Optimization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              PERFORMANCE OPTIMIZATION                           │
└─────────────────────────────────────────────────────────────────┘

Initial Load:
  │
  ├─ Tutorial components NOT loaded
  ├─ Bundle size: 0 KB added
  └─ User sees main app immediately


User Clicks "Tutorial":
  │
  ├─ [1] Trigger lazy load
  │       │
  │       └─> const TutorialOverlay = lazy(() => import(...))
  │
  ├─ [2] Load tutorial bundle (~12 KB gzipped)
  │       │
  │       ├─ TutorialOverlay.js
  │       ├─ TutorialSpotlight.js
  │       ├─ TutorialTooltip.js
  │       └─ Dependencies (Floating UI, Framer Motion)
  │
  └─ [3] Render Suspense fallback (spinner)
          │
          └─ [4] Tutorial ready → render overlay


Runtime Optimizations:

Position Calculations:
  │
  ├─ useMemo(() => calculatePosition(target), [target])
  │   └─ Only recalculate when target changes
  │
  └─ useCallback(() => handleResize(), [])
      └─ Debounced (150ms) to prevent excessive calculations


Re-renders:
  │
  ├─ React.memo(TutorialTooltip)
  │   └─ Only re-render when props change
  │
  └─ Zustand selective subscription
      └─ Component only re-renders on relevant state changes


Animations:
  │
  ├─ CSS transforms (GPU-accelerated)
  │   ├─ transform: translate3d(x, y, 0)
  │   └─ will-change: transform
  │
  └─ Framer Motion (optimized animations)
      └─ 60 FPS transitions


Memory Management:
  │
  ├─ Cleanup on unmount
  │   ├─ Remove event listeners
  │   ├─ Clear timeouts
  │   └─ Disconnect observers
  │
  └─ Lazy unmount
      └─ Keep overlay in DOM until animation complete
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   ERROR HANDLING                                │
└─────────────────────────────────────────────────────────────────┘

Scenario 1: Target Element Not Found
  │
  ├─> Step config: targetSelector = '[data-tutorial="missing"]'
  │
  ├─> [1] TutorialSpotlight tries to find element
  │         │
  │         └─> element = document.querySelector(selector)
  │
  ├─> [2] element === null
  │         │
  │         ├─> Log warning to console
  │         │
  │         ├─> Wait for element (MutationObserver)
  │         │     │
  │         │     └─> Timeout after 5 seconds
  │         │
  │         └─> If still not found:
  │               │
  │               ├─> Show tooltip without spotlight
  │               ├─> Center tooltip on screen
  │               └─> Add "Element not available" message
  │
  └─> [3] User can still continue tutorial


Scenario 2: Navigation Failure
  │
  ├─> Step config: route = '/invalid-route'
  │
  ├─> [1] useNavigate(step.route)
  │         │
  │         └─> Route not found → redirects to 404
  │
  ├─> [2] Error boundary catches navigation error
  │         │
  │         └─> Skip to next step automatically
  │
  └─> [3] Log error to analytics


Scenario 3: localStorage Full
  │
  ├─> [1] Zustand persist middleware tries to save
  │         │
  │         └─> QuotaExceededError
  │
  ├─> [2] Catch error in persist config
  │         │
  │         ├─> Log warning
  │         └─> Continue without persistence
  │
  └─> [3] Tutorial still functional (in-memory state)


Scenario 4: Corrupted localStorage Data
  │
  ├─> [1] Zustand tries to hydrate from localStorage
  │         │
  │         └─> JSON.parse() throws error
  │
  ├─> [2] Catch in safeParseState()
  │         │
  │         ├─> Clear corrupted data
  │         ├─> Return default state
  │         └─> Log error
  │
  └─> [3] Tutorial starts fresh


Error Boundary:

<ErrorBoundary
  fallback={
    <div>
      Tutorial encountered an error.
      <button onClick={resetTutorial}>Restart</button>
    </div>
  }
>
  <TutorialOverlay />
</ErrorBoundary>
```

---

## Multi-Device Synchronization (Future)

```
┌─────────────────────────────────────────────────────────────────┐
│         OPTIONAL: DATABASE SYNC (FUTURE ENHANCEMENT)            │
└─────────────────────────────────────────────────────────────────┘

Current State: localStorage only
  │
  └─ Pros: Fast, offline, simple
  └─ Cons: Not synced across devices


Future Enhancement: Supabase Sync
  │
  ├─> Database Schema:
  │     │
  │     └─> Table: tutorial_progress
  │           ├─ user_id (FK)
  │           ├─ tutorial_completed (boolean)
  │           ├─ current_step_index (int)
  │           ├─ completed_step_ids (jsonb)
  │           └─ updated_at (timestamp)
  │
  ├─> Flow:
  │     │
  │     ├─> [1] Load from localStorage (fast)
  │     │
  │     ├─> [2] Fetch from database (background)
  │     │         │
  │     │         └─> If remote is newer → sync down
  │     │
  │     └─> [3] On state change → debounce save to DB
  │               │
  │               └─> Sync up (non-blocking)
  │
  └─> Benefits:
        ├─ Progress synced across devices
        ├─ Analytics on tutorial completion
        └─ Can send reminders to incomplete users
```

---

**END OF VISUAL DIAGRAMS**

For implementation code, see:
- `TUTORIAL_SYSTEM_ARCHITECTURE.md` (main specification)
- `TUTORIAL_IMPLEMENTATION_GUIDE.md` (developer guide)
