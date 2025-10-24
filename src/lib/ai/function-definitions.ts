/**
 * AI Function Calling Definitions
 * Defines all functions available to the AI chatbot for calculator operations
 */

import type { CalculatorType } from '../../types/calculator';

export interface FunctionParameter {
  type: string;
  description: string;
  enum?: string[];
  required?: boolean;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, FunctionParameter>;
    required: string[];
  };
}

/**
 * Calculator Functions - Read-only pricing, uses existing calculator logic
 */
export const calculatorFunctions: FunctionDefinition[] = [
  {
    name: 'calculate_deck_materials',
    description: 'Calculate materials for a deck using standard pricing. Returns material list with quantities and costs.',
    parameters: {
      type: 'object',
      properties: {
        length: { type: 'number', description: 'Deck length in feet' },
        width: { type: 'number', description: 'Deck width in feet' },
        deckingType: {
          type: 'string',
          description: 'Type of decking material',
          enum: ['5/4-deck', '2x6-pt', 'trex-enhance-basic', 'trex-enhance-natural', 'trex-select', 'trex-transcend', 'trex-lineage']
        },
        joistSize: {
          type: 'string',
          description: 'Joist size',
          enum: ['2x6', '2x8', '2x10', '2x12']
        },
        joistSpacing: {
          type: 'number',
          description: 'Joist spacing in inches',
          enum: [12, 16]
        },
        includeStairs: { type: 'boolean', description: 'Include stairs in calculation' },
        includeRailing: { type: 'boolean', description: 'Include railing in calculation' },
        railingLength: { type: 'number', description: 'Linear feet of railing (if included)' }
      },
      required: ['length', 'width', 'deckingType', 'joistSize']
    }
  },
  {
    name: 'calculate_concrete_materials',
    description: 'Calculate materials for concrete work using standard pricing.',
    parameters: {
      type: 'object',
      properties: {
        area: { type: 'number', description: 'Total area in square feet' },
        thickness: { type: 'number', description: 'Thickness in inches' },
        concreteType: {
          type: 'string',
          description: 'Type of concrete',
          enum: ['standard', 'fiber-reinforced', 'high-strength']
        },
        includeFinishing: { type: 'boolean', description: 'Include finishing work' }
      },
      required: ['area', 'thickness', 'concreteType']
    }
  },
  {
    name: 'calculate_roofing_materials',
    description: 'Calculate roofing materials using standard pricing.',
    parameters: {
      type: 'object',
      properties: {
        roofArea: { type: 'number', description: 'Total roof area in square feet' },
        shingleType: {
          type: 'string',
          description: 'Type of shingles',
          enum: ['3-tab', 'architectural', 'premium']
        },
        includeTearOff: { type: 'boolean', description: 'Include tear-off of existing roof' },
        layers: { type: 'number', description: 'Number of existing layers (if tear-off)' }
      },
      required: ['roofArea', 'shingleType']
    }
  }
];

/**
 * Custom Line Item Functions - Flexible, user-controlled pricing
 */
export const customItemFunctions: FunctionDefinition[] = [
  {
    name: 'add_custom_line_item',
    description: 'Add a custom line item with user-specified pricing. Use for permits, fees, custom materials, or anything not in standard calculators.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name/description of the line item' },
        quantity: { type: 'number', description: 'Quantity' },
        unit: { type: 'string', description: 'Unit of measurement (permit, hour, linear foot, etc.)' },
        unitPrice: { type: 'number', description: 'Price per unit' },
        type: {
          type: 'string',
          description: 'Type of line item',
          enum: ['material', 'labor', 'permit', 'fee', 'other']
        },
        notes: { type: 'string', description: 'Optional notes about this item' }
      },
      required: ['name', 'quantity', 'unit', 'unitPrice', 'type']
    }
  },
  {
    name: 'add_labor_cost',
    description: 'Add labor cost with custom hourly rate.',
    parameters: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'Number of hours' },
        rate: { type: 'number', description: 'Hourly rate in dollars' },
        description: { type: 'string', description: 'Description of labor work' }
      },
      required: ['hours', 'rate']
    }
  },
  {
    name: 'add_permit_fee',
    description: 'Add a permit or fee to the estimate.',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Total permit/fee amount' },
        description: { type: 'string', description: 'Description of permit/fee' }
      },
      required: ['amount', 'description']
    }
  },
  {
    name: 'add_custom_material',
    description: 'Add a custom material not in standard calculators.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Material name/brand' },
        quantity: { type: 'number', description: 'Quantity needed' },
        unit: { type: 'string', description: 'Unit (boards, bags, linear feet, etc.)' },
        unitPrice: { type: 'number', description: 'Price per unit' },
        notes: { type: 'string', description: 'Additional notes about material' }
      },
      required: ['name', 'quantity', 'unit', 'unitPrice']
    }
  }
];

/**
 * Preference Functions - User memory and preferences
 */
export const preferenceFunctions: FunctionDefinition[] = [
  {
    name: 'get_user_preference',
    description: 'Retrieve a saved user preference (material brand, labor rate, etc.).',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Preference key (e.g., "preferred_decking_brand", "default_labor_rate")' }
      },
      required: ['key']
    }
  },
  {
    name: 'save_user_preference',
    description: 'Save a user preference for future use.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Preference key' },
        value: { type: 'object', description: 'Preference value (flexible structure)' },
        category: {
          type: 'string',
          description: 'Category of preference',
          enum: ['materials', 'labor', 'general']
        }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'get_recent_materials',
    description: 'Get recently used materials for suggestions.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of recent materials to retrieve' }
      },
      required: []
    }
  }
];

/**
 * Estimate Management Functions
 */
export const estimateFunctions: FunctionDefinition[] = [
  {
    name: 'save_estimate',
    description: 'Save the current estimate with all line items.',
    parameters: {
      type: 'object',
      properties: {
        estimateName: { type: 'string', description: 'Name for this estimate' },
        clientId: { type: 'string', description: 'Optional client ID to associate with estimate' }
      },
      required: ['estimateName']
    }
  },
  {
    name: 'get_estimate_summary',
    description: 'Get a summary of the current estimate being built.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'clear_estimate',
    description: 'Clear the current estimate and start fresh.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

/**
 * All available functions combined
 */
export const allFunctions: FunctionDefinition[] = [
  ...calculatorFunctions,
  ...customItemFunctions,
  ...preferenceFunctions,
  ...estimateFunctions
];

/**
 * Convert to OpenAI/Anthropic format
 */
export function toOpenAIFormat(functions: FunctionDefinition[]) {
  return functions.map(fn => ({
    name: fn.name,
    description: fn.description,
    parameters: fn.parameters
  }));
}

/**
 * Convert to Anthropic Claude format
 */
export function toAnthropicFormat(functions: FunctionDefinition[]) {
  return functions.map(fn => ({
    name: fn.name,
    description: fn.description,
    input_schema: fn.parameters
  }));
}
