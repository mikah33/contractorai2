# Stripe Payment Links - Quick Setup Guide

## 🎯 What This Does

Allows contractors to:
1. **Connect their own Stripe account** (sign in or create new)
2. **Generate payment links** for invoices
3. **Share links** with customers via email/text
4. **Receive payments** directly to their Stripe account
5. **Track payments** in your app automatically

**Your platform does NOT handle money** - it goes straight to the contractor's account!

---

## 📋 Setup Checklist

### 1. Run Database Migration

```bash
# Option A: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard → Your Project → SQL Editor
2. Copy contents of: supabase/migrations/20250117_stripe_connect.sql
3. Paste and click "Run"

# Option B: Supabase CLI
supabase db execute --file supabase/migrations/20250117_stripe_connect.sql
```

**What this creates:**
- `stripe_connect_accounts` table - Stores contractor Stripe accounts
- `invoice_payments` table - Tracks payments
- Updates `invoices` table with payment_link columns

---

### 2. Deploy Edge Functions

```bash
# Deploy Stripe Connect onboarding function
supabase functions deploy stripe-connect-onboard

# Deploy payment link generation function
supabase functions deploy generate-payment-link
```

---

### 3. Configure Stripe

#### A. Get Stripe Connect Client ID

1. Go to: https://dashboard.stripe.com/settings/connect
2. Click "Get started" (if not already set up)
3. Choose **"Stripe Connect Express"**
4. Copy your **Client ID** (starts with `ca_`)

#### B. Add to Environment Variables

Add to `.env`:
```bash
# Stripe Connect (for contractors to connect their accounts)
VITE_STRIPE_CONNECT_CLIENT_ID=ca_xxxxxxxxxxxxx
```

#### C. Set OAuth Redirect URLs in Stripe

1. Go to: https://dashboard.stripe.com/settings/connect
2. Under "Integration" → "OAuth settings"
3. Add redirect URLs:
   ```
   http://localhost:5174/settings
   https://your-production-domain.com/settings
   ```

---

### 4. Add Components to Your App

#### A. Settings Page - Stripe Connection

Update `/src/pages/Settings.tsx` (or wherever your settings are):

```tsx
import StripeConnectButton from '../components/stripe/StripeConnectButton';

// Add this section to your settings page
<div className="mt-6">
  <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Settings</h2>
  <StripeConnectButton />
</div>
```

#### B. Invoice Manager - Payment Link Button

Update `/src/components/finance/InvoiceManager.tsx`:

```tsx
import GeneratePaymentLinkButton from './GeneratePaymentLinkButton';

// In your invoice list/detail view, add:
{invoice.status !== 'paid' && invoice.status !== 'draft' && (
  <GeneratePaymentLinkButton
    invoiceId={invoice.id}
    existingLink={invoice.payment_link}
    onLinkGenerated={(link) => {
      // Optionally refresh invoice list
      fetchInvoices();
    }}
  />
)}
```

---

## 🚀 User Flow

### For Contractors:

1. **Connect Stripe (One-time setup)**
   ```
   Settings → Payment Settings → "Connect Stripe Account"
   → Redirected to Stripe
   → Sign in or create account
   → Complete business info
   → Redirected back to app
   → Status shows "Connected ✓"
   ```

2. **Generate Payment Link**
   ```
   Invoices → Select Invoice → "Generate Payment Link"
   → Link created instantly
   → Copy link
   ```

3. **Share with Customer**
   ```
   - Copy payment link
   - Send via email, text, WhatsApp, etc.
   - Customer clicks link anytime
   ```

4. **Customer Pays**
   ```
   - Opens Stripe payment page
   - Enters card details
   - Pays
   - Money goes to contractor's Stripe account
   ```

5. **Invoice Auto-Updates**
   ```
   - Webhook notifies your app
   - Invoice marked as "Paid"
   - Contractor sees confirmation
   ```

---

## 💰 Fees

### Standard Stripe Fees (Paid by Contractor)
- **2.9% + $0.30** per successful card charge
- Example: $100 invoice = $2.90 + $0.30 = $3.20 fee
- Contractor receives: $96.80

### Optional: Platform Fees (Your Revenue)
You can add a small platform fee:

