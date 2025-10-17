# Stripe Connect Integration Guide

## Overview

This guide explains how to integrate Stripe Connect into ContractorAI to allow contractors to receive payments directly from their clients through the platform.

---

## Architecture

### Current Setup
- **Stripe Standard** - Used for YOUR SaaS subscription billing (charging contractors for using your app)
- **Tables**: `stripe_customers`, `stripe_subscriptions`
- **Edge Functions**: `stripe-checkout`, `stripe-webhook`

### New: Stripe Connect (For Contractors)
- **Stripe Connect Express** - Each contractor connects THEIR OWN Stripe account
- **Payment Links** - Contractors generate payment links for invoices (created in THEIR Stripe account)
- **New Tables**: `stripe_connect_accounts`
- **New Edge Functions**:
  - `stripe-connect-onboard` - Contractor OAuth to connect their account
  - `generate-payment-link` - Create payment link in contractor's Stripe account
  - `stripe-connect-webhook` - Handle payments from contractor's accounts

### KEY POINTS:
- ✅ **Contractor's Stripe Account** - Each contractor has their own account
- ✅ **Money Goes to Contractor** - Payments go directly to contractor (not you)
- ✅ **No Middleman** - You don't handle money (unless you want platform fees)
- ✅ **Simple Payment Links** - No complex checkout, just shareable links

---

## Database Schema

### New Table: `stripe_connect_accounts`
```sql
CREATE TABLE stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type TEXT DEFAULT 'express',
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  email TEXT,
  country TEXT,
  default_currency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Stripe Connect account"
  ON stripe_connect_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all Connect accounts"
  ON stripe_connect_accounts FOR ALL
  USING (auth.role() = 'service_role');
```

### New Table: `invoice_payments`
```sql
CREATE TABLE invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  payment_method_type TEXT,
  customer_email TEXT,
  customer_name TEXT,
  platform_fee DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoice payments"
  ON invoice_payments FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );
```

---

## Implementation Steps

### 1. Environment Variables

Add to `.env`:
```bash
# Stripe Connect
VITE_STRIPE_CONNECT_CLIENT_ID=ca_xxxxx
STRIPE_PLATFORM_ACCOUNT_ID=acct_xxxxx
```

### 2. Frontend Components

**Components to create:**
- `StripeConnectButton.tsx` - Connect/disconnect Stripe
- `StripeAccountStatus.tsx` - Show connection status
- `InvoicePaymentButton.tsx` - "Pay Now" button on invoices
- `StripeSettingsPanel.tsx` - Settings page integration

### 3. Supabase Edge Functions

**New functions:**
- `stripe-connect-onboard` - Create Connect account & OAuth link
- `stripe-connect-webhook` - Handle Connect account updates
- `create-invoice-payment-link` - Generate Stripe payment link
- `process-invoice-payment` - Process payments

### 4. Invoice Updates

Update `invoices` table:
```sql
ALTER TABLE invoices ADD COLUMN payment_link TEXT;
ALTER TABLE invoices ADD COLUMN payment_link_expires_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN stripe_invoice_id TEXT;
```

---

## User Flow

### Contractor Onboarding

1. Contractor goes to Settings → Payments
2. Clicks "Connect Stripe Account"
3. Redirected to Stripe OAuth
4. Fills out business info (Stripe Express form)
5. Redirected back to app
6. Account status shows "Connected ✓"

### Invoice Payment Flow

1. **Contractor creates invoice** in your app
   - Adds line items, client info, totals
   - Saves as draft

2. **Invoice gets approved** by client
   - Status changes to "Approved" or "Outstanding"

3. **Contractor clicks "Generate Payment Link"**
   - Your app calls Stripe API with contractor's account
   - Creates a Payment Link in THEIR Stripe account
   - Link is saved to invoice record

4. **Contractor shares link with customer**
   - Copies payment link
   - Sends via email, text, WhatsApp, etc.
   - Customer can click link anytime

5. **Customer pays**
   - Opens Stripe-hosted payment page
   - Enters card details
   - Completes payment

6. **Money goes to contractor's Stripe account**
   - Instant transfer to their connected account
   - Stripe takes standard fee (2.9% + $0.30)
   - Optional: You take small platform fee

7. **Webhook updates your app**
   - Invoice marked as "Paid"
   - Payment details recorded
   - Contractor sees confirmation

---

## Stripe Connect Fees

### Platform Fee Options

**Option A: No Platform Fee (Recommended for contractors)**
- Stripe takes 2.9% + $0.30
- Contractor receives full amount minus Stripe fees
- You pay Stripe Connect fees

**Option B: Application Fee**
- You take 1-5% platform fee
- Contractor receives amount minus (Stripe fees + your fee)
- Example: $100 invoice → Stripe takes $3.20 → You take $5 → Contractor gets $91.80

**Implementation:**
```typescript
// In create-invoice-payment-link
const session = await stripe.checkout.sessions.create({
  payment_intent_data: {
    application_fee_amount: platformFeeInCents, // Your fee
    transfer_data: {
      destination: contractorStripeAccountId,
    },
  },
  // ... other options
}, {
  stripeAccount: contractorStripeAccountId, // Charge on contractor's account
});
```

---

## Security Considerations

1. **RLS Policies** - Users can only see own Connect accounts
2. **Webhook Signing** - Verify all webhook signatures
3. **Account Validation** - Check `charges_enabled` before creating payment links
4. **Token Security** - Store Connect tokens server-side only
5. **HTTPS Only** - All OAuth redirects must use HTTPS

---

## Testing

### Test Mode
1. Use Stripe test mode credentials
2. Use test card: `4242 4242 4242 4242`
3. Any CVC, future expiry date
4. Test OAuth with Stripe test accounts

### Production Checklist
- [ ] Update Stripe Connect settings in dashboard
- [ ] Add production OAuth redirect URLs
- [ ] Configure webhook endpoints
- [ ] Test real payment flow
- [ ] Verify payouts work
- [ ] Test refund flow

---

## Troubleshooting

### Account Not Connecting
- Check OAuth redirect URL matches Stripe dashboard
- Verify `STRIPE_CONNECT_CLIENT_ID` is correct
- Check browser console for errors

### Payments Failing
- Verify account has `charges_enabled: true`
- Check webhook logs in Stripe dashboard
- Ensure payment link hasn't expired

### Payouts Not Working
- Account needs `payouts_enabled: true`
- Bank account must be verified
- Check Stripe dashboard for payout schedule

---

## Next Steps

After this implementation, you can add:
- **Automatic Invoicing** - Schedule recurring invoices
- **Payment Reminders** - Email clients when invoices are due
- **Refund Management** - Handle refunds through the app
- **ACH Payments** - Accept bank transfers
- **International Payments** - Multi-currency support

---

## Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [OAuth Flow](https://stripe.com/docs/connect/oauth-reference)
- [Platform Fees](https://stripe.com/docs/connect/charges#application-fees)
