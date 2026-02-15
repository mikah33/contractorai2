import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

interface TaskReminder {
  id: string
  title: string
  due_date: string
  due_time: string | null
  priority: string
  reminder_recipients: string
  reminder_email: boolean
  user_id: string
  client_id: string | null
  assigned_employees: string[]
}

interface RecipientEmail {
  email: string
  name: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { taskId, userId } = body

    // If specific task provided, send reminder for that task
    // Otherwise, find all tasks that need reminders sent
    let tasksToRemind: TaskReminder[] = []

    if (taskId) {
      // Single task reminder
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) throw new Error(`Task not found: ${error.message}`)
      tasksToRemind = [task]
    } else {
      // Find tasks where reminder should be sent now
      // due_date - reminder_minutes <= now AND reminder_sent_at IS NULL
      const now = new Date()

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('reminder_enabled', true)
        .eq('reminder_email', true)
        .is('reminder_sent_at', null)
        .not('due_date', 'is', null)

      if (error) throw new Error(`Failed to fetch tasks: ${error.message}`)

      // Filter tasks where reminder time has passed
      tasksToRemind = (tasks || []).filter(task => {
        const dueDate = new Date(task.due_date)
        const reminderTime = new Date(dueDate.getTime() - (task.reminder_minutes * 60 * 1000))
        return reminderTime <= now
      })
    }

    console.log(`Found ${tasksToRemind.length} tasks to send reminders for`)

    const results = []

    for (const task of tasksToRemind) {
      try {
        // Get user's Gmail credentials
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email, business_name')
          .eq('id', task.user_id)
          .single()

        if (profileError || !profile?.gmail_access_token) {
          console.log(`No Gmail credentials for user ${task.user_id}`)
          results.push({ taskId: task.id, success: false, error: 'No Gmail credentials' })
          continue
        }

        // Refresh token if expired
        let accessToken = profile.gmail_access_token
        if (profile.gmail_token_expiry && new Date(profile.gmail_token_expiry) < new Date()) {
          const refreshResult = await refreshGmailToken(profile.gmail_refresh_token)
          if (refreshResult.access_token) {
            accessToken = refreshResult.access_token
            // Update token in database
            await supabase
              .from('profiles')
              .update({
                gmail_access_token: refreshResult.access_token,
                gmail_token_expiry: new Date(Date.now() + refreshResult.expires_in * 1000).toISOString()
              })
              .eq('id', task.user_id)
          }
        }

        // Get recipients based on reminder_recipients setting
        const recipients = await getRecipients(supabase, task, profile)

        if (recipients.length === 0) {
          console.log(`No recipients for task ${task.id}`)
          results.push({ taskId: task.id, success: false, error: 'No recipients' })
          continue
        }

        // Format due date/time
        const dueDate = new Date(task.due_date)
        const formattedDate = dueDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        const formattedTime = task.due_time || dueDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        })

        // Send email to each recipient
        for (const recipient of recipients) {
          const emailBody = createReminderEmailHtml(
            recipient.name,
            task.title,
            formattedDate,
            formattedTime,
            task.priority,
            profile.business_name || 'ContractorAI'
          )

          await sendGmailEmail(
            accessToken,
            profile.gmail_email,
            recipient.email,
            `Reminder: ${task.title}`,
            emailBody
          )

          console.log(`Sent reminder to ${recipient.email} for task ${task.id}`)
        }

        // Mark reminder as sent
        await supabase
          .from('tasks')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', task.id)

        results.push({ taskId: task.id, success: true, recipientCount: recipients.length })
      } catch (taskError: any) {
        console.error(`Error sending reminder for task ${task.id}:`, taskError)
        results.push({ taskId: task.id, success: false, error: taskError.message })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tasksProcessed: tasksToRemind.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error in send-task-reminder:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function refreshGmailToken(refreshToken: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh Gmail token')
  }

  return response.json()
}

async function getRecipients(
  supabase: any,
  task: TaskReminder,
  profile: any
): Promise<RecipientEmail[]> {
  const recipients: RecipientEmail[] = []

  // Always include self for 'self' or 'all'
  if (task.reminder_recipients === 'self' || task.reminder_recipients === 'all') {
    // Get user's email from auth
    const { data: user } = await supabase.auth.admin.getUserById(task.user_id)
    if (user?.user?.email) {
      recipients.push({ email: user.user.email, name: profile.business_name || 'Business Owner' })
    }
  }

  // Include client for 'client' or 'all'
  if ((task.reminder_recipients === 'client' || task.reminder_recipients === 'all') && task.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('email, first_name, last_name')
      .eq('id', task.client_id)
      .single()

    if (client?.email) {
      recipients.push({
        email: client.email,
        name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client'
      })
    }
  }

  // Include employees for 'employees' or 'all'
  if ((task.reminder_recipients === 'employees' || task.reminder_recipients === 'all') && task.assigned_employees?.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('email, name')
      .eq('user_id', task.user_id)
      .in('name', task.assigned_employees)

    if (employees) {
      for (const emp of employees) {
        if (emp.email) {
          recipients.push({ email: emp.email, name: emp.name })
        }
      }
    }
  }

  return recipients
}

async function sendGmailEmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  // Create MIME message
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody
  ]

  const message = messageParts.join('\r\n')
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to send email: ${errorText}`)
  }
}

function createReminderEmailHtml(
  recipientName: string,
  taskTitle: string,
  dueDate: string,
  dueTime: string,
  priority: string,
  businessName: string
): string {
  const priorityColor = priority === 'high' ? '#EF4444' : priority === 'medium' ? '#3B82F6' : '#22C55E'
  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <div style="display: inline-block; width: 56px; height: 56px; background-color: #3B82F6; border-radius: 12px; line-height: 56px; margin-bottom: 16px;">
                <span style="font-size: 24px;">🔔</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">Task Reminder</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #71717a;">from ${businessName}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46;">Hi ${recipientName},</p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46;">This is a reminder about an upcoming task:</p>

              <!-- Task Card -->
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #18181b;">${taskTitle}</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                  <div style="font-size: 14px; color: #52525b;">
                    <strong>📅 Due:</strong> ${dueDate} at ${dueTime}
                  </div>
                </div>
                <div style="margin-top: 12px;">
                  <span style="display: inline-block; padding: 4px 12px; background-color: ${priorityColor}20; color: ${priorityColor}; border-radius: 9999px; font-size: 12px; font-weight: 500;">
                    ${priorityLabel} Priority
                  </span>
                </div>
              </div>

              <p style="margin: 0; font-size: 14px; color: #71717a;">
                Please ensure this task is completed on time.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f4f4f5; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                This reminder was sent by ${businessName} via ContractorAI.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
