# Ad Analytics System - Implementation Guide

## 🎯 Overview

Complete ad analytics tracking system built and ready for integration. No AI yet - just pure tracking functions.

## 📁 File Structure

```
src/
├── types/
│   └── analytics.ts           # All TypeScript types
├── services/
│   └── analytics.ts           # Core tracking functions
├── hooks/
│   └── useAnalytics.ts        # React hook for components
└── pages/
    └── AnalyticsDashboard.tsx # Dashboard UI
```

## 🚀 What's Built

### 1. **Types & Schema** (`src/types/analytics.ts`)
- ✅ AdCampaign - Campaign structure
- ✅ AdEvent - Event tracking
- ✅ AdMetrics - Performance metrics
- ✅ UserSession - Session tracking
- ✅ ConversionFunnel - Funnel analytics
- ✅ AnalyticsSummary - Dashboard data
- ✅ RealTimeMetrics - Live data
- ✅ Attribution - Multi-touch attribution

### 2. **Core Functions** (`src/services/analytics.ts`)

#### Event Tracking
```typescript
// Track any ad event
trackAdEvent(event: AdEvent): Promise<AdEvent>

// Track page views with UTM
trackPageView(params: {
  page_url: string;
  utm_source?: string;
  utm_campaign?: string;
  // ...
}): Promise<void>

// Track calculator usage
trackCalculatorUse(params: {
  calculator_type: string;
  session_id: string;
  estimated_value?: number;
}): Promise<void>

// Track conversions
trackConversion(params: {
  conversion_type: string;
  conversion_value: number;
  metadata?: Record<string, any>;
}): Promise<void>
```

#### Session Management
```typescript
startSession(params): Promise<UserSession>
getCurrentSession(): UserSession | null
updateSession(updates): Promise<void>
endSession(): Promise<void>
```

#### Analytics Queries
```typescript
calculateCampaignMetrics(campaignId, startDate, endDate): Promise<AdMetrics>
getConversionFunnel(campaignId, date): Promise<ConversionFunnel>
getRealTimeMetrics(): Promise<RealTimeMetrics>
getAnalyticsSummary(startDate, endDate): Promise<AnalyticsSummary>
```

#### Attribution
```typescript
calculateAttribution(touchpoints, value, model): Attribution
// Models: first_click, last_click, linear, position_based
```

### 3. **React Hook** (`src/hooks/useAnalytics.ts`)

Easy integration in any component:

```typescript
const { trackPage, trackCalculator, trackConversion, track } = useAnalytics();

// Track page view
trackPage('/pricing');

// Track calculator use
trackCalculator('roofing', 15000);

// Track conversion
trackConversion('quote_request', 15000, { material: 'asphalt' });

// Track custom event
track('phone_click', { phone: '+1-555-0123' });
```

### 4. **Dashboard UI** (`src/pages/AnalyticsDashboard.tsx`)

Full analytics dashboard with:
- Real-time metrics (live updates every 30s)
- Key performance metrics (spend, clicks, conversions, ROAS)
- Platform breakdown
- Top campaigns
- Date range filtering
- Metric cards with trend indicators

## 📊 Supported Platforms

```typescript
type AdPlatform =
  | 'google_ads'
  | 'facebook_ads'
  | 'meta_ads'
  | 'instagram_ads'
  | 'linkedin_ads'
  | 'tiktok_ads'
  | 'bing_ads'
  | 'youtube_ads'
  | 'twitter_ads'
  | 'organic'
  | 'direct'
  | 'referral';
```

## 📈 Tracked Events

```typescript
type UserAction =
  | 'page_view'
  | 'calculator_use'
  | 'quote_request'
  | 'form_submit'
  | 'phone_click'
  | 'email_click'
  | 'signup'
  | 'purchase'
  | 'download'
  | 'video_view';
```

## 🔧 How to Use

### Step 1: Track Page Views Automatically

In your main App component:

```typescript
import { usePageTracking } from './hooks/useAnalytics';

function App() {
  usePageTracking(); // Auto-tracks page views on route change

  return <Router>...</Router>
}
```

### Step 2: Track Calculator Usage

In your RoofingCalculator component:

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

function RoofingCalculator() {
  const { trackCalculator, trackConversion } = useAnalytics();

  const handleCalculate = () => {
    // ... calculation logic

    // Track calculator use
    trackCalculator('roofing', totalEstimate);

    // If user requests quote, track conversion
    if (requestQuote) {
      trackConversion('quote_request', totalEstimate, {
        material: selectedMaterial,
        area: roofArea
      });
    }
  };
}
```

### Step 3: Track Link Clicks

```typescript
const { track } = useAnalytics();

<a
  href="tel:+15550123"
  onClick={() => track('phone_click', { phone: '+15550123' })}
>
  Call Now
</a>

<a
  href="mailto:contact@example.com"
  onClick={() => track('email_click', { email: 'contact@example.com' })}
>
  Email Us
</a>
```

### Step 4: Access Dashboard

Add route to your app:

```typescript
import AnalyticsDashboard from './pages/AnalyticsDashboard';

