import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse URL parameters
    const url = new URL(req.url)
    const authCode = url.searchParams.get('code')
    const clientId = url.searchParams.get('state') // Client ID passed via state parameter
    const error = url.searchParams.get('error')

    // Check for OAuth error
    if (error) {
      console.error('OAuth error:', error)
      const errorPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gmail Connection Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              color: white;
            }
            .container {
              background: rgba(255, 255, 255, 0.95);
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              text-align: center;
              color: #333;
              max-width: 400px;
              width: 100%;
            }
            .error-icon { font-size: 60px; margin-bottom: 20px; }
            h1 { margin: 20px 0 10px 0; color: #e74c3c; }
            p { margin: 10px 0; color: #666; }
            .error { background: #ffe6e6; padding: 10px 15px; border-radius: 10px; margin: 20px 0; color: #c0392b; }
            button {
              background: #3498db;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
            }
            button:hover { background: #2980b9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">❌</div>
            <h1>Gmail Connection Failed</h1>
            <div class="error">OAuth Error: ${error}</div>
            <p>Please try connecting your Gmail account again.</p>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
        </html>
      `;
      return new Response(errorPage, {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      })
    }

    // Validate required parameters
    if (!authCode) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing client ID in state parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get Google OAuth credentials from environment
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!googleClientId || !googleClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/customer-gmail-oauth`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code for tokens' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tokens = await tokenResponse.json()

    if (!tokens.access_token || !tokens.refresh_token) {
      console.error('Invalid token response:', tokens)
      return new Response(
        JSON.stringify({ error: 'Invalid token response from Google' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's Gmail email address
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info')
      return new Response(
        JSON.stringify({ error: 'Failed to get Gmail email address' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const userInfo = await userInfoResponse.json()

    // Calculate token expiry (tokens expire in 1 hour)
    const expiryDate = new Date(Date.now() + (tokens.expires_in * 1000))

    // First, ensure the database columns exist
    try {
      await supabaseClient.rpc('exec', {
        sql: `
          ALTER TABLE clients
          ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
          ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
          ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS gmail_email TEXT,
          ADD COLUMN IF NOT EXISTS email_sending_enabled BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS email_auth_method TEXT DEFAULT 'none';
        `
      });
    } catch (schemaError) {
      console.log('Schema update attempt failed (might already exist):', schemaError);
    }

    // Update the client record with Gmail OAuth tokens
    const { data: client, error: updateError } = await supabaseClient
      .from('clients')
      .update({
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expiry: expiryDate.toISOString(),
        gmail_email: userInfo.email,
        email_sending_enabled: true,
        email_auth_method: 'gmail',
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .select('name, email, gmail_email')
      .single()

    if (updateError) {
      console.error('Failed to update client:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save Gmail connection' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!client) {
      const errorPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Client Not Found</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              color: white;
            }
            .container {
              background: rgba(255, 255, 255, 0.95);
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              text-align: center;
              color: #333;
              max-width: 400px;
              width: 100%;
            }
            .error-icon { font-size: 60px; margin-bottom: 20px; }
            h1 { margin: 20px 0 10px 0; color: #e74c3c; }
            p { margin: 10px 0; color: #666; }
            button {
              background: #3498db;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
            }
            button:hover { background: #2980b9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">🔍</div>
            <h1>Client Not Found</h1>
            <p>The client record could not be found. Please try again.</p>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
        </html>
      `;
      return new Response(errorPage, {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      })
    }

    console.log(`Gmail OAuth successful for client: ${client.name} (${userInfo.email})`)

    // Return success page with auto-close functionality
    const successPage = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gmail Connected Successfully</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: white;
          }
          .container {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            color: #333;
            max-width: 400px;
            width: 100%;
          }
          .checkmark {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: inline-block;
            stroke-width: 2;
            stroke: #4CAF50;
            stroke-miterlimit: 10;
            margin-bottom: 20px;
            box-shadow: inset 0px 0px 0px #4CAF50;
            animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
          }
          .checkmark__circle {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            stroke-width: 2;
            stroke-miterlimit: 10;
            stroke: #4CAF50;
            fill: none;
            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          }
          .checkmark__check {
            transform-origin: 50% 50%;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
          }
          @keyframes stroke {
            100% { stroke-dashoffset: 0; }
          }
          @keyframes scale {
            0%, 100% { transform: none; }
            50% { transform: scale3d(1.1, 1.1, 1); }
          }
          @keyframes fill {
            100% { box-shadow: inset 0px 0px 0px 30px #4CAF50; }
          }
          h1 { margin: 20px 0 10px 0; color: #4CAF50; }
          p { margin: 10px 0; color: #666; }
          .email {
            background: #f0f8ff;
            padding: 10px 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-weight: 600;
            color: #2563eb;
          }
          .countdown {
            margin-top: 30px;
            font-size: 14px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle class="checkmark__circle" fill="none" cx="26" cy="26" r="25"/>
            <path class="checkmark__check" fill="none" d="l-2.05,11.1 9.05,9.05 20.5-20.5"/>
          </svg>
          <h1>Gmail Connected!</h1>
          <p>Successfully connected Gmail account:</p>
          <div class="email">${userInfo.email}</div>
          <p>You can now send estimates from this email address.</p>
          <div class="countdown">
            Closing automatically in <span id="countdown">3</span> seconds...
          </div>
        </div>

        <script>
          // Countdown and auto-close
          let count = 3;
          const countdownEl = document.getElementById('countdown');

          const timer = setInterval(() => {
            count--;
            countdownEl.textContent = count;

            if (count <= 0) {
              clearInterval(timer);

              // Try to close the popup
              if (window.opener) {
                // Notify parent window of success
                window.opener.postMessage({
                  type: 'gmail-oauth-success',
                  client: {
                    id: '${clientId}',
                    name: '${client.name}',
                    email: '${client.email}',
                    gmail_email: '${userInfo.email}',
                    email_sending_enabled: true
                  }
                }, '*');
                window.close();
              } else {
                // Fallback: redirect to app or show manual close instruction
                document.querySelector('.countdown').innerHTML =
                  '<strong>Please close this tab and return to ContractorAI</strong>';
              }
            }
          }, 1000);

          // Also try to close immediately if opened in popup
          setTimeout(() => {
            if (window.opener) {
              window.close();
            }
          }, 100);
        </script>
      </body>
      </html>
    `;

    return new Response(successPage, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})