import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';

const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function normalizeMediaType(contentType: string): string {
  const ct = contentType.split(';')[0].trim().toLowerCase();
  if (VALID_MEDIA_TYPES.includes(ct)) return ct;
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'image/jpeg';
  if (ct.includes('png')) return 'image/png';
  if (ct.includes('webp')) return 'image/webp';
  if (ct.includes('gif')) return 'image/gif';
  return 'image/jpeg'; // safe default
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64, mimeType } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageUrl or imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let base64Data: string;
    let mediaType: string;

    if (imageBase64) {
      base64Data = imageBase64;
      mediaType = normalizeMediaType(mimeType || 'image/jpeg');
    } else {
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        throw new Error(`Failed to fetch image: ${imgResponse.status}`);
      }
      const imgBuffer = await imgResponse.arrayBuffer();
      base64Data = base64Encode(new Uint8Array(imgBuffer));
      const detectedType = imgResponse.headers.get('content-type') || 'image/jpeg';
      mediaType = normalizeMediaType(detectedType);
    }

    console.log(`Sending to Claude: mediaType=${mediaType}, base64Length=${base64Data.length}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: `Analyze this receipt image and extract all information. Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:

{
  "vendor": "Store/business name",
  "amount": "Total amount as a number string (e.g. '45.99')",
  "date": "Date in YYYY-MM-DD format",
  "receiptNumber": "Receipt/transaction number if visible",
  "taxAmount": "Tax amount as number string",
  "subtotal": "Subtotal before tax as number string",
  "supplierAddress": "Store address if visible",
  "supplierPhone": "Store phone if visible",
  "lineItems": [
    {
      "description": "Item name",
      "quantity": 1,
      "unitPrice": "Price per unit as number string",
      "total": "Line total as number string"
    }
  ],
  "confidence": {
    "vendor": 0.95,
    "amount": 0.95,
    "date": 0.90,
    "overall": 0.93
  }
}

Rules:
- All monetary values must be number strings (e.g. "45.99"), never "0.00" unless truly zero
- Read the actual total from the receipt - look for "TOTAL", "Amount Due", "Balance", etc.
- If you can see numbers on the receipt, extract them accurately
- For dates, convert to YYYY-MM-DD format
- Set confidence scores based on how clearly you can read each field
- If a field is not visible, use null instead of empty string
- Extract ALL line items visible on the receipt`
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Claude API error: ${response.status}`, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const textContent = result.content?.find((c: any) => c.type === 'text')?.text || '';

    let cleaned = textContent.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const ocrData = JSON.parse(cleaned);

    return new Response(
      JSON.stringify(ocrData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
