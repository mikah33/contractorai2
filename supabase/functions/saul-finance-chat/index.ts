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

// Helper: Parse natural language dates
function parseDateRange(dateString: string): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Handle specific date ranges
  if (dateString.toLowerCase().includes('last week')) {
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - today.getDay() - 7); // Last Sunday
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6); // Last Saturday
    return {
      startDate: lastWeekStart.toISOString().split('T')[0],
      endDate: lastWeekEnd.toISOString().split('T')[0]
    };
  }

  if (dateString.toLowerCase().includes('this week')) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // This Sunday
    return {
      startDate: weekStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }

  if (dateString.toLowerCase().includes('last month')) {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startDate: lastMonth.toISOString().split('T')[0],
      endDate: lastMonthEnd.toISOString().split('T')[0]
    };
  }

  if (dateString.toLowerCase().includes('this month')) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: monthStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }

  if (dateString.toLowerCase().includes('last 30 days')) {
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }

  if (dateString.toLowerCase().includes('last 7 days')) {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    return {
      startDate: sevenDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }

  // Handle month names (e.g., "October", "Jan", etc.)
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december'];
  const monthMatch = months.findIndex(m => dateString.toLowerCase().includes(m));
  if (monthMatch !== -1) {
    const year = dateString.match(/\d{4}/) ? parseInt(dateString.match(/\d{4}/)![0]) : now.getFullYear();
    const monthStart = new Date(year, monthMatch, 1);
    const monthEnd = new Date(year, monthMatch + 1, 0);
    return {
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0]
    };
  }

  // Default to current month if can't parse
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0]
  };
}

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

