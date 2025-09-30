# ContractorAI Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

## Step 1: Clone and Install

```bash
git clone <repository-url>
cd ContractorAI-main
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: ContractorAI (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select closest to your location
6. Click "Create New Project"

### 2.2 Get Your API Keys

1. Once your project is created, go to Settings → API
2. Copy these values:
   - Project URL (looks like: https://xxxxx.supabase.co)
   - Anon/Public Key (long string starting with eyJ...)

### 2.3 Set Up Database Tables

1. In Supabase dashboard, go to SQL Editor
2. Click "New Query"
3. Copy and paste the entire contents of `/supabase/migrations/001_initial_schema.sql`
4. Click "Run" to create all tables and policies

### 2.4 Enable Authentication

1. Go to Authentication → Providers
2. Enable Email provider (should be enabled by default)
3. Optional: Configure other providers (Google, GitHub, etc.)

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Run the Application

```bash
npm run dev
```

The app should now be running at `http://localhost:5173`

## Step 5: Create Your First Account

1. Navigate to the app in your browser
2. Click "Sign Up" to create a new account
3. Enter your email and password
4. You'll be automatically logged in

## Features Now Available

With authentication and database set up, you have access to:

### Finance Tracker
- Add income and expense transactions
- Set up recurring expenses
- View balance and monthly summaries
- Category breakdown charts
- All data is saved per user

### Project Manager
- Create and manage projects
- Track project budgets
- Associate transactions with projects

### Estimate Generator
- Create professional estimates
- Save and manage estimates
- Send to clients

### Pricing Calculator
- Calculate pricing for various trades
- Save calculations for reference

## Troubleshooting

### "Invalid API Key" Error
- Double-check your Supabase URL and Anon Key in `.env`
- Make sure there are no extra spaces or quotes

### "User not found" Error
- Ensure the database tables were created successfully
- Check that Row Level Security policies are enabled

### Data Not Persisting
- Verify you're logged in (check for user email in header)
- Check browser console for any Supabase errors
- Ensure RLS policies are correctly set up

### Can't Log In
- Check that Email provider is enabled in Supabase
- Verify your password is at least 6 characters
- Try creating a new account

## Database Schema Overview

### Tables Created:
- `profiles` - User profile information
- `finance_transactions` - Income and expense records
- `recurring_expenses` - Recurring expense tracking
- `projects` - Project management
- `estimates` - Estimate records

### Security Features:
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic profile creation on signup

## Next Steps

1. **Customize Categories**: Edit the finance categories to match your business
2. **Import Data**: Use the CSV import feature (coming soon)
3. **Set Up Recurring Expenses**: Add your monthly business expenses
4. **Create Projects**: Start tracking your active projects

## Support

For issues or questions:
1. Check the Supabase logs (Dashboard → Logs)
2. Review browser console for errors
3. Ensure all environment variables are set correctly

## Production Deployment

For production deployment:
1. Use environment variables for all sensitive data
2. Enable additional Supabase security features
3. Consider upgrading Supabase plan for better performance
4. Set up proper backup strategies