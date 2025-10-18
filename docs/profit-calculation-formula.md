# Profit Calculation Formula - Quick Reference

## The Complete Formula

```
PROFIT = TOTAL_REVENUE - TOTAL_EXPENSES
```

### Where:

```
TOTAL_REVENUE =
  finance_payments.amount (WHERE status = 'completed')
  + invoice_payments.amount

TOTAL_EXPENSES =
  DIRECT_COSTS
  + LABOR_COSTS
  + OPERATING_EXPENSES
  + OVERHEAD_COSTS
```

---

## Detailed Breakdown

### 1. DIRECT COSTS

**Materials, Equipment, Subcontractors**

```
DIRECT_COSTS =
  finance_expenses.amount (WHERE category IN ['Materials', 'Equipment', 'Subcontractor'])
  + contractor_payments.amount (WHERE status = 'completed')
```

**Example**:
- Home Depot materials: $1,200
- Equipment rental: $800
- Subcontractor payment: $1,500
- **Total Direct: $3,500**

---

### 2. LABOR COSTS

**Employee Wages**

```
LABOR_COSTS =
  employee_payments.amount (WHERE status = 'completed')
```

**Example**:
- Employee 1 paycheck: $2,000
- Employee 2 paycheck: $1,800
- **Total Labor: $3,800**

---

### 3. OPERATING EXPENSES

**Day-to-day Business Costs**

```
OPERATING_EXPENSES =
  finance_expenses.amount (WHERE category IN ['Supplies', 'General', 'Office'])
```

**Example**:
- Office supplies: $150
- General expenses: $300
- **Total Operating: $450**

---

### 4. OVERHEAD COSTS

**Fixed & Recurring Costs**

```
OVERHEAD_COSTS =
  finance_expenses.amount (WHERE category IN ['Rent', 'Utilities', 'Insurance', 'Software'])
  + RECURRING_EXPENSES_MONTHLY
```

**Recurring Expense Proration**:
```typescript
switch (frequency) {
  case 'weekly':    monthlyAmount = amount * 4.33;  break;
  case 'monthly':   monthlyAmount = amount * 1;     break;
  case 'quarterly': monthlyAmount = amount / 3;     break;
  case 'yearly':    monthlyAmount = amount / 12;    break;
}
```

**Example**:
- Office rent (monthly): $1,000
- Software subscription (monthly): $50
- Insurance (quarterly): $600 → $200/month
- **Total Overhead: $1,250**

---

## Complete Example

### Sample Month: October 2025

**REVENUE**:
```
Client A payment:     $5,000
Client B payment:     $3,000
Invoice payment:      $2,000
────────────────────────────
TOTAL REVENUE:       $10,000
```

**EXPENSES**:
```
Direct Costs:
  Materials:          $1,200
  Equipment:            $800
  Contractor:         $1,500
  ─────────────────────────
  Subtotal:           $3,500

Labor Costs:
  Employee 1:         $2,000
  Employee 2:         $1,800
  ─────────────────────────
  Subtotal:           $3,800

Operating:
  Supplies:             $150
  General:              $300
  ─────────────────────────
  Subtotal:             $450

Overhead:
  Rent:               $1,000
  Software:              $50
  Insurance:            $200
  ─────────────────────────
  Subtotal:           $1,250
────────────────────────────
TOTAL EXPENSES:       $9,000
```

**RESULT**:
```
PROFIT = $10,000 - $9,000 = $1,000
MARGIN = ($1,000 / $10,000) × 100 = 10%
```

---

## Visual Flow

```
┌─────────────────────────────────────────┐
│          REVENUE SOURCES                │
├─────────────────────────────────────────┤
│  finance_payments (completed)           │
│  + invoice_payments                     │
│  = TOTAL REVENUE                        │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         EXPENSE CATEGORIES              │
├─────────────────────────────────────────┤
│  1. DIRECT COSTS                        │
│     • Materials                         │
│     • Equipment                         │
│     • Contractors                       │
│                                         │
│  2. LABOR COSTS                         │
│     • Employee wages                    │
│                                         │
│  3. OPERATING EXPENSES                  │
│     • Supplies                          │
│     • General expenses                  │
│                                         │
│  4. OVERHEAD COSTS                      │
│     • Rent                              │
│     • Utilities                         │
│     • Insurance                         │
│     • Software                          │
│     • Recurring expenses (prorated)     │
│                                         │
│  = TOTAL EXPENSES                       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          CALCULATION                    │
├─────────────────────────────────────────┤
│  PROFIT = REVENUE - EXPENSES            │
│  MARGIN = (PROFIT / REVENUE) × 100      │
└─────────────────────────────────────────┘
```

---

## Database Table Reference

### Revenue Tables
| Table | Key Column | Filter |
|-------|-----------|--------|
| `finance_payments` | `amount` | `status = 'completed'` |
| `invoice_payments` | `amount` | (all) |
| `invoices` | `balance` | `status IN ('outstanding', 'partial')` |

