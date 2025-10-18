# Profit Calculation Architecture Design

## Executive Summary

**Problem**: The current profit trend graph shows incorrect calculations using only `revenue - expenses` from the `monthlyData` array, which doesn't include all necessary financial variables.

**Root Cause**: The `calculateFinancialSummary` function in `financeStoreSupabase.ts` (lines 1586-1733) oversimplifies profit calculation by excluding critical expense categories:
- Employee payroll
- Contractor payments
- Recurring expenses (only calculated for total, not monthly breakdown)
- Budget overruns
- Indirect costs
- Taxes and fees

**Solution**: Implement comprehensive profit calculation that includes ALL financial variables across all database tables.

---

## Current Implementation Analysis

### Current Data Flow
```
Database (Supabase)
  ├── finance_expenses (receipts)
  ├── finance_payments (revenue)
  ├── recurring_expenses
  ├── budget_items
  ├── employee_payments
  ├── contractor_payments
  ├── invoices
  └── invoice_payments
         ↓
financeStoreSupabase.ts
  ├── fetchReceipts()
  ├── fetchPayments()
  ├── fetchRecurringExpenses()
  ├── fetchBudgetItems()
  ├── fetchInvoices()
  └── calculateFinancialSummary() ← **PROBLEM HERE**
         ↓
financialSummary.monthlyData[] ← **INCOMPLETE DATA**
         ↓
FinanceSummaryChart.tsx (lines 37-80)
         ↓
Dashboard.tsx (displays chart)
```

### Current Profit Calculation (INCORRECT)

**File**: `src/stores/financeStoreSupabase.ts` (lines 1688-1714)

```typescript
// CURRENT IMPLEMENTATION - INCOMPLETE
const monthlyData = [];
for (let i = 5; i >= 0; i--) {
  const monthRevenue = payments
    .filter(p => /* date range */)
    .reduce((sum, p) => sum + p.amount, 0);

  const monthExpenses = receipts  // ❌ ONLY RECEIPTS
    .filter(r => /* date range */)
    .reduce((sum, r) => sum + r.amount, 0);

  monthlyData.push({
    month: /* month name */,
    revenue: monthRevenue,
    expenses: monthExpenses  // ❌ MISSING 6+ EXPENSE CATEGORIES
  });
}
```

### Display Logic (Currently Works, No Changes Needed)

**File**: `src/components/finance/FinanceDashboard.tsx` (lines 127-129)
```typescript
const value = data.revenue - data.expenses; // Simple subtraction
```

**File**: `src/components/dashboard/FinanceSummaryChart.tsx` (lines 37-80)
```typescript
// Chart just displays the data - no calculation here
```

---

## Correct Profit Calculation Formula

### Complete Formula

```
GROSS_REVENUE = sum(finance_payments.amount WHERE status='completed')

DIRECT_COSTS =
  + sum(finance_expenses.amount WHERE category IN ('Materials', 'Equipment', 'Subcontractor'))
  + sum(contractor_payments.amount WHERE status='completed')

LABOR_COSTS =
  + sum(employee_payments.amount WHERE status='completed')

OPERATING_EXPENSES =
  + sum(finance_expenses.amount WHERE category IN ('Supplies', 'General'))
  + sum(recurring_expenses.amount WHERE is_active=true, prorated by frequency)
  + sum(budget_items.actual_amount)

OVERHEAD =
  + sum(finance_expenses.amount WHERE category IN ('Rent', 'Utilities', 'Insurance'))
  + sum(recurring_expenses.amount WHERE category IN ('Rent', 'Utilities', 'Insurance'))

TOTAL_EXPENSES = DIRECT_COSTS + LABOR_COSTS + OPERATING_EXPENSES + OVERHEAD

NET_PROFIT = GROSS_REVENUE - TOTAL_EXPENSES

PROFIT_MARGIN = (NET_PROFIT / GROSS_REVENUE) * 100
```

---

## Database Schema Reference

