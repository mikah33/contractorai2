# ContractorAI Complete System Architecture & Interconnections

**Last Updated:** November 4, 2025
**Project Path:** `/git/contractorai/contractorai2`
**Version:** 0.1.0

## Executive Summary

ContractorAI is a comprehensive construction management SaaS platform built with a modern React/TypeScript frontend, Supabase backend (PostgreSQL), and hybrid mobile capabilities via Capacitor. The system handles project management, financial tracking, estimate generation, pricing calculations, client management, and integrates with Stripe for subscriptions and payments.

---

## 1. System Architecture Overview

### Architecture Pattern: Client-Server with Serverless Edge Functions

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Web Browser │  │ iOS App      │  │  Embeddable  │          │
│  │  (Vite/React)│  │ (Capacitor)  │  │  Widgets     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │     API GATEWAY / LOAD BALANCER      │
          │         (Supabase Client)            │
          └──────────────────┬──────────────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
┌───▼────────┐    ┌──────────▼────────┐    ┌────────▼────────┐
│ Auth Layer │    │  Database Layer   │    │  Edge Functions │
│ (Supabase  │    │   (PostgreSQL)    │    │   (Serverless)  │
│   Auth)    │    │   + Row Level     │    │                 │
│            │    │     Security      │    │                 │
└────┬───────┘    └──────────┬────────┘    └────────┬────────┘
     │                       │                       │
     └───────────────────────┼───────────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │    EXTERNAL INTEGRATIONS LAYER      │
          │  ┌────────┐ ┌─────┐ ┌────────┐     │
          │  │ Stripe │ │ n8n │ │ Google │     │
          │  │        │ │     │ │   Ads  │     │
          │  └────────┘ └─────┘ └────────┘     │
          └─────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend Framework
- **Primary:** React 18.3.1 with TypeScript 5.5.3
- **Build Tool:** Vite 7.1.4
- **Mobile:** Capacitor 7.4.4 (iOS)
- **Router:** React Router DOM 6.22.3
- **Styling:** Tailwind CSS 3.4.1
- **Icons:** Lucide React 0.344.0

### State Management
- **Global State:** Zustand 4.5.2
- **Server State:** TanStack React Query 5.28.4
- **Contexts:** React Context API for cross-cutting concerns

### Backend & Database
- **BaaS:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Database:** PostgreSQL with Row Level Security (RLS)
- **Real-time:** Supabase Realtime subscriptions
- **Storage:** Supabase Storage (for PDFs, logos, documents)

### External Services
- **Payments:** Stripe 19.1.0 (subscriptions + Connect)
- **Automation:** n8n webhooks
- **Analytics:** Google Ads API
- **Email:** Gmail API integration
- **Notifications:** Push notifications via Capacitor

### Development Tools
- **Linting:** ESLint
- **Type Checking:** TypeScript
- **PDF Generation:** jsPDF 3.0.2 + jspdf-autotable 5.0.2
- **Internationalization:** i18next 25.5.3

---

## 3. Frontend Architecture

### Application Entry Point Flow

```
index.html
  └─> main.tsx
       ├─> React.StrictMode
       ├─> QueryClientProvider (TanStack Query)
       ├─> BrowserRouter (React Router)
       └─> App.tsx
            ├─> Auth Check (useAuthStore)
            ├─> Data Initialization (useAppInitialization)
            └─> Context Providers:
                 ├─> DataProvider
                 ├─> CalculatorTabProvider
                 ├─> PricingProvider
                 └─> ProjectProvider
```

### Component Organization

```
src/
├── components/
│   ├── ads/              - Ad analytics & management
│   ├── ai-calculator/    - AI-powered pricing assistant
│   ├── ai-crm/          - Cindy CRM AI chatbot
│   ├── ai-finance/      - Saul finance AI chatbot
│   ├── auth/            - Authentication components
│   ├── calendar/        - Calendar & event management
│   ├── calculators/     - Construction pricing calculators
│   ├── clients/         - Client management
│   ├── common/          - Shared/reusable components
│   ├── dashboard/       - Dashboard widgets
│   ├── estimates/       - Estimate generation
│   ├── finance/         - Financial tracking
│   ├── layout/          - Header, Sidebar, navigation
│   ├── pricing/         - Pricing calculator UI
│   ├── projects/        - Project management
│   ├── pwa/             - Progressive Web App features
│   ├── settings/        - User settings & preferences
│   ├── stripe/          - Stripe payment components
│   └── ui/              - Base UI components (tabs, modals, etc.)
│
├── pages/               - Route-level page components
│   ├── auth/            - Login, Signup
│   ├── Dashboard.tsx
│   ├── PricingCalculator.tsx
│   ├── EstimateGenerator.tsx
│   ├── ProjectManager.tsx
│   ├── FinanceTracker.tsx
│   ├── Calendar.tsx
│   ├── Clients.tsx
│   ├── Settings.tsx
│   ├── Subscriptions.tsx
│   └── [21 calculator configuration pages]
│
├── stores/              - Zustand state stores
│   ├── authStore.ts           (318 lines)
│   ├── financeStoreSupabase.ts (2181 lines) - Primary finance logic
│   ├── projectStore.ts        (895 lines)
│   ├── estimateStore.ts       (344 lines)
│   ├── clientsStore.ts        (274 lines)
│   ├── calendarStoreSupabase.ts (252 lines)
│   ├── employeesStore.ts      (223 lines)
│   └── adAnalyzerStore.ts     (366 lines)
│
├── contexts/            - React Context providers
│   ├── DataContext.tsx          - Profile & subscription sync
│   ├── PricingContext.tsx       - Calculator pricing state
│   ├── ProjectContext.tsx       - Active project context
│   └── CalculatorTabContext.tsx - Calculator tab navigation
│
├── services/            - API service layers
│   ├── analytics.ts
│   ├── calendarService.ts
│   ├── customCalculatorService.ts
│   ├── estimateService.ts
│   ├── estimateResponseService.ts
│   ├── googleAds.ts
│   ├── supabaseStorage.ts
│   └── notifications/   - Push notification services
│
├── lib/                 - Core utilities & configuration
│   ├── ai/              - AI chatbot configurations
│   │   ├── chatbot-config.ts    - Main AI calculator config
│   │   ├── saul-config.ts       - Finance AI config
│   │   ├── cindy-config.ts      - CRM AI config
│   │   ├── bill-config.ts       - Project manager AI config
│   │   ├── chatHistory.ts       - Chat persistence
│   │   └── function-definitions.ts - AI function calling
│   ├── supabase.ts      - Supabase client initialization
│   ├── queryClient.ts   - React Query configuration
│   └── storeQueryBridge.ts - Bridge between Zustand & React Query
│
├── hooks/               - Custom React hooks
├── types/               - TypeScript type definitions
├── utils/               - Utility functions
│   ├── pdfGenerator.ts
│   ├── notifications.ts
│   ├── pwaInstall.ts
│   └── debugClientSave.ts
│
├── locales/             - i18n translation files
├── templates/           - Email & document templates
└── data/                - Static data & configurations
```

