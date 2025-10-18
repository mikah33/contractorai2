# ContractorAI Onboarding Implementation Guide

## Overview

This guide outlines the implementation plan for the ContractorAI user onboarding sequence. The onboarding is designed to progressively introduce users to the platform's features, starting with simple navigation and building up to advanced workflows.

## Onboarding Structure

### Total Steps: 16
### Estimated Duration: 3-5 minutes
### Progression: Simple → Complex

## Step-by-Step Breakdown

### Phase 1: Getting Started (Steps 1-3)
**Focus: Navigation & Orientation**

**Step 1: Welcome to ContractorAI**
- Type: Center modal overlay
- Category: Navigation
- Content: Welcome message with high-level value proposition
- Action: Introduces the platform's core purpose
- Next: User clicks "Start Tour" button

**Step 2: Your Command Center**
- Type: Highlight overlay on dashboard stats
- Category: Navigation
- Content: Overview of the 4 key metric cards (Active Projects, Pending Estimates, Total Revenue, Total Clients)
- Action: Highlights the stat cards area
- Next: Auto-advances after 3 seconds

**Step 3: Navigate Your Workspace**
- Type: Highlight sidebar navigation
- Category: Navigation
- Content: Explains the main navigation menu
- Action: Pulses the sidebar to draw attention
- Next: User clicks "Next" button

---

### Phase 2: Core Workflows (Steps 4-11)
**Focus: Daily Operations**

**Step 4: Build Your Client Base**
- Page: /clients
- Type: Highlight "New Client" button
- Category: Core feature
- Content: Introduction to client management
- Action: Navigates to clients page, highlights add button
- Next: User clicks "Next"

**Step 5: Organize Your Work**
- Page: /projects
- Type: Highlight "New Project" button
- Category: Core feature
- Content: Introduction to project tracking
- Action: Navigates to projects page, shows project grid
- Next: User clicks "Next"

**Step 6: Deep Project Management**
- Page: /projects
- Type: Highlight first project card
- Category: Core feature
- Content: Explains project detail tabs (Overview, Tasks, Team, Progress, Comments, Estimates)
- Action: Shows what's inside a project
- Next: User clicks "Next"

**Step 7: Quick Price Estimates**
- Page: /pricing
- Type: Highlight calculator grid
- Category: Core feature
- Content: Introduces specialized trade calculators (roofing, electrical, plumbing, etc.)
- Note: Does NOT walk through individual calculators
- Action: Shows calculator selection screen
- Next: User clicks "Next"

**Step 8: Professional Proposals**
- Page: /estimates
- Type: Highlight "New Estimate" button
- Category: Core feature
- Content: Introduction to estimate creation
- Action: Shows estimate editor interface
- Next: User clicks "Next"

**Step 9: Estimate to Invoice**
- Page: /estimates
- Type: Highlight action buttons (Preview, Send, Actions menu)
- Category: Advanced
- Content: Explains the workflow: Create → Preview → Send → Approve → Convert to Invoice
- Action: Points out key action buttons
- Next: User clicks "Next"

**Step 10: Schedule Everything**
- Page: /calendar
- Type: Highlight "Add Event" button
- Category: Core feature
- Content: Introduction to calendar for appointments, deadlines, tasks
- Action: Shows calendar view
- Next: User clicks "Next"

**Step 11: Financial Control**
- Page: /finance
- Type: Highlight finance dashboard
- Category: Core feature
- Content: Overview of income tracking, expense management, invoice monitoring
- Action: Shows finance summary section
- Next: User clicks "Next"

---

### Phase 3: Advanced Features (Steps 12-15)
**Focus: Optimization & Power Features**

**Step 12: Track Payments**
- Page: /finance
- Type: Highlight invoice tab
- Category: Advanced
- Content: Explains invoice creation from estimates, payment tracking, reminders
- Action: Switches to invoice tab
- Next: User clicks "Next"

**Step 13: Expense Management**
- Page: /finance
- Type: Highlight "Add Expense" button
- Category: Advanced
- Content: Introduction to expense tracking for profitability analysis
- Action: Shows expense section
- Next: User clicks "Next"

**Step 14: Manage Your Team**
- Page: /employees
- Type: Highlight "Add Employee" button
- Category: Advanced
- Content: Introduction to team member management and project assignment
- Action: Shows employee list
- Next: User clicks "Next"

**Step 15: Customize Your Experience**
- Page: /settings
- Type: Highlight settings tabs
- Category: Advanced
- Content: Explains company profile, branding, default terms, preferences
- Action: Shows settings panel
- Next: User clicks "Next"

---

### Phase 4: Completion (Step 16)
**Focus: Next Steps**

**Step 16: You're All Set!**
- Page: /dashboard (returns user)
- Type: Center modal overlay
- Category: Navigation
- Content: Congratulations message with suggested first actions
- Action: Completes tour, offers option to add first client/project
- Next: User clicks "Get Started" button

