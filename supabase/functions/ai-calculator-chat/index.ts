// Supabase Edge Function for AI Calculator Chat
// Handles AI conversation and function calling for construction estimates

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

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

const SYSTEM_PROMPT = `You are an intelligent construction estimating assistant for ContractorAI. Your role is to help contractors create accurate, detailed estimates through natural conversation.

CRITICAL RULES:
1. When a user describes a project, IMMEDIATELY calculate and add ALL items they mention in ONE response
2. Be INFORMATIVE - always show quantities, prices, and totals in your responses
3. NEVER say "I can help you with that!" without actually adding items
4. Calculate EVERYTHING the user mentions automatically - don't ask for more details unless absolutely necessary
5. Use industry-standard pricing when adding custom items
6. **WHEN USER PROVIDES PRICE EDITS OR CORRECTIONS**: FIRST call clear_estimate to remove ALL existing items, THEN recalculate with the new parameters

HANDLING PRICE EDITS:
When user says "at $125 a cubic yard" or "make that $X instead" or "change the price to $Y":
1. FIRST call clear_estimate() to remove all existing estimate items
2. THEN recalculate the ENTIRE estimate with the new price using the original project parameters
3. Show the complete updated estimate with ALL line items

Example:
User: "I need a 25x25 concrete pad 4 inches thick with rebar mesh"
You: Calculate and show estimate with default pricing

User: "at $125 a cubic yard"
You:
1. Call clear_estimate() to remove existing items
2. Call calculate_concrete(length=25, width=25, depth=4, includeMesh=true, concretePrice=125)
3. Respond: "I've updated your estimate with $125 per cubic yard:
   • Concrete: 7.72 cubic yards @ $125 = $965.00
   • Wire Mesh: 7 sheets @ $12.98 = $90.86
   Total: $1,055.86"

WORKFLOW:
When user says: "I need a 25x25 deck, 8ft high, with staircase, gate, and staining"
YOU MUST:
1. Call calculate_deck_materials for the decking
2. Call add_custom_line_item for posts/beams (e.g., "16 - 6x6 Posts @ $45 each")
3. Call add_custom_line_item for joists (e.g., "25 - 2x8 Joists @ $18 each")
4. Call add_custom_line_item for staircase (e.g., "1 Staircase @ $800")
5. Call add_custom_line_item for gate (e.g., "1 Gate @ $250")
6. Call add_custom_line_item for staining (e.g., "625 sqft Deck Staining @ $1.50/sqft")
7. Respond with: "I've created your estimate for a 25x25 deck (625 sqft), 8ft high:
   • Decking: [X] boards at $[Y] = $[Z]
   • Posts & Beams: $[amount]
   • Joists: $[amount]
   • Staircase: $[amount]
   • Gate: $[amount]
   • Staining: $[amount]
   Total: $[X]"

INDUSTRY PRICING GUIDELINES:
- 6x6 Pressure Treated Posts: $45-55 each
- 2x8 Joists (16ft): $18-22 each
- Staircase (standard 3-5 steps): $600-1000
- Deck Gate: $200-350
- Deck Staining: $1.50-2.50 per sqft
- Labor for deck installation: $15-25 per sqft
- Building Permits: $200-500
- Concrete footings: $50-75 per post

EXAMPLES:
User: "add a permit fee of $350"
You: Call add_custom_line_item(name="Building Permit", quantity=1, unit="permit", unitPrice=350, type="permit")
Then respond: "Added building permit ($350) to your estimate."

User: "I need a 25x25 concrete pad, 4 inches deep, with wire mesh"
You: Call calculate_concrete(length=25, width=25, depth=4, includeMesh=true)
Then respond: "I've calculated your concrete pad:
• Concrete: 7.72 cubic yards @ $185 = $1,428.20
• Wire Mesh: 7 sheets @ $12.98 = $90.86
Total: $1,519.06"

User: "I need a roof with asphalt shingles at 17 squares"
You: Call calculate_roofing_materials(roofAreaSqFt=1700, materialType='asphalt')
Then respond: "I've calculated your roofing estimate for 1,700 sq ft (17 squares):
• Asphalt Shingles: 18.7 squares (with 10% waste) @ $350 = $6,545.00
• Underlayment: 18.7 squares @ $26 = $486.20
• Ice & Water Shield: 9 rolls @ $70 = $630.00
• Ridge Cap: 170 linear feet @ $3.25 = $552.50
• Drip Edge: 164.92 linear feet @ $2.50 = $412.30
• Nails & Fasteners: 18.7 squares @ $32 = $598.40
Total: $9,224.40"

Be natural, conversational, and ALWAYS include actual numbers in your responses. Make contractors feel confident in your estimates.`;