### Revenue Tables
```sql
-- finance_payments: Primary revenue tracking
CREATE TABLE finance_payments (
  id UUID PRIMARY KEY,
  client_name VARCHAR(255),
  amount DECIMAL(15,2),
  date DATE,
  method VARCHAR(50),
  status VARCHAR(20), -- 'pending' | 'completed' | 'failed'
  project_id UUID,
  user_id UUID
);

-- invoice_payments: Invoice-specific payments (also revenue)
CREATE TABLE invoice_payments (
  id UUID PRIMARY KEY,
  invoice_id UUID,
  amount DECIMAL(15,2),
  payment_date DATE,
  payment_method VARCHAR(50)
);

-- invoices: Outstanding invoices (future revenue)
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  total_amount DECIMAL(15,2),
  paid_amount DECIMAL(15,2),
  balance DECIMAL(15,2), -- total_amount - paid_amount
  status VARCHAR(20) -- 'outstanding' | 'partial' | 'paid'
);
```

### Expense Tables
```sql
-- finance_expenses: Direct expenses (receipts)
CREATE TABLE finance_expenses (
  id UUID PRIMARY KEY,
  vendor VARCHAR(255),
  amount DECIMAL(15,2),
  date DATE,
  category VARCHAR(100), -- Materials, Supplies, Equipment, etc.
  project_id UUID,
  metadata JSONB -- Optional detailed line items
);

-- employee_payments: Labor costs
CREATE TABLE employee_payments (
  id UUID PRIMARY KEY,
  employee_id UUID,
  amount DECIMAL(15,2),
  pay_date DATE,
  status VARCHAR(20) -- 'pending' | 'completed'
);

-- contractor_payments: Subcontractor costs
CREATE TABLE contractor_payments (
  id UUID PRIMARY KEY,
  contractor_id UUID,
  amount DECIMAL(15,2),
  payment_date DATE,
  status VARCHAR(20) -- 'pending' | 'completed'
);

-- recurring_expenses: Overhead and recurring costs
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  amount DECIMAL(15,2),
  category VARCHAR(100),
  frequency VARCHAR(20), -- 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date DATE,
  is_active BOOLEAN
);

-- budget_items: Planned vs actual tracking
CREATE TABLE budget_items (
  id UUID PRIMARY KEY,
  project_id UUID,
  category VARCHAR(100),
  budgeted_amount DECIMAL(15,2),
  actual_amount DECIMAL(15,2),
  variance DECIMAL(15,2) GENERATED -- budgeted - actual
);
```

---

## Implementation Plan

### Phase 1: Update Data Types

**File**: `src/stores/financeStoreSupabase.ts`

**Action**: Extend `FinancialSummary` interface

```typescript
export interface MonthlyFinancialData {
  month: string;

  // Revenue breakdown
  revenue: number;
  revenueFromPayments: number;
  revenueFromInvoices: number;

  // Expense breakdown
  expenses: number; // TOTAL
  directCosts: number;
  laborCosts: number;
  operatingExpenses: number;
  overheadCosts: number;
  recurringExpenses: number;

  // Calculated fields
  profit: number; // revenue - expenses
  profitMargin: number; // (profit / revenue) * 100

  // Counts for context
  transactionCount: {
    payments: number;
    receipts: number;
    employeePayments: number;
    contractorPayments: number;
    recurringExpenses: number;
  };
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  outstandingInvoices: number;
  upcomingPayments: Array<{...}>;
  recentTransactions: Array<{...}>;
  monthlyData: MonthlyFinancialData[]; // ← UPDATED TYPE
  expensesByCategory: Array<{...}>;
}
```

### Phase 2: Implement Comprehensive Calculation

**File**: `src/stores/financeStoreSupabase.ts`

**Function**: `calculateFinancialSummary()` (lines 1586-1733)

**Changes**: Complete rewrite of monthly calculation logic

