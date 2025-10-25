# Stripe Connect Production Migration Plan

## Executive Summary

This document outlines the architecture and step-by-step migration plan for moving the ContractorAI Stripe Connect implementation from test mode to production mode. The system uses Stripe Connect Express accounts to enable contractors to receive payments directly.

---

## 1. Current Architecture Analysis

### 1.1 Components Overview

The Stripe integration consists of three main systems:

#### A. Platform Subscriptions (SaaS Revenue)
- **Purpose**: Contractors pay for ContractorAI platform access
- **Files**:
  - `supabase/functions/stripe-checkout/index.ts`
  - `supabase/functions/stripe-webhook/index.ts`
  - `src/pages/Subscriptions.tsx`
- **Database**: `stripe_customers`, `stripe_subscriptions`

#### B. Stripe Connect (Contractor Payments)
- **Purpose**: Contractors receive payments from their clients
- **Files**:
  - `supabase/functions/stripe-connect-onboard/index.ts`
  - `supabase/functions/generate-payment-link/index.ts`
  - `src/components/stripe/StripeConnectButton.tsx`
- **Database**: `stripe_connect_accounts`, `invoice_payments`, `invoices`

#### C. Webhook Processing
- **Purpose**: Sync Stripe events with database
- **Files**: `supabase/functions/stripe-webhook/index.ts`
- **Handles**: Subscription updates, payment completions

### 1.2 Current Test Mode Configuration

**Environment Variables (from .env):**
```bash
# Test Mode Keys
VITE_STRIPE_PUBLIC_KEY=pk_test_51Rq06lGcGCTrlHr7...
STRIPE_SECRET_KEY=sk_test_51Rq06lGcGCTrlHr7...

# Test Mode Price IDs
VITE_STRIPE_PRICE_1_MONTH=price_1SJDBnGcGCTrlHr7CapiSyPk
VITE_STRIPE_PRICE_3_MONTHS=price_1SJDC7GcGCTrlHr7Z6T8umjG
VITE_STRIPE_PRICE_1_YEAR=price_1SJDCYGcGCTrlHr7kQnJvE7F
VITE_STRIPE_PRICE_PREMIUM=price_1SJDFVGcGCTrlHr7pnzbRCxP
```

**What's Using Test Mode:**
1. All Stripe API calls use `STRIPE_SECRET_KEY` (test key)
2. Frontend uses `VITE_STRIPE_PUBLIC_KEY` (test key)
3. All payment links created in test mode
4. All Connect accounts created in test mode
5. Webhook listening to test mode events

### 1.3 Key Implementation Details

**Stripe Connect Flow:**
```
User clicks "Connect Stripe"
  → Edge Function creates Express account
  → Returns Account Link URL
  → User redirects to Stripe onboarding
  → Stripe redirects back to app
  → Account status synced to database
```

**Payment Link Generation:**
```
Contractor creates invoice
  → Clicks "Generate Payment Link"
  → Edge Function creates Payment Link in contractor's Connect account
  → Link stored in invoice record
  → Contractor shares link with client
  → Client pays → money goes to contractor (minus fees)
```

---

## 2. Production Requirements

### 2.1 Stripe Dashboard Setup

**Required Steps in Stripe Dashboard:**

1. **Activate Production Account**
   - Complete business verification
   - Add bank account for payouts
   - Verify identity documents
   - Review and accept Terms of Service

2. **Enable Connect Platform**
   - Go to Settings → Connect → Get started
   - Complete platform profile
   - Set branding (logo, colors, business name)
   - Configure onboarding requirements

3. **Create Products & Prices**
   - Mirror test mode products in production
   - Create subscription prices (1-month, 3-month, 1-year, premium)
   - Save production price IDs

4. **Configure Webhooks**
   - Add endpoint: `https://your-domain.supabase.co/functions/v1/stripe-webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `payment_intent.succeeded`
     - `account.updated` (for Connect accounts)
     - `payment_link.created`
   - Copy webhook signing secret

5. **Set Connect Settings**
   - Platform fee: Configure application fee (if applicable)
   - Account requirements: Set minimum verification
   - Branding settings: Customize Connect onboarding

### 2.2 Required API Keys

You'll need to obtain:
- Production Publishable Key (`pk_live_...`)
- Production Secret Key (`sk_live_...`)
- Production Webhook Secret (`whsec_...`)
- Same product/price IDs from production dashboard

---

## 3. Migration Strategy

### 3.1 Environment Strategy: Parallel Testing

**Recommended Approach: Staged Migration**

Instead of switching all at once, use environment-based configuration:

```bash
# Development (.env.local)
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Staging (.env.staging)
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Production (.env.production)
VITE_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### 3.2 Database Considerations

