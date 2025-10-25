import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending lead notification events
    const { data: events, error: fetchError} = await supabase
      .from('notification_events')
      .select('*')
      .eq('topic', 'contractor_leads:interest_update')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) throw fetchError

    const results = []

    for (const event of events || []) {
      try {
        const lead = event.payload

        // Format project details for email
        let projectDetailsHtml = '<h3>Project Details:</h3><ul>'
        if (lead.project_details) {
          for (const [key, value] of Object.entries(lead.project_details)) {
            projectDetailsHtml += `<li><strong>${key}:</strong> ${value}</li>`
          }
        }
        projectDetailsHtml += '</ul>'

        // Prepare email content
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .badge { background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; display: inline-block; }
              .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
              ul { background: white; padding: 20px; border-radius: 6px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔥 Lead Showed Interest!</h1>
                <p>A potential customer clicked "I'm Interested" for ${lead.calculator_type} services</p>
              </div>
              <div class="content">
                <p><span class="badge">INTEREST CLICKED</span></p>

                <h2>Contact Information</h2>
                <ul>
                  <li><strong>Name:</strong> ${lead.name}</li>
                  <li><strong>Email:</strong> ${lead.email}</li>
                  <li><strong>Phone:</strong> ${lead.phone || 'Not provided'}</li>
                  <li><strong>Address:</strong> ${lead.address || 'Not provided'}</li>
                </ul>

                <h2>Service Details</h2>
                <ul>
                  <li><strong>Calculator Type:</strong> ${lead.calculator_type}</li>
                  <li><strong>Estimated Value:</strong> ${lead.estimated_value ? '$' + lead.estimated_value.toLocaleString() : 'Not calculated'}</li>
                  <li><strong>Lead Source:</strong> ${lead.source}</li>
                  <li><strong>Originally Submitted:</strong> ${new Date(lead.created_at).toLocaleString()}</li>
                  <li><strong>Interest Clicked:</strong> ${new Date(lead.interest_clicked_at).toLocaleString()}</li>
                </ul>

                ${projectDetailsHtml}

                <a href="https://ujhgwcurllkkeouzwvgk.supabase.co" class="button">View Lead in Dashboard</a>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 14px;">
                  <strong>💡 Tip:</strong> Leads are 21x more likely to convert if you contact them within 5 minutes!
                </p>
              </div>
            </div>
          </body>
          </html>
        `

        // Get Resend API key
        const resendKey = Deno.env.get('RESEND_API_KEY')

        if (!resendKey) {
          throw new Error('RESEND_API_KEY not configured')
        }

        // Send email using Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`
          },
          body: JSON.stringify({
            from: 'ContractorAI Leads <onboarding@resend.dev>',
            to: ['admin@elevatedsystems.info'],
            subject: `🔥 Lead Interest: ${lead.name} - ${lead.calculator_type}`,
            html: emailHtml
          })
        })

        const emailResult = await emailResponse.json()

        if (emailResponse.ok) {
          // Mark as sent
          await supabase
            .from('notification_events')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', event.id)

          results.push({ id: event.id, status: 'sent', emailId: emailResult.id })
        } else {
          throw new Error(`Email send failed: ${JSON.stringify(emailResult)}`)
        }

      } catch (error) {
        console.error('Failed to process event:', event.id, error)

        // Mark as failed
        await supabase
          .from('notification_events')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', event.id)

        results.push({ id: event.id, status: 'failed', error: error.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
