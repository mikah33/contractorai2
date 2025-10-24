// Supabase Edge Function for AI Calculator Chat
// Handles AI conversation and function calling for construction estimates

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface EstimateLineItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  type: 'material' | 'labor' | 'permit' | 'fee' | 'other';
  isCustom: boolean;
}

const SYSTEM_PROMPT = `You are an intelligent construction estimating assistant for ContractorAI. Your role is to help contractors create accurate estimates through natural conversation.

When users describe their project:
1. Ask for key dimensions and requirements
2. Use standard calculator functions when materials are available
3. Add custom line items for permits, fees, and custom materials
4. Present estimates clearly with breakdowns
5. Remember user preferences

Be conversational, helpful, and accurate. Always confirm before adding items to the estimate.`;

const tools = [
  {
    name: 'add_custom_line_item',
    description: 'Add a custom line item to the estimate (permits, fees, custom materials, labor)',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the line item' },
        quantity: { type: 'number', description: 'Quantity' },
        unit: { type: 'string', description: 'Unit (permit, hour, linear foot, etc.)' },
        unitPrice: { type: 'number', description: 'Price per unit' },
        type: {
          type: 'string',
          enum: ['material', 'labor', 'permit', 'fee', 'other'],
          description: 'Type of line item'
        }
      },
      required: ['name', 'quantity', 'unit', 'unitPrice', 'type']
    }
  },
  {
    name: 'calculate_deck_materials',
    description: 'Calculate materials for a deck using standard pricing',
    input_schema: {
      type: 'object',
      properties: {
        length: { type: 'number', description: 'Deck length in feet' },
        width: { type: 'number', description: 'Deck width in feet' },
        deckingType: {
          type: 'string',
          description: 'Type of decking material',
          enum: ['trex-transcend', 'trex-select', '5/4-deck', '2x6-pt']
        }
      },
      required: ['length', 'width', 'deckingType']
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, currentEstimate } = await req.json();

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: messages.map((m: Message) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        tools
      })
    });

    const data = await response.json();

    let updatedEstimate = currentEstimate || [];
    let assistantMessage = '';

    // Process tool calls
    if (data.content) {
      for (const block of data.content) {
        if (block.type === 'text') {
          assistantMessage += block.text;
        } else if (block.type === 'tool_use') {
          const toolName = block.name;
          const toolInput = block.input;

          if (toolName === 'add_custom_line_item') {
            const newItem: EstimateLineItem = {
              id: crypto.randomUUID(),
              name: toolInput.name,
              quantity: toolInput.quantity,
              unit: toolInput.unit,
              unitPrice: toolInput.unitPrice,
              totalPrice: toolInput.quantity * toolInput.unitPrice,
              type: toolInput.type,
              isCustom: true
            };
            updatedEstimate.push(newItem);
          } else if (toolName === 'calculate_deck_materials') {
            // Simplified deck calculation
            const { length, width, deckingType } = toolInput;
            const area = length * width;
            const boardsNeeded = Math.ceil(area / 25); // Simplified

            const prices: Record<string, number> = {
              'trex-transcend': 136,
              'trex-select': 90,
              '5/4-deck': 28,
              '2x6-pt': 23
            };

            const pricePerBoard = prices[deckingType] || 28;

            updatedEstimate.push({
              id: crypto.randomUUID(),
              name: `${deckingType} Decking (20ft)`,
              quantity: boardsNeeded,
              unit: 'boards',
              unitPrice: pricePerBoard,
              totalPrice: boardsNeeded * pricePerBoard,
              type: 'material',
              isCustom: false
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage || 'I can help you with that!',
        updatedEstimate
      }),
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
