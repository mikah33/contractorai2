import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Scheduled function to check and send task reminders
// This should be called via Supabase cron (pg_cron) or external scheduler
// Run every 5 minutes using cron expression: "*/5 * * * *"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    console.log(`Checking task reminders at ${now.toISOString()}`)

    // Find tasks where:
    // - reminder_enabled = true
    // - reminder_email = true
    // - reminder_sent_at IS NULL (not yet sent)
    // - due_date is not null
    // - (due_date - reminder_minutes) <= now
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        due_time,
        priority,
        reminder_minutes,
        reminder_recipients,
        reminder_email,
        user_id,
        client_id,
        assigned_employees
      `)
      .eq('reminder_enabled', true)
      .eq('reminder_email', true)
      .is('reminder_sent_at', null)
      .not('due_date', 'is', null)

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`)
    }

    // Filter tasks where reminder time has arrived
    const tasksToRemind = (tasks || []).filter(task => {
      const dueDate = new Date(task.due_date)
      const reminderMinutes = task.reminder_minutes || 60
      const reminderTime = new Date(dueDate.getTime() - (reminderMinutes * 60 * 1000))
      return reminderTime <= now && dueDate > now // Reminder time passed but task not yet due
    })

    console.log(`Found ${tasksToRemind.length} tasks that need reminders`)

    if (tasksToRemind.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No reminders to send',
        tasksChecked: tasks?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Call send-task-reminder for each task
    const results = []
    for (const task of tasksToRemind) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-task-reminder`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: task.id, userId: task.user_id }),
        })

        const result = await response.json()
        results.push({ taskId: task.id, ...result })
      } catch (err: any) {
        console.error(`Error sending reminder for task ${task.id}:`, err)
        results.push({ taskId: task.id, success: false, error: err.message })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tasksChecked: tasks?.length || 0,
      remindersProcessed: tasksToRemind.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error in check-task-reminders:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
