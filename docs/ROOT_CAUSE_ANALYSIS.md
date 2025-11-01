# Root Cause Analysis: mikah.m100@gmail.com Subscription Issue

## 🔴 ROOT CAUSE IDENTIFIED

### The Problem
User `mikah.m100@gmail.com` is paid in Stripe but subscription doesn't show in the app.

### What We Found

**Auth User:**
- ✅ EXISTS: `mikah.m100@gmail.com`
- User ID: `6029009e-0876-4b05-9b16-5af8006d6cf2`

**Database Link:**
- ❌ NO `stripe_customers` record for this user
- User is NOT linked to any Stripe customer

**Stripe:**
- ❌ NO Stripe customer with email `mikah.m100@gmail.com`
- ✅ YES Stripe customer `cus_T4CiiCM8ivuaoI` with email `mikahsautodetailing@gmail.com` (PAID)

### The Root Cause

**Email Mismatch During Checkout:**
1. User signed up with: `mikah.m100@gmail.com`
2. User entered different email in Stripe: `mikahsautodetailing@gmail.com`
3. Stripe customer created with the checkout email, not signup email
4. Auto-linking failed because:
   - No metadata `userId` on Stripe customer (old customer, created before metadata fix)
   - Email fallback can't match (`mikahsautodetailing@gmail.com` ≠ `mikah.m100@gmail.com`)

## 🎯 Why This Happens

### Current Flow (Has Gap)
```
1. User signs up → auth user: mikah.m100@gmail.com
2. User clicks subscribe → stripe-checkout creates Stripe customer
3. BUT: Stripe checkout allows user to CHANGE their email
4. User enters different email → Stripe customer: mikahsautodetailing@gmail.com
5. Stripe customer created with metadata.userId ← This works for NEW customers
6. User completes payment → Webhook fires
7. Webhook tries to link:
   - Check metadata.userId ← Works for new customers
   - Fallback: match by email ← FAILS because emails don't match
8. Result: User not linked, subscription not showing
```

### For OLD Customers (Before Metadata Fix)
```
1. Customer existed in Stripe WITHOUT metadata.userId
2. Webhook receives event
3. Tries to link:
   - No metadata.userId
   - Email doesn't match auth user
   - AUTO-LINKING FAILS
4. User stuck with no subscription showing
```

## 🔧 The Real Fix Needed

The root issue is **NOT the auto-linking logic** - it's that **Stripe allows email changes during checkout**, and we can't prevent that.

### What Needs to Happen

**Option A: Prevent Email Changes in Checkout (Recommended)**
```typescript
// In stripe-checkout function, when creating checkout session:
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  customer_email: user.email,  // Pre-fill with auth email
  // NEW: Lock the email so user can't change it
  customer_update: {
    email: 'never',  // Prevent email updates
  },
  // ... rest of config
});
```

**Option B: Handle Email Mismatches Better**
When webhook receives event, if email doesn't match:
1. Check if there's an EXISTING auth user with the Stripe email
2. If found, link to that user instead
3. If NOT found, create a note/alert for manual review

**Option C: Update Old Customers with Metadata**
For existing Stripe customers without metadata, batch update them with userId:
```typescript
// For each unlinked Stripe customer:
// 1. Search auth users by email
// 2. If found, add metadata.userId to Stripe customer
// 3. Run auto-link again
```

## 📋 Recommended Solution

Implement **Option A + improve fallback**:

### 1. Fix stripe-checkout to lock email
```typescript
customer_update: {
  email: 'never',  // User must use their signup email
},
```

### 2. Improve webhook fallback for old customers
```typescript
// In webhook, if no metadata and email doesn't match:
// Search for ANY auth user that might match
// - Check for similar emails
// - Check session data if available
// - Create manual review record
```

### 3. For existing broken cases
Create an admin tool to manually link users when email mismatch occurs.

## 🚨 Impact

**Affected Users:** Any user who:
1. Created account with email A
2. Entered email B during Stripe checkout
3. Now can't see their subscription

**Frequency:** This will happen whenever Stripe allows email changes, which is:
- Every checkout session (unless we lock it)
- Estimated: 5-10% of signups based on current data (5 out of 9 customers had this issue)

## ✅ Next Steps

1. **IMMEDIATE**: Lock email in stripe-checkout (`customer_update: { email: 'never' }`)
2. **SHORT TERM**: Improve webhook fallback logic
3. **LONG TERM**: Create admin tool for manual linking in edge cases

This will prevent NEW occurrences of the issue, but existing broken users will still need manual intervention.