```typescript
// In generate-payment-link/index.ts
const paymentLink = await stripe.paymentLinks.create(
  {
    line_items: [...],
    // Add application fee (your platform fee)
    application_fee_amount: Math.round(invoice.totalAmount * 0.01 * 100), // 1% fee
  },
  {
    stripeAccount: connectAccount.stripe_account_id,
  }
);
```

Example with 1% platform fee:
- Customer pays: $100
- Your fee: $1 (1%)
- Stripe fee: $3.20 (2.9% + $0.30)
- Contractor receives: $95.80

---

## 🔒 Security

### What's Secure:
- ✅ OAuth flow - Contractors authorize your app safely
- ✅ Webhook signatures - All payments verified
- ✅ RLS policies - Users only see their own data
- ✅ Stripe-hosted payments - PCI compliance handled by Stripe
- ✅ No credential storage - We never store Stripe passwords

### What to Check:
- [ ] HTTPS in production (required for OAuth)
- [ ] Environment variables not committed to git
- [ ] Webhook secrets properly configured
- [ ] RLS policies enabled on all tables

---

## 🧪 Testing

### Test Mode Setup

1. **Use Stripe Test Mode**
   - Toggle "Test mode" in Stripe dashboard
   - Use test API keys in `.env`

2. **Test Card Numbers**
   ```
   Success: 4242 4242 4242 4242
   Declined: 4000 0000 0000 0002
   3D Secure: 4000 0025 0000 3155

   Expiry: Any future date
   CVC: Any 3 digits
   ZIP: Any 5 digits
   ```

3. **Test Flow**
   ```
   1. Connect test Stripe account
   2. Create invoice
   3. Generate payment link
   4. Open link in new tab
   5. Pay with test card
   6. Verify invoice marked as paid
   ```

---

## 🐛 Troubleshooting

### "Please connect your Stripe account first"
- Go to Settings → Payment Settings
- Click "Connect Stripe Account"
- Complete OAuth flow

### "Your Stripe account is not fully set up"
- Account needs verification
- Click "Complete Setup" button
- Fill out required business info in Stripe

### Payment link doesn't work
- Check if account has `charges_enabled: true`
- Verify account completed onboarding
- Check Stripe dashboard for account status

### Invoice not updating after payment
- Check webhook endpoint is configured
- View webhook logs in Stripe dashboard
- Verify webhook secret is correct
- Check Supabase Edge Function logs

### "No onboarding URL returned"
- Verify `VITE_STRIPE_CONNECT_CLIENT_ID` is set
- Check OAuth redirect URLs in Stripe dashboard
- Ensure using HTTPS in production

---

## 📊 Database Schema Reference

### stripe_connect_accounts
```sql
user_id → UUID (references auth.users)
stripe_account_id → TEXT (Stripe account ID)
charges_enabled → BOOLEAN
payouts_enabled → BOOLEAN
details_submitted → BOOLEAN
```

### invoices (updated)
```sql
payment_link → TEXT (Stripe payment link URL)
payment_link_expires_at → TIMESTAMPTZ
stripe_invoice_id → TEXT (Stripe payment link ID)
```

### invoice_payments (new)
```sql
invoice_id → UUID (references invoices)
stripe_payment_intent_id → TEXT
amount → DECIMAL
status → TEXT (pending, succeeded, failed, refunded)
paid_at → TIMESTAMPTZ
```

---

## ✅ Production Checklist

Before going live:

- [ ] Switch to Stripe live mode
- [ ] Update OAuth redirect URLs to production domain
- [ ] Configure webhook endpoint URL
- [ ] Test complete payment flow
- [ ] Verify refunds work
- [ ] Set up payout schedule
- [ ] Test with real bank account
- [ ] Enable email notifications
- [ ] Add terms of service link
- [ ] Test on mobile devices

---

## 🎉 You're Done!

Contractors can now:
- ✅ Connect their Stripe account in minutes
- ✅ Generate payment links for any invoice
- ✅ Share links via any messaging app
- ✅ Receive payments directly to their account
- ✅ See real-time payment updates

No complex integrations, no payment forms to build, just simple shareable links!

---

## 📞 Support Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Payment Links API](https://stripe.com/docs/payment-links)
- [Webhook Events](https://stripe.com/docs/webhooks)
- [Testing Guide](https://stripe.com/docs/testing)

---

**Need help?** Check Stripe dashboard logs or Supabase Edge Function logs for detailed error messages.
