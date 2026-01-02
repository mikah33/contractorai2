/**
 * Contractor AI - Unified Function Definitions
 * Combines all tools from Hank (Estimating), Bill (Projects), Cindy (CRM), and Saul (Finance)
 */

export interface FunctionParameter {
  type: string;
  description: string;
  enum?: string[];
  required?: boolean;
  items?: { type: string; properties?: Record<string, any> };
}

export interface FunctionDefinition {
  name: string;
  description: string;
  category: 'estimating' | 'projects' | 'crm' | 'finance' | 'general';
  parameters: {
    type: 'object';
    properties: Record<string, FunctionParameter>;
    required: string[];
  };
}

// ============================================
// ESTIMATING FUNCTIONS (from Hank)
// ============================================

export const estimatingFunctions: FunctionDefinition[] = [
  {
    name: 'calculate_deck_materials',
    description: 'Calculate materials for a deck using standard pricing.',
    category: 'estimating',
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
        joistSize: { type: 'string', description: 'Joist size', enum: ['2x6', '2x8', '2x10', '2x12'] },
        joistSpacing: { type: 'number', description: 'Joist spacing in inches', enum: [12, 16] },
        includeStairs: { type: 'boolean', description: 'Include stairs' },
        includeRailing: { type: 'boolean', description: 'Include railing' },
        railingLength: { type: 'number', description: 'Linear feet of railing' }
      },
      required: ['length', 'width', 'deckingType', 'joistSize']
    }
  },
  {
    name: 'calculate_concrete_materials',
    description: 'Calculate materials for concrete work.',
    category: 'estimating',
    parameters: {
      type: 'object',
      properties: {
        area: { type: 'number', description: 'Total area in square feet' },
        thickness: { type: 'number', description: 'Thickness in inches' },
        concreteType: { type: 'string', description: 'Type of concrete', enum: ['standard', 'fiber-reinforced', 'high-strength'] },
        includeFinishing: { type: 'boolean', description: 'Include finishing work' }
      },
      required: ['area', 'thickness', 'concreteType']
    }
  },
  {
    name: 'calculate_roofing_materials',
    description: 'Calculate roofing materials.',
    category: 'estimating',
    parameters: {
      type: 'object',
      properties: {
        roofArea: { type: 'number', description: 'Total roof area in square feet' },
        shingleType: { type: 'string', description: 'Type of shingles', enum: ['3-tab', 'architectural', 'premium'] },
        includeTearOff: { type: 'boolean', description: 'Include tear-off' },
        layers: { type: 'number', description: 'Number of existing layers' }
      },
      required: ['roofArea', 'shingleType']
    }
  },
  {
    name: 'add_custom_line_item',
    description: 'Add a custom line item with user-specified pricing.',
    category: 'estimating',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name/description of the line item' },
        quantity: { type: 'number', description: 'Quantity' },
        unit: { type: 'string', description: 'Unit of measurement' },
        unitPrice: { type: 'number', description: 'Price per unit' },
        type: { type: 'string', description: 'Type of line item', enum: ['material', 'labor', 'permit', 'fee', 'other'] },
        notes: { type: 'string', description: 'Optional notes' }
      },
      required: ['name', 'quantity', 'unit', 'unitPrice', 'type']
    }
  },
  {
    name: 'add_labor_cost',
    description: 'Add labor cost with custom hourly rate.',
    category: 'estimating',
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
    name: 'save_estimate',
    description: 'Save the current estimate.',
    category: 'estimating',
    parameters: {
      type: 'object',
      properties: {
        estimateName: { type: 'string', description: 'Name for this estimate' },
        clientId: { type: 'string', description: 'Client ID to associate with estimate' }
      },
      required: ['estimateName']
    }
  },
  {
    name: 'get_estimate_summary',
    description: 'Get a summary of the current estimate.',
    category: 'estimating',
    parameters: { type: 'object', properties: {}, required: [] }
  }
];

// ============================================
// PROJECT MANAGEMENT FUNCTIONS (from Bill)
// ============================================

