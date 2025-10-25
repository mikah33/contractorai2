# Fix All Subscriptions - Complete Guide

## The Problem

You have 9 Stripe customers with paid subscriptions, but they're not showing in your database because:
1. Email confirmation was disabled for easier signups
2. The `stripe_customers` table wasn't populated when users signed up
3. Now users are authenticated and paid, but not linked

## The Solution (3 Simple Steps)

### Step 1: Run SQL to Link Customers

1. Go to: https://supabase.com/dashboard/project/ujhgwcurllkkeouzwvgk/sql/new

2. Copy and paste the entire contents of `link-all-stripe-customers.sql`

3. Click "Run" - This will:
   - Link all 9 Stripe customers to their auth users by email
   - Show you which ones matched
   - Show any that didn't match

### Step 2: Sync Subscription Data from Stripe

Run this command:

```bash
curl -X POST https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/manual-sync-subscriptions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAzMjMyNCwiZXhwIjoyMDcyNjA4MzI0fQ.rMMvXy8uSuueeMY9EfBj0l5SXeLVPRFyPkNBIP77mck" \
  -H "Content-Type: application/json"
```

This will:
- Fetch subscription details from Stripe
- Update the database with correct statuses
- Return results for all customers

### Step 3: Verify It Worked

Run this in Supabase SQL Editor:

```sql
SELECT
  c.customer_id,
  u.email,
  s.status,
  s.subscription_id,
  s.price_id,
  s.current_period_end
FROM stripe_customers c
JOIN auth.users u ON c.user_id = u.id
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
ORDER BY c.created_at DESC;
```

You should see all 9 customers with their subscription statuses!

## Expected Results

After running these steps:

✅ **9 customers** will be linked to auth users
✅ **All active subscriptions** will show status = 'active'
✅ **Users will see** their subscription in the app
✅ **Future payments** will update automatically via webhook

## Your Customers

Based on the Stripe import, these should all be linked:

| Email | Customer ID |
|-------|-------------|
| aaronjp743@gmail.com | cus_TIMw3jKroT1Nkn |
| grengadevelopment@gmail.com | cus_TI8vYvaBQpW9cV |
| mikah.albertson@elevatedsystems.info | cus_THm7G970UXICFD |
| aaronjp743@gmail.com | cus_THcOfhUwPIIO90 |
| info@rebelroofer.com | cus_THEsxNkaR8hwia |
| elevatedmarketing0@gmail.com | cus_TAtMRrbdDxbC2u |
| mikah.albertson@elevatedsystems.info | cus_T4rwMDcwPSrcO3 |
| mikah.albertson@elevatedsystems.info | cus_T4ElmdeyWdbvcR |
| mikahsautodetailing@gmail.com | cus_T4CiiCM8ivuaoI |

## If Some Don't Match

If the SQL shows "0 rows" for some emails, it means those auth users don't exist. You'll need to:

1. Check the exact email in auth.users:
   ```sql
   SELECT id, email FROM auth.users WHERE email LIKE '%gmail.com';
   ```

2. Manually link them:
   ```sql
   INSERT INTO stripe_customers (user_id, customer_id)
   VALUES ('user-id-from-above', 'cus_XXX');
   ```

## Quick Copy-Paste Commands

**Step 1 - SQL File:**
```
File: link-all-stripe-customers.sql
Location: Project root
```

**Step 2 - Sync Command:**
```bash
curl -X POST https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/manual-sync-subscriptions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAzMjMyNCwiZXhwIjoyMDcyNjA4MzI0fQ.rMMvXy8uSuueeMY9EfBj0l5SXeLVPRFyPkNBIP77mck"
```

**Step 3 - Verify Query:**
```sql
SELECT COUNT(*) FROM stripe_subscriptions WHERE status = 'active';
```

## That's It!

After these 3 steps, all your paid users will have working subscriptions. The webhook is already fixed, so all future subscriptions will work automatically! 🎉

## Troubleshooting

**Q: What if no customers are linked?**
A: Check that auth users exist with those exact emails:
```sql
SELECT email FROM auth.users;
```

**Q: What if sync says "0 customers found"?**
A: Run Step 1 again - the SQL needs to be run first to create the stripe_customers records.

**Q: What if I see "ON CONFLICT" errors?**
A: That's normal - it means the customer was already linked. The query skips duplicates.

## Files Created

- ✅ `link-all-stripe-customers.sql` - SQL to link customers
- ✅ `check-auth-users.sql` - SQL to check auth users
- ✅ `FIX_ALL_SUBSCRIPTIONS.md` - This guide
- ✅ Fixed webhook function (already deployed)
- ✅ Manual sync function (already deployed)
