// Unified Contractor AI Edge Function
// Combines: Estimating (Hank), Projects (Bill), CRM (Cindy), Finance (Saul)

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

type ContractorMode = 'estimating' | 'projects' | 'crm' | 'finance' | 'general';

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

const SYSTEM_PROMPT = `You are Contractor, the all-in-one AI assistant for ContractorAI. You help contractors manage their entire business through natural conversation.

## Your Capabilities

### 1. ESTIMATING (Calculator Mode)
Create accurate construction estimates through conversation:
- **Standard Calculators**: Deck, concrete, roofing, siding, foundations, flooring, paint, drywall, framing, electrical, plumbing, HVAC, and 15+ more trades
- **Custom Line Items**: Permits, fees, custom materials, labor with user-specified rates
- **Price Editing**: When user provides new prices, clear and recalculate entire estimate
- **Estimate Management**: Save, load, and generate professional estimates

### 2. PROJECT MANAGEMENT
Coordinate teams and manage projects:
- **Employee Management**: View team, check availability, assign to projects
- **Project Coordination**: Track progress, manage tasks, coordinate teams
- **Calendar & Scheduling**: Schedule events, check conflicts, send invitations
- **Team Communication**: Draft emails to employees (requires user approval)

### 3. CLIENT RELATIONSHIP MANAGEMENT (CRM)
Manage clients and customer relationships:
- **Client Management**: Add, update, view clients and contact information
- **Project Tracking**: Link projects to clients, track status and history
- **Client Communication**: Draft professional emails to customers (requires approval)

### 4. FINANCE MANAGEMENT
Track finances and make informed decisions:
- **Expense Tracking**: Record expenses with categories, vendors, and project links
- **Revenue Tracking**: Log payments and income from projects
- **Budget Management**: Set budgets and track spending
- **Financial Reports**: Generate P&L statements, expense breakdowns, PDF reports

## Response Guidelines

- Be professional but friendly and conversational
- ALWAYS include actual numbers in responses (quantities, prices, totals)
- Use natural language like "Adding that now...", "Got it...", "Here's what I found..."
- For estimates, show itemized breakdown with totals
- For emails, ALWAYS show draft for approval before sending
- Handle errors gracefully and explain what went wrong

## Context Detection

Automatically detect mode from keywords:
- Mentions of "estimate", "materials", "deck", "roof", "concrete", "cost", "price" → Estimating
- Mentions of "employee", "schedule", "project", "assign", "team", "calendar" → Projects
- Mentions of "client", "customer", "contact", "CRM", "lead" → CRM
- Mentions of "expense", "revenue", "budget", "invoice", "profit", "payment" → Finance

## Important Rules

1. Never guess amounts or client information
2. Always confirm important actions before executing
3. Show email drafts for approval - never auto-send
4. Use exact amounts from user input for finances
5. Clear and recalculate estimates when user changes prices`;