### Expense Tables
| Table | Key Column | Filter | Category |
|-------|-----------|--------|----------|
| `finance_expenses` | `amount` | `category = 'Materials'` | Direct |
| `finance_expenses` | `amount` | `category = 'Equipment'` | Direct |
| `contractor_payments` | `amount` | `status = 'completed'` | Direct |
| `employee_payments` | `amount` | `status = 'completed'` | Labor |
| `finance_expenses` | `amount` | `category IN ('Supplies', 'General')` | Operating |
| `finance_expenses` | `amount` | `category IN ('Rent', 'Utilities')` | Overhead |
| `recurring_expenses` | `amount` | `is_active = true` | Overhead (prorated) |

---

## Code Implementation

### Monthly Calculation Loop

```typescript
for (let month = 0; month < 6; month++) {
  // 1. Filter revenue for this month
  const revenue = payments
    .filter(p => p.status === 'completed' && isInMonth(p.date))
    .reduce((sum, p) => sum + p.amount, 0);

  // 2. Calculate each expense category
  const directCosts =
    receipts.filter(r => isInMonth(r.date) && directCategories.includes(r.category))
      .reduce((sum, r) => sum + r.amount, 0)
    + contractors.filter(c => c.status === 'completed' && isInMonth(c.date))
      .reduce((sum, c) => sum + c.amount, 0);

  const laborCosts = employees
    .filter(e => e.status === 'completed' && isInMonth(e.date))
    .reduce((sum, e) => sum + e.amount, 0);

  const operatingExpenses = receipts
    .filter(r => isInMonth(r.date) && operatingCategories.includes(r.category))
    .reduce((sum, r) => sum + r.amount, 0);

  const overheadCosts =
    receipts.filter(r => isInMonth(r.date) && overheadCategories.includes(r.category))
      .reduce((sum, r) => sum + r.amount, 0)
    + prorateRecurringExpenses(recurringExpenses, month);

  // 3. Sum totals
  const expenses = directCosts + laborCosts + operatingExpenses + overheadCosts;
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  // 4. Store result
  monthlyData.push({ month, revenue, expenses, profit, margin });
}
```

---

## Validation Checklist

- [ ] Revenue includes completed payments and invoices
- [ ] Direct costs include materials, equipment, and contractors
- [ ] Labor costs include all employee payments
- [ ] Operating expenses include supplies and general costs
- [ ] Overhead includes rent, utilities, insurance, software
- [ ] Recurring expenses are prorated correctly
- [ ] Profit = Revenue - Total Expenses
- [ ] Margin = (Profit / Revenue) × 100
- [ ] Monthly data shows 6 months of history
- [ ] All date filters work correctly

---

## Common Mistakes to Avoid

❌ **WRONG**: Using only `finance_expenses` for total expenses
```typescript
const expenses = receipts.reduce((sum, r) => sum + r.amount, 0);
```

✅ **CORRECT**: Sum all expense categories
```typescript
const expenses = directCosts + laborCosts + operatingExpenses + overheadCosts;
```

---

❌ **WRONG**: Ignoring employee/contractor payments
```typescript
// Missing labor and subcontractor costs
```

✅ **CORRECT**: Include payroll data
```typescript
const laborCosts = employeePayments.reduce(...);
const contractorCosts = contractorPayments.reduce(...);
```

---

❌ **WRONG**: Not prorating recurring expenses
```typescript
const recurring = recurringExpenses.reduce((sum, e) => sum + e.amount, 0);
// This counts annual as monthly!
```

✅ **CORRECT**: Prorate by frequency
```typescript
const monthly = e.frequency === 'yearly' ? e.amount / 12 : e.amount;
```

---

## Performance Tips

### Optimize Queries
```typescript
// ❌ BAD: Multiple sequential queries
const payments = await supabase.from('finance_payments').select();
const employees = await supabase.from('employee_payments').select();
const contractors = await supabase.from('contractor_payments').select();

// ✅ GOOD: Parallel queries
const [payments, employees, contractors] = await Promise.all([
  supabase.from('finance_payments').select(),
  supabase.from('employee_payments').select(),
  supabase.from('contractor_payments').select()
]);
```

### Filter in SQL, Not JavaScript
```typescript
// ❌ BAD: Fetch all, filter in JS
const allPayments = await supabase.from('finance_payments').select();
const completed = allPayments.filter(p => p.status === 'completed');

// ✅ GOOD: Filter in database
const completed = await supabase
  .from('finance_payments')
  .select()
  .eq('status', 'completed');
```

---

## Testing Strategy

### Unit Test Template
```typescript
describe('Profit Calculation', () => {
  it('should calculate correct profit', () => {
    const data = {
      revenue: 10000,
      directCosts: 3500,
      laborCosts: 3800,
      operatingExpenses: 450,
      overheadCosts: 1250
    };

    const totalExpenses =
      data.directCosts +
      data.laborCosts +
      data.operatingExpenses +
      data.overheadCosts;

    const profit = data.revenue - totalExpenses;
    const margin = (profit / data.revenue) * 100;

    expect(totalExpenses).toBe(9000);
    expect(profit).toBe(1000);
    expect(margin).toBe(10);
  });
});
```

---

**Last Updated**: 2025-10-18
**Version**: 1.0
