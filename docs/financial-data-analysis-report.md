# Financial Data Structure and Profit Calculation Analysis

**Date:** October 18, 2025
**Project:** ContractorAI v2
**Analysis Focus:** Database schema, financial fields, data fetching methods, and profit calculations

---

## Executive Summary

The ContractorAI application has a **comprehensive financial tracking system** with rich data fields across multiple tables. However, there are **significant untapped opportunities** for enhanced profit analysis and financial reporting. This report identifies all available financial data and reveals what's being used vs. what's available but unused.

---

## 1. DATABASE SCHEMA ANALYSIS

### 1.1 Core Financial Tables

#### **A. ESTIMATES TABLE**
**Location:** `001_initial_schema.sql`

```sql
CREATE TABLE estimates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  client_name TEXT NOT NULL,
  client_email TEXT,
  estimate_number TEXT,
  date DATE NOT NULL,
  valid_until DATE,
  status TEXT (draft|sent|approved|rejected),

  -- Financial Fields
  subtotal DECIMAL(10, 2),
  tax_rate DECIMAL(5, 2),
  tax_amount DECIMAL(10, 2),
  total DECIMAL(10, 2),

  -- Additional Data
  notes TEXT,
  items JSONB,  -- Line items with quantities, prices, etc.
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Additional Fields from Extended Schema:**
- `calculator_type` - Type of calculator used to generate estimate
- `calculator_data` - Full calculator configuration (JSONB)
- `converted_to_invoice` - Boolean flag for conversion tracking
- `invoice_id` - Link to created invoice

**Available but UNUSED:**
- ✅ Items JSONB contains detailed breakdowns
- ✅ Calculator data could provide cost basis analysis
- ⚠️ No cost tracking - only revenue projections

---

#### **B. INVOICES TABLE**
**Location:** `20250110_create_enhanced_invoices.sql`

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Relationships
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  estimate_id UUID REFERENCES estimates(id),

  -- Financial Totals
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_rate DECIMAL(5, 2),
  tax_amount DECIMAL(12, 2),
  discount_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12, 2) NOT NULL,  -- AUTO-CALCULATED

  -- Status Tracking
  status TEXT (draft|pending|sent|viewed|partial|paid|overdue|cancelled|refunded),
  payment_status TEXT (unpaid|partial|paid|refunded),  -- AUTO-CALCULATED

  -- Payment Terms
  payment_terms TEXT DEFAULT 'net_30',
  late_fee_percentage DECIMAL(5, 2),
  late_fee_amount DECIMAL(12, 2),

  -- Content
  notes TEXT,
  terms_conditions TEXT,
  footer_text TEXT,

  -- Email/Communication Tracking
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- PDF Generation
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Stripe Integration
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
)
```

**Database Triggers:**
- `calculate_invoice_totals()` - Auto-calculates balance_due and payment_status
- `generate_invoice_number()` - Auto-generates invoice numbers (INV-YYYY-XXXXX)
- Auto-updates status to 'overdue' when past due date

**Available but UNDERUTILIZED:**
- ✅ Late fee tracking (percentage & amount)
- ✅ Email engagement metrics (sent, opened, reminder count)
- ✅ Payment terms analysis
- ✅ Metadata JSONB for custom fields
- ⚠️ No link between invoice line items and actual costs

---

#### **C. INVOICE_ITEMS TABLE**
**Location:** `20250110_create_invoice_items.sql`