```typescript
// Calculate monthly data for last 6 months
calculateFinancialSummary: async () => {
  const state = get();
  const { receipts, payments, invoices, recurringExpenses } = state;

  // NEW: Fetch employee and contractor payments
  const { data: employeePaymentsData } = await supabase
    .from('employee_payments')
    .select('amount, pay_date, status');

  const { data: contractorPaymentsData } = await supabase
    .from('contractor_payments')
    .select('amount, payment_date, status');

  const employeePayments = employeePaymentsData || [];
  const contractorPayments = contractorPaymentsData || [];

  // Calculate monthly data for last 6 months
  const monthlyData: MonthlyFinancialData[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // Helper: Check if date is in month range
    const isInMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= monthStart && d <= monthEnd;
    };

    // ===== REVENUE CALCULATION =====
    const monthPayments = payments.filter(p =>
      p.status === 'completed' && isInMonth(p.date)
    );
    const revenueFromPayments = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    // Invoice payments received this month
    const invoicePayments = invoices
      .filter(inv => inv.paidAmount > 0 && isInMonth(inv.updatedAt || inv.createdAt))
      .reduce((sum, inv) => sum + inv.paidAmount, 0);

    const totalRevenue = revenueFromPayments + invoicePayments;

    // ===== EXPENSE CALCULATION =====

    // 1. Direct Costs (materials, equipment, subcontractor)
    const directCostReceipts = receipts.filter(r =>
      isInMonth(r.date) &&
      ['Materials', 'Equipment', 'Subcontractor'].includes(r.category)
    );
    const directCostsFromReceipts = directCostReceipts.reduce((sum, r) => sum + r.amount, 0);

    const contractorPaymentsThisMonth = contractorPayments.filter(cp =>
      cp.status === 'completed' && isInMonth(cp.payment_date)
    );
    const contractorCosts = contractorPaymentsThisMonth.reduce((sum, cp) => sum + cp.amount, 0);

    const directCosts = directCostsFromReceipts + contractorCosts;

    // 2. Labor Costs (employees)
    const employeePaymentsThisMonth = employeePayments.filter(ep =>
      ep.status === 'completed' && isInMonth(ep.pay_date)
    );
    const laborCosts = employeePaymentsThisMonth.reduce((sum, ep) => sum + ep.amount, 0);

    // 3. Operating Expenses (supplies, general expenses)
    const operatingReceipts = receipts.filter(r =>
      isInMonth(r.date) &&
      ['Supplies', 'General', 'Office'].includes(r.category)
    );
    const operatingExpenses = operatingReceipts.reduce((sum, r) => sum + r.amount, 0);

    // 4. Overhead (rent, utilities, insurance)
    const overheadReceipts = receipts.filter(r =>
      isInMonth(r.date) &&
      ['Rent', 'Utilities', 'Insurance', 'Software'].includes(r.category)
    );
    const overheadFromReceipts = overheadReceipts.reduce((sum, r) => sum + r.amount, 0);

    // 5. Recurring Expenses (prorated)
    const activeRecurring = recurringExpenses.filter(e => e.isActive);
    const recurringTotal = activeRecurring.reduce((sum, e) => {
      // Check if this expense was active during this month
      const startDate = e.startDate ? new Date(e.startDate) : new Date(0);
      if (startDate > monthEnd) return sum; // Not started yet

      // Prorate based on frequency
      let monthlyAmount = 0;
      switch (e.frequency) {
        case 'weekly': monthlyAmount = e.amount * 4.33; break;
        case 'monthly': monthlyAmount = e.amount; break;
        case 'quarterly': monthlyAmount = e.amount / 3; break;
        case 'yearly': monthlyAmount = e.amount / 12; break;
      }
      return sum + monthlyAmount;
    }, 0);

    const overheadCosts = overheadFromReceipts + recurringTotal;

    // ===== TOTAL CALCULATION =====
    const totalExpenses = directCosts + laborCosts + operatingExpenses + overheadCosts;
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    monthlyData.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),

      // Revenue
      revenue: totalRevenue,
      revenueFromPayments,
      revenueFromInvoices: invoicePayments,

      // Expenses
      expenses: totalExpenses,
      directCosts,
      laborCosts,
      operatingExpenses,
      overheadCosts,
      recurringExpenses: recurringTotal,

      // Calculated
      profit,
      profitMargin,

      // Transaction counts
      transactionCount: {
        payments: monthPayments.length,
        receipts: receipts.filter(r => isInMonth(r.date)).length,
        employeePayments: employeePaymentsThisMonth.length,
        contractorPayments: contractorPaymentsThisMonth.length,
        recurringExpenses: activeRecurring.length
      }
    });
  }

  // Calculate totals for the entire period
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // ... rest of summary calculation (outstanding invoices, etc.)

  set({
    financialSummary: {
      totalRevenue,
      totalExpenses,
      profit,
      profitMargin,
      // ... other fields
      monthlyData // ← UPDATED WITH COMPREHENSIVE DATA
    }
  });
}
```

