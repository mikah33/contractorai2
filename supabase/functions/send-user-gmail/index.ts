import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { userId, to, subject, htmlBody } = body

    if (!userId || !to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId, to, subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Gmail credentials from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.gmail_access_token || !profile.gmail_email) {
      return new Response(
        JSON.stringify({ error: 'Gmail not connected. Please connect your Google account in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is expired and refresh if needed
    let accessToken = profile.gmail_access_token
    if (profile.gmail_token_expiry && new Date(profile.gmail_token_expiry) < new Date()) {
      console.log('Access token expired, refreshing...')

      if (!profile.gmail_refresh_token) {
        return new Response(
          JSON.stringify({ error: 'Gmail refresh token missing. Please reconnect your Google account.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: profile.gmail_refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        console.error('Failed to refresh token:', await refreshResponse.text())
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Gmail token. Please reconnect your Google account.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Update token in database
      await supabase
        .from('profiles')
        .update({
          gmail_access_token: accessToken,
          gmail_token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        })
        .eq('id', userId)

      console.log('Token refreshed successfully')
    }

    // Build email
    const emailContent = htmlBody || `<p>${subject}</p>`
    const messageParts = [
      `From: ${profile.gmail_email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      emailContent
    ]

    const message = messageParts.join('\r\n')
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send via Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    })

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text()
      console.error('Gmail API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send email via Gmail', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gmailResult = await gmailResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        messageId: gmailResult.id,
        from: profile.gmail_email,
        to: to
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in send-user-gmail:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