```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Item Details
  item_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  item_type TEXT (service|material|labor|equipment|other),

  -- Pricing
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2),
  discount_amount DECIMAL(12, 2),
  subtotal DECIMAL(12, 2) NOT NULL,  -- AUTO-CALCULATED
  tax_rate DECIMAL(5, 2),
  tax_amount DECIMAL(12, 2),  -- AUTO-CALCULATED
  total DECIMAL(12, 2) NOT NULL,  -- AUTO-CALCULATED

  -- Additional Info
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Database Triggers:**
- `calculate_line_item_totals()` - Auto-calculates subtotal, tax, total
- `update_invoice_from_items()` - Updates parent invoice totals when items change

**Available but UNUSED for Profit Analysis:**
- ✅ Item type classification (service vs material vs labor)
- ✅ Detailed quantity tracking
- ⚠️ **NO COST TRACKING** - only revenue side

---

#### **D. PAYMENTS TABLE**
**Location:** `20250110_create_payments.sql`

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Payment Details
  payment_number TEXT UNIQUE NOT NULL,  -- PAY-YYYY-XXXXX
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT (credit_card|debit_card|bank_transfer|check|cash|other),

  -- Stripe Integration
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_payment_method_id TEXT,

  -- Status
  status TEXT (pending|processing|succeeded|failed|cancelled|refunded),

  -- Additional Info
  reference_number TEXT,
  notes TEXT,
  metadata JSONB,

  -- Refund Info
  refund_amount DECIMAL(12, 2) DEFAULT 0,
  refunded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Database Triggers:**
- `update_invoice_on_payment()` - Auto-updates invoice paid_amount when payment succeeds
- `generate_payment_number()` - Auto-generates payment numbers

**Available but UNUSED:**
- ✅ Payment method analysis
- ✅ Refund tracking
- ✅ Stripe payment metadata

---

#### **E. PROJECTS TABLE**
**Location:** `001_initial_schema.sql`

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  client TEXT,
  client_id UUID REFERENCES clients(id),
  status TEXT (planning|active|completed|on-hold),

  -- Dates
  start_date DATE,
  end_date DATE,

  -- Financial Tracking
  budget DECIMAL(10, 2),
  spent DECIMAL(10, 2),  -- ⚠️ NOT auto-calculated

  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Critical Gap:**
- ⚠️ **`spent` field is NOT auto-calculated from expenses**
- ⚠️ No link between project expenses and this field
- ⚠️ Must be manually updated

---

#### **F. FINANCE_EXPENSES TABLE**
**Location:** `20250102_create_finance_expenses.sql`

```sql
CREATE TABLE finance_expenses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  -- Expense Details
  vendor TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  status TEXT (pending|processed|verified),
  notes TEXT,

  -- Project Link
  project_id UUID,  -- ⚠️ No foreign key constraint

  -- Enhanced Receipt Data
  metadata JSONB DEFAULT '{}'::jsonb,
  /* metadata can contain:
   * - receiptNumber
   * - taxAmount
   * - subtotal
   * - supplierAddress/Phone
   * - lineItems: [{description, quantity, unitPrice, totalAmount}]
   * - confidence scores (OCR)
   * - source (manual, ocr, api)
   */

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Available but UNDERUTILIZED:**
- ✅ Detailed line item breakdown in metadata
- ✅ OCR confidence scores
- ✅ Supplier information
- ⚠️ Category field not standardized
- ⚠️ No link to invoice items for margin analysis

---

#### **G. RECURRING_EXPENSES TABLE**
**Location:** `001_initial_schema.sql`

```sql
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  frequency TEXT (monthly|quarterly|yearly),
  category TEXT NOT NULL,
  next_payment DATE,
  active BOOLEAN DEFAULT true,
  vendor TEXT,
  project_id UUID,
  start_date DATE,  -- Added for historical tracking
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Available but UNUSED:**
- ✅ Historical cost projection (start_date + frequency)
- ✅ Active/inactive toggle for forecasting
- ⚠️ Not included in actual expense calculations

---

#### **H. PAYROLL TABLES**
**Location:** `20251007_create_payroll_tables.sql`, `20251006_expand_payments_system.sql`

**EMPLOYEE_PAYMENTS:**
```sql
CREATE TABLE employee_payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  employee_id UUID REFERENCES employees(id),
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  status TEXT (pending|completed|failed),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**CONTRACTOR_PAYMENTS (1099):**
```sql
CREATE TABLE contractor_payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  contractor_name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  status TEXT (pending|completed|failed),
  project_id UUID,  -- Added for project cost tracking
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**FINANCE_PAYMENTS (Extended):**
```sql
ALTER TABLE finance_payments ADD COLUMNS:
  payment_type TEXT (received|employee_payroll|contractor_1099),
  employee_id UUID,
  contractor_id UUID,

  -- Payroll specific
  pay_period_start DATE,
  pay_period_end DATE,
  hours_worked NUMERIC(6, 2),
  hourly_rate NUMERIC(10, 2),
  gross_pay NUMERIC(10, 2),
  federal_tax NUMERIC(10, 2),
  state_tax NUMERIC(10, 2),
  social_security NUMERIC(10, 2),
  medicare NUMERIC(10, 2),
  other_deductions NUMERIC(10, 2),
  net_pay NUMERIC(10, 2),

  -- Contractor specific
  description TEXT,
  invoice_number TEXT,
  tax_year INT,
  check_number TEXT
