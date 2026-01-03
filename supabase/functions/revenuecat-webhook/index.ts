import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// RevenueCat webhook authorization (set in RevenueCat dashboard)
const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

// RevenueCat event types we care about
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE';

interface RevenueCatEvent {
  event: {
    type: RevenueCatEventType;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    period_type: 'NORMAL' | 'INTRO' | 'TRIAL';
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
    environment: 'SANDBOX' | 'PRODUCTION';
    original_transaction_id: string;
    is_trial_conversion: boolean;
    cancel_reason?: string;
    price?: number;
    currency?: string;
    subscriber_attributes?: Record<string, { value: string; updated_at_ms: number }>;
  };
  api_version: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify webhook authorization
    const authHeader = req.headers.get('Authorization');
    if (REVENUECAT_WEBHOOK_SECRET && authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
      console.error('Invalid webhook authorization');
      return new Response('Unauthorized', { status: 401 });
    }

    const payload: RevenueCatEvent = await req.json();
    const event = payload.event;

    console.log(`[RevenueCat Webhook] Received event: ${event.type} for user: ${event.app_user_id}`);
    console.log(`[RevenueCat Webhook] Product: ${event.product_id}, Store: ${event.store}`);

    // Only process App Store events
    if (event.store !== 'APP_STORE') {
      console.log(`[RevenueCat Webhook] Ignoring non-App Store event: ${event.store}`);
      return Response.json({ received: true, processed: false, reason: 'non-app-store' });
    }

    // Get the Supabase user ID from app_user_id
    // RevenueCat app_user_id should be set to Supabase auth user ID
    const userId = event.app_user_id;

    // Determine subscription status based on event type
    let subscriptionStatus: string;
    let subscriptionPlan: string = 'pro'; // Default to pro for any purchase

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        subscriptionStatus = event.period_type === 'TRIAL' ? 'trialing' : 'active';
        break;
      case 'CANCELLATION':
        subscriptionStatus = 'canceled';
        break;
      case 'EXPIRATION':
        subscriptionStatus = 'inactive';
        break;
      case 'BILLING_ISSUE':
        subscriptionStatus = 'past_due';
        break;
      case 'SUBSCRIPTION_PAUSED':
        subscriptionStatus = 'paused';
        break;
      default:
        subscriptionStatus = 'active';
    }

    // Determine plan from product_id
    if (event.product_id.includes('basic')) {
      subscriptionPlan = 'basic';
    } else if (event.product_id.includes('enterprise')) {
      subscriptionPlan = 'enterprise';
    } else if (event.product_id.includes('pro')) {
      subscriptionPlan = 'pro';
    }

    // Update user profile with subscription info
    const updateData: Record<string, any> = {
      subscription_status: subscriptionStatus,
      subscription_plan: subscriptionPlan,
      subscription_source: 'apple',
      revenuecat_user_id: event.original_app_user_id,
      revenuecat_original_transaction_id: event.original_transaction_id,
      apple_purchase_date: new Date(event.purchased_at_ms).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Set expiration date if available
    if (event.expiration_at_ms) {
      updateData.subscription_end_date = new Date(event.expiration_at_ms).toISOString();
    }

    // Set start date for new purchases
    if (event.type === 'INITIAL_PURCHASE') {
      updateData.subscription_start_date = new Date(event.purchased_at_ms).toISOString();
    }

    console.log(`[RevenueCat Webhook] Updating profile for user ${userId}:`, updateData);

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[RevenueCat Webhook] Error updating profile:', error);

      // If user not found by ID, try to find by email from subscriber_attributes
      if (error.code === 'PGRST116' && event.subscriber_attributes?.['$email']) {
        const email = event.subscriber_attributes['$email'].value;
        console.log(`[RevenueCat Webhook] Trying to find user by email: ${email}`);

        const { data: profileByEmail, error: emailError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('email', email)
          .select()
          .single();

        if (emailError) {
          console.error('[RevenueCat Webhook] Error finding user by email:', emailError);
          return Response.json({ received: true, processed: false, error: emailError.message }, { status: 200 });
        }

        console.log(`[RevenueCat Webhook] Successfully updated user by email:`, profileByEmail?.id);
        return Response.json({ received: true, processed: true, user_id: profileByEmail?.id });
      }

      return Response.json({ received: true, processed: false, error: error.message }, { status: 200 });
    }

    console.log(`[RevenueCat Webhook] Successfully updated profile for user ${userId}`);

    return Response.json({
      received: true,
      processed: true,
      user_id: userId,
      subscription_status: subscriptionStatus,
    });
  } catch (error: any) {
    console.error('[RevenueCat Webhook] Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
