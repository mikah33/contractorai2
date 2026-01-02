// Floor Plan Customizer Edge Function
// AI-powered room customization with material and labor pricing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface CustomizationItem {
  id: string;
  name: string;
  category: 'cabinets' | 'countertops' | 'fixtures' | 'appliances' | 'flooring' | 'electrical' | 'plumbing' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  laborPrice: number;
  totalPrice: number;
  description?: string;
  dimensions?: { width: number; length: number; height?: number };
}

interface FloorPlanContext {
  totalArea: number;
  ceilingHeight: number;
  wallCount: number;
  doorCount: number;
  windowCount: number;
  rooms: string;
  existingCustomizations: string;
}

// Pricing database for common items
const PRICING_DATABASE: Record<string, { unitPrice: number; laborRate: number; unit: string; category: CustomizationItem['category'] }> = {
  // Cabinets
  'base cabinet': { unitPrice: 250, laborRate: 75, unit: 'cabinet', category: 'cabinets' },
  'wall cabinet': { unitPrice: 200, laborRate: 60, unit: 'cabinet', category: 'cabinets' },
  'tall cabinet': { unitPrice: 400, laborRate: 90, unit: 'cabinet', category: 'cabinets' },
  'cabinet': { unitPrice: 225, laborRate: 70, unit: 'cabinet', category: 'cabinets' },
  'kitchen cabinets': { unitPrice: 225, laborRate: 70, unit: 'linear ft', category: 'cabinets' },
  'bathroom vanity': { unitPrice: 450, laborRate: 150, unit: 'unit', category: 'cabinets' },

  // Countertops
  'granite countertop': { unitPrice: 75, laborRate: 35, unit: 'sq ft', category: 'countertops' },
  'quartz countertop': { unitPrice: 85, laborRate: 35, unit: 'sq ft', category: 'countertops' },
  'marble countertop': { unitPrice: 100, laborRate: 40, unit: 'sq ft', category: 'countertops' },
  'laminate countertop': { unitPrice: 25, laborRate: 20, unit: 'sq ft', category: 'countertops' },
  'butcher block countertop': { unitPrice: 55, laborRate: 30, unit: 'sq ft', category: 'countertops' },
  'countertop': { unitPrice: 65, laborRate: 30, unit: 'sq ft', category: 'countertops' },

  // Fixtures
  'farmhouse sink': { unitPrice: 450, laborRate: 200, unit: 'unit', category: 'fixtures' },
  'undermount sink': { unitPrice: 350, laborRate: 175, unit: 'unit', category: 'fixtures' },
  'drop-in sink': { unitPrice: 200, laborRate: 125, unit: 'unit', category: 'fixtures' },
  'sink': { unitPrice: 300, laborRate: 150, unit: 'unit', category: 'fixtures' },
  'faucet': { unitPrice: 175, laborRate: 75, unit: 'unit', category: 'fixtures' },
  'toilet': { unitPrice: 350, laborRate: 200, unit: 'unit', category: 'fixtures' },
  'bathtub': { unitPrice: 800, laborRate: 400, unit: 'unit', category: 'fixtures' },
  'shower': { unitPrice: 1200, laborRate: 600, unit: 'unit', category: 'fixtures' },
  'double sink': { unitPrice: 500, laborRate: 225, unit: 'unit', category: 'fixtures' },

  // Appliances
  'refrigerator': { unitPrice: 1500, laborRate: 100, unit: 'unit', category: 'appliances' },
  'range': { unitPrice: 800, laborRate: 150, unit: 'unit', category: 'appliances' },
  'stove': { unitPrice: 800, laborRate: 150, unit: 'unit', category: 'appliances' },
  'oven': { unitPrice: 1000, laborRate: 200, unit: 'unit', category: 'appliances' },
  'dishwasher': { unitPrice: 600, laborRate: 175, unit: 'unit', category: 'appliances' },
  'microwave': { unitPrice: 300, laborRate: 75, unit: 'unit', category: 'appliances' },
  'garbage disposal': { unitPrice: 150, laborRate: 100, unit: 'unit', category: 'appliances' },
  'washer': { unitPrice: 700, laborRate: 125, unit: 'unit', category: 'appliances' },
  'dryer': { unitPrice: 700, laborRate: 125, unit: 'unit', category: 'appliances' },

  // Flooring
  'hardwood flooring': { unitPrice: 8, laborRate: 5, unit: 'sq ft', category: 'flooring' },
  'laminate flooring': { unitPrice: 4, laborRate: 3, unit: 'sq ft', category: 'flooring' },
  'tile flooring': { unitPrice: 6, laborRate: 8, unit: 'sq ft', category: 'flooring' },
  'vinyl flooring': { unitPrice: 3, laborRate: 2, unit: 'sq ft', category: 'flooring' },
  'carpet': { unitPrice: 4, laborRate: 2, unit: 'sq ft', category: 'flooring' },
  'flooring': { unitPrice: 5, laborRate: 4, unit: 'sq ft', category: 'flooring' },

  // Electrical
  'recessed light': { unitPrice: 35, laborRate: 85, unit: 'fixture', category: 'electrical' },
  'recessed lighting': { unitPrice: 35, laborRate: 85, unit: 'fixture', category: 'electrical' },
  'pendant light': { unitPrice: 150, laborRate: 75, unit: 'fixture', category: 'electrical' },
  'chandelier': { unitPrice: 400, laborRate: 150, unit: 'fixture', category: 'electrical' },
  'ceiling fan': { unitPrice: 200, laborRate: 125, unit: 'unit', category: 'electrical' },
  'outlet': { unitPrice: 15, laborRate: 75, unit: 'unit', category: 'electrical' },
  'switch': { unitPrice: 10, laborRate: 50, unit: 'unit', category: 'electrical' },
  'under cabinet lighting': { unitPrice: 25, laborRate: 40, unit: 'linear ft', category: 'electrical' },

  // Plumbing
  'water heater': { unitPrice: 800, laborRate: 400, unit: 'unit', category: 'plumbing' },
  'tankless water heater': { unitPrice: 1500, laborRate: 500, unit: 'unit', category: 'plumbing' },
  'sump pump': { unitPrice: 300, laborRate: 250, unit: 'unit', category: 'plumbing' },
  'water line': { unitPrice: 8, laborRate: 15, unit: 'linear ft', category: 'plumbing' },
  'drain line': { unitPrice: 10, laborRate: 18, unit: 'linear ft', category: 'plumbing' },
};