---

## 4. Database Schema & Relationships

### Core Tables (54+ total)

#### Authentication & Users
```sql
-- Auth managed by Supabase Auth
auth.users (managed by Supabase)
  ├─> profiles (1:1)
  ├─> stripe_customers (1:1)
  └─> stripe_subscriptions (1:1 via customer_id)
```

#### User Profile & Settings
```sql
profiles
├── id (UUID, PK, FK → auth.users.id)
├── email (TEXT, UNIQUE)
├── full_name (TEXT)
├── company_name (TEXT)
├── phone (TEXT)
├── address (TEXT)
├── logo_url (TEXT)
├── stripe_customer_id (TEXT)
├── default_terms (TEXT)
├── language (TEXT)
├── contractor_notification_email (TEXT)
├── calendar_reminders (BOOLEAN)
├── marketing_emails (BOOLEAN)
├── security_alerts (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

#### Financial Management
```sql
finance_transactions
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── description (TEXT)
├── amount (DECIMAL)
├── type (TEXT: 'income' | 'expense')
├── category (TEXT)
├── date (DATE)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

finance_expenses
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── name (TEXT)
├── amount (DECIMAL)
├── category (TEXT)
├── date (DATE)
├── metadata (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

finance_payments
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── project_id (UUID, FK → projects.id)
├── amount (DECIMAL)
├── payment_method (TEXT)
├── payment_date (DATE)
├── notes (TEXT)
└── created_at (TIMESTAMPTZ)

recurring_expenses
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── name (TEXT)
├── amount (DECIMAL)
├── frequency (TEXT: 'monthly' | 'quarterly' | 'yearly')
├── category (TEXT)
├── next_payment (DATE)
├── active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

#### Project Management
```sql
projects
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── client_id (UUID, FK → clients.id)
├── name (TEXT)
├── status (TEXT: 'planning' | 'active' | 'completed' | 'on-hold')
├── start_date (DATE)
├── end_date (DATE)
├── budget (DECIMAL)
├── description (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

tasks
├── id (UUID, PK)
├── project_id (UUID, FK → projects.id)
├── user_id (UUID, FK → auth.users.id)
├── title (TEXT)
├── description (TEXT)
├── status (TEXT)
├── priority (TEXT)
├── due_date (DATE)
├── assigned_to (UUID, FK → employees.id)
└── created_at (TIMESTAMPTZ)

progress_updates
├── id (UUID, PK)
├── project_id (UUID, FK → projects.id)
├── user_id (UUID, FK → auth.users.id)
├── update_text (TEXT)
├── progress_percentage (INTEGER)
└── created_at (TIMESTAMPTZ)

project_team_members
├── id (UUID, PK)
├── project_id (UUID, FK → projects.id)
├── employee_id (UUID, FK → employees.id)
├── role (TEXT)
└── created_at (TIMESTAMPTZ)

comments
├── id (UUID, PK)
├── project_id (UUID, FK → projects.id)
├── user_id (UUID, FK → auth.users.id)
├── comment_text (TEXT)
└── created_at (TIMESTAMPTZ)
```

#### Client Management
```sql
clients
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── name (TEXT)
├── email (TEXT)
├── phone (TEXT)
├── address (TEXT)
├── city (TEXT)
├── notes (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

leads
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── name (TEXT)
├── email (TEXT)
├── phone (TEXT)
├── source (TEXT)
├── status (TEXT)
├── interested_in (TEXT)
├── notes (TEXT)
└── created_at (TIMESTAMPTZ)
```

#### Estimate & Invoice Management
```sql
estimates
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── project_id (UUID, FK → projects.id)
├── client_id (UUID)
├── client_name (TEXT)
├── client_email (TEXT)
├── estimate_number (TEXT)
├── date (DATE)
├── valid_until (DATE)
├── status (TEXT: 'draft' | 'sent' | 'approved' | 'rejected')
├── subtotal (DECIMAL)
├── tax_rate (DECIMAL)
├── tax_amount (DECIMAL)
├── total (DECIMAL)
├── notes (TEXT)
├── items (JSONB)
├── calculator_type (TEXT)
├── calculator_data (JSONB)
├── customer_name (TEXT)
├── customer_email (TEXT)
├── customer_phone (TEXT)
├── customer_address (TEXT)
├── contractor_company (TEXT)
├── contractor_email (TEXT)
├── contractor_phone (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

calculator_estimates
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── calculator_type (TEXT)
├── customer_data (JSONB)
├── calculation_data (JSONB)
├── estimate_pdf_url (TEXT)
├── status (TEXT)
└── created_at (TIMESTAMPTZ)

estimate_email_responses
├── id (UUID, PK)
├── estimate_id (UUID, FK → calculator_estimates.id)
├── customer_email (TEXT)
├── response_type (TEXT: 'approved' | 'rejected' | 'questions')
├── message (TEXT)
└── created_at (TIMESTAMPTZ)

invoices
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── client_id (UUID, FK → clients.id)
├── project_id (UUID, FK → projects.id)
├── invoice_number (TEXT)
├── date (DATE)
├── due_date (DATE)
├── status (TEXT)
├── subtotal (DECIMAL)
├── tax_amount (DECIMAL)
├── total (DECIMAL)
├── paid_amount (DECIMAL)
├── notes (TEXT)
└── created_at (TIMESTAMPTZ)

invoice_items
├── id (UUID, PK)
├── invoice_id (UUID, FK → invoices.id)
├── description (TEXT)
├── quantity (DECIMAL)
├── unit_price (DECIMAL)
├── total (DECIMAL)
└── created_at (TIMESTAMPTZ)

invoice_payments
├── id (UUID, PK)
├── invoice_id (UUID, FK → invoices.id)
├── amount (DECIMAL)
├── payment_date (DATE)
├── payment_method (TEXT)
├── notes (TEXT)
└── created_at (TIMESTAMPTZ)
```

#### Employee & Payroll
```sql
employees
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── name (TEXT)
├── email (TEXT)
├── phone (TEXT)
├── role (TEXT)
├── hourly_rate (DECIMAL)
├── hire_date (DATE)
└── created_at (TIMESTAMPTZ)
```

#### Calendar & Events
```sql
calendar_events
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── project_id (UUID, FK → projects.id)
├── title (TEXT)
├── description (TEXT)
├── start_time (TIMESTAMPTZ)
├── end_time (TIMESTAMPTZ)
├── location (TEXT)
├── all_day (BOOLEAN)
├── reminder_minutes (INTEGER)
└── created_at (TIMESTAMPTZ)
```

#### Pricing Calculator Configuration
```sql
custom_calculator_configs
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── calculator_type (TEXT)
├── config_data (JSONB)
└── created_at (TIMESTAMPTZ)

custom_materials
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── calculator_type (TEXT)
├── material_name (TEXT)
├── unit_price (DECIMAL)
├── unit (TEXT)
└── created_at (TIMESTAMPTZ)

custom_pricing
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── calculator_type (TEXT)
├── pricing_data (JSONB)
└── created_at (TIMESTAMPTZ)

calculations
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── calculator_type (TEXT)
├── input_data (JSONB)
├── result_data (JSONB)
└── created_at (TIMESTAMPTZ)

budget_items
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── project_id (UUID, FK → projects.id)
├── category (TEXT)
├── estimated_cost (DECIMAL)
├── actual_cost (DECIMAL)
└── created_at (TIMESTAMPTZ)
```

#### Stripe Integration
```sql
stripe_customers
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id, UNIQUE)
├── customer_id (TEXT, UNIQUE) -- Stripe customer ID
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

stripe_subscriptions
├── id (UUID, PK)
├── customer_id (TEXT, FK → stripe_customers.customer_id)
├── subscription_id (TEXT) -- Stripe subscription ID
├── price_id (TEXT)
├── status (TEXT: 'active' | 'canceled' | 'past_due' | etc.)
├── current_period_start (TIMESTAMPTZ)
├── current_period_end (TIMESTAMPTZ)
├── cancel_at_period_end (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

stripe_orders
├── id (UUID, PK)
├── checkout_session_id (TEXT)
├── payment_intent_id (TEXT)
├── customer_id (TEXT)
├── amount_subtotal (INTEGER)
├── amount_total (INTEGER)
├── currency (TEXT)
├── payment_status (TEXT)
├── status (TEXT)
└── created_at (TIMESTAMPTZ)
```

#### Ad Analytics
```sql
ad_accounts
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── platform (TEXT: 'google' | 'facebook' | 'meta')
├── account_id (TEXT)
├── access_token (TEXT)
├── refresh_token (TEXT)
└── created_at (TIMESTAMPTZ)

ad_campaigns
├── id (UUID, PK)
├── account_id (UUID, FK → ad_accounts.id)
├── campaign_id (TEXT)
├── campaign_name (TEXT)
├── status (TEXT)
├── budget (DECIMAL)
└── created_at (TIMESTAMPTZ)

ad_metrics
├── id (UUID, PK)
├── campaign_id (UUID, FK → ad_campaigns.id)
├── impressions (INTEGER)
├── clicks (INTEGER)
├── conversions (INTEGER)
├── cost (DECIMAL)
├── date (DATE)
└── created_at (TIMESTAMPTZ)
```

#### Widget System
```sql
widget_keys
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users.id)
├── key (TEXT, UNIQUE)
├── calculator_type (TEXT)
├── active (BOOLEAN)
└── created_at (TIMESTAMPTZ)

widget_usage_logs
├── id (UUID, PK)
├── widget_key_id (UUID, FK → widget_keys.id)
├── user_id (UUID)
├── calculator_type (TEXT)
├── ip_address (TEXT)
├── user_agent (TEXT)
└── created_at (TIMESTAMPTZ)
```

---

## 5. State Management Architecture

### Zustand Stores (Primary State Management)

```
┌─────────────────────────────────────────────────────────┐
│                    ZUSTAND STORES                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  authStore                                               │
│  ├─ user: User | null                                    │
│  ├─ profile: Profile | null                              │
│  ├─ session: Session | null                              │
│  ├─ signIn(email, password)                              │
│  ├─ signUp(email, password, metadata)                    │
│  ├─ signOut()                                            │
│  ├─ fetchProfile()                                       │
│  └─ initialize() ← Called on app load                    │
│                                                          │
│  financeStoreSupabase (2181 lines - LARGEST)             │
│  ├─ transactions: Transaction[]                          │
│  ├─ expenses: Expense[]                                  │
│  ├─ recurringExpenses: RecurringExpense[]                │
│  ├─ invoices: Invoice[]                                  │
│  ├─ payments: Payment[]                                  │
│  ├─ addTransaction()                                     │
│  ├─ updateTransaction()                                  │
│  ├─ deleteTransaction()                                  │
│  ├─ fetchAllFinanceData()                                │
│  └─ syncWithSupabase()                                   │
│                                                          │
│  projectStore (895 lines)                                │
│  ├─ projects: Project[]                                  │
│  ├─ tasks: Task[]                                        │
│  ├─ comments: Comment[]                                  │
│  ├─ progressUpdates: ProgressUpdate[]                    │
│  ├─ createProject()                                      │
│  ├─ updateProject()                                      │
│  ├─ deleteProject()                                      │
│  └─ fetchProjects()                                      │
│                                                          │
│  estimateStore (344 lines)                               │
│  ├─ estimates: Estimate[]                                │
│  ├─ createEstimate()                                     │
│  ├─ updateEstimate()                                     │
│  ├─ sendEstimate()                                       │
│  └─ generatePDF()                                        │
│                                                          │
│  clientsStore (274 lines)                                │
│  ├─ clients: Client[]                                    │
│  ├─ addClient()                                          │
│  ├─ updateClient()                                       │
│  ├─ deleteClient()                                       │
│  └─ fetchClients()                                       │
│                                                          │
│  calendarStoreSupabase (252 lines)                       │
│  ├─ events: CalendarEvent[]                              │
│  ├─ addEvent()                                           │
│  ├─ updateEvent()                                        │
│  ├─ deleteEvent()                                        │
│  └─ fetchEvents()                                        │
│                                                          │
│  employeesStore (223 lines)                              │
│  ├─ employees: Employee[]                                │
│  ├─ addEmployee()                                        │
│  ├─ updateEmployee()                                     │
│  └─ fetchEmployees()                                     │
│                                                          │
│  adAnalyzerStore (366 lines)                             │
│  ├─ adAccounts: AdAccount[]                              │
│  ├─ campaigns: Campaign[]                                │
│  ├─ metrics: Metrics[]                                   │
│  ├─ connectAdAccount()                                   │
│  └─ fetchMetrics()                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### React Query (TanStack Query) for Server State

```javascript
// Used for:
// - Caching API responses
// - Background refetching
// - Optimistic updates
// - Error retry logic
// - Request deduplication

queryClient configuration:
├─ defaultOptions:
│   ├─ queries:
│   │   ├─ staleTime: 1000 * 60 * 5 (5 minutes)
│   │   ├─ cacheTime: 1000 * 60 * 10 (10 minutes)
│   │   └─ refetchOnWindowFocus: false
│   └─ mutations:
│       └─ retry: 1
```

### React Context Providers

```
DataProvider (Global)
├─ profile: Profile | null
├─ subscription: Subscription | null
├─ refreshProfile()
├─ refreshSubscription()
└─ refreshAll()

PricingProvider
├─ selectedCalculator: string
├─ calculatorResults: Record<string, any>
└─ updateCalculatorResult()

ProjectProvider
├─ activeProject: Project | null
└─ setActiveProject()

CalculatorTabProvider
├─ activeTab: string
└─ setActiveTab()
```

---

## 6. Authentication & Authorization Flow

### Complete Authentication Journey

```
1. USER VISITS APP
   ↓
2. main.tsx initializes
   ↓
3. authStore.initialize() is called automatically
   ├─ Sets up auth state listener (supabase.auth.onAuthStateChange)
   ├─ Attempts to get existing session (supabase.auth.getSession())
   └─ Sets initialized = true
   ↓
4. App.tsx checks auth state
   ├─ IF !initialized → Show loading spinner
   ├─ IF !user → Redirect to /auth/login
   └─ IF user → Show authenticated app
   ↓
5. LOGIN FLOW (authStore.signIn)
   ├─ supabase.auth.signInWithPassword(email, password)
   ├─ On success:
   │   ├─ Set user & session in authStore
   │   ├─ Fetch user profile from profiles table
   │   └─ Trigger DataProvider refresh
   ├─ Auth state listener fires → SIGNED_IN event
   └─ Redirect to dashboard
   ↓
6. SIGNUP FLOW (authStore.signUp)
   ├─ supabase.auth.signUp(email, password, metadata)
   ├─ Database trigger creates profile row automatically
   │   └─ handle_new_user() function in DB
   ├─ Send registration webhook to n8n
   │   └─ URL: contractorai.app.n8n.cloud/webhook/...
   ├─ Set user & session in authStore
   └─ User is logged in immediately
   ↓
7. SESSION PERSISTENCE
   ├─ Stored in localStorage: 'contractorai-auth'
   ├─ Auto-refresh via supabase client
   └─ PKCE flow for security
   ↓
8. DATA INITIALIZATION (useAppInitialization hook)
   ├─ DataProvider loads:
   │   ├─ User profile from profiles table
   │   └─ Active subscription from stripe_subscriptions
   └─ All Zustand stores initialize in parallel
   ↓
9. ROW LEVEL SECURITY (RLS)
   ├─ Every database query includes: auth.uid() = user_id
   ├─ Users can only see/modify their own data
   └─ Policies enforced at PostgreSQL level
```

### RLS Policy Pattern

```sql
-- Example for any user-owned table
CREATE POLICY "Users can view own records"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```

### Authorization Levels

1. **Unauthenticated:** Can only access login/signup pages
2. **Authenticated User:** Full access to their own data via RLS
3. **Service Role:** Edge functions use service role for admin operations

---

## 7. API Architecture & Edge Functions

### Supabase Edge Functions (Deno Runtime)

All edge functions are serverless TypeScript functions deployed on Supabase Edge Network.

```
supabase/functions/
├── stripe-webhook/
│   └── index.ts
│       ├─ Handles all Stripe events
│       ├─ Syncs subscriptions to database
│       ├─ Auto-links customers by email
│       └─ Events:
│           ├─ checkout.session.completed
│           ├─ customer.subscription.updated
│           ├─ customer.subscription.deleted
│           └─ payment_intent.succeeded
│
├── stripe-checkout/
│   └── index.ts
│       └─ Creates Stripe checkout sessions
│
├── create-billing-portal-session/
│   └── index.ts
│       └─ Creates Stripe billing portal session
│
├── get-subscription-details/
│   └── index.ts
│       └─ Fetches current subscription info
│
├── stripe-connect-onboard/
│   └── index.ts
│       └─ Onboards contractors to Stripe Connect
│
├── send-estimate-email/
│   └── index.ts
│       ├─ Sends estimate PDFs via email
│       └─ Integrates with email provider
│
├── estimate-response/
│   └── index.ts
│       ├─ Handles customer responses to estimates
│       └─ Records approve/reject actions
│
├── widget-key-generate/
│   └── index.ts
│       └─ Generates API keys for embeddable widgets
│
├── ai-calculator-chat/
│   └── index.ts
│       ├─ Handles AI chatbot conversations
│       └─ Integrates with OpenAI API
│
├── saul-finance-chat/
│   └── index.ts
│       └─ AI finance assistant chatbot
│
├── google-ads-oauth/
│   └── index.ts
│       └─ OAuth flow for Google Ads integration
│
├── meta-ads-oauth/
│   └── index.ts
│       └─ OAuth flow for Meta/Facebook Ads
│
├── send-gmail/
│   └── index.ts
│       └─ Sends emails via Gmail API
│
├── n8n-receipt-webhook/
│   └── index.ts
│       └─ Receives receipt data from n8n workflows
│
└── [Other utility functions]
```

### API Call Patterns

```javascript
// Direct Supabase Client Calls (from frontend)
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId);