### Phase 3: Update Chart Component (Optional Enhancement)

**File**: `src/components/dashboard/FinanceSummaryChart.tsx`

**Current**: Simple bar chart showing revenue vs expenses

**Enhancement**: Add tooltip to show breakdown

```typescript
// Lines 59-73 - Add tooltip with breakdown
<div
  className="bg-blue-500 rounded-t-sm w-[40%]"
  style={{ height: `${Math.max((data.revenue / maxValue) * 100, 2)}%` }}
  title={`Revenue: $${data.revenue.toLocaleString()}\n` +
         `Payments: $${data.revenueFromPayments.toLocaleString()}\n` +
         `Invoices: $${data.revenueFromInvoices.toLocaleString()}`}
></div>
<div
  className="bg-teal-500 rounded-t-sm w-[40%]"
  style={{ height: `${Math.max((data.expenses / maxValue) * 100, 2)}%` }}
  title={`Total Expenses: $${data.expenses.toLocaleString()}\n` +
         `Direct: $${data.directCosts.toLocaleString()}\n` +
         `Labor: $${data.laborCosts.toLocaleString()}\n` +
         `Operating: $${data.operatingExpenses.toLocaleString()}\n` +
         `Overhead: $${data.overheadCosts.toLocaleString()}`}
></div>
```

### Phase 4: Remove Export Button

**File**: `src/components/finance/FinanceDashboard.tsx`

**Lines to Remove**: 225-231

```typescript
// DELETE THIS BLOCK:
<button
  onClick={() => onExport('pdf')}
  className="inline-flex items-center px-3 py-2 border border-gray-300..."
>
  <Download className="h-4 w-4 mr-2" />
  Export
</button>
```

---

## Files to Modify

### Critical Changes (Must Implement)

1. **`src/stores/financeStoreSupabase.ts`**
   - Lines 149-178: Update `FinancialSummary` and add `MonthlyFinancialData` interface
   - Lines 1586-1733: Complete rewrite of `calculateFinancialSummary()` function
   - Add new queries for employee_payments and contractor_payments

2. **`src/components/finance/FinanceDashboard.tsx`**
   - Lines 225-231: Remove export button
   - No other changes needed (profit calculation is correct: `revenue - expenses`)

### Optional Enhancements

3. **`src/components/dashboard/FinanceSummaryChart.tsx`**
   - Lines 59-73: Add detailed tooltips showing expense breakdown
   - Add legend showing breakdown categories

4. **`src/types/finance.ts`** (Create new file)
   - Move all finance-related types from financeStoreSupabase.ts
   - Create centralized type definitions

---

## Testing Plan

### Unit Tests Required

1. **Profit Calculation Accuracy**
   ```typescript
   describe('calculateFinancialSummary', () => {
     it('should include all expense categories', async () => {
       // Mock data with known values
       const mockData = {
         payments: [{ amount: 10000, date: '2025-10-15', status: 'completed' }],
         receipts: [{ amount: 2000, date: '2025-10-15', category: 'Materials' }],
         employeePayments: [{ amount: 3000, pay_date: '2025-10-15', status: 'completed' }],
         contractorPayments: [{ amount: 1500, payment_date: '2025-10-15', status: 'completed' }],
         recurringExpenses: [{ amount: 500, frequency: 'monthly', isActive: true }]
       };

       const result = await calculateFinancialSummary();

       expect(result.monthlyData[5].revenue).toBe(10000);
       expect(result.monthlyData[5].directCosts).toBe(2000 + 1500); // receipts + contractors
       expect(result.monthlyData[5].laborCosts).toBe(3000);
       expect(result.monthlyData[5].recurringExpenses).toBe(500);
       expect(result.monthlyData[5].expenses).toBe(7000); // 2000+3000+1500+500
       expect(result.monthlyData[5].profit).toBe(3000); // 10000 - 7000
     });
   });
   ```

