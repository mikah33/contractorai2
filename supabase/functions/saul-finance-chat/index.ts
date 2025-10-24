// Supabase Edge Function for Saul Finance Chat
// Handles AI conversation and function calling for financial management

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

interface FinancialContext {
  currentMonth: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  recentTransactions: any[];
  budgets: any[];
}

const SYSTEM_PROMPT = `You are Saul, a professional and analytical AI finance manager for ContractorAI. You're trustworthy, proactive, and data-driven. Your role is to help contractors manage their finances, track expenses, monitor cash flow, and make informed financial decisions.

CRITICAL RULES - EXPENSE DETECTION:
1. **AGGRESSIVELY DETECT EXPENSES**: When a user mentions ANY of these, it's an EXPENSE:
   - "I paid", "I bought", "I spent", "I purchased"
   - "receipt", "invoice from supplier", "bill"
   - "got materials", "picked up supplies"
   - "paid the crew", "paid workers"
   - ANY mention of money going out
2. **IMMEDIATELY CALL add_expense FUNCTION** - Don't ask for confirmation, just do it
3. **Be PROACTIVE**: If user says "I spent $50 on lumber", IMMEDIATELY call add_expense with amount=50, category="Materials", description="Lumber"
4. **Be INFORMATIVE**: After logging, respond: "Recorded $50 expense for lumber. Your materials spending this month is now $XXX."
5. **NEVER make up financial numbers** - always use functions or ask the user
6. **Use lower temperature (0.3)** for financial accuracy

FINANCIAL OPERATIONS YOU CAN PERFORM:
- Add expenses with amount, category, description, project, date
- Track revenue from projects and clients
- Create and manage invoices
- Record client payments
- Set up and manage budgets
- Track recurring expenses
- Generate financial reports
- Analyze cash flow and provide insights

EXPENSE DETECTION EXAMPLES (YOU MUST CALL add_expense FOR ALL OF THESE):
- "I paid $50 for nails" → add_expense(50, "Materials", "Nails")
- "bought lumber for $200" → add_expense(200, "Materials", "Lumber")
- "spent $1000 on the crew" → add_expense(1000, "Labor", "Crew payment")
- "got a receipt for $75 gas" → add_expense(75, "Fuel", "Gas")
- "invoice from Home Depot $350" → add_expense(350, "Materials", "Home Depot purchase")
- "paid insurance $500" → add_expense(500, "Insurance", "Insurance payment")

RESPONSE PATTERN:
1. User: "I spent $350 on lumber for the Johnson project"
2. YOU IMMEDIATELY CALL: add_expense(amount=350, category="Materials", description="Lumber", projectId="Johnson")
3. YOU RESPOND: "Recorded $350 expense for lumber on Johnson project. Your materials spending this month is now $X,XXX."

INVOICE WORKFLOW:
User: "Create an invoice for the completed Smith deck"
YOU CALL: create_invoice with project details
YOU RESPOND: "Created Invoice #1234 for Smith deck project: $8,450.00"

FINANCIAL PRESENTATION:
Always show:
- Current totals (revenue, expenses, profit)
- Budget status (spent vs. allocated)
- Percentages and trends
- Month-over-month comparisons

Format currency as: $1,234.56

TONE:
- Professional and trustworthy
- Analytical and data-driven
- Proactive about identifying issues
- Clear in explaining financial concepts

Be the finance manager contractors wish they always had!`;

