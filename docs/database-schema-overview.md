# ContractorAI Database Schema Overview

**Last Updated:** October 17, 2025

## Database Tables

### Core Business Tables

#### 1. **projects**
- **Purpose:** Store construction project information
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `name` (TEXT) - Project name
  - `client_name` (TEXT) - Client associated with project
  - `status` (TEXT) - Project status (planning, active, completed, etc.)
  - `start_date` (TIMESTAMPTZ) - Project start date
  - `end_date` (TIMESTAMPTZ) - Project end date
  - `budget` (DECIMAL) - Project budget
  - `spent` (DECIMAL) - Amount spent so far
  - `progress` (INTEGER) - Completion percentage (0-100)
  - `priority` (TEXT) - Priority level (low, medium, high)
  - `user_id` (UUID) - Owner/creator of the project
  - `created_at` (TIMESTAMPTZ) - Record creation timestamp
  - `updated_at` (TIMESTAMPTZ) - Last update timestamp

#### 2. **clients**
- **Purpose:** Store client contact information
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `name` (TEXT) - Client name
  - `email` (TEXT) - Client email
  - `phone` (TEXT) - Client phone number
  - `company` (TEXT) - Company name (optional)
  - `status` (TEXT) - Client status (active, inactive, etc.)
  - `user_id` (UUID) - Associated user/contractor
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)

#### 3. **estimates**
- **Purpose:** Store project estimates and quotes
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `title` (TEXT) - Estimate title
  - `client_name` (TEXT) - Client for the estimate
  - `project_name` (TEXT) - Associated project (optional)
  - `status` (TEXT) - Status (draft, sent, approved, rejected)
  - `total_amount` (DECIMAL) - Total estimate amount
  - `items` (JSONB) - Line items in the estimate
  - `notes` (TEXT) - Additional notes
  - `expires_at` (TIMESTAMPTZ) - Expiration date
  - `user_id` (UUID) - Creator
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)

### Project Management Tables

#### 4. **tasks**
- **Purpose:** Track project tasks and to-dos
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `project_id` (UUID) - Foreign key to projects
  - `title` (TEXT) - Task title
  - `description` (TEXT) - Task description
  - `status` (TEXT) - Status (todo, in-progress, completed)
  - `assignee` (TEXT) - Person assigned
  - `due_date` (TIMESTAMPTZ) - Due date
  - `priority` (TEXT) - Priority (low, medium, high)
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)

#### 5. **calendar_events**
- **Purpose:** Store calendar events, milestones, and deadlines
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `title` (TEXT) - Event title
  - `description` (TEXT) - Event description
  - `start_date` (TIMESTAMPTZ) - Event start date/time
  - `end_date` (TIMESTAMPTZ) - Event end date/time
  - `event_type` (TEXT) - Type (task, meeting, milestone, delivery, inspection, etc.)
  - `status` (TEXT) - Status (pending, completed, cancelled, in_progress, delayed)
  - `location` (TEXT) - **[TO BE ADDED]** Event location
  - `weather_sensitive` (BOOLEAN) - Flag for weather-dependent events
  - `auto_generated` (BOOLEAN) - Auto-generated from projects/estimates
  - `project_id` (UUID) - Associated project
  - `estimate_id` (UUID) - Associated estimate
  - `task_id` (UUID) - Associated task
  - `user_id` (UUID) - Owner
  - `created_at` (TIMESTAMPTZ)

#### 6. **comments**
- **Purpose:** Project comments and discussions
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `project_id` (UUID) - Foreign key to projects
  - `author` (TEXT) - Comment author
  - `content` (TEXT) - Comment content
  - `attachments` (TEXT[]) - Array of attachment URLs
  - `created_at` (TIMESTAMPTZ)

#### 7. **project_team_members**
- **Purpose:** Track team members assigned to projects
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `project_id` (UUID) - Foreign key to projects
  - `member_name` (TEXT) - Team member name
  - `member_email` (TEXT) - Team member email
  - `role` (TEXT) - Role on the project
  - `created_at` (TIMESTAMPTZ)

#### 8. **progress_updates**
- **Purpose:** Track project progress updates with photos
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `project_id` (UUID) - Foreign key to projects
  - `description` (TEXT) - Update description
  - `photos` (TEXT[]) - Array of photo URLs
  - `created_at` (TIMESTAMPTZ)

### Financial Tables

#### 9. **invoices**
- **Purpose:** Store invoices sent to clients
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `client_id` (UUID) - Foreign key to clients
  - `project_id` (UUID) - Associated project
  - `invoice_number` (TEXT) - Invoice number
  - `status` (TEXT) - Status (draft, sent, paid, overdue)
  - `total_amount` (DECIMAL) - Invoice total
  - `paid_amount` (DECIMAL) - Amount paid
  - `due_date` (TIMESTAMPTZ) - Payment due date
  - `items` (JSONB) - Line items
  - `user_id` (UUID) - Creator
  - `created_at` (TIMESTAMPTZ)

#### 10. **finance_expenses**
- **Purpose:** Track business expenses
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `category` (TEXT) - Expense category
  - `description` (TEXT) - Description
  - `amount` (DECIMAL) - Expense amount
  - `date` (TIMESTAMPTZ) - Expense date
  - `payment_method` (TEXT) - Payment method
  - `project_id` (UUID) - Associated project (optional)
  - `user_id` (UUID) - Owner
  - `created_at` (TIMESTAMPTZ)

