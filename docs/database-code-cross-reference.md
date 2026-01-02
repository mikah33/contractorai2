# Database-Code Cross Reference

**ContractorAI - Complete Table-to-Code Mapping**
Generated: 2025-11-04
Project: `/Users/mikahalbertson/git/ContractorAI/contractorai2`

---

## Executive Summary

This document maps all 54+ database tables to their usage in the codebase, tracking:
- Zustand stores that manage state
- React components that display/edit data
- Services that perform operations
- Edge functions that process data
- Complete CRUD operation locations

---

## Critical Finance Tables

### Table: `invoices`
**Schema Reference**: See `supabase/migrations/` for full schema
**Primary Store**: `/src/stores/financeStoreSupabase.ts` (lines 116-1449)

**Used By:**
- **Stores**:
  - `financeStoreSupabase.ts` - Primary invoice management

- **Components**:
  - `InvoiceManager.tsx` - Main invoice UI
  - `PaymentTracker.tsx` - Payment tracking
  - `FinanceTracker.tsx` - Finance dashboard
  - `FinanceDashboard.tsx` - Overview
  - `SaulExpenseDashboard.tsx` - AI finance assistant
  - `StripeConnectButton.tsx` - Stripe integration

- **Pages**:
  - `SaulFinance.tsx` - AI finance page
  - `Subscriptions.tsx` - Subscription management
  - `AITeamHub.tsx` - Team dashboard

- **Services**: None directly
- **Edge Functions**:
  - `get-invoices/index.ts` - Invoice retrieval

**CRUD Operations:**
- **CREATE**: `financeStoreSupabase.addInvoice()` (line 1332)
- **READ**: `financeStoreSupabase.fetchInvoices()` (line 1139)
- **UPDATE**: `financeStoreSupabase.updateInvoice()` (line 1391)
- **DELETE**: `financeStoreSupabase.deleteInvoice()` (line 1429)
- **SPECIAL**: `convertEstimateToInvoice()` (line 1182)

**Data Flow:**
```
User → InvoiceManager.tsx → financeStoreSupabase.createInvoice() → Supabase → invoices table
invoices table → fetchInvoices() → FinanceDashboard.tsx → User display
```

---

### Table: `invoice_payments`
**Primary Store**: `/src/stores/financeStoreSupabase.ts` (lines 136-147, 1452-1599)

**Used By:**
- **Stores**: `financeStoreSupabase.ts`
- **Components**: None directly (used through parent invoice components)

**CRUD Operations:**
- **CREATE**: `recordInvoicePayment()` (line 1452)
- **READ**: `fetchInvoicePayments()` (line 1569)
- **UPDATE**: `updateInvoicePayment()` (line 1272) - updates invoice totals
- **DELETE**: Via parent invoice deletion

**Data Flow:**
```
Payment form → recordInvoicePayment() → invoice_payments + finance_payments tables
invoice_payments → fetchInvoicePayments() → Payment history display
```

---

### Table: `payments` (alias: `finance_payments`)
**Primary Store**: `/src/stores/financeStoreSupabase.ts` (lines 56-68, 518-687)

**Used By:**
- **Stores**: `financeStoreSupabase.ts`
- **Components**:
  - `PaymentTracker.tsx` - Payment management
  - `RevenueTracker.tsx` - Revenue display
  - `BudgetTracker.tsx` - Budget vs actuals
  - `FinanceDashboard.tsx` - Dashboard display
  - `SaulChatbot.tsx` - AI assistant

- **Pages**:
  - `FinanceTracker.tsx`
  - `Dashboard.tsx`

**CRUD Operations:**
- **CREATE**: `financeStoreSupabase.addPayment()` (line 558)
- **READ**: `financeStoreSupabase.fetchPayments()` (line 519)
- **UPDATE**: `financeStoreSupabase.updatePayment()` (line 618)
- **DELETE**: `financeStoreSupabase.deletePayment()` (line 661)

**Data Flow:**
```
PaymentTracker → addPayment() → finance_payments table
finance_payments → fetchPayments() → RevenueTracker display
```

---

### Table: `finance_expenses` (formerly `receipts`)
**Primary Store**: `/src/stores/financeStoreSupabase.ts` (lines 329-516)