<Route path="/analytics" element={<AnalyticsDashboard />} />
```

## 🗄️ Data Storage (Ready for Supabase)

All functions have TODO markers for Supabase integration:

```typescript
// TODO: Save to Supabase
// Currently logs to console and localStorage
```

### Database Schema Needed:

**Table: `ad_events`**
```sql
CREATE TABLE ad_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  platform TEXT,
  event_type TEXT,
  user_id TEXT,
  session_id TEXT,
  timestamp TIMESTAMPTZ,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  page_url TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  conversion_value NUMERIC,
  metadata JSONB
);
```

**Table: `user_sessions`**
```sql
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_start TIMESTAMPTZ,
  session_end TIMESTAMPTZ,
  initial_source TEXT,
  initial_campaign_id TEXT,
  page_views INTEGER,
  converted BOOLEAN,
  conversion_value NUMERIC,
  device_info JSONB
);
```

**Table: `ad_campaigns`**
```sql
CREATE TABLE ad_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT,
  platform TEXT,
  campaign_type TEXT,
  status TEXT,
  budget NUMERIC,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ
);
```

## 🎨 Features Ready to Implement

### Currently Working:
✅ Event tracking (console logs)
✅ Session management (localStorage)
✅ UTM parameter extraction
✅ Device/browser detection
✅ Attribution calculation
✅ Dashboard UI
✅ Real-time metrics structure
✅ Platform auto-detection

### Next Steps (After Supabase):
- [ ] Save events to database
- [ ] Query real data for dashboard
- [ ] Implement charts (Chart.js/Recharts)
- [ ] Add export functionality (CSV/PDF)
- [ ] Email reports
- [ ] Slack/webhook notifications
- [ ] AI-powered insights (Phase 2)

## 🤖 AI Integration (Phase 2)

When ready to add AI:

```typescript
// AI Functions to Build:
- analyzeCampaignPerformance() - GPT analyzes metrics
- generateInsights() - AI finds patterns
- predictConversions() - ML forecasting
- optimizeBudget() - AI budget allocation
- suggestABTests() - AI test recommendations
- writeAdCopy() - GPT ad generation
```

## 📝 Usage Examples

### Track Roofing Calculator
```typescript
const { trackCalculator, trackConversion } = useAnalytics();

// When calculator is used
trackCalculator('roofing', 18500);

// When user submits quote form
trackConversion('quote_request', 18500, {
  roof_area: 2073,
  material: 'asphalt',
  pitch: '6:12'
});
```

### Track Campaign Performance
```typescript
import { calculateCampaignMetrics } from '../services/analytics';

const metrics = await calculateCampaignMetrics(
  'campaign_123',
  '2025-01-01',
  '2025-01-31'
);

console.log(metrics.ctr); // 3.5%
console.log(metrics.conversion_rate); // 12.3%
console.log(metrics.roas); // 4.2x
```

### Multi-Touch Attribution
```typescript
import { calculateAttribution } from '../services/analytics';

const touchpoints = [
  { timestamp: '...', platform: 'google_ads', campaign_id: '...', action: 'page_view' },
  { timestamp: '...', platform: 'facebook_ads', campaign_id: '...', action: 'calculator_use' },
  { timestamp: '...', platform: 'direct', campaign_id: '...', action: 'quote_request' }
];

const attribution = calculateAttribution(touchpoints, 15000, 'position_based');
// First click: 40%, Middle: 20%, Last click: 40%
```

## 🔗 Integration Checklist

- [x] Create types/analytics.ts
- [x] Create services/analytics.ts
- [x] Create hooks/useAnalytics.ts
- [x] Create pages/AnalyticsDashboard.tsx
- [ ] Add Supabase tables
- [ ] Update services to use Supabase
- [ ] Add route to App.tsx
- [ ] Integrate in RoofingCalculator
- [ ] Add page view tracking
- [ ] Test event tracking
- [ ] Verify dashboard displays data
- [ ] Add AI insights (Phase 2)

## 🚦 Testing

```bash
# Run dev server
npm run dev

# Open browser console
# Check for: "📊 Tracking ad event:" logs
# Check localStorage for: "analytics_session"

# Test flow:
1. Visit page with UTM params: /?utm_source=google&utm_campaign=test
2. Use calculator
3. Submit quote form
4. Check console logs
5. Visit /analytics dashboard
```

## 📚 Next Steps

1. **Connect to Supabase**
   - Create database tables
   - Update TODO sections in services/analytics.ts
   - Replace console.log with actual DB inserts

2. **Add to App**
   - Import usePageTracking in App.tsx
   - Add analytics route
   - Integrate in components

3. **Test Everything**
   - Track events
   - View dashboard
   - Verify data flow

4. **AI Phase** (Later)
   - Build AI analysis functions
   - Add insights to dashboard
   - Implement predictions

---

**System is ready!** All functions built, types defined, dashboard created. Just needs Supabase connection and integration into existing components.
