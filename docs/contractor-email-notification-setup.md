# Contractor Email Notification System

## Overview

The contractor email notification system automatically sends email alerts to contractors when customers respond to estimates. This provides instant notifications when customers accept or decline estimates, enabling faster response times and better customer service.

## Features

- **Automatic Notifications**: Get instant email alerts when customers respond to estimates
- **Configurable Email**: Set a default notification email in settings
- **Per-Estimate Override**: Change the notification email for individual estimates
- **Professional Templates**: Beautiful HTML email templates for both accepted and declined estimates
- **Non-Blocking**: Email notifications never block customer responses

## Setup Instructions

### Step 1: Configure Your Notification Email in Settings

1. Navigate to **Settings** page in your ContractorAI dashboard
2. Scroll to the **Profile Information** section
3. Find the **Contractor Notification Email** field
4. Enter your preferred email address (e.g., `notifications@yourcompany.com`)
5. Click **Save Changes**

This email will be pre-filled when sending estimates, but you can change it on a per-estimate basis.

### Step 2: Sending an Estimate with Notifications

1. Go to the **Estimates** page
2. Create or edit an estimate
3. Click **Send to Customer**
4. In the modal, you'll see **Your Email (for notifications)** field at the top
5. Verify the email address (it will be pre-filled from your settings)
6. Optionally, change the email for this specific estimate
7. Complete the rest of the form and click **Send to Customer**

### Step 3: Configure n8n Webhook for Email Delivery

The system uses an n8n webhook to send the actual emails. You need to configure this webhook to integrate with your email provider.

#### n8n Workflow Setup

1. Log into your n8n instance at `https://contractorai.app.n8n.cloud`
2. Create a new workflow or import the provided template
3. Configure the webhook trigger:
   - Webhook URL: `https://contractorai.app.n8n.cloud/webhook/contractor-email-notification`
   - Method: POST
   - Response Mode: Last Node

#### Webhook Payload Structure

The webhook receives the following data:

```json
{
  "contractorEmail": "your-email@company.com",
  "customerName": "John Smith",
  "customerEmail": "customer@example.com",
  "estimateId": "est_123456",
  "action": "accept",
  "accepted": true,
  "declined": false,
  "respondedAt": "2025-01-18T10:30:00.000Z"
}
```

#### Gmail Integration Example

Here's a sample n8n workflow configuration for Gmail:

```yaml
Workflow Steps:
1. Webhook Trigger
   - Path: /webhook/contractor-email-notification
   - Method: POST

2. Set Variables
   - contractorEmail: {{ $json.contractorEmail }}
   - customerName: {{ $json.customerName }}
   - action: {{ $json.action }}
   - estimateId: {{ $json.estimateId }}

3. Gmail Node
   - Resource: Message
   - Operation: Send
   - To: {{ $node["Set Variables"].json["contractorEmail"] }}
   - Subject: 🎉 Estimate {{ $node["Set Variables"].json["estimateId"] }} - {{ $node["Set Variables"].json["action"] === "accept" ? "ACCEPTED" : "DECLINED" }}
   - Message Type: HTML
   - Message: Use the template below
```

