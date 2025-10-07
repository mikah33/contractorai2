// Supabase Edge Function: Widget Key Generation
// Generates unique widget keys for authenticated contractors with embed code

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Request interface for key generation
interface GenerateKeyRequest {
  calculatorType: string // 'roofing', 'concrete', 'all', etc.
  domain?: string // Optional domain lock for security
}

// Response interface
interface GenerateKeyResponse {
  success: boolean
  widgetKey?: string
  embedCode?: string
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
    // Initialize Supabase client with anon key + user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    )

    // STEP 1: Authenticate user via JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized. Please sign in to generate widget keys.'
      } as GenerateKeyResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    // Parse request body
    const { calculatorType, domain } = await req.json() as GenerateKeyRequest

    // Validate calculator type
    const validCalculatorTypes = [
      'roofing', 'concrete', 'hvac', 'plumbing', 'electrical',
      'painting', 'landscaping', 'flooring', 'siding', 'windows',
      'doors', 'gutters', 'fencing', 'decking', 'driveway',
      'foundation', 'insulation', 'solar', 'pool', 'remodeling',
      'all' // Special case: allows all calculators
    ]

    if (!calculatorType || !validCalculatorTypes.includes(calculatorType)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid calculator type. Must be one of: ${validCalculatorTypes.join(', ')}`
      } as GenerateKeyResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // STEP 2: Generate unique widget key
    // Format: wk_live_<24 random chars>
    const widgetKey = `wk_live_${generateRandomString(24)}`

    // STEP 3: Insert widget key into database
    const { data: newKey, error: insertError } = await supabaseClient
      .from('widget_keys')
      .insert({
        contractor_id: user.id,
        widget_key: widgetKey,
        calculator_type: calculatorType,
        domain: domain || null,
        is_active: true,
        rate_limit_per_minute: 100, // Default rate limit
        usage_count: 0
      })
      .select('widget_key, calculator_type, domain')
      .single()

    if (insertError) {
      console.error('Widget key insert error:', insertError)

      // Handle unique constraint violation
      if (insertError.code === '23505') {
        // Extremely rare collision - retry with new key
        return new Response(JSON.stringify({
          success: false,
          error: 'Key generation collision. Please try again.'
        } as GenerateKeyResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to generate widget key. Please try again.'
      } as GenerateKeyResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // STEP 4: Generate embed code for contractor to copy
    const embedCode = generateEmbedCode(newKey.widget_key, newKey.calculator_type)

    // STEP 5: Return success with widget key and embed code
    return new Response(JSON.stringify({
      success: true,
      widgetKey: newKey.widget_key,
      embedCode: embedCode
    } as GenerateKeyResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    })

  } catch (error) {
    console.error('Widget key generation error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error. Please try again later.'
    } as GenerateKeyResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

/**
 * Generate cryptographically random string for widget key
 * @param length - Number of characters to generate
 * @returns Random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)

  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length)
  }
  return result
}

/**
 * Generate complete embed code HTML for contractor to copy/paste
 * @param widgetKey - Generated widget key
 * @param calculatorType - Type of calculator
 * @returns HTML embed code as string
 */
function generateEmbedCode(widgetKey: string, calculatorType: string): string {
  return `<!-- Contractor AI Widget - ${calculatorType.toUpperCase()} Calculator -->
<div id="contractor-ai-widget"></div>
<script>
(function() {
  var s = document.createElement('script');
  s.src = 'https://contractorai.work/widget/v1/embed.js';
  s.setAttribute('data-widget-key', '${widgetKey}');
  s.setAttribute('data-calculator', '${calculatorType}');
  s.async = true;
  document.head.appendChild(s);
})();
</script>
<!-- End Contractor AI Widget -->`
}
