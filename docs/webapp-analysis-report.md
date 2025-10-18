# ContractorAI WebApp - Comprehensive Analysis Report

**Analysis Date:** October 9, 2025
**Project Location:** `/Users/mikahalbertson/git/ContractorAI/contractorai2`
**Purpose:** iOS Xcode Project Conversion Planning

---

## Executive Summary

ContractorAI is a full-featured construction management SaaS platform built with React, TypeScript, and Supabase. The application provides comprehensive tools for contractors including pricing calculators (20+ trade types), project management, financial tracking, client management, estimates, and advertising analytics.

**Key Statistics:**
- **72 React Components** across 14 component categories
- **19 Page Routes** (full-screen views)
- **5,105 lines** of state management code (Zustand stores)
- **14,391 lines** of pricing calculator code
- **20+ construction trade calculators** with AI integration
- **Multi-language support** (English/Spanish via i18next)

---

## 1. Project Architecture

### 1.1 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | React | 18.3.1 | UI Components & Rendering |
| **Language** | TypeScript | 5.5.3 | Type Safety |
| **Build Tool** | Vite | 7.1.4 | Fast Development & Building |
| **Styling** | Tailwind CSS | 3.4.1 | Utility-first CSS |
| **State Management** | Zustand | 4.5.2 | Global State (lightweight) |
| **Data Fetching** | TanStack Query | 5.28.4 | Server State & Caching |
| **Routing** | React Router | 6.22.3 | Client-side Navigation |
| **Backend/DB** | Supabase | 2.58.0 | PostgreSQL, Auth, Storage |
| **Payments** | Stripe | 19.1.0 | Subscription Management |
| **PDF Generation** | jsPDF | 3.0.2 | Estimate/Invoice PDFs |
| **Internationalization** | i18next | 25.5.3 | Multi-language Support |
| **Icons** | Lucide React | 0.344.0 | Icon Library |
| **Date Utilities** | date-fns | 3.3.1 | Date Formatting |

### 1.2 Project Structure

```
/Users/mikahalbertson/git/ContractorAI/contractorai2/
├── src/
│   ├── components/          # 72 React components
│   │   ├── ads/            # Ad campaign management (6 components)
│   │   ├── auth/           # Authentication (1 component)
│   │   ├── calendar/       # Calendar & scheduling (2 components)
│   │   ├── clients/        # Client management (3 components)
│   │   ├── dashboard/      # Dashboard widgets (4 components)
│   │   ├── estimates/      # Estimate generator (5 components)
│   │   ├── finance/        # Financial tracking (14 components)
│   │   ├── layout/         # Header/Sidebar (2 components)
│   │   ├── pricing/        # Trade calculators (26 components)
│   │   ├── projects/       # Project management (8 components)
│   │   └── ui/             # Reusable UI (1 component)
│   ├── contexts/           # React Context providers (3 contexts)
│   ├── data/               # Static data (trades definitions)
│   ├── hooks/              # Custom React hooks (4 hooks)
│   ├── lib/                # Core libraries (Supabase, Query client)
│   ├── locales/            # i18n translations (en, es)
│   ├── pages/              # 19 page components
│   ├── services/           # API services (4 services)
│   ├── stores/             # Zustand stores (8 stores)
│   ├── types/              # TypeScript types (4 type files)
│   └── utils/              # Utility functions (3 utils)
├── supabase/               # Database migrations & functions
├── sql/                    # SQL schema files
├── public/                 # Static assets
├── widget/                 # Embeddable calculator widgets
├── n8n/                    # n8n automation configs
└── docs/                   # Documentation (66 files)
```

---

## 2. Complete Component Hierarchy

### 2.1 Application Root Structure

```
App.tsx (Root)
├── BrowserRouter (react-router-dom)
├── QueryClientProvider (TanStack Query)
├── DataProvider (Global data context)
│   ├── PricingProvider (Pricing state)
│   │   └── ProjectProvider (Project state)
│   │       ├── Sidebar (Navigation)
│   │       ├── Header (Top bar with user info)
│   │       └── Routes (Page router)
```

### 2.2 Page Components (19 Routes)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Dashboard | Main dashboard with finance summary |
| `/auth/login` | LoginPage | User authentication |
| `/auth/signup` | SignupPage | New user registration |
| `/pricing` | PricingCalculator | Multi-trade pricing tool |
| `/calculator-widgets` | CalculatorWidgets | Embeddable calculators |
| `/finance` | FinanceTracker | Financial management |
| `/estimates` | EstimateGenerator | Create professional estimates |
| `/projects` | ProjectManager | Project tracking & tasks |
| `/clients` | Clients | Client database |
| `/employees` | EmployeesManager | Team management |
| `/calendar` | Calendar | Project scheduling |
| `/ad-analyzer` | AdAnalyzer | Ad campaign analytics |
| `/ad-accounts` | AdAccountsSetup | Connect ad platforms |
| `/ad-oauth-callback` | AdOAuthCallback | Google Ads OAuth |
| `/meta-oauth-callback` | MetaOAuthCallback | Meta Ads OAuth |
| `/analytics` | AnalyticsDashboard | Business analytics |
| `/subscriptions` | Subscriptions | Manage subscription |
| `/settings` | Settings | User profile settings |
| `/reset-password` | ResetPassword | Password recovery |

### 2.3 Component Categories

#### A. Ads Components (6)
- `ABTesting.tsx` - A/B test campaign variants
- `AccountConnection.tsx` - Connect Google/Meta Ads accounts
- `AIInsights.tsx` - AI-powered campaign recommendations
- `CompetitorAnalysis.tsx` - Analyze competitor campaigns
- `MetricsDashboard.tsx` - Ad performance metrics
- **Purpose:** Integrate with Google Ads & Meta Ads APIs for campaign management

#### B. Auth Components (1)
- `RequireAuth.tsx` - Protected route wrapper
- **Purpose:** Authentication guard for private routes

#### C. Calendar Components (2)
- `CalendarDebug.tsx` - Calendar debugging utilities
- `EventModal.tsx` - Create/edit calendar events
- **Purpose:** Schedule projects and tasks

#### D. Clients Components (3)
- `AddClientModal.tsx` - New client form
- `ClientsList.tsx` - Client directory table
- `EditClientModal.tsx` - Edit client details
- **Purpose:** Manage client database with CRM features

#### E. Dashboard Components (4)
- `FinanceSummaryChart.tsx` - Revenue/expense charts
- `ProjectSummaryCard.tsx` - Project statistics widget
- `RecentEstimatesTable.tsx` - Latest estimates list
- `StatCard.tsx` - Reusable metric card
- **Purpose:** Display key business metrics at a glance

#### F. Estimates Components (5)
- `AIEstimateAssistant.tsx` - AI-powered estimate suggestions
- `EstimateEditor.tsx` - Line item editor
- `EstimatePreview.tsx` - PDF preview before sending
- `EstimateTemplateSelector.tsx` - Choose estimate templates
- `SendEstimateModal.tsx` - Email estimate to client
- **Purpose:** Create professional estimates with AI assistance

#### G. Finance Components (14)
- `BudgetTracker.tsx` - Track budgets vs actuals
- `CashFlowForecast.tsx` - Predict future cash flow
- `ContractorPayments.tsx` - Manage subcontractor payments
- `EditExpenseModal.tsx` - Edit expense records
- `EmployeePayments.tsx` - Payroll tracking
- `ExpenseList.tsx` - Expense directory
- `FinanceDashboard.tsx` - Main finance view
- `InvoiceManager.tsx` - Create and send invoices
- `PaymentTracker.tsx` - Track incoming payments
- `ReceiptCapture.tsx` - OCR receipt scanning
- `RecurringExpenses.tsx` - Manage recurring costs
- `ReportGenerator.tsx` - Generate financial reports
- `RevenueTracker.tsx` - Revenue tracking
- **Purpose:** Comprehensive financial management suite

#### H. Layout Components (2)
- `Header.tsx` - Top navigation bar with user menu
- `Sidebar.tsx` - Left navigation menu
- **Purpose:** Consistent app navigation

