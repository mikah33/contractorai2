# Deploy Stripe Subscription Fix

## Quick Fix Deployment Guide

Follow these steps to fix the subscription update issue:

### Step 1: Deploy Updated Webhook Function

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Deploy the updated webhook handler
supabase functions deploy stripe-webhook

# Verify deployment
supabase functions logs stripe-webhook --tail
```

### Step 2: Deploy Manual Sync Function

```bash
# Deploy the manual sync function
supabase functions deploy manual-sync-subscriptions

# Verify deployment
supabase functions list
```

### Step 3: Run Manual Sync for Existing Customers

This will sync all existing customer subscriptions from Stripe to your database:

```bash
# Get your Supabase service role key from:
# https://supabase.com/dashboard/project/[your-project]/settings/api

# Replace [your-project] with your actual project reference
# Replace [service-role-key] with your actual service role key

curl -X POST \
  https://[your-project].supabase.co/functions/v1/manual-sync-subscriptions \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json"
```

**Example:**
```bash
curl -X POST \
  https://mbrrtlltuubdppfrvdiq.supabase.co/functions/v1/manual-sync-subscriptions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Step 4: Verify the Fix

1. **Check Database**:

```sql
-- Run this in Supabase SQL Editor
SELECT
  c.user_id,
  u.email,
  s.status,
  s.subscription_id,
  s.price_id,
  s.current_period_end,
  s.updated_at
FROM stripe_customers c
JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
JOIN auth.users u ON c.user_id = u.id
WHERE s.status != 'not_started'
ORDER BY s.updated_at DESC
LIMIT 20;
```

2. **Test with New Payment**:
   - Create a test subscription
   - Complete payment
   - Check if status updates immediately

### Step 5: Configure Stripe Webhook (if not done)

If you haven't set up the webhook in Stripe yet:

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Update Supabase secret:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

### Step 6: Monitor Webhook Activity

```bash
# Watch real-time logs
supabase functions logs stripe-webhook --tail

# Or in Stripe Dashboard:
# Developers → Webhooks → [Your Endpoint] → Logs
```

## What Was Fixed?

### Problem
The webhook was trying to upsert using `subscription_id`, but initial checkout creates records with `subscription_id: null`, causing the upsert to fail.

### Solution
Changed the webhook handler to:
1. Find existing record by `customer_id` (which is always present)
2. Update if exists, insert if doesn't exist
3. Always update the `subscription_id` after payment

### Files Changed
- `/supabase/functions/stripe-webhook/index.ts` - Fixed upsert logic
- `/supabase/functions/manual-sync-subscriptions/index.ts` - New sync script
- `/docs/STRIPE_SUBSCRIPTION_FIX.md` - Comprehensive troubleshooting guide

## Testing Checklist

- [ ] Webhook function deployed successfully
- [ ] Manual sync function deployed successfully
- [ ] Manual sync completed for all customers
- [ ] Database shows updated subscription statuses
- [ ] Stripe webhook endpoint configured with correct events
- [ ] Webhook signing secret set in Supabase
- [ ] Test payment updates subscription status in real-time
- [ ] Webhook logs show successful 200 responses

## Rollback (if needed)

If something goes wrong, you can rollback:

```bash
# View function versions
supabase functions list

# Rollback to previous version (if needed)
git checkout HEAD~1 supabase/functions/stripe-webhook/index.ts
supabase functions deploy stripe-webhook
```

## Support

If issues persist:

1. Check webhook logs: `supabase functions logs stripe-webhook --tail`
2. Check Stripe webhook delivery logs
3. Verify environment variables: `supabase secrets list`
4. Contact support with:
   - Output of manual sync command
   - Webhook logs
   - Affected user IDs
   - Stripe customer IDs

## Maintenance

Run the manual sync script periodically to catch any missed updates:

```bash
# Add to cron or run weekly
curl -X POST \
  https://[your-project].supabase.co/functions/v1/manual-sync-subscriptions \
  -H "Authorization: Bearer [service-role-key]"
```

## Expected Results

After running the manual sync, you should see:

```json
{
  "success": true,
  "summary": {
    "total_customers": 50,
    "successful_syncs": 45,
    "errors": 0,
    "no_subscription": 5,
    "timestamp": "2025-01-24T15:30:00.000Z"
  },
  "results": [
    {
      "customer_id": "cus_xxx",
      "user_id": "uuid-xxx",
      "status": "updated",
      "subscription_status": "active",
      "old_status": "not_started",
      "new_status": "active"
    }
    // ... more results
  ]
}
```

✅ **Success Indicator**: `successful_syncs` should equal or be close to `total_customers` minus `no_subscription`.
