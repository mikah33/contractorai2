import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface N8NReceiptData {
  vendor: string
  amount: number
  date: string
  receiptNumber?: string
  taxAmount?: number
  subtotal?: number
  supplierAddress?: string
  supplierPhone?: string
  lineItems?: Array<{
    description: string
    quantity: number
    unitPrice: number
    totalAmount: number
  }>
  confidence?: {
    vendor?: number
    amount?: number
    date?: number
    overall?: number
  }
  method?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse the request body first
    const body = await req.json()
    console.log('Received n8n webhook data:', JSON.stringify(body, null, 2))

    // Get user_id from multiple sources (for multi-user support)
    // Priority: 1) JSON body, 2) Header, 3) Query param, 4) Default dev user
    const url = new URL(req.url)
    const userIdFromBody = body.user_id
    const userIdFromHeader = req.headers.get('x-user-id')
    const userIdFromQuery = url.searchParams.get('user_id')
    const userId = userIdFromBody || userIdFromHeader || userIdFromQuery || '5ff28ea6-751f-4a22-b584-ca6c8a43f506'

    console.log('Processing request for user_id:', userId)

    // Extract receipt data from the array or single object
    let receiptsToProcess: N8NReceiptData[] = []

    if (Array.isArray(body)) {
      receiptsToProcess = body
    } else if (body.receipts && Array.isArray(body.receipts)) {
      receiptsToProcess = body.receipts
    } else if (body.vendor) {
      // Single receipt object
      receiptsToProcess = [body]
    } else {
      throw new Error('Invalid data format: expected array of receipts or single receipt object')
    }

    console.log(`Processing ${receiptsToProcess.length} receipt(s)`)

    const results = []

    for (const receiptData of receiptsToProcess) {
      // Map category from vendor or default
      const category = mapVendorToCategory(receiptData.vendor)

      // Create readable notes from line items if available
      let notes = ''
      if (receiptData.confidence?.overall) {
        notes = `Auto-extracted (${Math.round(receiptData.confidence.overall * 100)}% confidence)\n`
      }

      if (receiptData.receiptNumber) {
        notes += `Receipt #: ${receiptData.receiptNumber}\n`
      }

      if (receiptData.lineItems && receiptData.lineItems.length > 0) {
        notes += '\nItems:\n'
        receiptData.lineItems.forEach(item => {
          notes += `- ${item.description} (${item.quantity}x @ $${item.unitPrice.toFixed(2)}) = $${item.totalAmount.toFixed(2)}\n`
        })
      }

      if (receiptData.supplierAddress) {
        notes += `\nAddress: ${receiptData.supplierAddress}`
      }

      if (receiptData.supplierPhone) {
        notes += `\nPhone: ${receiptData.supplierPhone}`
      }

      // Store in finance_expenses table
      const expenseData = {
        vendor: receiptData.vendor,
        amount: receiptData.amount,
        date: receiptData.date,
        category: category,
        status: 'processed',
        notes: notes.trim() || null,
        user_id: userId, // Use dynamic user_id from request (supports multi-user)
        // Store additional metadata as JSON in a metadata column if it exists
        metadata: {
          receiptNumber: receiptData.receiptNumber,
          taxAmount: receiptData.taxAmount,
          subtotal: receiptData.subtotal,
          supplierAddress: receiptData.supplierAddress,
          supplierPhone: receiptData.supplierPhone,
          lineItems: receiptData.lineItems,
          confidence: receiptData.confidence,
          source: 'n8n_webhook'
        }
      }

      console.log('Inserting expense:', expenseData)

      // Try direct table insert with explicit error handling
      try {
        const insertResult = await supabase
          .from('finance_expenses')
          .insert(expenseData)
          .select()

        if (insertResult.error) {
          console.error('Insert error:', insertResult.error)
          throw insertResult.error
        }

        const insertedData = insertResult.data?.[0]

        console.log('Successfully inserted expense:', insertedData)
        results.push({
          success: true,
          id: insertedData?.id || 'unknown',
          vendor: receiptData.vendor,
          amount: receiptData.amount
        })
      } catch (insertError: any) {
        console.error('Failed to insert expense:', insertError)
        results.push({
          success: false,
          vendor: receiptData.vendor,
          error: insertError.message || 'Unknown error'
        })
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${receiptsToProcess.length} receipt(s)`,
        results: results,
        processed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error processing webhook:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Helper function to map vendor names to expense categories
function mapVendorToCategory(vendor: string): string {
  const vendorLower = vendor.toLowerCase()

  // Hardware stores / Building materials
  if (vendorLower.includes('home depot') ||
      vendorLower.includes('lowes') ||
      vendorLower.includes('menards') ||
      vendorLower.includes('lumber')) {
    return 'Materials'
  }

  // Tools
  if (vendorLower.includes('tool') ||
      vendorLower.includes('harbor freight') ||
      vendorLower.includes('northern tool')) {
    return 'Tools'
  }

  // Equipment rental
  if (vendorLower.includes('rental') ||
      vendorLower.includes('rent')) {
    return 'Equipment Rental'
  }

  // Office supplies
  if (vendorLower.includes('office') ||
      vendorLower.includes('staples') ||
      vendorLower.includes('depot')) {
    return 'Office Supplies'
  }

  // Fuel / Travel
  if (vendorLower.includes('gas') ||
      vendorLower.includes('fuel') ||
      vendorLower.includes('shell') ||
      vendorLower.includes('exxon') ||
      vendorLower.includes('bp')) {
    return 'Travel'
  }

  // Default to Materials for construction-related businesses
  return 'Materials'
}
