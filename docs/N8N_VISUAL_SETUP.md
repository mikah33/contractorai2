# n8n Visual Setup Guide

## 🎯 Goal
Connect your n8n OCR workflow to automatically save receipts in ContractorAI

## 📊 Current Setup
Your n8n workflow currently has a webhook:
```
https://contractorai.app.n8n.cloud/webhook/d718a3b9-fd46-4ce2-b885-f2a18ad4d98a
```

## ✨ What We're Adding

```
┌─────────────────────────────────────────────────────────────────┐
│                     n8n Workflow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐      ┌──────────┐      ┌──────────────┐         │
│  │ Webhook  │─────▶│   OCR    │─────▶│ Extract Data │         │
│  │ Trigger  │      │ Process  │      │  (existing)  │         │
│  └──────────┘      └──────────┘      └──────┬───────┘         │
│                                              │                  │
│                                              ▼                  │
│                                     ┌────────────────┐          │
│                                     │ HTTP Request   │ ◄─ ADD  │
│                                     │ to ContractorAI│   THIS  │
│                                     └────────┬───────┘          │
│                                              │                  │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────┐
                              │  ContractorAI Supabase Webhook │
                              │  Saves to finance_expenses DB  │
                              └────────────────┬───────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────┐
                              │     Finance Page Updates       │
                              │  http://localhost:5173/finance │
                              └────────────────────────────────┘
```

## 🔧 Step-by-Step: Add HTTP Request Node

### 1. Open Your n8n Workflow
- Find the workflow that processes receipts
- Locate where you extract the receipt data

### 2. Add HTTP Request Node
After your data extraction node, add a new node:

**Click (+)** → Search "HTTP Request" → Select it

### 3. Configure HTTP Request Node

**In the node settings:**

```
┌─────────────────────────────────────────────────────┐
│ HTTP Request Node Configuration                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Authentication: None                                │
│                                                     │
│ Request Method: POST                                │
│                                                     │
│ URL: https://csarhyiqmprbnvfosmde.supabase.co/     │
│      functions/v1/n8n-receipt-webhook               │
│                                                     │
│ Send Body: ✓ Yes                                   │
│                                                     │
│ Body Content Type: JSON                             │
│                                                     │
│ Specify Body: Using Fields Below                   │
│                                                     │
│ JSON Parameters:                                    │
│ ┌─────────────────────────────────────────────┐   │
│ │ Use the output from your previous node       │   │
│ │ or map fields like:                          │   │
│ │                                               │   │
│ │ {                                             │   │
│ │   "vendor": "{{ $json.vendor }}",            │   │
│ │   "amount": {{ $json.total }},               │   │
│ │   "date": "{{ $json.date }}",                │   │
│ │   "receiptNumber": "{{ $json.receipt_num }}", │   │
│ │   "taxAmount": {{ $json.tax }},              │   │
│ │   "subtotal": {{ $json.subtotal }},          │   │
│ │   "lineItems": {{ $json.items }}             │   │
│ │ }                                             │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Options:                                            │
│   Timeout: 30000 (30 seconds)                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4. Alternative: Use Expression for Entire Object

If your previous node already outputs the correct format:

**JSON Parameters:**
```javascript
{{ $json }}
```

This passes the entire object from the previous node.

## 📝 Example n8n Expression Mapping

If you need to transform your OCR data:

```javascript
{
  "vendor": {{ $json.merchant_name || $json.vendor || "Unknown" }},
  "amount": {{ parseFloat($json.total || $json.amount || 0) }},
  "date": {{ $json.date || new Date().toISOString().split('T')[0] }},
  "receiptNumber": {{ $json.receipt_number || $json.invoice_id }},
  "taxAmount": {{ parseFloat($json.tax || 0) }},
  "subtotal": {{ parseFloat($json.subtotal || 0) }},
  "supplierAddress": {{ $json.address }},
  "supplierPhone": {{ $json.phone }},
  "lineItems": {{ $json.items?.map(item => ({
    description: item.description || item.name,
    quantity: parseInt(item.quantity || 1),
    unitPrice: parseFloat(item.price || 0),
    totalAmount: parseFloat(item.total || 0)
  })) || [] }},
  "confidence": {
    "overall": {{ $json.confidence || 1.0 }}
  }
}
```

## ✅ Testing Your Setup

### In n8n:
1. **Save** your workflow
2. **Activate** the workflow
3. Click **Execute Workflow** (test button)
4. Check the HTTP Request node - should show:
   ```
   ✓ 200 OK
   {
     "success": true,
     "message": "Processed 1 receipt(s)",
     "processed": 1
   }
   ```

### In ContractorAI:
1. Open `http://localhost:5173/finance`
2. Click **Expenses** tab
3. Click **Sync** button (top right)
4. Look for your test receipt!

## 🎨 What You'll See in ContractorAI

```
Finance → Expenses Tab:

┌────────────────────────────────────────────────────────────────┐
│  Date         Vendor              Category    Amount    Receipt│
├────────────────────────────────────────────────────────────────┤
│  Oct 2, 2023  The Home Depot [↓]  Materials   $134.78      📦 │
│  [Auto]       Receipt #121877                 Tax: $6.96      │
└────────────────────────────────────────────────────────────────┘

Click [↓] to see:
  • Full line item breakdown
  • Subtotal + tax calculation
  • Supplier contact info
```

## 🐛 Troubleshooting

### HTTP Request fails with 500 error?
**Check:** Did you run the SQL to create the `finance_expenses` table?
- Go to Supabase Dashboard → SQL Editor
- Run the SQL from the setup guide

### HTTP Request succeeds but no receipt shows?
**Check:** Click the **Sync** button on the Finance page
**Or:** Refresh the page (F5)

### Receipt shows but no line items?
**Check:** Your lineItems array format:
```json
{
  "lineItems": [
    {
      "description": "Item name",
      "quantity": 1,
      "unitPrice": 10.00,
      "totalAmount": 10.00
    }
  ]
}
```

### Need to see what was sent?
**n8n:** Click on the HTTP Request node → View data
**Supabase:** Dashboard → Functions → n8n-receipt-webhook → Logs

## 🎉 Success Indicators

You'll know it's working when:
- ✅ n8n HTTP Request shows 200 OK
- ✅ Green "Auto" badge on expense in ContractorAI
- ✅ Can expand row to see line items
- ✅ Receipt number shows under vendor name
- ✅ Package icon (📦) appears if line items exist

## 📞 Your Integration URLs

| Purpose | URL |
|---------|-----|
| n8n Webhook (incoming) | https://contractorai.app.n8n.cloud/webhook/d718a3b9-fd46-4ce2-b885-f2a18ad4d98a |
| ContractorAI Webhook (save) | https://csarhyiqmprbnvfosmde.supabase.co/functions/v1/n8n-receipt-webhook |
| Finance Page | http://localhost:5173/finance |

---

**Questions?** Check the function logs in Supabase or the n8n execution logs for detailed error messages.
