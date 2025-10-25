# Widget System Quick Reference

## 🚀 Quick Test Commands

### Test Invalid Key (Should return 404)
```bash
curl -X POST 'https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/widget-validate' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzIzMjQsImV4cCI6MjA3MjYwODMyNH0.ez6RDJ2FxgSfb7mo2Xug1lXaynKLR-2nJFO-x64UNnY' \
  -d '{"widgetKey":"wk_live_test","calculatorType":"roofing"}'
```

### Run Full Test Suite
```bash
./scripts/test-widget-system.sh
```

## 📋 Database Queries

### Check Widget Keys
```sql
SELECT * FROM widget_keys
WHERE contractor_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
ORDER BY created_at DESC;
```

### Check Subscription
```sql
SELECT * FROM subscriptions
WHERE user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';
```

### Create Test Subscription
```sql
INSERT INTO subscriptions (user_id, plan, status, current_period_end)
VALUES (
  '5ff28ea6-751f-4a22-b584-ca6c8a43f506',
  'pro',
  'active',
  NOW() + INTERVAL '30 days'
)
ON CONFLICT (user_id) DO UPDATE
SET status = 'active', current_period_end = NOW() + INTERVAL '30 days';
```

### Manually Create Widget Key
```sql
INSERT INTO widget_keys (contractor_id, widget_key, calculator_type, is_active)
VALUES (
  '5ff28ea6-751f-4a22-b584-ca6c8a43f506',
  'wk_live_' || substr(md5(random()::text), 1, 24),
  'roofing',
  true
) RETURNING *;
```

### Check Widget Usage Logs
```sql
SELECT * FROM widget_usage_logs
WHERE contractor_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
ORDER BY created_at DESC
LIMIT 10;
```

## 🔧 Edge Function URLs

- **Generate:** `https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/widget-key-generate`
- **Validate:** `https://ujhgwcurllkkeouzwvgk.supabase.co/functions/v1/widget-validate`

## 🌐 Widget URL Format

```
https://contractorai.work/widget/roofing.html?key=wk_live_abc123xyz789...
```

## 🐛 Common Errors

| Error | Reason | Fix |
|-------|--------|-----|
| `invalid_key` | Key not in database | Check widget_keys table |
| `subscription_inactive` | No active subscription | Insert/update subscriptions table |
| `key_disabled` | is_active = false | Update widget_keys set is_active = true |
| `rate_limited` | Too many requests | Wait 1 minute |

## 📍 Key Files

- Edge Functions: `/supabase/functions/widget-*/index.ts`
- UI Component: `/src/pages/CalculatorWidgets.tsx`
- Widget HTML: `/widget/roofing.html`
- Test Script: `/scripts/test-widget-system.sh`

## ✅ What Was Fixed

**File:** `/supabase/functions/widget-validate/index.ts` (Line 185)

**Before (broken):**
```typescript
contractor: {
  id: contractor.id,  // ❌ undefined
  ...
}
```

**After (fixed):**
```typescript
contractor: {
  id: widget.contractor.id,  // ✅ correct
  ...
}
```

## 🎯 Testing Checklist

- [x] Invalid key returns 404
- [x] Edge functions deployed
- [ ] Generate widget key in UI
- [ ] Verify database insert
- [ ] Test widget loads with key
- [ ] Verify subscription check works