```

**Available but UNUSED:**
- ✅ Detailed payroll breakdown (gross, deductions, net)
- ✅ Hours worked tracking
- ✅ 1099 contractor YTD totals (auto-calculated)
- ✅ Project-level labor cost tracking
- ⚠️ Not integrated into profit calculations

---

#### **I. BUDGET_ITEMS TABLE**
**Location:** Implied from `financeStoreSupabase.ts`

```sql
CREATE TABLE budget_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID,
  category TEXT,
  name TEXT,
  budgeted_amount NUMERIC(10, 2),
  actual_amount NUMERIC(10, 2),
  variance NUMERIC(10, 2),  -- AUTO-CALCULATED
  variance_percentage NUMERIC(5, 2),  -- AUTO-CALCULATED
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Available but UNUSED:**
- ✅ Budget vs. actual variance tracking
- ✅ Category-level budgeting
- ⚠️ Not linked to actual expenses automatically

---

### 1.2 Supporting Tables

#### **CLIENTS TABLE**
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

#### **EMPLOYEES TABLE**
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  employee_number TEXT UNIQUE,
  hire_date DATE NOT NULL,
  termination_date DATE,
  status TEXT (active|inactive|terminated),
  pay_type TEXT (hourly|salary),
  pay_rate NUMERIC(10, 2) NOT NULL,
  payment_frequency TEXT (weekly|bi-weekly|semi-monthly|monthly),
  ssn_encrypted TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT
)
```

#### **CONTRACTORS_1099 TABLE**
```sql
CREATE TABLE contractors_1099 (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  business_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  ein_or_ssn_encrypted TEXT,
  tax_id_type TEXT (EIN|SSN),
  address_line1 TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  trade_specialty TEXT,
  contractor_type TEXT,
  requires_1099 BOOLEAN DEFAULT true,
  ytd_total NUMERIC(12, 2) DEFAULT 0,  -- AUTO-CALCULATED by trigger
  status TEXT (active|inactive)
)
```

**Database Trigger:**
- `update_contractor_ytd_total()` - Auto-updates YTD total when payments are made

---

## 2. DATA FETCHING ARCHITECTURE

### 2.1 Zustand Store Pattern

The application uses **Zustand** for state management with **Supabase** as the backend. There are parallel store implementations:

#### **financeStore.ts** (Mock/Development)
- Empty initial state
- No database integration
- Used for development/testing

#### **financeStoreSupabase.ts** (Production)
- Full Supabase integration
- Real-time data fetching
- 2,138 lines of state management code

### 2.2 Data Fetching Methods

#### **Receipts/Expenses:**
```typescript
fetchReceipts: async () => {
  const { data } = await supabase
    .from('finance_expenses')
    .select('*')
    .order('created_at', { ascending: false });

  // Transforms to Receipt interface
  const receipts = data.map(expense => ({
    id: expense.id,
    vendor: expense.vendor,
    amount: expense.amount,
    category: expense.category,
    metadata: expense.metadata  // ✅ JSONB preserved
  }));
}
```

**What's Fetched:**
✅ All expense records
✅ Metadata JSONB (line items, OCR data)
✅ Project linkage

**What's NOT Used:**
⚠️ Line item breakdowns in metadata
⚠️ Supplier information
⚠️ OCR confidence scores

---

#### **Payments/Revenue:**
```typescript
fetchPayments: async () => {
  const { data } = await supabase
    .from('finance_payments')
    .select('*')
    .order('created_at', { ascending: false });

  // Only uses 'received' payment type
  const payments = data?.map(payment => ({
    amount: payment.amount,
    date: payment.date,
    method: payment.method,
    status: 'completed'
  }));
}
```

**What's Fetched:**
✅ All payment records

**What's NOT Used:**
⚠️ Payment type differentiation (received vs payroll vs 1099)
⚠️ Payroll deductions breakdown
⚠️ Contractor payment details
⚠️ Employee/contractor ID linkage

---

#### **Invoices:**
```typescript
fetchInvoices: async () => {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  const invoices = data?.map(inv => ({
    totalAmount: inv.total_amount,
    paidAmount: inv.paid_amount,
    balance: inv.balance,
    status: inv.status
  }));
}
```

**What's Fetched:**
✅ Invoice totals
✅ Payment status
✅ Balance due

**What's NOT Used:**
⚠️ Late fees
⚠️ Email engagement metrics
⚠️ Stripe payment data
⚠️ Payment terms analysis

---

#### **Projects:**
```typescript
fetchProjects: async () => {
  const { data } = await supabase
    .from('projects')
    .select('*');

  const projects = data.map(p => ({
    budget: p.budget,
    spent: p.spent,  // ⚠️ NOT auto-calculated
    variance: (p.budget || 0) - (p.spent || 0)
  }));
}
```

**What's Fetched:**
✅ Budget
✅ Spent (manual field)

**What's NOT Calculated:**
⚠️ Actual expenses from finance_expenses
⚠️ Labor costs from payroll
⚠️ Material costs from invoice items

---

### 2.3 Financial Summary Calculation

**Location:** `financeStoreSupabase.ts`, line 1586-1733

```typescript
calculateFinancialSummary: async () => {
  // Revenue calculation
  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  // Expense calculation
  const totalExpenses = receipts.reduce((sum, r) => sum + r.amount, 0)
    + monthlyRecurringCost
    + employeePaymentsTotal
    + contractorPaymentsTotal;

  // Profit calculation
  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0
    ? (profit / totalRevenue) * 100
    : 0;

  // Outstanding invoices
  const outstandingInvoices = invoices
    .filter(i => ['outstanding', 'partial', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (i.balance || 0), 0);
}
```

**What IS Included:**
✅ Finance_expenses (receipts)
✅ Recurring expenses (monthly cost)
✅ Employee payroll
✅ Contractor 1099 payments
✅ Customer payments (revenue)

**What IS NOT Included:**
⚠️ Invoice item cost tracking
⚠️ Project-specific profit margins
⚠️ Material vs labor cost breakdown
⚠️ Client profitability analysis
⚠️ Late fees collected
⚠️ Refunds/chargebacks

---

## 3. EXISTING CALCULATION UTILITIES

### 3.1 Database-Level Calculations

#### **Invoice Totals (Automatic)**
```sql
CREATE FUNCTION calculate_invoice_totals() RETURNS TRIGGER AS $$
BEGIN
  NEW.balance_due = NEW.total_amount - NEW.paid_amount;

  IF NEW.paid_amount = 0 THEN
    NEW.payment_status = 'unpaid';
  ELSIF NEW.paid_amount >= NEW.total_amount THEN
    NEW.payment_status = 'paid';
    NEW.paid_at = COALESCE(NEW.paid_at, NOW());
  ELSE
    NEW.payment_status = 'partial';
  END IF;

  IF NEW.payment_status = 'paid' THEN
    NEW.status = 'paid';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.payment_status != 'paid' THEN
    NEW.status = 'overdue';
  END IF;

  RETURN NEW;
END;
```

#### **Invoice Item Totals (Automatic)**
```sql
CREATE FUNCTION calculate_line_item_totals() RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal = (NEW.quantity * NEW.unit_price) - NEW.discount_amount;
  NEW.tax_amount = NEW.subtotal * (NEW.tax_rate / 100);
  NEW.total = NEW.subtotal + NEW.tax_amount;
  RETURN NEW;
END;
```

#### **Update Invoice from Items (Automatic)**
```sql
CREATE FUNCTION update_invoice_from_items() RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices SET
    subtotal = (SELECT COALESCE(SUM(subtotal), 0) FROM invoice_items WHERE invoice_id = target_invoice_id),
    tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM invoice_items WHERE invoice_id = target_invoice_id),
    total_amount = (SELECT COALESCE(SUM(total), 0) FROM invoice_items WHERE invoice_id = target_invoice_id)
  WHERE id = target_invoice_id;
