// Supabase Edge Function: Sync Lead Status to Facebook Conversions API
// When a contractor updates a lead's status in our app, push that event
// to Facebook's Conversions API for ad optimization.
//
// This does NOT update Facebook Lead Center status (no API exists for that).
// It tells Meta which leads convert so it optimizes ads for quality.
//
// Payload spec: https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/payload-specification/

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Map our app status to CRM funnel event names
// These are free-form but should represent your funnel stages
const STATUS_TO_EVENT: Record<string, string> = {
  'contacted': 'Initial Contact',
  'quoted': 'Qualified Lead',
  'converted': 'Converted',
  'lost': 'Disqualified',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { leadId, status } = await req.json()

    if (!leadId || !status) {
      return new Response(JSON.stringify({ error: 'Missing leadId or status' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('contractor_id', user.id)
      .single()

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Only sync Facebook leads that have a lead_id
    if (lead.source !== 'facebook_lead_ad' || !lead.project_details?.fb_lead_id) {
      return new Response(JSON.stringify({ success: true, synced: false, reason: 'Not a Facebook lead or missing lead ID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const eventName = STATUS_TO_EVENT[status]
    if (!eventName) {
      return new Response(JSON.stringify({ success: true, synced: false, reason: 'Status has no mapped event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Need a pixel ID to send CAPI events
    const pixelId = Deno.env.get('META_PIXEL_ID')
    const capiToken = Deno.env.get('META_CAPI_ACCESS_TOKEN')

    if (!pixelId || !capiToken) {
      // No pixel configured — skip silently
      return new Response(JSON.stringify({ success: true, synced: false, reason: 'Meta Pixel not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Build the Conversions API payload per Meta's spec
    // https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/payload-specification/
    const eventPayload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'system_generated',
        user_data: {
          lead_id: lead.project_details.fb_lead_id,
        },
        custom_data: {
          event_source: 'crm',
          lead_event_source: 'OnSite',
        },
      }],
    }

    const capiRes = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${encodeURIComponent(capiToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
      }
    )
    const capiData = await capiRes.json()

    if (capiData.error) {
      console.error('Facebook CAPI error:', capiData.error)
      return new Response(JSON.stringify({ success: false, error: capiData.error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({
      success: true,
      synced: true,
      event: eventName,
      events_received: capiData.events_received,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('FB sync lead status error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
