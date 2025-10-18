import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EstimateEmailResponse {
  id: string;
  estimate_id: string;
  customer_name: string;
  customer_email: string;
  pdf_url: string;
  accepted?: boolean | null;
  declined?: boolean | null;
  responded_at?: string | null;
  sent_at: string;
  user_id: string;
  contractor_email?: string | null;
  client_id?: string | null;
  email_subject?: string;
  email_body?: string;
  created_at: string;
  updated_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get query parameters
    const url = new URL(req.url);
    const estimateId = url.searchParams.get('id');
    const action = url.searchParams.get('action');

    console.log('Estimate Response Request:', { estimateId, action });

    // Validate parameters
    if (!estimateId) {
      return new Response(
        generateErrorHTML('Missing estimate ID'),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    if (!action || !['accept', 'decline'].includes(action)) {
      return new Response(
        generateErrorHTML('Invalid action. Must be "accept" or "decline"'),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    // Initialize Supabase client with service role key (admin access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Initialized Supabase client');

    // Step 1: Check if estimate_email_responses record exists
    const { data: existingResponse, error: checkError } = await supabase
      .from('estimate_email_responses')
      .select('*')
      .eq('estimate_id', estimateId)
      .single();

    if (checkError) {
      console.error('Database query error:', {
        code: checkError.code,
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint,
        estimateId
      });

      return new Response(
        generateErrorHTML(
          `This estimate link is no longer valid. The estimate may have been sent before our system was updated. Please contact the contractor to request a new estimate.<br><br><small>Error: ${checkError.message}</small>`
        ),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    if (!existingResponse) {
      console.error('Estimate response record not found for estimate_id:', estimateId);
      return new Response(
        generateErrorHTML('This estimate link is no longer valid. The estimate may have been sent before our system was updated. Please contact the contractor to request a new estimate.'),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    console.log('Found existing response:', {
      id: existingResponse.id,
      estimate_id: existingResponse.estimate_id,
      accepted: existingResponse.accepted,
      declined: existingResponse.declined,
      customer_name: existingResponse.customer_name
    });

    // Check if already responded
    if (existingResponse.accepted === true || existingResponse.declined === true) {
      const alreadyAccepted = existingResponse.accepted === true;
      console.warn('Estimate already responded to:', {
        estimate_id: estimateId,
        previously_accepted: alreadyAccepted,
        previously_declined: existingResponse.declined === true
      });

      return new Response(
        generateErrorHTML(
          `This estimate has already been ${alreadyAccepted ? 'accepted' : 'declined'}. If you need to change your response, please contact the contractor directly.`
        ),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    // Step 2: Update estimate_email_responses table with accepted/declined flags
    const responseUpdate: Partial<EstimateEmailResponse> = {
      responded_at: new Date().toISOString(),
    };

    if (action === 'accept') {
      responseUpdate.accepted = true;
      responseUpdate.declined = null;
    } else {
      responseUpdate.accepted = null;
      responseUpdate.declined = true;
    }

    console.log('Updating response with:', responseUpdate);

    const { data: emailResponse, error: emailResponseError } = await supabase
      .from('estimate_email_responses')
      .update(responseUpdate)
      .eq('estimate_id', estimateId)
      .select()
      .single();

    if (emailResponseError) {
      console.error('Error updating estimate_email_responses:', {
        code: emailResponseError.code,
        message: emailResponseError.message,
        details: emailResponseError.details,
        hint: emailResponseError.hint
      });

      return new Response(
        generateErrorHTML(
          `Failed to record your response. Please try again or contact support.<br><br><small>Error: ${emailResponseError.message}</small>`
        ),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    console.log('Successfully updated estimate_email_responses:', {
      id: emailResponse.id,
      estimate_id: emailResponse.estimate_id,
      accepted: emailResponse.accepted,
      declined: emailResponse.declined,
      responded_at: emailResponse.responded_at
    });

    // Step 2: Send contractor notification email (fire and forget)
    if (emailResponse.contractor_email) {
      try {
        const CONTRACTOR_NOTIFICATION_WEBHOOK = 'https://contractorai.app.n8n.cloud/webhook/c517e30d-c255-4cf0-9f0e-4cc069493ce8';

        const contractorNotificationPayload = {
          contractorEmail: emailResponse.contractor_email,
          customerName: emailResponse.customer_name,
          customerEmail: emailResponse.customer_email,
          estimateId: estimateId,
          action: action,
          accepted: emailResponse.accepted === true,
          declined: emailResponse.declined === true,
          respondedAt: emailResponse.responded_at
        };

        console.log('📧 Sending contractor notification:', contractorNotificationPayload);

        const contractorWebhookResponse = await fetch(CONTRACTOR_NOTIFICATION_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(contractorNotificationPayload)
        });

        if (contractorWebhookResponse.ok) {
          console.log('✅ Contractor notification sent successfully');
        } else {
          console.warn('⚠️ Failed to send contractor notification webhook:', await contractorWebhookResponse.text());
        }
      } catch (contractorNotificationError) {
        // Don't fail the whole request if contractor notification fails
        console.error('❌ Error sending contractor notification:', contractorNotificationError);
        console.warn('Customer response was recorded, but contractor notification failed');
      }
    } else {
      console.log('ℹ️ No contractor email configured, skipping contractor notification');
    }

    // Step 3: Update estimates table (only if accepted)
    if (action === 'accept') {
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', estimateId)
        .select()
        .single();

      if (estimateError) {
        console.error('Error updating estimates table:', {
          code: estimateError.code,
          message: estimateError.message,
          details: estimateError.details,
          hint: estimateError.hint,
          estimateId
        });
        // Don't fail the whole request if we can't update the estimate status
        // The email response was already recorded
        console.warn('Could not update estimate status, but email response was recorded');
      } else {
        console.log('Successfully updated estimate status:', {
          id: estimate.id,
          status: estimate.status,
          updated_at: estimate.updated_at
        });
      }
    } else {
      console.log('Estimate declined - not updating estimates table status');
    }

    // Step 4: Return success HTML page
    const customerName = emailResponse.customer_name || 'Customer';
    const successHTML = generateSuccessHTML(action, customerName);

    return new Response(successHTML, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Unexpected error in estimate-response function:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      estimateId: new URL(req.url).searchParams.get('id'),
      action: new URL(req.url).searchParams.get('action')
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      generateErrorHTML(
        `An unexpected error occurred. Please contact support.<br><br><small>Error: ${errorMessage}</small>`
      ),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      }
    );
  }
});

/**
 * Generate success HTML page for customer
 */
function generateSuccessHTML(action: string, customerName: string): string {
  const isAccepted = action === 'accept';
  const title = isAccepted ? 'Estimate Accepted' : 'Estimate Declined';
  const icon = isAccepted ? '✅' : '❌';
  const color = isAccepted ? '#10b981' : '#ef4444';
  const message = isAccepted
    ? `Thank you for accepting this estimate! We'll be in touch soon to get started on your project.`
    : `Thank you for reviewing this estimate. We appreciate you taking the time to consider our proposal.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 100%;
      padding: 48px 32px;
      text-align: center;
      animation: slideUp 0.5s ease-out;
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .icon {
      font-size: 72px;
      margin-bottom: 24px;
      animation: scaleIn 0.6s ease-out 0.2s both;
    }
    @keyframes scaleIn {
      from {
        transform: scale(0);
      }
      to {
        transform: scale(1);
      }
    }
    h1 {
      color: ${color};
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .customer-name {
      color: #6b7280;
      font-size: 18px;
      margin-bottom: 24px;
    }
    .message {
      color: #374151;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .details {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6b7280;
      font-size: 14px;
    }
    .detail-value {
      color: #111827;
      font-weight: 600;
      font-size: 14px;
    }
    .footer {
      color: #9ca3af;
      font-size: 14px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .status-badge {
      display: inline-block;
      background: ${color};
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p class="customer-name">Hello, ${customerName}!</p>
    <p class="message">${message}</p>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Response Status:</span>
        <span class="detail-value">${isAccepted ? 'Accepted' : 'Declined'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Recorded At:</span>
        <span class="detail-value">${new Date().toLocaleString()}</span>
      </div>
    </div>

    <div class="status-badge">
      Response Recorded Successfully
    </div>

    <div class="footer">
      <p>This response has been recorded in our system.</p>
      <p style="margin-top: 8px;">You may close this window.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate error HTML page
 */
function generateErrorHTML(errorMessage: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 100%;
      padding: 48px 32px;
      text-align: center;
    }
    .icon {
      font-size: 72px;
      margin-bottom: 24px;
    }
    h1 {
      color: #ef4444;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .message {
      color: #374151;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .support {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      color: #991b1b;
      font-size: 14px;
      margin-top: 24px;
    }
    .footer {
      color: #9ca3af;
      font-size: 14px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>Oops!</h1>
    <p class="message">${errorMessage}</p>

    <div class="support">
      <strong>Need Help?</strong><br>
      Please contact our support team if you continue to experience issues.
    </div>

    <div class="footer">
      <p>You may close this window and try again.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