---

## Technical Implementation Requirements

### UI Components Needed

1. **TourOverlay Component**
   - Semi-transparent backdrop
   - Spotlight effect on highlighted elements
   - Responsive positioning
   - Z-index management

2. **TourTooltip Component**
   - Title display
   - Description text
   - Progress indicator (e.g., "Step 5 of 16")
   - Navigation buttons (Previous, Next, Skip)
   - Progress bar
   - Positioning: top, bottom, left, right, center-modal

3. **TourProgress Component**
   - Phase indicators (Getting Started, Core Workflows, Advanced Features)
   - Step completion checkmarks
   - Skip functionality with confirmation

### State Management

```typescript
interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  skipped: boolean;
  completed: boolean;
  tourActive: boolean;
  userPreferences: {
    showOnLogin: boolean;
    lastCompletedStep: number;
  };
}
```

### User Preferences Storage

Store in localStorage or user profile:
- `onboarding_completed`: boolean
- `onboarding_current_step`: number
- `onboarding_skipped`: boolean
- `show_onboarding_on_login`: boolean

### Navigation Logic

- Automatic page navigation when step requires different page
- Wait for page load before highlighting elements
- Fallback if element not found (skip to next step)
- Return to dashboard at completion

### Element Selection Strategy

Use CSS selectors and data attributes:
- Prefer `data-tour-id` attributes for reliability
- Fallback to CSS classes
- Calculate dynamic positions based on element bounds
- Handle mobile/tablet responsive layouts

### Analytics Events

Track the following:
- Tour started
- Step viewed (with step number)
- Step completed
- Tour skipped (with step number)
- Tour completed
- Tour restarted
- Dropoff points

---

## UX Best Practices

1. **Always Skippable**: Users can skip at any time
2. **Resumable**: Users can return to where they left off
3. **Non-Intrusive**: Can be minimized and resumed later
4. **Clear Progress**: Visual indication of progress and remaining steps
5. **Contextual**: Only highlights relevant UI elements
6. **Responsive**: Works on mobile, tablet, and desktop
7. **Fast**: Each step loads quickly, minimal delay
8. **Benefit-Focused**: Explains "why" not just "what"

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Create TourOverlay component
- Create TourTooltip component
- Implement state management
- Add data-tour-id attributes to key elements

### Phase 2: Step Implementation (Week 2)
- Implement Steps 1-8 (Getting Started + Core Workflows part 1)
- Test navigation between pages
- Implement element highlighting

### Phase 3: Advanced Steps (Week 3)
- Implement Steps 9-16 (Core Workflows part 2 + Advanced Features)
- Add progress tracking
- Implement skip/resume functionality

### Phase 4: Polish & Testing (Week 4)
- Add analytics tracking
- Cross-browser testing
- Mobile responsive testing
- User acceptance testing
- Performance optimization

---

## Success Metrics

Track these KPIs:
- **Completion Rate**: % of users who complete the tour
- **Dropoff Points**: Which steps users skip or abandon
- **Time to Complete**: Average duration users take
- **Feature Adoption**: Engagement with features after tour
- **Tour Restart Rate**: How many users restart the tour

---

## Accessibility Considerations

- Keyboard navigation (Tab, Enter, Esc keys)
- Screen reader announcements for each step
- High contrast mode support
- Focus management
- ARIA labels and roles

---

## Future Enhancements

1. **Contextual Mini-Tours**: Feature-specific tours triggered when user first accesses a feature
2. **Video Integration**: Short video clips for complex features
3. **Interactive Demos**: Let users try actions in a sandbox
4. **Personalization**: Different tours for different contractor types
5. **Tooltips**: Persistent help tooltips on hover after tour completion

---

## File Structure

```
/src/components/onboarding/
  ├── TourProvider.tsx          # Context provider for tour state
  ├── TourOverlay.tsx           # Backdrop and spotlight effect
  ├── TourTooltip.tsx           # Tooltip with content and controls
  ├── TourProgress.tsx          # Progress indicator
  ├── useTour.ts                # Custom hook for tour logic
  └── tourSteps.ts              # Step configuration data

/src/hooks/
  └── useOnboarding.ts          # Hook for managing onboarding state

/src/utils/
  └── tourHelpers.ts            # Helper functions for positioning, navigation
```

---

## Getting Started (For Developers)

1. Install dependencies (if any third-party tour library used)
2. Import tour data from `/docs/onboarding-sequence.json`
3. Add `data-tour-id` attributes to relevant UI elements
4. Initialize tour on first user login
5. Add tour restart option in Settings page

---

## Maintenance

- Review and update tour quarterly as features change
- Update screenshots when UI changes
- Monitor analytics to identify improvement opportunities
- Gather user feedback through post-tour survey
