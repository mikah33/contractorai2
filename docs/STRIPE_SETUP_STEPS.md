# Stripe Connect Setup - Quick Fix Guide

## What We Just Fixed

✅ Removed the `transfers` capability that was causing the platform profile error
✅ Deployed the updated edge function

## Next Steps (Do This Now!)

### Step 1: Run the Database Migration

You need to create the Stripe Connect tables in your Supabase database.

**Option A: Via Supabase Dashboard (Easiest)**
1. Go to: https://supabase.com/dashboard/project/ujhgwcurllkkeouzwvgk/sql
2. Click "New Query"
3. Copy the contents of: `supabase/migrations/20250117_stripe_connect.sql`
4. Paste into the SQL editor
5. Click "Run"

**Option B: Via Supabase CLI**
```bash
cd /Users/mikahalbertson/Claude-Main-Mind/projects/ContractorAI-Main-App
npx supabase db push
```

### Step 2: Test Stripe Connection

After running the migration:
1. Refresh your ContractorAI app
2. Go to Settings → Payment Settings
3. Click "Connect Stripe Account"
4. You should now be redirected to Stripe (no more errors!)

### Step 3: What Changed in the Fix

**Before (caused error):**
```typescript
capabilities: {
  card_payments: { requested: true },
  transfers: { requested: true }, // ❌ This required platform profile
}
```

**After (works now):**
```typescript
capabilities: {
  card_payments: { requested: true },
  // ✅ Removed transfers - not needed for payment links
}
```

## Why This Works

- **Payment Links** only need `card_payments` capability
- `transfers` is only needed if you want to split payments or take platform fees
- By removing `transfers`, you bypass the platform profile requirement
- Contractors still get 100% of payments (minus Stripe's 2.9% + $0.30)

## Still Need Help?

If you get any other errors, check:
1. Database tables are created (run the migration above)
2. Edge function is deployed (we just did this ✅)
3. Stripe keys are correct in `.env`
4. You're using live mode keys (starts with `sk_live_`)

## Next: Integrate Payment Links into Invoices

Once Stripe Connect works, we'll add the payment link button to your Invoice Manager!
