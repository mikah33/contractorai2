# Quick Setup: n8n → ContractorAI Integration

## Step 1: Create Database Table

Go to **Supabase Dashboard** → **SQL Editor** and run this:

```sql
-- Create finance_expenses table
CREATE TABLE IF NOT EXISTS public.finance_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    vendor TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'processed',
    notes TEXT,
    project_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_finance_expenses_user_id ON public.finance_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON public.finance_expenses(date);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_metadata ON public.finance_expenses USING gin(metadata);
```

## Step 2: Configure n8n Webhook

Your n8n workflow currently sends data to:
```
https://contractorai.app.n8n.cloud/webhook/d718a3b9-fd46-4ce2-b885-f2a18ad4d98a
```

### Option A: Add HTTP Request Node (RECOMMENDED)

After your current workflow extracts receipt data, add an **HTTP Request** node:

1. **Method**: POST
2. **URL**: `https://csarhyiqmprbnvfosmde.supabase.co/functions/v1/n8n-receipt-webhook`
3. **Headers**:
   - `Content-Type`: `application/json`
4. **Body**:
   - **Send Body**: Yes
   - **Body Content Type**: JSON
   - **Body**: Use the output from your previous node

The data will automatically be sent in the format ContractorAI expects!

### Option B: Use Webhook Response Node

If you want to return data to the calling system AND save to ContractorAI:

1. Keep your existing webhook
2. Add **HTTP Request** node after processing (as above)
3. Then add **Respond to Webhook** node at the end

## Step 3: Test the Integration

### From n8n:
1. Trigger your workflow with a test receipt
2. Check the HTTP Request node execution - should show `200 OK`
3. Look for response:
   ```json
   {
     "success": true,
     "message": "Processed 1 receipt(s)",
     "processed": 1,
     "failed": 0
   }
   ```

### From ContractorAI:
1. Go to `http://localhost:5173/finance`
2. Click **Expenses** tab
3. Look for your receipt with:
   - ✅ Green "Auto" badge
   - 📦 Package icon if it has line items
   - Receipt number under vendor name
4. Click the **↓** arrow to expand and see line items!

## Step 4: What You'll See

When a receipt arrives via webhook, the Expenses page will show:

```
┌─────────────┬──────────────────────┬──────────┬─────────┬─────────┬─────────┐
│ Date        │ Vendor               │ Category │ Amount  │ Project │ Receipt │
├─────────────┼──────────────────────┼──────────┼─────────┼─────────┼─────────┤
│ Oct 2, 2023 │ The Home Depot   [↓] │ Materials│ $134.78 │         │    📦   │
│     [Auto]  │ Receipt #121877      │          │ Tax:6.96│         │         │
└─────────────┴──────────────────────┴──────────┴─────────┴─────────┴─────────┘

Click [↓] to expand:

    📦 Line Items (5)
    ┌────────────────────────────────────┬─────┬────────┬─────────┐
    │ Description                        │ Qty │ Price  │ Total   │
    ├────────────────────────────────────┼─────┼────────┼─────────┤
    │ 16X16X6 Silver Drop In Tub        │  1  │ $10.98 │ $10.98  │
    │ 1X12X10 Pine Board                │  1  │ $14.98 │ $14.98  │
    │ 2X4X8 Stud                        │  6  │  $3.48 │ $20.88  │
    │ Strap 500lb                       │  1  │  $6.98 │  $6.98  │
    │ Tough Tote                        │  2  │  $7.98 │ $15.96  │
    ├────────────────────────────────────┴─────┴────────┼─────────┤
    │                              Subtotal:            │ $127.82 │
    │                                   Tax:            │   $6.96 │
    │                                 Total:            │ $134.78 │
    └───────────────────────────────────────────────────┴─────────┘

    📍 Supplier Details
    📍 Address: 371 PUTNAM PIKE, SMITHFIELD, RI 02917
    📞 Phone: (401) 233-4204
```

## Troubleshooting

### Webhook returns error?
- Check Supabase function logs: Dashboard → Functions → n8n-receipt-webhook → Logs
- Verify table was created: Dashboard → Table Editor → Should see `finance_expenses`

### Receipt not showing in UI?
- Click the **Sync** button on Finance page
- Check browser console for errors (F12)
- Verify receipt was inserted: Supabase Dashboard → Table Editor → finance_expenses

### Wrong category assigned?
The webhook auto-categorizes based on vendor:
- Home Depot/Lowe's → Materials
- Tool stores → Tools
- Rental companies → Equipment Rental
- Gas stations → Travel
- Default → Materials

## Your Workflow URLs

- **n8n Webhook (receives receipts)**: https://contractorai.app.n8n.cloud/webhook/d718a3b9-fd46-4ce2-b885-f2a18ad4d98a
- **ContractorAI Webhook (saves to DB)**: https://csarhyiqmprbnvfosmde.supabase.co/functions/v1/n8n-receipt-webhook

**Set up flow**: Receipt → n8n processes → HTTP Request to ContractorAI → Saves to database → Shows in Finance page! 🎉
