#!/bin/bash

# Autonomous Database Fix Script
# Executes SQL fixes directly to Supabase PostgreSQL database

echo "🚀 EXECUTING SQL FIXES DIRECTLY TO DATABASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Database connection details
DB_HOST="db.ujhgwcurllkkeouzwvgk.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASS="SpecOps1800!!"

# Export password for psql
export PGPASSWORD="$DB_PASS"

echo "📝 FIX 1: Adding updated_at column to finance_payments..."
echo ""

# Fix 1: Add updated_at column
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_payments'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE finance_payments
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

    CREATE TRIGGER update_finance_payments_updated_at
    BEFORE UPDATE ON finance_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Added updated_at column to finance_payments';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;
EOF

echo ""
echo "✅ Fix 1 executed"
echo ""
echo "📝 FIX 2: Removing deprecated tables..."
echo ""

# Fix 2: Drop deprecated tables
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

SELECT 'Deprecated tables removed' as status;
EOF

echo ""
echo "✅ Fix 2 executed"
echo ""
echo "🔍 VERIFICATION: Checking table schemas..."
echo ""

# Verify finance_payments has updated_at
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'finance_payments'
ORDER BY ordinal_position;
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DATABASE FIXES COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Unset password
unset PGPASSWORD