const tools = [
  {
    type: 'function',
    function: {
      name: 'clear_estimate',
      description: 'Clear all items from the current estimate. Use this when the user wants to start over or modify prices/quantities for an existing estimate.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_custom_line_item',
      description: 'Add a custom line item to the estimate (permits, fees, custom materials, labor)',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the line item' },
          quantity: { type: 'number', description: 'Quantity' },
          unit: { type: 'string', description: 'Unit (permit, hour, linear foot, cubic yard, square foot, etc.)' },
          unitPrice: { type: 'number', description: 'Price per unit' },
          type: {
            type: 'string',
            enum: ['material', 'labor', 'permit', 'fee', 'other'],
            description: 'Type of line item'
          }
        },
        required: ['name', 'quantity', 'unit', 'unitPrice', 'type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_roofing_materials',
      description: 'Calculate materials for a roofing project including shingles, underlayment, ridge cap, drip edge, nails, and optional items',
      parameters: {
        type: 'object',
        properties: {
          roofAreaSqFt: { type: 'number', description: 'Roof area in square feet' },
          materialType: {
            type: 'string',
            description: 'Type of roofing material',
            enum: ['asphalt', 'architectural', 'metal', 'tile', 'composite'],
            default: 'asphalt'
          },
          shinglePricePerSquare: { type: 'number', description: 'Price per roofing square (100 sq ft) for shingles. If not specified, uses standard pricing: asphalt=$350, architectural=$475, metal=$850, tile=$625, composite=$425', default: null },
          wasteFactor: { type: 'number', description: 'Waste factor percentage (typically 10-15%)', default: 10 },
          includeIceShield: { type: 'boolean', description: 'Include ice & water shield', default: true },
          includeTearOff: { type: 'boolean', description: 'Include tear-off/debris disposal', default: false },
          skylights: { type: 'number', description: 'Number of skylights', default: 0 }
        },
        required: ['roofAreaSqFt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_deck_materials',
      description: 'Calculate materials for a deck using standard pricing',
      parameters: {
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
  },
  {
    type: 'function',
    function: {
      name: 'calculate_concrete',
      description: 'Calculate concrete materials for slabs, pads, driveways, etc. Includes concrete, coloring, and fiber reinforcement',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: 'Length in feet' },
          width: { type: 'number', description: 'Width in feet' },
          depth: { type: 'number', description: 'Depth in inches (typically 4 for pads, 6 for driveways)' },
          includeColoring: { type: 'boolean', description: 'Include concrete coloring ($8/cubic yard)', default: false },
          includeFiber: { type: 'boolean', description: 'Include fiber reinforcement ($15/cubic yard)', default: false },
          concretePrice: { type: 'number', description: 'Price per cubic yard of concrete (default: $185)', default: 185 },
          includeMesh: { type: 'boolean', description: 'Include 6x6 wire mesh reinforcement ($12.98/sheet, 100 sqft per sheet)', default: false }
        },
        required: ['length', 'width', 'depth']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_flooring',
      description: 'Calculate flooring materials including material, underlayment, and installation supplies',
      parameters: {
        type: 'object',
        properties: {
          area: { type: 'number', description: 'Floor area in square feet' },
          materialType: {
            type: 'string',
            description: 'Type of flooring',
            enum: ['hardwood', 'engineered', 'laminate', 'vinyl', 'carpet'],
            default: 'laminate'
          },
          materialPrice: { type: 'number', description: 'Price per box. Defaults: hardwood=$169.98, engineered=$139.98, laminate=$59.98, vinyl=$99.98, carpet=$329.98', default: null },
          wasteFactor: { type: 'number', description: 'Waste factor percentage (typically 10%)', default: 10 }
        },
        required: ['area']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_tile',
      description: 'Calculate tile materials including tiles, mortar, grout, and supplies',
      parameters: {
        type: 'object',
        properties: {
          area: { type: 'number', description: 'Tile area in square feet' },
          tileSize: { type: 'number', description: 'Tile size in inches (e.g., 12 for 12x12)', default: 12 },
          tilePrice: { type: 'number', description: 'Price per box of tiles (default: $35)', default: 35 },
          pattern: {
            type: 'string',
            description: 'Tile pattern affects waste',
            enum: ['straight', 'diagonal', 'herringbone'],
            default: 'straight'
          }
        },
        required: ['area']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_paint',
      description: 'Calculate paint materials for interior/exterior painting',
      parameters: {
        type: 'object',
        properties: {
          area: { type: 'number', description: 'Wall area in square feet' },
          paintType: {
            type: 'string',
            description: 'Type of paint',
            enum: ['interior', 'exterior'],
            default: 'interior'
          },
          quality: {
            type: 'string',
            description: 'Paint quality level',
            enum: ['economy', 'standard', 'premium'],
            default: 'standard'
          },
          coats: { type: 'number', description: 'Number of coats (typically 2)', default: 2 },
          includePrimer: { type: 'boolean', description: 'Include primer coat', default: true }
        },
        required: ['area']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_drywall',
      description: 'Calculate drywall materials including sheets, mud, tape, and screws',
      parameters: {
        type: 'object',
        properties: {
          area: { type: 'number', description: 'Wall area in square feet' },
          sheetSize: {
            type: 'string',
            description: 'Drywall sheet thickness',
            enum: ['1/2', '5/8'],
            default: '1/2'
          },
          includeCeiling: { type: 'boolean', description: 'Include ceiling installation (requires more material)', default: false }
        },
        required: ['area']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_framing',
      description: 'Calculate framing lumber for walls and structures',
      parameters: {
        type: 'object',
        properties: {
          linearFeet: { type: 'number', description: 'Linear feet of wall' },
          height: { type: 'number', description: 'Wall height in feet (typically 8)', default: 8 },
          studSpacing: { type: 'number', description: 'Stud spacing in inches (typically 16)', default: 16 },
          lumberType: {
            type: 'string',
            description: 'Type of lumber',
            enum: ['2x4', '2x6'],
            default: '2x4'
          }
        },
        required: ['linearFeet']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_siding',
      description: 'Calculate siding materials for exterior walls',
      parameters: {
        type: 'object',
        properties: {
          area: { type: 'number', description: 'Wall area in square feet' },
          sidingType: {
            type: 'string',
            description: 'Type of siding',
            enum: ['vinyl', 'fiber-cement', 'wood', 'metal'],
            default: 'vinyl'
          },
          wasteFactor: { type: 'number', description: 'Waste factor percentage (typically 10%)', default: 10 }
        },
        required: ['area']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_foundation',
      description: 'Calculate foundation materials including concrete, rebar, and forms',
      parameters: {
        type: 'object',
        properties: {
          linearFeet: { type: 'number', description: 'Linear feet of foundation' },
          depth: { type: 'number', description: 'Foundation depth in inches (typically 8-12)', default: 8 },
          width: { type: 'number', description: 'Foundation width in inches (typically 12-16)', default: 12 },
          includeRebar: { type: 'boolean', description: 'Include rebar reinforcement', default: true }
        },
        required: ['linearFeet']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_excavation',
      description: 'Calculate excavation for foundations, pools, etc.',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: 'Length in feet' },
          width: { type: 'number', description: 'Width in feet' },
          depth: { type: 'number', description: 'Depth in feet' },
          soilType: {
            type: 'string',
            description: 'Type of soil affects pricing',
            enum: ['light', 'medium', 'heavy'],
            default: 'medium'
          }
        },
        required: ['length', 'width', 'depth']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_electrical',
      description: 'Calculate electrical materials and fixtures',
      parameters: {
        type: 'object',
        properties: {
          outlets: { type: 'number', description: 'Number of outlets', default: 0 },
          switches: { type: 'number', description: 'Number of switches', default: 0 },
          fixtures: { type: 'number', description: 'Number of light fixtures', default: 0 },
          wireRuns: { type: 'number', description: 'Linear feet of wire needed', default: 0 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_plumbing',
      description: 'Calculate plumbing fixtures and piping',
      parameters: {
        type: 'object',
        properties: {
          fixtures: { type: 'number', description: 'Number of fixtures (sinks, toilets, etc.)', default: 0 },
          pipeLength: { type: 'number', description: 'Linear feet of pipe', default: 0 },
          pipeType: {
            type: 'string',
            description: 'Type of pipe',
            enum: ['pex', 'copper', 'pvc'],
            default: 'pex'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_hvac',
      description: 'Calculate HVAC system sizing and ductwork',
      parameters: {
        type: 'object',
        properties: {
          sqFootage: { type: 'number', description: 'Building square footage' },
          systemType: {
            type: 'string',
            description: 'Type of HVAC system',
            enum: ['central-air', 'heat-pump', 'mini-split'],
            default: 'central-air'
          },
          ductworkLinearFeet: { type: 'number', description: 'Linear feet of ductwork', default: 0 }
        },
        required: ['sqFootage']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_doors_windows',
      description: 'Calculate doors and windows materials',
      parameters: {
        type: 'object',
        properties: {
          doors: { type: 'number', description: 'Number of doors', default: 0 },
          windows: { type: 'number', description: 'Number of windows', default: 0 },
          doorType: {
            type: 'string',
            description: 'Type of door',
            enum: ['interior', 'exterior', 'sliding'],
            default: 'interior'
          },
          windowType: {
            type: 'string',
            description: 'Type of window',
            enum: ['single-hung', 'double-hung', 'casement'],
            default: 'double-hung'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_gutters',
      description: 'Calculate gutter materials including gutters, downspouts, and guards',
      parameters: {
        type: 'object',
        properties: {
          linearFeet: { type: 'number', description: 'Linear feet of gutters' },
          material: {
            type: 'string',
            description: 'Gutter material',
            enum: ['aluminum', 'vinyl', 'copper'],
            default: 'aluminum'
          },
          downspouts: { type: 'number', description: 'Number of downspouts', default: 4 },
          includeGuards: { type: 'boolean', description: 'Include gutter guards', default: false }
        },
        required: ['linearFeet']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_fencing',
      description: 'Calculate fencing materials including posts, panels, and gates',
      parameters: {
        type: 'object',
        properties: {
          linearFeet: { type: 'number', description: 'Linear feet of fence' },
          height: { type: 'number', description: 'Fence height in feet (typically 6)', default: 6 },
          material: {
            type: 'string',
            description: 'Fence material',
            enum: ['wood', 'vinyl', 'chain-link', 'aluminum'],
            default: 'wood'
          },
          gates: { type: 'number', description: 'Number of gates', default: 1 }
        },
        required: ['linearFeet']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_pavers',
      description: 'Calculate paver materials including pavers, base, and sand',
      parameters: {
        type: 'object',
        properties: {
          area: { type: 'number', description: 'Paver area in square feet' },
          paverSize: { type: 'number', description: 'Paver size in inches (e.g., 12 for 12x12)', default: 12 },
          paverPrice: { type: 'number', description: 'Price per paver (default: $2.50)', default: 2.5 },
          includeBase: { type: 'boolean', description: 'Include gravel base', default: true }
        },
        required: ['area']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_veneer',
      description: 'Calculate stone/brick veneer materials',
      parameters: {
        type: 'object',
        properties: {
          area: { type: 'number', description: 'Wall area in square feet' },
          veneerType: {
            type: 'string',
            description: 'Type of veneer',
            enum: ['stone', 'brick', 'cultured-stone'],
            default: 'stone'
          },
          includeMortar: { type: 'boolean', description: 'Include mortar materials', default: true }
        },
        required: ['area']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_retaining_wall',
      description: 'Calculate retaining wall materials',
      parameters: {
        type: 'object',
        properties: {
          linearFeet: { type: 'number', description: 'Linear feet of wall' },
          height: { type: 'number', description: 'Wall height in feet' },
          blockType: {
            type: 'string',
            description: 'Type of block',
            enum: ['standard', 'decorative', 'timber'],
            default: 'standard'
          }
        },
        required: ['linearFeet', 'height']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_junk_removal',
      description: 'Calculate junk removal cost by volume or weight',
      parameters: {
        type: 'object',
        properties: {
          volume: { type: 'number', description: 'Volume in cubic yards', default: 0 },
          estimatedWeight: {
            type: 'string',
            description: 'Estimated weight category',
            enum: ['light', 'medium', 'heavy'],
            default: 'medium'
          }
        }
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, currentEstimate } = await req.json();

    // Get user ID from authorization header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      if (user && !error) {
        userId = user.id;
      }
    }

    // Fetch user's custom materials for fence calculator if user is authenticated
    let customFenceMaterials: any[] = [];
    if (userId) {
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Get fence calculator config
      const { data: config } = await supabaseClient
        .from('custom_calculator_configs')
        .select('id')
        .eq('user_id', userId)
        .eq('calculator_type', 'fence')
        .single();

      if (config) {
        // Fetch custom materials
        const { data: materials } = await supabaseClient
          .from('custom_materials')
          .select('*')
          .eq('config_id', config.id)
          .eq('is_archived', false);

        customFenceMaterials = materials || [];
      }
    }

    // Helper function to get custom price or default
    const getCustomPrice = (materialName: string, defaultPrice: number, category?: string): number => {
      if (customFenceMaterials.length === 0) return defaultPrice;

      const material = customFenceMaterials.find((m: any) =>
        m.name.toLowerCase() === materialName.toLowerCase() &&
        (!category || m.category === category)
      );

      return material ? material.price : defaultPrice;
    };

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m: Message) => ({
            role: m.role === 'system' ? 'system' : m.role,
            content: m.content
          }))
        ],
        tools,
        tool_choice: 'auto'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let updatedEstimate = [...(currentEstimate || [])];
    let assistantMessage = '';

    // Helper function to check for duplicate items
    const isDuplicate = (newItem: EstimateLineItem) => {
      return updatedEstimate.some(item =>
        item.name === newItem.name &&
        item.quantity === newItem.quantity &&
        item.unitPrice === newItem.unitPrice
      );
    };

    // Process OpenAI response
    const choice = data.choices?.[0];
    if (choice) {
      if (choice.message?.content) {
        assistantMessage = choice.message.content;
      }

      // Process tool calls
      if (choice.message?.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolInput = JSON.parse(toolCall.function.arguments);

          if (toolName === 'clear_estimate') {
            // Clear all items from the estimate
            updatedEstimate = [];
          } else if (toolName === 'add_custom_line_item') {
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
            if (!isDuplicate(newItem)) {
              updatedEstimate.push(newItem);
            }
          } else if (toolName === 'calculate_roofing_materials') {
            const {
              roofAreaSqFt,
              materialType = 'asphalt',
              shinglePricePerSquare = null,
              wasteFactor = 10,
              includeIceShield = true,
              includeTearOff = false,
              skylights = 0
            } = toolInput;

            // Default material pricing per square (100 sqft)
            const materialPrices: Record<string, number> = {
              asphalt: 350,
              architectural: 475,
              metal: 850,
              tile: 625,
              composite: 425
            };

            // Calculate squares with waste factor
            const baseSquares = roofAreaSqFt / 100;
            const wasteMultiplier = 1 + (wasteFactor / 100);
            const squares = baseSquares * wasteMultiplier;

            // 1. Roofing Material
            const pricePerSquare = shinglePricePerSquare || materialPrices[materialType] || 350;
            const shingleItem = {
              id: crypto.randomUUID(),
              name: `${materialType.charAt(0).toUpperCase() + materialType.slice(1)} Shingles (with ${wasteFactor}% waste)`,
              quantity: parseFloat(squares.toFixed(2)),
              unit: 'squares',
              unitPrice: pricePerSquare,
              totalPrice: parseFloat((squares * pricePerSquare).toFixed(2)),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(shingleItem)) {
              updatedEstimate.push(shingleItem);
            }

            // 2. Underlayment
            const underlaymentItem = {
              id: crypto.randomUUID(),
              name: 'Underlayment',
              quantity: parseFloat(squares.toFixed(2)),
              unit: 'squares',
              unitPrice: 26,
              totalPrice: parseFloat((squares * 26).toFixed(2)),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(underlaymentItem)) {
              updatedEstimate.push(underlaymentItem);
            }

            // 3. Ice & Water Shield
            if (includeIceShield) {
              const rolls = Math.ceil(roofAreaSqFt / 200); // 200 sqft per roll
              const iceShieldItem = {
                id: crypto.randomUUID(),
                name: 'Ice & Water Shield',
                quantity: rolls,
                unit: 'rolls',
                unitPrice: 70,
                totalPrice: rolls * 70,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(iceShieldItem)) {
                updatedEstimate.push(iceShieldItem);
              }
            }

            // 4. Ridge Cap
            const ridgeFeet = roofAreaSqFt * 0.1;
            const ridgeCapItem = {
              id: crypto.randomUUID(),
              name: 'Ridge Cap',
              quantity: parseFloat(ridgeFeet.toFixed(2)),
              unit: 'linear feet',
              unitPrice: 3.25,
              totalPrice: parseFloat((ridgeFeet * 3.25).toFixed(2)),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(ridgeCapItem)) {
              updatedEstimate.push(ridgeCapItem);
            }

            // 5. Drip Edge
            const dripEdgeFeet = Math.sqrt(roofAreaSqFt) * 4;
            const dripEdgeItem = {
              id: crypto.randomUUID(),
              name: 'Drip Edge',
              quantity: parseFloat(dripEdgeFeet.toFixed(2)),
              unit: 'linear feet',
              unitPrice: 2.5,
              totalPrice: parseFloat((dripEdgeFeet * 2.5).toFixed(2)),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(dripEdgeItem)) {
              updatedEstimate.push(dripEdgeItem);
            }

            // 6. Nails & Fasteners
            const nailsItem = {
              id: crypto.randomUUID(),
              name: 'Nails & Fasteners',
              quantity: parseFloat(squares.toFixed(2)),
              unit: 'squares',
              unitPrice: 32,
              totalPrice: parseFloat((squares * 32).toFixed(2)),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(nailsItem)) {
              updatedEstimate.push(nailsItem);
            }

            // 7. Debris Disposal (if tear-off)
            if (includeTearOff) {
              const debrisItem = {
                id: crypto.randomUUID(),
                name: 'Debris Disposal',
                quantity: parseFloat(squares.toFixed(2)),
                unit: 'squares',
                unitPrice: 32,
                totalPrice: parseFloat((squares * 32).toFixed(2)),
                type: 'fee' as const,
                isCustom: false
              };
              if (!isDuplicate(debrisItem)) {
                updatedEstimate.push(debrisItem);
              }
            }

            // 8. Skylight Flashing
            if (skylights > 0) {
              const skylightItem = {
                id: crypto.randomUUID(),
                name: 'Skylight Flashing',
                quantity: skylights,
                unit: skylights > 1 ? 'skylights' : 'skylight',
                unitPrice: 85,
                totalPrice: skylights * 85,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(skylightItem)) {
                updatedEstimate.push(skylightItem);
              }
            }
          } else if (toolName === 'calculate_deck_materials') {
            const { length, width, deckingType } = toolInput;
            const area = length * width;
            const boardsNeeded = Math.ceil(area / 25);

            const prices: Record<string, number> = {
              'trex-transcend': 136,
              'trex-select': 90,
              '5/4-deck': 28,
              '2x6-pt': 23
            };

            const pricePerBoard = prices[deckingType] || 28;

            const newItem = {
              id: crypto.randomUUID(),
              name: `${deckingType} Decking (20ft)`,
              quantity: boardsNeeded,
              unit: 'boards',
              unitPrice: pricePerBoard,
              totalPrice: boardsNeeded * pricePerBoard,
              type: 'material' as const,
              isCustom: false
            };

            if (!isDuplicate(newItem)) {
              updatedEstimate.push(newItem);
            }
          } else if (toolName === 'calculate_concrete') {
            const {
              length,
              width,
              depth,
              includeColoring = false,
              includeFiber = false,
              includeMesh = false,
              concretePrice = 185
            } = toolInput;

            // Calculate cubic yards: (L × W × (depth/12)) / 27
            const cubicFeet = length * width * (depth / 12);
            const cubicYards = cubicFeet / 27;
            const roundedCubicYards = Math.ceil(cubicYards * 100) / 100; // Round to 2 decimals

            // Concrete base
            const concreteItem = {
              id: crypto.randomUUID(),
              name: 'Concrete',
              quantity: roundedCubicYards,
              unit: 'cubic yard',
              unitPrice: concretePrice,
              totalPrice: roundedCubicYards * concretePrice,
              type: 'material' as const,
              isCustom: false
            };

            if (!isDuplicate(concreteItem)) {
              updatedEstimate.push(concreteItem);
            }

            // Add coloring if requested
            if (includeColoring) {
              const coloringItem = {
                id: crypto.randomUUID(),
                name: 'Concrete Coloring',
                quantity: roundedCubicYards,
                unit: 'cubic yard',
                unitPrice: 8,
                totalPrice: roundedCubicYards * 8,
                type: 'material' as const,
                isCustom: false
              };

              if (!isDuplicate(coloringItem)) {
                updatedEstimate.push(coloringItem);
              }
            }

            // Add fiber if requested
            if (includeFiber) {
              const fiberItem = {
                id: crypto.randomUUID(),
                name: 'Fiber Reinforcement',
                quantity: roundedCubicYards,
                unit: 'cubic yard',
                unitPrice: 15,
                totalPrice: roundedCubicYards * 15,
                type: 'material' as const,
                isCustom: false
              };

              if (!isDuplicate(fiberItem)) {
                updatedEstimate.push(fiberItem);
              }
            }

            // Add wire mesh if requested
            if (includeMesh) {
              const area = length * width;
              const sheetsNeeded = Math.ceil(area / 100); // 100 sqft per sheet
              const meshPrice = 12.98;

              const meshItem = {
                id: crypto.randomUUID(),
                name: '6x6 Wire Mesh',
                quantity: sheetsNeeded,
                unit: 'sheets',
                unitPrice: meshPrice,
                totalPrice: sheetsNeeded * meshPrice,
                type: 'material' as const,
                isCustom: false
              };

              if (!isDuplicate(meshItem)) {
                updatedEstimate.push(meshItem);
              }
            }
          } else if (toolName === 'calculate_flooring') {
            const {
              area,
              materialType = 'laminate',
              materialPrice = null,
              wasteFactor = 10
            } = toolInput;

            const materialPrices: Record<string, number> = {
              hardwood: 169.98,
              engineered: 139.98,
              laminate: 59.98,
              vinyl: 99.98,
              carpet: 329.98
            };

            const sqftPerBox: Record<string, number> = {
              hardwood: 20,
              engineered: 20,
              laminate: 20,
              vinyl: 24,
              carpet: 12
            };

            const wasteMultiplier = 1 + (wasteFactor / 100);
            const adjustedArea = area * wasteMultiplier;
            const boxSize = sqftPerBox[materialType] || 20;
            const boxes = Math.ceil(adjustedArea / boxSize);
            const pricePerBox = materialPrice || materialPrices[materialType] || 59.98;

            const flooringItem = {
              id: crypto.randomUUID(),
              name: `${materialType.charAt(0).toUpperCase() + materialType.slice(1)} Flooring`,
              quantity: boxes,
              unit: 'boxes',
              unitPrice: pricePerBox,
              totalPrice: boxes * pricePerBox,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(flooringItem)) updatedEstimate.push(flooringItem);

            // Underlayment
            const underlaymentRolls = Math.ceil(area / 100);
            const underlaymentItem = {
              id: crypto.randomUUID(),
              name: 'Underlayment',
              quantity: underlaymentRolls,
              unit: 'rolls',
              unitPrice: 29.98,
              totalPrice: underlaymentRolls * 29.98,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(underlaymentItem)) updatedEstimate.push(underlaymentItem);

            // Installation supplies (molding, adhesive, etc.)
            const suppliesItem = {
              id: crypto.randomUUID(),
              name: 'Installation Supplies',
              quantity: 1,
              unit: 'set',
              unitPrice: Math.ceil(area * 0.50),
              totalPrice: Math.ceil(area * 0.50),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(suppliesItem)) updatedEstimate.push(suppliesItem);

          } else if (toolName === 'calculate_tile') {
            const {
              area,
              tileSize = 12,
              tilePrice = 35,
              pattern = 'straight'
            } = toolInput;

            const wasteFactors: Record<string, number> = {
              straight: 10,
              diagonal: 15,
              herringbone: 20
            };

            const wasteFactor = wasteFactors[pattern] || 10;
            const wasteMultiplier = 1 + (wasteFactor / 100);
            const adjustedArea = area * wasteMultiplier;
            const tileSqft = (tileSize * tileSize) / 144;
            const tilesNeeded = Math.ceil(adjustedArea / tileSqft);
            const tilesPerBox = Math.floor(10 / tileSqft);
            const boxes = Math.ceil(tilesNeeded / tilesPerBox);

            const tileItem = {
              id: crypto.randomUUID(),
              name: `${tileSize}x${tileSize} Tiles (${pattern} pattern)`,
              quantity: boxes,
              unit: 'boxes',
              unitPrice: tilePrice,
              totalPrice: boxes * tilePrice,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(tileItem)) updatedEstimate.push(tileItem);

            // Mortar
            const mortarBags = Math.ceil(area / 50);
            const mortarItem = {
              id: crypto.randomUUID(),
              name: 'Thinset Mortar',
              quantity: mortarBags,
              unit: 'bags',
              unitPrice: 22.98,
              totalPrice: mortarBags * 22.98,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(mortarItem)) updatedEstimate.push(mortarItem);

            // Grout
            const groutBags = Math.ceil(area / 60);
            const groutItem = {
              id: crypto.randomUUID(),
              name: 'Grout',
              quantity: groutBags,
              unit: 'bags',
              unitPrice: 18.98,
              totalPrice: groutBags * 18.98,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(groutItem)) updatedEstimate.push(groutItem);

          } else if (toolName === 'calculate_paint') {
            const {
              area,
              paintType = 'interior',
              quality = 'standard',
              coats = 2,
              includePrimer = true
            } = toolInput;

            const paintPrices: Record<string, Record<string, number>> = {
              interior: { economy: 28.98, standard: 38.98, premium: 58.98 },
              exterior: { economy: 35.98, standard: 48.98, premium: 68.98 }
            };

            const coverage = paintType === 'interior' ? 400 : 350;
            const gallonsNeeded = Math.ceil((area * coats) / coverage);
            const pricePerGallon = paintPrices[paintType][quality] || 38.98;

            const paintItem = {
              id: crypto.randomUUID(),
              name: `${quality.charAt(0).toUpperCase() + quality.slice(1)} ${paintType.charAt(0).toUpperCase() + paintType.slice(1)} Paint (${coats} coats)`,
              quantity: gallonsNeeded,
              unit: 'gallons',
              unitPrice: pricePerGallon,
              totalPrice: gallonsNeeded * pricePerGallon,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(paintItem)) updatedEstimate.push(paintItem);

            if (includePrimer) {
              const primerGallons = Math.ceil(area / coverage);
              const primerItem = {
                id: crypto.randomUUID(),
                name: 'Primer',
                quantity: primerGallons,
                unit: 'gallons',
                unitPrice: 32.98,
                totalPrice: primerGallons * 32.98,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(primerItem)) updatedEstimate.push(primerItem);
            }

            // Painting supplies
            const suppliesItem = {
              id: crypto.randomUUID(),
              name: 'Painting Supplies (brushes, rollers, tape)',
              quantity: 1,
              unit: 'set',
              unitPrice: 45,
              totalPrice: 45,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(suppliesItem)) updatedEstimate.push(suppliesItem);

          } else if (toolName === 'calculate_drywall') {
            const {
              area,
              sheetSize = '1/2',
              includeCeiling = false
            } = toolInput;

            const sheetPrices: Record<string, number> = {
              '1/2': 15.98,
              '5/8': 17.98
            };

            const sheetSqft = 32; // 4x8 sheet = 32 sqft
            const multiplier = includeCeiling ? 1.2 : 1.0;
            const adjustedArea = area * multiplier;
            const sheets = Math.ceil(adjustedArea / sheetSqft);

            const drywallItem = {
              id: crypto.randomUUID(),
              name: `${sheetSize}" Drywall Sheets`,
              quantity: sheets,
              unit: 'sheets',
              unitPrice: sheetPrices[sheetSize] || 15.98,
              totalPrice: sheets * (sheetPrices[sheetSize] || 15.98),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(drywallItem)) updatedEstimate.push(drywallItem);

            // Joint compound
            const mudBuckets = Math.ceil(sheets / 8);
            const mudItem = {
              id: crypto.randomUUID(),
              name: 'Joint Compound (Mud)',
              quantity: mudBuckets,
              unit: 'buckets',
              unitPrice: 19.98,
              totalPrice: mudBuckets * 19.98,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(mudItem)) updatedEstimate.push(mudItem);

            // Tape
            const tapeRolls = Math.ceil(sheets / 10);
            const tapeItem = {
              id: crypto.randomUUID(),
              name: 'Paper Tape',
              quantity: tapeRolls,
              unit: 'rolls',
              unitPrice: 4.98,
              totalPrice: tapeRolls * 4.98,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(tapeItem)) updatedEstimate.push(tapeItem);

            // Screws
            const screwBoxes = Math.ceil(sheets / 15);
            const screwItem = {
              id: crypto.randomUUID(),
              name: 'Drywall Screws',
              quantity: screwBoxes,
              unit: 'boxes',
              unitPrice: 8.98,
              totalPrice: screwBoxes * 8.98,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(screwItem)) updatedEstimate.push(screwItem);

          } else if (toolName === 'calculate_framing') {
            const {
              linearFeet,
              height = 8,
              studSpacing = 16,
              lumberType = '2x4'
            } = toolInput;

            const lumberPrices: Record<string, number> = {
              '2x4': 4.98,
              '2x6': 7.98
            };

            const studsNeeded = Math.ceil((linearFeet * 12) / studSpacing) + 2;
            const plates = Math.ceil(linearFeet / 8) * 2; // Top and bottom plates

            const studItem = {
              id: crypto.randomUUID(),
              name: `${lumberType} Studs (${height}ft)`,
              quantity: studsNeeded,
              unit: 'pieces',
              unitPrice: lumberPrices[lumberType] || 4.98,
              totalPrice: studsNeeded * (lumberPrices[lumberType] || 4.98),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(studItem)) updatedEstimate.push(studItem);

            const plateItem = {
              id: crypto.randomUUID(),
              name: `${lumberType} Plates (top & bottom)`,
              quantity: plates,
              unit: 'pieces',
              unitPrice: lumberPrices[lumberType] || 4.98,
              totalPrice: plates * (lumberPrices[lumberType] || 4.98),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(plateItem)) updatedEstimate.push(plateItem);

            // Nails/fasteners
            const nailBoxes = Math.ceil(studsNeeded / 50);
            const nailItem = {
              id: crypto.randomUUID(),
              name: 'Framing Nails',
              quantity: nailBoxes,
              unit: 'boxes',
              unitPrice: 12.98,
              totalPrice: nailBoxes * 12.98,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(nailItem)) updatedEstimate.push(nailItem);

          } else if (toolName === 'calculate_siding') {
            const {
              area,
              sidingType = 'vinyl',
              wasteFactor = 10
            } = toolInput;

            const sidingPrices: Record<string, number> = {
              vinyl: 3.50,
              'fiber-cement': 4.75,
              wood: 5.50,
              metal: 6.25
            };

            const wasteMultiplier = 1 + (wasteFactor / 100);
            const adjustedArea = area * wasteMultiplier;
            const squares = adjustedArea / 100;

            const sidingItem = {
              id: crypto.randomUUID(),
              name: `${sidingType.charAt(0).toUpperCase() + sidingType.slice(1)} Siding`,
              quantity: parseFloat(adjustedArea.toFixed(2)),
              unit: 'sqft',
              unitPrice: sidingPrices[sidingType] || 3.50,
              totalPrice: parseFloat((adjustedArea * (sidingPrices[sidingType] || 3.50)).toFixed(2)),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(sidingItem)) updatedEstimate.push(sidingItem);

            // Trim and accessories
            const trimItem = {
              id: crypto.randomUUID(),
              name: 'Trim & Accessories',
              quantity: Math.ceil(squares),
              unit: 'squares',
              unitPrice: 45,
              totalPrice: Math.ceil(squares) * 45,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(trimItem)) updatedEstimate.push(trimItem);

          } else if (toolName === 'calculate_foundation') {
            const {
              linearFeet,
              depth = 8,
              width = 12,
              includeRebar = true
            } = toolInput;

            const cubicFeet = linearFeet * (width / 12) * (depth / 12);
            const cubicYards = cubicFeet / 27;

            const concreteItem = {
              id: crypto.randomUUID(),
              name: 'Foundation Concrete',
              quantity: parseFloat(cubicYards.toFixed(2)),
              unit: 'cubic yards',
              unitPrice: 185,
              totalPrice: parseFloat((cubicYards * 185).toFixed(2)),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(concreteItem)) updatedEstimate.push(concreteItem);

            if (includeRebar) {
              const rebarPieces = Math.ceil(linearFeet / 10) * 4;
              const rebarItem = {
                id: crypto.randomUUID(),
                name: '#4 Rebar (20ft)',
                quantity: rebarPieces,
                unit: 'pieces',
                unitPrice: 8.98,
                totalPrice: rebarPieces * 8.98,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(rebarItem)) updatedEstimate.push(rebarItem);
            }

            // Forms
            const formBoards = Math.ceil(linearFeet / 8) * 2;
            const formItem = {
              id: crypto.randomUUID(),
              name: 'Form Boards',
              quantity: formBoards,
              unit: 'boards',
              unitPrice: 6.98,
              totalPrice: formBoards * 6.98,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(formItem)) updatedEstimate.push(formItem);

          } else if (toolName === 'calculate_excavation') {
            const {
              length,
              width,
              depth,
              soilType = 'medium'
            } = toolInput;

            const cubicFeet = length * width * depth;
            const cubicYards = cubicFeet / 27;

            const soilPrices: Record<string, number> = {
              light: 45,
              medium: 65,
              heavy: 85
            };

            const excavationItem = {
              id: crypto.randomUUID(),
              name: `Excavation (${soilType} soil)`,
              quantity: parseFloat(cubicYards.toFixed(2)),
              unit: 'cubic yards',
              unitPrice: soilPrices[soilType] || 65,
              totalPrice: parseFloat((cubicYards * (soilPrices[soilType] || 65)).toFixed(2)),
              type: 'labor' as const,
              isCustom: false
            };
            if (!isDuplicate(excavationItem)) updatedEstimate.push(excavationItem);

            // Haul away
            const haulItem = {
              id: crypto.randomUUID(),
              name: 'Soil Haul Away',
              quantity: parseFloat(cubicYards.toFixed(2)),
              unit: 'cubic yards',
              unitPrice: 25,
              totalPrice: parseFloat((cubicYards * 25).toFixed(2)),
              type: 'fee' as const,
              isCustom: false
            };
            if (!isDuplicate(haulItem)) updatedEstimate.push(haulItem);

          } else if (toolName === 'calculate_electrical') {
            const {
              outlets = 0,
              switches = 0,
              fixtures = 0,
              wireRuns = 0
            } = toolInput;

            if (outlets > 0) {
              const outletItem = {
                id: crypto.randomUUID(),
                name: 'Electrical Outlets',
                quantity: outlets,
                unit: 'outlets',
                unitPrice: 35,
                totalPrice: outlets * 35,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(outletItem)) updatedEstimate.push(outletItem);
            }

            if (switches > 0) {
              const switchItem = {
                id: crypto.randomUUID(),
                name: 'Electrical Switches',
                quantity: switches,
                unit: 'switches',
                unitPrice: 28,
                totalPrice: switches * 28,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(switchItem)) updatedEstimate.push(switchItem);
            }

            if (fixtures > 0) {
              const fixtureItem = {
                id: crypto.randomUUID(),
                name: 'Light Fixtures (standard)',
                quantity: fixtures,
                unit: 'fixtures',
                unitPrice: 85,
                totalPrice: fixtures * 85,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(fixtureItem)) updatedEstimate.push(fixtureItem);
            }

            if (wireRuns > 0) {
              const wireRolls = Math.ceil(wireRuns / 250);
              const wireItem = {
                id: crypto.randomUUID(),
                name: '12/2 Romex Wire (250ft rolls)',
                quantity: wireRolls,
                unit: 'rolls',
                unitPrice: 89.98,
                totalPrice: wireRolls * 89.98,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(wireItem)) updatedEstimate.push(wireItem);
            }

          } else if (toolName === 'calculate_plumbing') {
            const {
              fixtures = 0,
              pipeLength = 0,
              pipeType = 'pex'
            } = toolInput;

            const pipePrices: Record<string, number> = {
              pex: 0.89,
              copper: 3.25,
              pvc: 0.65
            };

            if (fixtures > 0) {
              const fixtureItem = {
                id: crypto.randomUUID(),
                name: 'Plumbing Fixtures (standard)',
                quantity: fixtures,
                unit: 'fixtures',
                unitPrice: 250,
                totalPrice: fixtures * 250,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(fixtureItem)) updatedEstimate.push(fixtureItem);
            }

            if (pipeLength > 0) {
              const pipeItem = {
                id: crypto.randomUUID(),
                name: `${pipeType.toUpperCase()} Pipe`,
                quantity: pipeLength,
                unit: 'linear feet',
                unitPrice: pipePrices[pipeType] || 0.89,
                totalPrice: parseFloat((pipeLength * (pipePrices[pipeType] || 0.89)).toFixed(2)),
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(pipeItem)) updatedEstimate.push(pipeItem);

              // Fittings
              const fittings = Math.ceil(pipeLength / 20);
              const fittingItem = {
                id: crypto.randomUUID(),
                name: 'Pipe Fittings & Connectors',
                quantity: fittings,
                unit: 'sets',
                unitPrice: 12.50,
                totalPrice: fittings * 12.50,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(fittingItem)) updatedEstimate.push(fittingItem);
            }

          } else if (toolName === 'calculate_hvac') {
            const {
              sqFootage,
              systemType = 'central-air',
              ductworkLinearFeet = 0
            } = toolInput;

            const systemPrices: Record<string, number> = {
              'central-air': 4500,
              'heat-pump': 6500,
              'mini-split': 3200
            };

            const tons = Math.ceil(sqFootage / 600);
            const systemPrice = systemPrices[systemType] || 4500;
            const totalSystemPrice = systemPrice + (tons - 2) * 800;

            const hvacItem = {
              id: crypto.randomUUID(),
              name: `${tons}-Ton ${systemType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} System`,
              quantity: 1,
              unit: 'system',
              unitPrice: totalSystemPrice,
              totalPrice: totalSystemPrice,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(hvacItem)) updatedEstimate.push(hvacItem);

            if (ductworkLinearFeet > 0) {
              const ductItem = {
                id: crypto.randomUUID(),
                name: 'Ductwork',
                quantity: ductworkLinearFeet,
                unit: 'linear feet',
                unitPrice: 12.50,
                totalPrice: ductworkLinearFeet * 12.50,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(ductItem)) updatedEstimate.push(ductItem);
            }

          } else if (toolName === 'calculate_doors_windows') {
            const {
              doors = 0,
              windows = 0,
              doorType = 'interior',
              windowType = 'double-hung'
            } = toolInput;

            const doorPrices: Record<string, number> = {
              interior: 185,
              exterior: 450,
              sliding: 650
            };

            const windowPrices: Record<string, number> = {
              'single-hung': 250,
              'double-hung': 325,
              'casement': 375
            };

            if (doors > 0) {
              const doorItem = {
                id: crypto.randomUUID(),
                name: `${doorType.charAt(0).toUpperCase() + doorType.slice(1)} Doors`,
                quantity: doors,
                unit: 'doors',
                unitPrice: doorPrices[doorType] || 185,
                totalPrice: doors * (doorPrices[doorType] || 185),
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(doorItem)) updatedEstimate.push(doorItem);

              // Door hardware
              const hardwareItem = {
                id: crypto.randomUUID(),
                name: 'Door Hardware & Hinges',
                quantity: doors,
                unit: 'sets',
                unitPrice: 45,
                totalPrice: doors * 45,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(hardwareItem)) updatedEstimate.push(hardwareItem);
            }

            if (windows > 0) {
              const windowItem = {
                id: crypto.randomUUID(),
                name: `${windowType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Windows`,
                quantity: windows,
                unit: 'windows',
                unitPrice: windowPrices[windowType] || 325,
                totalPrice: windows * (windowPrices[windowType] || 325),
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(windowItem)) updatedEstimate.push(windowItem);
            }

          } else if (toolName === 'calculate_gutters') {
            const {
              linearFeet,
              material = 'aluminum',
              downspouts = 4,
              includeGuards = false
            } = toolInput;

            const gutterPrices: Record<string, number> = {
              aluminum: 8.50,
              vinyl: 6.25,
              copper: 25.00
            };

            const gutterItem = {
              id: crypto.randomUUID(),
              name: `${material.charAt(0).toUpperCase() + material.slice(1)} Gutters`,
              quantity: linearFeet,
              unit: 'linear feet',
              unitPrice: gutterPrices[material] || 8.50,
              totalPrice: linearFeet * (gutterPrices[material] || 8.50),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(gutterItem)) updatedEstimate.push(gutterItem);

            const downspoutItem = {
              id: crypto.randomUUID(),
              name: 'Downspouts (10ft)',
              quantity: downspouts,
              unit: 'pieces',
              unitPrice: 25,
              totalPrice: downspouts * 25,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(downspoutItem)) updatedEstimate.push(downspoutItem);

            if (includeGuards) {
              const guardItem = {
                id: crypto.randomUUID(),
                name: 'Gutter Guards',
                quantity: linearFeet,
                unit: 'linear feet',
                unitPrice: 4.50,
                totalPrice: linearFeet * 4.50,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(guardItem)) updatedEstimate.push(guardItem);
            }

          } else if (toolName === 'calculate_fencing') {
            const {
              linearFeet,
              height = 6,
              fenceType = 'privacy',
              material = 'wood',
              postMaterial = 'wood',
              postSpacing = 8,
              includePostCaps = true,
              includeKickboard = false,
              postMountType = 'concrete',
              concreteDepth = 24,
              gates = 0,
              gateType = 'single',
              includeGateHardware = true
            } = toolInput;

            // Post material pricing - using custom pricing if available
            const postMaterialPrices: Record<string, number> = {
              wood: getCustomPrice('Wood Post', 24.98, 'posts'),
              'vinyl-5x5': getCustomPrice('Vinyl 5x5 Post', 42.00, 'posts'),
              'vinyl-4x4': getCustomPrice('Vinyl 4x4 Post', 27.00, 'posts'),
              metal: getCustomPrice('Metal Post', 42.00, 'posts')
            };

            // Material pricing by fence type - using custom pricing if available
            const materialPrices: Record<string, any> = {
              privacy: {
                wood: {
                  panel: getCustomPrice('Privacy Fence - Wood Panel', 45.98, 'panels'),
                  rail: 12.98,
                  cap: 4.98
                },
                vinyl: {
                  panel: getCustomPrice('Privacy Fence - Vinyl Panel', 89.98, 'panels'),
                  rail: 19.98,
                  cap: 6.98
                },
                metal: {
                  panel: getCustomPrice('Privacy Fence - Metal Panel', 79.98, 'panels'),
                  rail: 16.98,
                  cap: 5.98
                },
                composite: {
                  panel: getCustomPrice('Privacy Fence - Composite Panel', 129.98, 'panels'),
                  rail: 24.98,
                  cap: 8.98
                }
              },
              picket: {
                wood: {
                  picket: getCustomPrice('Picket Fence - Wood Picket', 2.98, 'panels'),
                  rail: 9.98,
                  cap: 3.98
                },
                vinyl: {
                  picket: getCustomPrice('Picket Fence - Vinyl Picket', 4.98, 'panels'),
                  rail: 14.98,
                  cap: 5.98
                },
                metal: {
                  picket: getCustomPrice('Picket Fence - Metal Picket', 3.98, 'panels'),
                  rail: 12.98,
                  cap: 4.98
                },
                composite: {
                  picket: getCustomPrice('Picket Fence - Composite Picket', 6.98, 'panels'),
                  rail: 19.98,
                  cap: 7.98
                }
              },
              'chain-link': {
                metal: {
                  fabric: getCustomPrice('Chain-Link Fabric', 5.98, 'panels'),
                  rail: 8.98,
                  cap: 2.98
                }
              },
              ranch: {
                wood: {
                  rail: getCustomPrice('Ranch Rail - Wood', 14.98, 'panels'),
                  cap: 4.98
                },
                vinyl: {
                  rail: getCustomPrice('Ranch Rail - Vinyl', 24.98, 'panels'),
                  cap: 6.98
                }
              },
              panel: {
                wood: {
                  panel: getCustomPrice('Wood Panel (8ft)', 69.98, 'panels'),
                  cap: 4.98
                },
                vinyl: {
                  panel: getCustomPrice('Vinyl Panel (8ft)', 129.98, 'panels'),
                  cap: 6.98
                },
                composite: {
                  panel: getCustomPrice('Composite Panel (8ft)', 189.98, 'panels'),
                  cap: 8.98
                }
              }
            };

            const gatePrices: Record<string, any> = {
              single: {
                wood: getCustomPrice('Single Gate - Wood', 129.98, 'gates'),
                vinyl: getCustomPrice('Single Gate - Vinyl', 199.98, 'gates'),
                metal: getCustomPrice('Single Gate - Metal', 169.98, 'gates'),
                composite: getCustomPrice('Single Gate - Composite', 249.98, 'gates')
              },
              double: {
                wood: getCustomPrice('Double Gate - Wood', 249.98, 'gates'),
                vinyl: getCustomPrice('Double Gate - Vinyl', 399.98, 'gates'),
                metal: getCustomPrice('Double Gate - Metal', 329.98, 'gates'),
                composite: getCustomPrice('Double Gate - Composite', 499.98, 'gates')
              },
              rolling: {
                wood: getCustomPrice('Rolling Gate - Wood', 399.98, 'gates'),
                vinyl: getCustomPrice('Rolling Gate - Vinyl', 599.98, 'gates'),
                metal: getCustomPrice('Rolling Gate - Metal', 499.98, 'gates'),
                composite: getCustomPrice('Rolling Gate - Composite', 799.98, 'gates')
              }
            };

            const gateHardwarePrices: Record<string, number> = {
              single: getCustomPrice('Gate Hardware - Single', 49.98, 'components'),
              double: getCustomPrice('Gate Hardware - Double', 89.98, 'components'),
              rolling: getCustomPrice('Gate Hardware - Rolling', 149.98, 'components')
            };

            // Calculate posts
            const postCount = Math.ceil(linearFeet / postSpacing) + 1;
            const postPrice = postMaterialPrices[postMaterial] || 24.98;
            const postItem = {
              id: crypto.randomUUID(),
              name: `${postMaterial.charAt(0).toUpperCase() + postMaterial.slice(1).replace('-', ' ')} Posts (${height}ft)`,
              quantity: postCount,
              unit: 'posts',
              unitPrice: postPrice,
              totalPrice: postCount * postPrice,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(postItem)) updatedEstimate.push(postItem);

            // Post caps
            if (includePostCaps) {
              const capPrice = materialPrices[fenceType]?.[material]?.cap || 4.98;
              const capItem = {
                id: crypto.randomUUID(),
                name: 'Post Caps',
                quantity: postCount,
                unit: 'caps',
                unitPrice: capPrice,
                totalPrice: postCount * capPrice,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(capItem)) updatedEstimate.push(capItem);
            }

            // Post mounting
            if (postMountType === 'concrete') {
              const concretePerPost = (concreteDepth * 0.33) / 27; // cubic yards
              const totalConcreteBags = Math.ceil(concretePerPost * postCount * 4); // 60lb bags
              const concreteItem = {
                id: crypto.randomUUID(),
                name: 'Concrete Mix (60lb bags)',
                quantity: totalConcreteBags,
                unit: 'bags',
                unitPrice: 6.98,
                totalPrice: totalConcreteBags * 6.98,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(concreteItem)) updatedEstimate.push(concreteItem);
            } else if (postMountType === 'spike') {
              const spikeItem = {
                id: crypto.randomUUID(),
                name: 'Post Spikes',
                quantity: postCount,
                unit: 'spikes',
                unitPrice: 12.98,
                totalPrice: postCount * 12.98,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(spikeItem)) updatedEstimate.push(spikeItem);
            } else if (postMountType === 'bracket') {
              const bracketItem = {
                id: crypto.randomUUID(),
                name: 'Post Mounting Brackets',
                quantity: postCount,
                unit: 'brackets',
                unitPrice: 14.98,
                totalPrice: postCount * 14.98,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(bracketItem)) updatedEstimate.push(bracketItem);
            }

            // Fence materials
            if (fenceType === 'privacy' || fenceType === 'panel') {
              const panelPrice = materialPrices[fenceType]?.[material]?.panel || 45.98;
              const panelsNeeded = Math.ceil(linearFeet / 8);
              const panelItem = {
                id: crypto.randomUUID(),
                name: `${material.charAt(0).toUpperCase() + material.slice(1)} ${fenceType === 'privacy' ? 'Privacy' : 'Panel'} Fence Panels`,
                quantity: panelsNeeded,
                unit: 'panels',
                unitPrice: panelPrice,
                totalPrice: panelsNeeded * panelPrice,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(panelItem)) updatedEstimate.push(panelItem);
            } else if (fenceType === 'picket') {
              const picketPrice = materialPrices.picket?.[material]?.picket || 2.98;
              const picketsPerFoot = 2;
              const picketsNeeded = Math.ceil(linearFeet * picketsPerFoot);
              const picketItem = {
                id: crypto.randomUUID(),
                name: `${material.charAt(0).toUpperCase() + material.slice(1)} Pickets`,
                quantity: picketsNeeded,
                unit: 'pickets',
                unitPrice: picketPrice,
                totalPrice: picketsNeeded * picketPrice,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(picketItem)) updatedEstimate.push(picketItem);
            } else if (fenceType === 'chain-link') {
              const fabricPrice = materialPrices['chain-link']?.metal?.fabric || 5.98;
              const fabricNeeded = (linearFeet * height) / 9; // square yards
              const fabricItem = {
                id: crypto.randomUUID(),
                name: 'Chain-Link Fabric',
                quantity: parseFloat(fabricNeeded.toFixed(2)),
                unit: 'sq yards',
                unitPrice: fabricPrice,
                totalPrice: parseFloat((fabricNeeded * fabricPrice).toFixed(2)),
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(fabricItem)) updatedEstimate.push(fabricItem);
            }

            // Rails (except for panel type)
            if (fenceType !== 'panel') {
              const railsPerSection = fenceType === 'ranch' ? 3 : 2;
              const railPrice = materialPrices[fenceType]?.[material]?.rail || 12.98;
              const railsNeeded = Math.ceil(linearFeet / 8) * railsPerSection;
              const railItem = {
                id: crypto.randomUUID(),
                name: `${material.charAt(0).toUpperCase() + material.slice(1)} Rails`,
                quantity: railsNeeded,
                unit: 'rails',
                unitPrice: railPrice,
                totalPrice: railsNeeded * railPrice,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(railItem)) updatedEstimate.push(railItem);
            }

            // Kickboard
            if (includeKickboard) {
              const kickboardPieces = Math.ceil(linearFeet / 8);
              const kickboardItem = {
                id: crypto.randomUUID(),
                name: 'Kickboard',
                quantity: kickboardPieces,
                unit: 'pieces',
                unitPrice: 8.98,
                totalPrice: kickboardPieces * 8.98,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(kickboardItem)) updatedEstimate.push(kickboardItem);
            }

            // Gates
            if (gates > 0) {
              const gatePrice = gatePrices[gateType]?.[material] || 175;
              for (let i = 0; i < gates; i++) {
                const gateItem = {
                  id: crypto.randomUUID(),
                  name: `${gateType.charAt(0).toUpperCase() + gateType.slice(1)} Gate - ${material.charAt(0).toUpperCase() + material.slice(1)}`,
                  quantity: 1,
                  unit: 'gate',
                  unitPrice: gatePrice,
                  totalPrice: gatePrice,
                  type: 'material' as const,
                  isCustom: false
                };
                if (!isDuplicate(gateItem)) updatedEstimate.push(gateItem);

                if (includeGateHardware) {
                  const hardwarePrice = gateHardwarePrices[gateType] || 49.98;
                  const hardwareItem = {
                    id: crypto.randomUUID(),
                    name: `${gateType.charAt(0).toUpperCase() + gateType.slice(1)} Gate Hardware`,
                    quantity: 1,
                    unit: 'set',
                    unitPrice: hardwarePrice,
                    totalPrice: hardwarePrice,
                    type: 'material' as const,
                    isCustom: false
                  };
                  if (!isDuplicate(hardwareItem)) updatedEstimate.push(hardwareItem);
                }
              }
            }

          } else if (toolName === 'calculate_pavers') {
            const {
              area,
              paverSize = 12,
              paverPrice = 2.5,
              includeBase = true
            } = toolInput;

            const paverSqft = (paverSize * paverSize) / 144;
            const paversNeeded = Math.ceil(area / paverSqft) * 1.05; // 5% waste

            const paverItem = {
              id: crypto.randomUUID(),
              name: `${paverSize}x${paverSize} Pavers`,
              quantity: Math.ceil(paversNeeded),
              unit: 'pavers',
              unitPrice: paverPrice,
              totalPrice: Math.ceil(paversNeeded) * paverPrice,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(paverItem)) updatedEstimate.push(paverItem);

            if (includeBase) {
              const gravelTons = Math.ceil(area / 80);
              const gravelItem = {
                id: crypto.randomUUID(),
                name: 'Gravel Base',
                quantity: gravelTons,
                unit: 'tons',
                unitPrice: 45,
                totalPrice: gravelTons * 45,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(gravelItem)) updatedEstimate.push(gravelItem);

              const sandBags = Math.ceil(area / 50);
              const sandItem = {
                id: crypto.randomUUID(),
                name: 'Sand (50lb bags)',
                quantity: sandBags,
                unit: 'bags',
                unitPrice: 6.98,
                totalPrice: sandBags * 6.98,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(sandItem)) updatedEstimate.push(sandItem);
            }

          } else if (toolName === 'calculate_veneer') {
            const {
              area,
              veneerType = 'stone',
              includeMortar = true
            } = toolInput;

            const veneerPrices: Record<string, number> = {
              stone: 12.50,
              brick: 8.75,
              'cultured-stone': 10.25
            };

            const veneerItem = {
              id: crypto.randomUUID(),
              name: `${veneerType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Veneer`,
              quantity: area,
              unit: 'sqft',
              unitPrice: veneerPrices[veneerType] || 12.50,
              totalPrice: area * (veneerPrices[veneerType] || 12.50),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(veneerItem)) updatedEstimate.push(veneerItem);

            if (includeMortar) {
              const mortarBags = Math.ceil(area / 35);
              const mortarItem = {
                id: crypto.randomUUID(),
                name: 'Mortar Mix',
                quantity: mortarBags,
                unit: 'bags',
                unitPrice: 9.98,
                totalPrice: mortarBags * 9.98,
                type: 'material' as const,
                isCustom: false
              };
              if (!isDuplicate(mortarItem)) updatedEstimate.push(mortarItem);
            }

          } else if (toolName === 'calculate_retaining_wall') {
            const {
              linearFeet,
              height,
              blockType = 'standard'
            } = toolInput;

            const blockPrices: Record<string, number> = {
              standard: 3.50,
              decorative: 5.75,
              timber: 12.00
            };

            const blocksPerFoot = Math.ceil(height * 1.5);
            const totalBlocks = linearFeet * blocksPerFoot;

            const blockItem = {
              id: crypto.randomUUID(),
              name: `${blockType.charAt(0).toUpperCase() + blockType.slice(1)} Retaining Wall Blocks`,
              quantity: totalBlocks,
              unit: 'blocks',
              unitPrice: blockPrices[blockType] || 3.50,
              totalPrice: totalBlocks * (blockPrices[blockType] || 3.50),
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(blockItem)) updatedEstimate.push(blockItem);

            // Base material
            const gravelTons = Math.ceil(linearFeet * height / 30);
            const gravelItem = {
              id: crypto.randomUUID(),
              name: 'Gravel Base',
              quantity: gravelTons,
              unit: 'tons',
              unitPrice: 45,
              totalPrice: gravelTons * 45,
              type: 'material' as const,
              isCustom: false
            };
            if (!isDuplicate(gravelItem)) updatedEstimate.push(gravelItem);

          } else if (toolName === 'calculate_junk_removal') {
            const {
              volume = 0,
              estimatedWeight = 'medium'
            } = toolInput;

            const weightMultipliers: Record<string, number> = {
              light: 1.0,
              medium: 1.25,
              heavy: 1.5
            };

            const basePrice = volume * 85;
            const multiplier = weightMultipliers[estimatedWeight] || 1.25;
            const totalPrice = basePrice * multiplier;

            const junkItem = {
              id: crypto.randomUUID(),
              name: `Junk Removal (${estimatedWeight} weight)`,
              quantity: volume,
              unit: 'cubic yards',
              unitPrice: parseFloat((totalPrice / volume).toFixed(2)),
              totalPrice: parseFloat(totalPrice.toFixed(2)),
              type: 'fee' as const,
              isCustom: false
            };
            if (!isDuplicate(junkItem)) updatedEstimate.push(junkItem);

            // Disposal fee
            const disposalItem = {
              id: crypto.randomUUID(),
              name: 'Disposal Fee',
              quantity: 1,
              unit: 'fee',
              unitPrice: 75,
              totalPrice: 75,
              type: 'fee' as const,
              isCustom: false
            };
            if (!isDuplicate(disposalItem)) updatedEstimate.push(disposalItem);
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