// Edge Function Invocation
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { key: 'value' }
});

// Stripe API (server-side only via edge functions)
const session = await stripe.checkout.sessions.create({...});
```

---

## 8. Data Flow Diagrams

### User Action → Database → UI Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   EXAMPLE: Create Project                    │
└─────────────────────────────────────────────────────────────┘

1. USER ACTION
   ↓
   User clicks "Create Project" button
   └─> ProjectManager.tsx component

2. FORM SUBMISSION
   ↓
   Form data collected:
   ├─ name: "New Construction Project"
   ├─ client: "John Doe"
   ├─ budget: 50000
   └─ start_date: "2025-11-05"

3. ZUSTAND STORE CALL
   ↓
   projectStore.createProject(projectData)
   ├─ Optimistic update: Add to local state
   └─ Call Supabase API

4. DATABASE INSERT
   ↓
   supabase
     .from('projects')
     .insert({
       user_id: auth.uid(),
       ...projectData
     })
   ↓
   PostgreSQL executes:
   ├─ INSERT INTO projects (...)
   ├─ RLS check: auth.uid() = user_id ✓
   └─ Returns new row with ID

5. RESPONSE HANDLING
   ↓
   IF success:
   ├─ Update Zustand store with server data
   ├─ React Query invalidates cache
   └─ UI re-renders with new project
   ↓
   IF error:
   ├─ Rollback optimistic update
   ├─ Show error toast notification
   └─ User can retry

6. REAL-TIME SYNC (if configured)
   ↓
   Supabase Realtime subscription pushes update
   └─ Other connected clients receive notification
```

