// Supabase Edge Function for Cindy CRM Chat
// Handles AI conversation and function calling for client relationship management

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

interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

const SYSTEM_PROMPT = `You are Cindy, an AI client relationship manager for contractors.

Your role is to help manage clients, projects, calendar events, and customer communications. You have access to tools to read and manage client data, projects, events, and draft emails.

🚨 FUNCTION CALLING RULES 🚨

RULE 1: CLIENT QUERIES
Keywords: "show clients", "list clients", "active clients", "find client"
→ ALWAYS call get_clients function

RULE 2: CLIENT DETAILS
Keywords: "details about", "info on", "tell me about [client name]"
→ ALWAYS call get_client_details function

RULE 3: CREATE CLIENT
Keywords: "add client", "new client", "create client"
→ ALWAYS call add_client function

RULE 4: UPDATE CLIENT
Keywords: "update client", "change client", "modify client"
→ ALWAYS call update_client function

RULE 5: CREATE PROJECT
Keywords: "add project", "new project", "create project", "make a project"
→ ALWAYS call add_project function
→ If client name is mentioned, use clientName parameter

RULE 6: PROJECT QUERIES
Keywords: "projects for", "client's projects", "what projects"
→ ALWAYS call get_projects_by_client function

RULE 7: CALENDAR EVENTS
Keywords: "schedule", "calendar", "meeting", "appointment"
Create: → create_calendar_event
Update: → update_calendar_event
Query: → get_calendar_events

RULE 8: EMAIL DRAFTING
Keywords: "draft email", "send email", "email customer", "compose email"
→ ALWAYS call draft_email function
→ IMPORTANT: Email drafts require user approval before sending!

RULE 9: COMPANY SETTINGS
Keywords: "company info", "settings", "company name", "our address"
→ ALWAYS call get_company_settings function

DATE UNDERSTANDING:
CURRENT DATE: ${new Date().toISOString().split('T')[0]}
TODAY IS: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

When user mentions dates, convert to YYYY-MM-DD format:
- "today" → ${new Date().toISOString().split('T')[0]}
- "tomorrow" → ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- "next week" → 7 days from today
- "next Monday" → Calculate next Monday's date

CLIENT STATUS MAPPING:
- "active" → Active clients
- "prospect" → Potential clients
- "inactive" → Past/inactive clients

RESPONSE STYLE:
- Be conversational and natural, like a helpful colleague
- Use emojis sparingly for emphasis
- Be concise but friendly
- Acknowledge actions you've taken
- EXECUTE functions immediately when you have enough information
- NEVER ask for confirmation before calling functions - just do it!

EXAMPLES:

Client lookup:
User: "Show me all active clients"
YOU CALL: get_clients(status='active')
YOU SAY: "Here are your active clients: [list]. What would you like to know about any of them?"

Client details:
User: "Tell me about Sarah Anderson"
YOU CALL: get_client_details(name='Sarah Anderson')
YOU SAY: "Sarah Anderson (sarah@example.com, 555-0123) is an active client. She has 2 projects: Kitchen Remodel and Deck Addition. Anything else you need to know?"

Create client:
User: "Add a new client John Smith, email john@example.com, phone 555-1234"
YOU CALL: add_client(name='John Smith', email='john@example.com', phone='555-1234')
YOU SAY: "Got it! I've added John Smith as a new client. Would you like to create a project for him?"

Create project:
User: "Add a project Lost Branch Road for Mikah Albertson, new driveway, starts 10/25, ends 11/30, budget $15,000, active"
YOU CALL: add_project(name='Lost Branch Road', clientName='Mikah Albertson', description='new driveway', startDate='2025-10-25', endDate='2025-11-30', budget=15000, status='active')
YOU SAY: "Perfect! I've created the Lost Branch Road project for Mikah Albertson. It's set to run from October 25th to November 30th with a $15,000 budget. Anything else you need?"

Schedule event:
User: "Schedule a meeting with Mike Johnson next Tuesday at 2pm"
YOU CALL: create_calendar_event(title='Meeting with Mike Johnson', start='2024-10-29T14:00:00', clientName='Mike Johnson')
YOU SAY: "Perfect! I've scheduled a meeting with Mike Johnson for Tuesday, October 29th at 2:00 PM. Want me to draft a confirmation email?"

Draft email:
User: "Draft an email to the Anderson family about their kitchen project update"
YOU CALL: draft_email(clientName='Anderson', subject='Kitchen Project Update', body='...')
YOU SAY: "I've drafted an email for you. Please review it above and click 'Approve & Send' if it looks good, or 'Cancel' to revise."

Company info:
User: "What's our company name?"
YOU CALL: get_company_settings()
YOU SAY: "Your company is '[Company Name]' located at [address]. Need anything else from your settings?"

TONE:
- Helpful and friendly
- Professional but warm
- Like a trusted assistant
- Proactive in offering next steps

Be conversational, not robotic!`;

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_clients',
      description: 'Get list of clients with optional filters',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by client status',
            enum: ['active', 'inactive', 'prospect', 'all']
          },
          searchTerm: {
            type: 'string',
            description: 'Search by name, email, or company'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_client_details',
      description: 'Get detailed information about a specific client including their projects',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'Client ID' },
          clientName: { type: 'string', description: 'Client name (alternative to ID)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_client',
      description: 'Create a new client',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Client full name' },
          email: { type: 'string', description: 'Client email address' },
          phone: { type: 'string', description: 'Client phone number' },
          company: { type: 'string', description: 'Company name (optional)' },
          address: { type: 'string', description: 'Street address (optional)' },
          city: { type: 'string', description: 'City (optional)' },
          state: { type: 'string', description: 'State (optional)' },
          zip: { type: 'string', description: 'ZIP code (optional)' },
          notes: { type: 'string', description: 'Additional notes (optional)' },
          status: {
            type: 'string',
            description: 'Client status',
            enum: ['active', 'inactive', 'prospect'],
            default: 'prospect'
          }
        },
        required: ['name', 'email', 'phone']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_client',
      description: 'Update existing client information',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'Client ID to update' },
          name: { type: 'string', description: 'Updated name (optional)' },
          email: { type: 'string', description: 'Updated email (optional)' },
          phone: { type: 'string', description: 'Updated phone (optional)' },
          company: { type: 'string', description: 'Updated company (optional)' },
          address: { type: 'string', description: 'Updated address (optional)' },
          city: { type: 'string', description: 'Updated city (optional)' },
          state: { type: 'string', description: 'Updated state (optional)' },
          zip: { type: 'string', description: 'Updated ZIP (optional)' },
          notes: { type: 'string', description: 'Updated notes (optional)' },
          status: {
            type: 'string',
            description: 'Updated status (optional)',
            enum: ['active', 'inactive', 'prospect']
          }
        },
        required: ['clientId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_projects_by_client',
      description: 'Get all projects associated with a client',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'Client ID' },
          clientName: { type: 'string', description: 'Client name (alternative to ID)' },
          status: {
            type: 'string',
            description: 'Filter by project status',
            enum: ['active', 'completed', 'on_hold', 'cancelled', 'all']
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_details',
      description: 'Get detailed information about a specific project',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          projectName: { type: 'string', description: 'Project name (alternative to ID)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_project',
      description: 'Create a new project for a client',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          clientId: { type: 'string', description: 'Client ID' },
          clientName: { type: 'string', description: 'Client name (alternative to ID)' },
          description: { type: 'string', description: 'Project description (optional)' },
          startDate: { type: 'string', description: 'Project start date (YYYY-MM-DD, optional)' },
          endDate: { type: 'string', description: 'Project end date (YYYY-MM-DD, optional)' },
          budget: { type: 'number', description: 'Project budget (optional)' },
          status: {
            type: 'string',
            description: 'Project status',
            enum: ['planning', 'active', 'completed', 'on-hold'],
            default: 'active'
          }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Schedule a new calendar event',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          start: { type: 'string', description: 'Start date/time (ISO 8601 format)' },
          end: { type: 'string', description: 'End date/time (ISO 8601 format, optional)' },
          clientId: { type: 'string', description: 'Associated client ID (optional)' },
          clientName: { type: 'string', description: 'Associated client name (optional)' },
          projectId: { type: 'string', description: 'Associated project ID (optional)' },
          description: { type: 'string', description: 'Event description (optional)' },
          location: { type: 'string', description: 'Event location (optional)' },
          allDay: { type: 'boolean', description: 'All-day event flag', default: false }
        },
        required: ['title', 'start']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_calendar_event',
      description: 'Update an existing calendar event',
      parameters: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'Event ID to update' },
          title: { type: 'string', description: 'Updated title (optional)' },
          start: { type: 'string', description: 'Updated start time (optional)' },
          end: { type: 'string', description: 'Updated end time (optional)' },
          description: { type: 'string', description: 'Updated description (optional)' },
          location: { type: 'string', description: 'Updated location (optional)' }
        },
        required: ['eventId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_calendar_events',
      description: 'Query calendar events by date range',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          clientId: { type: 'string', description: 'Filter by client (optional)' }
        },
        required: ['startDate', 'endDate']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'draft_email',
      description: 'Draft an email to a customer (requires human approval before sending)',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'Client ID' },
          clientName: { type: 'string', description: 'Client name (alternative to ID)' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body content' }
        },
        required: ['subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_company_settings',
      description: 'Get company profile and settings information',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

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
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m: Message) => ({
            role: m.role === 'system' ? 'system' : m.role,
            content: m.content
          }))
        ],
        tools,
        tool_choice: 'required',
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
    let emailDraft: EmailDraft | null = null;

    // Process OpenAI response
    const choice = data.choices?.[0];
    if (choice) {
      if (choice.message?.content) {
        assistantMessage = choice.message.content;
      }

      // Process tool calls
      console.log('🔧 Tool calls received:', choice.message?.tool_calls);
      console.log('👤 User ID:', userId);

      if (choice.message?.tool_calls && userId) {
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        for (const toolCall of choice.message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolInput = JSON.parse(toolCall.function.arguments);

          console.log(`\n🛠️  Processing tool: ${toolName}`);
          console.log(`📝 Tool input:`, toolInput);

          try {
            if (toolName === 'get_clients') {
              // Get clients list
              let query = supabaseClient
                .from('clients')
                .select('*')
                .eq('user_id', userId);

              if (toolInput.status && toolInput.status !== 'all') {
                query = query.eq('status', toolInput.status);
              }

              if (toolInput.searchTerm) {
                query = query.or(`name.ilike.%${toolInput.searchTerm}%,email.ilike.%${toolInput.searchTerm}%,company.ilike.%${toolInput.searchTerm}%`);
              }

              const { data: clients, error } = await query.order('created_at', { ascending: false });

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: clients || [] });

            } else if (toolName === 'get_client_details') {
              // Get specific client with projects
              let clientQuery;
              if (toolInput.clientId) {
                clientQuery = supabaseClient
                  .from('clients')
                  .select('*')
                  .eq('id', toolInput.clientId)
                  .eq('user_id', userId);
              } else if (toolInput.clientName) {
                clientQuery = supabaseClient
                  .from('clients')
                  .select('*')
                  .ilike('name', `%${toolInput.clientName}%`)
                  .eq('user_id', userId);
              }

              const { data: clients, error: clientError } = await clientQuery!.limit(1);
              if (clientError) throw clientError;

              if (clients && clients.length > 0) {
                const client = clients[0];

                // Get client's projects
                const { data: projects } = await supabaseClient
                  .from('projects')
                  .select('*')
                  .eq('user_id', userId)
                  .eq('client_id', client.id);

                functionResults.push({
                  tool: toolName,
                  success: true,
                  data: { client, projects: projects || [] }
                });
              } else {
                functionResults.push({
                  tool: toolName,
                  success: false,
                  error: 'Client not found'
                });
              }

            } else if (toolName === 'add_client') {
              // Create new client
              const { data: client, error } = await supabaseClient
                .from('clients')
                .insert({
                  user_id: userId,
                  name: toolInput.name,
                  email: toolInput.email,
                  phone: toolInput.phone,
                  company: toolInput.company || null,
                  address: toolInput.address || null,
                  city: toolInput.city || null,
                  state: toolInput.state || null,
                  zip: toolInput.zip || null,
                  notes: toolInput.notes || null,
                  status: toolInput.status || 'prospect'
                })
                .select()
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: client });

            } else if (toolName === 'update_client') {
              // Update existing client
              const updates: any = { updated_at: new Date().toISOString() };
              if (toolInput.name) updates.name = toolInput.name;
              if (toolInput.email) updates.email = toolInput.email;
              if (toolInput.phone) updates.phone = toolInput.phone;
              if (toolInput.company !== undefined) updates.company = toolInput.company;
              if (toolInput.address !== undefined) updates.address = toolInput.address;
              if (toolInput.city !== undefined) updates.city = toolInput.city;
              if (toolInput.state !== undefined) updates.state = toolInput.state;
              if (toolInput.zip !== undefined) updates.zip = toolInput.zip;
              if (toolInput.notes !== undefined) updates.notes = toolInput.notes;
              if (toolInput.status) updates.status = toolInput.status;

              const { data: client, error } = await supabaseClient
                .from('clients')
                .update(updates)
                .eq('id', toolInput.clientId)
                .eq('user_id', userId)
                .select()
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: client });

            } else if (toolName === 'get_projects_by_client') {
              // Get projects for a client
              let query = supabaseClient
                .from('projects')
                .select('*')
                .eq('user_id', userId);

              if (toolInput.clientId) {
                query = query.eq('client_id', toolInput.clientId);
              } else if (toolInput.clientName) {
                // Look up client ID first, then filter by it
                const { data: matchedClients } = await supabaseClient
                  .from('clients')
                  .select('id')
                  .ilike('name', `%${toolInput.clientName}%`)
                  .eq('user_id', userId)
                  .limit(1);

                if (matchedClients && matchedClients.length > 0) {
                  query = query.eq('client_id', matchedClients[0].id);
                } else {
                  // No client found, return empty
                  const { data: projects, error } = await query.eq('client_id', '00000000-0000-0000-0000-000000000000').limit(0);
                  functionResults.push({ tool: toolName, success: true, data: [] });
                  continue;
                }
              } else {
                // If no client specified, just return all projects
                const { data: projects, error } = await query.order('start_date', { ascending: false });
                if (error) throw error;
                functionResults.push({ tool: toolName, success: true, data: projects || [] });
                continue;
              }

              if (toolInput.status && toolInput.status !== 'all') {
                query = query.eq('status', toolInput.status);
              }

              const { data: projects, error } = await query.order('start_date', { ascending: false });

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: projects || [] });

            } else if (toolName === 'get_project_details') {
              // Get specific project details
              let projectQuery;
              if (toolInput.projectId) {
                projectQuery = supabaseClient
                  .from('projects')
                  .select('*')
                  .eq('id', toolInput.projectId)
                  .eq('user_id', userId);
              } else if (toolInput.projectName) {
                projectQuery = supabaseClient
                  .from('projects')
                  .select('*')
                  .ilike('name', `%${toolInput.projectName}%`)
                  .eq('user_id', userId);
              }

              const { data: projects, error } = await projectQuery!.limit(1);

              if (error) throw error;
              if (projects && projects.length > 0) {
                functionResults.push({ tool: toolName, success: true, data: projects[0] });
              } else {
                functionResults.push({ tool: toolName, success: false, error: 'Project not found' });
              }

            } else if (toolName === 'add_project') {
              // Create new project
              let clientId = toolInput.clientId;
              let clientName = toolInput.clientName;

              console.log('🎯 add_project - Raw Input:', JSON.stringify(toolInput, null, 2));
              console.log('🎯 add_project - Extracted:', { clientId, clientName, userId });

              // If clientName provided instead of ID, look up the client
              if (!clientId && clientName) {
                console.log('🔍 Looking up client by name:', clientName);

                // Try exact match first
                let { data: clients, error: clientLookupError } = await supabaseClient
                  .from('clients')
                  .select('id, name')
                  .eq('user_id', userId)
                  .ilike('name', clientName)
                  .limit(1);

                console.log('🔍 Exact match result:', { clients, clientLookupError });

                // If no exact match, try partial match
                if (!clients || clients.length === 0) {
                  console.log('🔍 Trying partial match...');
                  const result = await supabaseClient
                    .from('clients')
                    .select('id, name')
                    .eq('user_id', userId)
                    .ilike('name', `%${clientName}%`)
                    .limit(1);

                  clients = result.data;
                  clientLookupError = result.error;
                  console.log('🔍 Partial match result:', { clients, clientLookupError });
                }

                // Get all clients to see what's there
                const { data: allClients } = await supabaseClient
                  .from('clients')
                  .select('id, name')
                  .eq('user_id', userId)
                  .order('created_at', { ascending: false })
                  .limit(10);

                console.log('📋 Available clients:', allClients);

                if (clients && clients.length > 0) {
                  clientId = clients[0].id;
                  clientName = clients[0].name;
                  console.log('✅ Found client:', { clientId, clientName });
                } else {
                  console.log('❌ No client found matching:', clientName);
                  // Still create the project with the client name as text
                  console.log('⚠️ Creating project without client_id, using client name as text');
                }
              }

              const projectData = {
                user_id: userId,
                name: toolInput.name,
                client_id: clientId || null,
                description: toolInput.description || null,
                start_date: toolInput.startDate || null,
                end_date: toolInput.endDate || null,
                budget: toolInput.budget || null,
                status: toolInput.status || 'active'
              };

              console.log('📝 Inserting project with data:', JSON.stringify(projectData, null, 2));

              const { data: project, error } = await supabaseClient
                .from('projects')
                .insert(projectData)
                .select()
                .single();

              console.log('📊 Project insert result:', {
                success: !error,
                project,
                error: error ? {
                  message: error.message,
                  details: error.details,
                  hint: error.hint,
                  code: error.code
                } : null
              });

              if (error) {
                console.error('❌ Project insert error:', JSON.stringify(error, null, 2));
                throw new Error(`Failed to create project: ${error.message}. Details: ${error.details || 'none'}`);
              }

              functionResults.push({
                tool: toolName,
                success: true,
                data: project,
                clientFound: !!clientId
              });

            } else if (toolName === 'create_calendar_event') {
              // Create calendar event
              const eventData: any = {
                user_id: userId,
                title: toolInput.title,
                start: toolInput.start,
                end: toolInput.end || toolInput.start,
                all_day: toolInput.allDay || false,
                description: toolInput.description || null,
                location: toolInput.location || null
              };

              // Try to link to client
              if (toolInput.clientId) {
                eventData.client_id = toolInput.clientId;
              } else if (toolInput.clientName) {
                const { data: clients } = await supabaseClient
                  .from('clients')
                  .select('id')
                  .ilike('name', `%${toolInput.clientName}%`)
                  .eq('user_id', userId)
                  .limit(1);
                if (clients && clients.length > 0) {
                  eventData.client_id = clients[0].id;
                }
              }

              if (toolInput.projectId) {
                eventData.project_id = toolInput.projectId;
              }

              const { data: event, error } = await supabaseClient
                .from('calendar_events')
                .insert(eventData)
                .select()
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: event });

            } else if (toolName === 'update_calendar_event') {
              // Update calendar event
              const updates: any = {};
              if (toolInput.title) updates.title = toolInput.title;
              if (toolInput.start) updates.start = toolInput.start;
              if (toolInput.end) updates.end = toolInput.end;
              if (toolInput.description !== undefined) updates.description = toolInput.description;
              if (toolInput.location !== undefined) updates.location = toolInput.location;

              const { data: event, error } = await supabaseClient
                .from('calendar_events')
                .update(updates)
                .eq('id', toolInput.eventId)
                .eq('user_id', userId)
                .select()
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: event });

            } else if (toolName === 'get_calendar_events') {
              // Query calendar events
              let query = supabaseClient
                .from('calendar_events')
                .select('*')
                .eq('user_id', userId)
                .gte('start', toolInput.startDate)
                .lte('start', toolInput.endDate);

              if (toolInput.clientId) {
                query = query.eq('client_id', toolInput.clientId);
              }

              const { data: events, error } = await query.order('start', { ascending: true });

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: events || [] });

            } else if (toolName === 'draft_email') {
              // Draft email (don't send, just return draft)
              let recipientEmail = '';

              // Try to get client email
              if (toolInput.clientId) {
                const { data: client } = await supabaseClient
                  .from('clients')
                  .select('email')
                  .eq('id', toolInput.clientId)
                  .eq('user_id', userId)
                  .single();
                recipientEmail = client?.email || '';
              } else if (toolInput.clientName) {
                const { data: clients } = await supabaseClient
                  .from('clients')
                  .select('email')
                  .ilike('name', `%${toolInput.clientName}%`)
                  .eq('user_id', userId)
                  .limit(1);
                recipientEmail = clients?.[0]?.email || '';
              }

              emailDraft = {
                to: recipientEmail,
                subject: toolInput.subject,
                body: toolInput.body
              };

              functionResults.push({
                tool: toolName,
                success: true,
                data: { drafted: true, requiresApproval: true }
              });

            } else if (toolName === 'get_company_settings') {
              // Get company profile/settings
              const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('full_name, phone, company, address, default_terms, contractor_notification_email, logo_url')
                .eq('id', userId)
                .single();

              if (error) throw error;
              functionResults.push({ tool: toolName, success: true, data: profile });
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

    // If functions were called but no text response, make a second call to interpret results
    let finalMessage = assistantMessage;
    if (!finalMessage && functionResults.length > 0) {
      console.log('🔄 No text response from AI, sending function results back for interpretation...');

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
            choice.message,
            ...functionResultMessages
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
      if (emailDraft) {
        finalMessage = "I've drafted an email for you. Please review it above and click 'Approve & Send' if it looks good, or 'Cancel' to revise.";
      } else if (functionResults.length > 0) {
        const toolNames = functionResults.map(r => r.tool).join(', ');
        finalMessage = `I've processed your request using: ${toolNames}. Let me know if you need anything else!`;
      } else {
        finalMessage = "Hi! I'm Cindy, your AI client relationship manager. I can help you manage clients, projects, calendar events, and draft emails. What would you like to do?";
      }
    }

    const responseData: any = {
      message: finalMessage,
      functionResults
    };

    // Include emailDraft if one was created
    if (emailDraft) {
      responseData.emailDraft = emailDraft;
    }

    console.log('📤 Sending response:', responseData);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Cindy Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
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