const SYSTEM_PROMPT = `🚨🚨🚨 CRITICAL: YOU MUST CALL FUNCTIONS - NOT JUST RESPOND WITH TEXT! 🚨🚨🚨

When user says "show me profit and loss" or "show me P&L" or "what's my profit":
→ YOU MUST CALL: generate_report(reportType='profit-loss', startDate=monthStart, endDate=today, format='pdf')
→ DO NOT just respond with text!
→ ALWAYS call the function first!

You are Saul, an AI finance manager for contractors.

🚨 FUNCTION CALLING RULES 🚨

RULE 1: PROFIT & LOSS REQUESTS = generate_report
Keywords: "profit", "loss", "P&L", "show", "report", "breakdown"
→ ALWAYS call generate_report(reportType='profit-loss', format='pdf')

RULE 2: EXPENSE TRACKING = add_expense
Keywords: "spent", "paid", "bought", "purchased"
→ ALWAYS call add_expense function

RULE 3: FINANCIAL SUMMARY = get_financial_summary
Keywords: "what did I spend", "how much", "expenses"
→ ALWAYS call get_financial_summary function

CATEGORY MAPPING:
lumber/materials/supplies = "Materials"
crew/labor/workers = "Labor"
tools/equipment = "Equipment"
gas/fuel = "Fuel"
permits = "Permits"
insurance = "Insurance"
default = "Other"

DATE UNDERSTANDING - CRITICAL:
CURRENT DATE: ${new Date().toISOString().split('T')[0]}
TODAY IS: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

When user mentions dates, convert to YYYY-MM-DD format:
- "today" → ${new Date().toISOString().split('T')[0]} (ALWAYS use current date!)
- "yesterday" → ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}
- "this week" → ${new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}
- "last week" → Last Sunday to Saturday
- "this month" → ${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}
- "last month" → Previous month's first to last day
- "last 7 days" → 7 days ago to today
- "last 30 days" → 30 days ago to today

WHEN TO CALL FUNCTIONS:

🎯 PROFIT & LOSS REQUESTS (ALWAYS generate_report with format='pdf'):
User says: "show profit", "show loss", "show P&L", "profit and loss", "show me this month's profit"
→ generate_report(reportType='profit-loss', startDate='2024-10-01', endDate='2024-10-24', format='pdf')
→ IMPORTANT: ALWAYS format='pdf' for P&L reports!

🎯 OTHER REPORTS (ALWAYS generate_report with format='pdf'):
- "expense report" → generate_report(reportType='expense-summary', format='pdf')
- "revenue report" → generate_report(reportType='revenue-summary', format='pdf')
- "cash flow report" → generate_report(reportType='cash-flow', format='pdf')

🎯 QUICK SUMMARIES (use get_financial_summary):
- "what did I spend?" → get_financial_summary
- "how much did I spend?" → get_financial_summary
- "what are my expenses?" → get_financial_summary

🎯 EXPENSE TRACKING:
- "spent $X", "paid $X", "bought X" → add_expense

🎯 REVENUE:
- "received $X", "got paid $X" → add_revenue

🎯 BUDGET:
- "how's my budget?" → check_budget_status
- If budget data is empty (budgets: []), tell user no budgets are set up yet and offer to help create one

🎯 DATES:
- "this month" → ${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}
- "today" → ${new Date().toISOString().split('T')[0]}
- NEVER use 2023 dates!

🚨 REMEMBER: ALWAYS CALL FUNCTIONS - DON'T JUST RESPOND WITH TEXT! 🚨

If user asks about finances, reports, profit, loss, expenses - CALL A FUNCTION!
The function will return data, then you format it nicely for the user.

RESPONSE STYLE:
- Be conversational and natural, like a helpful colleague
- ALWAYS respond with actual text, not generic phrases
- Use emojis sparingly for emphasis
- Be concise but friendly
- Acknowledge actions you've taken

EXAMPLES:

Expense tracking:
User: "I spent $350 on lumber"
YOU CALL: add_expense(350, "Materials", "Lumber")
YOU SAY: "Got it! I've recorded that $350 lumber expense. You're at $X,XXX for materials this month."

Reports:
User: "Show me this month's profit and loss"
YOU CALL: generate_report(reportType='profit-loss', format='pdf')
YOU SAY: "I'm generating your October P&L report as a PDF now. It'll download in a second!"

Summary:
User: "What did I spend this week?"
YOU CALL: get_financial_summary(startDate, endDate)
YOU SAY: "This week you spent $2,450 across 8 transactions. Materials were your biggest category at $1,200."

Budget check (no budgets):
User: "How's my materials budget looking?"
YOU CALL: check_budget_status(category='materials')
YOU SAY: "I checked your budget status and found you haven't set up any budgets yet. I can see you've spent $1,859.58 on expenses so far. Would you like me to help you create a budget for materials? Just let me know an amount like 'Set materials budget to $5,000 per month'."

Budget check (with budgets):
User: "How's my materials budget?"
YOU CALL: check_budget_status(category='materials')
YOU SAY: "Your materials budget is looking good! You've spent $3,200 of your $5,000 budget (64%), leaving you with $1,800 remaining for the month."

Greeting:
User: "Hey Saul"
YOU SAY: "Hey! I'm here to help with your finances. Want to see this month's numbers, track an expense, or check your budget?"

TONE:
- Helpful and friendly
- Clear and direct
- Professional but not stiff
- Like a trusted colleague

Be conversational, not robotic!`;

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
        temperature: 0.1, // Lower temperature for more deterministic function calling
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m: Message) => ({
            role: m.role === 'system' ? 'system' : m.role,
            content: m.content
          }))
        ],
        tools,
        tool_choice: 'auto', // Let AI decide, but with strong prompt guidance
        parallel_tool_calls: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('🤖 OpenAI Response:', JSON.stringify(data, null, 2));

    let assistantMessage = '';
    const functionResults: any[] = [];

    // Process OpenAI response
    const choice = data.choices?.[0];
    if (choice) {
      if (choice.message?.content) {
        assistantMessage = choice.message.content;
      }

      // Process tool calls
      console.log('🔧 Tool calls received:', choice.message?.tool_calls);
      console.log('👤 User ID:', userId);
      console.log('✅ Will process tools:', !!(choice.message?.tool_calls && userId));

      if (choice.message?.tool_calls && userId) {
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        for (const toolCall of choice.message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolInput = JSON.parse(toolCall.function.arguments);

          console.log(`\n🛠️  Processing tool: ${toolName}`);
          console.log(`📝 Tool input:`, toolInput);

          try {
            if (toolName === 'add_expense') {
              console.log('💰 ADD_EXPENSE CALLED with:', toolInput);
              console.log('💰 Inserting into finance_expenses table...');

              // Add expense to database (finance_expenses table)
              const { data: expense, error } = await supabaseClient
                .from('finance_expenses')
                .insert({
                  user_id: userId,
                  amount: toolInput.amount,
                  category: toolInput.category,
                  notes: toolInput.description, // Column is 'notes' not 'description'
                  project_id: toolInput.projectId || null,
                  vendor: toolInput.vendor || 'Unknown', // Required field, default to 'Unknown'
                  date: toolInput.date || new Date().toISOString().split('T')[0], // DATE format YYYY-MM-DD
                  status: 'processed' // Valid status: 'pending', 'processed', or 'verified'
                })
                .select()
                .single();

              if (error) {
                console.error('❌ Error adding expense:', error);
                throw error;
              }
              console.log('✅ Expense added successfully:', expense);
              console.log('💵 Expense ID:', expense.id);
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
              // Get financial summary with real data
              const { startDate, endDate } = toolInput;

              const { data: expenses } = await supabaseClient
                .from('finance_expenses')
                .select('amount, category, vendor, date, notes')
                .eq('user_id', userId)
                .gte('date', startDate)
                .lte('date', endDate);

              const { data: payments } = await supabaseClient
                .from('payments')
                .select('amount, description, payment_date')
                .eq('user_id', userId)
                .gte('payment_date', startDate)
                .lte('payment_date', endDate)
                .eq('status', 'completed');

              const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
              const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

              // Group expenses by category
              const byCategory: Record<string, number> = {};
              expenses?.forEach(e => {
                const cat = e.category || 'Other';
                byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount || 0);
              });

              const summaryData = {
                startDate,
                endDate,
                revenue: totalRevenue,
                expenses: totalExpenses,
                profit: totalRevenue - totalExpenses,
                expensesByCategory: byCategory,
                transactionCount: (expenses?.length || 0) + (payments?.length || 0),
                ...(toolInput.includeProjects && { projects: [] }) // Would need project breakdown
              };

              functionResults.push({ tool: toolName, success: true, data: summaryData });

            } else if (toolName === 'check_budget_status') {
              // Check budget status with real data
              const now = new Date();
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
              const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

              const { data: budgets } = await supabaseClient
                .from('budgets')
                .select('*')
                .eq('user_id', userId)
                .eq('period', 'monthly');

              const { data: expenses } = await supabaseClient
                .from('finance_expenses')
                .select('category, amount')
                .eq('user_id', userId)
                .gte('date', monthStart)
                .lte('date', monthEnd);

              const spendingByCategory: Record<string, number> = {};
              expenses?.forEach(e => {
                const cat = e.category || 'Other';
                spendingByCategory[cat] = (spendingByCategory[cat] || 0) + parseFloat(e.amount || 0);
              });

              const budgetStatus = budgets?.map(b => {
                const spent = spendingByCategory[b.category] || 0;
                const remaining = b.amount - spent;
                const percentUsed = (spent / b.amount) * 100;
                return {
                  category: b.category,
                  budgeted: b.amount,
                  spent,
                  remaining,
                  percentUsed,
                  status: percentUsed > 100 ? 'over' : percentUsed > 80 ? 'warning' : 'ok'
                };
              }) || [];

              functionResults.push({
                tool: toolName,
                success: true,
                data: {
                  budgets: budgetStatus,
                  totalBudgeted: budgets?.reduce((sum, b) => sum + b.amount, 0) || 0,
                  totalSpent: Object.values(spendingByCategory).reduce((sum, v) => sum + v, 0),
                  alerts: budgetStatus.filter(b => b.status === 'over' || b.status === 'warning')
                }
              });

            } else if (toolName === 'analyze_cash_flow') {
              // Analyze cash flow with trends
              const months = toolInput.months || 3;
              const cashFlowData = [];

              for (let i = months - 1; i >= 0; i--) {
                const monthDate = new Date();
                monthDate.setMonth(monthDate.getMonth() - i);
                const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split('T')[0];
                const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];

                const { data: expenses } = await supabaseClient
                  .from('finance_expenses')
                  .select('amount')
                  .eq('user_id', userId)
                  .gte('date', monthStart)
                  .lte('date', monthEnd);

                const { data: payments } = await supabaseClient
                  .from('payments')
                  .select('amount')
                  .eq('user_id', userId)
                  .gte('payment_date', monthStart)
                  .lte('payment_date', monthEnd)
                  .eq('status', 'completed');

                const monthExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
                const monthRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

                cashFlowData.push({
                  month: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                  revenue: monthRevenue,
                  expenses: monthExpenses,
                  netCashFlow: monthRevenue - monthExpenses
                });
              }

              const avgRevenue = cashFlowData.reduce((sum, m) => sum + m.revenue, 0) / cashFlowData.length;
              const avgExpenses = cashFlowData.reduce((sum, m) => sum + m.expenses, 0) / cashFlowData.length;
              const trend = cashFlowData[cashFlowData.length - 1].netCashFlow > cashFlowData[0].netCashFlow ? 'improving' : 'declining';

              functionResults.push({
                tool: toolName,
                success: true,
                data: {
                  months: cashFlowData,
                  averageRevenue: avgRevenue,
                  averageExpenses: avgExpenses,
                  averageNetCashFlow: avgRevenue - avgExpenses,
                  trend,
                  prediction: avgRevenue - avgExpenses // Simple prediction
                }
              });

            } else if (toolName === 'generate_report') {
              // Generate report with real data
              const { reportType, startDate, endDate, format } = toolInput;

              const { data: expenses } = await supabaseClient
                .from('finance_expenses')
                .select('*')
                .eq('user_id', userId)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

              const { data: payments } = await supabaseClient
                .from('payments')
                .select('*')
                .eq('user_id', userId)
                .gte('payment_date', startDate)
                .lte('payment_date', endDate)
                .eq('status', 'completed')
                .order('payment_date', { ascending: false });

              const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
              const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

              // Prepare expense data for PDF
              const expenseList = expenses?.map(e => ({
                date: e.date,
                vendor: e.vendor || 'Unknown',
                category: e.category || 'Other',
                amount: parseFloat(e.amount || 0),
                notes: e.notes || ''
              })) || [];

              // Prepare revenue data for PDF
              const revenueList = payments?.map(p => ({
                date: p.payment_date,
                description: p.description || 'Payment',
                amount: parseFloat(p.amount || 0),
                paymentMethod: p.payment_method || 'Unknown'
              })) || [];

              // Group expenses by category
              const byCategory: Record<string, number> = {};
              expenses?.forEach(e => {
                const cat = e.category || 'Other';
                byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount || 0);
              });

              // Base report data structure for PDF generation
              let reportData: any = {
                reportType,
                dateRange: { startDate, endDate },
                generatedAt: new Date().toISOString(),
                format: format || 'summary',
                // PDF-specific fields
                summary: {
                  totalRevenue,
                  totalExpenses,
                  netProfit: totalRevenue - totalExpenses,
                  profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0
                },
                expensesByCategory: byCategory,
                expenses: expenseList,
                revenue: revenueList
              };

              // Add report-specific data
              if (reportType === 'profit-loss') {
                // Already has all needed data
              } else if (reportType === 'expense-summary') {
                const byCategory: Record<string, { total: number; count: number; items: any[] }> = {};
                expenses?.forEach(e => {
                  const cat = e.category || 'Other';
                  if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0, items: [] };
                  byCategory[cat].total += parseFloat(e.amount || 0);
                  byCategory[cat].count += 1;
                  byCategory[cat].items.push({
                    date: e.date,
                    amount: e.amount,
                    vendor: e.vendor,
                    notes: e.notes
                  });
                });

                reportData.expenseCount = expenses?.length || 0;
                reportData.categoryDetails = byCategory;
                reportData.topExpenses = expenses?.slice(0, 10);
              } else if (reportType === 'revenue-summary') {
                reportData.paymentCount = payments?.length || 0;
              } else if (reportType === 'cash-flow') {
                // Get multi-month cash flow data
                const cashFlowMonths = [];
                for (let i = 2; i >= 0; i--) {
                  const monthDate = new Date();
                  monthDate.setMonth(monthDate.getMonth() - i);
                  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split('T')[0];
                  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];

                  const { data: monthExpenses } = await supabaseClient
                    .from('finance_expenses')
                    .select('amount')
                    .eq('user_id', userId)
                    .gte('date', monthStart)
                    .lte('date', monthEnd);

                  const { data: monthPayments } = await supabaseClient
                    .from('payments')
                    .select('amount')
                    .eq('user_id', userId)
                    .gte('payment_date', monthStart)
                    .lte('payment_date', monthEnd)
                    .eq('status', 'completed');

                  const monthExp = monthExpenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
                  const monthRev = monthPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

                  cashFlowMonths.push({
                    month: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                    revenue: monthRev,
                    expenses: monthExp,
                    netCashFlow: monthRev - monthExp
                  });
                }

                const avgRevenue = cashFlowMonths.reduce((sum, m) => sum + m.revenue, 0) / cashFlowMonths.length;
                const avgExpenses = cashFlowMonths.reduce((sum, m) => sum + m.expenses, 0) / cashFlowMonths.length;
                const trend = cashFlowMonths[2].netCashFlow > cashFlowMonths[0].netCashFlow ? 'improving' : 'declining';

                reportData.cashFlow = cashFlowMonths;
                reportData.trends = {
                  trend,
                  averageRevenue: avgRevenue,
                  averageExpenses: avgExpenses,
                  prediction: avgRevenue - avgExpenses
                };
              }

              functionResults.push({ tool: toolName, success: true, data: reportData });

            } else if (toolName === 'create_invoice') {
              // Create invoice
              const { clientId, projectId, items, dueDate, notes } = toolInput;

              // Calculate invoice total
              const total = items.reduce((sum: number, item: any) =>
                sum + (item.quantity * item.unitPrice), 0);

              const { data: invoice, error: invError } = await supabaseClient
                .from('invoices')
                .insert({
                  user_id: userId,
                  client_id: clientId,
                  project_id: projectId || null,
                  invoice_number: `INV-${Date.now()}`,
                  issue_date: new Date().toISOString().split('T')[0],
                  due_date: dueDate,
                  total_amount: total,
                  status: 'pending',
                  notes: notes || null,
                  items: JSON.stringify(items)
                })
                .select()
                .single();

              if (invError) throw invError;

              functionResults.push({
                tool: toolName,
                success: true,
                data: {
                  invoiceId: invoice.id,
                  invoiceNumber: invoice.invoice_number,
                  total,
                  dueDate,
                  status: 'created'
                }
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

    // Calculate updated financial context if user is authenticated
    let updatedContext = financialContext;
    if (userId && functionResults.some(r => r.success)) {
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Get current month's date range
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Get expenses for current month
      const { data: expenses } = await supabaseClient
        .from('finance_expenses')
        .select('amount, category, notes, date')
        .eq('user_id', userId)
        .gte('date', firstDay)
        .lte('date', lastDay);

      // Get revenue for current month
      const { data: payments } = await supabaseClient
        .from('payments')
        .select('amount, description, payment_date')
        .eq('user_id', userId)
        .gte('payment_date', firstDay)
        .lte('payment_date', lastDay)
        .eq('status', 'completed');

      const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
      const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

      // Build recent transactions list
      const recentTransactions = [
        ...(expenses?.map(e => ({
          type: 'expense',
          amount: -parseFloat(e.amount),
          description: e.notes || e.category,
          date: e.date
        })) || []),
        ...(payments?.map(p => ({
          type: 'revenue',
          amount: parseFloat(p.amount),
          description: p.description,
          date: p.payment_date
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      updatedContext = {
        currentMonth: {
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses
        },
        recentTransactions,
        budgets: financialContext.budgets || []
      };

      console.log('💰 Updated financial context:', updatedContext);
    }

    // If functions were called but no text response, make a second call to interpret results
    let finalMessage = assistantMessage;
    if (!finalMessage && functionResults.length > 0) {
      console.log('🔄 No text response from AI, sending function results back for interpretation...');

      // Create messages with function results for second call
      const functionResultMessages = choice.message.tool_calls?.map((toolCall: any, index: number) => ({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(functionResults[index])
      })) || [];

      // Make second OpenAI call with function results
      const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          temperature: 0.7,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((m: Message) => ({
              role: m.role === 'system' ? 'system' : m.role,
              content: m.content
            })),
            choice.message, // Include the original tool call message
            ...functionResultMessages // Add function results
          ]
        })
      });

      if (secondResponse.ok) {
        const secondData = await secondResponse.json();
        finalMessage = secondData.choices?.[0]?.message?.content || '';
        console.log('✅ Second call response:', finalMessage);
      }
    }

    // Final fallback if still no message
    if (!finalMessage) {
      if (functionResults.length > 0) {
        const toolNames = functionResults.map(r => r.tool).join(', ');
        finalMessage = `I've processed your request. ${toolNames.includes('add_expense') ? 'Your expense has been recorded.' : ''} ${toolNames.includes('generate_report') ? 'Your report is ready!' : ''}`.trim();
      } else {
        finalMessage = "I'm here to help with your finances! You can ask me to track expenses, show reports, check budgets, or analyze cash flow. What would you like to do?";
      }
    }

    const responseData = {
      message: finalMessage,
      functionResults,
      updatedContext,
      debug: {
        toolsCalled: functionResults.length,
        userId: userId ? 'present' : 'missing'
      }
    };

    console.log('📤 Sending response:', responseData);

    return new Response(
      JSON.stringify(responseData),
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