export const projectFunctions: FunctionDefinition[] = [
  {
    name: 'get_employees',
    description: 'Get list of all employees with roles, rates, and contact info.',
    category: 'projects',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status', enum: ['active', 'inactive', 'all'] }
      },
      required: []
    }
  },
  {
    name: 'get_employee_availability',
    description: 'Check employee availability for a date range.',
    category: 'projects',
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Employee ID (optional for all)' },
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'get_projects',
    description: 'Get list of all projects with status, timeline, and team.',
    category: 'projects',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status', enum: ['active', 'completed', 'scheduled', 'all'] }
      },
      required: []
    }
  },
  {
    name: 'assign_employee_to_project',
    description: 'Assign an employee to a project.',
    category: 'projects',
    parameters: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Employee ID' },
        projectId: { type: 'string', description: 'Project ID' },
        role: { type: 'string', description: 'Role on project (lead, assistant, etc.)' },
        startDate: { type: 'string', description: 'Assignment start date' },
        endDate: { type: 'string', description: 'Assignment end date' }
      },
      required: ['employeeId', 'projectId']
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Create a calendar event.',
    category: 'projects',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        startTime: { type: 'string', description: 'Start time (ISO format)' },
        endTime: { type: 'string', description: 'End time (ISO format)' },
        attendees: { type: 'array', description: 'List of attendee IDs or emails', items: { type: 'string' } },
        projectId: { type: 'string', description: 'Associated project ID' },
        description: { type: 'string', description: 'Event description' }
      },
      required: ['title', 'startTime', 'endTime']
    }
  },
  {
    name: 'get_calendar_events',
    description: 'Get calendar events for a date range.',
    category: 'projects',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        employeeId: { type: 'string', description: 'Filter by employee' }
      },
      required: []
    }
  },
  {
    name: 'draft_employee_email',
    description: 'Draft an email to employees (requires approval).',
    category: 'projects',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'array', description: 'Recipient employee IDs or emails', items: { type: 'string' } },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' }
      },
      required: ['to', 'subject', 'body']
    }
  }
];

// ============================================
// CRM FUNCTIONS (from Cindy)
// ============================================

export const crmFunctions: FunctionDefinition[] = [
  {
    name: 'get_clients',
    description: 'Get list of all clients.',
    category: 'crm',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status', enum: ['active', 'inactive', 'lead', 'all'] },
        search: { type: 'string', description: 'Search by name or email' }
      },
      required: []
    }
  },
  {
    name: 'get_client_details',
    description: 'Get detailed information about a specific client.',
    category: 'crm',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Client ID' }
      },
      required: ['clientId']
    }
  },
  {
    name: 'create_client',
    description: 'Create a new client.',
    category: 'crm',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Client name' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        address: { type: 'string', description: 'Address' },
        notes: { type: 'string', description: 'Additional notes' }
      },
      required: ['name']
    }
  },
  {
    name: 'update_client',
    description: 'Update client information.',
    category: 'crm',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Client ID' },
        name: { type: 'string', description: 'Client name' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        address: { type: 'string', description: 'Address' },
        status: { type: 'string', description: 'Client status', enum: ['active', 'inactive', 'lead'] },
        notes: { type: 'string', description: 'Additional notes' }
      },
      required: ['clientId']
    }
  },
  {
    name: 'get_client_projects',
    description: 'Get all projects for a specific client.',
    category: 'crm',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Client ID' }
      },
      required: ['clientId']
    }
  },
  {
    name: 'draft_client_email',
    description: 'Draft an email to a client (requires approval).',
    category: 'crm',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Client email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'get_company_settings',
    description: 'Get company settings and information.',
    category: 'crm',
    parameters: { type: 'object', properties: {}, required: [] }
  }
];

// ============================================
// FINANCE FUNCTIONS (from Saul)
// ============================================