### Estimate Generation & Email Flow

```
1. User creates estimate in EstimateGenerator.tsx
   ↓
2. estimateStore.createEstimate(estimateData)
   ├─ Save to estimates table
   └─ Generate PDF using jsPDF
   ↓
3. PDF upload to Supabase Storage
   ├─ Bucket: 'estimate-pdfs'
   └─ Path: '{userId}/{estimateId}.pdf'
   ↓
4. supabase.functions.invoke('send-estimate-email', {
     estimateId,
     customerEmail,
     pdfUrl
   })
   ↓
5. Edge Function sends email
   ├─ Fetch estimate data from DB
   ├─ Attach PDF from storage
   ├─ Send via email provider
   └─ Log email sent status
   ↓
6. Update estimate status to 'sent'
   ↓
7. Customer receives email with PDF
   ├─ Clicks "Approve" or "Reject" link
   └─ Redirects to estimate-response edge function
   ↓
8. estimate-response function
   ├─ Records response in estimate_email_responses
   ├─ Updates estimate status
   └─ Sends notification to contractor
   ↓
9. Contractor sees updated estimate in UI
```

### Stripe Subscription Flow

```
1. User clicks "Subscribe" on Subscriptions.tsx
   ↓
2. supabase.functions.invoke('stripe-checkout', {
     priceId: 'price_xxx'
   })
   ↓
3. Edge function creates Stripe checkout session
   ├─ stripe.checkout.sessions.create({
   │    customer: stripeCustomerId,
   │    line_items: [{ price: priceId }],
   │    mode: 'subscription'
   │  })
   └─ Returns session URL
   ↓
4. User redirected to Stripe checkout page
   ├─ Enters payment information
   └─ Completes purchase
   ↓
5. Stripe sends webhook to stripe-webhook edge function
   ├─ Event: checkout.session.completed
   └─ Event: customer.subscription.created
   ↓
6. stripe-webhook function processes events
   ├─ Verifies webhook signature
   ├─ Extracts customer & subscription data
   ├─ Updates stripe_subscriptions table:
   │   └─ INSERT/UPDATE subscription record
   └─ Links customer_id to user_id if not linked
   ↓
7. DataProvider refreshes subscription data
   ├─ Queries stripe_subscriptions table
   └─ Updates UI with active subscription status
   ↓
8. User sees "Pro" features unlocked in UI
```

