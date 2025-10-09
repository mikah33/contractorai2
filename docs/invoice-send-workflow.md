# Invoice Send Workflow - Complete ✅

## Features Implemented

### 1. Preview Invoice Button
- **Location**: Top right of Estimate Generator page
- **Action**: Switches to Preview tab to show formatted invoice
- **Style**: Blue outline button with eye icon

### 2. Send to Customer Workflow
When you click "Send to Customer":

1. **Auto-generates PDF** from preview (or basic version if not previewed)
2. **Auto-downloads PDF** to your Downloads folder
3. **Opens default email app** with:
   - Pre-filled recipient email
   - Subject: `Estimate #[NUMBER] from [YOUR COMPANY]`
   - Body with personalized greeting and estimate details
4. **Closes modal** automatically
5. **Shows success message** to attach the PDF

### 3. Company Name Integration
- Uses your profile company name in email subject/body
- Falls back to email username if company not set
- Debug logging to console for troubleshooting

## Usage

1. **Create estimate** in Builder tab
2. **Click "Preview Invoice"** to see formatted version
3. **Click "Send to Customer"** button
4. **PDF downloads automatically**
5. **Email app opens** with pre-filled content
6. **Attach the downloaded PDF** to the email
7. **Send!**

## Database Fix Applied

Added missing columns to `clients` table:
- `city TEXT`
- `state TEXT`
- `zip TEXT`
- `company TEXT`

Run this SQL in Supabase:
```sql
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS company TEXT;
```

## Files Modified

- `/src/pages/EstimateGenerator.tsx` - Added Preview button
- `/src/components/estimates/SendEstimateModal.tsx` - Auto-download & email flow
- `/supabase/migrations/20251007_fix_clients_schema.sql` - Database fix

## Next Steps

1. Run the SQL migration in Supabase
2. Test the workflow end-to-end
3. Update company name in Settings if needed