END;
```

#### **Contractor YTD Totals (Automatic)**
```sql
CREATE FUNCTION update_contractor_ytd_total() RETURNS TRIGGER AS $$
BEGIN
  UPDATE contractors_1099 SET
    ytd_total = (
      SELECT COALESCE(SUM(amount), 0)
      FROM finance_payments
      WHERE contractor_id = contractor_uuid
      AND payment_type = 'contractor_1099'
      AND tax_year = current_year
    ),
    requires_1099 = (ytd_total >= 600)
  WHERE id = contractor_uuid;
END;
```

### 3.2 Application-Level Calculations

#### **Budget Variance (Zustand)**
```typescript
const variance = item.budgetedAmount - item.actualAmount;
const variancePercentage = item.budgetedAmount > 0
  ? (variance / item.budgetedAmount) * 100
  : 0;
```

#### **Monthly Recurring Cost (Zustand)**
```typescript
const monthlyRecurringCost = recurringExpenses
  .filter(e => e.isActive)
  .reduce((sum, e) => {
    switch (e.frequency) {
      case 'weekly': return sum + (e.amount * 4.33);
      case 'monthly': return sum + e.amount;
      case 'quarterly': return sum + (e.amount / 3);
      case 'yearly': return sum + (e.amount / 12);
      default: return sum + e.amount;
    }
  }, 0);