---

## 9. External Integration Touchpoints

### Stripe Integration

```
Stripe Integration Points:
├─ Checkout Sessions
│   ├─ Create session: stripe-checkout edge function
│   ├─ Success redirect: /subscriptions?success=true
│   └─ Cancel redirect: /subscriptions?canceled=true
│
├─ Billing Portal
│   ├─ Create portal session: create-billing-portal-session
│   └─ Return URL: /subscriptions
│
├─ Webhooks (stripe-webhook edge function)
│   ├─ checkout.session.completed
│   ├─ customer.subscription.created
│   ├─ customer.subscription.updated
│   ├─ customer.subscription.deleted
│   ├─ invoice.payment_succeeded
│   └─ payment_intent.succeeded
│
├─ Stripe Connect (for contractors accepting payments)
│   ├─ Onboarding: stripe-connect-onboard
│   └─ Connected account management
│
└─ Database Tables
    ├─ stripe_customers (links users to Stripe customers)
    ├─ stripe_subscriptions (subscription state)
    └─ stripe_orders (one-time payments)
```

### n8n Workflow Automation

```
n8n Integration Points:
├─ User Registration Webhook
│   ├─ Triggered: authStore.signUp()
│   ├─ URL: contractorai.app.n8n.cloud/webhook/170d14a9...
│   └─ Payload: { email, fullName, companyName, userId, ... }
│
├─ Receipt Processing Webhook
│   ├─ Edge function: n8n-receipt-webhook
│   └─ Processes receipt images for expense tracking
│
└─ Potential use cases:
    ├─ Email automation
    ├─ CRM integrations
    ├─ SMS notifications
    └─ Third-party syncing
```

