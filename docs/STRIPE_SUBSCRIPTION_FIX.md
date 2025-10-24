# Stripe Subscription Not Updating - Diagnosis & Fix

## Problem
After successful Stripe payment, the subscription status doesn't update in the database (`stripe_subscriptions` table). This affects all user accounts.

## Root Causes

### 1. Webhook Configuration Issue
The Stripe webhook might not be properly configured to send events to your Supabase Edge Function.

### 2. Database Constraint Conflict
The webhook code tries to upsert by `subscription_id`, but there might be duplicate entries or unique constraint violations.

### 3. Missing Webhook Events
Stripe needs to be configured to send these specific events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`

## Diagnosis Steps

### Step 1: Check Webhook Configuration in Stripe

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Check if your endpoint is listed:
   ```
   https://[your-supabase-project].supabase.co/functions/v1/stripe-webhook
   ```
3. Verify these events are selected:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`

### Step 2: Verify Webhook Secret

Check your Supabase environment variables:

```bash
# Get your Supabase secrets
supabase secrets list

# Should show:
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
```

The `STRIPE_WEBHOOK_SECRET` should match the "Signing secret" from your Stripe webhook endpoint.

### Step 3: Check Database State

Run this query in Supabase SQL Editor:

```sql
-- Check for orphaned subscription records
SELECT
  s.*,
  c.user_id,
  u.email
FROM stripe_subscriptions s
LEFT JOIN stripe_customers c ON s.customer_id = c.customer_id
LEFT JOIN auth.users u ON c.user_id = u.id
WHERE s.status = 'not_started'
ORDER BY s.created_at DESC;

-- Check for duplicate customer_id entries
SELECT customer_id, COUNT(*) as count
FROM stripe_subscriptions
GROUP BY customer_id
HAVING COUNT(*) > 1;
```

### Step 4: Test Webhook Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# In another terminal, trigger a test webhook
stripe trigger checkout.session.completed
```

## The Fix

### Fix 1: Update Database Schema (if needed)

The current schema has a potential issue - it allows multiple subscription records for the same `customer_id`. Run this migration:

```sql
-- Add unique constraint on customer_id to prevent duplicates
-- First, clean up any duplicates
WITH ranked_subs AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY
        CASE
          WHEN status = 'active' THEN 1
          WHEN status = 'trialing' THEN 2
          ELSE 3
        END,
        updated_at DESC
    ) as rn
  FROM stripe_subscriptions
)
DELETE FROM stripe_subscriptions
WHERE id IN (
  SELECT id FROM ranked_subs WHERE rn > 1
);

-- Now add the unique constraint
DROP INDEX IF EXISTS idx_stripe_subscriptions_customer_id;
CREATE UNIQUE INDEX idx_stripe_subscriptions_customer_id_unique
ON stripe_subscriptions(customer_id);
```

### Fix 2: Update Webhook Handler

The current webhook handler at `/supabase/functions/stripe-webhook/index.ts` has the upsert logic. Let's improve it:

```typescript
// Current code (line 180-193):
const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
  {
    customer_id: customerId,
    subscription_id: subscription.id,
    price_id: subscription.items.data[0].price.id,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    status: subscription.status,
  },
  {
    onConflict: 'subscription_id',
  },
);
```

**Problem**: The `onConflict: 'subscription_id'` only works if `subscription_id` is unique. But the initial checkout creates a record with `subscription_id: null`.

**Solution**: Change the upsert strategy to handle both cases:

```typescript
// Improved version:
// First, try to find existing record by customer_id
const { data: existingSub } = await supabase
  .from('stripe_subscriptions')
  .select('id')
  .eq('customer_id', customerId)
  .single();

