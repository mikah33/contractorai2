import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Your n8n webhook for sending emails
const N8N_WEBHOOK_URL = 'https://contractorai.app.n8n.cloud/webhook/onboarding-alerts'

// Your email to receive notifications
const NOTIFY_EMAIL = 'mikah@contractorai.app' // Change this to your email

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { record } = payload // This comes from Supabase database trigger

    if (!record) {
      return new Response(JSON.stringify({ error: 'No record provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, step_number, step_name, business_name, selected_trade, time_on_step_ms, device_type, session_id, user_id } = record

    // Only notify on specific events
    const shouldNotify =
      (action === 'dropped' && step_number < 4) || // Someone dropped off before finishing
      (action === 'completed' && step_number === 4) // Someone completed onboarding!

    if (!shouldNotify) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not a notable event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Format time nicely
    const timeSpent = time_on_step_ms
      ? `${Math.round(time_on_step_ms / 1000)} seconds`
      : 'unknown'

    // Get user email if available
    let userEmail = 'Anonymous'
    if (user_id) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', user_id)
        .single()
      userEmail = profile?.email || 'Unknown'
    }

    // Build notification
    const isSuccess = action === 'completed' && step_number === 4

    const emailData = {
      to: NOTIFY_EMAIL,
      subject: isSuccess
        ? `🎉 New Onboarding Conversion! - ${business_name || 'New User'}`
        : `⚠️ User Dropped Off at Step ${step_number} - ${step_name}`,
      html: isSuccess ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Conversion!</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px; color: #1e293b; font-size: 16px;">Someone just completed the onboarding flow!</p>

            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px;"><strong>Business Name:</strong> ${business_name || 'Not provided'}</p>
              <p style="margin: 0 0 8px;"><strong>Trade:</strong> ${selected_trade || 'Not selected'}</p>
              <p style="margin: 0 0 8px;"><strong>User Email:</strong> ${userEmail}</p>
              <p style="margin: 0 0 8px;"><strong>Device:</strong> ${device_type || 'Unknown'}</p>
              <p style="margin: 0;"><strong>Time on final step:</strong> ${timeSpent}</p>
            </div>

            <p style="margin: 16px 0 0; color: #64748b; font-size: 14px;">They should now see the paywall. 💰</p>
          </div>
        </div>
      ` : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ User Dropped Off</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px; color: #1e293b; font-size: 16px;">Someone left during onboarding.</p>

            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px;"><strong>Dropped at:</strong> Step ${step_number} - ${step_name}</p>
              <p style="margin: 0 0 8px;"><strong>Time spent before leaving:</strong> ${timeSpent}</p>
              <p style="margin: 0 0 8px;"><strong>Business Name:</strong> ${business_name || 'Not entered yet'}</p>
              <p style="margin: 0 0 8px;"><strong>Trade:</strong> ${selected_trade || 'Not selected yet'}</p>
              <p style="margin: 0 0 8px;"><strong>Device:</strong> ${device_type || 'Unknown'}</p>
              <p style="margin: 0;"><strong>Session ID:</strong> ${session_id}</p>
            </div>

            <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ${step_number === 1 ? '💡 They left during business setup. Maybe the trade list needs adjustment?' : ''}
                ${step_number === 2 ? '💡 They left at email compose. The email preview might need simplification.' : ''}
                ${step_number === 3 ? '💡 They left at email preview. Consider if the estimate looks compelling enough.' : ''}
              </p>
            </div>
          </div>
        </div>
      `,
      // Plain text version
      text: isSuccess
        ? `New Conversion! Business: ${business_name}, Trade: ${selected_trade}, Email: ${userEmail}`
        : `User dropped at Step ${step_number} (${step_name}). Time spent: ${timeSpent}. Business: ${business_name || 'N/A'}`
    }

    // Send via n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      console.error('Failed to send notification:', await response.text())
    }

    return new Response(JSON.stringify({
      success: true,
      notificationType: isSuccess ? 'conversion' : 'dropoff',
      step: step_number
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Notification error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