```

#### **Expenses by Category (Zustand)**
```typescript
const categoryTotals = receipts.reduce((acc, receipt) => {
  acc[receipt.category] = (acc[receipt.category] || 0) + receipt.amount;
  return acc;
}, {});

const expensesByCategory = Object.entries(categoryTotals).map(([category, amount]) => ({
  category,
  amount,
  percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
}));
```

---

## 4. DATA TRANSFORMATION LOGIC

### 4.1 Receipt Metadata Transformation

**Storage (Database):**
```typescript
interface ReceiptMetadata {
  receiptNumber?: string;
  taxAmount?: number;
  subtotal?: number;
  supplierAddress?: string;
  supplierPhone?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  confidence?: {
    vendor?: number;
    amount?: number;
    date?: number;
    overall?: number;
  };
  source?: string;
}
```

**Current Usage:**
- ✅ Stored in database
- ⚠️ NOT displayed in UI
- ⚠️ NOT used for cost analysis
- ⚠️ NOT linked to invoice items

### 4.2 Project-Expense Linkage

**Database Structure:**
```sql
finance_expenses.project_id → projects.id  -- Soft reference, no FK
```

**Current Implementation:**
```typescript
// Expenses linked to projects via project_id
// BUT projects.spent is NOT auto-updated from expenses
```

**Missing Calculation:**
```typescript
// This should exist but doesn't:
const projectActualCost = await supabase
  .from('finance_expenses')
  .select('amount')
  .eq('project_id', projectId)
  .sum('amount');

await supabase
  .from('projects')
  .update({ spent: projectActualCost })
  .eq('id', projectId);
```

### 4.3 Invoice-Payment Reconciliation

**Database Trigger (Automatic):**
```sql
CREATE FUNCTION update_invoice_on_payment()
WHEN payment.status = 'succeeded' THEN
  UPDATE invoices SET paid_amount = paid_amount + payment.amount
```

**Application Duplication (Manual):**
```typescript
recordInvoicePayment: async (invoiceId, payment) => {
  // 1. Insert into invoice_payments
  await supabase.from('invoice_payments').insert(payment);

  // 2. ALSO insert into finance_payments (for revenue tracking)
  await supabase.from('finance_payments').insert({
    client_name: invoiceData.client_id,
    amount: payment.amount,
    notes: `Payment for invoice ${invoiceNumber}`
  });

  // 3. Update invoice totals
  const newPaidAmount = invoiceData.paid_amount + payment.amount;
  await supabase.from('invoices').update({
    paid_amount: newPaidAmount,
    balance: total - newPaidAmount
  });
}
```

**Issue:** Duplicate payment records in two tables

---

## 5. UNTAPPED DATA OPPORTUNITIES

### 5.1 CRITICAL: Missing Profit Margin Analysis

**Available Data NOT Being Used:**

1. **Invoice Item Cost Tracking**
   - ❌ No cost field on invoice_items
   - ❌ No link between invoice items and expense receipts
   - ❌ Cannot calculate item-level profit margins

   **Recommendation:**
   ```sql
   ALTER TABLE invoice_items ADD COLUMN cost_per_unit DECIMAL(12, 2);
   ALTER TABLE invoice_items ADD COLUMN total_cost DECIMAL(12, 2);

   -- Then calculate:
   profit_per_item = (unit_price - cost_per_unit) * quantity
   margin_per_item = (profit_per_item / (unit_price * quantity)) * 100
   ```

2. **Project-Level Profitability**
   - ❌ projects.spent is manual, not auto-calculated
   - ❌ No automatic aggregation of project expenses
   - ❌ No link between project revenue and project costs

   **Recommendation:**
   ```typescript
   // Auto-calculate project.spent
   const projectExpenses = await supabase
     .from('finance_expenses')
     .select('amount')
     .eq('project_id', projectId);

   const projectLaborCosts = await supabase
     .from('contractor_payments')
     .select('amount')
     .eq('project_id', projectId);

   const totalSpent = [...projectExpenses, ...projectLaborCosts]
     .reduce((sum, item) => sum + item.amount, 0);

   await supabase
     .from('projects')
     .update({ spent: totalSpent })
     .eq('id', projectId);
   ```

3. **Client Profitability Analysis**
   - ❌ No client-level revenue aggregation
   - ❌ No client-level cost aggregation
   - ❌ Cannot identify most/least profitable clients

   **Recommendation:**
   ```sql
   CREATE VIEW client_profitability AS
   SELECT
     c.id,
     c.name,
     SUM(i.total_amount) as total_revenue,
     SUM(i.paid_amount) as revenue_received,
     SUM(p.spent) as total_costs,
     SUM(i.total_amount) - SUM(p.spent) as gross_profit,
     (SUM(i.total_amount) - SUM(p.spent)) / NULLIF(SUM(i.total_amount), 0) * 100 as profit_margin
   FROM clients c
   LEFT JOIN projects p ON p.client_id = c.id
   LEFT JOIN invoices i ON i.client_id = c.id
   GROUP BY c.id, c.name;
   ```

### 5.2 Expense Categorization Enhancement

**Current State:**
- ✅ Category field exists
- ❌ No category standardization
- ❌ No category-to-project mapping
- ❌ No COGS vs Overhead classification

**Recommendations:**
```sql
-- Create expense categories table
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('COGS', 'Operating', 'Overhead')),
  is_billable BOOLEAN DEFAULT false,
  markup_percentage DECIMAL(5, 2) DEFAULT 0
);

