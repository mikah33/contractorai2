# Receipt OCR Prompt + Token Tracking

## OpenAI Node Prompt:

```
You are a receipt parser for contractor expenses. Extract data into JSON.

CRITICAL - AMOUNT FIELD:
- "amount" = TOTAL PAID INCLUDING TAX (the final total at bottom)
- "subtotal" = amount BEFORE tax
- "taxAmount" = tax only
- Example: subtotal=$100, tax=$8.25, then amount=$108.25

REQUIRED JSON FORMAT:
{
  "vendor": "exact store name",
  "amount": TOTAL_INCLUDING_TAX_AS_NUMBER,
  "date": "YYYY-MM-DD",
  "receiptNumber": "number or null",
  "taxAmount": NUMBER_OR_NULL,
  "subtotal": NUMBER_OR_NULL,
  "supplierAddress": "address or null",
  "supplierPhone": "phone or null",
  "lineItems": [
    {
      "description": "item name",
      "quantity": NUMBER,
      "unitPrice": NUMBER,
      "totalAmount": NUMBER
    }
  ],
  "confidence": {
    "vendor": 0-1,
    "amount": 0-1,
    "date": 0-1,
    "overall": 0-1
  }
}

RULES:
- Home Depot: Look for "TOTAL" or "BALANCE DUE" (biggest number)
- Lowe's: Look for "AMOUNT DUE" or "TOTAL"
- amount MUST equal subtotal + taxAmount
- Extract ALL line items
- All money as numbers, not strings
- Return ONLY JSON, no markdown
```

---

## Updated Code Node (with Token Tracking):

```javascript
const response = $input.first().json;

// Extract token usage from OpenAI response
const usage = response.usage || {};
const inputTokens = usage.prompt_tokens || 0;
const outputTokens = usage.completion_tokens || 0;
const totalTokens = usage.total_tokens || 0;

// Calculate cost (GPT-4o-mini pricing as of 2025)
const inputCost = (inputTokens / 1000000) * 0.150;  // $0.150 per 1M input tokens
const outputCost = (outputTokens / 1000000) * 0.600; // $0.600 per 1M output tokens
const totalCost = inputCost + outputCost;

// Get the response content
const content = response.text || response.message?.content || response.choices?.[0]?.message?.content || '';

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
      // Receipt data
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

      // Token usage metadata
      tokenUsage: {
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: totalTokens,
        estimatedCost: parseFloat(totalCost.toFixed(6)),
        inputCost: parseFloat(inputCost.toFixed(6)),
        outputCost: parseFloat(outputCost.toFixed(6)),
        currency: 'USD'
      },

      // Raw data for debugging
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
      error: `Parse error: ${e.message}. Raw: ${content.substring(0, 200)}`,
      tokenUsage: {
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: totalTokens,
        estimatedCost: parseFloat(totalCost.toFixed(6)),
        inputCost: parseFloat(inputCost.toFixed(6)),
        outputCost: parseFloat(outputCost.toFixed(6)),
        currency: 'USD'
      }
    }
  }];
}
```

---

## Example Response:

```json
{
  "vendor": "The Home Depot",
  "amount": 169.72,
  "date": "2025-10-02",
  "receiptNumber": "6042 2849 5033 8449",
  "taxAmount": 12.94,
  "subtotal": 156.78,
  "supplierAddress": "123 Main St, Seattle, WA 98101",
  "supplierPhone": "(206) 555-0100",
  "lineItems": [
    {
      "description": "2x4x8 Lumber",
      "quantity": 10,
      "unitPrice": 5.99,
      "totalAmount": 59.90
    }
  ],
  "confidence": {
    "vendor": 0.95,
    "amount": 0.98,
    "date": 0.92,
    "overall": 0.95
  },
  "method": "api",
  "tokenUsage": {
    "inputTokens": 1250,
    "outputTokens": 180,
    "totalTokens": 1430,
    "estimatedCost": 0.000296,
    "inputCost": 0.000188,
    "outputCost": 0.000108,
    "currency": "USD"
  }
}
```

---

## Token Cost Tracking Benefits:

1. **Cost per receipt**: See exact cost (~$0.0003 per receipt)
2. **Monthly budgeting**: Track total spending on OCR
3. **Debugging**: High token counts = complex receipts or issues
4. **Optimization**: Identify if prompt is too long

## Typical Token Counts:

- **Small receipt** (gas station): ~800 input + 100 output = ~$0.0002
- **Medium receipt** (Home Depot 5 items): ~1200 input + 180 output = ~$0.0003
- **Large receipt** (contractor supply 20+ items): ~2000 input + 400 output = ~$0.0006

All much cheaper than Mindee's $0.10-0.30 per receipt! 🎉
