# N8N Webhook Setup Guide

## Overview
This guide explains how to configure your n8n workflow to automatically send receipt data to ContractorAI's expense tracking system.

## Webhook URL

Your webhook endpoint is:
```
https://csarhyiqmprbnvfosmde.supabase.co/functions/v1/n8n-receipt-webhook
```

## Required Headers

```
Content-Type: application/json
```

## Data Format

The webhook accepts receipt data in the following format:

### Single Receipt
```json
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
    },
    {
      "description": "1X12X10 Pine Board",
      "quantity": 1,
      "unitPrice": 14.98,
      "totalAmount": 14.98
    }
  ],
  "confidence": {
    "vendor": 0.95,
    "amount": 0.98,
    "date": 0.9,
    "overall": 0.96
  },
  "method": "api"
}
```

### Multiple Receipts (Array)
```json
[
  {
    "vendor": "Lowe's",
    "amount": 89.99,
    "date": "2023-10-03",
    ...
  },
  {
    "vendor": "Home Depot",
    "amount": 134.78,
    "date": "2023-10-02",
    ...
  }
]
```

## Required Fields

- `vendor` (string) - Name of the vendor/supplier
- `amount` (number) - Total amount of the receipt
- `date` (string) - Date in YYYY-MM-DD format

## Optional Fields

- `receiptNumber` (string) - Receipt/transaction number
- `taxAmount` (number) - Tax amount
- `subtotal` (number) - Subtotal before tax
- `supplierAddress` (string) - Vendor's address
- `supplierPhone` (string) - Vendor's phone number
- `lineItems` (array) - Individual items on the receipt
  - `description` (string) - Item description
  - `quantity` (number) - Quantity purchased
  - `unitPrice` (number) - Price per unit
  - `totalAmount` (number) - Total for this line item
- `confidence` (object) - OCR confidence scores
  - `vendor` (number 0-1) - Confidence in vendor extraction
  - `amount` (number 0-1) - Confidence in amount extraction
  - `date` (number 0-1) - Confidence in date extraction
  - `overall` (number 0-1) - Overall confidence
- `method` (string) - Processing method (e.g., "api", "ocr")

## N8N Workflow Configuration

### 1. Add HTTP Request Node
- **Method**: POST
- **URL**: `https://csarhyiqmprbnvfosmde.supabase.co/functions/v1/n8n-receipt-webhook`
- **Headers**:
  - `Content-Type`: `application/json`
- **Body**: JSON from previous node

### 2. Map Your OCR Data
Transform your OCR output to match the required format:

```javascript
return {
  vendor: $json.vendor_name || $json.merchant || "Unknown",
  amount: parseFloat($json.total || $json.amount || 0),
  date: $json.date || new Date().toISOString().split('T')[0],
  receiptNumber: $json.receipt_number || $json.transaction_id,
  taxAmount: parseFloat($json.tax || 0),
  subtotal: parseFloat($json.subtotal || 0),
  supplierAddress: $json.address,
  supplierPhone: $json.phone,
  lineItems: $json.items?.map(item => ({
    description: item.description || item.name,
    quantity: parseInt(item.quantity || 1),
    unitPrice: parseFloat(item.price || 0),
    totalAmount: parseFloat(item.total || 0)
  })) || [],
  confidence: {
    overall: $json.confidence || 1.0
  },
  method: "api"
};
```

## Automatic Category Mapping

The webhook automatically categorizes expenses based on vendor name:

- **Materials**: Home Depot, Lowe's, Menards, lumber suppliers
- **Tools**: Tool stores, Harbor Freight, Northern Tool
- **Equipment Rental**: Companies with "rental" or "rent" in name
- **Office Supplies**: Staples, Office Depot
- **Travel**: Gas stations, fuel providers
- **Default**: Materials (for contractor businesses)

## Response Format

### Success Response
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

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Viewing Receipts in ContractorAI

1. Navigate to **Finance → Expenses** at `http://localhost:5173/finance`
2. Auto-imported receipts will show:
   - Green "Auto" badge
   - Receipt number under vendor name
   - Tax amount displayed separately
   - Package icon if line items are present
3. Click the expand arrow (↓) next to vendor name to see:
   - Full line item breakdown
   - Subtotal and tax breakdown
   - Supplier contact information

## Testing the Integration

### Using cURL
```bash
curl -X POST https://csarhyiqmprbnvfosmde.supabase.co/functions/v1/n8n-receipt-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "vendor": "Test Vendor",
    "amount": 50.00,
    "date": "2023-10-02",
    "receiptNumber": "TEST-001",
    "taxAmount": 3.50,
    "subtotal": 46.50,
    "lineItems": [
      {
        "description": "Test Item",
        "quantity": 1,
        "unitPrice": 46.50,
        "totalAmount": 46.50
      }
    ]
  }'
```

### Using Postman/Insomnia
1. Create new POST request
2. Set URL to webhook endpoint
3. Set header `Content-Type: application/json`
4. Paste example JSON in body
5. Send request
6. Check Finance page for new expense

## Troubleshooting

### Receipt not appearing?
1. Check n8n workflow execution logs
2. Verify webhook URL is correct
3. Check Supabase function logs:
   - Go to Supabase Dashboard
   - Functions → n8n-receipt-webhook → Logs
4. Verify date format is YYYY-MM-DD
5. Ensure amount is a number, not string

### Line items not showing?
- Click refresh button on Finance page
- Verify lineItems array format matches schema
- Check that metadata column exists in database

### Wrong category assigned?
- Add vendor name mapping in webhook function
- Edit the `mapVendorToCategory()` function
- Redeploy webhook function

## Advanced Features

### Batch Processing
Send multiple receipts in one request:
```json
[
  { "vendor": "Store1", "amount": 50, "date": "2023-10-01" },
  { "vendor": "Store2", "amount": 75, "date": "2023-10-02" }
]
```

### Custom Metadata
Add any additional fields to the `metadata` object - they'll be preserved in the database.

## Support

For issues or questions:
- Check Supabase function logs
- Review n8n workflow execution history
- Verify JSON structure matches documentation
- Test with minimal example first

## Next Steps

1. Configure your OCR provider in n8n
2. Add HTTP Request node with webhook URL
3. Map OCR output to required format
4. Test with sample receipt
5. Monitor Finance page for imported expenses
6. Customize category mapping if needed
