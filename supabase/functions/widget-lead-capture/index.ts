// Supabase Edge Function: Lead Capture from Widget Forms
// Processes lead submissions from embedded calculator widgets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Request interface for lead capture
interface LeadRequest {
  widgetKey: string
  calculatorType: string
  name: string
  email: string
  phone?: string
  address?: string
  projectDetails: any // Calculator-specific data (JSONB)
  estimatedValue?: number
}

// Response interface
interface LeadResponse {
  success: boolean
  leadId?: string
  error?: string
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse request body
    const leadData = await req.json() as LeadRequest

    // Validate required fields
    if (!leadData.widgetKey || !leadData.calculatorType || !leadData.name || !leadData.email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: widgetKey, calculatorType, name, email'
      } as LeadResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(leadData.email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      } as LeadResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // STEP 1: Validate widget key exists and get contractor info
    const { data: widget, error: widgetError } = await supabase
      .from('widget_keys')
      .select('id, contractor_id, is_active')
      .eq('widget_key', leadData.widgetKey)
      .single()

    if (widgetError || !widget) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid widget key'
      } as LeadResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    // Check if widget is active
    if (!widget.is_active) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Widget key is disabled'
      } as LeadResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // STEP 2: Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert({
        contractor_id: widget.contractor_id,
        widget_key_id: widget.id,
        source: 'website_widget',
        calculator_type: leadData.calculatorType,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone || null,
        address: leadData.address || null,
        project_details: leadData.projectDetails || {},
        estimated_value: leadData.estimatedValue || null,
        status: 'new'
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Lead insert error:', insertError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to save lead. Please try again.'
      } as LeadResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // STEP 3: Send notification email to contractor (future enhancement)
    // TODO: Implement Resend email notification
    // await sendLeadNotificationEmail(widget.contractor_id, lead.id)

    // STEP 4: Log lead capture event in usage logs
    try {
      await supabase.from('widget_usage_logs').insert({
        widget_key_id: widget.id,
        contractor_id: widget.contractor_id,
        calculator_type: leadData.calculatorType,
        validation_result: 'lead_captured',
        domain: null // Can be added if passed from client
      })
    } catch (logError) {
      console.error('Failed to log lead capture:', logError)
      // Don't fail the request if logging fails
    }

    // STEP 5: Return success with lead ID
    return new Response(JSON.stringify({
      success: true,
      leadId: lead.id
    } as LeadResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    })

  } catch (error) {
    console.error('Lead capture error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error. Please try again later.'
    } as LeadResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// Future enhancement: Send email notification to contractor
// async function sendLeadNotificationEmail(contractorId: string, leadId: string) {
//   // TODO: Integrate with Resend API
//   // - Get contractor email from profiles table
//   // - Send email with lead details
//   // - Include link to dashboard to view/manage lead
// }
