// Supabase Edge Function: Facebook OAuth Callback
// Receives the OAuth code from Facebook, exchanges it for a token,
// and redirects back to the app or web with the token.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Returns an HTML page that redirects via JavaScript (works better with custom URL schemes in iOS web views)
function htmlRedirect(url: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OnSite - Connecting...</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: white; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 360px; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #043d6b; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { color: #111; font-size: 18px; margin: 0 0 8px; }
    p { color: #666; font-size: 14px; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>${message}</h2>
    <p>This should only take a moment...</p>
  </div>
  <script>
    // Try to redirect immediately
    window.location.href = ${JSON.stringify(url)};
    // Fallback: try again after a short delay
    setTimeout(function() { window.location.href = ${JSON.stringify(url)}; }, 500);
  </script>
</body>
</html>`
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: 200,
  })
}

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') || ''
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  // Also handle the case where token is passed directly (from web flow)
  const fbToken = url.searchParams.get('fb_token')
  if (fbToken) {
    // This is a web flow redirect with token already exchanged
    return Response.redirect(`https://contractorai.tools/meta-oauth-callback?fb_token=${encodeURIComponent(fbToken)}&state=fb_leads_web`, 302)
  }

  const isApp = state.includes('app')

  // Handle errors from Facebook
  if (error) {
    const errorMsg = encodeURIComponent(errorDescription || error)
    if (isApp) {
      return htmlRedirect(`contractorai://fb-error?error=${errorMsg}`, 'Connection failed')
    }
    return Response.redirect(`https://contractorai.tools/settings?fb_error=${errorMsg}`, 302)
  }

  if (!code) {
    if (isApp) {
      return htmlRedirect('contractorai://fb-error?error=No%20code%20received', 'Connection failed')
    }
    return Response.redirect('https://contractorai.tools/settings?fb_error=No%20code%20received', 302)
  }

  try {
    const appId = Deno.env.get('META_APP_ID') || Deno.env.get('VITE_META_APP_ID')
    const appSecret = Deno.env.get('META_APP_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!appId || !appSecret) {
      throw new Error('Meta app credentials not configured')
    }

    const redirectUri = `${supabaseUrl}/functions/v1/fb-oauth-callback`

    // Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Token exchange failed')
    }

    // Exchange for long-lived token
    const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    const longLivedRes = await fetch(longLivedUrl)
    const longLivedData = await longLivedRes.json()

    const accessToken = longLivedData.access_token || tokenData.access_token

    // Redirect back to app or web with the token
    if (isApp) {
      // Use HTML+JS redirect for iOS — 302 to custom URL schemes doesn't work in SFSafariViewController
      return htmlRedirect(
        `contractorai://fb-connected?token=${encodeURIComponent(accessToken)}`,
        'Redirecting to OnSite...'
      )
    }

    // Web flow — redirect to the web callback page with token
    return Response.redirect(`https://contractorai.tools/meta-oauth-callback?fb_token=${encodeURIComponent(accessToken)}&state=fb_leads_web`, 302)

  } catch (err) {
    const errorMsg = encodeURIComponent(err.message || 'Unknown error')
    if (isApp) {
      return htmlRedirect(`contractorai://fb-error?error=${errorMsg}`, 'Connection failed')
    }
    return Response.redirect(`https://contractorai.tools/settings?fb_error=${errorMsg}`, 302)
  }
})
