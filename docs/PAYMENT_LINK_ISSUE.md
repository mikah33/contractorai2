# Payment Link Issue - Early Signups Site

## 🔴 Critical Finding

The **early signups site uses Stripe Payment Links**, NOT the edge function we just fixed.

## The Problem

### Early Signups Flow (BROKEN)
```
1. User signs up on early signups site
2. Auth user created with email A
3. JavaScript redirects to Stripe Payment Link:
   https://buy.stripe.com/xxx?prefilled_email=emailA
4. User CAN STILL CHANGE EMAIL in Stripe checkout ❌
5. Payment completes with email B
6. No metadata.userId set (payment links don't support metadata)
7. Auto-linking fails
8. User doesn't see subscription
```

### Main App Flow (FIXED)
```
1. User signs up on main app
2. Clicks subscribe
3. stripe-checkout edge function called
4. Email is LOCKED ✅
5. metadata.userId set ✅
6. Webhook auto-links ✅
7. Subscription shows ✅
```

## Code Evidence

**File:** `/EarlySignupContractorAI/assets/app.js` (lines 68-262)

```javascript
const STRIPE_LINKS = {
  'base-1mo': 'https://buy.stripe.com/aFaaEXesUbAi51Q0pXffy0i',
  'base-3mo': 'https://buy.stripe.com/9B6dR91G85bU8e2b4Bffy0g',
  'base-12mo': 'https://buy.stripe.com/7sY5kD0C4gUCdym6Olffy0h',
  'premium-1mo': 'https://buy.stripe.com/8x2cN5fwYdIq0LA1u1ffy0e',
};

// Only prefills email, doesn't lock it:
const stripeUrlWithEmail = `${stripeUrl}?prefilled_email=${encodeURIComponent(email)}`;
window.location.href = stripeUrlWithEmail;
```

## Why This is Broken

### Stripe Payment Links Limitations
1. **Cannot lock customer email** - User can change it in checkout
2. **Cannot set metadata** - No way to pass `userId`
3. **Cannot customize checkout behavior** - It's a pre-built Stripe page
4. **No programmatic control** - Just a URL redirect

### Result
- All early signup users can change their email
- No metadata = webhook can't auto-link
- Same exact issue we just fixed on main app

## Impact

**How many users are affected?**
- Early signups site is likely where MOST signups come from
- This explains why 5 out of 9 customers had linking issues
- The fix we deployed ONLY helps main app users

**Who's protected vs exposed:**
- ✅ Main app signups - email locked, metadata set
- ❌ Early signups - email can change, no metadata

## Solutions

### Option 1: Switch to Edge Function (Recommended)
Replace payment links with the edge function we just fixed:

**Changes needed in `/EarlySignupContractorAI/assets/app.js`:**

```javascript
// BEFORE (lines 251-262)
const stripeUrl = STRIPE_LINKS[selectedPlan];
const stripeUrlWithEmail = `${stripeUrl}?prefilled_email=${email}`;
window.location.href = stripeUrlWithEmail;

// AFTER
const priceIds = {
  'base-1mo': 'price_xxx',
  'base-3mo': 'price_yyy',
  'base-12mo': 'price_zzz',
  'premium-1mo': 'price_aaa',
};

const response = await fetch(
  'https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/stripe-checkout',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_id: priceIds[selectedPlan],
      success_url: window.location.origin + '/subscription-success',
      cancel_url: window.location.origin + '/subscriptions',
    }),
  }
);

const { url } = await response.json();
window.location.href = url;
```

**Benefits:**
- ✅ Email locked automatically
- ✅ metadata.userId set automatically
- ✅ Auto-linking works
- ✅ No more email mismatch issues

### Option 2: Custom Checkout Session API
Similar to Option 1, but create checkout session directly with Stripe SDK.

### Option 3: Manual Linking Tool (Band-aid)
Keep payment links but build admin tool to manually link users when they report issues.

**Not recommended** - doesn't fix root cause, requires ongoing manual work.

## Recommended Action Plan

### Immediate (TODAY)
1. Update early signups JavaScript to use stripe-checkout edge function
2. Get Stripe price IDs for all plans
3. Test the new flow
4. Deploy to early signups site

### Testing Checklist
- [ ] Signup with email A on early signups
- [ ] Verify email is pre-filled and locked in checkout
- [ ] Complete payment
- [ ] Verify subscription shows in main app
- [ ] Check database: stripe_customers and stripe_subscriptions populated

## Price IDs Needed

Get these from your Stripe Dashboard → Products:

```javascript
const priceIds = {
  'base-1mo': 'price_???',      // $24.99/month
  'base-3mo': 'price_???',      // $69.99/quarter
  'base-12mo': 'price_???',     // $249.99/year
  'premium-1mo': 'price_???',   // $297/month
};
```

## Files to Modify

1. **`/EarlySignupContractorAI/assets/app.js`**
   - Replace payment link redirect with edge function call
   - Add price ID mapping

2. **Test on early signups site**
   - Verify checkout works
   - Verify email is locked
   - Verify subscription shows after payment

## Summary

The fix I deployed **only covers the main app**. The early signups site still uses payment links which:
- Allow email changes
- Don't set metadata
- Can't auto-link

To fully fix the issue, you need to switch early signups from payment links to the stripe-checkout edge function.

**Status:**
- ✅ Main app: FIXED
- ❌ Early signups: STILL BROKEN (needs code change)