### Google Services

```
Google Integration:
├─ Google Ads
│   ├─ OAuth: google-ads-oauth edge function
│   ├─ Service: googleAds.ts service layer
│   └─ Tables: ad_accounts, ad_campaigns, ad_metrics
│
├─ Gmail
│   ├─ OAuth: /gmail-oauth-callback page
│   ├─ Send email: send-gmail edge function
│   └─ Profile field: gmail access token storage
│
└─ Environment Variables:
    ├─ VITE_GOOGLE_CLIENT_ID
    └─ VITE_GMAIL_REDIRECT_URI
```

### Meta/Facebook Ads

```
Meta Integration:
├─ OAuth: meta-ads-oauth edge function
├─ Callback: /meta-oauth-callback page
└─ Tables: ad_accounts (platform = 'meta')
```

---

## 10. Component Communication Patterns

### Parent-Child Communication

```jsx
// Prop drilling for simple cases
<ParentComponent>
  <ChildComponent
    data={parentData}
    onUpdate={handleUpdate}
  />
</ParentComponent>
```

### Global State Communication

```jsx
// Zustand store access
function AnyComponent() {
  const { projects, createProject } = useProjectStore();
  // Component can read/update global state
}
```

### Context-Based Communication

```jsx
// Cross-cutting concerns via Context
function NestedComponent() {
  const { profile, subscription } = useData();
  // Access user profile & subscription anywhere in tree
}
```

### Event-Driven Communication

```jsx
// Supabase Realtime for cross-client sync
useEffect(() => {
  const subscription = supabase
    .channel('projects')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      (payload) => {
        // Real-time update handler
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

---

## 11. User Journey Maps with Database Touchpoints

### Journey 1: New User Signup to First Project

```
Step 1: SIGNUP
├─ User fills signup form (SignupPage.tsx)
├─ authStore.signUp(email, password, metadata)
├─ Database:
│   ├─ INSERT into auth.users (Supabase Auth)
│   ├─ Trigger: handle_new_user() creates profiles row
│   └─ Webhook: n8n receives registration data
└─ Result: User logged in

Step 2: PROFILE SETUP
├─ User navigated to Settings.tsx
├─ User uploads company logo
├─ Database:
│   ├─ Upload to Supabase Storage: 'logos' bucket
│   ├─ UPDATE profiles SET logo_url = '...'
│   └─ DataProvider.refreshProfile() updates UI
└─ Result: Profile complete

Step 3: SUBSCRIPTION
├─ User clicks "Upgrade to Pro" (Subscriptions.tsx)
├─ stripe-checkout creates session
├─ User completes payment on Stripe
├─ Database:
│   ├─ Webhook creates stripe_customers row
│   ├─ INSERT into stripe_subscriptions
│   └─ DataProvider.refreshSubscription() updates UI
└─ Result: Pro features unlocked

Step 4: CREATE FIRST PROJECT
├─ User navigates to ProjectManager.tsx
├─ User clicks "New Project"
├─ Fills form: name, client, budget, dates
├─ projectStore.createProject(data)
├─ Database:
│   ├─ INSERT into projects (user_id, name, client, ...)
│   └─ RLS validates user ownership
└─ Result: Project created