**Current Schema:**
- `stripe_connect_accounts` stores account IDs
- Test accounts: `acct_test_...`
- Production accounts: `acct_...` (different format)

**Migration Options:**

**Option A: Clean Slate (Recommended)**
- Production uses fresh database
- Test users re-onboard in production
- Clean separation of test/prod data

**Option B: Parallel Columns**
```sql
ALTER TABLE stripe_connect_accounts
  ADD COLUMN stripe_account_id_test TEXT,
  ADD COLUMN stripe_account_id_live TEXT;
```

**Option C: Environment Flag**
```sql
ALTER TABLE stripe_connect_accounts
  ADD COLUMN environment TEXT DEFAULT 'test'
    CHECK (environment IN ('test', 'live'));
```

---

## 4. Step-by-Step Migration Plan

### Phase 1: Preparation (2-3 days)

**Step 1.1: Stripe Dashboard Setup**
- [ ] Activate production mode in Stripe
- [ ] Complete business verification
- [ ] Enable Connect platform
- [ ] Configure branding and settings

**Step 1.2: Create Production Products**
- [ ] Create subscription product in production
- [ ] Create all price plans:
  - 1-month subscription
  - 3-month subscription
  - 1-year subscription
  - Premium tier
- [ ] Document all production price IDs

**Step 1.3: Environment Configuration**
- [ ] Create `.env.production` file
- [ ] Add production Stripe keys
- [ ] Add production price IDs
- [ ] Configure Supabase production secrets

**Step 1.4: Database Preparation**
```sql
-- Option: Add environment tracking
ALTER TABLE stripe_connect_accounts
  ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'test';

ALTER TABLE invoice_payments
  ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'test';

-- Index for faster queries
CREATE INDEX idx_stripe_accounts_env
  ON stripe_connect_accounts(environment);
```

### Phase 2: Code Updates (1 day)

**Step 2.1: Create Environment Helper**

Create new file: `src/lib/stripe-env.ts`
```typescript
export const getStripeConfig = () => {
  const environment = import.meta.env.MODE; // 'development' | 'production'

  return {
    publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    environment: environment === 'production' ? 'live' : 'test',
    prices: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_1_MONTH,
      quarterly: import.meta.env.VITE_STRIPE_PRICE_3_MONTHS,
      yearly: import.meta.env.VITE_STRIPE_PRICE_1_YEAR,
      premium: import.meta.env.VITE_STRIPE_PRICE_PREMIUM,
    }
  };
};
```

**Step 2.2: Update Edge Functions**

Update `supabase/functions/stripe-connect-onboard/index.ts`:
```typescript
// Add environment tracking
const stripeEnv = Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_live_')
  ? 'live'
  : 'test';

// When saving account
await supabase.from('stripe_connect_accounts').insert({
  user_id: user.id,
  stripe_account_id: accountId,
  environment: stripeEnv, // Track which environment
  // ... other fields
});
```

Update `supabase/functions/generate-payment-link/index.ts`:
```typescript
// Filter by environment
const { data: connectAccount } = await supabase
  .from('stripe_connect_accounts')
  .select('stripe_account_id, charges_enabled')
  .eq('user_id', user.id)
  .eq('environment', stripeEnv) // Only get matching environment
  .single();
```

**Step 2.3: Update Frontend Components**

Update `src/components/stripe/StripeConnectButton.tsx`:
```typescript
// Add environment indicator
<div className="text-xs text-gray-500">
  Environment: {import.meta.env.MODE === 'production' ? 'Live' : 'Test'}
</div>
```

### Phase 3: Testing on Staging (3-5 days)

**Step 3.1: Deploy to Staging**
- [ ] Deploy code to staging environment
- [ ] Use test API keys on staging
- [ ] Verify all flows work

**Step 3.2: Test Complete User Journey**
- [ ] User signup → subscription purchase
- [ ] Stripe Connect onboarding
- [ ] Invoice creation
- [ ] Payment link generation
- [ ] Test payment completion
- [ ] Verify webhook processing
- [ ] Check database records

**Step 3.3: Test Edge Cases**
- [ ] Failed payments
- [ ] Subscription cancellation
- [ ] Connect account disconnect
- [ ] Incomplete onboarding
- [ ] Multiple payment methods
- [ ] Refunds

### Phase 4: Production Deployment (1 day)

