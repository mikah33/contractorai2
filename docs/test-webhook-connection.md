# Testing the Accept/Decline Webhook Integration

## Current Setup Status

✅ **Email Template**: Buttons correctly point to Edge Function
- Accept URL: `https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id={estimateId}&action=accept`
- Decline URL: `https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id={estimateId}&action=decline`

✅ **Edge Function**: Deployed with webhook notification integration
- Updates `estimate_email_responses` table
- Updates `estimates.status` to "approved" when accepted
- **Sends POST to contractor webhook**: `https://contractorai.app.n8n.cloud/webhook/c517e30d-c255-4cf0-9f0e-4cc069493ce8`

## How the Complete Flow Works

```
Customer clicks Accept/Decline in Email
    ↓
Edge Function receives GET request
    ↓
Updates estimate_email_responses table
    ↓
Updates estimates.status (if accepted)
    ↓
Sends POST to n8n contractor webhook ← THIS IS AUTOMATIC
    ↓
n8n workflow receives notification
    ↓
Contractor gets email/SMS notification
    ↓
Customer sees success HTML page
```

## Test the Edge Function Directly

### Test 1: Simulate Customer Accept Click

```bash
curl "https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id=b450dffb-3901-4a49-a1bd-0743570e2e44&action=accept"
```

**Expected Results**:
1. Returns HTML success page to customer
2. Updates database with accepted=true
3. **Automatically sends POST to n8n webhook with this payload**:
```json
{
  "estimateId": "b450dffb-3901-4a49-a1bd-0743570e2e44",
  "action": "accept",
  "customerName": "Marcus Carpenter",
  "customerEmail": "customer@example.com",
  "respondedAt": "2025-01-17T12:34:56.789Z",
  "accepted": true,
  "declined": false
}
```

### Test 2: Check n8n Webhook is Active

```bash
curl -X POST https://contractorai.app.n8n.cloud/webhook/c517e30d-c255-4cf0-9f0e-4cc069493ce8 \
  -H "Content-Type: application/json" \
  -d '{
    "estimateId": "test-123",
    "action": "accept",
    "customerName": "Test Customer",
    "customerEmail": "test@example.com",
    "respondedAt": "2025-01-17T12:00:00Z",
    "accepted": true,
    "declined": false
  }'
```

**Expected Result**:
- If n8n workflow is configured: Returns `{"success": true, "message": "Notification sent successfully"}`
- If n8n workflow is NOT configured: May return 404 or error

## Troubleshooting

### Issue: "Button isn't hooked up to webhook"

**What's Actually Happening**:
The buttons ARE connected! The flow is:
1. **Email button** → calls Edge Function
2. **Edge Function** → automatically calls contractor webhook
3. **n8n webhook** → sends notification

**The webhook is called automatically by the Edge Function, not directly by the email buttons.**

### Verify n8n Workflow is Active

1. Go to https://contractorai.app.n8n.cloud
2. Check if workflow "Contractor Notification - Estimate Responses" exists
3. Make sure workflow is ACTIVATED (toggle switch is ON)
4. If workflow doesn't exist yet, import the configuration from:
   `/docs/n8n-contractor-notification-config.json`

### Check Edge Function Logs

**Note**: Supabase CLI doesn't support `--limit` flag for logs. Instead:

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/ujhgwcurllkkeouzwvgk/logs/edge-functions
2. Select "estimate-response" function
3. Look for these log messages:
   - ✅ "Notification sent to contractor successfully"
   - ⚠️ "Failed to send notification webhook"

## Complete End-to-End Test

### Step 1: Send a Real Test Estimate

1. Go to ContractorAI app
2. Create a test estimate for yourself
3. Click "Send Estimate"
4. Use your own email address
5. Check your inbox for the estimate email

### Step 2: Click Accept Button

1. Open the estimate email
2. Click "Accept & Proceed" button
3. You should see a success page with green checkmark

### Step 3: Verify Database Updates

```sql
-- Check estimate_email_responses
SELECT * FROM estimate_email_responses
WHERE estimate_id = 'YOUR_ESTIMATE_ID'
ORDER BY responded_at DESC LIMIT 1;

-- Check estimates table
SELECT id, status, updated_at
FROM estimates
WHERE id = 'YOUR_ESTIMATE_ID';
```

### Step 4: Check if Contractor Got Notified

1. Check your email (configured in n8n Gmail node)
2. Should receive email with subject: "✅ Customer Accepted Estimate - {Name}"

## Next Steps

If the webhook is not receiving data:

1. **Verify n8n workflow is active** (most common issue)
2. **Check Edge Function logs** for webhook errors
3. **Test webhook directly** using the curl command above
4. **Verify Gmail credentials** are configured in n8n

## Code Reference

The webhook integration is in the Edge Function at:
`/supabase/functions/estimate-response/index.ts` lines 123-156

The notification is sent automatically after database updates and before returning the success page to the customer.
