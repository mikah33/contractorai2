// Supabase Edge Function: Fetch Facebook Ad Details
// Returns ad creative (title, body, image), copy, and demographic insights

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

    const { adId, pageId } = await req.json()

    if (!adId || !pageId) {
      return new Response(JSON.stringify({ error: 'Missing adId or pageId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get the user access token (needed for Marketing API / ads_read)
    const { data: sub } = await supabase
      .from('fb_page_subscriptions')
      .select('user_access_token, page_access_token')
      .eq('page_id', pageId)
      .eq('contractor_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    const accessToken = sub?.user_access_token || sub?.page_access_token
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'No Facebook access token found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Fetch ad details + creative in one call
    const adFields = 'name,status,creative{title,body,image_url,thumbnail_url,object_story_spec}'
    const adRes = await fetch(
      `https://graph.facebook.com/v18.0/${adId}?fields=${adFields}&access_token=${encodeURIComponent(accessToken)}`
    )
    const adData = await adRes.json()

    if (adData.error) {
      console.error('Ad fetch error:', adData.error)
      return new Response(JSON.stringify({
        error: adData.error.message || 'Failed to fetch ad',
        code: adData.error.code,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Don't fail hard, just return the error
      })
    }

    // Extract creative data
    const creative = adData.creative || {}
    const storySpec = creative.object_story_spec || {}
    const linkData = storySpec.link_data || {}
    const videoData = storySpec.video_data || {}

    // Get the best available image
    const imageUrl = creative.image_url
      || creative.thumbnail_url
      || linkData.image_hash // won't be a URL, just a hash
      || linkData.picture
      || videoData.image_url
      || null

    // Get the ad copy
    const adTitle = creative.title || linkData.name || videoData.title || adData.name || null
    const adBody = creative.body || linkData.message || videoData.message || null
    const adDescription = linkData.description || videoData.description || null
    const adCallToAction = linkData.call_to_action?.type?.replace(/_/g, ' ') || null
    const adLink = linkData.link || null

    // Fetch ad insights (performance metrics)
    let insights: any = null
    try {
      const insightsRes = await fetch(
        `https://graph.facebook.com/v18.0/${adId}/insights?fields=impressions,clicks,spend,cpc,ctr,cost_per_action_type,actions&date_preset=lifetime&access_token=${encodeURIComponent(accessToken)}`
      )
      const insightsData = await insightsRes.json()
      if (insightsData.data && insightsData.data.length > 0) {
        insights = insightsData.data[0]
      }
    } catch (e) {
      console.error('Insights fetch error:', e)
    }

    // Fetch demographic breakdown (age + gender)
    let demographics: any = null
    try {
      const demoRes = await fetch(
        `https://graph.facebook.com/v18.0/${adId}/insights?fields=impressions,clicks&breakdowns=age,gender&date_preset=lifetime&limit=50&access_token=${encodeURIComponent(accessToken)}`
      )
      const demoData = await demoRes.json()
      if (demoData.data && demoData.data.length > 0) {
        demographics = demoData.data
      }
    } catch (e) {
      console.error('Demographics fetch error:', e)
    }

    // Fetch region breakdown
    let regions: any = null
    try {
      const regionRes = await fetch(
        `https://graph.facebook.com/v18.0/${adId}/insights?fields=impressions,clicks&breakdowns=region&date_preset=lifetime&limit=20&access_token=${encodeURIComponent(accessToken)}`
      )
      const regionData = await regionRes.json()
      if (regionData.data && regionData.data.length > 0) {
        regions = regionData.data
      }
    } catch (e) {
      console.error('Region fetch error:', e)
    }

    // Parse actions to find leads count
    let leadsCount = 0
    let costPerLead: string | null = null
    if (insights?.actions) {
      const leadAction = insights.actions.find((a: any) => a.action_type === 'lead' || a.action_type === 'leadgen_grouped')
      if (leadAction) leadsCount = parseInt(leadAction.value || '0')
    }
    if (insights?.cost_per_action_type) {
      const cpl = insights.cost_per_action_type.find((a: any) => a.action_type === 'lead' || a.action_type === 'leadgen_grouped')
      if (cpl) costPerLead = parseFloat(cpl.value).toFixed(2)
    }

    return new Response(JSON.stringify({
      ad: {
        id: adData.id,
        name: adData.name,
        status: adData.status,
      },
      creative: {
        title: adTitle,
        body: adBody,
        description: adDescription,
        imageUrl: imageUrl,
        callToAction: adCallToAction,
        link: adLink,
      },
      metrics: insights ? {
        impressions: parseInt(insights.impressions || '0'),
        clicks: parseInt(insights.clicks || '0'),
        spend: parseFloat(insights.spend || '0').toFixed(2),
        cpc: insights.cpc ? parseFloat(insights.cpc).toFixed(2) : null,
        ctr: insights.ctr ? parseFloat(insights.ctr).toFixed(2) : null,
        leads: leadsCount,
        costPerLead,
      } : null,
      demographics: demographics ? demographics.map((d: any) => ({
        age: d.age,
        gender: d.gender,
        impressions: parseInt(d.impressions || '0'),
        clicks: parseInt(d.clicks || '0'),
      })) : null,
      regions: regions ? regions.map((r: any) => ({
        region: r.region,
        impressions: parseInt(r.impressions || '0'),
        clicks: parseInt(r.clicks || '0'),
      })).sort((a: any, b: any) => b.impressions - a.impressions).slice(0, 10) : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('FB ad details error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