**Step 4.1: Final Preparation Checklist**
- [ ] Production API keys added to Supabase secrets
- [ ] Production webhook endpoint configured
- [ ] Webhook secret added to environment
- [ ] Database migrations applied to production
- [ ] Backup production database
- [ ] Monitoring/alerting configured

**Step 4.2: Deploy Production**
- [ ] Deploy application to production
- [ ] Verify environment variables loaded
- [ ] Test with real Stripe test cards first
- [ ] Monitor error logs closely

**Step 4.3: Gradual Rollout**
- [ ] Enable for internal team first (1 day)
- [ ] Enable for beta users (2-3 days)
- [ ] Enable for all users
- [ ] Monitor metrics and errors

### Phase 5: Post-Launch (Ongoing)

**Step 5.1: Monitoring**
- [ ] Set up Stripe Dashboard monitoring
- [ ] Configure error alerts for:
  - Failed webhook deliveries
  - Failed Connect onboardings
  - Payment failures
- [ ] Monitor Connect account activations

**Step 5.2: Support Preparation**
- [ ] Document common issues
- [ ] Create support scripts for Stripe issues
- [ ] Train support team on Stripe Connect

**Step 5.3: Optimization**
- [ ] Track conversion rates
- [ ] Monitor payment success rates
- [ ] Review platform fees
- [ ] Optimize onboarding flow

---

## 5. Potential Issues & Solutions

### 5.1 Data Migration Issues

**Issue**: Users have test mode Connect accounts
**Solution**:
- Don't migrate account IDs
- Users must re-onboard in production
- Provide clear communication about re-connection
- Optionally: Show banner to reconnect Stripe

**Issue**: Invoices have test payment links
**Solution**:
```sql
-- Mark test links as invalid
UPDATE invoices
SET payment_link = NULL,
    notes = CONCAT(notes, ' [Old test payment link removed]')
WHERE payment_link LIKE 'https://buy.stripe.com/test_%';
```

### 5.2 API Key Management

**Issue**: Accidentally using test keys in production
**Solution**:
- Environment validation check
- Add startup verification:
```typescript
// In edge function
const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
const isLiveKey = stripeSecret.startsWith('sk_live_');

if (isProduction && !isLiveKey) {
  throw new Error('Production environment must use live Stripe keys');
}
```

### 5.3 Webhook Delivery

**Issue**: Webhooks not being received
**Solution**:
- Verify endpoint URL is correct
- Check webhook secret matches
- Review Stripe Dashboard webhook logs
- Ensure Supabase function is deployed
- Test with Stripe CLI: `stripe trigger payment_intent.succeeded`

### 5.4 Connect Account Issues

**Issue**: Users stuck in onboarding
**Solution**:
- Check account status via API
- Provide manual support intervention
- Generate fresh Account Link:
```typescript
const accountLink = await stripe.accountLinks.create({
  account: accountId,
  refresh_url: `${origin}/settings?stripe_refresh=true`,
  return_url: `${origin}/settings?stripe_success=true`,
  type: 'account_onboarding',
});
```

### 5.5 Payment Failures

**Issue**: Payment links not working
**Solution**:
- Verify Connect account is fully activated
- Check `charges_enabled` status
- Ensure payment link created in correct account
- Verify customer has valid payment method

### 5.6 Fee Configuration

**Issue**: Platform fees not being collected
**Solution**:
- Configure in Payment Link creation:
```typescript
const paymentLink = await stripe.paymentLinks.create({
  // ... other config
  application_fee_percent: 2.5, // 2.5% platform fee
}, {
  stripeAccount: connectAccount.stripe_account_id
});
```

---

## 6. Environment Variables Checklist

