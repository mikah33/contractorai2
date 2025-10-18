import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_URL = 'https://contractorai.app.n8n.cloud/webhook/2ee2784c-a873-476f-aa5f-90caca848ab8'

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
    console.log('🚀 Edge Function called')

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ Missing authorization header')
      throw new Error('Missing authorization header')
    }

    console.log('✅ Authorization header present')

    // Create Supabase client with the user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('❌ User authentication failed:', userError)
      throw new Error('User not authenticated')
    }

    console.log('✅ User authenticated:', user.id)

    // Parse request body
    const requestData = await req.json()
    console.log('📦 Request data received:', {
      hasCustomerName: !!requestData.customerName,
      hasCustomerEmail: !!requestData.customerEmail,
      hasSubject: !!requestData.subject,
      hasBody: !!requestData.body,
      hasPdfUrl: !!requestData.pdfUrl,
      hasEstimateId: !!requestData.estimateId,
    })

    const {
      customerName,
      customerEmail,
      subject,
      body,
      pdfUrl,
      estimateId,
      clientId,
      contractorEmail,
    } = requestData

    // Validate required fields
    if (!customerEmail || !subject || !body || !pdfUrl || !estimateId) {
      console.error('❌ Missing required fields')
      throw new Error('Missing required fields')
    }

    console.log('📧 Sending estimate email to n8n webhook:', {
      customerEmail,
      estimateId,
      pdfUrl,
      webhookUrl: WEBHOOK_URL,
    })

    // Step 1: Create or update record in estimate_email_responses table
    console.log('💾 Creating/updating estimate_email_responses record...')

    // First, try to delete any existing record for this estimate
    const { error: deleteError } = await supabaseClient
      .from('estimate_email_responses')
      .delete()
      .eq('estimate_id', estimateId)

    if (deleteError) {
      console.warn('⚠️ Could not delete existing record:', deleteError)
    }

    // Now insert fresh record
    const { data: emailResponse, error: insertError } = await supabaseClient
      .from('estimate_email_responses')
      .insert({
        estimate_id: estimateId,
        customer_name: customerName || 'Customer',
        customer_email: customerEmail,
        pdf_url: pdfUrl,
        user_id: user.id,
        client_id: clientId || null,
        contractor_email: contractorEmail || null,
        email_subject: subject || '',
        email_body: body || '',
        accepted: null,
        declined: null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to create estimate_email_responses record:', insertError)
      throw new Error(`Database error: ${insertError.message}`)
    } else {
      console.log('✅ Created estimate_email_responses record:', emailResponse?.id)
    }

    // Step 2: Forward to n8n webhook
    let webhookData = null
    try {
      console.log('🌐 Making fetch request to webhook...')

      const webhookPayload = {
        customerName,
        customerEmail,
        subject,
        body,
        pdfUrl,
        estimateId,
        clientId,
      }

      console.log('📤 Webhook payload:', JSON.stringify(webhookPayload, null, 2))

      const webhookResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      })

      console.log('📨 Webhook response status:', webhookResponse.status)
      console.log('📨 Webhook response headers:', Object.fromEntries(webhookResponse.headers.entries()))

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text()
        console.error('Webhook error:', {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          body: errorText
        })
        // Don't throw - log and continue for now
        webhookData = {
          warning: 'Webhook call failed',
          status: webhookResponse.status,
          error: errorText
        }
      } else {
        webhookData = await webhookResponse.json()
        console.log('Webhook response:', webhookData)
      }
    } catch (webhookError) {
      console.error('Webhook fetch error:', webhookError)
      webhookData = {
        warning: 'Webhook unreachable',
        error: webhookError.message
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        webhookResponse: webhookData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in send-estimate-email function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