// Combined tool definitions
const tools: Anthropic.Tool[] = [
  // ============ ESTIMATING TOOLS ============
  {
    name: 'clear_estimate',
    description: 'Clear all items from the current estimate. Use when user wants to start over or modify prices.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
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
        itemType: { type: 'string', enum: ['material', 'labor', 'permit', 'fee', 'other'], description: 'Type of line item' }
      },
      required: ['name', 'quantity', 'unit', 'unitPrice', 'itemType']
    }
  },
  {
    name: 'calculate_deck_materials',
    description: 'Calculate materials for a deck project',
    input_schema: {
      type: 'object',
      properties: {
        length: { type: 'number', description: 'Deck length in feet' },
        width: { type: 'number', description: 'Deck width in feet' },
        deckingType: { type: 'string', enum: ['trex-transcend', 'trex-select', '5/4-deck', '2x6-pt'], description: 'Type of decking' }
      },
      required: ['length', 'width', 'deckingType']
    }
  },
  {
    name: 'calculate_concrete',
    description: 'Calculate concrete materials for slabs, pads, driveways',
    input_schema: {
      type: 'object',
      properties: {
        length: { type: 'number', description: 'Length in feet' },
        width: { type: 'number', description: 'Width in feet' },
        depth: { type: 'number', description: 'Depth in inches' },
        concretePrice: { type: 'number', description: 'Price per cubic yard (default: 185)' },
        includeMesh: { type: 'boolean', description: 'Include wire mesh reinforcement' }
      },
      required: ['length', 'width', 'depth']
    }
  },
  {
    name: 'calculate_sonotubes',
    description: 'Calculate concrete for sonotubes/piers/cylindrical footings. Use for deck footings, post holes, column piers.',
    input_schema: {
      type: 'object',
      properties: {
        numberOfTubes: { type: 'number', description: 'Number of sonotubes/piers' },
        diameterInches: { type: 'number', description: 'Diameter of each tube in inches (common: 8, 10, 12, 16, 18, 24)' },
        depthInches: { type: 'number', description: 'Depth/height of each tube in inches' },
        bagSize: { type: 'number', enum: [60, 80], description: 'Bag size in pounds (60 or 80). Default 80.' }
      },
      required: ['numberOfTubes', 'diameterInches', 'depthInches']
    }
  },
  {
    name: 'calculate_roofing_materials',
    description: 'Calculate roofing materials including shingles, underlayment, etc.',
    input_schema: {
      type: 'object',
      properties: {
        roofAreaSqFt: { type: 'number', description: 'Roof area in square feet' },
        materialType: { type: 'string', enum: ['asphalt', 'architectural', 'metal', 'tile'], description: 'Roofing material type' },
        includeTearOff: { type: 'boolean', description: 'Include tear-off disposal' }
      },
      required: ['roofAreaSqFt']
    }
  },
  // ============ PROJECT MANAGEMENT TOOLS ============
  {
    name: 'get_employees',
    description: 'Get list of all employees with their details',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'all'], description: 'Filter by status' }
      },
      required: []
    }
  },
  {
    name: 'get_employee_availability',
    description: 'Check employee availability for a date range',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        employeeId: { type: 'string', description: 'Specific employee ID (optional)' }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'get_projects',
    description: 'Get list of all projects',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'completed', 'scheduled', 'all'], description: 'Filter by status' }
      },
      required: []
    }
  },
  {
    name: 'create_project',
    description: 'Create a new project',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        client: { type: 'string', description: 'Client name' },
        description: { type: 'string', description: 'Project description' },
        status: { type: 'string', enum: ['active', 'scheduled', 'on_hold'], description: 'Project status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' },
        budget: { type: 'number', description: 'Project budget' },
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
      },
      required: ['name']
    }
  },
  {
    name: 'assign_employee_to_project',
    description: 'Assign an employee to a project',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Employee ID' },
        projectId: { type: 'string', description: 'Project ID' },
        role: { type: 'string', description: 'Role on project' }
      },
      required: ['employeeId', 'projectId']
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Create a calendar event or appointment',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        startTime: { type: 'string', description: 'Start time (ISO format)' },
        endTime: { type: 'string', description: 'End time (ISO format)' },
        description: { type: 'string', description: 'Event description' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee IDs or emails' }
      },
      required: ['title', 'startTime', 'endTime']
    }
  },
  {
    name: 'get_calendar_events',
    description: 'Get calendar events for a date range',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
      },
      required: []
    }
  },
  // ============ CRM TOOLS ============
  {
    name: 'get_clients',
    description: 'Get list of all clients',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'lead', 'all'], description: 'Filter by status' },
        search: { type: 'string', description: 'Search by name or email' }
      },
      required: []
    }
  },
  {
    name: 'get_client_details',
    description: 'Get detailed information about a specific client',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Client ID' }
      },
      required: ['clientId']
    }
  },
  {
    name: 'create_client',
    description: 'Create a new client',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Client name' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        address: { type: 'string', description: 'Address' }
      },
      required: ['name']
    }
  },
  {
    name: 'draft_email',
    description: 'Draft an email (requires user approval before sending)',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' },
        recipientType: { type: 'string', enum: ['client', 'employee'], description: 'Type of recipient' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  // ============ FINANCE TOOLS ============
  {
    name: 'add_expense',
    description: 'Record a new expense',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Expense amount' },
        category: { type: 'string', enum: ['materials', 'labor', 'equipment', 'fuel', 'office', 'insurance', 'utilities', 'other'], description: 'Expense category' },
        vendor: { type: 'string', description: 'Vendor name' },
        description: { type: 'string', description: 'Description' },
        projectId: { type: 'string', description: 'Associated project ID' },
        date: { type: 'string', description: 'Expense date (YYYY-MM-DD)' }
      },
      required: ['amount', 'category']
    }
  },
  {
    name: 'get_expenses',
    description: 'Get expenses with optional filters',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        category: { type: 'string', description: 'Filter by category' }
      },
      required: []
    }
  },
  {
    name: 'add_revenue',
    description: 'Record revenue/payment received',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Payment amount' },
        clientId: { type: 'string', description: 'Client ID' },
        projectId: { type: 'string', description: 'Project ID' },
        paymentMethod: { type: 'string', enum: ['cash', 'check', 'card', 'transfer', 'other'], description: 'Payment method' },
        date: { type: 'string', description: 'Payment date (YYYY-MM-DD)' }
      },
      required: ['amount']
    }
  },
  {
    name: 'get_financial_summary',
    description: 'Get financial summary (revenue, expenses, profit)',
    input_schema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month', 'quarter', 'year', 'all'], description: 'Time period' }
      },
      required: []
    }
  },
  {
    name: 'generate_report',
    description: 'Generate a financial report',
    input_schema: {
      type: 'object',
      properties: {
        reportType: { type: 'string', enum: ['profit-loss', 'cash-flow', 'expense-breakdown'], description: 'Type of report' },
        startDate: { type: 'string', description: 'Report start date' },
        endDate: { type: 'string', description: 'Report end date' },
        format: { type: 'string', enum: ['summary', 'detailed', 'pdf'], description: 'Output format' }
      },
      required: ['reportType']
    }
  }
];