Step 5: ADD CLIENT
├─ User adds client in Clients.tsx
├─ clientsStore.addClient(clientData)
├─ Database:
│   └─ INSERT into clients (user_id, name, email, phone, ...)
└─ Result: Client saved

Step 6: LINK CLIENT TO PROJECT
├─ User edits project, selects client
├─ projectStore.updateProject(id, { client_id })
├─ Database:
│   └─ UPDATE projects SET client_id = '...' WHERE id = '...'
└─ Result: Project-client relationship established

Step 7: CREATE ESTIMATE
├─ User navigates to EstimateGenerator.tsx
├─ Selects project & client
├─ Adds line items
├─ estimateStore.createEstimate(estimateData)
├─ Database:
│   ├─ INSERT into estimates (user_id, project_id, client_id, items, ...)
│   └─ Generate PDF with jsPDF
│   └─ Upload PDF to Supabase Storage
└─ Result: Estimate created

Step 8: SEND ESTIMATE
├─ User clicks "Send to Client"
├─ supabase.functions.invoke('send-estimate-email')
├─ Database:
│   ├─ UPDATE estimates SET status = 'sent'
│   └─ Email sent via edge function
└─ Result: Client receives estimate

Step 9: CLIENT APPROVES
├─ Client clicks "Approve" in email
├─ estimate-response edge function
├─ Database:
│   ├─ INSERT into estimate_email_responses
│   └─ UPDATE estimates SET status = 'approved'
└─ Result: Contractor notified

Step 10: TRACK FINANCES
├─ User records project expenses (FinanceTracker.tsx)
├─ financeStoreSupabase.addTransaction(expenseData)
├─ Database:
│   └─ INSERT into finance_transactions (user_id, project_id, amount, ...)
└─ Result: Expense tracked

DATABASE TABLES TOUCHED:
├─ auth.users
├─ profiles
├─ stripe_customers
├─ stripe_subscriptions
├─ projects
├─ clients
├─ estimates
├─ estimate_email_responses
└─ finance_transactions
```

---

## 12. Mobile Architecture (Capacitor)

### iOS App Integration

```
Capacitor Bridge:
├─ Web App (dist/) bundled into iOS app
├─ Native Plugins:
│   ├─ @capacitor/push-notifications
│   ├─ @capacitor/local-notifications
│   └─ @capacitor/core
│
├─ Build Configuration (capacitor.config.ts):
│   ├─ appId: 'com.elevatedsystems.contractorai'
│   ├─ appName: 'ContractorAI'
│   └─ webDir: 'dist'
│
└─ iOS Project:
    └─ ios/App/ (generated Xcode project)
```

### Build & Deploy Process

```bash
# Web build
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Native build & deploy via Xcode
```

---

## 13. Performance Optimization Strategies

### Frontend Optimizations

```
1. Code Splitting
   ├─ React.lazy() for route-based splitting
   └─ Dynamic imports for heavy components

2. Caching Strategies
   ├─ React Query for API response caching
   ├─ LocalStorage for auth tokens
   └─ Service Worker for PWA caching

3. Bundle Optimization
   ├─ Vite production build optimization
   ├─ Tree shaking unused code
   └─ Minification & compression

4. Image Optimization
   └─ Lazy loading images with Intersection Observer
```

### Backend Optimizations

```
1. Database Indexing
   ├─ idx_finance_transactions_user_id
   ├─ idx_finance_transactions_date
   ├─ idx_projects_user_id
   └─ idx_estimates_user_id

2. Query Optimization
   ├─ Select only needed columns
   ├─ Use .single() for 1-row queries
   └─ Batch operations where possible

3. Edge Function Caching
   └─ Cloudflare edge caching for static responses

4. Connection Pooling
   └─ Supabase manages PostgreSQL connection pools
```

---

## 14. Security Architecture

### Security Layers

```
1. Authentication Layer
   ├─ Supabase Auth (JWT-based)
   ├─ PKCE flow for enhanced security
   ├─ Session persistence in localStorage (encrypted)
   └─ Auto token refresh

2. Authorization Layer (RLS)
   ├─ All tables have RLS enabled
   ├─ Policies enforce auth.uid() = user_id
   ├─ Service role bypasses RLS (edge functions only)
   └─ No direct database access from client

3. API Security
   ├─ Anon key for client (limited permissions)
   ├─ Service role key for edge functions (full permissions)
   ├─ Webhook signature verification (Stripe)
   └─ CORS configuration

4. Data Protection
   ├─ Environment variables for secrets
   ├─ No hardcoded credentials
   ├─ Sensitive data encrypted at rest (Supabase)
   └─ HTTPS everywhere

5. Input Validation
   ├─ TypeScript type checking
   ├─ Form validation (React Hook Form)
   └─ Database constraints
```

---

## 15. Deployment Architecture

### Production Environment

```
Frontend Deployment:
├─ Platform: Netlify / Vercel / Supabase Hosting
├─ Build Command: npm run build
├─ Output Directory: dist/
├─ Environment Variables:
│   ├─ VITE_SUPABASE_URL
│   ├─ VITE_SUPABASE_ANON_KEY
│   ├─ VITE_STRIPE_PUBLISHABLE_KEY
│   ├─ VITE_GOOGLE_CLIENT_ID
│   └─ VITE_GMAIL_REDIRECT_URI
└─ Domain: contractorai.tools

Backend/Database:
├─ Supabase Cloud (managed PostgreSQL)
├─ Auto-scaling
├─ Automated backups
└─ Global CDN for edge functions

