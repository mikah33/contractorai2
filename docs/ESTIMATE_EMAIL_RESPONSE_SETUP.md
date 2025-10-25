# Estimate Email Response System - Setup Guide

This document describes the implementation and setup of the estimate email response system.

## Overview

The system allows contractors to send estimates via email and track customer responses (accept/decline) through email links.

## Architecture

### Components

1. **Database Table**: `estimate_email_responses` - Stores response records
2. **Storage Bucket**: `estimate-pdfs` - Stores PDF files
3. **Services**:
   - `supabaseStorage.ts` - Handles PDF uploads
   - `estimateResponseService.ts` - Database operations
4. **Edge Function**: `estimate-response` - Public webhook endpoint
5. **Types**: `estimateResponse.ts` - TypeScript definitions

## File Locations

```
src/
├── types/
│   └── estimateResponse.ts          # TypeScript types
├── services/
│   ├── supabaseStorage.ts           # PDF upload service
│   └── estimateResponseService.ts   # Database service

supabase/
├── functions/
│   └── estimate-response/
│       └── index.ts                  # Edge function
└── migrations/
    └── 20250117020000_create_estimate_email_responses.sql
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or apply directly in Supabase Dashboard
# SQL Editor -> New Query -> Paste migration content -> Run
```

### 2. Deploy Edge Function

```bash
# Deploy the estimate-response function
supabase functions deploy estimate-response

# Verify deployment
supabase functions list
```

### 3. Configure Storage Bucket

The migration automatically creates the `estimate-pdfs` bucket with:
- Public access enabled
- RLS policies for user uploads and deletions

Verify in Supabase Dashboard:
- Storage -> Buckets -> estimate-pdfs should exist
- Public access should be enabled

### 4. Environment Variables

No additional environment variables needed. The Edge Function uses:
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

## Usage Examples

### Creating an Estimate Response

```typescript
import { createEstimateResponse } from '../services/estimateResponseService';
import { uploadEstimatePDF } from '../services/supabaseStorage';

async function sendEstimateEmail(pdfBlob: Blob, estimateId: string) {
  // 1. Upload PDF to storage
  const { success, publicUrl, error } = await uploadEstimatePDF(pdfBlob, estimateId);

  if (!success || !publicUrl) {
    console.error('PDF upload failed:', error);
    return;
  }

  // 2. Create response record
  const result = await createEstimateResponse({
    estimate_id: estimateId,
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    pdf_url: publicUrl
  });

  if (result.success) {
    console.log('Response created:', result.data);
    // Send email with accept/decline links containing result.data.id
  }
}
```

### Customer Accept/Decline Action

```typescript
// Frontend code that calls the edge function
async function respondToEstimate(responseId: string, action: 'accept' | 'decline') {
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/estimate-response',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId, action })
    }
  );

  const result = await response.json();
  console.log('Response:', result);
}
```

### Fetching Responses

```typescript
import {
  getEstimateResponseByEstimateId,
  getAllResponsesForUser
} from '../services/estimateResponseService';

// Get response for specific estimate
const { success, data } = await getEstimateResponseByEstimateId('estimate-uuid');

// Get all responses for current user
const { success, data } = await getAllResponsesForUser();
```

## Database Schema

```sql
estimate_email_responses (
  id UUID PRIMARY KEY,
  estimate_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  pdf_url TEXT,
  response_status TEXT DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Edge Function Endpoint

**URL**: `https://your-project.supabase.co/functions/v1/estimate-response`

**Method**: `POST`

**Request Body**:
```json
{
  "responseId": "uuid-of-response",
  "action": "accept" | "decline"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Estimate accepted successfully",
  "data": {
    "responseId": "uuid",
    "estimateId": "uuid",
    "status": "accepted",
    "respondedAt": "2025-01-17T12:00:00Z"
  }
}
```

## Webhook Integration

When a customer responds, the system sends a webhook to:
```
https://contractorai.app.n8n.cloud/webhook/c517e30d-c255-4cf0-9f0e-4cc069493ce8
```

**Webhook Payload**:
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "clientData": { /* all client table fields */ },
  "estimateId": "uuid",
  "response": "accepted" | "declined",
  "respondedAt": "2025-01-17T12:00:00Z"
}
```

## Security

### Row Level Security (RLS)

- Users can only view/modify their own responses
- Service role can update any response (for edge function)
- Storage bucket allows public reads, authenticated writes

### Storage Policies

- Users can upload PDFs to their own folder
- Anyone can view PDFs (public bucket)
- Users can only delete their own PDFs

## Error Handling

All service functions return structured responses:

```typescript
{
  success: boolean;
  data?: T;
  error?: Error;
}
```

Example error handling:

```typescript
const result = await createEstimateResponse(input);

if (!result.success) {
  console.error('Failed to create response:', result.error?.message);
  // Handle error
  return;
}

// Use result.data
console.log('Created response:', result.data);
```

## Testing

### Test PDF Upload

```typescript
import { verifyStorageBucket } from '../services/supabaseStorage';

// Verify bucket exists and is accessible
const isAccessible = await verifyStorageBucket();
console.log('Bucket accessible:', isAccessible);
```

### Test Edge Function

```bash
# Using curl
curl -X POST \
  https://your-project.supabase.co/functions/v1/estimate-response \
  -H 'Content-Type: application/json' \
  -d '{
    "responseId": "your-response-uuid",
    "action": "accept"
  }'
```

## Troubleshooting

### PDF Upload Fails

1. Verify bucket exists: Supabase Dashboard -> Storage
2. Check RLS policies are enabled
3. Verify user is authenticated

### Edge Function Returns 404

1. Ensure function is deployed: `supabase functions list`
2. Check function logs: `supabase functions logs estimate-response`
3. Verify SUPABASE_URL and keys are correct

### Webhook Not Received

1. Check edge function logs for webhook errors
2. Verify webhook URL is correct
3. Test webhook endpoint directly with curl

## Future Enhancements

- Email template system
- Reminder emails for pending responses
- Analytics dashboard for response rates
- Multi-language support
- PDF customization options
