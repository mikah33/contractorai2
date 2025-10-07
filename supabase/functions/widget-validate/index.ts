// Supabase Edge Function: Widget Validation with Real-Time Subscription Checking
// Validates widget keys, subscription status, domain locks, and rate limits on every widget load

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Request interface for validation
interface ValidateRequest {
  widgetKey: string
  calculatorType: string
  domain?: string
  visitorIp?: string
  referer?: string
}

// Response interface for validation
interface ValidateResponse {
  valid: boolean
  contractor?: {
    id: string
    business_name: string
    email: string
  }
  reason?: string
  error?: string
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for full database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse request body
    const { widgetKey, calculatorType, domain, visitorIp, referer } = await req.json() as ValidateRequest

    // VALIDATION STEP 1: Get widget key with contractor info
    const { data: widget, error: widgetError } = await supabase
      .from('widget_keys')
      .select(`
        id,
        contractor_id,
        calculator_type,
        domain,
        is_active,
        rate_limit_per_minute,
        usage_count,
        last_used_at,
        contractor:profiles(
          id,
          business_name,
          email
        )
      `)
      .eq('widget_key', widgetKey)
      .single()

    if (widgetError || !widget) {
      await logUsage(supabase, null, null, calculatorType, 'invalid_key', visitorIp, referer, domain)
      return new Response(JSON.stringify({
        valid: false,
        reason: 'invalid_key',
        error: 'Widget key not found'
      } as ValidateResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    // VALIDATION STEP 2: Check if widget key is active
    if (!widget.is_active) {
      await logUsage(supabase, widget.id, widget.contractor_id, calculatorType, 'key_disabled', visitorIp, referer, domain)
      return new Response(JSON.stringify({
        valid: false,
        reason: 'key_disabled',
        error: 'Widget key has been disabled'
      } as ValidateResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // VALIDATION STEP 3: Check subscription status from subscriptions table (CRITICAL - Real-time validation)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end')
      .eq('user_id', widget.contractor_id)
      .single()

    const subscriptionActive =
      subscription &&
      subscription.status === 'active' &&
      new Date(subscription.current_period_end) > new Date()

    if (!subscriptionActive) {
      await logUsage(supabase, widget.id, widget.contractor_id, calculatorType, 'subscription_inactive', visitorIp, referer, domain)
      return new Response(JSON.stringify({
        valid: false,
        reason: 'subscription_inactive',
        error: 'Subscription is not active. Please renew to continue using this widget.'
      } as ValidateResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 402
      })
    }

    // VALIDATION STEP 4: Check calculator type permission
    if (widget.calculator_type !== 'all' && widget.calculator_type !== calculatorType) {
      await logUsage(supabase, widget.id, widget.contractor_id, calculatorType, 'calculator_not_allowed', visitorIp, referer, domain)
      return new Response(JSON.stringify({
        valid: false,
        reason: 'calculator_not_allowed',
        error: `This widget key is only authorized for ${widget.calculator_type} calculator`
      } as ValidateResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // VALIDATION STEP 5: Check domain lock (if set) - prevents key theft
    if (widget.domain && domain && !domain.includes(widget.domain)) {
      await logUsage(supabase, widget.id, widget.contractor_id, calculatorType, 'domain_mismatch', visitorIp, referer, domain)
      return new Response(JSON.stringify({
        valid: false,
        reason: 'domain_mismatch',
        error: `Widget is locked to ${widget.domain}`
      } as ValidateResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // VALIDATION STEP 6: Rate limiting check (100 requests/minute per key by default)
    const oneMinuteAgo = new Date(Date.now() - 60000)
    if (widget.last_used_at && new Date(widget.last_used_at) > oneMinuteAgo) {
      const { count } = await supabase
        .from('widget_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('widget_key_id', widget.id)
        .gte('created_at', oneMinuteAgo.toISOString())

      if (count && count >= widget.rate_limit_per_minute) {
        await logUsage(supabase, widget.id, widget.contractor_id, calculatorType, 'rate_limited', visitorIp, referer, domain)
        return new Response(JSON.stringify({
          valid: false,
          reason: 'rate_limited',
          error: 'Rate limit exceeded. Please try again in a minute.'
        } as ValidateResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        })
      }
    }

    // VALIDATION STEP 7: Update usage statistics
    await supabase
      .from('widget_keys')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: (widget.usage_count || 0) + 1
      })
      .eq('id', widget.id)

    // VALIDATION STEP 8: Log successful validation
    await logUsage(supabase, widget.id, widget.contractor_id, calculatorType, 'success', visitorIp, referer, domain)

    // VALIDATION STEP 9: Return success with contractor information
    return new Response(JSON.stringify({
      valid: true,
      contractor: {
        id: widget.contractor.id,
        business_name: widget.contractor.business_name,
        email: widget.contractor.email
      }
    } as ValidateResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Widget validation error:', error)
    return new Response(JSON.stringify({
      valid: false,
      reason: 'server_error',
      error: 'Internal server error. Please try again later.'
    } as ValidateResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// Helper function: Log all validation attempts to widget_usage_logs table
async function logUsage(
  supabase: any,
  widgetKeyId: string | null,
  contractorId: string | null,
  calculatorType: string,
  result: string,
  ip?: string,
  referer?: string,
  domain?: string
) {
  try {
    await supabase.from('widget_usage_logs').insert({
      widget_key_id: widgetKeyId,
      contractor_id: contractorId,
      calculator_type: calculatorType,
      validation_result: result,
      visitor_ip: ip || null,
      referer: referer || null,
      domain: domain || null,
      error_message: result !== 'success' ? result : null
    })
  } catch (error) {
    console.error('Failed to log usage:', error)
    // Don't throw - logging failure shouldn't break validation
  }
}
