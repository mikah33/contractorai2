# N8N Calendar Notification Workflow Setup

This guide explains how to set up the automated calendar notification system in n8n.

## Overview

The workflow automatically:
1. Receives webhook from ContractorAI
2. Splits recipients into individual emails
3. Waits until the scheduled trigger time
4. Sends personalized emails to each recipient

## Step-by-Step Setup

### 1. Create New Workflow

1. Log into your n8n instance at `contractorai.app.n8n.cloud`
2. Click **"Create New Workflow"**
3. Name it: `Calendar Event Notifications`

### 2. Add Webhook Trigger

1. Add **Webhook** node
2. Set **HTTP Method**: `POST`
3. Set **Path**: `110a2ba9-93f2-4574-b2f6-3dc1d2f69637`
4. Set **Response Mode**: `Using 'Respond to Webhook' Node`
5. Click **"Listen for Test Event"** and trigger a test from your app

### 3. Add Code Node (Split Recipients)

1. Add **Code** node after Webhook
2. Name it: `Split Recipients`
3. Set **Mode**: `Run Once for All Items`
4. Copy the JavaScript code from `split-recipients-code.js`
5. Paste into the code editor

**What it does:**
- Extracts all recipients from `$json.body.notification.recipients[]`
- Creates one item per recipient
- Automatically detects all emails sent through the webhook
- No manual configuration needed!

### 4. Add Respond to Webhook Node

1. Add **Respond to Webhook** node
2. Connect it to **Split Recipients** node
3. Set **Response Body**:
```json
{
  "success": true,
  "message": "Notifications scheduled",
  "recipients_count": {{ $('Split Recipients').all().length }}
}
```

This immediately responds to the webhook while processing continues in background.

### 5. Add Wait Node

1. Add **Wait** node after Split Recipients
2. Set **Resume**: `At Specified Time`
3. Set **Date & Time**: `={{ $json.notification.trigger_time }}`
4. **Important**: Enable **"Execute Once"** to prevent duplicate executions

**How it works:**
- Pauses the workflow until the exact time specified in `trigger_time`
- Each recipient's email waits independently
- Workflow can handle 100+ scheduled notifications

### 6. Add Send Email Node

1. Add **Send Email** node after Wait
2. Configure:
   - **From Email**: `notifications@contractorai.com`
   - **To Email**: `={{ $json.recipient.email }}`
   - **Subject**: `Event Reminder: {{ $json.event.title }}`
   - **Email Type**: `HTML`
   - **Message**: Copy from `calendar-notification.html`

3. In the HTML, use these expressions:
   - `{{ $json.recipient.name }}` - Recipient's name
   - `{{ $json.recipient.email }}` - Recipient's email
   - `{{ $json.event.title }}` - Event title
   - `{{ $json.event.start_date }}` - Start date
   - `{{ $json.event.end_date }}` - End date
   - `{{ $json.event.location }}` - Location
   - `{{ $json.event.description }}` - Description

### 7. Configure Workflow Settings

1. Click **Workflow Settings** (gear icon)
2. Set **Workflow Timeout**: `Never` (or very high value)
3. Enable **Save Execution Progress**: `Yes`
4. Set **Error Workflow**: (optional, for error notifications)

### 8. Test the Workflow

1. Click **Save** and **Activate** the workflow
2. Go to ContractorAI Calendar
3. Create a test event
4. Click the Bell icon
5. Add test recipients
6. Set trigger time to 2 minutes from now
7. Click **Test Webhook**
8. Check n8n executions to see it waiting

## How the Auto-Detection Works

### Webhook Payload Structure:
```json
{
  "event": { ... },
  "notification": {
    "trigger_time": "2025-10-29T23:00",
    "message": "test message",
    "recipients": [
      {"email": "user1@example.com", "name": "User 1"},
      {"email": "user2@example.com", "name": "User 2"},
      {"email": "user3@example.com", "name": "User 3"}
    ]
  }
}
```

### Code Node Processing:
```javascript
// Automatically loops through ALL recipients
const recipients = $input.item.json.body.notification.recipients;

// Creates one email per recipient
recipients.map(recipient => ({
  json: {
    recipient: recipient,
    event: eventData,
    notification: notificationData
  }
}));
```

**Result:**
- 1 webhook = Multiple individual emails
- Each recipient gets personalized email
- No configuration needed for new recipients
- Automatically scales to 10+ recipients

## Advanced: Database Approach (For High Volume)

If you need to handle 100+ notifications per day, use this approach:

### 1. Add Supabase Node After Split Recipients
```sql
INSERT INTO scheduled_notifications (
  event_id,
  recipient_email,
  recipient_name,
  event_data,
  trigger_time,
  status
) VALUES (
  {{ $json.event.id }},
  {{ $json.recipient.email }},
  {{ $json.recipient.name }},
  {{ $json.event }},
  {{ $json.notification.trigger_time }},
  'pending'
)
```

### 2. Create Separate Cron Workflow
```
Schedule Trigger (every 5 minutes)
  ↓
Supabase Query (SELECT * WHERE trigger_time <= NOW() AND status = 'pending')
  ↓
Loop through results
  ↓
Send Email
  ↓
Update status to 'sent'
```

**Benefits:**
- More reliable for high volume
- Better monitoring and debugging
- Can retry failed emails
- Doesn't rely on long-running workflows

## Troubleshooting

### Emails not sending?
- Check Wait node is set to `{{ $json.notification.trigger_time }}`
- Verify trigger_time is in ISO format
- Check workflow timeout settings

### Getting "invalid syntax" errors?
- Make sure expressions use `{{ }}` not `{{}}`
- Use `$json.recipient.email` not `$json.body.notification.recipients[0].email`

### Workflow timing out?
- Set workflow timeout to "Never"
- Enable "Save Execution Progress"
- Or switch to database approach

### Only first recipient getting email?
- Check Code node is set to "Run Once for All Items"
- Verify it's returning an array of items
- Check Send Email node is after Wait node

## Support

For issues, check:
1. n8n execution logs
2. Webhook test data
3. Code node output
4. Email node configuration