**Used By:**
- **Stores**: `financeStoreSupabase.ts`
- **Components**:
  - `ExpenseList.tsx` - Expense listing
  - `EditExpenseModal.tsx` - Expense editing
  - `ReceiptCapture.tsx` - Receipt scanning
  - `SaulExpenseDashboard.tsx` - AI expense tracker
  - `SaulChatbot.tsx` - AI assistant

**CRUD Operations:**
- **CREATE**: `addReceipt()` (line 377) - Inserts to `finance_expenses`
- **READ**: `fetchReceipts()` (line 329) - Reads from `finance_expenses`
- **UPDATE**: `updateReceipt()` (line 445)
- **DELETE**: `deleteReceipt()` (line 490)

**Data Flow:**
```
ReceiptCapture → addReceipt() → finance_expenses table
finance_expenses → fetchReceipts() → ExpenseList display
```

---

### Table: `recurring_expenses`
**Primary Store**: `/src/stores/financeStoreSupabase.ts` (lines 690-887)

**Used By:**
- **Stores**: `financeStoreSupabase.ts`
- **Components**:
  - `RecurringExpenses.tsx` - Management UI
  - `SaulExpenseDashboard.tsx` - AI dashboard

**CRUD Operations:**
- **CREATE**: `addRecurringExpense()` (line 723)
- **READ**: `fetchRecurringExpenses()` (line 690)
- **UPDATE**: `updateRecurringExpense()` (line 790)
- **DELETE**: `deleteRecurringExpense()` (line 833)
- **TOGGLE**: `toggleRecurringExpense()` (line 859)

---

### Table: `budget_items`
**Primary Store**: `/src/stores/financeStoreSupabase.ts` (lines 890-1070)

**Used By:**
- **Stores**: `financeStoreSupabase.ts`
- **Components**:
  - `BudgetTracker.tsx` - Budget management

**CRUD Operations:**
- **CREATE**: `addBudgetItem()` (line 929)
- **READ**: `fetchBudgetItems()` (line 890)
- **UPDATE**: `updateBudgetItem()` (line 984)
- **DELETE**: `deleteBudgetItem()` (line 1038)

---

## Project Management Tables

### Table: `projects`
**Primary Store**: `/src/stores/projectStore.ts` (lines 40-406)

**Used By:**
- **Stores**:
  - `projectStore.ts` - Primary project management
  - `financeStoreSupabase.ts` (lines 1073-1112) - Financial tracking

- **Components**:
  - `ProjectManager.tsx` - Main project UI
  - `EditProjectModal.tsx` - Project editing
  - `LinkClientModal.tsx` - Client linking
  - `ProjectSummaryCard.tsx` - Dashboard cards
  - `ProjectAIInsights.tsx` - AI insights
  - `BillChatbot.tsx` - AI project manager

- **Services**:
  - `calendarService.ts` - Date synchronization

- **Pages**:
  - `ProjectManager.tsx`
  - `BillProjectManager.tsx` - AI project manager
  - `Dashboard.tsx`
  - `CindyCRM.tsx`

**CRUD Operations:**
- **CREATE**: `projectStore.addProject()` (line 236) + Calendar sync
- **READ**: `projectStore.fetchProjects()` (line 110)
- **UPDATE**: `projectStore.updateProject()` (line 327) + Calendar sync
- **DELETE**: `projectStore.deleteProject()` (line 384)

**Data Flow:**
```
EditProjectModal → addProject() → projects table → CalendarService.syncProjectDates()
projects table → fetchProjects() → ProjectManager display
```

---

### Table: `tasks`
**Primary Store**: `/src/stores/projectStore.ts` (lines 21-29, 408-534)

**Used By:**
- **Stores**: `projectStore.ts`
- **Components**:
  - `TaskList.tsx` - Task management
  - `ProjectManager.tsx` - Parent container
  - `AITeamHub.tsx` - Team overview
  - `BillChatbot.tsx` - AI task assistance

**CRUD Operations:**
- **CREATE**: `projectStore.addTask()` (line 408)
- **READ**: Fetched with projects (line 144-150)
- **UPDATE**: `projectStore.updateTask()` (line 477)
- **DELETE**: `projectStore.deleteTask()` (line 514)

**Note**: Assignee field supports both single and multi-select (comma-separated storage)

---

### Table: `comments`
**Primary Store**: `/src/stores/projectStore.ts` (lines 31-38, 536-649)

**Used By:**
- **Stores**: `projectStore.ts`
- **Components**:
  - `ProjectComments.tsx` - Comment display/add
  - `ProjectManager.tsx` - Parent container

