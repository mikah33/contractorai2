## Google Ads Integration - Complete Setup Guide

### 📋 What We Built

**Supabase Tables:**
- ✅ `ad_accounts` - Store connected Google/Meta ad accounts
- ✅ `ad_campaigns` - Store campaign data
- ✅ `ad_metrics` - Store daily performance metrics
- ✅ `ad_events` - Track user interactions & conversions

**React Components:**
- ✅ `/src/services/googleAds.ts` - All Google Ads functions
- ✅ `/src/pages/AdAccountsSetup.tsx` - UI to connect accounts
- ✅ `/src/pages/AnalyticsDashboard.tsx` - View performance

**Migration File:**
- ✅ `/supabase/migrations/create_ad_analytics_tables.sql`

---

## 🚀 Step-by-Step Implementation

### Step 1: Run Database Migration

```bash
# In your terminal
cd ~/git/contractorai/contractorai2

# Run the migration
psql $DATABASE_URL < supabase/migrations/create_ad_analytics_tables.sql
```

This creates all 4 tables:
- `ad_accounts`
- `ad_campaigns`
- `ad_metrics`
- `ad_events`

### Step 2: Set Up Google Ads API

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Create new project (or use existing)

2. **Enable Google Ads API:**
   - Go to "APIs & Services" → "Library"
   - Search "Google Ads API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "ContractorAI Google Ads"
   - Authorized redirect URIs:
     - `http://localhost:5174/ad-oauth-callback` (development)
     - `https://yourdomain.com/ad-oauth-callback` (production)
   - Click "Create"
   - **Save Client ID and Client Secret**

4. **Get Developer Token:**
   - Visit: https://ads.google.com/aw/apicenter
   - Click "Get Developer Token"
   - Fill out form (may take 1-2 days for approval)

### Step 3: Add Environment Variables

In your `.env` file:

```bash
# Google Ads OAuth
VITE_GOOGLE_ADS_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_ADS_CLIENT_SECRET=your-client-secret

# Google Ads API
VITE_GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
```

### Step 4: Add Routes to Your App

In `src/App.tsx`:

```tsx
import AdAccountsSetup from './pages/AdAccountsSetup';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

// Add routes
<Route path="/ad-accounts" element={<AdAccountsSetup />} />
<Route path="/analytics" element={<AnalyticsDashboard />} />
```

### Step 5: Create OAuth Callback Handler

Create `/src/pages/AdOAuthCallback.tsx`:

```tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAdAccount } from '../services/googleAds';

const AdOAuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (!code) {
        navigate('/ad-accounts');
        return;
      }

      try {
        // Exchange code for tokens (server-side)
        const response = await fetch('/api/google-ads/oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const { access_token, refresh_token, account_id, account_name } = await response.json();

        // Save account
        await createAdAccount({
          platform: 'google_ads',
          account_name,
          account_id,
          access_token,
          refresh_token,
        });

        navigate('/ad-accounts');
      } catch (error) {
        console.error('OAuth failed:', error);
        navigate('/ad-accounts?error=oauth_failed');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl text-gray-600">Connecting to Google Ads...</div>
    </div>
  );
};

export default AdOAuthCallback;
```

Add route:
```tsx
<Route path="/ad-oauth-callback" element={<AdOAuthCallback />} />
```

---

## 📊 How the System Works

### 1. **Connect Account**
- User clicks "Connect Google Ads"
- Redirects to Google OAuth
- Google redirects back with code
- Exchange code for tokens
- Save account to `ad_accounts` table

### 2. **Sync Campaigns**
- Fetch campaigns from Google Ads API
- Save to `ad_campaigns` table
- Update `last_synced_at`

### 3. **Sync Metrics**
- Fetch daily metrics from Google Ads API
- Save to `ad_metrics` table
- Calculate: impressions, clicks, conversions, spend, ROAS

### 4. **Track Events**
- User visits page → save to `ad_events`
- User uses calculator → save to `ad_events`
- User converts → save to `ad_events`
- Use for attribution analysis

---

## 🔧 Available Functions

