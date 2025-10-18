# n8n PDF Download Configuration

## Step-by-Step Setup

### Node 1: Webhook (Already set up)
Your webhook receives the data with `pdfUrl`

### Node 2: HTTP Request - Download PDF

**Settings:**
- **Node Name**: `Download PDF`
- **Method**: `GET`
- **URL**: `{{ $json.body.pdfUrl }}`

**Under "Options" → "Response":**
- **Response Format**: `File`
- **Put Output in Field**: `data`
- **Binary Property Name**: `pdf`

**Screenshot reference:**
```
┌─────────────────────────────────┐
│ HTTP Request                    │
├─────────────────────────────────┤
│ Method: GET                     │
│ URL: {{ $json.body.pdfUrl }}   │
│                                 │
│ Response:                       │
│   Format: File                  │
│   Binary Property: pdf          │
└─────────────────────────────────┘
```

### Node 3: Gmail/SendGrid - Send Email

**Settings:**
- **To**: `{{ $json.body.customerEmail }}`
- **Subject**: `{{ $json.body.subject }}`
- **Email Type**: `HTML`
- **Message (HTML)**: [Paste the HTML template]

**Attachments:**
Click "Add Attachment" and configure:
- **Binary Property**: `pdf`
- **File Name**: `estimate-{{ $json.body.estimateId }}.pdf`

**Screenshot reference:**
```
┌─────────────────────────────────┐
│ Send Email (Gmail/SendGrid)     │
├─────────────────────────────────┤
│ To: {{ $json.body.customerEmail }}│
│ Subject: {{ $json.body.subject }}│
│ Email Type: HTML                │
│                                 │
│ Attachments:                    │
│   ✓ Binary Property: pdf        │
│   ✓ File Name: estimate.pdf     │
└─────────────────────────────────┘
```

### Node 4: Respond to Webhook

**Settings:**
- **Respond With**: `JSON`
- **Response Code**: `200`
- **Response Body**:
```json
{
  "success": true,
  "message": "Email sent successfully",
  "emailTo": "{{ $json.body.customerEmail }}"
}
```

## Complete Flow Diagram

```
┌──────────────┐
│   Webhook    │ Receives estimate data
│              │ { pdfUrl, customerEmail, etc }
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ HTTP Request │ Downloads PDF from pdfUrl
│              │ Output: Binary file in 'pdf' property
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Send Email  │ Sends email with PDF attached
│              │ Uses HTML template + PDF attachment
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Respond    │ Returns success to Edge Function
│              │ { success: true }
└──────────────┘
```

## Testing

1. **Test the HTTP Request node**:
   - Click "Test step"
   - You should see binary data with `pdf` property
   - Check the size matches your PDF

2. **Test the Email node**:
   - Send a test email to yourself
   - Verify PDF is attached
   - Check buttons work

3. **Test full workflow**:
   - Send an estimate from your app
   - Check email arrives
   - Verify PDF opens correctly

## Troubleshooting

### PDF not downloading:
- Check the pdfUrl is public (no 403 errors)
- Verify the URL is correct in the HTTP Request node
- Make sure "Response Format" is set to "File"

### PDF not attached to email:
- Check "Binary Property" matches between nodes (use `pdf`)
- Verify the HTTP Request node outputs binary data
- Check the attachment configuration in Email node

### Email not sending:
- Verify Gmail/SendGrid credentials
- Check "To" email address is valid
- Look for errors in n8n execution log