if (existingSub) {
  // Update existing record
  const { error: subError } = await supabase
    .from('stripe_subscriptions')
    .update({
      subscription_id: subscription.id,
      price_id: subscription.items.data[0].price.id,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingSub.id);

  if (subError) {
    console.error('Error updating subscription:', subError);
    throw new Error('Failed to update subscription in database');
  }
} else {
  // Insert new record
  const { error: subError } = await supabase
    .from('stripe_subscriptions')
    .insert({
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: subscription.items.data[0].price.id,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      status: subscription.status,
    });

  if (subError) {
    console.error('Error inserting subscription:', subError);
    throw new Error('Failed to insert subscription in database');
  }
}
```

### Fix 3: Add Webhook Endpoint to Stripe (if missing)

```bash
# Set your webhook secret as a Supabase secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Get your Supabase project URL
echo "Your webhook URL: https://[project-ref].supabase.co/functions/v1/stripe-webhook"
```

Then in Stripe Dashboard:
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the "Signing secret" and update your Supabase secret

### Fix 4: Manual Sync Script (Emergency Fix)

If you need to manually sync existing customers:

```typescript
// Create: /supabase/functions/manual-sync-subscriptions/index.ts

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    // Get all stripe_customers
    const { data: customers, error: customersError } = await supabase
      .from('stripe_customers')
      .select('customer_id, user_id');

    if (customersError) throw customersError;

    const results = [];

    for (const customer of customers || []) {
      try {
        // Fetch subscription from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.customer_id,
          limit: 1,
          status: 'all',
        });

        if (subscriptions.data.length === 0) {
          results.push({
            customer_id: customer.customer_id,
            status: 'no_subscription',
          });
          continue;
        }

        const subscription = subscriptions.data[0];

        // Update in database
        const { data: existingSub } = await supabase
          .from('stripe_subscriptions')
          .select('id')
          .eq('customer_id', customer.customer_id)
          .single();

        const periodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null;
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        if (existingSub) {
          await supabase
            .from('stripe_subscriptions')
            .update({
              subscription_id: subscription.id,
              price_id: subscription.items.data[0].price.id,
              current_period_start: periodStart,
              current_period_end: periodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end,
              status: subscription.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSub.id);

          results.push({
            customer_id: customer.customer_id,
            status: 'updated',
            subscription_status: subscription.status,
          });
        } else {
          await supabase.from('stripe_subscriptions').insert({
            customer_id: customer.customer_id,
            subscription_id: subscription.id,
            price_id: subscription.items.data[0].price.id,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
            status: subscription.status,
          });

          results.push({
            customer_id: customer.customer_id,
            status: 'created',
            subscription_status: subscription.status,
          });
        }
      } catch (error) {
        results.push({
          customer_id: customer.customer_id,
          status: 'error',
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify({ results, total: results.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

Deploy and run:

```bash
# Deploy the function
supabase functions deploy manual-sync-subscriptions

# Run it (requires auth)
curl -X POST \
  https://[your-project].supabase.co/functions/v1/manual-sync-subscriptions \
  -H "Authorization: Bearer [your-service-role-key]"
```

## Verification

After applying the fix, verify it works:

### 1. Check Webhook Logs

```bash
# In Stripe Dashboard → Developers → Webhooks → [Your Endpoint]
# Click "Logs" to see recent webhook attempts
# Look for successful 200 responses
```

### 2. Test New Subscription

1. Create a test user
2. Subscribe to a plan
3. Complete payment
4. Check database:

```sql
SELECT
  c.user_id,
  u.email,
  s.status,
  s.subscription_id,
  s.price_id,
  s.current_period_end
FROM stripe_customers c
JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
JOIN auth.users u ON c.user_id = u.id
WHERE u.email = 'test@example.com';
```

### 3. Monitor Real-time Updates

```bash
# Watch for webhook events
stripe listen --forward-to https://[your-project].supabase.co/functions/v1/stripe-webhook
```

## Preventing Future Issues

1. **Monitor Webhook Health**: Set up alerts in Stripe for webhook failures
2. **Add Logging**: Enhance webhook function with detailed logging
3. **Regular Audits**: Run sync script weekly to catch any missed updates
4. **Test Before Deploy**: Always test subscription flow in Stripe test mode

## Quick Commands Reference

```bash
# Check webhook configuration
stripe listen --print-secret

# Test webhook locally
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated

# View Supabase logs
supabase functions logs stripe-webhook --tail

# Deploy updated webhook
supabase functions deploy stripe-webhook
```

## Support

If issues persist after applying these fixes:

1. Check Supabase logs: `supabase functions logs stripe-webhook --tail`
2. Check Stripe webhook logs in dashboard
3. Verify environment variables are set correctly
4. Contact support with:
   - User ID experiencing the issue
   - Stripe customer ID
   - Timestamp of payment
   - Webhook delivery logs from Stripe