#### I. Pricing Components (26 calculators)
**20+ Trade-Specific Calculators:**
- `ConcreteCalculator.tsx` - Slabs, driveways, patios
- `DeckCalculator.tsx` - Deck building estimation
- `DoorsWindowsCalculator.tsx` - Door/window installation
- `DrywallCalculator.tsx` - Drywall installation
- `ElectricalCalculator.tsx` - Electrical work
- `ExcavationCalculator.tsx` - Site excavation
- `FencingCalculator.tsx` - Fence installation
- `FlooringCalculator.tsx` - Flooring materials & labor
- `FoundationCalculator.tsx` - Foundation work
- `FramingCalculator.tsx` - Structural framing
- `GutterCalculator.tsx` - Gutter installation
- `HVACCalculator.tsx` - HVAC systems
- `JunkRemovalCalculator.tsx` - Debris removal
- `PaintCalculator.tsx` - Interior/exterior painting
- `PaversCalculator.tsx` - Paver installation
- `PlumbingCalculator.tsx` - Plumbing work
- `RetainingWallCalculator.tsx` - Retaining walls
- `RoofingCalculator.tsx` - Roof replacement (with AI)
- `SidingCalculator.tsx` - Siding installation
- `TileCalculator.tsx` - Tile work

**Supporting Components:**
- `CalculatorResults.tsx` - Display calculation results
- `PricingResults.tsx` - Formatted pricing output
- `ProjectSpecifications.tsx` - Capture project details
- `TradeSelector.tsx` - Choose trade type

**Purpose:** Industry-specific pricing calculators with material/labor estimates

#### J. Projects Components (8)
- `EditProjectModal.tsx` - Edit project details
- `LinkClientModal.tsx` - Associate client with project
- `ProjectAIInsights.tsx` - AI project recommendations
- `ProjectComments.tsx` - Project discussion thread
- `ProjectProgressGallery.tsx` - Progress photo gallery
- `TaskList.tsx` - Project task management
- `TeamMemberSelector.tsx` - Assign team members
- `TestClientSave.tsx` - Debug component
- **Purpose:** Full project lifecycle management

#### K. UI Components (1)
- `tabs.tsx` - Reusable tab interface
- **Purpose:** Shared UI patterns

---

## 3. Database Schema (Supabase PostgreSQL)

### 3.1 Core Tables

#### **profiles**
User profile information with company details
```sql
- id: UUID (references auth.users)
- email: TEXT
- full_name: TEXT
- company_name: TEXT
- phone: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **clients**
Client/customer database
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- name: TEXT
- email: TEXT
- phone: TEXT
- company: TEXT
- address: TEXT
- city: TEXT
- state: TEXT
- zip: TEXT
- notes: TEXT
- status: ENUM('active', 'inactive', 'prospect')
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **projects**
Construction project records
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- name: TEXT
- client_id: UUID (references clients)
- client_name: TEXT (denormalized)
- status: ENUM('active', 'completed', 'on_hold', 'cancelled')
- priority: ENUM('low', 'medium', 'high')
- start_date: DATE
- end_date: DATE
- budget: DECIMAL(12,2)
- spent: DECIMAL(12,2)
- progress: INTEGER
- description: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **tasks**
Project task tracking
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- project_id: UUID (references projects)
- title: TEXT
- status: ENUM('todo', 'in-progress', 'completed')
- assignee: TEXT (comma-separated for multiple)
- due_date: DATE
- priority: ENUM('low', 'medium', 'high')
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **comments**
Project comments and discussions
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- project_id: UUID (references projects)
- author: TEXT
- content: TEXT
- attachments: JSONB (array of URLs)
- created_at: TIMESTAMPTZ
```

#### **project_team_members**
Project team assignments
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- project_id: UUID (references projects)
- member_name: TEXT
- member_email: TEXT
- member_role: TEXT
- created_at: TIMESTAMPTZ
```

#### **progress_updates**
Photo progress tracking
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- project_id: UUID (references projects)
- task_id: UUID (optional)
- description: TEXT
- photos: TEXT[] (array of storage URLs)
- posted_by: TEXT
- date: DATE
- created_at: TIMESTAMPTZ
```

### 3.2 Finance Tables

#### **receipts**
Expense receipt tracking
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- vendor: TEXT
- date: DATE
- amount: DECIMAL(12,2)
- category: TEXT
- project_id: UUID (optional)
- notes: TEXT
- image_url: TEXT (receipt scan)
- status: ENUM('pending', 'processed', 'verified')
- created_at: TIMESTAMPTZ
```

#### **payments**
Payment tracking
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- client_id: UUID (references clients)
- project_id: UUID (references projects)
- amount: DECIMAL(12,2)
- date: DATE
- method: ENUM('cash', 'check', 'credit_card', 'bank_transfer', 'other')
- reference: TEXT
- notes: TEXT
- status: ENUM('pending', 'completed', 'failed')
- invoice_id: UUID
- created_at: TIMESTAMPTZ
```

#### **recurring_expenses**
Recurring cost management
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- name: TEXT
- amount: DECIMAL(12,2)
- category: TEXT
- frequency: ENUM('weekly', 'monthly', 'quarterly', 'yearly')
- next_due_date: DATE
- vendor: TEXT
- project_id: UUID (optional)
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **budget_items**
Project budget tracking
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- project_id: UUID (references projects)
- category: TEXT
- budgeted_amount: DECIMAL(12,2)
- actual_amount: DECIMAL(12,2)
- variance: DECIMAL(12,2) (computed)
- variance_percentage: DECIMAL(5,2) (computed)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **invoices**
Invoice records
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- project_id: UUID (references projects)
- client_id: UUID (references clients)
- amount: DECIMAL(12,2)
- due_date: DATE
- status: ENUM('draft', 'sent', 'paid', 'overdue')
- items: JSONB (line items)
- created_at: TIMESTAMPTZ
```

### 3.3 Advertising Tables

#### **ad_accounts**
Connected ad platform accounts
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- platform: ENUM('google_ads', 'meta_ads')
- account_name: TEXT
- account_id: TEXT
- access_token: TEXT (encrypted)
- refresh_token: TEXT (encrypted)
- token_expires_at: TIMESTAMPTZ
- status: ENUM('active', 'paused', 'error')
- last_synced_at: TIMESTAMPTZ
- settings: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **ad_campaigns**
Ad campaign records
```sql
- id: UUID (primary key)
- ad_account_id: UUID (references ad_accounts)
- user_id: UUID (owner)
- platform: ENUM('google_ads', 'meta_ads')
- campaign_id: TEXT (platform ID)
- campaign_name: TEXT
- campaign_type: TEXT
- status: ENUM('active', 'paused', 'completed')
- budget: DECIMAL(12,2)
- daily_budget: DECIMAL(12,2)
- start_date: DATE
- end_date: DATE
- target_audience: JSONB
- settings: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **ad_metrics**
Campaign performance metrics
```sql
- id: UUID (primary key)
- campaign_id: UUID (references ad_campaigns)
- user_id: UUID (owner)
- date: DATE
- impressions: INTEGER
- clicks: INTEGER
- ctr: DECIMAL(5,2)
- conversions: INTEGER
- conversion_rate: DECIMAL(5,2)
- leads: INTEGER
- spend: DECIMAL(12,2)
- cost_per_click: DECIMAL(12,2)
- cost_per_conversion: DECIMAL(12,2)
- cost_per_lead: DECIMAL(12,2)
- roas: DECIMAL(12,2)
- revenue: DECIMAL(12,2)
```

### 3.4 Calendar Tables

#### **calendar_events**
Scheduled events and milestones
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- title: TEXT
- start_date: TIMESTAMPTZ
- end_date: TIMESTAMPTZ
- description: TEXT
- project_id: UUID (optional)
- event_type: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 3.5 Estimates Tables