### Ad Account Management
```typescript
// Create account
await createAdAccount({
  platform: 'google_ads',
  account_name: 'My Google Ads',
  account_id: '123-456-7890',
  access_token: 'token',
  refresh_token: 'refresh',
});

// Get all accounts
const accounts = await getAdAccounts();

// Update account
await updateAdAccount(accountId, { status: 'paused' });

// Delete account
await deleteAdAccount(accountId);
```

### Campaign Management
```typescript
// Get campaigns
const campaigns = await getCampaigns(accountId);

// Get specific campaign
const campaign = await getCampaign(campaignId);

// Update campaign
await updateCampaign(campaignId, { status: 'paused' });
```

### Metrics
```typescript
// Save metrics
await saveCampaignMetrics(campaignId, '2025-01-15', {
  impressions: 1000,
  clicks: 50,
  conversions: 5,
  spend: 250,
  revenue: 1000,
});

// Get metrics
const metrics = await getCampaignMetrics(
  campaignId,
  '2025-01-01',
  '2025-01-31'
);

// Get aggregated metrics
const summary = await getAggregatedMetrics('2025-01-01', '2025-01-31');
```

---

## 🔐 Security Notes

**DO NOT store tokens in frontend!**

The current implementation has placeholders. You **MUST** create a backend endpoint to:

1. Exchange OAuth code for tokens
2. Store tokens securely (encrypted)
3. Refresh tokens when expired
4. Make Google Ads API calls server-side

**Recommended: Create Supabase Edge Function**

Create `/supabase/functions/google-ads-oauth/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { code } = await req.json();

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_ADS_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_ADS_CLIENT_SECRET')!,
      redirect_uri: Deno.env.get('REDIRECT_URI')!,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json();

  // Get account info
  const accountResponse = await fetch('https://googleads.googleapis.com/v15/customers:listAccessibleCustomers', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')!,
    },
  });

  const accountData = await accountResponse.json();

  return new Response(JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    account_id: accountData.resourceNames[0],
    account_name: 'Google Ads Account',
  }));
});
```

---

## 📈 Next Steps

### Phase 1: Basic Setup ✅
- [x] Create database tables
- [x] Build service functions
- [x] Create UI components
- [x] Set up OAuth flow

### Phase 2: API Integration
- [ ] Create Supabase Edge Function for OAuth
- [ ] Implement Google Ads API sync
- [ ] Auto-sync campaigns daily
- [ ] Auto-sync metrics daily

### Phase 3: AI Insights
- [ ] Analyze campaign performance with AI
- [ ] Generate optimization suggestions
- [ ] Predict future performance
- [ ] Auto-adjust budgets

### Phase 4: Advanced Features
- [ ] Multi-touch attribution
- [ ] A/B test tracking
- [ ] Custom conversion goals
- [ ] Automated reporting

---

## 🧪 Testing

1. **Run Migration:**
```bash
psql $DATABASE_URL < supabase/migrations/create_ad_analytics_tables.sql
```

2. **Visit Setup Page:**
```
http://localhost:5174/ad-accounts
```

3. **Click "Connect Google Ads"**
   - Should redirect to Google OAuth
   - (Will fail without proper OAuth setup)

4. **Check Tables:**
```sql
SELECT * FROM ad_accounts;
SELECT * FROM ad_campaigns;
SELECT * FROM ad_metrics;
SELECT * FROM ad_events;
```

---

## 📝 Summary

**What You Have:**
- ✅ Complete database schema
- ✅ All CRUD functions
- ✅ Account management UI
- ✅ OAuth flow structure
- ✅ Analytics dashboard ready

**What You Need:**
- Google Cloud project with Ads API enabled
- OAuth credentials
- Developer token
- Backend endpoint for token exchange (Supabase Edge Function)
- Google Ads API implementation

**Files to Use:**
1. Run: `/supabase/migrations/create_ad_analytics_tables.sql`
2. Service: `/src/services/googleAds.ts`
3. UI: `/src/pages/AdAccountsSetup.tsx`
4. Dashboard: `/src/pages/AnalyticsDashboard.tsx`

The foundation is built - just needs Google API credentials and backend token handling!
