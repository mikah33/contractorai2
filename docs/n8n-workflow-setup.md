# n8n Workflow Setup for Estimate Email

## Workflow Structure

Your n8n workflow should have these nodes:

### 1. Webhook Node
- **Name**: "Receive Estimate Data"
- **HTTP Method**: POST
- **Path**: `2ee2784c-a873-476f-aa5f-90caca848ab8`
- **Response Mode**: "Respond Immediately"
- **Response Data**: JSON

### 2. HTTP Request Node (Download PDF)
- **Name**: "Download PDF from Storage"
- **Method**: GET
- **URL**: `{{ $json.body.pdfUrl }}`
- **Response Format**: File
- **Binary Property**: `pdf`

### 3. Gmail/SendGrid Node (Send Email)
- **Name**: "Send Estimate Email"
- **To**: `{{ $json.body.customerEmail }}`
- **Subject**: `{{ $json.body.subject }}`
- **Email Type**: HTML
- **HTML**: Use the template from `n8n-email-template.html`
- **Attachments**:
  - Binary Property: `pdf`
  - File Name: `estimate-{{ $json.body.estimateId }}.pdf`

### 4. Respond to Webhook Node
- **Name**: "Return Success"
- **Response Code**: 200
- **Response Body**:
```json
{
  "success": true,
  "message": "Email sent successfully",
  "emailSentTo": "{{ $json.body.customerEmail }}"
}
```

## Flow Diagram
```
Webhook Trigger
    ↓
Download PDF from URL
    ↓
Send Email with PDF + Buttons
    ↓
Respond to Webhook (200 OK)
```

## Testing

After setting up the workflow:
1. Make sure the workflow is **Active** (toggle on)
2. Test by sending an estimate from the app
3. Check that the email arrives with:
   - PDF attached
   - Accept/Decline buttons working
   - Professional formatting

## Accept/Decline Buttons

The buttons link to an Edge Function that will:
- Update the database when clicked
- Show a "Thank you" page to the customer
- Send notification to contractor

Button URLs:
- Accept: `https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id={estimateId}&action=accept`
- Decline: `https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id={estimateId}&action=decline`

## Next Steps

1. Copy the HTML template into your Gmail/SendGrid node
2. Configure the PDF download node to fetch from the pdfUrl
3. Attach the PDF to the email
4. Test the workflow
5. Create the `estimate-response` Edge Function (I'll help with this next)