**CRUD Operations:**
- **CREATE**: `projectStore.addComment()` (line 537) - Includes file upload
- **READ**: Fetched with projects (line 153-159)
- **DELETE**: `projectStore.deleteComment()` (line 629)

**File Handling:**
- Attachments uploaded to Supabase Storage: `progress-photos` bucket
- Path: `comments/{projectId}/{timestamp}_{filename}`

---

### Table: `project_team_members`
**Primary Store**: `/src/stores/projectStore.ts` (lines 651-730)

**Used By:**
- **Stores**: `projectStore.ts`
- **Components**:
  - `TeamMemberSelector.tsx` - Team management
  - `ProjectManager.tsx` - Display
  - `EstimateEditor.tsx` - Team assignments

**CRUD Operations:**
- **CREATE**: `projectStore.addTeamMember()` (line 652)
- **READ**: Fetched with projects (line 162-165)
- **DELETE**: `projectStore.removeTeamMember()` (line 701)

---

### Table: `progress_updates`
**Primary Store**: `/src/stores/projectStore.ts` (lines 59-68, 733-894)

**Used By:**
- **Stores**: `projectStore.ts`
- **Components**:
  - `ProjectProgressGallery.tsx` - Photo gallery

**CRUD Operations:**
- **CREATE**: `projectStore.addProgressUpdate()` (line 771) - Multi-file upload
- **READ**: `projectStore.fetchProgressUpdates()` (line 733)
- **DELETE**: `projectStore.deleteProgressUpdate()` (line 864)

**File Handling:**
- Photos uploaded to: `progress-photos/{projectId}/{timestamp}_{filename}`
- Supports multiple file uploads per update

---

## Client Management Tables

### Table: `clients`
**Primary Store**: `/src/stores/clientsStore.ts` (complete file)

**Used By:**
- **Stores**:
  - `clientsStore.ts` - Primary client management
  - `projectStore.ts` - Client name resolution
  - `financeStoreSupabase.ts` (lines 1114-1136) - Financial tracking

- **Components**:
  - `ClientsList.tsx` - Main client UI
  - `AddClientModal.tsx` - Client creation
  - `EditClientModal.tsx` - Client editing
  - `SendEstimateModal.tsx` - Client selection
  - `SaveCalculationModal.tsx` - Client linking

- **Pages**:
  - `Clients.tsx` - Client management page
  - `CindyCRM.tsx` - CRM AI assistant
  - `EstimateGenerator.tsx` - Estimate generation

**CRUD Operations:**
- **CREATE**: `clientsStore.addClient()` (line 128)
- **READ**: `clientsStore.fetchClients()` (line 62)
- **UPDATE**: `clientsStore.updateClient()` (line 196)
- **DELETE**: `clientsStore.deleteClient()` (line 245)

**Filtering:**
- `setSearchTerm()` - Text search
- `setStatusFilter()` - Status filtering (active/inactive/prospect)

---

## Estimates & Calculator Tables

### Table: `estimates`
**Primary Store**: `/src/stores/estimateStore.ts` (complete file)

**Used By:**
- **Stores**: `estimateStore.ts`
- **Components**:
  - `EstimateEditor.tsx` - Estimate creation/editing
  - `EstimatePreview.tsx` - Estimate display
  - `SendEstimateModal.tsx` - Email sending
  - `AIEstimateAssistant.tsx` - AI assistance
  - `EstimateTemplateSelector.tsx` - Template selection
  - `SavedCalculations.tsx` - Saved estimates
  - `RecentEstimatesTable.tsx` - Dashboard display

- **Services**:
  - `estimateService.ts` - Estimate operations

- **Edge Functions**:
  - `send-estimate-email/index.ts` - Email delivery
  - `estimate-response/index.ts` - Customer responses

- **Pages**:
  - `EstimateGenerator.tsx`
  - `AICalculator.tsx`
  - `Dashboard.tsx`

**CRUD Operations:**
- **CREATE**: `estimateStore.addEstimate()` (line 103)
- **READ**: `estimateStore.fetchEstimates()` (line 67)
- **UPDATE**: `estimateStore.updateEstimate()` (line 152)
- **DELETE**: `estimateStore.deleteEstimate()` (line 257)
- **SPECIAL**: `createFromCalculator()` (line 275) - Convert calculations to estimates