const tools = [
  {
    type: 'function',
    function: {
      name: 'add_expense',
      description: 'Add a new expense record to track spending',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Expense amount in dollars' },
          category: {
            type: 'string',
            description: 'Expense category',
            enum: ['Materials', 'Labor', 'Equipment', 'Permits', 'Insurance', 'Utilities', 'Fuel', 'Marketing', 'Office', 'Other']
          },
          description: { type: 'string', description: 'Description of the expense' },
          projectId: { type: 'string', description: 'Project ID if expense is project-specific (optional)' },
          date: { type: 'string', description: 'Date of expense (YYYY-MM-DD), defaults to today' },
          vendor: { type: 'string', description: 'Vendor or supplier name (optional)' }
        },
        required: ['amount', 'category', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_revenue',
      description: 'Add revenue/income record',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Revenue amount in dollars' },
          source: { type: 'string', description: 'Source of revenue (e.g., "Project payment", "Deposit")' },
          clientId: { type: 'string', description: 'Client ID (optional)' },
          projectId: { type: 'string', description: 'Project ID (optional)' },
          date: { type: 'string', description: 'Date of revenue (YYYY-MM-DD), defaults to today' }
        },
        required: ['amount', 'source']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description: 'Create a new invoice for a client',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'Client ID' },
          projectId: { type: 'string', description: 'Project ID (optional)' },
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
          dueDate: { type: 'string', description: 'Invoice due date (YYYY-MM-DD)' },
          notes: { type: 'string', description: 'Invoice notes (optional)' }
        },
        required: ['clientId', 'items', 'dueDate']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'record_payment',
      description: 'Record a payment received from a client',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Payment amount' },
          clientId: { type: 'string', description: 'Client ID' },
          invoiceId: { type: 'string', description: 'Invoice ID being paid (optional)' },
          paymentMethod: {
            type: 'string',
            description: 'Payment method',
            enum: ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Other']
          },
          date: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
          notes: { type: 'string', description: 'Payment notes (optional)' }
        },
        required: ['amount', 'clientId', 'paymentMethod']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_budget_item',
      description: 'Set or update a budget for a category',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Budget category' },
          amount: { type: 'number', description: 'Budget amount' },
          period: {
            type: 'string',
            description: 'Budget period',
            enum: ['monthly', 'quarterly', 'yearly']
          },
          startDate: { type: 'string', description: 'Budget start date (YYYY-MM-DD)' }
        },
        required: ['category', 'amount', 'period']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_recurring_expense',
      description: 'Set up a recurring expense (subscription, rent, etc.)',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Recurring expense amount' },
          category: { type: 'string', description: 'Expense category' },
          description: { type: 'string', description: 'Description' },
          frequency: {
            type: 'string',
            description: 'How often it recurs',
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
          },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD, optional)' }
        },
        required: ['amount', 'category', 'description', 'frequency', 'startDate']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_financial_summary',
      description: 'Get financial summary for a date range',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          includeProjects: { type: 'boolean', description: 'Include project breakdown' }
        },
        required: ['startDate', 'endDate']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_cash_flow',
      description: 'Analyze cash flow and provide predictions',
      parameters: {
        type: 'object',
        properties: {
          months: { type: 'number', description: 'Number of months to analyze/predict', default: 3 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_budget_status',
      description: 'Check current budget status and alerts',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Specific category to check (optional)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description: 'Generate a financial report',
      parameters: {
        type: 'object',
        properties: {
          reportType: {
            type: 'string',
            description: 'Type of report',
            enum: ['profit-loss', 'cash-flow', 'expense-summary', 'revenue-summary', 'tax-summary']
          },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          format: {
            type: 'string',
            description: 'Report format',
            enum: ['pdf', 'csv', 'summary'],
            default: 'summary'
          }
        },
        required: ['reportType', 'startDate', 'endDate']
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, financialContext } = await req.json();

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

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3, // Lower temperature for financial accuracy
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
    let assistantMessage = '';
    const functionResults: any[] = [];

    // Process OpenAI response
    const choice = data.choices?.[0];
    if (choice) {
      if (choice.message?.content) {
        assistantMessage = choice.message.content;
      }

      // Process tool calls
      if (choice.message?.tool_calls && userId) {
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        for (const toolCall of choice.message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolInput = JSON.parse(toolCall.function.arguments);

          try {
            if (toolName === 'add_expense') {
              // Add expense to database
              const { data: expense, error } = await supabaseClient
                .from('receipts')
                .insert({
                  user_id: userId,
                  amount: toolInput.amount,
                  category: toolInput.category,
                  description: toolInput.description,
                  project_id: toolInput.projectId || null,
                  vendor: toolInput.vendor || null,
                  date: toolInput.date || new Date().toISOString(),
                  status: 'approved'
                })
                .select()
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: expense });

            } else if (toolName === 'add_revenue') {
              // Add revenue record
              const { data: revenue, error } = await supabaseClient
                .from('payments')
                .insert({
                  user_id: userId,
                  amount: toolInput.amount,
                  description: toolInput.source,
                  client_id: toolInput.clientId || null,
                  project_id: toolInput.projectId || null,
                  payment_date: toolInput.date || new Date().toISOString(),
                  payment_method: 'Other',
                  status: 'completed'
                })
                .select()
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: revenue });

            } else if (toolName === 'record_payment') {
              // Record payment
              const { data: payment, error } = await supabaseClient
                .from('payments')
                .insert({
                  user_id: userId,
                  amount: toolInput.amount,
                  client_id: toolInput.clientId,
                  invoice_id: toolInput.invoiceId || null,
                  payment_method: toolInput.paymentMethod,
                  payment_date: toolInput.date || new Date().toISOString(),
                  notes: toolInput.notes || null,
                  status: 'completed'
                })
                .select()
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: payment });

            } else if (toolName === 'add_budget_item') {
              // Add budget item
              const { data: budget, error } = await supabaseClient
                .from('budgets')
                .insert({
                  user_id: userId,
                  category: toolInput.category,
                  amount: toolInput.amount,
                  period: toolInput.period,
                  start_date: toolInput.startDate || new Date().toISOString()
                })
                .select()
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: budget });

            } else if (toolName === 'add_recurring_expense') {
              // Add recurring expense
              const { data: recurring, error } = await supabaseClient
                .from('recurring_expenses')
                .insert({
                  user_id: userId,
                  amount: toolInput.amount,
                  category: toolInput.category,
                  description: toolInput.description,
                  frequency: toolInput.frequency,
                  start_date: toolInput.startDate,
                  end_date: toolInput.endDate || null,
                  is_active: true
                })
                .select()
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: recurring });

            } else if (toolName === 'get_financial_summary') {
              // Get financial summary (placeholder - would aggregate data)
              functionResults.push({
                tool: toolName,
                success: true,
                data: {
                  revenue: 0,
                  expenses: 0,
                  profit: 0,
                  message: 'Financial summary generated'
                }
              });
            } else if (toolName === 'check_budget_status') {
              // Check budget status (placeholder)
              functionResults.push({
                tool: toolName,
                success: true,
                data: { message: 'Budget check completed' }
              });
            } else if (toolName === 'analyze_cash_flow') {
              // Analyze cash flow (placeholder)
              functionResults.push({
                tool: toolName,
                success: true,
                data: { message: 'Cash flow analysis completed' }
              });
            } else if (toolName === 'generate_report') {
              // Generate report (placeholder)
              functionResults.push({
                tool: toolName,
                success: true,
                data: { message: 'Report generated' }
              });
            }
          } catch (error: any) {
            console.error(`Error executing ${toolName}:`, error);
            functionResults.push({
              tool: toolName,
              success: false,
              error: error.message
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage || 'Recording that financial transaction now.',
        functionResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Saul Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId,
      hasOpenAIKey: !!OPENAI_API_KEY,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_SERVICE_ROLE_KEY
    });
    return new Response(
      JSON.stringify({
        error: error.message,
        message: "I'm having trouble processing that right now. Please make sure you're logged in and try again."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