#### 11. **finance_payments**
- **Purpose:** Track payments received
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `amount` (DECIMAL) - Payment amount
  - `date` (TIMESTAMPTZ) - Payment date
  - `method` (TEXT) - Payment method
  - `description` (TEXT) - Description
  - `project_id` (UUID) - Associated project
  - `invoice_id` (UUID) - Associated invoice
  - `user_id` (UUID) - Owner
  - `created_at` (TIMESTAMPTZ)

#### 12. **recurring_expenses**
- **Purpose:** Track recurring monthly expenses
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `name` (TEXT) - Expense name
  - `category` (TEXT) - Category
  - `amount` (DECIMAL) - Monthly amount
  - `frequency` (TEXT) - Frequency (monthly, weekly, etc.)
  - `is_active` (BOOLEAN) - Active status
  - `user_id` (UUID) - Owner
  - `created_at` (TIMESTAMPTZ)

#### 13. **budget_items**
- **Purpose:** Budget tracking and planning
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `category` (TEXT) - Budget category
  - `budgeted_amount` (DECIMAL) - Planned amount
  - `spent_amount` (DECIMAL) - Actual spent
  - `period` (TEXT) - Time period
  - `user_id` (UUID) - Owner
  - `created_at` (TIMESTAMPTZ)

### HR & Team Tables

#### 14. **employees**
- **Purpose:** Track employees and contractors
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `name` (TEXT) - Employee name
  - `email` (TEXT) - Employee email
  - `phone` (TEXT) - Phone number
  - `role` (TEXT) - Job role
  - `status` (TEXT) - Employment status
  - `hourly_rate` (DECIMAL) - Pay rate
  - `user_id` (UUID) - Employer
  - `created_at` (TIMESTAMPTZ)

#### 15. **employee_payments**
- **Purpose:** Track payments to employees
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `employee_id` (UUID) - Foreign key to employees
  - `amount` (DECIMAL) - Payment amount
  - `date` (TIMESTAMPTZ) - Payment date
  - `period` (TEXT) - Pay period
  - `created_at` (TIMESTAMPTZ)

#### 16. **contractor_payments**
- **Purpose:** Track payments to contractors
- **Key Columns:**
  - Similar to employee_payments but for contractors

### Marketing Tables

#### 17. **ad_accounts**
- **Purpose:** Google Ads account information
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `account_id` (TEXT) - Google Ads account ID
  - `account_name` (TEXT) - Account name
  - `status` (TEXT) - Account status
  - `user_id` (UUID) - Owner
  - `created_at` (TIMESTAMPTZ)

#### 18. **ad_campaigns**
- **Purpose:** Google Ads campaign tracking
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `account_id` (UUID) - Foreign key to ad_accounts
  - `campaign_id` (TEXT) - Google campaign ID
  - `campaign_name` (TEXT) - Campaign name
  - `status` (TEXT) - Campaign status
  - `budget` (DECIMAL) - Campaign budget
  - `created_at` (TIMESTAMPTZ)

#### 19. **ad_metrics**
- **Purpose:** Store advertising performance metrics
- **Key Columns:**
  - `id` (UUID) - Primary key
  - `campaign_id` (UUID) - Foreign key to ad_campaigns
  - `date` (DATE) - Metric date
  - `impressions` (INTEGER) - Ad impressions
  - `clicks` (INTEGER) - Ad clicks
  - `cost` (DECIMAL) - Cost
  - `conversions` (INTEGER) - Conversions
  - `created_at` (TIMESTAMPTZ)

### User Management Tables

#### 20. **profiles**
- **Purpose:** Extended user profile information
- **Key Columns:**
  - `id` (UUID) - Primary key (matches auth.users.id)
  - `company_name` (TEXT) - Company name
  - `phone` (TEXT) - Phone number
  - `address` (TEXT) - Business address
  - `logo_url` (TEXT) - Company logo
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)

### Storage Buckets

#### 21. **company-logos**
- **Purpose:** Store company logo images
- **Access:** Users can upload/update their own, public can view

#### 22. **progress-photos**
- **Purpose:** Store project progress photos and attachments
- **Access:** Controlled by RLS policies

## Pending Changes

### Required Migrations

1. **Add `location` column to `calendar_events`**
   ```sql
   ALTER TABLE calendar_events
   ADD COLUMN IF NOT EXISTS location TEXT;
   ```

2. **Update NULL end_dates in calendar_events**
   ```sql
   UPDATE calendar_events
   SET end_date = start_date
   WHERE end_date IS NULL;
   ```

## Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Allow users to access only their own data (filtered by `user_id`)
- Support authenticated operations (INSERT, UPDATE, DELETE)
- Some tables (like tasks, comments) allow all operations for development

## Indexes

Key indexes for performance:
- `idx_tasks_project_id` on tasks(project_id)
- `idx_comments_project_id` on comments(project_id)
- `idx_team_members_project_id` on project_team_members(project_id)

## Notes

- All primary keys use UUID type with `gen_random_uuid()`
- Timestamps use TIMESTAMPTZ for timezone awareness
- Foreign keys use ON DELETE CASCADE for automatic cleanup
- JSONB used for flexible data structures (estimate items, invoice items)