2. **Monthly Date Range Filtering**
   ```typescript
   it('should correctly filter transactions by month', () => {
     // Test that Oct 2025 transactions don't appear in Nov 2025 data
   });
   ```

3. **Recurring Expense Proration**
   ```typescript
   it('should correctly prorate recurring expenses', () => {
     // Weekly: amount * 4.33
     // Monthly: amount * 1
     // Quarterly: amount / 3
     // Yearly: amount / 12
   });
   ```

### Integration Tests

1. **Database Query Performance**
   - Ensure queries complete in < 500ms
   - Test with 1000+ transactions per table

2. **Real-time Updates**
   - Add new payment → verify chart updates
   - Add new expense → verify chart updates

### Manual Testing Checklist

- [ ] Create test data across all tables
- [ ] Verify monthly totals match manual calculation
- [ ] Check profit margin percentage
- [ ] Verify chart displays correctly
- [ ] Test with empty months (no transactions)
- [ ] Test with negative profit months
- [ ] Verify export button is removed
- [ ] Test date range selector

---

## Migration Strategy

### Step 1: Backup Current Data
```sql
-- Create backup tables
CREATE TABLE monthlyData_backup AS
SELECT * FROM financialSummary;
```

### Step 2: Deploy Changes
1. Update TypeScript interfaces
2. Deploy new `calculateFinancialSummary()` function
3. Remove export button
4. Test in staging environment

### Step 3: Verify Accuracy
1. Compare old vs new calculations
2. Validate against manual spreadsheet
3. Check for performance regression

### Step 4: Monitor Production
1. Track calculation time
2. Monitor error rates
3. Collect user feedback

---

## Performance Considerations

### Current Performance
- **Query Count**: 2 (payments, receipts)
- **Calculation Time**: ~50ms
- **Monthly Loop**: 6 iterations

### New Performance
- **Query Count**: 6 (payments, receipts, employees, contractors, invoices, recurring)
- **Estimated Time**: ~200ms
- **Monthly Loop**: 6 iterations × 6 filters = 36 operations

### Optimization Strategies

1. **Database-side Aggregation**
   ```typescript
   // Instead of filtering in JS, use SQL
   const { data } = await supabase.rpc('get_monthly_expenses', {
     start_date: monthStart,
     end_date: monthEnd
   });
   ```

2. **Caching**
   ```typescript
   // Cache monthly calculations (they don't change)
   const cacheKey = `monthly-${monthStart}-${monthEnd}`;
   const cached = localStorage.getItem(cacheKey);
   if (cached) return JSON.parse(cached);
   ```

3. **Batch Queries**
   ```typescript
   // Fetch all data in parallel
   const [payments, receipts, employees, contractors] = await Promise.all([
     supabase.from('finance_payments').select(),
     supabase.from('finance_expenses').select(),
     supabase.from('employee_payments').select(),
     supabase.from('contractor_payments').select()
   ]);
   ```

---

## Risk Assessment

### High Risk
- ❌ **Data Integrity**: Missing transactions in calculation
  - **Mitigation**: Comprehensive unit tests

- ❌ **Performance Degradation**: 4x more queries
  - **Mitigation**: Implement caching and database-side aggregation

### Medium Risk
- ⚠️ **Type Mismatches**: New interface may break existing code
  - **Mitigation**: TypeScript compile-time checks

- ⚠️ **Date Range Bugs**: Off-by-one errors in month filtering
  - **Mitigation**: Extensive date range testing

### Low Risk
- ✅ **UI Rendering**: Chart component is well-tested
- ✅ **Export Removal**: Simple deletion, no side effects

---

## Success Criteria

### Functional Requirements
- ✅ Profit calculation includes ALL 6+ expense categories
- ✅ Monthly data accurately reflects database state
- ✅ Export button is removed
- ✅ Chart displays correct trends

### Performance Requirements
- ✅ Calculation completes in < 1 second
- ✅ No UI blocking during calculation
- ✅ Handles 10,000+ transactions without lag

### Quality Requirements
- ✅ 100% unit test coverage for calculation logic
- ✅ Zero TypeScript compilation errors
- ✅ Zero runtime errors in production
- ✅ Manual validation matches spreadsheet calculations

