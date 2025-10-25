# Saul AI Finance Manager - Implementation Plan

## 🎯 Overview
Saul is the AI Finance Tracker for ContractorAI, designed to give contractors full control over their financial operations through natural conversation.

**Swarm Planning:** Coordinated by Hivemind (swarm-1759180906620)
**Agents:** FinanceAnalyst, SaulCoordinator, PromptOptimizer
**Date:** 2025-10-24

---

## 📊 Finance Tab Structure

### Current Tabs (8 total):
1. **Dashboard** - Financial overview, charts, metrics
2. **Revenue** - Income tracking, revenue analysis
3. **Expenses** - Receipt capture, expense management
4. **Payments** - Payment tracking, client payments
5. **Invoices** - Invoice management
6. **Recurring** - Recurring expenses
7. **Budget** - Budget tracking and planning
8. **Reports** - Financial report generation

---

## 🤖 Saul's Capabilities Matrix

### ✅ What Saul CAN Do:

#### Dashboard Tab
- Analyze financial trends and provide insights
- Explain charts and metrics
- Suggest actions based on data
- Forecast cash flow

#### Revenue Tab
- Add new revenue entries
- Categorize income sources
- Track revenue by project
- Provide revenue analysis

#### Expenses Tab
- Add new expenses (manual entry)
- Categorize expenses
- Link expenses to projects
- Suggest expense optimizations
- Note: Cannot process receipt images (that's automated via n8n webhook)

#### Payments Tab
- Add payment records
- Track payment status
- Link payments to invoices/projects
- Send payment reminders (via notification)

#### Invoices Tab
- Create new invoices
- Update invoice status
- Send invoice reminders
- Generate invoice from estimate

#### Recurring Tab
- Add recurring expenses
- Enable/disable recurring items
- Suggest recurring expense reviews

#### Budget Tab
- Add budget items
- Update budget allocations
- Alert on budget overruns
- Suggest budget adjustments

#### Reports Tab
- Generate financial reports
- Export data (CSV, PDF)
- Custom date range reports
- Tax preparation summaries

### ❌ What Saul CANNOT Do:
- Modify application code
- Change database schema
- Process receipt images (handled by n8n)
- Delete user data without confirmation
- Modify security/RLS policies
- Change subscription/billing settings

---

## 🎨 Design Specifications

### Visual Theme
- **Primary Color:** Green (`from-green-500 to-green-600`)
- **Icon:** Saul logo (green-themed)
- **Personality:** Professional, analytical, finance-focused
- **Tone:** Confident but not pushy, helpful with money matters

### UI Components
Similar to Hank but finance-themed:
- Floating action button (bottom-right, green)
- Full-page chat interface
- Three-panel layout: Chat History | Chat | Financial Summary
- Mobile-optimized with collapsible panels

---

## 🏗️ Technical Architecture

### 1. Saul Configuration (`/src/lib/ai/saul-config.ts`)
```typescript
export const SAUL_SYSTEM_PROMPT = `You are Saul, a professional AI finance manager for ContractorAI...`;
export const SAUL_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.3, // Lower for financial accuracy
  maxTokens: 2000,
  provider: 'openai'
};
```

### 2. Edge Function (`/supabase/functions/saul-finance-chat/index.ts`)
- Similar structure to `ai-calculator-chat`
- Function calling for finance operations
- Integration with finance store
- Memory/context management

### 3. Function Schema
```typescript
const SAUL_FUNCTIONS = [
  // Expense operations
  { name: 'add_expense', params: { amount, category, description, project_id, date } },
  { name: 'list_expenses', params: { date_range, category, project_id } },

  // Revenue operations
  { name: 'add_revenue', params: { amount, source, project_id, date } },
  { name: 'track_revenue', params: { date_range, project_id } },

  // Payment operations
  { name: 'add_payment', params: { amount, client_id, invoice_id, date, method } },
  { name: 'track_payments', params: { status, date_range } },

  // Invoice operations
  { name: 'create_invoice', params: { client_id, project_id, items, due_date } },
  { name: 'update_invoice_status', params: { invoice_id, status } },

  // Budget operations
  { name: 'add_budget_item', params: { category, amount, period } },
  { name: 'check_budget_status', params: { category } },

  // Recurring operations
  { name: 'add_recurring_expense', params: { amount, category, frequency, start_date } },
  { name: 'toggle_recurring_expense', params: { expense_id, active } },

  // Analytics
  { name: 'generate_report', params: { report_type, date_range, format } },
  { name: 'analyze_cash_flow', params: { months } },
  { name: 'predict_expenses', params: { category, months } }
];
```

### 4. Database Schema

#### Chat Sessions Table
```sql
CREATE TABLE saul_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL,
  title text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  financial_context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### Financial Memory Table
```sql
CREATE TABLE saul_financial_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_type text NOT NULL, -- 'preference', 'insight', 'reminder'
  key text NOT NULL,
  value jsonb NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 🔧 Implementation Steps

### Phase 1: Configuration & Setup
1. ✅ Create Hivemind swarm for planning
2. ✅ Document Finance tab structure
3. ⏳ Create Saul configuration file
4. ⏳ Create Saul system prompt

### Phase 2: Backend
5. Create Saul Edge Function
6. Implement function calling handlers
7. Set up database tables (chat sessions, memory)
8. Configure RLS policies

### Phase 3: Frontend
9. Create SaulChatbot component (based on AIChatbot)
10. Create SaulFinancePage (similar to AICalculator)
11. Create chat history manager
12. Implement financial summary panel

### Phase 4: Integration
13. Update AITeamHub to enable Saul
14. Add routing for /saul-finance
15. Add floating Saul button to Finance pages

### Phase 5: Testing & Deployment
16. Test all finance operations
17. Test mobile responsiveness
18. Deploy Edge Function
19. Deploy frontend changes

---

## 🚀 Next Steps

1. **Create Configuration Files**
   - `src/lib/ai/saul-config.ts`
   - System prompt with finance personality

2. **Create Edge Function**
   - `supabase/functions/saul-finance-chat/index.ts`
   - Function calling for finance operations

3. **Create UI Components**
   - `src/components/ai-finance/SaulChatbot.tsx`
   - `src/pages/SaulFinance.tsx`

4. **Database Migration**
   - Chat sessions table
   - Financial memory table

5. **Enable in AITeamHub**
   - Update Saul's `available` status
   - Add route `/saul-finance`

---

## 📝 Success Criteria

- [ ] Saul can add expenses, revenue, payments
- [ ] Saul can create and manage invoices
- [ ] Saul can generate financial reports
- [ ] Saul remembers user preferences and financial context
- [ ] Mobile-optimized interface
- [ ] Secure with proper RLS policies
- [ ] Natural conversation flow
- [ ] Integration with existing finance store

---

## 🎯 Future Enhancements

1. **AI-Powered Insights**
   - Anomaly detection in expenses
   - Cash flow predictions
   - Budget optimization suggestions
   - Tax planning recommendations

2. **Advanced Features**
   - Automated expense categorization
   - Invoice payment predictions
   - Financial health scoring
   - Integration with accounting software

3. **Notifications**
   - Payment reminders
   - Budget alerts
   - Cash flow warnings
   - Bill due date notifications

---

## 📚 References

- Hank AI implementation: `src/pages/AICalculator.tsx`
- Finance Store: `src/stores/financeStoreSupabase.ts`
- Finance Tracker: `src/pages/FinanceTracker.tsx`
- Edge Functions: `supabase/functions/ai-calculator-chat/`
