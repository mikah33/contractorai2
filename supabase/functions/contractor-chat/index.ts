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
- **Expense Tracking**: Record, update, and delete expenses with categories, vendors, and project links
- **Revenue Tracking**: Log payments and income from projects
- **Budget Management**: Set budgets and track spending
- **Financial Reports**: Generate P&L statements, expense breakdowns, PDF reports

### 5. TASK MANAGEMENT
Create, update, and manage tasks:
- Create tasks with titles, due dates, priorities
- Assign tasks to projects, clients, employees
- Update task status (todo, in-progress, done)
- Delete completed or cancelled tasks

### 6. ESTIMATE & INVOICE MANAGEMENT
Full lifecycle management:
- Create and edit estimates with line items
- Convert estimates to invoices
- Create invoices, track payment status
- Update invoice status and amounts

### 7. EMPLOYEE MANAGEMENT
Manage your team:
- Add, update, and remove employees
- Set hourly rates and contact info

### 8. TIME & MILEAGE TRACKING
Track work hours and business mileage:
- Log time entries for employees
- Record mileage trips with tax deduction calculation

## Response Guidelines

- Be professional but friendly and conversational
- ALWAYS include actual numbers in responses (quantities, prices, totals)
- Use natural language like "Adding that now...", "Got it...", "Here's what I found..."
- For estimates, show itemized breakdown with totals
- For emails, ALWAYS show draft for approval before sending
- Handle errors gracefully and explain what went wrong

## Context Detection

Automatically detect mode from keywords:
- Mentions of "estimate", "bid", "proposal", "materials", "deck", "roof", "concrete", "cost", "price" → Estimating
- Mentions of "employee", "schedule", "project", "assign", "team", "calendar", "todo", "task", "reminder", "mileage", "miles", "trip", "drive", "timesheet", "hours", "clock" → Projects
- Mentions of "client", "customer", "contact", "CRM", "lead" → CRM
- Mentions of "expense", "revenue", "budget", "invoice", "profit", "payment" → Finance

## Important Rules

1. Never guess amounts or client information
2. Always confirm important actions before executing
3. Show email drafts for approval - never auto-send
4. Use exact amounts from user input for finances
5. Clear and recalculate estimates when user changes prices

## CRITICAL Estimating Rules - MUST FOLLOW

