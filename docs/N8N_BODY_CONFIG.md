# n8n HTTP Request Body Configuration

## Simple Option: Pass Everything As-Is

In your HTTP Request node in n8n:

### Body Configuration:

```
┌─────────────────────────────────────────┐
│ Send Body: ✓ YES                       │
│                                         │
│ Body Content Type: JSON                 │
│                                         │
│ Specify Body: Using JSON                │
│                                         │
│ JSON:                                   │
│ ┌───────────────────────────────────┐  │
│ │ {{ $json }}                        │  │
│ └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

That's it! Just put `{{ $json }}` in the JSON field.

This passes the entire output from your previous node.

---

## Alternative: If Your Data Needs Mapping

If your previous node outputs different field names, use this:

### Body Configuration:

```
┌─────────────────────────────────────────┐
│ Send Body: ✓ YES                       │
│                                         │
│ Body Content Type: JSON                 │
│                                         │
│ Specify Body: Using JSON                │
│                                         │
│ JSON:                                   │
│ ┌───────────────────────────────────┐  │
│ │ {                                  │  │
│ │   "vendor": "{{ $json.vendor }}",  │  │
│ │   "amount": {{ $json.amount }},    │  │
│ │   "date": "{{ $json.date }}",      │  │
│ │   "receiptNumber": "{{ $json.receiptNumber }}", │
│ │   "taxAmount": {{ $json.taxAmount }}, │
│ │   "subtotal": {{ $json.subtotal }}, │
│ │   "supplierAddress": "{{ $json.supplierAddress }}", │
│ │   "supplierPhone": "{{ $json.supplierPhone }}", │
│ │   "lineItems": {{ $json.lineItems }}, │
│ │   "confidence": {{ $json.confidence }} │
│ │ }                                  │  │
│ └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Visual Guide: Where to Put It

### In n8n:

1. Click on your **HTTP Request** node
2. Scroll down to **Body** section
3. Click the toggle: **Send Body** → ON
4. Select **Body Content Type** → `JSON`
5. In the **JSON** text box, paste:

```json
{{ $json }}
```

### Screenshot Reference:

```
┌──────────────────────────────────────────────────┐
│ HTTP Request Node                                │
├──────────────────────────────────────────────────┤
│ Authentication: None                             │
│ Request Method: POST                             │
│ URL: https://csarhyiqmprbnvfosmde.supabase.co/  │
│      functions/v1/n8n-receipt-webhook            │
│                                                  │
│ ▼ Body                                           │
│   Send Body: [✓] ON                             │
│   Body Content Type: [JSON ▼]                   │
│                                                  │
│   Specify Body: [Using JSON ▼]                  │
│                                                  │
│   JSON:                                          │
│   ┌────────────────────────────────────────┐   │
│   │ {{ $json }}                             │   │
│   │                                         │   │
│   │                                         │   │
│   └────────────────────────────────────────┘   │
│                                                  │
│ ▼ Options                                        │
│   Timeout: 30000                                │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## What Your Data Looks Like

Your current n8n workflow outputs this format (which is PERFECT):

```json
[
  {
    "vendor": "The Home Depot",
    "amount": 134.78,
    "date": "2023-10-02",
    "receiptNumber": "121877",
    "taxAmount": 6.96,
    "subtotal": 127.82,
    "supplierAddress": "371 PUTNAM PIKE, SMITHFIELD, RI 02917",
    "supplierPhone": "(401) 233-4204",
    "lineItems": [
      {
        "description": "16X16X6 Silver Drop In Heavy Duty Tub",
        "quantity": 1,
        "unitPrice": 10.98,
        "totalAmount": 10.98
      }
    ],
    "confidence": {
      "vendor": 0.95,
      "amount": 0.98,
      "overall": 0.96
    }
  }
]
```

**The webhook accepts this EXACTLY as-is!** Just pass it through with `{{ $json }}`.

---

## Test It

### After configuring:

1. **Save** the HTTP Request node
2. Click **Execute Node** (or run the full workflow)
3. Check the output - should see:

```json
{
  "success": true,
  "message": "Processed 1 receipt(s)",
  "results": [
    {
      "success": true,
      "id": "uuid-here",
      "vendor": "The Home Depot",
      "amount": 134.78
    }
  ],
  "processed": 1,
  "failed": 0
}
```

4. Go to `http://localhost:5173/finance` → **Expenses** tab
5. Click **Sync** button
6. See your receipt! 🎉

---

## Still Confused?

**Copy this exact configuration:**

| Field | Value |
|-------|-------|
| Authentication | None |
| Method | POST |
| URL | `https://csarhyiqmprbnvfosmde.supabase.co/functions/v1/n8n-receipt-webhook` |
| Send Body | ✓ YES |
| Body Content Type | JSON |
| Specify Body | Using JSON |
| JSON | `{{ $json }}` |
| Timeout | 30000 |

That's it! The `{{ $json }}` takes the output from your previous node and sends it.

---

## Need Help?

If your previous node outputs something different, show me what it outputs and I'll tell you exactly what to put in the Body field.
