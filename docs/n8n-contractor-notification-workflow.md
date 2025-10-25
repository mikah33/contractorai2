# n8n Contractor Notification Workflow

## Webhook URL
`https://contractorai.app.n8n.cloud/webhook/c517e30d-c255-4cf0-9f0e-4cc069493ce8`

## What This Webhook Receives

When a customer clicks Accept or Decline, the webhook receives this JSON payload:

```json
{
  "estimateId": "b450dffb-3901-4a49-a1bd-0743570e2e44",
  "action": "accept",  // or "decline"
  "customerName": "Marcus Carpenter",
  "customerEmail": "customer@example.com",
  "respondedAt": "2025-01-17T12:34:56.789Z",
  "accepted": true,
  "declined": false
}
```

## Recommended n8n Workflow Structure

```
┌─────────────────────┐
│  Webhook Trigger    │ ← Receives customer response
│  (POST)             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  IF Node            │ ← Check if accepted or declined
│  {{ $json.action }} │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│ACCEPTED │  │ DECLINED │
└────┬────┘  └────┬─────┘
     │            │
     ▼            ▼
┌─────────┐  ┌──────────┐
│Send SMS │  │Send Email│ ← Notify contractor
│or Email │  │          │
└────┬────┘  └────┬─────┘
     │            │
     └──────┬─────┘
            ▼
   ┌────────────────┐
   │ Respond 200 OK │
   └────────────────┘
```

## Step-by-Step Configuration

### Node 1: Webhook Trigger
- **Type**: Webhook
- **HTTP Method**: POST
- **Path**: `c517e30d-c255-4cf0-9f0e-4cc069493ce8`
- **Response Mode**: "When Last Node Finishes"

### Node 2: IF Node (Check Action Type)
- **Condition**: `{{ $json.action }}` equals `"accept"`
- **True Output**: Send "Accepted" notification
- **False Output**: Send "Declined" notification

### Node 3a: Send Notification (ACCEPTED)

**Option 1 - Email via Gmail:**
```
Node: Gmail
To: your-email@example.com
Subject: ✅ Customer Accepted Estimate!
Body:
Great news! {{ $json.customerName }} has ACCEPTED the estimate.

Customer Details:
- Name: {{ $json.customerName }}
- Email: {{ $json.customerEmail }}
- Estimate ID: {{ $json.estimateId }}
- Responded At: {{ $json.respondedAt }}

The estimate status has been automatically updated to "approved" in your system.
You can now proceed with the project!
```

**Option 2 - SMS via Twilio:**
```
Node: Twilio
To: +1234567890
Message:
✅ {{ $json.customerName }} ACCEPTED estimate {{ $json.estimateId }}!
Contact: {{ $json.customerEmail }}
```

**Option 3 - Slack:**
```
Node: Slack
Channel: #estimates
Message:
🎉 *Customer Accepted Estimate!*

*Customer:* {{ $json.customerName }}
*Email:* {{ $json.customerEmail }}
*Estimate ID:* {{ $json.estimateId }}
*Time:* {{ $json.respondedAt }}

Status has been updated to "approved" in ContractorAI.
```

### Node 3b: Send Notification (DECLINED)

**Email:**
```
Node: Gmail
To: your-email@example.com
Subject: ❌ Customer Declined Estimate
Body:
{{ $json.customerName }} has declined the estimate.

Customer Details:
- Name: {{ $json.customerName }}
- Email: {{ $json.customerEmail }}
- Estimate ID: {{ $json.estimateId }}
- Responded At: {{ $json.respondedAt }}

You may want to follow up to understand their concerns.
```

### Node 4: Respond to Webhook
- **Type**: Respond to Webhook
- **Response Code**: 200
- **Response Body**:
```json
{
  "success": true,
  "message": "Notification sent successfully"
}
```

## Quick Setup Instructions

1. **Open n8n** at https://contractorai.app.n8n.cloud

2. **Create New Workflow**

3. **Add Webhook Node**:
   - Set path to `c517e30d-c255-4cf0-9f0e-4cc069493ce8`
   - Set method to POST

4. **Add IF Node**:
   - Connect from Webhook
   - Condition: `{{ $json.action }} === "accept"`

5. **Add Notification Nodes**:
   - Connect "True" output to "Accepted" notification
   - Connect "False" output to "Declined" notification
   - Use Gmail, Twilio, Slack, or any notification service

6. **Add Respond to Webhook Node**:
   - Connect after notifications
   - Set response code to 200

7. **Activate Workflow** (toggle to ON)

## Testing

After setup, you can test by sending a POST request:

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

## Example Notifications

### Professional Email Template (Accepted):
```
Subject: 🎉 Estimate Approved - {{ $json.customerName }}

Hello,

Excellent news! Your estimate has been approved.

CUSTOMER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:        {{ $json.customerName }}
Email:       {{ $json.customerEmail }}
Estimate ID: {{ $json.estimateId }}
Approved:    {{ $json.respondedAt }}

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Estimate status updated to "approved"
✓ Ready to begin project
✓ Contact customer to schedule start date

View in Dashboard: https://contractorai.work/estimates

Best regards,
ContractorAI System
```

### SMS Template (Accepted):
```
✅ ESTIMATE APPROVED
{{ $json.customerName }}
ID: {{ $json.estimateId }}
📧 {{ $json.customerEmail }}
```

### SMS Template (Declined):
```
❌ Estimate Declined
{{ $json.customerName }}
ID: {{ $json.estimateId }}
Follow up recommended
```

## Troubleshooting

### Webhook not receiving data:
- Check workflow is ACTIVE (toggle ON)
- Verify webhook path matches exactly
- Check n8n execution logs

### Notifications not sending:
- Verify Gmail/Twilio/Slack credentials are configured
- Check "To" field has valid email/phone
- Look at node execution output for errors

### Multiple notifications:
- Make sure only ONE workflow uses this webhook path
- Check for duplicate workflows

## Advanced: Add Database Logging

You can also log these responses to a Google Sheet or Airtable:

```
Add Node: Google Sheets
Action: Append Row
Spreadsheet: "Estimate Responses"
Values:
- {{ $json.estimateId }}
- {{ $json.customerName }}
- {{ $json.action }}
- {{ $json.respondedAt }}
```

This gives you a historical log of all customer responses!
