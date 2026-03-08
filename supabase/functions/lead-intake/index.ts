// Supabase Edge Function: Universal Website Lead Intake
// Accepts leads from contractor websites via simple API key authentication
// Contractors embed a form or JS snippet that posts to this endpoint

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get API key from query string or header
    const url = new URL(req.url)
    const apiKey = url.searchParams.get('key') || req.headers.get('x-api-key')

    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing API key. Pass as ?key= or x-api-key header.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // Validate API key and get contractor
    const { data: keyRecord, error: keyError } = await supabase
      .from('lead_api_keys')
      .select('contractor_id, is_active, domain')
      .eq('api_key', apiKey)
      .single()

    if (keyError || !keyRecord) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid API key'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    if (!keyRecord.is_active) {
      return new Response(JSON.stringify({
        success: false,
        error: 'API key is disabled'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // Optional: check domain whitelist
    if (keyRecord.domain) {
      const origin = req.headers.get('origin') || req.headers.get('referer') || ''
      if (origin && !origin.includes(keyRecord.domain)) {
        console.warn(`Domain mismatch: expected ${keyRecord.domain}, got ${origin}`)
        // Log but don't block — domain might be different in dev
      }
    }

    // Parse lead data
    const body = await req.json()
    const { name, email, phone, message, source, service_type, address } = body

    // Validate required fields
    if (!name || !email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: name, email'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Insert lead
    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert({
        contractor_id: keyRecord.contractor_id,
        source: source || 'website',
        calculator_type: service_type || 'general',
        name,
        email,
        phone: phone || null,
        address: address || null,
        project_details: {
          message: message || null,
          service_type: service_type || null,
          submitted_from: req.headers.get('origin') || 'direct'
        },
        status: 'new'
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Lead insert error:', insertError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to save lead'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    return new Response(JSON.stringify({
      success: true,
      leadId: lead.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    })

  } catch (error) {
    console.error('Lead intake error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
