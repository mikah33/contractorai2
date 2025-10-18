# Estimate Response Edge Function - Deployment Guide

## Overview
The `estimate-response` Edge Function handles customer Accept/Decline button clicks from estimate emails.

## What It Does
1. Receives requests from email buttons with `?id={estimateId}&action={accept|decline}`
2. Updates `estimate_email_responses` table with customer response
3. Updates `estimates` table status to "approved" (if accepted)
4. Returns user-friendly HTML page to customer

## Deployment Steps

### 1. Verify Supabase CLI is Installed
```bash
# Check if installed
supabase --version

# If not installed, install it
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link to Your Project
```bash
supabase link --project-ref ujhgwcurllkkeouzwvgk
```

### 4. Deploy the Edge Function
```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2
supabase functions deploy estimate-response
```

### 5. Set Environment Variables (if needed)
The function uses:
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

These are automatically available in Edge Functions, so no manual setup needed!

### 6. Apply Database Migration
```bash
supabase db push
```

Or manually run the migration file:
```bash
# In Supabase Dashboard > SQL Editor
# Run: supabase/migrations/20250117050000_add_service_role_policies.sql
```

### 7. Test the Edge Function

**Test Accept:**
```bash
curl "https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id=YOUR_ESTIMATE_ID&action=accept"
```

**Test Decline:**
```bash
curl "https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id=YOUR_ESTIMATE_ID&action=decline"
```

## Verification Checklist

### Database Schema
- [ ] `estimate_email_responses` table exists
- [ ] Has columns: `estimate_id`, `accepted`, `declined`, `responded_at`
- [ ] `estimates` table has `status` column
- [ ] Service role policies are in place

### Edge Function
- [ ] Function is deployed
- [ ] Returns HTML (not JSON)
- [ ] Updates both database tables
- [ ] Handles errors gracefully

### Email Integration
- [ ] Accept button URL: `https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id={estimateId}&action=accept`
- [ ] Decline button URL: `https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id={estimateId}&action=decline`

## Database Schema

### estimate_email_responses
```sql
- estimate_id: UUID (FK to estimates.id)
- customer_name: TEXT
- customer_email: TEXT
- pdf_url: TEXT
- accepted: BOOLEAN
- declined: BOOLEAN
- responded_at: TIMESTAMPTZ
- user_id: UUID (FK to auth.users.id)
```

### estimates
```sql
- id: UUID (PK)
- status: TEXT (draft, sent, approved, rejected, expired)
- ... other fields
```

## RLS Policies

The Edge Function uses `service_role` key which bypasses RLS, but we've added explicit policies for security:

**estimates table:**
```sql
CREATE POLICY "Service role can update any estimate"
ON estimates FOR UPDATE TO service_role
USING (true) WITH CHECK (true);
```

**estimate_email_responses table:**
```sql
CREATE POLICY "Service role can manage all estimate responses"
ON estimate_email_responses FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

## Troubleshooting

### Error: "Failed to record your response"
- Check if estimate_id exists in database
- Verify estimate_email_responses record exists for this estimate_id
- Check Supabase logs: Dashboard > Edge Functions > estimate-response > Logs

### Error: "Could not update estimate status"
- Check if estimates table has the estimate_id
- Verify RLS policies are in place
- Check if service_role key is correct

### HTML Not Displaying
- Ensure Content-Type header is set to 'text/html'
- Check browser console for errors
- Verify CORS headers are present

## Logs & Monitoring

View logs in Supabase Dashboard:
1. Go to Edge Functions
2. Click on `estimate-response`
3. View Logs tab

Or use CLI:
```bash
supabase functions logs estimate-response
```

## Success Criteria

When everything works:
1. Customer clicks Accept/Decline in email
2. Database records are updated immediately
3. Customer sees beautiful success page
4. Contractor sees status update in EstimateGenerator
5. Manual "Customer Approved" button is removed (approval only via email)

## Next Steps

1. **Test with real email** - Send an estimate and click buttons
2. **Monitor logs** - Check for any errors
3. **Update email templates** - Ensure button URLs are correct
4. **Add analytics** - Track acceptance rates
