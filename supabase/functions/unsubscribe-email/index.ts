import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UnsubscribeRequest {
  token: string
  unsubscribe_type?: 'all' | 'marketing' | 'estimates' | 'notifications'
  source?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚫 Unsubscribe function called')

    // Create Supabase client with service role for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let requestData: UnsubscribeRequest

    // Handle both GET (from email links) and POST requests
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const token = url.searchParams.get('token')
      const unsubscribe_type = url.searchParams.get('type') || 'all'

      if (!token) {
        console.error('❌ Missing token in URL parameters')
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing unsubscribe token'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }

      requestData = {
        token,
        unsubscribe_type: unsubscribe_type as any,
        source: 'email_link'
      }
    } else if (req.method === 'POST') {
      // Parse JSON body for POST requests
      requestData = await req.json()
      requestData.source = requestData.source || 'api_call'
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        }
      )
    }

    const { token, unsubscribe_type = 'all', source } = requestData

    console.log('📦 Unsubscribe request:', {
      hasToken: !!token,
      unsubscribe_type,
      source,
      method: req.method
    })

    // Validate required fields
    if (!token) {
      console.error('❌ Missing required token')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing unsubscribe token'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get user agent and IP for logging
    const userAgent = req.headers.get('user-agent') || 'Unknown'
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIP || 'unknown'

    // Call the process_unsubscribe function
    console.log('🔄 Processing unsubscribe request...')

    const { data: result, error: processError } = await supabaseClient
      .rpc('process_unsubscribe', {
        p_token: token,
        p_unsubscribe_type: unsubscribe_type,
        p_source: source,
        p_user_agent: userAgent,
        p_ip_address: ipAddress
      })

    if (processError) {
      console.error('❌ Error processing unsubscribe:', processError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process unsubscribe request',
          details: processError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ Unsubscribe processed:', result)

    // If this was a GET request (from email link), return HTML page
    if (req.method === 'GET') {
      const htmlResponse = generateUnsubscribeHtml(result)
      return new Response(htmlResponse, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        },
        status: 200,
      })
    }

    // For POST requests, return JSON
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400,
      }
    )

  } catch (error) {
    console.error('❌ Error in unsubscribe function:', error)

    // For GET requests, return error HTML
    if (req.method === 'GET') {
      const errorHtml = generateErrorHtml(error.message)
      return new Response(errorHtml, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        },
        status: 500,
      })
    }

    // For POST requests, return JSON error
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function generateUnsubscribeHtml(result: any): string {
  const { success, message, email, unsubscribe_type } = result

  if (!success) {
    return generateErrorHtml(message || 'Unknown error occurred')
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribed Successfully - ContractorAI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            text-align: center;
            max-width: 500px;
            width: 100%;
        }

        .success-icon {
            width: 80px;
            height: 80px;
            background: #10B981;
            border-radius: 50%;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .checkmark {
            width: 40px;
            height: 40px;
            color: white;
        }

        h1 {
            color: #1F2937;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 16px;
        }

        .message {
            color: #6B7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 24px;
        }

        .email-info {
            background: #F3F4F6;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 32px;
        }

        .email-label {
            color: #374151;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
        }

        .email-value {
            color: #6B7280;
            font-size: 16px;
            word-break: break-all;
        }

        .type-info {
            color: #7C3AED;
            font-weight: 600;
            font-size: 14px;
            text-transform: capitalize;
            margin-top: 8px;
        }

        .actions {
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn {
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
        }

        .btn-primary {
            background: #3B82F6;
            color: white;
        }

        .btn-primary:hover {
            background: #2563EB;
            transform: translateY(-1px);
        }

        .btn-secondary {
            background: #F3F4F6;
            color: #374151;
            border: 1px solid #D1D5DB;
        }

        .btn-secondary:hover {
            background: #E5E7EB;
            transform: translateY(-1px);
        }

        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #E5E7EB;
            color: #9CA3AF;
            font-size: 14px;
        }

        @media (max-width: 480px) {
            .container {
                padding: 24px;
            }

            h1 {
                font-size: 24px;
            }

            .actions {
                flex-direction: column;
            }

            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">
            <svg class="checkmark" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
        </div>

        <h1>You're Unsubscribed</h1>

        <p class="message">
            ${message}. You will no longer receive these types of emails from ContractorAI.
        </p>

        <div class="email-info">
            <div class="email-label">Email Address:</div>
            <div class="email-value">${email}</div>
            <div class="type-info">Unsubscribed from: ${unsubscribe_type} emails</div>
        </div>

        <div class="actions">
            <a href="https://contractorai.app" class="btn btn-primary">
                Return to ContractorAI
            </a>
            <a href="https://contractorai.app/settings" class="btn btn-secondary">
                Email Preferences
            </a>
        </div>

        <div class="footer">
            <p>If you unsubscribed by mistake, you can update your email preferences in your account settings.</p>
            <p style="margin-top: 8px;">© 2026 ContractorAI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `
}

function generateErrorHtml(errorMessage: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribe Error - ContractorAI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            text-align: center;
            max-width: 500px;
            width: 100%;
        }

        .error-icon {
            width: 80px;
            height: 80px;
            background: #EF4444;
            border-radius: 50%;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .x-mark {
            width: 40px;
            height: 40px;
            color: white;
        }

        h1 {
            color: #1F2937;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 16px;
        }

        .message {
            color: #6B7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
        }

        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #3B82F6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.2s;
        }

        .btn:hover {
            background: #2563EB;
            transform: translateY(-1px);
        }

        @media (max-width: 480px) {
            .container {
                padding: 24px;
            }

            h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">
            <svg class="x-mark" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
        </div>

        <h1>Unsubscribe Error</h1>

        <p class="message">
            We encountered an error while processing your unsubscribe request: ${errorMessage}
        </p>

        <a href="https://contractorai.app/support" class="btn">
            Contact Support
        </a>
    </div>
</body>
</html>
  `
}