#### Email Template for Gmail

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estimate Response Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                {{#if $json.accepted}}✅ Estimate Accepted!{{else}}❌ Estimate Declined{{/if}}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                Hello,
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                <strong>{{ $json.customerName }}</strong> has
                {{#if $json.accepted}}
                  <span style="color: #10b981; font-weight: bold;">accepted</span>
                {{else}}
                  <span style="color: #ef4444; font-weight: bold;">declined</span>
                {{/if}}
                your estimate.
              </p>

              <!-- Details Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 6px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Estimate ID:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">
                          {{ $json.estimateId }}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Customer Name:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">
                          {{ $json.customerName }}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Customer Email:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">
                          <a href="mailto:{{ $json.customerEmail }}" style="color: #3b82f6; text-decoration: none;">
                            {{ $json.customerEmail }}
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Response Time:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">
                          {{ $json.respondedAt.toLocaleString() }}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Status:</td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;
                            {{#if $json.accepted}}
                              background-color: #d1fae5; color: #065f46;
                            {{else}}
                              background-color: #fee2e2; color: #991b1b;
                            {{/if}}">
                            {{#if $json.accepted}}ACCEPTED{{else}}DECLINED{{/if}}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <div style="margin: 30px 0; padding: 20px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #1e40af;">
                  Next Steps:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #1e3a8a;">
                  {{#if $json.accepted}}
                    <li>Review the estimate details in your dashboard</li>
                    <li>Contact the customer to confirm project start date</li>
                    <li>Send project timeline and next steps</li>
                    <li>Convert the estimate to an invoice when ready</li>
                  {{else}}
                    <li>Consider following up with the customer for feedback</li>
                    <li>Review pricing and services to stay competitive</li>
                    <li>Update your estimate if customer requests changes</li>
                  {{/if}}
                </ul>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://app.contractorai.com/estimates"
                       style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff;
                              text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View in Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This is an automated notification from ContractorAI
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280;">
                To stop receiving these notifications, update your settings in the dashboard
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Alternative: SendGrid Integration

If you prefer SendGrid over Gmail:

```yaml
Workflow Steps:
1. Webhook Trigger
   - Same as above

2. SendGrid Node
   - API Key: Your SendGrid API key
   - From Email: noreply@contractorai.com
   - From Name: ContractorAI Notifications
   - To Email: {{ $json.contractorEmail }}
   - Subject: Same as Gmail example
   - Message Type: HTML
   - Message: Same HTML template as above
```

### Alternative: SMTP Integration

For custom SMTP servers:

```yaml
Workflow Steps:
1. Webhook Trigger
   - Same as above

2. Email (SMTP) Node
   - SMTP Host: smtp.yourdomain.com
   - SMTP Port: 587
   - Secure Connection: TLS
   - Username: Your SMTP username
   - Password: Your SMTP password
   - From Email: notifications@yourdomain.com
   - To Email: {{ $json.contractorEmail }}
   - Subject: Same as Gmail example
   - Message Type: HTML
   - Message: Same HTML template as above
```

## How It Works

### Workflow Diagram

```
┌─────────────────────┐
│ Customer receives   │
│ estimate email with │
│ Accept/Decline btns │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Customer clicks     │
│ Accept or Decline   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│ estimate-response Edge Fn   │
│ - Updates database          │
│ - Gets contractor_email     │
│ - Sends to n8n webhook      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ n8n Webhook receives data   │
│ - Formats email template    │
│ - Sends via Gmail/SendGrid  │
│ - Delivers to contractor    │
└─────────────────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Contractor receives email   │
│ with customer response      │
└─────────────────────────────┘
```

### Database Schema

The system uses the following database fields:

**profiles table:**
- `contractor_notification_email` (TEXT, nullable): Default email for notifications

**estimate_email_responses table:**
- `contractor_email` (TEXT, nullable): Contractor email for this specific estimate
- `customer_name` (TEXT): Customer who received the estimate
- `customer_email` (TEXT): Customer's email address
- `estimate_id` (TEXT): Reference to the estimate
- `accepted` (BOOLEAN): True if customer accepted
- `declined` (BOOLEAN): True if customer declined
- `responded_at` (TIMESTAMP): When customer responded

## Troubleshooting

### Emails Not Being Received

1. **Check contractor email is configured:**
   - Go to Settings and verify the email address is correct
   - Send a test estimate and confirm the email field is populated

2. **Verify n8n webhook is active:**
   - Log into n8n dashboard
   - Check that the workflow is activated (toggle should be ON)
   - Review execution logs for errors

3. **Check email provider credentials:**
   - Verify Gmail/SendGrid API keys are correct
   - Ensure SMTP credentials are valid
   - Check that the sending email is verified

4. **Review Edge Function logs:**
   - Go to Supabase Dashboard → Edge Functions
   - View logs for `estimate-response` function
   - Look for error messages or warnings

### Email Formatting Issues

If emails look broken or poorly formatted:

1. **Test in multiple email clients:**
   - Gmail, Outlook, Apple Mail, etc.
   - Use a service like Litmus or Email on Acid for testing

2. **Check HTML template:**
   - Ensure all table tags are properly closed
   - Validate CSS is inline (email clients don't support external CSS)
   - Test with simplified template first

### Performance Issues

If notifications are slow:

1. **Check n8n workflow execution time:**
   - Review execution history in n8n
   - Look for bottlenecks in the workflow

2. **Verify webhook endpoint is reachable:**
   - Test the webhook URL directly with curl or Postman
   - Check for network issues or firewall blocks

## Security Considerations

- Contractor emails are stored in the database but never exposed to customers
- Email notifications use fire-and-forget pattern (non-blocking)
- All webhooks use HTTPS for secure transmission
- Email templates sanitize all user input to prevent XSS
- Rate limiting is applied to prevent abuse

## Best Practices

1. **Use a dedicated notification email:**
   - Create a specific email like `notifications@yourcompany.com`
   - Set up email filters to organize estimate responses

2. **Test before going live:**
   - Send test estimates to yourself
   - Verify emails arrive and look correct
   - Test both accept and decline scenarios

3. **Monitor webhook health:**
   - Set up uptime monitoring for your n8n webhook
   - Review execution logs weekly for errors
   - Have a backup notification method (SMS, Slack, etc.)

4. **Keep templates updated:**
   - Review email templates quarterly
   - Update branding and contact information
   - Test on new email clients as they're released

## Support

If you encounter issues:

1. Check the [ContractorAI Documentation](https://docs.contractorai.com)
2. Review [n8n Documentation](https://docs.n8n.io)
3. Contact support at support@contractorai.com
4. Join our community Discord for help

## Version History

- **v1.0.0** (2025-01-18): Initial release
  - Basic contractor email notifications
  - n8n webhook integration
  - HTML email templates
  - Settings page configuration
