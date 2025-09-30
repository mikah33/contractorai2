# Quick Setup Guide

## 🚀 5-Minute Setup

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/ContractorAI-main.git
cd ContractorAI-main
npm install
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your Project URL and Anon Key from Settings → API

### 3. Set Up Environment
Create a `.env` file in the root directory:
```bash
echo "VITE_SUPABASE_URL=your_project_url_here" > .env
echo "VITE_SUPABASE_ANON_KEY=your_anon_key_here" >> .env
```

### 4. Set Up Database
1. In Supabase dashboard, go to SQL Editor
2. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click "Run"

### 5. Start the App
```bash
npm run dev
```

Visit `http://localhost:5173` and create your first account!

## 🔧 Need Help?

- Check the main [README.md](README.md) for detailed instructions
- Review the [troubleshooting section](README.md#-troubleshooting)
- Open an issue on GitHub if you encounter problems

## 📋 What's Included

✅ Project Management  
✅ Finance Tracking  
✅ Estimate Generation  
✅ Pricing Calculator  
✅ Client Management  
✅ Calendar Integration  
✅ Responsive Design  
✅ User Authentication  
✅ Data Security (RLS)  

---

**Ready to manage your construction business like a pro! 🏗️**
