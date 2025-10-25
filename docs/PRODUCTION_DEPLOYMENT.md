# Production Deployment Guide - contractorai.tools

## 🚀 Deploying Latest Changes

Your latest code (including Cindy CRM) is on GitHub but needs to be deployed to production.

---

## Step 1: Identify Your Deployment Platform

**contractorai.tools** is likely hosted on one of these platforms:

### Option A: Netlify
- Go to: https://app.netlify.com/
- Find your site (contractorai2 or contractorai)
- Click "Trigger deploy" → "Deploy site"

### Option B: Vercel
- Go to: https://vercel.com/dashboard
- Find your project (contractorai2)
- Click "Redeploy" on latest deployment

### Option C: GitHub Pages
- Deployments happen automatically on push
- Check: https://github.com/mikah33/contractorai2/actions

### Option D: Manual Deployment
If you deploy manually to a VPS/server:
```bash
ssh your-server
cd /path/to/contractorai2
git pull origin main
npm install
npm run build
# Copy dist/ to web server
```

---

## Step 2: Set Production Environment Variables

**CRITICAL**: Before deploying, set these environment variables in your hosting platform:

### Required Variables:

```bash
# Google OAuth - Gmail Integration
VITE_GOOGLE_CLIENT_ID=244912967505-80c3fhnvgiedfti5mutmlisqk17nugl4.apps.googleusercontent.com
VITE_GMAIL_REDIRECT_URI=https://contractorai.tools/gmail-oauth-callback

# Supabase (should already be set)
VITE_SUPABASE_URL=https://ujhgwcurllkkeouzwvgk.supabase.co
VITE_SUPABASE_ANON_KEY=[your_anon_key]
```

### Where to Set Them:

**Netlify:**
1. Site settings → Environment variables
2. Add each variable
3. Redeploy

**Vercel:**
1. Project Settings → Environment Variables
2. Add each variable
3. Redeploy

---

## Step 3: Verify Deployment

After deploying, check:

1. **Cindy is Available:**
   - Go to: https://contractorai.tools/ai-team
   - Cindy card should show "Talk to Cindy" button
   - NO "Under Construction" badge

2. **Cindy CRM Works:**
   - Click "Talk to Cindy"
   - Should navigate to: https://contractorai.tools/cindy-crm
   - Chat interface should load

3. **Gmail OAuth Works:**
   - Go to: https://contractorai.tools/settings
   - Scroll to "Email Integration"
   - Click "Connect Gmail Account"
   - OAuth flow should work with production redirect URI

---

## Quick Deployment Commands

### If using Netlify CLI:
```bash
npm run build
netlify deploy --prod
```

### If using Vercel CLI:
```bash
npm run build
vercel --prod
```

### Manual build:
```bash
npm run build
# Then upload dist/ folder to your hosting
```

---

## What's New in This Deployment:

✅ **Cindy AI CRM** - Full client relationship management chatbot
✅ **Gmail OAuth Integration** - Send emails through user's Gmail
✅ **Project Management Tools** - Create and manage projects
✅ **Calendar Integration** - Schedule and track events
✅ **Email Drafting** - AI-powered customer communications

---

## Troubleshooting Production Issues:

### Issue: Cindy still shows "Under Construction"
**Cause**: Old build is cached

**Fix**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+F5)
3. Check deployment actually completed
4. Verify latest commit is deployed

### Issue: Gmail OAuth fails in production
**Cause**: Wrong redirect URI or missing env vars

**Fix**:
1. Check Google Cloud Console has production redirect:
   ```
   https://contractorai.tools/gmail-oauth-callback
   ```
2. Verify `VITE_GMAIL_REDIRECT_URI` is set in production env
3. Rebuild with correct env vars

### Issue: "Module not found" errors
**Cause**: Dependencies not installed

**Fix**:
```bash
npm install
npm run build
```

---

## Need Help Deploying?

**Tell me which platform you're using and I can give you specific deployment commands!**

Common platforms:
- Netlify
- Vercel
- GitHub Pages
- AWS Amplify
- Custom VPS

Just let me know and I'll walk you through it! 🚀
