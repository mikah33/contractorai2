# Estimate Response - Quick Reference Card

## 🎯 Function Overview
Handles customer accept/decline responses to emailed estimates.

**URL**: `https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response`

## 📋 Parameters

| Parameter | Required | Values | Description |
|-----------|----------|--------|-------------|
| `id` | ✅ Yes | UUID | Estimate ID |
| `action` | ✅ Yes | `accept` \| `decline` | Customer action |

## 🔄 Flow

```
1. Validate params → 2. Check record exists → 3. Check not duplicate
     ↓                      ↓                        ↓
4. Update response → 5. Notify contractor → 6. Update estimate (if accepted)
     ↓
7. Return success HTML
```

## ✅ Response Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Response recorded |
| 400 | Bad Request | Missing/invalid params |
| 404 | Not Found | Invalid estimate_id |
| 409 | Conflict | Already responded |
| 500 | Server Error | Database/system error |

## 🗄️ Database

### Table: `estimate_email_responses`
```sql
accepted: BOOLEAN     -- true if accepted, null otherwise
declined: BOOLEAN     -- true if declined, null otherwise
responded_at: TIMESTAMP -- when customer responded
```

### Constraint
Only one of `accepted` or `declined` can be true at a time.

## 🔍 Debug Commands

### Check Response Status
```sql
SELECT estimate_id, accepted, declined, responded_at
FROM estimate_email_responses
WHERE estimate_id = 'YOUR_UUID';
```

### View Recent Responses
```sql
SELECT *
FROM estimate_email_responses
ORDER BY created_at DESC
LIMIT 10;
```

### Find Pending Estimates
```sql
SELECT *
FROM estimate_email_responses
WHERE accepted IS NULL AND declined IS NULL;
```

## 🧪 Quick Tests

```bash
# Test missing params
curl 'https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?action=accept'

# Test invalid action
curl 'https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id=test&action=invalid'

# Test non-existent ID
curl 'https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/estimate-response?id=00000000-0000-0000-0000-000000000000&action=accept'
```

## 📊 Logs

**Dashboard**: [View Logs](https://supabase.com/dashboard/project/ujhgwcurllkkeouzwvgk/functions/estimate-response/logs)

**Key Log Patterns**:
- `Estimate Response Request` - Request received
- `Found existing response` - Record located
- `Successfully updated` - Response recorded
- `Sending contractor notification` - Webhook called
- `Database query error` - Error details

## 🚨 Common Errors

### "This estimate link is no longer valid"
- **Cause**: estimate_id not in database
- **Fix**: Check if record exists in `estimate_email_responses`

### "This estimate has already been accepted/declined"
- **Cause**: Duplicate response attempt
- **Fix**: This is expected behavior, customer must contact contractor

### "Failed to record your response"
- **Cause**: Database update failed
- **Fix**: Check logs for detailed error

## 🔗 Integration

### From Email (send-estimate-email)
Creates record in `estimate_email_responses` with:
- estimate_id
- customer_name
- customer_email
- contractor_email
- pdf_url

### To Contractor (n8n webhook)
Sends notification with:
- action (accept/decline)
- customer details
- estimate_id
- response timestamp

### To Estimates Table
Updates on accept:
- status → 'approved'
- updated_at → now()

## 🛠️ Maintenance

**Test Script**: `scripts/test-estimate-response.sh`

**Deploy Command**:
```bash
supabase functions deploy estimate-response
```

**Documentation**:
- Full Details: `docs/estimate-response-fixes.md`
- Summary: `docs/estimate-response-summary.md`

---

**Status**: ✅ Production Ready | **Last Updated**: 2025-01-17
