# Manual n8n Workflow Setup (If Import Fails)

## Create Workflow from Scratch (5 minutes)

### 1. Create New Workflow
- Go to: https://contractorai.app.n8n.cloud/
- Click **"Add workflow"** → **"Blank"**
- Name it: **"ContractorAI Receipt OCR"**

### 2. Add Webhook Node
- Click **"+"** → Search: **"Webhook"**
- Settings:
  - **Path**: `receipt-ocr`
  - Leave everything else default
- Click **"Execute Node"** to get the webhook URL
- **Copy the Production URL** - you'll need this later!

### 3. Add HTTP Request Node
- Click **"+"** after Webhook → Search: **"HTTP Request"**
- Settings:
  - **Authentication**: `Predefined Credential Type` → `OpenAi Api`
  - **Credential**: Click **"+"** → Paste your OpenAI API key
  - **Method**: `POST`
  - **URL**: `https://api.openai.com/v1/chat/completions`
  - **Send Body**: ✅ Check
  - **Body Content Type**: `JSON`
  - **JSON Body**: Click **"Add Parameter"** 4 times and add:

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Extract receipt data as JSON with fields: vendor (string), amount (number), date (YYYY-MM-DD), receiptNumber (string), taxAmount (number), subtotal (number), supplierAddress (string), supplierPhone (string), lineItems (array with description, quantity, unitPrice, totalAmount), confidence (object with vendor, amount, date, overall as 0-1 scores). Return ONLY valid JSON, no markdown formatting."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "={{ $json.imageUrl }}"
          }
        }
      ]
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.1
}
```

**Easier way - use Expression mode:**
- Click **"Expression"** tab
- Paste:
```javascript
{{
  {
    "model": "gpt-4o-mini",
    "messages": [{
      "role": "user",
      "content": [{
        "type": "text",
        "text": "Extract receipt data as JSON with: vendor, amount, date, receiptNumber, taxAmount, subtotal, supplierAddress, supplierPhone, lineItems (array: description, quantity, unitPrice, totalAmount), confidence (vendor, amount, date, overall 0-1). Return ONLY JSON."
      }, {
        "type": "image_url",
        "image_url": {"url": $json.imageUrl}
      }]
    }],
    "max_tokens": 1000,
    "temperature": 0.1
  }
}}
```

### 4. Add Code Node
- Click **"+"** after HTTP Request → Search: **"Code"**
- Paste this code:

```javascript
const response = $input.first().json;
const content = response.choices[0].message.content;

try {
  let parsed = JSON.parse(content);

  return [{
    json: {
      vendor: parsed.vendor || '',
      amount: parseFloat(parsed.amount) || 0,
      date: parsed.date || '',
      receiptNumber: parsed.receiptNumber,
      taxAmount: parsed.taxAmount ? parseFloat(parsed.taxAmount) : undefined,
      subtotal: parsed.subtotal ? parseFloat(parsed.subtotal) : undefined,
      supplierAddress: parsed.supplierAddress,
      supplierPhone: parsed.supplierPhone,
      lineItems: parsed.lineItems || [],
      confidence: parsed.confidence || {
        vendor: 0.85,
        amount: 0.85,
        date: 0.85,
        overall: 0.85
      },
      method: 'api',
      rawData: parsed
    }
  }];
} catch (e) {
  return [{
    json: {
      vendor: '',
      amount: 0,
      date: '',
      confidence: {vendor: 0, amount: 0, date: 0, overall: 0},
      method: 'manual',
      error: e.message
    }
  }];
}
```

### 5. Add Respond to Webhook Node
- Click **"+"** after Code → Search: **"Respond to Webhook"**
- Settings:
  - **Respond With**: `All Incoming Items`
- Done!

### 6. Save & Activate
- Click **"Save"** (top right)
- Click **"Activate"** toggle (top right)

---

## Now Configure Supabase

### 1. Copy your n8n webhook URL
From step 2 above (looks like: `https://contractorai.app.n8n.cloud/webhook/receipt-ocr`)

### 2. Set it in Supabase secrets:
```bash
supabase secrets set N8N_WEBHOOK_URL=https://contractorai.app.n8n.cloud/webhook/receipt-ocr --project-ref ujhgwcurllkkeouzwvgk
```

### 3. Deploy Edge Function:
```bash
supabase functions deploy process-receipt --project-ref ujhgwcurllkkeouzwvgk
```

### 4. Test!
Upload a receipt in ContractorAI - it should auto-fill all fields!

---

## Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Name: "ContractorAI Receipt OCR"
4. Copy the key (starts with `sk-proj-...`)
5. Save it somewhere safe!

**Add $5 credits:** https://platform.openai.com/settings/organization/billing/overview

---

## Workflow Diagram

```
[Webhook] → [HTTP Request to OpenAI] → [Parse JSON] → [Respond]
   ↓              ↓                          ↓             ↓
Receives      Analyzes receipt          Formats        Returns
imageUrl      with GPT-4o-mini          response       JSON
```

---

## Cost Estimate

- **GPT-4o-mini**: ~$0.0002 per receipt
- **100 receipts**: ~$0.02
- **1000 receipts**: ~$0.20/month

Way cheaper than Mindee! 🎉