#### **estimates**
Estimate records
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- project_id: UUID (references projects)
- client_id: UUID (references clients)
- status: ENUM('draft', 'sent', 'approved', 'rejected')
- created_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ
- total_amount: DECIMAL(12,2)
- items: JSONB (line items)
```

#### **estimate_items**
Estimate line items
```sql
- id: UUID (primary key)
- estimate_id: UUID (references estimates)
- description: TEXT
- quantity: DECIMAL(12,2)
- unit: TEXT
- unit_price: DECIMAL(12,2)
- total_price: DECIMAL(12,2)
- type: ENUM('material', 'labor', 'other')
- created_at: TIMESTAMPTZ
```

### 3.6 Storage Buckets

#### **progress-photos**
Project progress images
- Public bucket for project photos
- Used by progress_updates and comments tables
- Supports direct uploads from mobile

### 3.7 Row Level Security (RLS)

All tables have RLS enabled with policies:
- **SELECT**: Users can only view their own data
- **INSERT**: Users can only create records with their user_id
- **UPDATE**: Users can only update their own records
- **DELETE**: Users can only delete their own records

**Special Cases:**
- Public read access for shared estimates (via unique token)
- Service role access for n8n webhook integrations

---

## 4. State Management Architecture

### 4.1 Zustand Stores (8 stores, 5,105 lines total)

#### **authStore.ts** (247 lines)
**Purpose:** User authentication and profile management

**State:**
```typescript
{
  user: User | null,
  profile: Profile | null,
  session: Session | null,
  loading: boolean,
  initialized: boolean
}
```

**Actions:**
- `signIn(email, password)` - Email/password login
- `signUp(email, password, metadata)` - New user registration
- `signOut()` - Logout
- `fetchProfile()` - Load user profile
- `updateProfile(updates)` - Update profile
- `initialize()` - Initialize auth on app load

**Integrations:**
- n8n webhook on signup (`https://contractorai.app.n8n.cloud/webhook/170d14a9-ace1-49cf-baab-49dd8aec1245`)
- Supabase Auth (persistent sessions)

#### **projectStore.ts** (896 lines)
**Purpose:** Project, task, comment, and team management

**State:**
```typescript
{
  projects: Project[],
  progressUpdates: ProgressUpdate[],
  loading: boolean,
  error: string | null,
  hasLoadedOnce: boolean
}
```

**Actions:**
- `fetchProjects(force)` - Load all projects with tasks/comments
- `addProject(data)` - Create new project (syncs to calendar)
- `updateProject(id, updates)` - Update project
- `deleteProject(id)` - Remove project
- `addTask(projectId, task)` - Create task
- `updateTask(projectId, taskId, updates)` - Update task
- `deleteTask(projectId, taskId)` - Remove task
- `addComment(projectId, comment, files)` - Add comment with attachments
- `deleteComment(projectId, commentId)` - Remove comment
- `addTeamMember(projectId, name, email, role)` - Assign team member
- `removeTeamMember(projectId, name)` - Unassign team member
- `fetchProgressUpdates(projectId)` - Load progress photos
- `addProgressUpdate(update, files)` - Upload progress photos
- `deleteProgressUpdate(updateId)` - Remove progress update

**Integrations:**
- Supabase Storage for photo uploads
- Calendar service for project date syncing
- Handles multi-assignee tasks (comma-separated)

#### **financeStore.ts** (322 lines)
**Purpose:** Financial tracking (receipts, payments, budgets)

**State:**
```typescript
{
  receipts: Receipt[],
  payments: Payment[],
  recurringExpenses: RecurringExpense[],
  budgetItems: BudgetItem[],
  projects: Project[],
  clients: Client[],
  invoices: Invoice[],
  dateRange: 'week' | 'month' | 'quarter' | 'year',
  isLoading: boolean,
  error: string | null,
  financialSummary: FinancialSummary
}
```

**Actions:**
- `addReceipt(receipt)` - Track expense receipt
- `updateReceipt(receipt)` - Update receipt
- `deleteReceipt(id)` - Remove receipt
- `addPayment(payment)` - Record incoming payment
- `updatePayment(payment)` - Update payment
- `deletePayment(id)` - Remove payment
- `addRecurringExpense(expense)` - Setup recurring cost
- `updateRecurringExpense(expense)` - Update recurring cost
- `deleteRecurringExpense(id)` - Remove recurring cost
- `toggleRecurringExpense(id, active)` - Enable/disable recurring
- `addBudgetItem(item)` - Create budget category
- `updateBudgetItem(item)` - Update budget
- `setDateRange(range)` - Change date filter
- `generateReport(options)` - Export financial report
- `predictCashFlow(months)` - AI cash flow prediction
- `detectAnomalies()` - AI anomaly detection
- `suggestCostSavings()` - AI cost optimization

**Note:** Currently uses in-memory state. Supabase integration pending.

#### **clientsStore.ts**
**Purpose:** Client relationship management

**State:**
```typescript
{
  clients: Client[],
  loading: boolean,
  error: string | null
}
```

**Actions:**
- `fetchClients()` - Load all clients
- `addClient(data)` - Create new client
- `updateClient(id, updates)` - Update client info
- `deleteClient(id)` - Remove client

**Integrations:**
- Supabase clients table with RLS

#### **estimateStore.ts**
**Purpose:** Estimate creation and management

**State:**
```typescript
{
  estimates: Estimate[],
  loading: boolean,
  error: string | null
}
```

**Actions:**
- `fetchEstimates()` - Load all estimates
- `createEstimate(data)` - Create new estimate
- `updateEstimate(id, updates)` - Update estimate
- `deleteEstimate(id)` - Remove estimate
- `sendEstimate(id, email)` - Email to client
- `generatePDF(id)` - Export as PDF

**Integrations:**
- jsPDF for PDF generation
- Email service integration

#### **calendarStore.ts** & **calendarStoreSupabase.ts**
**Purpose:** Event scheduling and calendar management

**State:**
```typescript
{
  events: CalendarEvent[],
  loading: boolean,
  error: string | null
}
```

**Actions:**
- `fetchEvents(startDate, endDate)` - Load events in date range
- `addEvent(data)` - Create calendar event
- `updateEvent(id, updates)` - Update event
- `deleteEvent(id)` - Remove event
- `syncProjectDates(projectId)` - Auto-create events from projects

**Integrations:**
- Syncs with project start/end dates automatically
- Calendar service for date calculations

#### **employeesStore.ts**
**Purpose:** Team member and payroll management

**State:**
```typescript
{
  employees: Employee[],
  loading: boolean,
  error: string | null
}
```

**Actions:**
- `fetchEmployees()` - Load team members
- `addEmployee(data)` - Add team member
- `updateEmployee(id, updates)` - Update member info
- `deleteEmployee(id)` - Remove member
- `trackPayment(employeeId, amount)` - Record payroll

#### **adAnalyzerStore.ts**
**Purpose:** Ad campaign analytics

**State:**
```typescript
{
  campaigns: AdCampaign[],
  metrics: CampaignMetrics[],
  loading: boolean,
  error: string | null
}
```

**Actions:**
- `fetchCampaigns()` - Load ad campaigns
- `syncMetrics(campaignId)` - Pull latest metrics from ad platforms
- `analyzePerformance(campaignId)` - AI performance analysis

### 4.2 Context Providers (3 contexts)

#### **DataContext.tsx**
Global data synchronization layer
- Manages app-wide data loading
- Provides loading states across app
- Handles data initialization on login

#### **PricingContext.tsx**
Pricing calculator state
```typescript
{
  selectedTrade: Trade | null,
  specifications: Record<string, any>,
  pricingResults: any | null,
  savedEstimates: any[]
}
```

#### **ProjectContext.tsx**
Project-specific state for detailed views
- Wraps projectStore for component-level access
- Provides project-specific utilities

### 4.3 TanStack Query (React Query)

**Configuration** (`lib/queryClient.ts`):
```typescript
{
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
}
```

**Usage:**
- Caches Supabase query results
- Automatic background refetching
- Optimistic UI updates
- Query invalidation on mutations

**Key Queries:**
- `useSupabaseQuery('projects', fetchProjects)`
- `useSupabaseQuery('clients', fetchClients)`
- `useSupabaseQuery('finance', fetchFinanceData)`

### 4.4 State Flow Diagram