-- Link to finance_expenses
ALTER TABLE finance_expenses
  ADD COLUMN category_id UUID REFERENCES expense_categories(id);
```

**Benefits:**
- Accurate COGS tracking
- Automatic markup calculation
- Billable vs non-billable expense separation

### 5.3 Labor Cost Allocation

**Available Data NOT Being Used:**
- ✅ employee_payments.amount
- ✅ contractor_payments.amount
- ✅ contractor_payments.project_id
- ❌ No employee time tracking per project
- ❌ No labor cost allocation to invoices

**Recommendations:**
```sql
-- Add project_id to employee_payments
ALTER TABLE employee_payments
  ADD COLUMN project_id UUID REFERENCES projects(id);

-- Create time tracking table
CREATE TABLE time_entries (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  project_id UUID REFERENCES projects(id),
  date DATE NOT NULL,
  hours_worked DECIMAL(4, 2) NOT NULL,
  hourly_rate DECIMAL(10, 2),
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
  billable BOOLEAN DEFAULT true,
  billed BOOLEAN DEFAULT false,
  invoice_item_id UUID REFERENCES invoice_items(id)
);
```

### 5.4 Material Cost Tracking

**Current Gap:**
- ❌ No way to link material purchases to invoice line items
- ❌ No way to track markup on materials
- ❌ No way to calculate material profit margin

**Recommendations:**
```sql
-- Link expenses to invoice items
CREATE TABLE expense_allocations (
  id UUID PRIMARY KEY,
  expense_id UUID REFERENCES finance_expenses(id),
  invoice_item_id UUID REFERENCES invoice_items(id),
  allocated_amount DECIMAL(12, 2) NOT NULL,
  allocation_percentage DECIMAL(5, 2),
  notes TEXT
);

-- Auto-calculate item profit
CREATE VIEW invoice_item_profitability AS
SELECT
  ii.id,
  ii.invoice_id,
  ii.description,
  ii.total as revenue,
  COALESCE(SUM(ea.allocated_amount), 0) as cost,
  ii.total - COALESCE(SUM(ea.allocated_amount), 0) as profit,
  (ii.total - COALESCE(SUM(ea.allocated_amount), 0)) / NULLIF(ii.total, 0) * 100 as margin_percentage
FROM invoice_items ii
LEFT JOIN expense_allocations ea ON ea.invoice_item_id = ii.id
GROUP BY ii.id;
```

### 5.5 Cash Flow Analysis

**Available Data NOT Being Used:**
- ✅ invoices.due_date
- ✅ invoices.balance_due
- ✅ recurring_expenses.next_payment
- ❌ No cash flow projection
- ❌ No aging analysis

**Recommendations:**
```sql
-- Create cash flow projection view
CREATE VIEW cash_flow_projection AS
SELECT
  date,
  SUM(CASE WHEN type = 'inflow' THEN amount ELSE 0 END) as expected_inflows,
  SUM(CASE WHEN type = 'outflow' THEN amount ELSE 0 END) as expected_outflows,
  SUM(CASE WHEN type = 'inflow' THEN amount ELSE -amount END) as net_cash_flow
