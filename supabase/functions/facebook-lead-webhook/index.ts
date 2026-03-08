// Supabase Edge Function: Facebook Lead Ads Webhook
// Single endpoint that receives leads for ALL connected contractors
// Meta sends leadgen events here when a lead form is submitted on any subscribed page

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // GET: Meta webhook verification
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    const verifyToken = Deno.env.get('FB_VERIFY_TOKEN')

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully')
      return new Response(challenge, { status: 200 })
    }

    return new Response('Verification failed', { status: 403 })
  }

  // POST: Receive lead notification from Meta
  if (req.method === 'POST') {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const body = await req.json()
      console.log('Facebook webhook received:', JSON.stringify(body))

      // Meta sends: { object: 'page', entry: [{ id, time, changes: [{ field, value }] }] }
      if (body.object !== 'page') {
        return new Response('Not a page event', { status: 200 })
      }

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== 'leadgen') continue

          const { leadgen_id, page_id, form_id } = change.value

          // Look up which contractor owns this page
          const { data: subscription, error: subError } = await supabase
            .from('fb_page_subscriptions')
            .select('contractor_id, page_access_token')
            .eq('page_id', page_id)
            .eq('is_active', true)
            .single()

          if (subError || !subscription) {
            console.error(`No subscription found for page ${page_id}:`, subError)
            continue
          }

          // Fetch the actual lead data from Facebook Graph API
          const leadResponse = await fetch(
            `https://graph.facebook.com/v18.0/${leadgen_id}?access_token=${subscription.page_access_token}`
          )

          if (!leadResponse.ok) {
            console.error(`Failed to fetch lead ${leadgen_id}:`, await leadResponse.text())
            continue
          }

          const leadData = await leadResponse.json()

          // Parse lead fields from Facebook's format
          // Facebook returns: { field_data: [{ name: 'full_name', values: ['John'] }, ...] }
          const fields: Record<string, string> = {}
          for (const field of leadData.field_data || []) {
            fields[field.name] = field.values?.[0] || ''
          }

          // Map Facebook fields to our leads table
          const name = fields.full_name || fields.first_name
            ? `${fields.first_name || ''} ${fields.last_name || ''}`.trim()
            : 'Facebook Lead'
          const email = fields.email || ''
          const phone = fields.phone_number || fields.phone || null
          const city = fields.city || null

          // Insert lead into our database
          const { data: lead, error: insertError } = await supabase
            .from('leads')
            .insert({
              contractor_id: subscription.contractor_id,
              source: 'facebook_lead_ad',
              calculator_type: 'facebook_form',
              name,
              email,
              phone,
              address: city,
              project_details: {
                facebook_leadgen_id: leadgen_id,
                facebook_form_id: form_id,
                facebook_page_id: page_id,
                raw_fields: fields,
                created_time: leadData.created_time
              },
              status: 'new'
            })
            .select('id')
            .single()

          if (insertError) {
            console.error('Failed to insert lead:', insertError)
          } else {
            console.log(`Lead ${lead.id} created for contractor ${subscription.contractor_id}`)
          }
        }
      }

      // Always return 200 to Meta so they don't retry
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })

    } catch (error) {
      console.error('Webhook processing error:', error)
      // Still return 200 to prevent Meta from retrying
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }
  }

  return new Response('Method not allowed', { status: 405 })
})
