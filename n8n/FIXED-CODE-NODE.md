# Fixed Code Node for OpenAI Response

## Replace your Code node with this:

```javascript
// Get the OpenAI response
const response = $input.first().json;

// Handle different OpenAI response formats
let content = '';
if (Array.isArray(response)) {
  // If response is an array, get first item's content
  content = response[0]?.content || '';
} else if (response.content) {
  content = response.content;
} else if (response.text) {
  content = response.text;
} else if (response.message?.content) {
  content = response.message.content;
} else if (response.choices?.[0]?.message?.content) {
  content = response.choices[0].message.content;
}

// Extract token usage
const usage = response.usage || {};
const inputTokens = usage.prompt_tokens || 0;
const outputTokens = usage.completion_tokens || 0;
const totalTokens = usage.total_tokens || 0;

// Calculate cost (GPT-4o-mini pricing)
const inputCost = (inputTokens / 1000000) * 0.150;
const outputCost = (outputTokens / 1000000) * 0.600;
const totalCost = inputCost + outputCost;

try {
  // Remove markdown code blocks
  let jsonText = content;
  if (content.includes('```json')) {
    const match = content.match(/```json\s*\n([\s\S]*?)\n```/);
    if (match) {
      jsonText = match[1];
    }
  } else if (content.includes('```')) {
    const match = content.match(/```\s*\n([\s\S]*?)\n```/);
    if (match) {
      jsonText = match[1];
    }
  }

  // Parse JSON
  const parsed = JSON.parse(jsonText);

  return [{
    json: {
      vendor: parsed.vendor || '',
      amount: parseFloat(parsed.amount) || 0,
      date: parsed.date || '',
      receiptNumber: parsed.receiptNumber || undefined,
      taxAmount: parsed.taxAmount ? parseFloat(parsed.taxAmount) : undefined,
      subtotal: parsed.subtotal ? parseFloat(parsed.subtotal) : undefined,
      supplierAddress: parsed.supplierAddress || undefined,
      supplierPhone: parsed.supplierPhone || undefined,
      lineItems: parsed.lineItems || [],
      confidence: parsed.confidence || {
        vendor: 0.9,
        amount: 0.9,
        date: 0.9,
        overall: 0.9
      },
      method: 'api',
      tokenUsage: {
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: totalTokens,
        estimatedCost: parseFloat(totalCost.toFixed(6)),
        inputCost: parseFloat(inputCost.toFixed(6)),
        outputCost: parseFloat(outputCost.toFixed(6)),
        currency: 'USD'
      },
      rawData: parsed
    }
  }];
} catch (e) {
  // If parsing fails, return error with debug info
  return [{
    json: {
      vendor: '',
      amount: 0,
      date: '',
      confidence: {vendor: 0, amount: 0, date: 0, overall: 0},
      method: 'manual',
      error: `Parse error: ${e.message}`,
      debugInfo: {
        rawContent: content.substring(0, 500),
        contentLength: content.length,
        hasMarkdown: content.includes('```')
      },
      tokenUsage: {
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: totalTokens,
        estimatedCost: parseFloat(totalCost.toFixed(6))
      }
    }
  }];
}
```

## What This Does:

1. ✅ Handles OpenAI's array response format `[{content: "..."}]`
2. ✅ Extracts JSON from markdown code blocks
3. ✅ Includes token tracking
4. ✅ Better error handling with debug info

## Test It:

1. Replace your Code node with this code
2. Click **"Execute node"** to test
3. You should see:
   - vendor: "The Home Depot"
   - amount: 134.73
   - date: "2025-08-25"
   - taxAmount: 8.81
   - subtotal: 125.92
   - lineItems: (all the items)
   - tokenUsage: {inputTokens, outputTokens, cost}

4. Save and upload a receipt!