const SYSTEM_PROMPT = `You are a floor plan customization assistant for ContractorAI. You help contractors and homeowners design room improvements and calculate accurate material and labor costs.

## Your Role
- Parse user requests for room customizations (cabinets, counters, fixtures, flooring, etc.)
- Calculate quantities based on room dimensions provided
- Return structured pricing data using the add_customization tool

## Important Guidelines
1. ALWAYS use the add_customization tool for each item the user wants to add
2. Calculate quantities based on the room dimensions when appropriate (e.g., flooring uses total area)
3. Provide helpful suggestions and alternatives when relevant
4. Break down complex requests into individual items
5. Use standard industry pricing - be realistic but competitive
6. Include both material and labor costs

## Room Context
The user has scanned a room with LiDAR. You have access to the room dimensions and can calculate appropriate quantities.

## Pricing Guidelines (use as reference)
- Cabinets: $200-400 per cabinet + $60-90 labor each
- Countertops: $25-100/sq ft + $20-40/sq ft labor (depends on material)
- Sinks: $200-500 + $125-225 labor
- Appliances: $300-2000 + $75-200 installation
- Flooring: $3-12/sq ft material + $2-8/sq ft labor
- Electrical fixtures: $35-400 each + $50-150 labor
- Plumbing fixtures: $150-1500 + $100-600 labor`;