```
User Action
    ↓
Component Event Handler
    ↓
Zustand Store Action
    ↓
Supabase API Call
    ↓
TanStack Query Cache Update
    ↓
Store State Update
    ↓
Component Re-render
```

---

## 5. API Integrations

### 5.1 Supabase Backend

**Service File:** `src/lib/supabase.ts`

**Configuration:**
```typescript
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)
```

**Services Used:**
- **Auth:** User authentication (email/password)
- **Database:** PostgreSQL with Row Level Security
- **Storage:** File uploads (progress photos, receipts)
- **Realtime:** Live data subscriptions (not yet implemented)

**Key Operations:**
```typescript
// Authentication
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signUp({ email, password, options: { data: metadata } })
supabase.auth.getUser()
supabase.auth.onAuthStateChange(callback)

// Database queries
supabase.from('projects').select('*').eq('user_id', userId)
supabase.from('projects').insert(data).select().single()
supabase.from('projects').update(updates).eq('id', id)
supabase.from('projects').delete().eq('id', id)

// Storage
supabase.storage.from('progress-photos').upload(path, file)
supabase.storage.from('progress-photos').getPublicUrl(path)
```

### 5.2 Google Ads Integration

**Service File:** `src/services/googleAds.ts`

**OAuth Flow:**
```typescript
// 1. Get OAuth URL
const authUrl = getGoogleAdsOAuthUrl(redirectUri)
// Redirects to: https://accounts.google.com/o/oauth2/v2/auth

// 2. Handle callback (after user authorizes)
const { code } = queryParams
const tokens = await exchangeGoogleAdsCode(code, redirectUri)

// 3. Store tokens in database
await createAdAccount({
  platform: 'google_ads',
  account_name: 'My Ads Account',
  account_id: 'google-ads-account-id',
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token
})
```

**API Operations:**
```typescript
// Account management
createAdAccount(params)
getAdAccounts()
updateAdAccount(accountId, updates)
deleteAdAccount(accountId)

// Campaign management
createCampaign(params)
getCampaigns(adAccountId?)
getCampaign(campaignId)
updateCampaign(campaignId, updates)

// Metrics
saveCampaignMetrics(campaignId, date, metrics)
getCampaignMetrics(campaignId, startDate, endDate)
getAggregatedMetrics(startDate, endDate)

// Syncing
syncGoogleAdsCampaigns(accountId) // TODO: Implement
syncGoogleAdsMetrics(campaignId, startDate, endDate) // TODO: Implement
```

**Status:** OAuth flow implemented, API syncing is placeholder (requires backend)

### 5.3 Meta Ads (Facebook) Integration

**Service File:** `src/services/googleAds.ts` (shared file)

**OAuth Flow:**
```typescript
const authUrl = getMetaAdsOAuthUrl(redirectUri)
// Redirects to: https://www.facebook.com/v18.0/dialog/oauth
```

**Status:** OAuth URL generation implemented, full integration pending

### 5.4 Stripe Payments

**Service File:** `src/stripe-config.ts`

**Configuration:**
```typescript
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const stripeProducts = [{
  priceId: 'price_YOUR_STRIPE_PRICE_ID',
  name: 'Contractor AI',
  description: 'Complete contractor management solution',
  mode: 'subscription',
  price: 24.99,
  currency: 'usd',
  interval: 'month'
}]
```

**Implementation:**
- Subscription management via Stripe Checkout
- Price ID: `price_YOUR_STRIPE_PRICE_ID` (needs configuration)
- Monthly billing at $24.99/month
- Integrated with Subscriptions page

**Status:** Frontend configured, needs backend webhook handler

### 5.5 n8n Webhook Integration

**Webhook URL:** `https://contractorai.app.n8n.cloud/webhook/170d14a9-ace1-49cf-baab-49dd8aec1245`

**Trigger:** New user signup

**Payload:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "companyName": "ABC Construction",
  "phoneNumber": "+1234567890",
  "userId": "uuid-from-supabase",
  "timestamp": "2025-10-09T12:00:00.000Z",
  "source": "ContractorAI Web App"
}
```

**Purpose:**
- Trigger email campaigns
- CRM integration
- Analytics tracking
- Onboarding automation

**Implementation Location:** `src/stores/authStore.ts` (signUp function)

### 5.6 Analytics Service

**Service File:** `src/services/analytics.ts`

**Events Tracked:**
- User signups
- Estimate creations
- Project milestones
- Pricing calculations
- Feature usage

**Status:** Placeholder service, needs implementation

---

## 6. Business Logic & Features

### 6.1 Pricing Calculator System

**Core File:** `src/data/trades.tsx` (780 lines)

**20 Trade Types:**
1. **Deck Building** - Size, material, height, railing options
2. **Siding** - Area, material, insulation
3. **Concrete** - Area, thickness, application type
4. **Pavers** - Area calculation
5. **Drywall** - Wall area
6. **Painting** - Area, interior/exterior
7. **Framing** - Floor area
8. **Retaining Walls** - Length, height
9. **Excavation** - Area
10. **Flooring** - Area, material (hardwood, laminate, tile, vinyl, carpet)
11. **Tile** - Area, location (floor, wall, shower, backsplash)
12. **Electrical** - Service type, quantity
13. **HVAC** - Service type, home size
14. **Plumbing** - Service type
15. **Doors & Windows** - Type, quantity
16. **Fencing** - Length, height, material
17. **Foundation** - Type, area, depth, waterproofing
18. **Gutters** - Length, material, downspouts, guards
19. **Junk Removal** - Volume, type, heavy items
20. **Roofing** - Address (AI analysis), type, material, pitch

**Calculation Logic:**
Each calculator component computes:
- Material quantities
- Labor hours
- Total costs (material + labor)
- Markup/profit margins
- Regional cost adjustments

**Example: Deck Calculator**
```typescript
// User inputs
const inputs = {
  size: 300, // sq ft
  material: 'composite',
  height: 'medium', // 4-8 ft
  railing: 'composite',
  stairs: true,
  removal: false,
  quality: 'premium'
}

// Calculation
const materialCost = size * materialPricePerSqFt[material]
const laborCost = size * laborRatePerSqFt * complexityMultiplier[height]
const railingCost = perimeter * railingPricePerFt[railing]
const stairsCost = stairs ? 1500 : 0
const total = materialCost + laborCost + railingCost + stairsCost
```

**AI-Enhanced Calculators:**
- **Roofing Calculator**: Uses satellite imagery to estimate roof area and pitch
- **AI Estimate Assistant**: Suggests line items based on project description

### 6.2 Project Management Features

**Capabilities:**
- Create projects with client association
- Set budget, timeline, priority
- Add unlimited tasks with assignees
- Track progress percentage (auto-calculated from task completion)
- Comment threads with file attachments
- Progress photo gallery with descriptions
- Team member management
- Budget vs actual tracking
- Calendar integration for start/end dates

**Workflow:**
```
1. Create Project → Link Client
2. Add Tasks → Assign Team Members
3. Track Progress → Upload Photos
4. Monitor Budget → Record Expenses
5. Complete → Archive
```

### 6.3 Estimate Generation

**Features:**
- AI-powered line item suggestions
- Template library (residential, commercial, remodel)
- Drag-and-drop line items
- Material/labor cost breakdown
- Markup calculation
- Tax handling
- PDF generation with company branding
- Email delivery to clients
- Expiration dates
- Status tracking (draft, sent, approved, rejected)

**Workflow:**
```
1. Select Template
2. Add Client/Project
3. Add Line Items (or use AI assistant)
4. Review Totals
5. Preview PDF
6. Send to Client
7. Track Status
```

### 6.4 Financial Management

**Income Tracking:**
- Payment recording by project
- Payment method tracking
- Invoice generation
- Revenue by project/client
- Outstanding invoice tracking

**Expense Tracking:**
- Receipt capture (OCR ready)
- Categorization
- Project expense allocation
- Recurring expense automation
- Vendor tracking

**Budgeting:**
- Project budget creation
- Category-level budgets
- Budget vs actual comparison
- Variance alerts
- Forecasting

**Reporting:**
- Profit & loss statements
- Cash flow reports
- Project profitability
- Tax reports
- Custom date ranges

### 6.5 Client Management (CRM)

**Features:**
- Client database with full contact info
- Client status (active, inactive, prospect)
- Project history per client
- Payment history
- Notes and custom fields
- Client portal access (future)

### 6.6 Calendar & Scheduling

**Features:**
- Project timeline visualization
- Task deadline tracking
- Auto-sync project start/end dates
- Event creation
- Team availability (future)
- Calendar integrations (future: Google Calendar, Outlook)

### 6.7 Advertising Analytics

**Platforms Supported:**
- Google Ads
- Meta Ads (Facebook/Instagram)

**Metrics Tracked:**
- Impressions
- Clicks
- CTR (Click-through rate)
- Conversions
- Conversion rate
- Leads generated
- Spend
- Cost per click
- Cost per conversion
- Cost per lead
- ROAS (Return on ad spend)
- Revenue

**AI Features:**
- Campaign performance insights
- Competitor analysis
- A/B test recommendations
- Budget optimization suggestions

### 6.8 Team & Employee Management

**Features:**
- Employee directory
- Role assignment
- Payroll tracking
- Project assignments
- Performance tracking (future)

---

## 7. Authentication & Authorization

### 7.1 Authentication Flow

```
1. User visits app
   ↓
