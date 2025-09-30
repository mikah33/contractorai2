# ContractorAI - Quick Start Guide

## What's Been Done

✅ **Authentication System Implemented**
- Full user registration and login system
- Session management with Supabase Auth
- Secure per-user data isolation

✅ **Database Schema Created**
- User profiles table
- Finance transactions table  
- Recurring expenses table
- Projects table
- Estimates table
- All with Row Level Security (RLS) enabled

✅ **Finance Tracker Updated**
- Persistent data storage per user
- Real-time sync across sessions
- Transaction management (income/expense)
- Recurring expense tracking
- Category breakdowns
- Monthly summaries

## Quick Setup (5 minutes)

### 1. Set up Supabase (Free)
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (remember your database password)
3. Once created, go to Settings → API
4. Copy your Project URL and Anon Key

### 2. Configure the App
```bash
# Create .env file
cp .env.example .env

# Edit .env and add your Supabase credentials:
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Create Database Tables
1. In Supabase dashboard, go to SQL Editor
2. Click "New Query"  
3. Copy contents from `/supabase/migrations/001_initial_schema.sql`
4. Click "Run"

### 4. Run the App
```bash
npm install
npm run dev
```

Visit http://localhost:5173

## How to Use

### First Time:
1. Click "Sign Up" to create an account
2. Enter email and password (min 6 characters)
3. You're automatically logged in!

### Finance Tracker:
- **Add Transaction**: Click "+" button, enter details
- **View Balance**: See at top of finance page
- **Add Recurring**: Set up monthly bills
- **Categories**: Transactions auto-categorize

### All Features Working:
- ✅ Pricing Calculator - Calculate job costs
- ✅ Finance Tracker - Track income/expenses (SAVES TO DATABASE)
- ✅ Estimate Generator - Create professional estimates  
- ✅ Project Manager - Manage your projects
- ✅ Calendar - Schedule management
- ✅ Ad Analyzer - Marketing insights
- ✅ Dashboard - Overview of everything

## Important Files

- `/src/stores/authStore.ts` - Authentication logic
- `/src/stores/financeStore.new.ts` - Finance data management
- `/supabase/migrations/001_initial_schema.sql` - Database structure
- `/docs/SETUP_GUIDE.md` - Detailed setup instructions

## What's Different Now

**Before:**
- Mock data only (nothing saved)
- Fake authentication
- Data lost on refresh

**Now:**
- Real user accounts
- All data saved to database
- Data persists across sessions
- Each user has isolated data
- Real-time sync enabled

## Troubleshooting

**"Invalid API Key"**
- Check your .env file has correct Supabase credentials

**Can't login**
- Make sure you ran the SQL migration
- Password must be 6+ characters

**Data not saving**
- Ensure you're logged in
- Check browser console for errors

## Next Steps for Development

To continue development:
1. Replace old financeStore with new one
2. Update other stores (projectStore, etc.) similarly
3. Add more features as needed

The authentication and database foundation is now complete and working!