export const financeFunctions: FunctionDefinition[] = [
  {
    name: 'add_expense',
    description: 'Record a new expense.',
    category: 'finance',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Expense amount' },
        category: { type: 'string', description: 'Expense category', enum: ['materials', 'labor', 'equipment', 'fuel', 'office', 'insurance', 'utilities', 'other'] },
        vendor: { type: 'string', description: 'Vendor/supplier name' },
        description: { type: 'string', description: 'Description' },
        projectId: { type: 'string', description: 'Associated project ID' },
        date: { type: 'string', description: 'Expense date (YYYY-MM-DD)' }
      },
      required: ['amount', 'category']
    }
  },
  {
    name: 'get_expenses',
    description: 'Get expenses with optional filters.',
    category: 'finance',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        category: { type: 'string', description: 'Filter by category' },
        projectId: { type: 'string', description: 'Filter by project' }
      },
      required: []
    }
  },
  {
    name: 'add_revenue',
    description: 'Record revenue/payment received.',
    category: 'finance',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Payment amount' },
        clientId: { type: 'string', description: 'Client ID' },
        projectId: { type: 'string', description: 'Project ID' },
        invoiceId: { type: 'string', description: 'Invoice ID if applicable' },
        paymentMethod: { type: 'string', description: 'Payment method', enum: ['cash', 'check', 'card', 'transfer', 'other'] },
        date: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
        notes: { type: 'string', description: 'Additional notes' }
      },
      required: ['amount']
    }
  },
  {
    name: 'get_revenue',
    description: 'Get revenue/payments with optional filters.',
    category: 'finance',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        clientId: { type: 'string', description: 'Filter by client' },
        projectId: { type: 'string', description: 'Filter by project' }
      },
      required: []
    }
  },
  {
    name: 'get_financial_summary',
    description: 'Get financial summary (revenue, expenses, profit).',
    category: 'finance',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Time period', enum: ['today', 'week', 'month', 'quarter', 'year', 'all'] },
        startDate: { type: 'string', description: 'Custom start date' },
        endDate: { type: 'string', description: 'Custom end date' }
      },
      required: []
    }
  },
  {
    name: 'create_invoice',
    description: 'Create an invoice for a client.',
    category: 'finance',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Client ID' },
        projectId: { type: 'string', description: 'Project ID' },
        items: {
          type: 'array',
          description: 'Invoice line items',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unitPrice: { type: 'number' }
            }
          }
        },
        dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
        notes: { type: 'string', description: 'Invoice notes' }
      },
      required: ['clientId', 'items']
    }
  },
  {
    name: 'generate_report',
    description: 'Generate a financial report.',
    category: 'finance',
    parameters: {
      type: 'object',
      properties: {
        reportType: { type: 'string', description: 'Type of report', enum: ['profit-loss', 'cash-flow', 'expense-breakdown', 'revenue-breakdown'] },
        startDate: { type: 'string', description: 'Report start date' },
        endDate: { type: 'string', description: 'Report end date' },
        format: { type: 'string', description: 'Output format', enum: ['summary', 'detailed', 'pdf'] }
      },
      required: ['reportType']
    }
  },
  {
    name: 'set_budget',
    description: 'Set a budget for a category.',
    category: 'finance',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Budget category' },
        amount: { type: 'number', description: 'Monthly budget amount' },
        period: { type: 'string', description: 'Budget period', enum: ['monthly', 'quarterly', 'yearly'] }
      },
      required: ['category', 'amount']
    }
  },
  {
    name: 'get_budget_status',
    description: 'Get current budget status and spending.',
    category: 'finance',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Specific category (optional)' }
      },
      required: []
    }
  }
];

// ============================================
// GENERAL/UTILITY FUNCTIONS
// ============================================

export const generalFunctions: FunctionDefinition[] = [
  {
    name: 'get_user_preferences',
    description: 'Get saved user preferences.',
    category: 'general',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Preference key' }
      },
      required: []
    }
  },
  {
    name: 'save_user_preference',
    description: 'Save a user preference.',
    category: 'general',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Preference key' },
        value: { type: 'string', description: 'Preference value' }
      },
      required: ['key', 'value']
    }
  }
];

// ============================================
// COMBINED EXPORTS
// ============================================

export const allFunctions: FunctionDefinition[] = [
  ...estimatingFunctions,
  ...projectFunctions,
  ...crmFunctions,
  ...financeFunctions,
  ...generalFunctions
];

export function getFunctionsByCategory(category: string): FunctionDefinition[] {
  if (category === 'all') return allFunctions;
  return allFunctions.filter(fn => fn.category === category);
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

/**
 * Convert to OpenAI format
 */
export function toOpenAIFormat(functions: FunctionDefinition[]) {
  return functions.map(fn => ({
    name: fn.name,
    description: fn.description,
    parameters: fn.parameters
  }));
}