**Conversion Flow:**
```
Calculator → createFromCalculator() → estimates table + calculations table
estimates → convertEstimateToInvoice() → invoices table
```

---

### Table: `calculator_estimates`
**Used By:**
- **Components**:
  - `CalculatorEstimateHeader.tsx` - Header display
  - `LoadEstimateDropdown.tsx` - Load saved estimates

- **Hooks**:
  - `useCalculatorEstimates.ts` - Calculator estimate management

**Purpose**: Stores calculator-specific estimates (pricing tool results)

---

### Table: `calculations`
**Used By:**
- **Stores**: `estimateStore.ts` (line 312-329)
- **Components**:
  - `SavedCalculations.tsx` - Saved calculator results
  - Various calculator components:
    - `RoofingCalculator.tsx`
    - `ConcreteCalculator.tsx`
    - `ElectricalCalculator.tsx`
    - `RetainingWallCalculator.tsx`

**Purpose**: Stores raw calculator computation results

---

## Calendar & Event Tables

### Table: `calendar_events`
**Primary Service**: `/src/services/calendarService.ts`

**Used By:**
- **Services**: `calendarService.ts` - Event management
- **Components**:
  - `CalendarDebug.tsx` - Debug interface

- **Pages**:
  - `BillProjectManager.tsx` - Project scheduling

**Features**:
- Project date synchronization
- Event creation/management
- Calendar integration

---

## Subscription & Stripe Tables

### Table: `stripe_customers`
**Used By:**
- **Pages**:
  - `Subscriptions.tsx` - Subscription display

- **Contexts**:
  - `DataContext.tsx` - Customer data management

- **Edge Functions**:
  - `stripe-webhook/index.ts` - Webhook handling
  - `import-stripe-customers/index.ts` - Customer import
  - `auto-link-stripe-customers/index.ts` - Auto-linking
  - `link-stripe-to-unconfirmed-users/index.ts` - User linking

**Integration**: Syncs Stripe customer data with local database

---

### Table: `stripe_subscriptions`
**Used By:**
- **Pages**:
  - `Subscriptions.tsx` - Subscription management

- **Contexts**:
  - `DataContext.tsx` - Subscription state

- **Edge Functions**:
  - `stripe-webhook/index.ts` - Subscription updates
  - `manual-sync-subscriptions/index.ts` - Manual sync
  - `get-subscription-details/index.ts` - Subscription retrieval
  - `cancel-subscription/index.ts` - Cancellation
  - `toggle-auto-renewal/index.ts` - Auto-renewal management

---

## Authentication & User Tables

### Table: `profiles`
**Used By:**
- **Stores**: `authStore.ts` - User profile management
- **Contexts**: `DataContext.tsx` - Profile data
- **Components**: `ConnectionTest.tsx` - Auth testing
- **Pages**: `Settings.tsx` - Profile settings

**Purpose**: Extended user profile data beyond auth.users

---

### Table: `employees`
**Primary Store**: `/src/stores/employeesStore.ts`

**Used By:**
- **Components**:
  - `EmployeePayments.tsx` - Payroll tracking
  - `TeamMemberSelector.tsx` - Team assignments
  - `NotificationWebhookModal.tsx` - Employee notifications

- **Pages**:
  - `EmployeesManager.tsx` - Employee management
  - `AITeamHub.tsx` - Team overview

---

## Edge Functions Summary

### Finance Functions
- `get-invoices` - Retrieve user invoices
- `generate-payment-link` - Create Stripe payment links
- `stripe-checkout` - Process Stripe checkouts
- `stripe-webhook` - Handle Stripe webhooks
- `stripe-connect-onboard` - Stripe Connect onboarding
- `create-billing-portal-session` - Billing portal access

### Communication Functions
- `send-estimate-email` - Email estimates to clients
- `estimate-response` - Handle customer estimate responses
- `send-gmail` - Gmail integration
- `gmail-oauth-callback` - Gmail OAuth
- `send-lead-notification` - Lead notifications
- `widget-lead-capture` - Widget lead capture

### Subscription Functions
- `cancel-subscription` - Cancel subscriptions
- `toggle-auto-renewal` - Toggle auto-renewal
- `get-subscription-details` - Get subscription info
- `manual-sync-subscriptions` - Manual subscription sync

