# ContractorAI - Construction Management Platform

**Last Updated: September 30, 2025**

A comprehensive construction management platform built with React, TypeScript, and Supabase. Manage projects, track finances, create estimates, and calculate pricing for construction businesses.

## 🚀 Features

- **Project Management**: Track projects, budgets, and timelines
- **Finance Tracker**: Monitor income, expenses, and recurring costs
- **Estimate Generator**: Create professional estimates for clients
- **Pricing Calculator**: Calculate pricing for various construction trades
- **Client Management**: Organize client information and project history
- **Calendar Integration**: Schedule and track project milestones
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: Zustand
- **Routing**: React Router
- **PDF Generation**: jsPDF
- **Icons**: Lucide React

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** or **yarn**
- **Git**
- **Supabase account** (free tier works perfectly)

## 🚀 Quick Start Guide

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ContractorAI-main.git
cd ContractorAI-main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### 3.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: `ContractorAI` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select the region closest to your location
5. Click **"Create New Project"**

#### 3.2 Get Your API Credentials

1. Once your project is created, navigate to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (long string starting with `eyJ...`)

#### 3.3 Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor and click **"Run"**

This will create all necessary tables, policies, and functions for the application.

#### 3.4 Enable Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled (should be enabled by default)
3. Optionally, configure other providers like Google or GitHub

### 4. Configure Environment Variables

**Important**: The current configuration has hardcoded Supabase credentials. For security and proper setup, you should use environment variables.

1. Create a `.env` file in the root directory:

```bash
touch .env
```

2. Add your Supabase credentials to the `.env` file:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Update `src/lib/supabase.ts` to use environment variables:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 6. Create Your First Account

1. Open the application in your browser
2. Click **"Sign Up"** to create a new account
3. Enter your email and password
4. You'll be automatically logged in and redirected to the dashboard

## 📁 Project Structure

```
ContractorAI-main/
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── finance/        # Finance tracking components
│   │   ├── projects/       # Project management components
│   │   ├── estimates/      # Estimate generation components
│   │   └── pricing/        # Pricing calculator components
│   ├── contexts/           # React contexts
│   ├── stores/             # Zustand state stores
│   ├── services/           # API services
│   ├── types/              # TypeScript type definitions
│   └── lib/                # Utility libraries
├── supabase/
│   ├── migrations/         # Database migration files
│   └── functions/          # Supabase Edge Functions
├── docs/                   # Documentation
└── dist/                   # Built application
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🗄️ Database Schema

The application uses the following main tables:

- **profiles** - User profile information
- **finance_transactions** - Income and expense records
- **recurring_expenses** - Recurring expense tracking
- **projects** - Project management data
- **estimates** - Estimate records and line items
- **clients** - Client information
- **calendar_events** - Calendar and scheduling data

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## 🔐 Security Features

- **Row Level Security (RLS)** on all database tables
- **User authentication** via Supabase Auth
- **Automatic profile creation** on user signup
- **Data isolation** between users
- **Secure API key management** (when using environment variables)

## 🚨 Troubleshooting

### Common Issues

**"Invalid API Key" Error**
- Verify your Supabase URL and Anon Key in `.env`
- Ensure there are no extra spaces or quotes
- Check that the keys are correctly copied from Supabase dashboard

**"User not found" Error**
- Ensure the database tables were created successfully
- Verify that Row Level Security policies are enabled
- Check that the user profile was created during signup

**Data Not Persisting**
- Verify you're logged in (check for user email in header)
- Check browser console for Supabase errors
- Ensure RLS policies are correctly set up

**Can't Log In**
- Verify Email provider is enabled in Supabase
- Ensure password is at least 6 characters
- Try creating a new account

### Debug Mode

The application includes debug logging. Check the browser console for:
- Supabase connection status
- Authentication state
- API call responses

## 🚀 Deployment

### Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Environment Variables for Production

Make sure to set these environment variables in your production environment:

```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

### Recommended Hosting Platforms

- **Vercel** - Easy deployment with automatic builds
- **Netlify** - Great for static sites with form handling
- **Supabase Hosting** - Direct integration with your Supabase project

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/guide)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#-troubleshooting) above
2. Review the Supabase logs in your dashboard
3. Check the browser console for errors
4. Ensure all environment variables are set correctly
5. Open an issue on GitHub with detailed information about the problem

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced reporting and analytics
- [ ] Integration with accounting software
- [ ] Team collaboration features
- [ ] Document management system
- [ ] Advanced scheduling and resource management

---

**Built with ❤️ for the construction industry**