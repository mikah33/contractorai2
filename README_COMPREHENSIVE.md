# ContractorAI - Complete Business Management Platform for Contractors

<div align="center">
  <h3>🏗️ AI-Powered Construction Business Management Suite</h3>
  <p>Transform your contracting business with intelligent pricing, project management, and financial analytics</p>
  
  ![React](https://img.shields.io/badge/React-18.3.1-blue)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue)
  ![Supabase](https://img.shields.io/badge/Supabase-2.39.7-green)
  ![Stripe](https://img.shields.io/badge/Stripe-Integrated-purple)
  ![License](https://img.shields.io/badge/License-Proprietary-red)
</div>

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Features Breakdown](#features-breakdown)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)
- [Support](#support)

## 🎯 Overview

ContractorAI is a comprehensive SaaS platform designed specifically for construction professionals and contractors. It combines AI-powered pricing intelligence, project management, financial tracking, and business analytics to streamline operations and maximize profitability.

### Key Benefits
- 🤖 **AI-Powered Pricing**: Intelligent cost estimation for 20+ construction trades
- 📊 **Financial Intelligence**: Automated expense tracking with anomaly detection
- 📅 **Project Management**: End-to-end project lifecycle management
- 💰 **Revenue Optimization**: Integrated invoicing and payment processing
- 📈 **Business Analytics**: Real-time insights and performance metrics
- 🎯 **Ad Performance**: Multi-platform advertising ROI analysis

## ✨ Features

### Core Functionality
- **AI Pricing Calculator** - Smart estimates for 20+ construction trades
- **Project Management** - Track projects from proposal to completion
- **Financial Suite** - Expense tracking, budgeting, and cash flow analysis
- **Calendar System** - Scheduling, deadlines, and resource planning
- **Estimate Builder** - Professional proposals with templates
- **Invoice Generator** - Automated billing and payment tracking
- **Ad Analyzer** - Marketing campaign performance tracking
- **Client Portal** - Customer communication and approval workflows

### AI & Automation
- Material cost optimization
- Labor rate calculations
- Expense categorization
- Cash flow predictions
- Anomaly detection
- Performance insights
- Cost-saving recommendations

## 🛠️ Technology Stack

### Frontend
```json
{
  "Framework": "React 18.3.1",
  "Language": "TypeScript 5.6.2",
  "Styling": "TailwindCSS 3.4.1",
  "State": "Zustand 4.5.2",
  "Routing": "React Router DOM 6.22.3",
  "Build": "Vite 7.1.4",
  "Icons": "Lucide React 0.344.0",
  "Dates": "date-fns 3.3.1"
}
```

### Backend & Services
```json
{
  "Backend": "Supabase 2.39.7",
  "Database": "PostgreSQL (Supabase)",
  "Auth": "Supabase Auth",
  "Storage": "Supabase Storage",
  "Functions": "Supabase Edge Functions",
  "Payments": "Stripe API",
  "Runtime": "Node.js / Deno"
}
```

## 📁 Project Structure

```
ContractorAI-main/
├── src/                          # Source code
│   ├── components/               # React components
│   │   ├── ads/                 # Ad analyzer components
│   │   ├── auth/                # Authentication components
│   │   ├── calendar/            # Calendar & scheduling
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── estimates/           # Estimate management
│   │   ├── finance/             # Financial tracking
│   │   ├── layout/              # Layout components
│   │   ├── pricing/             # Pricing calculators
│   │   ├── projects/            # Project management
│   │   └── ui/                  # Reusable UI components
│   ├── contexts/                # React contexts
│   │   ├── PricingContext.tsx  # Pricing state management
│   │   └── ProjectContext.tsx  # Project state management
│   ├── data/                    # Static data & constants
│   │   └── pricing/             # Trade-specific pricing data
│   ├── lib/                     # Utility libraries
│   │   └── supabase.ts         # Supabase client config
│   ├── pages/                   # Page components
│   │   └── auth/               # Authentication pages
│   ├── stores/                  # Zustand stores
│   │   ├── authStore.ts       # Authentication state
│   │   ├── financeStore.ts    # Financial data state
│   │   ├── calendarStore.ts   # Calendar state
│   │   └── adAnalyzerStore.ts # Ad metrics state
│   ├── types/                   # TypeScript definitions
│   ├── App.tsx                  # Main application component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles
├── supabase/                    # Supabase configuration
│   ├── functions/              # Edge functions
│   │   ├── stripe-checkout/   # Checkout processing
│   │   └── stripe-webhook/    # Webhook handling
│   └── migrations/             # Database migrations
├── .bolt/                      # Bolt configuration
├── package.json                # Dependencies
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.js          # PostCSS configuration
└── eslint.config.js           # ESLint configuration
```

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Stripe account (for payments)
- Git

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ContractorAI-main.git
cd ContractorAI-main
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

4. **Run database migrations**
```bash
npx supabase db push
```

5. **Start development server**
```bash
npm run dev
```

## ⚙️ Configuration

### Supabase Setup
1. Create a new Supabase project
2. Run the SQL migrations in `supabase/migrations/`
3. Enable Row Level Security (RLS)
4. Configure authentication providers
5. Set up storage buckets for file uploads

### Stripe Integration
1. Create a Stripe account
2. Set up products and pricing
3. Configure webhooks for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`

### Environment Variables
```env
# Supabase
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
VITE_APP_URL=http://localhost:5173
VITE_PRICE_ID=price_...
```

## 🗄️ Database Schema

### Core Tables

#### `subscriptions`
- Basic subscription tracking
- Links users to subscription status

#### `stripe_customers`
```sql
- user_id (UUID, FK to auth.users)
- stripe_customer_id (TEXT, UNIQUE)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `stripe_subscriptions`
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- stripe_subscription_id (TEXT, UNIQUE)
- stripe_customer_id (TEXT)
- status (TEXT)
- price_id (TEXT)
- quantity (INT)
- cancel_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `stripe_orders`
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- stripe_session_id (TEXT)
- amount_total (INT)
- currency (TEXT)
- status (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
```

### Security
- Row Level Security (RLS) enabled on all tables
- User-based data isolation
- JWT authentication
- Secure API endpoints

## 📡 API Documentation

### Supabase Edge Functions

#### `/stripe-checkout`
Creates a Stripe checkout session for subscription
- **Method**: POST
- **Auth**: Required
- **Body**: `{ priceId: string, successUrl: string, cancelUrl: string }`
- **Response**: `{ sessionUrl: string }`

#### `/stripe-webhook`
Handles Stripe webhook events
- **Method**: POST
- **Auth**: Stripe signature verification
- **Events Handled**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`

### Client API Calls

#### Authentication
```typescript
// Sign up
await supabase.auth.signUp({ email, password })

// Sign in
await supabase.auth.signInWithPassword({ email, password })

// Sign out
await supabase.auth.signOut()

// Get session
const { data: { session } } = await supabase.auth.getSession()
```

#### Data Operations
```typescript
// Fetch subscription
const { data } = await supabase
  .from('stripe_subscriptions')
  .select('*')
  .eq('user_id', userId)
  .single()

// Create order
const { data, error } = await supabase
  .from('stripe_orders')
  .insert({ ...orderData })
```

## 🎨 Features Breakdown

### 1. AI Pricing Calculator
Advanced pricing engine for 20+ construction trades:

**Supported Trades:**
- Concrete Work (slabs, driveways, foundations)
- Deck Installation (composite, wood, custom)
- Siding (vinyl, fiber cement, wood)
- Pavers (patio, walkway, driveway)
- Drywall (installation, repair, finishing)
- Painting (interior, exterior, specialty)
- Framing (wood, steel, custom)
- Retaining Walls (block, stone, timber)
- Excavation (grading, trenching, site prep)
- Flooring (hardwood, laminate, tile, carpet)
- Electrical (residential, commercial, service)
- HVAC (installation, repair, maintenance)
- Plumbing (new construction, repair, fixtures)
- Doors & Windows (installation, replacement)
- Fencing (wood, vinyl, chain link, custom)
- Foundation Work (repair, waterproofing)
- Gutters (installation, repair, guards)
- Junk Removal (residential, construction)

**Features:**
- Material cost calculations
- Labor hour estimations
- Regional pricing adjustments
- Markup and profit calculations
- Export to PDF
- Template saving

### 2. Financial Management
Comprehensive financial tracking and analysis:

**Expense Tracking:**
- Receipt capture and storage
- Automatic categorization
- Recurring expense management
- Vendor management

**Payment Processing:**
- Multiple payment methods
- Payment scheduling
- Late payment tracking
- Payment history

**Budget Management:**
- Project-based budgets
- Budget vs. actual tracking
- Variance analysis
- Cost overrun alerts

**AI Analytics:**
- Anomaly detection
- Cost-saving suggestions
- Cash flow predictions
- Profitability analysis

### 3. Project Management
End-to-end project lifecycle management:

**Project States:**
- Draft (proposal stage)
- In Progress (active work)
- Completed (finished projects)

**Features:**
- Task management with priorities
- Team member assignment
- Progress photo galleries
- Client communication log
- Document management
- Timeline tracking
- Milestone management

### 4. Calendar & Scheduling
Visual project and resource planning:

- Project timelines
- Equipment scheduling
- Team availability
- Client appointments
- Deadline tracking
- Mobile-responsive interface
- Reminder system

### 5. Ad Performance Analyzer
Marketing campaign optimization:

**Supported Platforms:**
- Google Ads
- Facebook Ads
- Instagram Ads
- Custom campaigns

**Metrics Tracked:**
- Spend analysis
- Conversion rates
- Cost per acquisition
- Return on ad spend (ROAS)
- Click-through rates
- Campaign comparisons

**AI Features:**
- Performance predictions
- Budget optimization
- A/B test analysis
- Competitor insights

### 6. Client Portal
Customer relationship management:

- Estimate approval workflow
- Project progress visibility
- Communication history
- Payment portal
- Document sharing
- Feedback collection

## 🔧 Development

### Available Scripts
```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### Code Style
- ESLint configuration for React/TypeScript
- Prettier for code formatting
- Tailwind CSS for styling
- Component-based architecture
- Custom hooks for logic reuse

### Testing
```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

## 🚢 Deployment

### Production Build
```bash
# Create optimized build
npm run build

# Test production build locally
npm run preview
```

### Deployment Options

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Environment Configuration
Ensure all production environment variables are set:
- Database connection strings
- API keys (Stripe, Supabase)
- Authentication secrets
- CORS origins
- SSL certificates

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Session management
- Password hashing with bcrypt
- Two-factor authentication (optional)

### Data Protection
- Row Level Security (RLS) on all tables
- Encrypted data transmission (HTTPS)
- Secure API endpoints
- Input validation and sanitization
- SQL injection prevention

### Payment Security
- PCI DSS compliance via Stripe
- Tokenized payment processing
- Secure webhook validation
- No storage of sensitive payment data

### Best Practices
- Regular security audits
- Dependency vulnerability scanning
- Environment variable management
- Rate limiting on API endpoints
- CORS configuration
- XSS protection
- CSRF tokens

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write unit tests for new features
- Update documentation
- Maintain code coverage above 80%
- Use conventional commits
- Ensure all tests pass

### Code Review Process
1. Automated CI/CD checks
2. Code review by maintainers
3. Testing in staging environment
4. Approval and merge

## 📞 Support

### Documentation
- [User Guide](./docs/user-guide.md)
- [API Reference](./docs/api-reference.md)
- [FAQ](./docs/faq.md)

### Contact
- **Email**: support@contractorai.com
- **Discord**: [Join our community](https://discord.gg/contractorai)
- **Issues**: [GitHub Issues](https://github.com/contractorai/issues)

### Professional Support
- Enterprise support plans available
- Custom feature development
- Training and onboarding
- SLA guarantees

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">
  <p>Built with ❤️ for the construction industry</p>
  <p>© 2024 ContractorAI. All rights reserved.</p>
</div>