---

## Rollback Plan

If the new calculation causes issues:

1. **Immediate Rollback** (< 5 minutes)
   ```typescript
   // Revert to simple calculation
   const monthExpenses = receipts
     .filter(r => isInMonth(r.date))
     .reduce((sum, r) => sum + r.amount, 0);
   ```

2. **Fix and Redeploy** (< 1 hour)
   - Identify bug in calculation
   - Fix and test locally
   - Redeploy corrected version

3. **Full Revert** (< 30 minutes)
   - Revert Git commit
   - Redeploy previous version
   - Schedule fix for next sprint

---

## Future Enhancements

### Phase 2 Features
1. **Tax Calculation**
   - Add tax_expenses table
   - Include in overhead calculation

2. **Budget vs Actual Tracking**
   - Show budget variance on chart
   - Alert when over budget

3. **Forecasting**
   - Use historical data to predict future profit
   - AI-powered cash flow predictions

4. **Drill-down Reports**
   - Click on chart bar → see detailed transactions
   - Export detailed breakdown

### Phase 3 Features
1. **Real-time Updates**
   - WebSocket connection for live data
   - No page refresh needed

2. **Customizable Categories**
   - User-defined expense categories
   - Custom profit formulas

3. **Multi-currency Support**
   - Handle different currencies
   - Automatic exchange rate conversion

---

## Appendix A: Category Mapping

### Expense Categories

| Category | Type | Table Source | Calculation |
|----------|------|--------------|-------------|
| Materials | Direct | finance_expenses | Sum where category='Materials' |
| Equipment | Direct | finance_expenses | Sum where category='Equipment' |
| Subcontractor | Direct | contractor_payments | Sum where status='completed' |
| Employee Wages | Labor | employee_payments | Sum where status='completed' |
| Supplies | Operating | finance_expenses | Sum where category='Supplies' |
| General | Operating | finance_expenses | Sum where category='General' |
| Rent | Overhead | finance_expenses + recurring_expenses | Sum both tables |
| Utilities | Overhead | finance_expenses + recurring_expenses | Sum both tables |
| Insurance | Overhead | finance_expenses + recurring_expenses | Sum both tables |
| Software | Overhead | finance_expenses + recurring_expenses | Sum both tables |

### Revenue Categories

| Source | Table | Calculation |
|--------|-------|-------------|
| Client Payments | finance_payments | Sum where status='completed' |
| Invoice Payments | invoice_payments | Sum all payments |
| Outstanding (Future) | invoices | Sum where balance > 0 |

---

## Appendix B: Sample Data

### Test Dataset

```sql
-- Revenue
INSERT INTO finance_payments VALUES
  ('uuid1', 'Client A', 5000, '2025-10-15', 'bank_transfer', 'completed'),
  ('uuid2', 'Client B', 3000, '2025-10-20', 'check', 'completed');

-- Direct Costs
INSERT INTO finance_expenses VALUES
  ('uuid3', 'Home Depot', 1200, '2025-10-05', 'Materials'),
  ('uuid4', 'Equipment Co', 800, '2025-10-10', 'Equipment');

INSERT INTO contractor_payments VALUES
  ('uuid5', 'contractor1', 1500, '2025-10-12', 'completed');

-- Labor
INSERT INTO employee_payments VALUES
  ('uuid6', 'employee1', 2000, '2025-10-15', 'completed'),
  ('uuid7', 'employee2', 1800, '2025-10-15', 'completed');

-- Recurring
INSERT INTO recurring_expenses VALUES
  ('uuid8', 'Office Rent', 1000, 'Rent', 'monthly', '2025-10-01', true),
  ('uuid9', 'Software License', 50, 'Software', 'monthly', '2025-10-01', true);

-- Expected Result for October 2025:
-- Revenue: 8000 (5000 + 3000)
-- Direct Costs: 3500 (1200 + 800 + 1500)
-- Labor: 3800 (2000 + 1800)
-- Overhead: 1050 (1000 + 50)
-- Total Expenses: 8350
-- Profit: -350 (8000 - 8350)
-- Margin: -4.38%
```

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-18 | Architecture Agent | Initial architecture design |

---

**End of Architecture Document**
