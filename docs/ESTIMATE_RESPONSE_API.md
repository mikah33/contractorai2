# Estimate Response API Reference

Quick reference for the estimate email response system services.

## Services

### 1. Storage Service (`/src/services/supabaseStorage.ts`)

#### `uploadEstimatePDF(pdfBlob: Blob, estimateId: string)`
Uploads PDF to Supabase Storage bucket `estimate-pdfs`.

**Parameters:**
- `pdfBlob`: PDF file as Blob
- `estimateId`: Estimate UUID for filename

**Returns:** `Promise<SupabaseStorageResponse>`
```typescript
{
  success: boolean;
  publicUrl?: string;
  error?: Error;
}
```

**Example:**
```typescript
const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
const result = await uploadEstimatePDF(pdfBlob, 'estimate-uuid');
if (result.success) {
  console.log('PDF URL:', result.publicUrl);
}
```

#### `deleteEstimatePDF(pdfUrl: string)`
Deletes PDF from storage.

**Returns:** `Promise<boolean>`

#### `verifyStorageBucket()`
Checks if storage bucket is accessible.

**Returns:** `Promise<boolean>`

---

### 2. Database Service (`/src/services/estimateResponseService.ts`)

#### `createEstimateResponse(input: CreateEstimateResponseInput)`
Creates new estimate response record.

**Input:**
```typescript
{
  estimate_id: string;
  customer_name: string;
  customer_email: string;
  pdf_url?: string | null;
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: EstimateEmailResponse;
  error?: Error;
}
```

**Example:**
```typescript
const result = await createEstimateResponse({
  estimate_id: 'uuid',
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  pdf_url: 'https://...'
});
```

#### `updateEstimateResponse(responseId: string, input: UpdateEstimateResponseInput)`
Updates response status (accept/decline).

**Input:**
```typescript
{
  response_status: 'accepted' | 'declined';
  responded_at?: string;
}
```

#### `getEstimateResponseByEstimateId(estimateId: string)`
Fetches response for specific estimate.

#### `getAllResponsesForUser()`
Fetches all responses for authenticated user.

#### `getEstimateResponseById(responseId: string)`
Fetches response by ID.

#### `deleteEstimateResponse(responseId: string)`
Deletes response record.

---

## Edge Function API

### Endpoint
```
POST https://your-project.supabase.co/functions/v1/estimate-response
```

### Request
```json
{
  "responseId": "uuid",
  "action": "accept" | "decline"
}
```

### Response
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

### Error Response
```json
{
  "error": "Error message",
  "currentStatus": "accepted"  // if already responded
}
```

---

## TypeScript Types (`/src/types/estimateResponse.ts`)

### `EstimateEmailResponse`
```typescript
interface EstimateEmailResponse {
  id: string;
  estimate_id: string;
  customer_name: string;
  customer_email: string;
  pdf_url: string | null;
  response_status: 'pending' | 'accepted' | 'declined';
  responded_at: string | null;
  sent_at: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
```

### `WebhookPayload`
```typescript
interface WebhookPayload {
  customerName: string;
  customerEmail: string;
  clientData: Record<string, any>;
  estimateId: string;
  response: 'accepted' | 'declined';
  respondedAt: string;
}
```

---

## Complete Workflow Example

```typescript
import { uploadEstimatePDF } from './services/supabaseStorage';
import {
  createEstimateResponse,
  getEstimateResponseByEstimateId
} from './services/estimateResponseService';

// 1. Generate and upload PDF
async function sendEstimate(estimateId: string, customerData: any) {
  // Generate PDF (using existing pdfGenerator)
  const pdfBlob = await generateEstimatePDF(estimateId);

  // Upload to storage
  const uploadResult = await uploadEstimatePDF(pdfBlob, estimateId);
  if (!uploadResult.success) {
    throw new Error('PDF upload failed');
  }

  // Create response record
  const responseResult = await createEstimateResponse({
    estimate_id: estimateId,
    customer_name: customerData.name,
    customer_email: customerData.email,
    pdf_url: uploadResult.publicUrl
  });

  if (!responseResult.success) {
    throw new Error('Failed to create response record');
  }

  // Send email with links
  const acceptUrl = `https://yourapp.com/estimate/accept/${responseResult.data.id}`;
  const declineUrl = `https://yourapp.com/estimate/decline/${responseResult.data.id}`;

  await sendEmailWithLinks(
    customerData.email,
    uploadResult.publicUrl,
    acceptUrl,
    declineUrl
  );

  return responseResult.data;
}

// 2. Handle customer click (in your frontend)
async function handleEstimateClick(responseId: string, action: 'accept' | 'decline') {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/estimate-response`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId, action })
    }
  );

  const result = await response.json();

  if (result.success) {
    // Show success message
    console.log(`Estimate ${action}ed successfully!`);
  } else {
    // Handle error
    console.error(result.error);
  }
}

// 3. Check response status
async function checkEstimateStatus(estimateId: string) {
  const result = await getEstimateResponseByEstimateId(estimateId);

  if (result.success) {
    const status = result.data.response_status;
    console.log(`Current status: ${status}`);

    if (status !== 'pending') {
      console.log(`Responded at: ${result.data.responded_at}`);
    }
  }
}
```

---

## Database Schema

```sql
-- Table
estimate_email_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Indexes
idx_estimate_email_responses_estimate_id
idx_estimate_email_responses_user_id
idx_estimate_email_responses_status

-- Storage Bucket
estimate-pdfs (public)
```

---

## RLS Policies

**Database Table:**
- Users can CRUD their own responses
- Service role can update any response

**Storage Bucket:**
- Users can upload to their folder
- Anyone can view (public)
- Users can delete their own files

---

## Deployment Checklist

- [ ] Run migration: `supabase db push`
- [ ] Deploy edge function: `supabase functions deploy estimate-response`
- [ ] Verify storage bucket exists
- [ ] Test PDF upload
- [ ] Test edge function endpoint
- [ ] Verify webhook integration
- [ ] Update email templates with correct URLs
