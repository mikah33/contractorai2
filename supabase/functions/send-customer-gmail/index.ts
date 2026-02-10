import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    console.log('🚀 send-customer-gmail function started')

    // Parse request body with minimal extraction
    const requestBody = await req.json()
    console.log('📝 Request received')

    // Only extract essential fields first
    const clientId = requestBody.clientId
    const customerEmail = requestBody.customerEmail
    const contractorUserId = requestBody.contractorUserId

    // Validate basic parameters only
    if (!clientId || !customerEmail || !contractorUserId) {
      console.error('❌ Missing basic parameters')
      return new Response(
        JSON.stringify({ error: 'Missing basic parameters' }),
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      )
    }

    console.log('✅ Basic parameters validated')

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('✅ Supabase client initialized')

    // Get client's Gmail OAuth tokens
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email, email_sending_enabled, name')
      .eq('id', clientId)
      .single()

    if (clientError) {
      console.error('❌ Client fetch error')
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      )
    }

    console.log('✅ Client fetched successfully')

    if (!client.email_sending_enabled || !client.gmail_access_token || !client.gmail_email) {
      return new Response(
        JSON.stringify({ error: 'Client Gmail not connected or enabled' }),
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      )
    }

    console.log('✅ Client Gmail validated')

    // Extract additional fields safely and ensure Latin1 compatibility
    const subject = String(requestBody.subject || 'Estimate').replace(/[^\x00-\xFF]/g, '?')
    const body = requestBody.body || 'Please see attached estimate'
    const pdfUrl = requestBody.pdfUrl || ''
    const estimateId = String(requestBody.estimateId || 'unknown').replace(/[^\x00-\xFF]/g, '?')
    const contractorEmail = String(requestBody.contractorEmail || '').replace(/[^\x00-\xFF]/g, '?')
    const totalAmount = String(requestBody.totalAmount || '0.00').replace(/[^\x00-\xFF]/g, '?')
    const customerName = String(requestBody.customerName || 'Customer').replace(/[^\x00-\xFF]/g, '?')

    console.log('✅ Additional fields extracted safely')

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: 'PDF URL required' }),
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Extract safe values from client to avoid circular references
    const fromEmail = String(client.gmail_email)
    let accessToken = String(client.gmail_access_token)
    const refreshToken = String(client.gmail_refresh_token)
    const tokenExpiry = client.gmail_token_expiry

    console.log('✅ Safe values extracted from client')

    // Check if access token is expired and refresh if needed
    if (tokenExpiry && new Date(tokenExpiry) <= new Date()) {
      console.log('🔄 Access token expired, refreshing...')

      const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

      if (!googleClientId || !googleClientSecret) {
        return new Response(
          JSON.stringify({ error: 'Google OAuth credentials not configured' }),
          {
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            }
          }
        )
      }

      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        })

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text()
          console.error('❌ Token refresh failed:', errorText)
          return new Response(
            JSON.stringify({ error: 'Gmail access token expired and refresh failed. Please reconnect Gmail.' }),
            {
              status: 401,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
              }
            }
          )
        }

        const refreshData = await refreshResponse.json()
        accessToken = refreshData.access_token

        // Calculate new expiry (tokens expire in 1 hour)
        const newExpiry = new Date(Date.now() + (refreshData.expires_in * 1000))

        // Update the client record with new token
        await supabaseClient
          .from('clients')
          .update({
            gmail_access_token: accessToken,
            gmail_token_expiry: newExpiry.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId)

        console.log('✅ Access token refreshed successfully')

      } catch (refreshError) {
        console.error('❌ Token refresh error:', refreshError)
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Gmail access token. Please reconnect Gmail.' }),
          {
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            }
          }
        )
      }
    } else {
      console.log('✅ Access token is still valid')
    }

    // Download PDF from storage
    console.log('📄 Downloading PDF from storage...')
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      console.error('❌ Failed to download PDF')
      return new Response(
        JSON.stringify({ error: 'Failed to download PDF attachment' }),
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      )
    }
    console.log('✅ PDF downloaded successfully')

    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Fix: Process large binary data in chunks to avoid stack overflow
    const uint8Array = new Uint8Array(pdfBuffer)
    let binaryString = ''
    const chunkSize = 8192 // Process 8KB chunks to avoid call stack overflow

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize)
      binaryString += String.fromCharCode(...chunk)
    }

    const pdfBase64 = btoa(binaryString)

    console.log('✅ PDF encoded to base64')

    // Create simple email message
    const fileName = 'estimate-' + estimateId + '.pdf'
    const boundary = '----=_NextPart_' + Date.now()

    // Sanitize body content safely and ensure Latin1 compatibility
    const cleanBody = String(body)
      .substring(0, 1000)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/[^\x00-\xFF]/g, '?') // Replace non-Latin1 chars with ?

    // Build email headers (avoiding template literals with client data)
    const emailHeaders = [
      'To: ' + customerEmail,
      'From: ' + fromEmail,
      'Subject: ' + subject,
      'Reply-To: ' + contractorEmail,
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="' + boundary + '"'
    ]

    console.log('✅ Email headers built')

    // Professional HTML email template with styling
    const htmlContent = [
      '<html>',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>Estimate from ' + String(client.name || 'Customer').replace(/[^\x00-\xFF]/g, '?') + '</title>',
      '</head>',
      '<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">',
      '<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">',

      // Header
      '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">',
      '<h1 style="margin: 0; color: white; font-size: 28px; font-weight: 300;">New Estimate</h1>',
      '</div>',

      // Main Content
      '<div style="padding: 40px 30px;">',
      '<div style="text-align: center; margin-bottom: 30px;">',
      '<h2 style="margin: 0 0 10px 0; color: #333; font-size: 24px;">Estimate #' + estimateId + '</h2>',
      '<div style="font-size: 20px; color: #667eea; font-weight: 600;">Total: $' + totalAmount + '</div>',
      '</div>',

      // Divider
      '<hr style="border: none; height: 1px; background: linear-gradient(to right, transparent, #ddd, transparent); margin: 30px 0;">',

      // Message Content
      '<div style="line-height: 1.6; color: #555; font-size: 16px; margin-bottom: 30px;">',
      cleanBody.replace(/\n/g, '<br>'), // Convert line breaks to HTML breaks
      '</div>',

      // Attachment Notice
      '<div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">',
      '<div style="display: flex; align-items: center; color: #333;">',
      '<div style="margin-right: 10px; font-size: 20px; color: #667eea; font-weight: bold;">[PDF]</div>',
      '<div>',
      '<strong>Estimate Details Attached</strong><br>',
      '<span style="color: #666; font-size: 14px;">Please see the attached PDF for complete estimate details and terms.</span>',
      '</div>',
      '</div>',
      '</div>',

      // Accept/Decline Action Buttons
      '<div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center;">',
      '<h3 style="font-size: 20px; margin-bottom: 15px; color: #333;">Ready to Proceed?</h3>',
      '<p style="color: #666; margin-bottom: 25px; font-size: 15px;">Please review the estimate and let us know your decision</p>',

      // Accept/Decline Buttons
      '<div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">',
      '<a href="' + Deno.env.get('SUPABASE_URL') + '/functions/v1/estimate-response?id=' + estimateId + '&action=accept" style="display: inline-block; text-decoration: none; padding: 15px 35px; border-radius: 6px; font-size: 16px; font-weight: 600; min-width: 180px; background-color: #10b981; color: white; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">',
      'Accept Estimate',
      '</a>',
      '<a href="' + Deno.env.get('SUPABASE_URL') + '/functions/v1/estimate-response?id=' + estimateId + '&action=decline" style="display: inline-block; text-decoration: none; padding: 15px 35px; border-radius: 6px; font-size: 16px; font-weight: 600; min-width: 180px; background-color: #ef4444; color: white; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">',
      'Decline Estimate',
      '</a>',
      '</div>',

      // Disclaimer
      '<div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 14px; color: #856404;">',
      '<strong>Important:</strong> You can only select one option. Once you click either Accept or Decline, your response will be recorded and sent to us.',
      '</div>',
      '</div>',

      '</div>', // End main content

      // Footer
      '<div style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #eee; text-align: center;">',
      '<div style="color: #666; font-size: 14px; margin-bottom: 10px;">',
      'This estimate was sent from <strong>' + fromEmail + '</strong>',
      '</div>',
      '<div style="color: #999; font-size: 12px;">',
      'Generated by ContractorAI | Professional Estimate Management',
      '</div>',
      '</div>',

      '</div>', // End container
      '</body>',
      '</html>'
    ].join('')

    // Build MIME message safely
    const mimeMessage = emailHeaders.join('\n') + '\n\n' +
      '--' + boundary + '\n' +
      'Content-Type: text/html; charset=utf-8\n' +
      'Content-Transfer-Encoding: 7bit\n\n' +
      htmlContent + '\n\n' +
      '--' + boundary + '\n' +
      'Content-Type: application/pdf; name="' + fileName + '"\n' +
      'Content-Transfer-Encoding: base64\n' +
      'Content-Disposition: attachment; filename="' + fileName + '"\n\n' +
      pdfBase64 + '\n\n' +
      '--' + boundary + '--'

    console.log('✅ MIME message built')

    // Encode for Gmail API - handle UTF-8 to Latin1 conversion for btoa()
    const utf8ToLatin1 = (str) => {
      return unescape(encodeURIComponent(str))
    }

    const encodedMessage = btoa(utf8ToLatin1(mimeMessage))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    console.log('✅ Message encoded for Gmail API')

    // Send email via Gmail API
    console.log('📧 Sending email via Gmail API...')
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    })

    console.log('📧 Gmail API response status: ' + gmailResponse.status)

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text()
      console.error('❌ Gmail API error: ' + errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send email via Gmail' }),
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        }
      )
    }

    const gmailResult = await gmailResponse.json()
    const messageId = gmailResult.id
    console.log('✅ Email sent successfully with ID: ' + messageId)

    // Log to database
    try {
      await supabaseClient
        .from('estimate_email_responses')
        .insert({
          customer_name: customerName,
          customer_email: customerEmail,
          email_subject: subject,
          email_body: body,
          pdf_url: pdfUrl,
          estimate_id: estimateId,
          client_id: clientId
        })
      console.log('✅ Database logging completed')
    } catch (logError) {
      console.warn('Database logging failed, continuing anyway')
    }

    // Success response (avoiding template literals with client data)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully from customer Gmail account',
        gmail_message_id: messageId,
        from_email: fromEmail,
        to_email: customerEmail
      }),
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error: ' + error.message)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      }
    )
  }
})