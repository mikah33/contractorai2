# Troubleshooting: "Could not find table in schema cache"

## The Problem
The Supabase Edge Function can't see the `finance_expenses` table even though it exists.

## Solution: Verify Table in Correct Schema

### Step 1: Check the table exists
Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'finance_expenses';
```

**Expected result:**
```
table_schema | table_name
-------------+-----------------
public       | finance_expenses
```

If you see `table_schema` as something OTHER than `public`, that's the issue!

### Step 2: Recreate table in public schema

If the table is in the wrong schema or doesn't exist, run this:

```sql
-- Drop if exists in wrong place
DROP TABLE IF EXISTS finance_expenses CASCADE;

-- Create in public schema explicitly
CREATE TABLE public.finance_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    vendor TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'processed',
    notes TEXT,
    project_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_finance_expenses_metadata ON public.finance_expenses USING gin(metadata);

-- Grant permissions
GRANT ALL ON public.finance_expenses TO authenticated;
GRANT ALL ON public.finance_expenses TO service_role;
```

### Step 3: Test the webhook

Run this in your terminal:

```bash
curl -X POST https://csarhyiqmprbnvfosmde.supabase.co/functions/v1/n8n-receipt-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "vendor": "Test Store",
    "amount": 50.00,
    "date": "2023-10-02"
  }'
```

**Success looks like:**
```json
{
  "success": true,
  "processed": 1,
  "failed": 0
}
```

**Still failing?** Check function logs:
https://supabase.com/dashboard/project/csarhyiqmprbnvfosmde/functions/n8n-receipt-webhook/logs

### Step 4: Verify data was inserted

```sql
SELECT * FROM public.finance_expenses ORDER BY created_at DESC LIMIT 5;
```

You should see your test data!

## Alternative: Direct Insert Test

Test if the table works at all:

```sql
INSERT INTO public.finance_expenses (vendor, amount, date, category)
VALUES ('Manual Test', 99.99, '2023-10-02', 'Materials');

SELECT * FROM public.finance_expenses WHERE vendor = 'Manual Test';
```

If this works but the webhook doesn't, it's a permissions issue with the Edge Function.