### AI Functions
- `ai-calculator-chat` - AI calculator chatbot
- `saul-finance-chat` - Saul (Finance AI)
- `cindy-crm-chat` - Cindy (CRM AI)
- `bill-project-manager` - Bill (Project Manager AI)

### Integration Functions
- `google-ads-oauth` - Google Ads integration
- `meta-ads-oauth` - Meta Ads integration
- `n8n-receipt-webhook` - n8n webhook for receipts
- `get-roof-area` - Roof measurement API
- `widget-key-generate` - Widget API key generation
- `widget-validate` - Widget validation

### Admin Functions
- `import-stripe-customers` - Import Stripe customers
- `auto-link-stripe-customers` - Auto-link customers
- `link-stripe-to-unconfirmed-users` - Link unconfirmed users
- `list-auth-users` - List authenticated users
- `debug-user-subscription` - Debug subscriptions
- `search-user-by-partial-email` - User search
- `check-auth-simple` - Auth check
- `check-specific-user` - Specific user check

---

## Key Data Flow Patterns

### 1. Estimate → Invoice Flow
```
Calculator → estimateStore.createFromCalculator()
  ↓
estimates table (status: draft)
  ↓
estimateStore.updateEstimate() (status: approved)
  ↓
financeStore.convertEstimateToInvoice()
  ↓
invoices table (status: outstanding)
  ↓
financeStore.recordInvoicePayment()
  ↓
invoice_payments + finance_payments tables
  ↓
Invoice status → paid
```

### 2. Project → Calendar Sync
```
projectStore.addProject() or updateProject()
  ↓
projects table
  ↓
CalendarService.syncProjectDates()
  ↓
calendar_events table
```

### 3. Receipt → Financial Summary
```
ReceiptCapture → financeStore.addReceipt()
  ↓
finance_expenses table
  ↓
financeStore.fetchReceipts()
  ↓
financeStore.calculateFinancialSummary()
  ↓
Dashboard displays profit/loss
```

### 4. Multi-Table Financial Calculation
```
financeStore.calculateFinancialSummary() aggregates:
  - finance_expenses (direct costs)
  - finance_payments (revenue)
  - recurring_expenses (operating costs)
  - budget_items (planned expenses)
  ↓
Produces: totalRevenue, totalExpenses, profit, profitMargin
```

---

## Store → Table Mapping Matrix

| Store | Primary Tables | Secondary Tables |
|-------|----------------|------------------|
| `financeStoreSupabase.ts` | invoices, finance_expenses, finance_payments | invoice_payments, recurring_expenses, budget_items, projects, clients |
| `projectStore.ts` | projects, tasks, comments | project_team_members, progress_updates, clients |
| `clientsStore.ts` | clients | - |
| `estimateStore.ts` | estimates | calculations, calculator_estimates |
| `employeesStore.ts` | employees | - |
| `authStore.ts` | profiles | - |

---

## Component → Table Usage Matrix

### High-Usage Components (Access 3+ Tables)
- `FinanceDashboard.tsx` - invoices, payments, expenses, budget_items, projects
- `ProjectManager.tsx` - projects, tasks, comments, team_members, progress_updates
- `EstimateEditor.tsx` - estimates, clients, projects, calculations
- `SaulExpenseDashboard.tsx` - finance_expenses, finance_payments, recurring_expenses

### Medium-Usage Components (Access 1-2 Tables)
- `InvoiceManager.tsx` - invoices, invoice_payments
- `ClientsList.tsx` - clients
- `TaskList.tsx` - tasks
- `BudgetTracker.tsx` - budget_items, projects

---

## Critical Missing Mappings

Based on the 54 tables from the schema analysis, these tables were NOT found in active code usage:

1. **Widget/Lead Tables** - Limited direct UI access (handled by edge functions)
2. **Analytics Tables** - May be server-side only
3. **Audit/Logging Tables** - Background operations

**Action Required**: Verify if these tables exist in schema but are unused (technical debt).

---

## Recommendations

1. **Optimize Queries**: Many components fetch all rows then filter client-side
2. **Consolidate Stores**: Consider merging finance subtables into single query
3. **Add Indexes**: High-frequency joins (projects ↔ clients) need indexing
4. **Cache Strategy**: Implement React Query caching for all stores
5. **Type Safety**: Generate TypeScript types from database schema

---

**Document Maintenance**: Update this file when:
- New tables are created
- New stores are added
- Component patterns change
- Edge functions are modified