2. Check for existing Supabase session
   ↓
3. If no session → Redirect to /auth/login
   ↓
4. User enters email/password → Sign in
   ↓
5. Supabase Auth validates credentials
   ↓
6. If valid → Create session + JWT token
   ↓
7. Fetch user profile from profiles table
   ↓
8. Store in authStore (Zustand)
   ↓
9. Redirect to dashboard
   ↓
10. Auto-refresh token before expiry
```

**Session Persistence:**
- Stored in browser localStorage
- Auto-refresh on expiry
- Persistent across tabs
- Logout clears all session data

### 7.2 Authorization (RLS)

**Row Level Security Policies:**

Every table has 4 policies:
```sql
-- View own data
CREATE POLICY "Users can view own X"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- Create own data
CREATE POLICY "Users can insert own X"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update own data
CREATE POLICY "Users can update own X"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);

-- Delete own data
CREATE POLICY "Users can delete own X"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```

**Benefits:**
- Database-level security (can't be bypassed by client)
- Automatic data isolation between users
- No user_id filtering needed in application code
- Protection against SQL injection

### 7.3 Protected Routes

**Implementation:** `src/components/auth/RequireAuth.tsx`

```typescript
// Wraps protected routes
<Route path="/dashboard" element={
  <RequireAuth>
    <Dashboard />
  </RequireAuth>
} />
```

**Logic:**
- Check `authStore.user`
- If null → Redirect to `/auth/login`
- If present → Render component

### 7.4 User Profile System

**Profile Creation:**
- Automatic on signup via Supabase trigger
- Populates from auth metadata
- Fields: email, full_name, company_name, phone

**Profile Updates:**
- Settings page
- Updates both auth metadata and profiles table
- Triggers updated_at timestamp

---

## 8. File Organization & Code Patterns

### 8.1 Component Patterns

**Modal Pattern:**
```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  initialData?: any
}

const Modal = ({ isOpen, onClose, onSubmit }: ModalProps) => {
  const [formData, setFormData] = useState(initialData)

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
        </form>
      </div>
    </div>
  )
}
```

**Store Hook Pattern:**
```typescript
// In component
const { projects, addProject, loading } = useProjectStore()

// Store action
addProject: async (data) => {
  set({ loading: true })
  try {
    const result = await supabase.from('projects').insert(data)
    set(state => ({
      projects: [...state.projects, result.data],
      loading: false
    }))
  } catch (error) {
    set({ error: error.message, loading: false })
  }
}
```

**Calculator Pattern:**
```typescript
interface CalculatorProps {
  onCalculate: (results: CalculationResult[]) => void
}

const Calculator = ({ onCalculate }: CalculatorProps) => {
  const [inputs, setInputs] = useState({})

  const calculate = () => {
    // Perform calculations
    const results = [
      { label: 'Material', value: materialCost, unit: 'USD' },
      { label: 'Labor', value: laborCost, unit: 'USD' },
      { label: 'Total', value: totalCost, unit: 'USD', isTotal: true }
    ]
    onCalculate(results)
  }

  return (
    <div>
      {/* Input fields */}
      <button onClick={calculate}>Calculate</button>
    </div>
  )
}
```

### 8.2 Type Safety

**Strict TypeScript Configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**Type Definition Files:**
- `src/types/index.ts` - Core types (Project, Task, Client, etc.)
- `src/types/ads.ts` - Ad platform types
- `src/types/analytics.ts` - Analytics types
- `src/types/estimates.ts` - Estimate types

### 8.3 Error Handling

**Pattern:**
```typescript
try {
  set({ loading: true, error: null })
  const { data, error } = await supabase.from('table').insert(data)

  if (error) throw error

  set({ data, loading: false })
} catch (error) {
  console.error('Error:', error)
  set({
    error: error.message || 'An error occurred',
    loading: false
  })
  alert(`Error: ${error.message}`) // User notification
}
```

### 8.4 Loading States

**Pattern:**
```typescript
// Store
const [loading, setLoading] = useState(false)

