// Supabase Edge Function: Connect Contractor's Facebook Page for Lead Ads
// Handles both token exchange and page subscription

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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const body = await req.json()

    // ACTION: Exchange OAuth code for access token
    if (body.action === 'exchange_token') {
      const { code, redirectUri } = body
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing code' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      const appId = Deno.env.get('META_APP_ID') || Deno.env.get('VITE_META_APP_ID')
      const appSecret = Deno.env.get('META_APP_SECRET')

      if (!appId || !appSecret) {
        return new Response(JSON.stringify({ error: 'Meta app credentials not configured' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }

      // Exchange code for short-lived token
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`
      const tokenRes = await fetch(tokenUrl)
      const tokenData = await tokenRes.json()

      if (tokenData.error) {
        console.error('Token exchange error:', tokenData.error)
        return new Response(JSON.stringify({ error: tokenData.error.message || 'Token exchange failed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      // Exchange for long-lived token
      const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
      const longLivedRes = await fetch(longLivedUrl)
      const longLivedData = await longLivedRes.json()

      const accessToken = longLivedData.access_token || tokenData.access_token

      return new Response(JSON.stringify({ access_token: accessToken }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ACTION: Subscribe to page (default action)
    const { pageId, pageName, pageAccessToken, userAccessToken } = body

    if (!pageId || !pageAccessToken) {
      return new Response(JSON.stringify({ error: 'Missing pageId or pageAccessToken' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Subscribe our app to the page's leadgen events
    const subscribeResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'leadgen',
          access_token: pageAccessToken
        })
      }
    )

    if (!subscribeResponse.ok) {
      const errorText = await subscribeResponse.text()
      console.error('Failed to subscribe to page:', errorText)
      return new Response(JSON.stringify({ error: 'Failed to subscribe to Facebook page', details: errorText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Save the subscription to our database
    const { data: sub, error: insertError } = await supabase
      .from('fb_page_subscriptions')
      .upsert({
        contractor_id: user.id,
        page_id: pageId,
        page_name: pageName || null,
        page_access_token: pageAccessToken,
        user_access_token: userAccessToken || null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'page_id' })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to save subscription:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to save page connection' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Sync existing leads from this page's lead forms
    let syncedCount = 0
    try {
      // Fetch all lead forms for this page
      const formsRes = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?access_token=${encodeURIComponent(pageAccessToken)}`
      )
      const formsData = await formsRes.json()

      if (formsData.data && formsData.data.length > 0) {
        for (const form of formsData.data) {
          // Fetch leads from each form with ad attribution + platform status
          let leadsUrl = `https://graph.facebook.com/v18.0/${form.id}/leads?limit=500&fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform&access_token=${encodeURIComponent(pageAccessToken)}`

          while (leadsUrl) {
            const leadsRes = await fetch(leadsUrl)
            const leadsData = await leadsRes.json()

            if (leadsData.data && leadsData.data.length > 0) {
              for (const lead of leadsData.data) {
                // Parse field_data into a usable format
                const fields: Record<string, string> = {}
                if (lead.field_data) {
                  lead.field_data.forEach((f: any) => {
                    fields[f.name] = f.values?.[0] || ''
                  })
                }

                // Build name from available fields
                let leadName = 'Facebook Lead'
                if (fields.full_name) {
                  leadName = fields.full_name
                } else if (fields.first_name) {
                  leadName = `${fields.first_name} ${fields.last_name || ''}`.trim()
                }

                // Build address from available fields
                let leadAddress: string | null = null
                if (fields.street_address || fields.city) {
                  leadAddress = [fields.street_address, fields.city, fields.state, fields.zip_code].filter(Boolean).join(', ')
                }

                const projectDetails = {
                  fb_lead_id: lead.id,
                  fb_form_id: form.id,
                  fb_form_name: form.name || null,
                  fb_page_id: pageId,
                  fb_ad_id: lead.ad_id || null,
                  fb_ad_name: lead.ad_name || null,
                  fb_adset_id: lead.adset_id || null,
                  fb_adset_name: lead.adset_name || null,
                  fb_campaign_id: lead.campaign_id || null,
                  fb_campaign_name: lead.campaign_name || null,
                  fb_platform: lead.platform || null,
                  raw_fields: fields,
                }

                const leadRow = {
                  contractor_id: user.id,
                  source: 'facebook_lead_ad',
                  name: leadName,
                  email: fields.email || null,
                  phone: fields.phone_number || fields.phone || null,
                  address: leadAddress,
                  status: 'new' as const,
                  project_details: projectDetails,
                  notes: fields.message || fields.comments || null,
                  created_at: lead.created_time || new Date().toISOString(),
                }

                // Check if this lead already exists by fb_lead_id
                const { data: existing } = await supabase
                  .from('leads')
                  .select('id')
                  .eq('contractor_id', user.id)
                  .contains('project_details', { fb_lead_id: lead.id })
                  .maybeSingle()

                if (existing) {
                  // Update existing lead with corrected name, ad data, etc.
                  await supabase
                    .from('leads')
                    .update({
                      name: leadName,
                      email: fields.email || null,
                      phone: fields.phone_number || fields.phone || null,
                      address: leadAddress,
                      project_details: projectDetails,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id)
                  syncedCount++
                } else {
                  // Insert new lead
                  const { error: insertErr } = await supabase
                    .from('leads')
                    .insert(leadRow)
                  if (!insertErr) syncedCount++
                }
              }
            }

            // Pagination
            leadsUrl = leadsData.paging?.next || null
          }
        }
      }
    } catch (syncErr) {
      // Don't fail the connection if sync fails
      console.error('Failed to sync existing leads:', syncErr)
    }

    return new Response(JSON.stringify({
      success: true,
      syncedLeads: syncedCount,
      subscription: {
        id: sub.id,
        page_id: sub.page_id,
        page_name: sub.page_name,
        is_active: sub.is_active
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('FB connect page error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