### Development (.env.local)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe TEST keys
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe TEST price IDs
VITE_STRIPE_PRICE_1_MONTH=price_test_...
VITE_STRIPE_PRICE_3_MONTHS=price_test_...
VITE_STRIPE_PRICE_1_YEAR=price_test_...
VITE_STRIPE_PRICE_PREMIUM=price_test_...
```

### Production (Supabase Secrets)
```bash
# Stripe LIVE keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend environment variables
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_STRIPE_PRICE_1_MONTH=price_live_...
VITE_STRIPE_PRICE_3_MONTHS=price_live_...
VITE_STRIPE_PRICE_1_YEAR=price_live_...
VITE_STRIPE_PRICE_PREMIUM=price_live_...
```

### How to Set Supabase Secrets
```bash
# Using Supabase CLI
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Or via Supabase Dashboard:
# Project Settings → Edge Functions → Secrets
```

---

## 7. Testing Checklist

### Pre-Production Testing

**Subscription Flow:**
- [ ] Create new user account
- [ ] Select subscription plan
- [ ] Complete checkout with test card (4242 4242 4242 4242)
- [ ] Verify subscription created in Stripe
- [ ] Verify database record created
- [ ] Test subscription cancellation
- [ ] Test subscription renewal

**Connect Flow:**
- [ ] Click "Connect Stripe Account"
- [ ] Complete onboarding with test data
- [ ] Verify account created in Stripe
- [ ] Verify database record created
- [ ] Check account status shows "Connected"
- [ ] Test opening Stripe Dashboard

**Payment Link Flow:**
- [ ] Create invoice
- [ ] Click "Generate Payment Link"
- [ ] Verify link created
- [ ] Open link in incognito window
- [ ] Complete payment with test card
- [ ] Verify webhook received
- [ ] Verify invoice marked as paid
- [ ] Verify payment record created

**Webhook Testing:**
- [ ] Use Stripe CLI to trigger events
- [ ] Verify events processed correctly
- [ ] Check database updates
- [ ] Review edge function logs

### Production Smoke Tests

**Day 1 Checks:**
- [ ] No errors in edge function logs
- [ ] Webhook deliveries successful
- [ ] First real subscription works
- [ ] First Connect onboarding works
- [ ] First payment link generated

**Week 1 Checks:**
- [ ] Monitor conversion rates
- [ ] Review failed payments
- [ ] Check for stuck onboardings
- [ ] Verify all webhooks processing

---

## 8. Rollback Plan

### If Critical Issues Occur

**Step 1: Immediate Response**
- Disable new signups temporarily
- Switch back to maintenance mode
- Communicate with active users

**Step 2: Identify Issue**
- Review error logs
- Check Stripe Dashboard events
- Identify failing component

**Step 3: Rollback Options**

**Option A: Code Rollback**
```bash
# Revert to previous deployment
git revert <commit-hash>
git push origin main

# Redeploy
npm run deploy
```

**Option B: Environment Variable Rollback**
```bash
# Switch back to test keys temporarily
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

**Option C: Feature Flag**
- Add feature flag to disable Connect
- Keep subscriptions working
- Fix Connect issues separately

### Communication Template

```
Subject: Stripe Payment Issue - We're Working on It

Hi [User],

We're experiencing a temporary issue with our Stripe integration.
We've identified the problem and are working on a fix.

What this means for you:
- Existing subscriptions: Still active
- Payment links: Temporarily unavailable
- Expected resolution: [timeframe]

We'll notify you once everything is back to normal.

Thank you for your patience.
```

---

## 9. Success Metrics

### Key Performance Indicators

**Technical Metrics:**
- Webhook delivery success rate: > 99%
- Payment success rate: > 95%
- Connect onboarding completion: > 80%
- API error rate: < 1%
- Average response time: < 2s

**Business Metrics:**
- Subscription conversion rate
- Connect account activation rate
- Payment link usage rate
- Platform fee revenue
- Customer support tickets

### Monitoring Dashboard

**Set up monitoring for:**
- Total subscriptions (active/canceled)
- Total Connect accounts
- Payment volume (daily/weekly/monthly)
- Failed payments
- Webhook failures
- Edge function errors

---

## 10. Timeline Summary

| Phase | Duration | Key Activities |
|-------|----------|----------------|
| Preparation | 2-3 days | Stripe setup, environment config, database prep |
| Code Updates | 1 day | Update functions, add environment tracking |
| Staging Testing | 3-5 days | Complete testing of all flows |
| Production Deploy | 1 day | Deploy and verify |
| Gradual Rollout | 3-7 days | Phased user enablement |
| Monitoring | Ongoing | Track metrics, fix issues |

**Total Estimated Time: 7-14 days**

---

## 11. Additional Resources

### Stripe Documentation
- [Connect Quickstart](https://stripe.com/docs/connect/quickstart)
- [Payment Links](https://stripe.com/docs/payment-links)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Testing](https://stripe.com/docs/testing)

### Supabase Documentation
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [Environment Variables](https://supabase.com/docs/guides/cli/config)

### Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires 3DS: 4000 0025 0000 3155
Insufficient funds: 4000 0000 0000 9995
```

---

## Contact & Support

**Stripe Support:**
- Dashboard: [https://dashboard.stripe.com/support](https://dashboard.stripe.com/support)
- Email: support@stripe.com

**Internal Team:**
- Technical Lead: [name]
- DevOps: [name]
- Support Lead: [name]

---

**Document Version:** 1.0
**Last Updated:** 2025-10-21
**Status:** Ready for Review
