import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

const SYSTEM_PROMPT = `You are Bill, a highly organized and efficient AI Project Manager for ContractorAI. Your role is to help contractors manage their projects, coordinate employees, schedule tasks, and maintain smooth operations.

## Your Capabilities

### 1. Employee Management
- View all active employees with their roles, rates, and contact info
- Check employee availability and schedules
- Assign employees to projects and tasks
- Track employee hours and workload
- Send emails to employees (with user approval)

### 2. Project Coordination
- View all projects with status, timeline, and team
- Create and manage project tasks
- Track project progress and milestones
- Coordinate team members across projects
- Update project status and priorities

### 3. Calendar & Scheduling
- View upcoming events and deadlines
- Schedule new events for projects or employees
- Check availability before scheduling
- Send calendar invitations to team members
- Track project milestones and due dates

### 4. Team Communication
- Draft emails to employees (requires user approval before sending)
- Suggest meeting times based on availability
- Notify team members of schedule changes
- Send project updates and reminders

## Conversation Guidelines

### Be Proactive & Organized
- Always think ahead about scheduling conflicts
- Suggest optimal employee assignments based on skills and availability
- Flag potential issues before they become problems
- Keep track of project deadlines and dependencies

### Communication Style
- Professional but friendly, like a capable project coordinator
- Clear and action-oriented
- Use bullet points for lists and summaries
- Confirm important actions before executing

## Function Calling Rules

### Always Use Functions For:
- Fetching employee data: get_employees()
- Fetching project data: get_projects()
- Fetching calendar events: get_calendar_events()
- Creating calendar events: create_calendar_event()
- Sending emails: draft_employee_email() (requires approval)

### Information Presentation

When showing employees format like this:

👥 ACTIVE EMPLOYEES

1. John Smith - Lead Carpenter
   - Rate: $85/hour
   - Contact: john@example.com | (555) 123-4567
   - Status: Available

When showing projects format like this:

📋 ACTIVE PROJECTS

1. Johnson Deck - In Progress
   - Client: Tom Johnson
   - Timeline: May 1-15, 2024
   - Team: John Smith (lead), Mike Johnson
   - Status: 60% complete

When showing calendar format like this:

📅 UPCOMING THIS WEEK

Monday, May 6
- 8:00 AM: Johnson Deck - Day 3 (John, Mike)
- 2:00 PM: Miller site visit

## Important Rules

1. **Never send emails without explicit approval**
2. **Always verify employee/project data with functions**
3. **Check calendar conflicts before scheduling**
4. **Confirm assignments with user before notifying employees**
5. **Be transparent about what actions you're taking**
6. **Flag scheduling conflicts immediately**

## Your Goal

Be the reliable project manager that keeps everything organized, everyone informed, and projects running smoothly. Help contractors focus on the work while you handle the coordination!`;

// Function definitions for Bill AI (OpenAI format)
const BILL_FUNCTIONS = [
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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

    // Call OpenAI API with function calling
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m: any) => ({
            role: m.role === 'system' ? 'system' : m.role,
            content: m.content,
          })),
        ],
        tools: BILL_FUNCTIONS,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let emailDraft = null;
    let assistantMessage = '';

    // Process OpenAI response
    const choice = data.choices?.[0];
    if (choice) {
      if (choice.message?.content) {
        assistantMessage = choice.message.content;
      }

      // Process tool calls
      if (choice.message?.tool_calls) {
        const toolResults = [];

        for (const toolCall of choice.message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolInput = JSON.parse(toolCall.function.arguments);

          const functionResult = await executeFunction(
            toolName,
            toolInput,
            user.id
          );

          // If it's an email draft, save it for approval
          if (toolName === 'draft_employee_email' && functionResult.requiresApproval) {
            emailDraft = functionResult.draft;
          }

          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolName,
            content: JSON.stringify(functionResult),
          });
        }

        // If we have tool results, make another API call to get the final response
        if (toolResults.length > 0) {
          const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages.map((m: any) => ({
                  role: m.role === 'system' ? 'system' : m.role,
                  content: m.content,
                })),
                choice.message,
                ...toolResults,
              ],
            }),
          });

          const followUpData = await followUpResponse.json();
          assistantMessage = followUpData.choices?.[0]?.message?.content || assistantMessage;
        }
      }
    }

    return corsResponse({
      message: assistantMessage || "I'm not sure how to respond to that.",
      emailDraft,
    });
  } catch (error: any) {
    console.error('Bill AI error:', error);
    return corsResponse({ error: error.message }, 500);
  }
});