// Component
if (loading) {
  return (
    <div className="flex justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}
```

---

## 9. Internationalization (i18n)

**Configuration:** `src/i18n.ts`

**Supported Languages:**
- English (`en`)
- Spanish (`es`)

**Translation Files:**
- `src/locales/en/translation.json`
- `src/locales/es/translation.json`

**Usage:**
```typescript
import { useTranslation } from 'react-i18next'

const Component = () => {
  const { t, i18n } = useTranslation()

  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button onClick={() => i18n.changeLanguage('es')}>
        Español
      </button>
    </div>
  )
}
```

**Translations Cover:**
- UI labels and buttons
- Error messages
- Trade names (pricing calculators)
- Form field labels
- Validation messages

---

## 10. Critical Files for iOS Conversion

### 10.1 Entry Points

| File | Purpose | iOS Equivalent |
|------|---------|----------------|
| `src/main.tsx` | App bootstrap | `AppDelegate.swift` / `@main` |
| `src/App.tsx` | Root component | Root `View` / `ViewController` |
| `index.html` | HTML shell | Not needed (native app) |

### 10.2 Core Business Logic

| File | Purpose | iOS Implementation |
|------|---------|-------------------|
| `src/data/trades.tsx` | Trade definitions | Swift structs/enums |
| `src/components/pricing/*.tsx` | Calculators | SwiftUI views with calculation logic |
| `src/stores/*.ts` | State management | SwiftUI `@StateObject` / `@ObservableObject` |
| `src/services/supabase.ts` | Backend API | `supabase-swift` SDK |

### 10.3 Type Definitions

| File | Purpose | iOS Equivalent |
|------|---------|----------------|
| `src/types/index.ts` | Core data models | Swift structs/classes |
| `src/types/ads.ts` | Ad types | Swift enums/structs |
| `src/types/estimates.ts` | Estimate types | Codable structs |

### 10.4 Database Schema

| File | Purpose | iOS Equivalent |
|------|---------|----------------|
| `sql/*.sql` | Database schema | Supabase (same backend) |
| `supabase/migrations/*.sql` | Migrations | Supabase (same backend) |

### 10.5 Assets

| Path | Contents | iOS Location |
|------|----------|--------------|
| `public/` | Logo, favicon | `Assets.xcassets` |
| `src/locales/` | Translations | `Localizable.strings` |

---

## 11. Key Dependencies for iOS

### 11.1 Must Migrate

| Web Package | iOS Equivalent | Notes |
|------------|----------------|-------|
| `@supabase/supabase-js` | `supabase-swift` | Official Swift SDK |
| `@stripe/stripe-js` | `Stripe iOS SDK` | Native payments |
| `react-router-dom` | SwiftUI `NavigationStack` | Navigation |
| `zustand` | `@StateObject` / `@Published` | State management |
| `@tanstack/react-query` | Custom caching layer | Or use URLCache |
| `date-fns` | `Foundation.Date` | Native date handling |
| `i18next` | `NSLocalizedString` | Native localization |
| `lucide-react` | SF Symbols or custom | Icon system |

### 11.2 New iOS Requirements

| Package | Purpose |
|---------|---------|
| `supabase-swift` | Backend SDK |
| `StripePaymentSheet` | Payment UI |
| `PhotosUI` | Photo picking |
| `PDFKit` | PDF generation |
| `Charts` (iOS 16+) | Data visualization |

---

## 12. Feature Conversion Complexity

### 12.1 Low Complexity (Direct Translation)

- Authentication (email/password)
- Profile management
- Client CRUD operations
- Simple list views
- Form inputs
- Basic navigation

### 12.2 Medium Complexity (Requires Adaptation)

- Pricing calculators (UI redesign for iOS)
- Calendar integration (use EventKit)
- PDF generation (use PDFKit)
- Photo uploads (use PhotosPicker)
- State management (Zustand → SwiftUI)
- Navigation (React Router → NavigationStack)

### 12.3 High Complexity (Significant Rework)

- Embeddable widget system (not applicable to iOS)
- n8n webhook triggers (backend only)
- Google Ads OAuth (needs iOS OAuth flow)
- Meta Ads OAuth (needs iOS OAuth flow)
- Real-time subscriptions (Supabase Realtime in Swift)
- Chart rendering (use Charts framework or third-party)

---

## 13. Database Migration Strategy

### 13.1 Backend Compatibility

**Good News:** Supabase backend can be used as-is for iOS app

**No Changes Needed:**
- Database schema (PostgreSQL)
- Row Level Security policies
- Storage buckets
- Auth configuration

**iOS SDK Support:**
```swift
import Supabase

let supabase = SupabaseClient(
  supabaseURL: URL(string: "https://xxxxx.supabase.co")!,
  supabaseKey: "your-anon-key"
)
```

### 13.2 API Parity

All Supabase operations have Swift equivalents:

| JavaScript | Swift |
|-----------|-------|
| `supabase.from('projects').select()` | `supabase.from("projects").select()` |
| `supabase.from('projects').insert(data)` | `supabase.from("projects").insert(data)` |
| `supabase.auth.signIn()` | `supabase.auth.signIn()` |
| `supabase.storage.upload()` | `supabase.storage.upload()` |

---

## 14. iOS App Architecture Recommendations

### 14.1 Suggested Structure

```
ContractorAI-iOS/
├── ContractorAI/
│   ├── App/
│   │   └── ContractorAIApp.swift (@main)
│   ├── Core/
│   │   ├── Supabase/
│   │   │   ├── SupabaseClient.swift
│   │   │   ├── AuthService.swift
│   │   │   ├── DatabaseService.swift
│   │   │   └── StorageService.swift
│   │   ├── Models/
│   │   │   ├── Project.swift
│   │   │   ├── Client.swift
│   │   │   ├── Task.swift
│   │   │   ├── Estimate.swift
│   │   │   └── Trade.swift
│   │   └── ViewModels/
│   │       ├── AuthViewModel.swift
│   │       ├── ProjectViewModel.swift
│   │       ├── ClientViewModel.swift
│   │       └── EstimateViewModel.swift
│   ├── Features/
│   │   ├── Authentication/
│   │   │   ├── LoginView.swift
│   │   │   └── SignUpView.swift
│   │   ├── Dashboard/
│   │   │   └── DashboardView.swift
│   │   ├── Projects/
│   │   │   ├── ProjectListView.swift
│   │   │   ├── ProjectDetailView.swift
│   │   │   └── AddProjectView.swift
│   │   ├── Clients/
│   │   │   ├── ClientListView.swift
│   │   │   └── ClientDetailView.swift
│   │   ├── Estimates/
│   │   │   ├── EstimateListView.swift
│   │   │   ├── EstimateEditorView.swift
│   │   │   └── EstimatePDFView.swift
│   │   ├── Pricing/
│   │   │   ├── TradeSelectorView.swift
│   │   │   ├── Calculators/
│   │   │   │   ├── DeckCalculatorView.swift
│   │   │   │   ├── RoofingCalculatorView.swift
│   │   │   │   └── (20+ calculators)
│   │   │   └── CalculatorResultsView.swift
│   │   ├── Finance/
│   │   │   ├── FinanceDashboardView.swift
│   │   │   ├── ExpenseListView.swift
│   │   │   └── ReportView.swift
│   │   └── Settings/
│   │       └── SettingsView.swift
│   ├── Components/
│   │   ├── StatCard.swift
│   │   ├── ProjectCard.swift
│   │   └── LoadingView.swift
│   └── Resources/
│       ├── Assets.xcassets
│       └── Localizable.strings
├── ContractorAITests/
└── ContractorAIUITests/
```

### 14.2 SwiftUI View Examples

**Login View:**
```swift
struct LoginView: View {
    @StateObject private var viewModel = AuthViewModel()
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 20) {
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never)

            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)

            Button("Sign In") {
                Task {
                    await viewModel.signIn(email: email, password: password)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isLoading)

            if viewModel.isLoading {
                ProgressView()
            }
        }
        .padding()
    }
}
```

**Project List View:**
```swift
struct ProjectListView: View {
    @StateObject private var viewModel = ProjectViewModel()

    var body: some View {
        NavigationStack {
            List(viewModel.projects) { project in
                NavigationLink(destination: ProjectDetailView(project: project)) {
                    ProjectRow(project: project)
                }
            }
            .navigationTitle("Projects")
            .toolbar {
                Button(action: { viewModel.showAddProject = true }) {
                    Image(systemName: "plus")
                }
            }
            .sheet(isPresented: $viewModel.showAddProject) {
                AddProjectView(viewModel: viewModel)
            }
        }
        .task {
            await viewModel.fetchProjects()
        }
    }
}
```

**ViewModel Pattern:**
```swift
@MainActor
class ProjectViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var isLoading = false
    @Published var error: String?

    private let supabase = SupabaseClient.shared

    func fetchProjects() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let response: [Project] = try await supabase
                .from("projects")
                .select()
                .order("created_at", ascending: false)
                .execute()
                .value

            projects = response
        } catch {
            self.error = error.localizedDescription
        }
    }

    func addProject(_ project: Project) async {
        do {
            try await supabase
                .from("projects")
                .insert(project)
                .execute()

            await fetchProjects()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
```

---

## 15. Migration Roadmap

### Phase 1: Foundation (2-3 weeks)
1. ✅ Set up Xcode project (SwiftUI + Swift)
2. ✅ Install Supabase Swift SDK
3. ✅ Configure environment variables
4. ✅ Create data models (structs matching database schema)
5. ✅ Implement Supabase client wrapper
6. ✅ Build authentication (login, signup)
7. ✅ Create main navigation structure

### Phase 2: Core Features (4-6 weeks)
1. ✅ Project management
   - List view with filtering/sorting
   - Detail view with tasks/comments
   - Add/edit/delete projects
   - Photo gallery
2. ✅ Client management
   - List view
   - Add/edit/delete clients
3. ✅ Basic dashboard
   - Stats cards
   - Recent projects
   - Finance summary

### Phase 3: Pricing Calculators (3-4 weeks)
1. ✅ Trade selector interface
2. ✅ Calculator framework (reusable components)
3. ✅ Implement all 20 calculators
4. ✅ Calculation logic ports from JavaScript
5. ✅ Results display

### Phase 4: Estimates (2-3 weeks)
1. ✅ Estimate editor
2. ✅ PDF generation (PDFKit)
3. ✅ Email integration
4. ✅ Template system

### Phase 5: Finance (3-4 weeks)
1. ✅ Expense tracking
2. ✅ Payment tracking
3. ✅ Budget management
4. ✅ Reports
5. ✅ Charts (using Charts framework)

### Phase 6: Calendar (1-2 weeks)
1. ✅ Calendar view
2. ✅ Event management
3. ✅ Project date syncing
4. ✅ EventKit integration (optional)

### Phase 7: Ads & Analytics (2-3 weeks)
1. ✅ OAuth flows (Google Ads, Meta Ads)
2. ✅ Campaign list/detail views
3. ✅ Metrics dashboard
4. ✅ Charts and visualizations

### Phase 8: Polish (2-3 weeks)
1. ✅ UI/UX refinement
2. ✅ Error handling
3. ✅ Loading states
4. ✅ Localization (English/Spanish)
5. ✅ Dark mode support
6. ✅ iPad optimization

### Phase 9: Testing & Deployment (2-3 weeks)
1. ✅ Unit tests
2. ✅ UI tests
3. ✅ Beta testing (TestFlight)
4. ✅ App Store submission
5. ✅ Documentation

**Total Estimated Time:** 20-31 weeks (5-8 months)

---

## 16. API Endpoint Summary

### 16.1 Supabase REST Endpoints

All endpoints follow pattern: `https://[project-id].supabase.co/rest/v1/[table]`

**Authentication:**
```
POST /auth/v1/signup
POST /auth/v1/token?grant_type=password
POST /auth/v1/logout
GET  /auth/v1/user
```

**Projects:**
```
GET    /projects
POST   /projects
PATCH  /projects?id=eq.[uuid]
DELETE /projects?id=eq.[uuid]
```

**Clients:**
```
GET    /clients
POST   /clients
PATCH  /clients?id=eq.[uuid]
DELETE /clients?id=eq.[uuid]
```

**Tasks:**
```
GET    /tasks?project_id=eq.[uuid]
POST   /tasks
PATCH  /tasks?id=eq.[uuid]
DELETE /tasks?id=eq.[uuid]
```

**Comments:**
```
GET    /comments?project_id=eq.[uuid]
POST   /comments
DELETE /comments?id=eq.[uuid]
```

**Progress Updates:**
```
GET    /progress_updates?project_id=eq.[uuid]
POST   /progress_updates
DELETE /progress_updates?id=eq.[uuid]
```

**Storage:**
```
POST   /storage/v1/object/progress-photos/[path]
GET    /storage/v1/object/public/progress-photos/[path]
DELETE /storage/v1/object/progress-photos/[path]
```

### 16.2 Third-Party APIs

**Google Ads:**
```
GET https://googleads.googleapis.com/v14/customers/{customer_id}/campaigns
GET https://googleads.googleapis.com/v14/customers/{customer_id}/campaigns/{campaign_id}/metrics
```

**Meta Ads:**
```
GET https://graph.facebook.com/v18.0/act_{account_id}/campaigns
GET https://graph.facebook.com/v18.0/{campaign_id}/insights
```

**Stripe:**
```
POST https://api.stripe.com/v1/checkout/sessions
GET  https://api.stripe.com/v1/subscriptions/{subscription_id}
```

**n8n Webhook:**
```
POST https://contractorai.app.n8n.cloud/webhook/170d14a9-ace1-49cf-baab-49dd8aec1245
```

---

## 17. Environment Variables

### 17.1 Required Variables

**Web App (.env):**
```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Google Ads (Optional)
VITE_GOOGLE_ADS_CLIENT_ID=xxxxx.apps.googleusercontent.com

# Meta Ads (Optional)
VITE_META_APP_ID=xxxxx
```

**iOS App (Config.plist or xcconfig):**
```swift
// Config.swift
enum Config {
    static let supabaseURL = "https://xxxxx.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    static let stripePublishableKey = "pk_live_xxxxx"
}
```

---

## 18. Performance Considerations

### 18.1 Current Web Performance

- **Bundle Size:** ~2.5 MB (compressed)
- **Initial Load:** ~1.2s (local dev)
- **Lazy Loading:** Routes are code-split
- **Caching:** TanStack Query caches for 5 minutes
- **Image Optimization:** Not implemented

### 18.2 iOS Optimization Opportunities

- **Native Performance:** Swift is faster than JavaScript
- **Offline Support:** Core Data for local caching
- **Background Sync:** Sync data in background
- **Image Caching:** URLCache or Kingfisher
- **Lazy Loading:** Load calculators on-demand
- **Memory Management:** Swift's ARC (better than JS GC)

---

## 19. Known Issues & Limitations

### 19.1 Current Webapp Issues

1. **Finance Store:** Not connected to Supabase (in-memory only)
2. **Google/Meta Ads:** OAuth implemented, but syncing is placeholder
3. **AI Features:** Placeholders (estimate assistant, roofing calculator)
4. **Real-time Updates:** Not implemented (Supabase Realtime available but unused)
5. **Receipt OCR:** Component exists but OCR not implemented
6. **Email Delivery:** Frontend only, needs backend endpoint
7. **PDF Branding:** Generic templates, no custom logo upload

### 19.2 iOS-Specific Challenges

1. **OAuth Flows:** Need to implement iOS-specific OAuth (ASWebAuthenticationSession)
2. **Push Notifications:** Not in webapp, would be valuable for iOS
3. **Widget Extension:** Calculator widgets for iOS home screen
4. **Watch App:** Simplified project/task tracking
5. **Siri Shortcuts:** Voice commands for common actions
6. **Handoff:** Continue work across iOS devices

---

## 20. Security Considerations

### 20.1 Current Security Measures

- ✅ Row Level Security (RLS) on all tables
- ✅ JWT token-based authentication
- ✅ HTTPS only (enforced by Supabase)
- ✅ Environment variables for secrets
- ✅ Auto token refresh
- ✅ Session expiration
- ❌ Rate limiting (should be implemented)
- ❌ Input sanitization (relies on Supabase)
- ❌ CAPTCHA on signup (should add)

### 20.2 iOS Security Enhancements

- ✅ Keychain storage for auth tokens
- ✅ Face ID / Touch ID for app unlock
- ✅ Certificate pinning for API calls
- ✅ App Transport Security (ATS)
- ✅ Data encryption at rest (via iOS)
- ✅ Secure enclave for sensitive data

---

## 21. Testing Strategy

### 21.1 Web Testing (Current)

**Minimal testing currently:**
- No unit tests
- No integration tests
- Manual testing only
- ESLint for code quality

### 21.2 Recommended iOS Testing

**Unit Tests:**
```swift
@testable import ContractorAI
import XCTest

class ProjectViewModelTests: XCTestCase {
    func testFetchProjects() async throws {
        let viewModel = ProjectViewModel()
        await viewModel.fetchProjects()
        XCTAssertGreaterThan(viewModel.projects.count, 0)
    }
}
```

**UI Tests:**
```swift
class ProjectFlowUITests: XCTestCase {
    func testCreateProject() {
        let app = XCUIApplication()
        app.launch()

        app.buttons["Add Project"].tap()
        app.textFields["Project Name"].tap()
        app.textFields["Project Name"].typeText("Test Project")
        app.buttons["Save"].tap()

        XCTAssertTrue(app.staticTexts["Test Project"].exists)
    }
}
```

---

## 22. Documentation

### 22.1 Existing Documentation (66 files in `/docs`)

Key documents include:
- README.md (comprehensive setup guide)
- API documentation
- Database schema docs
- Component documentation
- Setup progress updates

### 22.2 Recommended iOS Documentation

1. **Architecture Decision Records (ADRs)**
   - Why SwiftUI vs UIKit
   - State management approach
   - Networking layer design

2. **API Documentation**
   - Swift model mappings
   - Supabase service wrappers
   - Error handling patterns

3. **UI Component Library**
   - Reusable SwiftUI components
   - Design system (colors, fonts, spacing)
   - Accessibility guidelines

4. **Onboarding Guide**
   - Project setup
   - Environment configuration
   - Build and run instructions

---

## 23. Deployment

### 23.1 Web Deployment (Current)

**Platform:** Netlify
**Config:** `.netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Build Command:**
```bash
npm run build
# Outputs to dist/
```

### 23.2 iOS Deployment

**App Store Connect:**
1. Create app record
2. Configure app metadata
3. Upload build via Xcode or fastlane
4. Submit for review

**Fastlane Configuration:**
```ruby
# Fastfile
lane :beta do
  build_app(scheme: "ContractorAI")
  upload_to_testflight
end

lane :release do
  build_app(scheme: "ContractorAI")
  upload_to_app_store
end
```

**Version Management:**
- Use semantic versioning (1.0.0, 1.0.1, etc.)
- Increment build number for each TestFlight upload
- Tag releases in Git

---

## 24. Monetization

### 24.1 Current Pricing Model

**Subscription:**
- **Price:** $24.99/month
- **Billing:** Monthly via Stripe
- **Features:** All features included (no tiers)

**Stripe Product ID:** `price_YOUR_STRIPE_PRICE_ID` (needs configuration)

### 24.2 iOS In-App Purchase Options

**Option 1: Stripe (Current)**
- Keep using Stripe Checkout
- Avoid Apple's 30% commission
- Users redirected to web for payment
- More complex user experience

**Option 2: StoreKit (Recommended)**
```swift
import StoreKit

// Product IDs
let monthlySubscription = "com.contractorai.monthly"

// Purchase flow
func purchase(productId: String) async throws {
    let product = try await Product.products(for: [productId]).first
    let result = try await product?.purchase()
    // Handle result
}
```

**Pricing Tiers (Consider adding):**
- **Basic:** $19.99/month - 10 projects, 5 estimates/month
- **Pro:** $49.99/month - Unlimited projects, AI features
- **Enterprise:** $99.99/month - Team features, API access

---

## 25. Analytics & Monitoring

### 25.1 Current Analytics (Minimal)

**Implemented:**
- Basic event tracking service (placeholder)
- No actual analytics provider configured

**Recommended for Web:**
- Google Analytics or Mixpanel
- Sentry for error tracking
- PostHog for product analytics

### 25.2 iOS Analytics Recommendations

**Firebase Analytics:**
```swift
import Firebase

Analytics.logEvent("project_created", parameters: [
  "project_type": "residential",
  "budget": 50000
])
```

**Crash Reporting:**
```swift
import Firebase
Crashlytics.crashlytics().record(error: error)
```

**Performance Monitoring:**
```swift
let trace = Performance.startTrace(name: "fetch_projects")
// ... perform operation
trace?.stop()
```

---

## 26. Localization

### 26.1 Current Languages

- **English** (en) - Primary
- **Spanish** (es) - Secondary

**Translation Files:**
- `src/locales/en/translation.json`
- `src/locales/es/translation.json`

### 26.2 iOS Localization

**Localizable.strings (en):**
```
"projects.title" = "Projects";
"projects.add" = "Add Project";
"projects.status.active" = "Active";
```

**Localizable.strings (es):**
```
"projects.title" = "Proyectos";
"projects.add" = "Agregar Proyecto";
"projects.status.active" = "Activo";
```

**SwiftUI Usage:**
```swift
Text(LocalizedStringKey("projects.title"))
// Or using String extension
Text("projects.title".localized)
```

---

## 27. Third-Party Services Summary

| Service | Purpose | Status | iOS SDK |
|---------|---------|--------|---------|
| **Supabase** | Backend/Database/Auth/Storage | ✅ Active | `supabase-swift` |
| **Stripe** | Payments | ⚠️ Configured but needs price ID | `StripePaymentSheet` |
| **Google Ads** | Ad campaign management | ⚠️ OAuth only | Custom REST API |
| **Meta Ads** | Facebook/Instagram ads | ⚠️ OAuth only | `FacebookCore` |
| **n8n** | Automation webhooks | ✅ Active | HTTP requests |
| **Google Analytics** | Analytics | ❌ Not implemented | `FirebaseAnalytics` |
| **Sentry** | Error tracking | ❌ Not implemented | `Sentry` |

---

## 28. Accessibility

### 28.1 Web Accessibility (Current)

**Implemented:**
- Semantic HTML (minimal)
- Keyboard navigation (default browser behavior)
- Color contrast (Tailwind defaults)

**Missing:**
- ARIA labels
- Screen reader testing
- Focus management
- Keyboard shortcuts

### 28.2 iOS Accessibility (Recommended)

**VoiceOver Support:**
```swift
Image(systemName: "plus")
    .accessibilityLabel("Add Project")
    .accessibilityHint("Creates a new construction project")
```

**Dynamic Type:**
```swift
Text("Project Name")
    .font(.body)
    // Automatically scales with user's font size preference
```

**Color Contrast:**
- Use iOS system colors
- Support light and dark modes
- Test with accessibility inspector

**Haptic Feedback:**
```swift
let generator = UINotificationFeedbackGenerator()
generator.notificationOccurred(.success)
```

---

## 29. Widget System

### 29.1 Web Widgets (Current)

**Location:** `/widget` directory

**Purpose:** Embeddable pricing calculators for contractor websites

**Implementation:**
- Standalone HTML/JS/CSS
- Can be embedded via `<iframe>` or `<script>` tag
- Not crucial for iOS app

**Example:**
```html
<script src="https://contractorai.com/widget/deck-calculator.js"></script>
```

### 29.2 iOS Widgets (New Feature Opportunity)

**Home Screen Widgets:**
```swift
import WidgetKit

struct ProjectWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: "ProjectWidget",
            provider: ProjectProvider()
        ) { entry in
            ProjectWidgetView(entry: entry)
        }
        .configurationDisplayName("Active Projects")
        .description("View your active construction projects")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

**Widget Ideas:**
- Active project count
- Budget remaining
- Tasks due today
- Recent estimates
- Revenue this month

---

## 30. Offline Support

### 30.1 Web Offline Support (Current)

**Status:** ❌ Not implemented

**Current Behavior:**
- Requires internet connection for all operations
- No service worker
- No IndexedDB caching
- Data lost if connection drops during operation

### 30.2 iOS Offline Support (Recommended)

**Core Data for Local Storage:**
```swift
import CoreData

// Define entities matching Supabase schema
@Model
class Project {
    var id: UUID
    var name: String
    var clientName: String
    var status: String
    var syncStatus: SyncStatus // .synced, .pending, .conflict
}
```

**Sync Strategy:**
```swift
class SyncManager {
    func syncProjects() async {
        // 1. Fetch changes from Supabase
        let remoteProjects = try await supabase.from("projects").select()

        // 2. Merge with local changes
        let localProjects = try modelContext.fetch(FetchDescriptor<Project>())

        // 3. Resolve conflicts (last-write-wins or manual resolution)
        // 4. Push local changes to Supabase
        // 5. Update sync status
    }
}
```

**Benefits:**
- Work without internet
- Faster app performance
- Better user experience
- Auto-sync when online

---

## Conclusion

ContractorAI is a mature, feature-rich construction management platform with 72 components, 20+ pricing calculators, and comprehensive project/finance tracking capabilities. The web application is built on solid foundations (React, TypeScript, Supabase) that translate well to iOS development.

**Key Strengths for iOS Conversion:**
1. ✅ Clear separation of concerns (components, stores, services)
2. ✅ Type-safe TypeScript code (easy to port to Swift)
3. ✅ Well-defined data models
4. ✅ Backend-agnostic (Supabase works on iOS)
5. ✅ Comprehensive feature set ready to port

**Main Challenges:**
1. ⚠️ 20+ calculator components need UI redesign for iOS
2. ⚠️ State management paradigm shift (Zustand → SwiftUI)
3. ⚠️ OAuth flows require iOS-specific implementation
4. ⚠️ PDF generation needs PDFKit port
5. ⚠️ Chart rendering needs iOS solution

**Recommended Approach:**
- Start with MVP (auth, projects, clients, basic pricing)
- Iterate and add features incrementally
- Reuse Supabase backend as-is
- Follow iOS best practices (SwiftUI, MVVM, async/await)
- Target iOS 16+ for modern features

**Estimated Effort:** 5-8 months for full feature parity

---

**Report Generated By:** Claude (Anthropic AI)
**Analysis Depth:** Comprehensive (72 components, 8 stores, 19 pages analyzed)
**Total Lines Reviewed:** 20,000+ lines of code
**Database Tables:** 20+ tables documented

