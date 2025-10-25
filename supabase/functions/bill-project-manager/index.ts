import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

// Helper function for CORS
function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

// Function definitions for Bill AI
const BILL_FUNCTIONS = [
  {
    name: 'get_employees',
    description: 'Get all active employees with their details, rates, and contact information',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'all'],
          description: 'Filter by employment status. Default is active.',
        },
      },
    },
  },
  {
    name: 'get_projects',
    description: 'Get all projects with their status, timeline, and team assignments',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'completed', 'scheduled', 'all'],
          description: 'Filter by project status. Default is active.',
        },
      },
    },
  },
  {
    name: 'get_calendar_events',
    description: 'Get calendar events within a date range',
    parameters: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format. Default is today.',
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format. Default is 7 days from start.',
        },
      },
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Create a new calendar event',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Event title',
        },
        description: {
          type: 'string',
          description: 'Event description (optional)',
        },
        start_date: {
          type: 'string',
          description: 'Start date and time in ISO format',
        },
        end_date: {
          type: 'string',
          description: 'End date and time in ISO format',
        },
        all_day: {
          type: 'boolean',
          description: 'Whether this is an all-day event',
        },
      },
      required: ['title', 'start_date', 'end_date'],
    },
  },
  {
    name: 'draft_employee_email',
    description: 'Draft an email to employees. This requires user approval before sending.',
    parameters: {
      type: 'object',
      properties: {
        recipients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses of recipients',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body content',
        },
      },
      required: ['recipients', 'subject', 'body'],
    },
  },
];

// Execute function calls
async function executeFunction(functionName: string, args: any, userId: string) {
  console.log(`Executing function: ${functionName}`, args);

  switch (functionName) {
    case 'get_employees': {
      const status = args.status || 'active';
      let query = supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return { employees: data };
    }

    case 'get_projects': {
      const status = args.status || 'active';
      let query = supabase
        .from('projects')
        .select(`
          *,
          tasks(*)
        `)
        .eq('user_id', userId);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return { projects: data };
    }

    case 'get_calendar_events': {
      const startDate = args.start_date || new Date().toISOString().split('T')[0];
      const endDate = args.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date');

      if (error) throw error;
      return { events: data };
    }

    case 'create_calendar_event': {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userId,
          title: args.title,
          description: args.description || '',
          start_date: args.start_date,
          end_date: args.end_date,
          all_day: args.all_day || false,
        })
        .select()
        .single();

      if (error) throw error;
      return { event: data, success: true };
    }

    case 'draft_employee_email': {
      // Don't actually send - just return the draft for approval
      return {
        draft: {
          id: crypto.randomUUID(),
          to: args.recipients,
          subject: args.subject,
          body: args.body,
        },
        requiresApproval: true,
      };
    }

    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    const { messages } = await req.json();

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return corsResponse({ error: 'Unauthorized' }, 401);
    }

    // Call Anthropic API with function calling
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.7,
        system: `You are Bill, an AI Project Manager for ContractorAI. Help contractors manage employees, projects, and schedules. Use the provided functions to access real data. Always be professional, organized, and proactive.`,
        messages: messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        tools: BILL_FUNCTIONS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    let result = await response.json();
    let emailDraft = null;

    // Handle function calls
    while (result.stop_reason === 'tool_use') {
      const toolUse = result.content.find((block: any) => block.type === 'tool_use');
      if (!toolUse) break;

      const functionResult = await executeFunction(
        toolUse.name,
        toolUse.input,
        user.id
      );

      // If it's an email draft, save it for approval
      if (toolUse.name === 'draft_employee_email' && functionResult.requiresApproval) {
        emailDraft = functionResult.draft;
      }

      // Continue conversation with function result
      const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0.7,
          system: `You are Bill, an AI Project Manager for ContractorAI. Help contractors manage employees, projects, and schedules.`,
          messages: [
            ...messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            {
              role: 'assistant',
              content: result.content,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(functionResult),
                },
              ],
            },
          ],
          tools: BILL_FUNCTIONS,
        }),
      });

      result = await followUpResponse.json();
    }

    // Extract text response
    const textBlock = result.content.find((block: any) => block.type === 'text');
    const message = textBlock?.text || "I'm not sure how to respond to that.";

    return corsResponse({
      message,
      emailDraft,
    });
  } catch (error: any) {
    console.error('Bill AI error:', error);
    return corsResponse({ error: error.message }, 500);
  }
});