FROM (
  -- Expected invoice payments
  SELECT due_date as date, balance_due as amount, 'inflow' as type
  FROM invoices
  WHERE status IN ('sent', 'partial', 'overdue')

  UNION ALL

  -- Recurring expenses
  SELECT next_payment as date, amount, 'outflow' as type
  FROM recurring_expenses
  WHERE active = true
) cashflow
GROUP BY date
ORDER BY date;
```

### 5.6 Payment Analytics

**Available Data NOT Being Used:**
- ✅ invoices.email_opened_at
- ✅ invoices.reminder_count
- ✅ payments.payment_method
- ✅ payments.stripe_payment_intent_id
- ❌ No payment behavior analysis
- ❌ No collection effectiveness metrics

**Recommendations:**
```typescript
interface PaymentAnalytics {
  averageDaysToPayment: number;
  paymentMethodDistribution: Record<string, number>;
  reminderEffectiveness: number;  // % paid after reminder
  emailOpenRate: number;
  emailOpenToPaymentConversion: number;
  averagePaymentAmount: number;
  partialPaymentRate: number;
}

async function calculatePaymentAnalytics(): Promise<PaymentAnalytics> {
  const invoices = await supabase.from('invoices').select('*');
  const payments = await supabase.from('payments').select('*');

  // Calculate metrics...
}
```

---

## 6. RECOMMENDED IMMEDIATE ACTIONS

### Priority 1: Enable Basic Profitability Tracking

1. **Add Cost Fields to Invoice Items**
   ```sql
   ALTER TABLE invoice_items ADD COLUMN cost_per_unit DECIMAL(12, 2) DEFAULT 0;
   ALTER TABLE invoice_items ADD COLUMN total_cost DECIMAL(12, 2)
     GENERATED ALWAYS AS (quantity * cost_per_unit) STORED;
   ALTER TABLE invoice_items ADD COLUMN profit DECIMAL(12, 2)
     GENERATED ALWAYS AS (total - total_cost) STORED;
   ALTER TABLE invoice_items ADD COLUMN margin_percentage DECIMAL(5, 2)
     GENERATED ALWAYS AS ((total - total_cost) / NULLIF(total, 0) * 100) STORED;
   ```

2. **Auto-Calculate Project Spent**
   ```sql
   CREATE FUNCTION update_project_spent() RETURNS TRIGGER AS $$
   BEGIN
     UPDATE projects SET spent = (
       SELECT COALESCE(SUM(amount), 0)
       FROM finance_expenses
       WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
     ) + (
       SELECT COALESCE(SUM(amount), 0)
       FROM contractor_payments
       WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
     )
     WHERE id = COALESCE(NEW.project_id, OLD.project_id);
     RETURN COALESCE(NEW, OLD);
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trigger_update_project_spent
     AFTER INSERT OR UPDATE OR DELETE ON finance_expenses
     FOR EACH ROW EXECUTE FUNCTION update_project_spent();

   CREATE TRIGGER trigger_update_project_spent_contractors
     AFTER INSERT OR UPDATE OR DELETE ON contractor_payments
     FOR EACH ROW EXECUTE FUNCTION update_project_spent();
   ```

3. **Create Profit Dashboard View**
   ```sql
   CREATE VIEW profit_dashboard AS
   SELECT
     p.id as project_id,
     p.name as project_name,
     c.name as client_name,
     p.budget as budgeted_revenue,
     SUM(i.total_amount) as actual_revenue,
     p.spent as total_costs,
     SUM(i.total_amount) - p.spent as gross_profit,
     (SUM(i.total_amount) - p.spent) / NULLIF(SUM(i.total_amount), 0) * 100 as profit_margin,
     p.budget - SUM(i.total_amount) as revenue_variance,
     p.status
   FROM projects p
   LEFT JOIN clients c ON c.id = p.client_id
   LEFT JOIN invoices i ON i.project_id = p.id
   GROUP BY p.id, p.name, c.name, p.budget, p.spent, p.status;
   ```

### Priority 2: Enhance Financial Summary Calculation

**Update financeStoreSupabase.ts:**

```typescript
calculateFinancialSummary: async () => {
  // ... existing code ...

  // ADD: Cost breakdown by type
  const costBreakdown = {
    materials: receipts
      .filter(r => r.category === 'Materials')
      .reduce((sum, r) => sum + r.amount, 0),
    labor: employeePaymentsTotal + contractorPaymentsTotal,
    overhead: receipts
      .filter(r => !['Materials', 'Labor'].includes(r.category))
      .reduce((sum, r) => sum + r.amount, 0),
    recurring: monthlyRecurringCost
  };

  // ADD: Project profitability
  const projectProfitability = await supabase
    .from('profit_dashboard')
    .select('*');

  // ADD: Client profitability
  const clientProfitability = projects.reduce((acc, project) => {
    if (!acc[project.clientId]) {
      acc[project.clientId] = {
        clientName: project.clientName,
        totalRevenue: 0,
        totalCosts: 0,
        profit: 0,
        margin: 0
      };
    }

    acc[project.clientId].totalRevenue += project.totalAmount || 0;
    acc[project.clientId].totalCosts += project.spent || 0;
    acc[project.clientId].profit =
      acc[project.clientId].totalRevenue - acc[project.clientId].totalCosts;
    acc[project.clientId].margin =
      (acc[project.clientId].profit / acc[project.clientId].totalRevenue) * 100;

    return acc;
  }, {});

  // UPDATE state with enhanced data
  set({
    financialSummary: {
      ...existingSummary,
      costBreakdown,
      projectProfitability,
      clientProfitability
    }
  });
}
```

### Priority 3: Create Profitability Report Component

**New file: `src/components/reports/ProfitabilityReport.tsx`**

```typescript
export function ProfitabilityReport() {
  const { financialSummary } = useFinanceStore();

  return (
    <div className="space-y-6">
      {/* Overall Profit Margin */}
      <Card>
        <CardHeader>
          <CardTitle>Company Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Metric label="Total Revenue" value={formatCurrency(financialSummary.totalRevenue)} />
            <Metric label="Total Costs" value={formatCurrency(financialSummary.totalExpenses)} />
            <Metric
              label="Profit Margin"
              value={`${financialSummary.profitMargin.toFixed(1)}%`}
              trend={financialSummary.profitMargin >= 20 ? 'up' : 'down'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart data={financialSummary.costBreakdown} />
        </CardContent>
      </Card>

      {/* Project Profitability */}
      <Card>
        <CardHeader>
          <CardTitle>Project Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Costs</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialSummary.projectProfitability?.map(project => (
                <TableRow key={project.project_id}>
                  <TableCell>{project.project_name}</TableCell>
                  <TableCell>{formatCurrency(project.actual_revenue)}</TableCell>
                  <TableCell>{formatCurrency(project.total_costs)}</TableCell>
                  <TableCell className={project.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(project.gross_profit)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={project.profit_margin >= 20 ? 'success' : 'warning'}>
                      {project.profit_margin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Client Profitability */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clients by Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={Object.values(financialSummary.clientProfitability)
              .sort((a, b) => b.profit - a.profit)
              .slice(0, 10)}
            xKey="clientName"
            yKey="profit"
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 7. SUMMARY

### What You Have (Database)
✅ Comprehensive invoice and payment tracking
✅ Detailed expense recording with metadata
✅ Employee and contractor payroll systems
✅ Recurring expense tracking
✅ Budget vs actual variance fields
✅ Project budget and spent fields
✅ Client relationship tracking
✅ Automatic calculations for invoice totals, payment status, 1099 YTD

### What You're Using (Application)
✅ Revenue from customer payments
✅ Expenses from receipts
✅ Recurring expense projections
✅ Employee and contractor payroll totals
✅ Outstanding invoice balances
✅ Basic profit calculation (revenue - expenses)

### What You're NOT Using (Critical Gaps)
❌ Invoice line item profitability (no cost tracking)
❌ Project-level profit margins (manual spent field)
❌ Client profitability analysis
❌ Material vs labor cost breakdown
❌ Expense-to-invoice item linkage
❌ Payment behavior analytics
❌ Cash flow projections
❌ Late fee tracking
❌ Email engagement metrics
❌ Stripe payment metadata
❌ Receipt line item details (in metadata JSONB)
❌ OCR confidence scores
❌ Supplier information
❌ Payroll deductions breakdown
❌ Time tracking for labor allocation

### Key Recommendations
1. **Add cost_per_unit to invoice_items** - Enable true profit margin calculation
2. **Auto-calculate projects.spent** - Replace manual field with database trigger
3. **Create expense_allocations table** - Link material costs to invoice line items
4. **Build profitability views** - Project, client, and item-level profit analysis
5. **Enhance financial summary** - Include cost breakdown and margin analysis
6. **Create dedicated profit dashboard** - Visualize margins, trends, profitability

### ROI Opportunity
With the recommended changes, you could unlock:
- **Project profitability tracking** - Know which projects make money
- **Client profitability analysis** - Focus on best clients
- **Item-level margins** - Optimize pricing strategies
- **Cost center analysis** - Identify waste and inefficiencies
- **Accurate financial forecasting** - Based on real cost data

---

**Report Generated:** October 18, 2025
**Analyst:** Claude Code Quality Analyzer
**Status:** Ready for Implementation
