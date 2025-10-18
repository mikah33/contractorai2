# Finance Table Audit Report
**Generated:** 2025-10-03
**Project:** ContractorAI2
**Supabase Project:** ujhgwcurllkkeouzwvgk

## Current State

### Tables Found in Database:

| Table Name | Rows | Used by App | Status |
|------------|------|-------------|--------|
| `finance_expenses` | 2 | ✅ YES | ACTIVE |
| `finance_payments` | 1 | ✅ YES | ACTIVE |
| `recurring_expenses` | 0 | ✅ YES | ACTIVE |
| `budget_items` | 0 | ✅ YES | ACTIVE |
| `invoices` | 0 | ✅ YES | ACTIVE |
| `receipts` | 1 | ❌ NO | DEPRECATED - DELETE |
| `payments` | 0 | ❌ NO | DEPRECATED - DELETE |

## Application Code Mapping

**File:** `src/stores/financeStoreSupabase.ts`

### Receipts/Expenses:
- **App queries:** `finance_expenses`
- **Old table:** `receipts` (should be deleted)
- **Status:** ✅ Correctly using `finance_expenses`

### Payments:
- **App queries:** `finance_payments`
- **Old table:** `payments` (should be deleted)
- **Status:** ✅ Correctly using `finance_payments`

### Recurring Expenses:
- **App queries:** `recurring_expenses`
- **Status:** ✅ Correct

### Budget Items:
- **App queries:** `budget_items`
- **Status:** ✅ Correct

### Invoices:
- **App queries:** `finance_expenses` (filtered by status='approved')
- **Note:** Using expenses table as invoices - this is intentional
- **Status:** ⚠️ Needs review

## Issues Found:

### 1. Duplicate Tables
- Old `receipts` table exists alongside `finance_expenses`
- Old `payments` table exists alongside `finance_payments`
- **Impact:** Confusion, wasted storage
- **Fix:** Delete old tables

### 2. Invoice Implementation
- Line 1055-1071 in financeStoreSupabase.ts
- Fetches from `finance_expenses` with `status='approved'`
- Should probably have dedicated `invoices` table
- **Impact:** Mixing expenses and invoices
- **Fix:** Either use dedicated invoices table OR clarify this is intentional

### 3. Table Schema Mismatches
Need to verify:
- ✅ `finance_expenses` has all required columns
- ✅ `finance_payments` has all required columns
- ✅ `recurring_expenses` has all required columns
- ✅ `budget_items` has all required columns

## Recommended Actions:

1. **Delete deprecated tables:**
   ```sql
   DROP TABLE IF EXISTS receipts CASCADE;
   DROP TABLE IF EXISTS payments CASCADE;
   ```

2. **Verify schema for active tables**
3. **Test all CRUD operations**
4. **Clarify invoice strategy**
5. **Update any stale SQL migration files**

## Next Steps:
1. Create schema verification script
2. Test all finance tab functions
3. Document final table structure
4. Update all SQL files to match production schema
