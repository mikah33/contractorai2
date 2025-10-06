# Simplified n8n Setup - Use OpenAI Node

## Delete HTTP Request Node and Use OpenAI Node Instead

### 1. Delete the HTTP Request node
- Click on the "HTTP Request" node
- Press `Delete` key

### 2. Add OpenAI node
- Click "+" between Webhook and Code nodes
- Search: "OpenAI"
- Select: **"OpenAI"** (not "OpenAI Chat Model")

### 3. Configure OpenAI node

**Resource**: `Image` → `Analyze`

**Credentials**:
- Click "+" to add credential
- Paste your API key: `sk-proj-l7bbY3wWsNkv0aXsX3vbn6yU...`
- Save

**Model**: `gpt-4o-mini`

**Prompt**:
```
Extract receipt data as JSON with these exact fields:
- vendor (string)
- amount (number)
- date (YYYY-MM-DD)
- receiptNumber (string or null)
- taxAmount (number or null)
- subtotal (number or null)
- supplierAddress (string or null)
- supplierPhone (string or null)
- lineItems (array with: description, quantity, unitPrice, totalAmount)
- confidence (object with: vendor, amount, date, overall as 0-1 scores)

Return ONLY valid JSON, no markdown formatting.
```

**Image URL**: Click "Expression" tab → Paste:
```
={{ $json.imageUrl }}
```

**Max Tokens**: `1000`

### 4. Update Code node

The OpenAI node returns a different format. Update the Code node:

```javascript
const response = $input.first().json;
const content = response.text || response.message?.content || '';

try {
  // Remove markdown code blocks if present
  let jsonText = content;
  if (content.includes('```json')) {
    const match = content.match(/```json\n([\s\S]*?)\n```/);
    if (match) jsonText = match[1];
  } else if (content.includes('```')) {
    const match = content.match(/```\n([\s\S]*?)\n```/);
    if (match) jsonText = match[1];
  }

  const parsed = JSON.parse(jsonText);

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
      confidence: parsed.confidence || {vendor: 0.85, amount: 0.85, date: 0.85, overall: 0.85},
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
      error: `Parse error: ${e.message}. Raw: ${content}`
    }
  }];
}
```

### 5. Save & Test
- Click **Save**
- Make sure workflow is **Active**
- Upload a receipt!

---

## Alternative: Use Chat Model

If "OpenAI Image Analyze" doesn't exist, use this setup:

1. Add **"OpenAI Chat Model"** node
2. **Model**: `gpt-4o-mini`
3. **Messages** → Add message:
   - **Role**: `user`
   - **Message Type**: Click "+" → Add two items:
     - **Type**: `text` → Paste the prompt above
     - **Type**: `imageUrl` → Expression: `={{ $json.imageUrl }}`

Same code node as above!