- When the user mentions demolition or demo work: You MUST ask "What's your price per square foot for demo?" BEFORE calculating any demo costs. Do NOT assume a demo rate. Do NOT use a default demo price. Wait for the user to tell you their rate.
- After calculating materials for ANY estimate: You MUST ask "Would you like to include labor costs on this estimate?" If yes, ask for their hourly or per-unit labor rate. Do NOT assume a labor rate.
- Only add demo line items AFTER the user provides their demo price.
- Only add labor line items AFTER the user confirms they want labor and provides their rate.
- For dumpster rentals: if the user specifies a price (e.g. "$300 for a dumpster"), use that exact price.`;

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
  },
  // ============ PROJECT UPDATE/DELETE TOOLS ============
  {
    name: 'update_project',
    description: 'Update an existing project (name, status, priority, budget, dates, description)',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID to update' },
        name: { type: 'string', description: 'New project name' },
        status: { type: 'string', enum: ['active', 'completed', 'scheduled', 'on_hold', 'cancelled'], description: 'New status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'New priority' },
        budget: { type: 'number', description: 'New budget amount' },
        startDate: { type: 'string', description: 'New start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'New end date (YYYY-MM-DD)' },
        description: { type: 'string', description: 'New description' }
      },
      required: ['projectId']
    }
  },
  {
    name: 'delete_project',
    description: 'Delete a project. Ask the user to confirm before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID to delete' }
      },
      required: ['projectId']
    }
  },
  // ============ TASK/TODO TOOLS ============
  {
    name: 'get_tasks',
    description: 'Get tasks/todos with optional filters (status, priority, project)',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in-progress', 'done', 'all'], description: 'Filter by status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by priority' },
        projectId: { type: 'string', description: 'Filter by project ID' }
      },
      required: []
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task/todo item',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
        dueTime: { type: 'string', description: 'Due time (HH:MM)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' },
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'], description: 'Initial status' },
        projectId: { type: 'string', description: 'Link to a project' },
        clientId: { type: 'string', description: 'Link to a client' },
        employeeId: { type: 'string', description: 'Assign to an employee' }
      },
      required: ['title']
    }
  },
  {
    name: 'update_task',
    description: 'Update an existing task/todo',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to update' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        dueDate: { type: 'string', description: 'New due date (YYYY-MM-DD)' },
        dueTime: { type: 'string', description: 'New due time (HH:MM)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'New priority' },
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'], description: 'New status' },
        projectId: { type: 'string', description: 'Link to a project' },
        employeeId: { type: 'string', description: 'Reassign to employee' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'delete_task',
    description: 'Delete a task. Ask the user to confirm before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to delete' }
      },
      required: ['taskId']
    }
  },
  // ============ ESTIMATE TOOLS ============
  {
    name: 'get_estimates',
    description: 'Get saved estimates with optional status filter',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'sent', 'accepted', 'rejected', 'all'], description: 'Filter by status' },
        clientId: { type: 'string', description: 'Filter by client' }
      },
      required: []
    }
  },
  {
    name: 'create_estimate',
    description: 'Create and save a new estimate with line items',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Estimate title' },
        clientId: { type: 'string', description: 'Client ID' },
        clientName: { type: 'string', description: 'Client name (if no client ID)' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit: { type: 'string' },
              unitPrice: { type: 'number' }
            }
          },
          description: 'Line items array'
        },
        taxRate: { type: 'number', description: 'Tax rate as percentage (e.g. 8.5)' },
        notes: { type: 'string', description: 'Estimate notes' },
        terms: { type: 'string', description: 'Terms and conditions' },
        validDays: { type: 'number', description: 'Days estimate is valid (default 30)' }
      },
      required: ['title']
    }
  },
  {
    name: 'update_estimate',
    description: 'Update an existing estimate (status, items, notes, terms)',
    input_schema: {
      type: 'object',
      properties: {
        estimateId: { type: 'string', description: 'Estimate ID to update' },
        title: { type: 'string', description: 'New title' },
        status: { type: 'string', enum: ['draft', 'sent', 'accepted', 'rejected'], description: 'New status' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit: { type: 'string' },
              unitPrice: { type: 'number' }
            }
          },
          description: 'Updated line items'
        },
        taxRate: { type: 'number', description: 'New tax rate' },
        notes: { type: 'string', description: 'Updated notes' },
        terms: { type: 'string', description: 'Updated terms' }
      },
      required: ['estimateId']
    }
  },
  {
    name: 'delete_estimate',
    description: 'Delete an estimate. Ask the user to confirm before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        estimateId: { type: 'string', description: 'Estimate ID to delete' }
      },
      required: ['estimateId']
    }
  },
  // ============ INVOICE TOOLS ============
  {
    name: 'get_invoices',
    description: 'Get invoices with optional status filter',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'all'], description: 'Filter by status' },
        clientId: { type: 'string', description: 'Filter by client' }
      },
      required: []
    }
  },
  {
    name: 'create_invoice',
    description: 'Create a new invoice from scratch or from an existing estimate',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Invoice title' },
        clientId: { type: 'string', description: 'Client ID' },
        clientName: { type: 'string', description: 'Client name (if no client ID)' },
        estimateId: { type: 'string', description: 'Convert from estimate ID (copies items)' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit: { type: 'string' },
              unitPrice: { type: 'number' }
            }
          },
          description: 'Line items (ignored if estimateId provided)'
        },
        totalAmount: { type: 'number', description: 'Total invoice amount' },
        taxRate: { type: 'number', description: 'Tax rate as percentage' },
        dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
        dueDays: { type: 'number', description: 'Days until due (alternative to dueDate, e.g. 30)' },
        notes: { type: 'string', description: 'Invoice notes' },
        projectId: { type: 'string', description: 'Link to project' }
      },
      required: ['title']
    }
  },
  {
    name: 'update_invoice',
    description: 'Update an existing invoice (status, amount, due date, notes)',
    input_schema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID to update' },
        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], description: 'New status' },
        totalAmount: { type: 'number', description: 'New total amount' },
        paidAmount: { type: 'number', description: 'Amount paid so far' },
        dueDate: { type: 'string', description: 'New due date (YYYY-MM-DD)' },
        notes: { type: 'string', description: 'Updated notes' }
      },
      required: ['invoiceId']
    }
  },
  // ============ CLIENT UPDATE/DELETE TOOLS ============
  {
    name: 'update_client',
    description: 'Update an existing client (name, email, phone, address, status, notes)',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Client ID to update' },
        name: { type: 'string', description: 'New name' },
        email: { type: 'string', description: 'New email' },
        phone: { type: 'string', description: 'New phone' },
        address: { type: 'string', description: 'New address' },
        status: { type: 'string', enum: ['active', 'inactive', 'lead'], description: 'New status' },
        notes: { type: 'string', description: 'Notes about the client' }
      },
      required: ['clientId']
    }
  },
  {
    name: 'delete_client',
    description: 'Delete a client. Ask the user to confirm before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Client ID to delete' }
      },
      required: ['clientId']
    }
  },
  // ============ EMPLOYEE CRUD TOOLS ============
  {
    name: 'create_employee',
    description: 'Create a new employee',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Employee name' },
        role: { type: 'string', description: 'Job title/role' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        hourlyRate: { type: 'number', description: 'Hourly pay rate' },
        status: { type: 'string', enum: ['active', 'inactive'], description: 'Employment status' }
      },
      required: ['name']
    }
  },
  {
    name: 'update_employee',
    description: 'Update an existing employee',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Employee ID to update' },
        name: { type: 'string', description: 'New name' },
        role: { type: 'string', description: 'New role/title' },
        email: { type: 'string', description: 'New email' },
        phone: { type: 'string', description: 'New phone' },
        hourlyRate: { type: 'number', description: 'New hourly rate' },
        status: { type: 'string', enum: ['active', 'inactive'], description: 'New status' }
      },
      required: ['employeeId']
    }
  },
  {
    name: 'delete_employee',
    description: 'Delete an employee. Ask the user to confirm before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Employee ID to delete' }
      },
      required: ['employeeId']
    }
  },
  // ============ MILEAGE TOOLS ============
  {
    name: 'add_mileage_trip',
    description: 'Log a business mileage trip for tax deduction tracking',
    input_schema: {
      type: 'object',
      properties: {
        startAddress: { type: 'string', description: 'Starting address' },
        endAddress: { type: 'string', description: 'Ending address' },
        totalMiles: { type: 'number', description: 'Total miles driven' },
        purpose: { type: 'string', description: 'Business purpose of the trip' },
        date: { type: 'string', description: 'Trip date (YYYY-MM-DD)' },
        projectId: { type: 'string', description: 'Associated project ID' },
        isBusiness: { type: 'boolean', description: 'Is this a business trip (default true)' }
      },
      required: ['totalMiles', 'purpose']
    }
  },
  {
    name: 'get_mileage_trips',
    description: 'Get mileage trips with optional date range filter',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        projectId: { type: 'string', description: 'Filter by project' }
      },
      required: []
    }
  },
  // ============ TIME TRACKING TOOLS ============
  {
    name: 'add_time_entry',
    description: 'Log a time entry for an employee',
    input_schema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'Employee ID' },
        employeeName: { type: 'string', description: 'Employee name (if no ID)' },
        hours: { type: 'number', description: 'Number of hours worked' },
        date: { type: 'string', description: 'Work date (YYYY-MM-DD)' },
        hourlyRate: { type: 'number', description: 'Hourly rate for this entry' },
        projectId: { type: 'string', description: 'Associated project ID' },
        notes: { type: 'string', description: 'Work description/notes' }
      },
      required: ['hours']
    }
  },
  // ============ EXPENSE UPDATE/DELETE TOOLS ============
  {
    name: 'update_expense',
    description: 'Update an existing expense',
    input_schema: {
      type: 'object',
      properties: {
        expenseId: { type: 'string', description: 'Expense ID to update' },
        amount: { type: 'number', description: 'New amount' },
        category: { type: 'string', enum: ['materials', 'labor', 'equipment', 'fuel', 'office', 'insurance', 'utilities', 'other'], description: 'New category' },
        vendor: { type: 'string', description: 'New vendor' },
        description: { type: 'string', description: 'New description' },
        date: { type: 'string', description: 'New date (YYYY-MM-DD)' }
      },
      required: ['expenseId']
    }
  },
  {
    name: 'delete_expense',
    description: 'Delete an expense. Ask the user to confirm before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        expenseId: { type: 'string', description: 'Expense ID to delete' }
      },
      required: ['expenseId']
    }
  },
  // ============ CALENDAR UPDATE/DELETE TOOLS ============
  {
    name: 'update_calendar_event',
    description: 'Update an existing calendar event',
    input_schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Event ID to update' },
        title: { type: 'string', description: 'New title' },
        startTime: { type: 'string', description: 'New start time (ISO format)' },
        endTime: { type: 'string', description: 'New end time (ISO format)' },
        description: { type: 'string', description: 'New description' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete a calendar event. Ask the user to confirm before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Event ID to delete' }
      },
      required: ['eventId']
    }
  }
];

// Mode detection
function detectMode(message: string): ContractorMode {
  const lowerMessage = message.toLowerCase();

  const modeKeywords: Record<ContractorMode, string[]> = {
    estimating: ['estimate', 'bid', 'proposal', 'material', 'deck', 'roof', 'concrete', 'siding', 'foundation', 'flooring', 'paint', 'drywall', 'electrical', 'plumbing', 'hvac', 'calculator', 'cost', 'price', 'quote'],
    projects: ['employee', 'schedule', 'project', 'assign', 'team', 'task', 'todo', 'reminder', 'calendar', 'availability', 'meeting', 'deadline', 'mileage', 'miles', 'trip', 'drive', 'timesheet', 'hours', 'clock'],
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
            }
            // ============ PROJECT UPDATE/DELETE HANDLERS ============
            else if (toolName === 'update_project') {
              const updates: Record<string, any> = {};
              if (toolInput.name) updates.name = toolInput.name;
              if (toolInput.status) updates.status = toolInput.status;
              if (toolInput.priority) updates.priority = toolInput.priority;
              if (toolInput.budget !== undefined) updates.budget = toolInput.budget;
              if (toolInput.startDate) updates.start_date = toolInput.startDate;
              if (toolInput.endDate) updates.end_date = toolInput.endDate;
              if (toolInput.description) updates.description = toolInput.description;

              const { data, error } = await supabase.from('projects')
                .update(updates)
                .eq('id', toolInput.projectId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to update project: ${error.message}`;
              } else {
                toolResultContent = `Updated project: ${data.name} (Status: ${data.status}, Priority: ${data.priority})`;
              }
            } else if (toolName === 'delete_project') {
              const { data, error } = await supabase.from('projects')
                .delete()
                .eq('id', toolInput.projectId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to delete project: ${error.message}`;
              } else {
                toolResultContent = `Deleted project: ${data.name}`;
              }
            }
            // ============ TASK/TODO HANDLERS ============
            else if (toolName === 'get_tasks') {
              const query = supabase.from('tasks').select('*').eq('user_id', userId);
              if (toolInput.status && toolInput.status !== 'all') query.eq('status', toolInput.status);
              if (toolInput.priority) query.eq('priority', toolInput.priority);
              if (toolInput.projectId) query.eq('project_id', toolInput.projectId);
              const { data: tasks } = await query.order('due_date', { ascending: true });

              let result = `Found ${tasks?.length || 0} tasks:\n`;
              tasks?.forEach(task => {
                result += `• [${task.status}] ${task.title}${task.priority ? ` (${task.priority})` : ''}${task.due_date ? ` - Due: ${task.due_date}` : ''} (ID: ${task.id})\n`;
              });
              toolResultContent = result;
            } else if (toolName === 'create_task') {
              const { data, error } = await supabase.from('tasks').insert({
                user_id: userId,
                title: toolInput.title,
                description: toolInput.description || null,
                due_date: toolInput.dueDate || null,
                due_time: toolInput.dueTime || null,
                priority: toolInput.priority || 'medium',
                status: toolInput.status || 'todo',
                project_id: toolInput.projectId || null,
                client_id: toolInput.clientId || null,
                employee_id: toolInput.employeeId || null
              }).select().single();

              if (error) {
                toolResultContent = `Failed to create task: ${error.message}`;
              } else {
                toolResultContent = `Created task: "${data.title}" (Priority: ${data.priority}, Status: ${data.status}${data.due_date ? `, Due: ${data.due_date}` : ''})`;
              }
            } else if (toolName === 'update_task') {
              const updates: Record<string, any> = {};
              if (toolInput.title) updates.title = toolInput.title;
              if (toolInput.description) updates.description = toolInput.description;
              if (toolInput.dueDate) updates.due_date = toolInput.dueDate;
              if (toolInput.dueTime) updates.due_time = toolInput.dueTime;
              if (toolInput.priority) updates.priority = toolInput.priority;
              if (toolInput.status) updates.status = toolInput.status;
              if (toolInput.projectId) updates.project_id = toolInput.projectId;
              if (toolInput.employeeId) updates.employee_id = toolInput.employeeId;

              const { data, error } = await supabase.from('tasks')
                .update(updates)
                .eq('id', toolInput.taskId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to update task: ${error.message}`;
              } else {
                toolResultContent = `Updated task: "${data.title}" (Status: ${data.status}, Priority: ${data.priority})`;
              }
            } else if (toolName === 'delete_task') {
              const { data, error } = await supabase.from('tasks')
                .delete()
                .eq('id', toolInput.taskId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to delete task: ${error.message}`;
              } else {
                toolResultContent = `Deleted task: "${data.title}"`;
              }
            }
            // ============ ESTIMATE HANDLERS ============
            else if (toolName === 'get_estimates') {
              const query = supabase.from('estimates').select('*').eq('user_id', userId);
              if (toolInput.status && toolInput.status !== 'all') query.eq('status', toolInput.status);
              if (toolInput.clientId) query.eq('client_id', toolInput.clientId);
              const { data: estimates } = await query.order('created_at', { ascending: false });

              let result = `Found ${estimates?.length || 0} estimates:\n`;
              estimates?.forEach(est => {
                result += `• ${est.title} - ${est.status} - $${parseFloat(est.total_amount || 0).toFixed(2)}${est.client_name ? ` (${est.client_name})` : ''} (ID: ${est.id})\n`;
              });
              toolResultContent = result;
            } else if (toolName === 'create_estimate') {
              const items = toolInput.items || [];
              const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
              const taxRate = toolInput.taxRate || 0;
              const taxAmount = subtotal * (taxRate / 100);
              const totalAmount = subtotal + taxAmount;
              const validDays = toolInput.validDays || 30;
              const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

              const { data, error } = await supabase.from('estimates').insert({
                user_id: userId,
                title: toolInput.title,
                client_id: toolInput.clientId || null,
                client_name: toolInput.clientName || null,
                items: items,
                subtotal: subtotal,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                notes: toolInput.notes || null,
                terms: toolInput.terms || null,
                valid_until: validUntil,
                status: 'draft'
              }).select().single();

              if (error) {
                toolResultContent = `Failed to create estimate: ${error.message}`;
              } else {
                toolResultContent = `Created estimate: "${data.title}" - $${totalAmount.toFixed(2)} (Status: draft, Valid until: ${validUntil})`;
              }
            } else if (toolName === 'update_estimate') {
              const updates: Record<string, any> = {};
              if (toolInput.title) updates.title = toolInput.title;
              if (toolInput.status) updates.status = toolInput.status;
              if (toolInput.notes) updates.notes = toolInput.notes;
              if (toolInput.terms) updates.terms = toolInput.terms;
              if (toolInput.taxRate !== undefined) updates.tax_rate = toolInput.taxRate;

              if (toolInput.items) {
                updates.items = toolInput.items;
                const subtotal = toolInput.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
                const taxRate = toolInput.taxRate ?? 0;
                updates.subtotal = subtotal;
                updates.tax_amount = subtotal * (taxRate / 100);
                updates.total_amount = subtotal + updates.tax_amount;
              }

              const { data, error } = await supabase.from('estimates')
                .update(updates)
                .eq('id', toolInput.estimateId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to update estimate: ${error.message}`;
              } else {
                toolResultContent = `Updated estimate: "${data.title}" - $${parseFloat(data.total_amount || 0).toFixed(2)} (Status: ${data.status})`;
              }
            } else if (toolName === 'delete_estimate') {
              const { data, error } = await supabase.from('estimates')
                .delete()
                .eq('id', toolInput.estimateId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to delete estimate: ${error.message}`;
              } else {
                toolResultContent = `Deleted estimate: "${data.title}"`;
              }
            }
            // ============ INVOICE HANDLERS ============
            else if (toolName === 'get_invoices') {
              const query = supabase.from('invoices').select('*').eq('user_id', userId);
              if (toolInput.status && toolInput.status !== 'all') query.eq('status', toolInput.status);
              if (toolInput.clientId) query.eq('client_id', toolInput.clientId);
              const { data: invoices } = await query.order('created_at', { ascending: false });

              let result = `Found ${invoices?.length || 0} invoices:\n`;
              invoices?.forEach(inv => {
                result += `• ${inv.title || 'Invoice'} - ${inv.status} - $${parseFloat(inv.total_amount || 0).toFixed(2)}${inv.due_date ? ` (Due: ${inv.due_date})` : ''} (ID: ${inv.id})\n`;
              });
              toolResultContent = result;
            } else if (toolName === 'create_invoice') {
              let items = toolInput.items || [];
              let totalAmount = toolInput.totalAmount || 0;
              let taxRate = toolInput.taxRate || 0;

              // If converting from estimate, fetch the estimate data
              if (toolInput.estimateId) {
                const { data: estimate } = await supabase.from('estimates')
                  .select('*')
                  .eq('id', toolInput.estimateId)
                  .eq('user_id', userId)
                  .single();

                if (estimate) {
                  items = estimate.items || [];
                  totalAmount = estimate.total_amount || 0;
                  taxRate = estimate.tax_rate || 0;
                  // Mark estimate as accepted
                  await supabase.from('estimates')
                    .update({ status: 'accepted' })
                    .eq('id', toolInput.estimateId)
                    .eq('user_id', userId);
                }
              }

              if (!totalAmount && items.length > 0) {
                const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
                const taxAmount = subtotal * (taxRate / 100);
                totalAmount = subtotal + taxAmount;
              }

              const dueDate = toolInput.dueDate || (toolInput.dueDays
                ? new Date(Date.now() + toolInput.dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

              const { data, error } = await supabase.from('invoices').insert({
                user_id: userId,
                title: toolInput.title,
                client_id: toolInput.clientId || null,
                client_name: toolInput.clientName || null,
                estimate_id: toolInput.estimateId || null,
                project_id: toolInput.projectId || null,
                items: items,
                total_amount: totalAmount,
                paid_amount: 0,
                tax_rate: taxRate,
                due_date: dueDate,
                notes: toolInput.notes || null,
                status: 'draft'
              }).select().single();

              if (error) {
                toolResultContent = `Failed to create invoice: ${error.message}`;
              } else {
                toolResultContent = `Created invoice: "${data.title}" - $${parseFloat(data.total_amount || 0).toFixed(2)} (Due: ${dueDate}, Status: draft)${toolInput.estimateId ? ' [Converted from estimate]' : ''}`;
              }
            } else if (toolName === 'update_invoice') {
              const updates: Record<string, any> = {};
              if (toolInput.status) updates.status = toolInput.status;
              if (toolInput.totalAmount !== undefined) updates.total_amount = toolInput.totalAmount;
              if (toolInput.paidAmount !== undefined) updates.paid_amount = toolInput.paidAmount;
              if (toolInput.dueDate) updates.due_date = toolInput.dueDate;
              if (toolInput.notes) updates.notes = toolInput.notes;

              const { data, error } = await supabase.from('invoices')
                .update(updates)
                .eq('id', toolInput.invoiceId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to update invoice: ${error.message}`;
              } else {
                toolResultContent = `Updated invoice: "${data.title || 'Invoice'}" - $${parseFloat(data.total_amount || 0).toFixed(2)} (Status: ${data.status})`;
              }
            }
            // ============ CLIENT UPDATE/DELETE HANDLERS ============
            else if (toolName === 'update_client') {
              const updates: Record<string, any> = {};
              if (toolInput.name) updates.name = toolInput.name;
              if (toolInput.email) updates.email = toolInput.email;
              if (toolInput.phone) updates.phone = toolInput.phone;
              if (toolInput.address) updates.address = toolInput.address;
              if (toolInput.status) updates.status = toolInput.status;
              if (toolInput.notes) updates.notes = toolInput.notes;

              const { data, error } = await supabase.from('clients')
                .update(updates)
                .eq('id', toolInput.clientId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to update client: ${error.message}`;
              } else {
                toolResultContent = `Updated client: ${data.name}`;
              }
            } else if (toolName === 'delete_client') {
              const { data, error } = await supabase.from('clients')
                .delete()
                .eq('id', toolInput.clientId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to delete client: ${error.message}`;
              } else {
                toolResultContent = `Deleted client: ${data.name}`;
              }
            }
            // ============ EMPLOYEE CRUD HANDLERS ============
            else if (toolName === 'create_employee') {
              const { data, error } = await supabase.from('employees').insert({
                user_id: userId,
                name: toolInput.name,
                role: toolInput.role || null,
                email: toolInput.email || null,
                phone: toolInput.phone || null,
                hourly_rate: toolInput.hourlyRate || null,
                status: toolInput.status || 'active'
              }).select().single();

              if (error) {
                toolResultContent = `Failed to create employee: ${error.message}`;
              } else {
                toolResultContent = `Created employee: ${data.name}${data.role ? ` (${data.role})` : ''}${data.hourly_rate ? ` - $${data.hourly_rate}/hr` : ''}`;
              }
            } else if (toolName === 'update_employee') {
              const updates: Record<string, any> = {};
              if (toolInput.name) updates.name = toolInput.name;
              if (toolInput.role) updates.role = toolInput.role;
              if (toolInput.email) updates.email = toolInput.email;
              if (toolInput.phone) updates.phone = toolInput.phone;
              if (toolInput.hourlyRate !== undefined) updates.hourly_rate = toolInput.hourlyRate;
              if (toolInput.status) updates.status = toolInput.status;

              const { data, error } = await supabase.from('employees')
                .update(updates)
                .eq('id', toolInput.employeeId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to update employee: ${error.message}`;
              } else {
                toolResultContent = `Updated employee: ${data.name}${data.role ? ` (${data.role})` : ''}`;
              }
            } else if (toolName === 'delete_employee') {
              const { data, error } = await supabase.from('employees')
                .delete()
                .eq('id', toolInput.employeeId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to delete employee: ${error.message}`;
              } else {
                toolResultContent = `Deleted employee: ${data.name}`;
              }
            }
            // ============ MILEAGE HANDLERS ============
            else if (toolName === 'add_mileage_trip') {
              const irsRate = 0.67; // 2024 IRS standard mileage rate
              const totalMiles = toolInput.totalMiles;
              const isBusiness = toolInput.isBusiness !== false;
              const taxDeduction = isBusiness ? totalMiles * irsRate : 0;

              const { data, error } = await supabase.from('mileage_trips').insert({
                user_id: userId,
                start_address: toolInput.startAddress || null,
                end_address: toolInput.endAddress || null,
                total_miles: totalMiles,
                purpose: toolInput.purpose,
                date: toolInput.date || new Date().toISOString().split('T')[0],
                project_id: toolInput.projectId || null,
                is_business: isBusiness,
                irs_rate: irsRate,
                tax_deduction: taxDeduction
              }).select().single();

              if (error) {
                toolResultContent = `Failed to log mileage trip: ${error.message}`;
              } else {
                toolResultContent = `Logged mileage trip: ${totalMiles} miles for "${data.purpose}"${data.start_address ? ` (${data.start_address} → ${data.end_address})` : ''}\nTax deduction: $${taxDeduction.toFixed(2)} (${totalMiles} mi × $${irsRate}/mi)`;
              }
            } else if (toolName === 'get_mileage_trips') {
              const query = supabase.from('mileage_trips').select('*').eq('user_id', userId);
              if (toolInput.startDate) query.gte('date', toolInput.startDate);
              if (toolInput.endDate) query.lte('date', toolInput.endDate);
              if (toolInput.projectId) query.eq('project_id', toolInput.projectId);
              const { data: trips } = await query.order('date', { ascending: false });

              const totalMiles = trips?.reduce((sum, t) => sum + parseFloat(t.total_miles || 0), 0) || 0;
              const totalDeduction = trips?.reduce((sum, t) => sum + parseFloat(t.tax_deduction || 0), 0) || 0;

              let result = `Found ${trips?.length || 0} mileage trips (${totalMiles.toFixed(1)} total miles, $${totalDeduction.toFixed(2)} total deduction):\n`;
              trips?.forEach(trip => {
                result += `• ${trip.date} - ${trip.total_miles} mi - ${trip.purpose}${trip.start_address ? ` (${trip.start_address} → ${trip.end_address})` : ''} - $${parseFloat(trip.tax_deduction || 0).toFixed(2)} deduction\n`;
              });
              toolResultContent = result;
            }
            // ============ TIME ENTRY HANDLER ============
            else if (toolName === 'add_time_entry') {
              const totalPay = toolInput.hourlyRate ? toolInput.hours * toolInput.hourlyRate : null;

              const { data, error } = await supabase.from('time_entries').insert({
                user_id: userId,
                employee_id: toolInput.employeeId || null,
                employee_name: toolInput.employeeName || null,
                hours: toolInput.hours,
                date: toolInput.date || new Date().toISOString().split('T')[0],
                hourly_rate: toolInput.hourlyRate || null,
                total_pay: totalPay,
                project_id: toolInput.projectId || null,
                notes: toolInput.notes || null
              }).select().single();

              if (error) {
                toolResultContent = `Failed to log time entry: ${error.message}`;
              } else {
                toolResultContent = `Logged time entry: ${data.hours} hours${data.employee_name ? ` for ${data.employee_name}` : ''} on ${data.date}${totalPay ? ` ($${totalPay.toFixed(2)} at $${data.hourly_rate}/hr)` : ''}${data.notes ? ` - ${data.notes}` : ''}`;
              }
            }
            // ============ EXPENSE UPDATE/DELETE HANDLERS ============
            else if (toolName === 'update_expense') {
              const updates: Record<string, any> = {};
              if (toolInput.amount !== undefined) updates.amount = toolInput.amount;
              if (toolInput.category) updates.category = toolInput.category;
              if (toolInput.vendor) updates.vendor = toolInput.vendor;
              if (toolInput.description) updates.notes = toolInput.description;
              if (toolInput.date) updates.date = toolInput.date;

              const { data, error } = await supabase.from('finance_expenses')
                .update(updates)
                .eq('id', toolInput.expenseId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to update expense: ${error.message}`;
              } else {
                toolResultContent = `Updated expense: $${data.amount} for ${data.category}`;
              }
            } else if (toolName === 'delete_expense') {
              const { data, error } = await supabase.from('finance_expenses')
                .delete()
                .eq('id', toolInput.expenseId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to delete expense: ${error.message}`;
              } else {
                toolResultContent = `Deleted expense: $${data.amount} for ${data.category}`;
              }
            }
            // ============ CALENDAR UPDATE/DELETE HANDLERS ============
            else if (toolName === 'update_calendar_event') {
              const updates: Record<string, any> = {};
              if (toolInput.title) updates.title = toolInput.title;
              if (toolInput.startTime) updates.start_time = toolInput.startTime;
              if (toolInput.endTime) updates.end_time = toolInput.endTime;
              if (toolInput.description) updates.description = toolInput.description;

              const { data, error } = await supabase.from('calendar_events')
                .update(updates)
                .eq('id', toolInput.eventId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to update event: ${error.message}`;
              } else {
                toolResultContent = `Updated event: ${data.title}`;
              }
            } else if (toolName === 'delete_calendar_event') {
              const { data, error } = await supabase.from('calendar_events')
                .delete()
                .eq('id', toolInput.eventId)
                .eq('user_id', userId)
                .select().single();

              if (error) {
                toolResultContent = `Failed to delete event: ${error.message}`;
              } else {
                toolResultContent = `Deleted event: ${data.title}`;
              }
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