const tools: Anthropic.Tool[] = [
  {
    name: 'add_customization',
    description: 'Add a customization item to the floor plan with pricing',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the item (e.g., "Granite Countertop", "Base Cabinet")' },
        category: {
          type: 'string',
          enum: ['cabinets', 'countertops', 'fixtures', 'appliances', 'flooring', 'electrical', 'plumbing', 'other'],
          description: 'Category of the item'
        },
        quantity: { type: 'number', description: 'Quantity needed' },
        unit: { type: 'string', description: 'Unit of measurement (sq ft, linear ft, unit, fixture, cabinet)' },
        unitPrice: { type: 'number', description: 'Price per unit for materials' },
        laborPrice: { type: 'number', description: 'Total labor cost for this item' },
        description: { type: 'string', description: 'Brief description of the item and its specifications' }
      },
      required: ['name', 'category', 'quantity', 'unit', 'unitPrice', 'laborPrice']
    }
  },
  {
    name: 'calculate_countertop_area',
    description: 'Calculate countertop area based on cabinet layout',
    input_schema: {
      type: 'object',
      properties: {
        linearFeet: { type: 'number', description: 'Linear feet of countertop' },
        depth: { type: 'number', description: 'Counter depth in inches (default 25)' }
      },
      required: ['linearFeet']
    }
  },
  {
    name: 'suggest_layout',
    description: 'Suggest optimal layout for items based on room dimensions',
    input_schema: {
      type: 'object',
      properties: {
        roomType: { type: 'string', enum: ['kitchen', 'bathroom', 'bedroom', 'living room', 'other'], description: 'Type of room' },
        totalArea: { type: 'number', description: 'Total room area in sq ft' }
      },
      required: ['roomType', 'totalArea']
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, floorPlanContext, existingItems = [] } = await req.json() as {
      message: string;
      floorPlanContext: FloorPlanContext;
      existingItems: CustomizationItem[];
    };

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        userId = user.id;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context message
    const contextMessage = `
Room Information:
- Total Area: ${floorPlanContext.totalArea} sq ft
- Ceiling Height: ${floorPlanContext.ceilingHeight} ft
- Walls: ${floorPlanContext.wallCount}
- Doors: ${floorPlanContext.doorCount}
- Windows: ${floorPlanContext.windowCount}
- Rooms: ${floorPlanContext.rooms}
- Already Added: ${floorPlanContext.existingCustomizations}

User Request: ${message}`;

    const newItems: CustomizationItem[] = [];
    let assistantMessage = '';

    // Agentic loop
    let continueLoop = true;
    let loopCount = 0;
    const maxLoops = 5;

    let claudeMessages: Anthropic.MessageParam[] = [
      { role: 'user', content: contextMessage }
    ];

    while (continueLoop && loopCount < maxLoops) {
      loopCount++;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools,
        messages: claudeMessages
      });

      if (response.stop_reason === 'end_turn') {
        for (const content of response.content) {
          if (content.type === 'text') {
            assistantMessage += content.text;
          }
        }
        continueLoop = false;
      } else if (response.stop_reason === 'tool_use') {
        const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

        for (const content of response.content) {
          if (content.type === 'text') {
            assistantMessage += content.text;
          } else if (content.type === 'tool_use') {
            const toolName = content.name;
            const toolInput = content.input as Record<string, any>;
            let toolResultContent = '';

            if (toolName === 'add_customization') {
              const totalPrice = (toolInput.quantity * toolInput.unitPrice) + toolInput.laborPrice;

              const newItem: CustomizationItem = {
                id: crypto.randomUUID(),
                name: toolInput.name,
                category: toolInput.category,
                quantity: toolInput.quantity,
                unit: toolInput.unit,
                unitPrice: toolInput.unitPrice,
                laborPrice: toolInput.laborPrice,
                totalPrice,
                description: toolInput.description
              };

              newItems.push(newItem);
              toolResultContent = `Added: ${newItem.name} - ${newItem.quantity} ${newItem.unit} @ $${newItem.unitPrice}/${newItem.unit} + $${newItem.laborPrice} labor = $${totalPrice.toFixed(2)} total`;

            } else if (toolName === 'calculate_countertop_area') {
              const depth = toolInput.depth || 25;
              const sqFt = (toolInput.linearFeet * depth) / 144;
              toolResultContent = `Countertop area: ${sqFt.toFixed(1)} sq ft (${toolInput.linearFeet} linear ft x ${depth}" depth)`;

            } else if (toolName === 'suggest_layout') {
              const suggestions: Record<string, string> = {
                kitchen: `For a ${toolInput.totalArea} sq ft kitchen, I recommend:\n- 12-16 linear ft of base cabinets\n- 8-12 linear ft of wall cabinets\n- 15-20 sq ft of countertop\n- Recessed lighting (4-6 fixtures)\n- Consider adding an island if space allows (150+ sq ft)`,
                bathroom: `For a ${toolInput.totalArea} sq ft bathroom, I recommend:\n- 36-48" vanity with countertop\n- Toilet and sink fixtures\n- Tile flooring\n- 3-4 recessed lights or a vanity light bar`,
                bedroom: `For a ${toolInput.totalArea} sq ft bedroom, I recommend:\n- Flooring for the full area\n- Ceiling fan with light\n- 2-4 outlets\n- Closet organization system if applicable`,
                'living room': `For a ${toolInput.totalArea} sq ft living room, I recommend:\n- Flooring for the full area\n- 4-6 recessed lights or a chandelier\n- Multiple outlets for electronics\n- Consider accent lighting`,
                other: `For a ${toolInput.totalArea} sq ft room, consider flooring and appropriate lighting based on intended use.`
              };
              toolResultContent = suggestions[toolInput.roomType] || suggestions.other;
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: content.id,
              content: toolResultContent
            });
          }
        }

        claudeMessages.push({
          role: 'assistant',
          content: response.content
        });
        claudeMessages.push({
          role: 'user',
          content: toolResults
        });
      } else {
        continueLoop = false;
      }
    }

    // Calculate totals
    const materialTotal = newItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const laborTotal = newItems.reduce((sum, item) => sum + item.laborPrice, 0);
    const grandTotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);

    return new Response(
      JSON.stringify({
        message: assistantMessage || 'I\'ve processed your request. Let me know if you need anything else!',
        items: newItems,
        totals: {
          materials: materialTotal,
          labor: laborTotal,
          grandTotal
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Floor Plan Customizer Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