// Mode detection
function detectMode(message: string): ContractorMode {
  const lowerMessage = message.toLowerCase();

  const modeKeywords: Record<ContractorMode, string[]> = {
    estimating: ['estimate', 'material', 'deck', 'roof', 'concrete', 'siding', 'foundation', 'flooring', 'paint', 'drywall', 'electrical', 'plumbing', 'hvac', 'calculator', 'cost', 'price', 'quote'],
    projects: ['employee', 'schedule', 'project', 'assign', 'team', 'task', 'calendar', 'availability', 'meeting', 'deadline'],
    crm: ['client', 'customer', 'contact', 'lead', 'prospect', 'relationship', 'follow-up'],
    finance: ['expense', 'revenue', 'budget', 'invoice', 'payment', 'profit', 'loss', 'report', 'receipt', 'tax', 'financial'],
    general: []
  };

  for (const [mode, keywords] of Object.entries(modeKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return mode as ContractorMode;
    }
  }

  return 'general';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, currentEstimate = [], mode: requestedMode } = await req.json();

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

    // Detect mode from latest user message
    const lastUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
    const detectedMode = lastUserMessage ? detectMode(lastUserMessage.content) : 'general';
    const currentMode = requestedMode || detectedMode;

    // Format messages for Claude
    let claudeMessages = messages.map((m: Message) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content
    }));

    let updatedEstimate = [...currentEstimate];
    let assistantMessage = '';
    let emailDraft = null;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Agentic loop - keep calling Claude until we get a final text response
    let continueLoop = true;
    let loopCount = 0;
    const maxLoops = 5;

    while (continueLoop && loopCount < maxLoops) {
      loopCount++;

      // Call Claude
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        tools,
        messages: claudeMessages
      });

      // Check if we should continue the loop
      if (response.stop_reason === 'end_turn') {
        // Final response - extract text
        for (const content of response.content) {
          if (content.type === 'text') {
            assistantMessage += content.text;
          }
        }
        continueLoop = false;
      } else if (response.stop_reason === 'tool_use') {
        // Process tool calls and continue loop
        const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

        for (const content of response.content) {
          if (content.type === 'text') {
            assistantMessage += content.text;
          } else if (content.type === 'tool_use') {
            const toolName = content.name;
            const toolInput = content.input as Record<string, any>;
            let toolResultContent = '';

            // ============ ESTIMATING TOOL HANDLERS ============
            if (toolName === 'clear_estimate') {
              updatedEstimate = [];
              toolResultContent = 'Estimate cleared successfully.';
            } else if (toolName === 'add_custom_line_item') {
              const newItem: EstimateLineItem = {
                id: crypto.randomUUID(),
                name: toolInput.name,
                quantity: toolInput.quantity,
                unit: toolInput.unit,
                unitPrice: toolInput.unitPrice,
                totalPrice: toolInput.quantity * toolInput.unitPrice,
                type: toolInput.itemType,
                isCustom: true
              };
              updatedEstimate.push(newItem);
              toolResultContent = `Added line item: ${newItem.name} - ${newItem.quantity} ${newItem.unit} @ $${newItem.unitPrice} = $${newItem.totalPrice.toFixed(2)}`;
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
              const totalCost = boardsNeeded * pricePerBoard;

              updatedEstimate.push({
                id: crypto.randomUUID(),
                name: `${deckingType} Decking (20ft)`,
                quantity: boardsNeeded,
                unit: 'boards',
                unitPrice: pricePerBoard,
                totalPrice: totalCost,
                type: 'material',
                isCustom: false
              });
              toolResultContent = `Deck materials calculated for ${length}ft x ${width}ft (${area} sq ft):\n- ${boardsNeeded} boards of ${deckingType} @ $${pricePerBoard}/board = $${totalCost.toFixed(2)}`;
            } else if (toolName === 'calculate_concrete') {
              const { length, width, depth, concretePrice = 185, includeMesh = false } = toolInput;
              const cubicYards = (length * width * (depth / 12)) / 27;
              const rounded = Math.ceil(cubicYards * 100) / 100;
              const concreteCost = rounded * concretePrice;

              updatedEstimate.push({
                id: crypto.randomUUID(),
                name: 'Concrete',
                quantity: rounded,
                unit: 'cubic yards',
                unitPrice: concretePrice,
                totalPrice: concreteCost,
                type: 'material',
                isCustom: false
              });

              let resultText = `Concrete calculated for ${length}ft x ${width}ft x ${depth}in:\n- ${rounded} cubic yards @ $${concretePrice}/yard = $${concreteCost.toFixed(2)}`;

              if (includeMesh) {
                const area = length * width;
                const sheets = Math.ceil(area / 100);
                const meshCost = sheets * 12.98;
                updatedEstimate.push({
                  id: crypto.randomUUID(),
                  name: '6x6 Wire Mesh',
                  quantity: sheets,
                  unit: 'sheets',
                  unitPrice: 12.98,
                  totalPrice: meshCost,
                  type: 'material',
                  isCustom: false
                });
                resultText += `\n- ${sheets} sheets of wire mesh @ $12.98/sheet = $${meshCost.toFixed(2)}`;
              }
              toolResultContent = resultText;
            } else if (toolName === 'calculate_sonotubes') {
              // Sonotube/pier concrete calculation
              const { numberOfTubes, diameterInches, depthInches, bagSize = 80 } = toolInput;

              // Convert to feet for volume calculation
              const radiusFeet = (diameterInches / 2) / 12;
              const depthFeet = depthInches / 12;

              // Volume of a cylinder = π × r² × h
              const volumePerTube = Math.PI * Math.pow(radiusFeet, 2) * depthFeet; // in cubic feet
              const totalVolumeCuFt = volumePerTube * numberOfTubes;
              const totalVolumeCuYd = totalVolumeCuFt / 27;

              // Bag yields (cubic feet per bag)
              // 60 lb bag = 0.45 cu ft yield
              // 80 lb bag = 0.60 cu ft yield
              const bagYield = bagSize === 60 ? 0.45 : 0.60;
              const bagsNeeded = Math.ceil(totalVolumeCuFt / bagYield);

              // Pricing - 80lb bag = $5.89, 60lb bag = $6.98
              const bagPrice = bagSize === 60 ? 6.98 : 5.89;
              const totalCost = bagsNeeded * bagPrice;

              updatedEstimate.push({
                id: crypto.randomUUID(),
                name: `${bagSize}lb Concrete Bags (Sonotubes)`,
                quantity: bagsNeeded,
                unit: 'bags',
                unitPrice: bagPrice,
                totalPrice: totalCost,
                type: 'material',
                isCustom: false
              });

              toolResultContent = `Sonotube concrete calculated for ${numberOfTubes} tubes @ ${diameterInches}" diameter × ${depthInches}" deep:\n` +
                `- Volume per tube: ${volumePerTube.toFixed(2)} cu ft\n` +
                `- Total volume: ${totalVolumeCuFt.toFixed(2)} cu ft (${totalVolumeCuYd.toFixed(2)} cu yd)\n` +
                `- ${bagSize}lb bags needed: ${bagsNeeded} bags (yields ${bagYield} cu ft each)\n` +
                `- Cost: ${bagsNeeded} bags @ $${bagPrice.toFixed(2)} = $${totalCost.toFixed(2)}`;
            } else if (toolName === 'calculate_roofing_materials') {
              const { roofAreaSqFt, materialType = 'asphalt', includeTearOff = false } = toolInput;
              const prices: Record<string, number> = {
                asphalt: 350, architectural: 475, metal: 850, tile: 625
              };
              const squares = parseFloat(((roofAreaSqFt / 100) * 1.1).toFixed(2));
              const materialName = materialType.charAt(0).toUpperCase() + materialType.slice(1);
              const shinglePrice = prices[materialType] || 350;
              const shingleCost = parseFloat((squares * shinglePrice).toFixed(2));
              const underlaymentCost = parseFloat((squares * 26).toFixed(2));

              updatedEstimate.push({
                id: crypto.randomUUID(),
                name: `${materialName} Shingles`,
                quantity: squares,
                unit: 'squares',
                unitPrice: shinglePrice,
                totalPrice: shingleCost,
                type: 'material',
                isCustom: false
              });

              updatedEstimate.push({
                id: crypto.randomUUID(),
                name: 'Underlayment',
                quantity: squares,
                unit: 'squares',
                unitPrice: 26,
                totalPrice: underlaymentCost,
                type: 'material',
                isCustom: false
              });

              const totalCost = shingleCost + underlaymentCost;
              toolResultContent = `Roofing materials calculated for ${roofAreaSqFt} sq ft roof (${squares} squares with 10% waste factor):\n- ${materialName} Shingles: ${squares} squares @ $${shinglePrice}/square = $${shingleCost.toFixed(2)}\n- Underlayment: ${squares} squares @ $26/square = $${underlaymentCost.toFixed(2)}\n\nTotal: $${totalCost.toFixed(2)}`;
            }
            // ============ PROJECT MANAGEMENT TOOL HANDLERS ============
            else if (toolName === 'get_employees') {
              const { data: employees } = await supabase
                .from('employees')
                .select('*')
                .eq('user_id', userId)
                .order('name');

              let result = `Found ${employees?.length || 0} employees:\n`;
              employees?.forEach(emp => {
                result += `• ${emp.name} - ${emp.role} (${emp.status})\n`;
              });
              toolResultContent = result;
            } else if (toolName === 'get_projects') {
              const query = supabase.from('projects').select('*').eq('user_id', userId);
              if (toolInput.status && toolInput.status !== 'all') {
                query.eq('status', toolInput.status);
              }
              const { data: projects } = await query.order('created_at', { ascending: false });

              let result = `Found ${projects?.length || 0} projects:\n`;
              projects?.forEach(proj => {
                result += `• ${proj.name} - ${proj.status}\n`;
              });
              toolResultContent = result;
            } else if (toolName === 'create_project') {
              const today = new Date().toISOString().split('T')[0];
              const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

              const { data, error } = await supabase.from('projects').insert({
                user_id: userId,
                name: toolInput.name,
                client_name: toolInput.client || '',
                description: toolInput.description || '',
                status: toolInput.status || 'active',
                priority: toolInput.priority || 'medium',
                budget: toolInput.budget || 0,
                start_date: toolInput.startDate || today,
                end_date: toolInput.endDate || thirtyDaysLater,
                spent: 0,
                progress: 0
              }).select().single();

              if (error) {
                toolResultContent = `Failed to create project: ${error.message}`;
              } else {
                toolResultContent = `Created project: ${data.name} (Status: ${data.status}, Priority: ${data.priority})`;
              }
            } else if (toolName === 'create_calendar_event') {
              const { data, error } = await supabase.from('calendar_events').insert({
                user_id: userId,
                title: toolInput.title,
                start_time: toolInput.startTime,
                end_time: toolInput.endTime,
                description: toolInput.description || ''
              }).select().single();

              if (error) {
                toolResultContent = `Failed to create event: ${error.message}`;
              } else {
                toolResultContent = `Created event: ${data.title}`;
              }
            } else if (toolName === 'get_calendar_events') {
              const query = supabase.from('calendar_events').select('*').eq('user_id', userId);
              if (toolInput.startDate) query.gte('start_time', toolInput.startDate);
              if (toolInput.endDate) query.lte('start_time', toolInput.endDate);
              const { data: events } = await query.order('start_time');

              let result = `Found ${events?.length || 0} calendar events:\n`;
              events?.forEach(evt => {
                result += `• ${evt.title} - ${new Date(evt.start_time).toLocaleDateString()}\n`;
              });
              toolResultContent = result;
            } else if (toolName === 'get_employee_availability') {
              toolResultContent = `Checking employee availability for ${toolInput.startDate} to ${toolInput.endDate}. Note: Detailed availability tracking is not yet implemented.`;
            } else if (toolName === 'assign_employee_to_project') {
              toolResultContent = `Employee assignment recorded. Note: Full assignment tracking requires additional database setup.`;
            }
            // ============ CRM TOOL HANDLERS ============
            else if (toolName === 'get_clients') {
              const query = supabase.from('clients').select('*').eq('user_id', userId);
              if (toolInput.status && toolInput.status !== 'all') {
                query.eq('status', toolInput.status);
              }
              if (toolInput.search) {
                query.or(`name.ilike.%${toolInput.search}%,email.ilike.%${toolInput.search}%`);
              }
              const { data: clients } = await query.order('name');

              let result = `Found ${clients?.length || 0} clients:\n`;
              clients?.forEach(client => {
                result += `• ${client.name}${client.email ? ` - ${client.email}` : ''}\n`;
              });
              toolResultContent = result;
            } else if (toolName === 'get_client_details') {
              const { data: client, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', toolInput.clientId)
                .eq('user_id', userId)
                .single();

              if (error || !client) {
                toolResultContent = `Client not found.`;
              } else {
                toolResultContent = `Client Details:\n- Name: ${client.name}\n- Email: ${client.email || 'N/A'}\n- Phone: ${client.phone || 'N/A'}\n- Address: ${client.address || 'N/A'}\n- Status: ${client.status}`;
              }
            } else if (toolName === 'create_client') {
              const { data, error } = await supabase.from('clients').insert({
                user_id: userId,
                name: toolInput.name,
                email: toolInput.email || null,
                phone: toolInput.phone || null,
                address: toolInput.address || null,
                status: 'active'
              }).select().single();

              if (error) {
                toolResultContent = `Failed to create client: ${error.message}`;
              } else {
                toolResultContent = `Created client: ${data.name}`;
              }
            } else if (toolName === 'draft_email') {
              emailDraft = {
                to: toolInput.to,
                subject: toolInput.subject,
                body: toolInput.body,
                type: toolInput.recipientType || 'client'
              };
              toolResultContent = `Email draft created for ${toolInput.to} with subject "${toolInput.subject}". Waiting for user approval.`;
            }
            // ============ FINANCE TOOL HANDLERS ============
            else if (toolName === 'add_expense') {
              const { data, error } = await supabase.from('finance_expenses').insert({
                user_id: userId,
                amount: toolInput.amount,
                category: toolInput.category,
                vendor: toolInput.vendor || null,
                notes: toolInput.description || null,
                project_id: toolInput.projectId || null,
                date: toolInput.date || new Date().toISOString().split('T')[0]
              }).select().single();

              if (error) {
                toolResultContent = `Failed to add expense: ${error.message}`;
              } else {
                toolResultContent = `Added expense: $${data.amount} for ${data.category}`;
              }
            } else if (toolName === 'get_expenses') {
              const query = supabase.from('finance_expenses').select('*').eq('user_id', userId);
              if (toolInput.startDate) query.gte('date', toolInput.startDate);
              if (toolInput.endDate) query.lte('date', toolInput.endDate);
              if (toolInput.category) query.eq('category', toolInput.category);
              const { data: expenses } = await query.order('date', { ascending: false });

              const total = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
              toolResultContent = `Found ${expenses?.length || 0} expenses totaling $${total.toFixed(2)}`;
            } else if (toolName === 'add_revenue') {
              const { data, error } = await supabase.from('finance_payments').insert({
                user_id: userId,
                amount: toolInput.amount,
                client_id: toolInput.clientId || null,
                project_id: toolInput.projectId || null,
                method: toolInput.paymentMethod || 'other',
                date: toolInput.date || new Date().toISOString().split('T')[0]
              }).select().single();

              if (error) {
                toolResultContent = `Failed to add revenue: ${error.message}`;
              } else {
                toolResultContent = `Added revenue: $${data.amount}`;
              }
            } else if (toolName === 'get_financial_summary') {
              const { data: expenses } = await supabase
                .from('finance_expenses')
                .select('amount')
                .eq('user_id', userId);

              const { data: revenue } = await supabase
                .from('finance_payments')
                .select('amount')
                .eq('user_id', userId);

              const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
              const totalRevenue = revenue?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;
              const profit = totalRevenue - totalExpenses;

              toolResultContent = `Financial Summary:\n• Revenue: $${totalRevenue.toFixed(2)}\n• Expenses: $${totalExpenses.toFixed(2)}\n• Profit: $${profit.toFixed(2)}\n• Margin: ${totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0}%`;
            } else if (toolName === 'generate_report') {
              toolResultContent = `Report generated for ${toolInput.reportType}. Format: ${toolInput.format || 'summary'}`;
            } else {
              toolResultContent = `Tool ${toolName} executed successfully.`;
            }

            // Add this tool result to the array
            toolResults.push({
              type: 'tool_result',
              tool_use_id: content.id,
              content: toolResultContent
            });
          }
        }

        // Add the assistant's response (with tool_use) and tool results to messages
        claudeMessages.push({
          role: 'assistant',
          content: response.content
        });
        claudeMessages.push({
          role: 'user',
          content: toolResults
        });
      } else {
        // Unknown stop reason, exit loop
        continueLoop = false;
      }
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage || 'How can I help you today?',
        updatedEstimate,
        emailDraft,
        detectedMode: currentMode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Contractor AI Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
