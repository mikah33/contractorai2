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

    return new Response(JSON.stringify({
      success: true,
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