Mobile App:
├─ App Store (iOS)
├─ Build via Xcode Cloud or local
└─ OTA updates via Capacitor Live Updates (optional)
```

### CI/CD Pipeline

```
Recommended Pipeline:
1. Git push to main
   ↓
2. Run tests (npm run test)
   ↓
3. Run type check (npm run typecheck)
   ↓
4. Run build (npm run build)
   ↓
5. Deploy to staging
   ↓
6. Automated smoke tests
   ↓
7. Manual approval
   ↓
8. Deploy to production
   ↓
9. Run Supabase migrations (if any)
   ↓
10. Deploy edge functions (if changed)
```

---

## 16. Key System Interconnections Summary

### Critical Data Flows

```
1. USER AUTHENTICATION
   auth.users → profiles → stripe_customers → stripe_subscriptions

2. PROJECT LIFECYCLE
   clients → projects → estimates → invoices → payments

3. FINANCIAL TRACKING
   projects → finance_transactions + finance_expenses + recurring_expenses

4. ESTIMATE WORKFLOW
   estimates → calculator_estimates → estimate_email_responses

5. TEAM COLLABORATION
   projects → tasks → project_team_members → employees

6. SUBSCRIPTION BILLING
   stripe webhooks → stripe_subscriptions → DataProvider → UI

7. WIDGET SYSTEM
   widget_keys → widget_usage_logs → calculations
```

### Integration Points

```
STRIPE
├─ Manages subscriptions
├─ Processes payments
├─ Webhooks sync to database
└─ Stripe Connect for contractor payouts

N8N
├─ User registration notifications
├─ Receipt processing
├─ Email automation
└─ Third-party integrations

GOOGLE
├─ Gmail for sending emails
├─ Google Ads for campaign analytics
└─ OAuth for authentication

SUPABASE
├─ Authentication
├─ Database (PostgreSQL)
├─ Storage (files, PDFs, images)
├─ Edge Functions (serverless)
└─ Realtime subscriptions
```

---

## 17. Memory Storage for AI Agents

### Key Architecture Facts for AI Context

```json
{
  "project": "ContractorAI",
  "type": "SaaS Construction Management Platform",
  "frontend": {
    "framework": "React 18 + TypeScript",
    "buildTool": "Vite 7.1.4",
    "mobile": "Capacitor 7.4.4 (iOS)",
    "stateManagement": ["Zustand", "React Query", "React Context"],
    "routing": "React Router v6"
  },
  "backend": {
    "platform": "Supabase",
    "database": "PostgreSQL",
    "auth": "Supabase Auth (JWT)",
    "storage": "Supabase Storage",
    "serverless": "Supabase Edge Functions (Deno)"
  },
  "primaryStores": {
    "financeStoreSupabase": "2181 lines - handles all financial data",
    "projectStore": "895 lines - manages projects, tasks, comments",
    "authStore": "318 lines - authentication & user session",
    "estimateStore": "344 lines - estimate generation & PDFs",
    "clientsStore": "274 lines - client management"
  },
  "databaseTables": 54,
  "mainTables": [
    "profiles", "finance_transactions", "finance_expenses",
    "projects", "tasks", "clients", "estimates",
    "invoices", "employees", "calendar_events",
    "stripe_customers", "stripe_subscriptions"
  ],
  "edgeFunctions": 20,
  "criticalIntegrations": ["Stripe", "n8n", "Google Ads", "Gmail"],
  "security": "Row Level Security (RLS) on all tables",
  "deploymentTarget": "Web + iOS App"
}
```

---

## 18. Architecture Decision Records (ADRs)

### ADR-001: Chose Zustand over Redux
- **Reason:** Simpler API, less boilerplate, better TypeScript support
- **Trade-off:** Less ecosystem tooling than Redux
- **Impact:** Faster development, easier onboarding

### ADR-002: Supabase over Custom Backend
- **Reason:** Built-in auth, RLS, realtime, edge functions
- **Trade-off:** Vendor lock-in, limited customization
- **Impact:** Faster MVP, reduced infrastructure management

### ADR-003: Capacitor for Mobile
- **Reason:** Reuse web codebase, access native APIs
- **Trade-off:** Performance vs native Swift
- **Impact:** Single codebase for web + iOS

### ADR-004: Edge Functions for Webhooks
- **Reason:** Serverless, auto-scaling, co-located with DB
- **Trade-off:** Cold start latency
- **Impact:** Simplified deployment, cost-effective scaling

### ADR-005: React Query for Server State
- **Reason:** Automatic caching, background refetch, optimistic updates
- **Trade-off:** Learning curve
- **Impact:** Better UX, reduced API calls

---

## 19. Future Architecture Considerations

### Potential Scalability Improvements

```
1. Database Sharding
   - Partition by user_id for horizontal scaling

2. Caching Layer
   - Redis for frequently accessed data

3. CDN for Static Assets
   - CloudFlare for global distribution

4. Background Job Queue
   - For long-running tasks (PDF generation, bulk operations)

5. Microservices Extraction
   - Separate billing service if complexity grows

6. GraphQL API
   - More efficient data fetching for complex queries
```

---

## Conclusion

ContractorAI is a well-architected, modern SaaS platform leveraging best practices:

- **Frontend:** React/TypeScript with Zustand for state, Vite for builds
- **Backend:** Supabase for BaaS (auth, DB, storage, serverless)
- **Security:** Row Level Security ensures data isolation
- **Payments:** Stripe for subscriptions & Connect for payouts
- **Mobile:** Capacitor for iOS app with shared codebase
- **Integrations:** n8n, Google Ads, Gmail for extended functionality

The system is designed for rapid iteration, secure multi-tenancy, and scalable growth.

---

**Document Maintained By:** System Architecture Mapper AI
**For Questions:** Review interconnections.json for programmatic access
