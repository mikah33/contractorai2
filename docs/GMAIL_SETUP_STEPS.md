# Gmail OAuth Setup - Step by Step Guide

## Prerequisites
- Google account with access to Google Cloud Console
- Supabase project access
- Your app is deployed (for production) or running locally (for testing)

---

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select a Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown at the top
4. Either:
   - **Select** your existing project, OR
   - Click **"NEW PROJECT"**
     - Enter project name: `ContractorAI` (or your preferred name)
     - Click **"CREATE"**
     - Wait for project creation (takes 10-30 seconds)

### 1.2 Enable Gmail API
1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. Search for `Gmail API`
3. Click on **"Gmail API"** from results
4. Click the blue **"ENABLE"** button
5. Wait for API to enable (takes a few seconds)

---

## Step 2: Configure OAuth Consent Screen

### 2.1 Basic Setup
1. In left sidebar, click **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** user type (unless you have a Google Workspace)
3. Click **"CREATE"**

### 2.2 App Information
Fill in the form:
- **App name**: `ContractorAI` (or your app name)
- **User support email**: Your email address
- **App logo**: (Optional) Upload your logo
- **Application home page**: Your website URL (e.g., `https://yourdomain.com`)
- **Application privacy policy link**: Your privacy policy URL
- **Application terms of service link**: Your terms of service URL
- **Authorized domains**:
  - Add: `yourdomain.com` (your production domain)
  - Add: `supabase.co` (for Supabase services)
- **Developer contact information**: Your email address

Click **"SAVE AND CONTINUE"**

### 2.3 Scopes
1. Click **"ADD OR REMOVE SCOPES"**
2. In the filter box, search for: `gmail.send`
3. Check these scopes:
   - ✅ `https://www.googleapis.com/auth/gmail.send`
   - ✅ `https://www.googleapis.com/auth/userinfo.email`
4. Click **"UPDATE"**
5. Click **"SAVE AND CONTINUE"**

### 2.4 Test Users (During Development)
1. Click **"ADD USERS"**
2. Add your email addresses that will test the feature:
   - Your personal email
   - Any team member emails
3. Click **"ADD"**
4. Click **"SAVE AND CONTINUE"**

### 2.5 Summary
1. Review all information
2. Click **"BACK TO DASHBOARD"**

---

## Step 3: Create OAuth 2.0 Credentials

### 3.1 Create Credentials
1. In left sidebar, click **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at top
3. Select **"OAuth client ID"**

### 3.2 Configure OAuth Client
1. **Application type**: Select **"Web application"**
2. **Name**: Enter `ContractorAI Web Client` (or any name you prefer)

### 3.3 Add Authorized JavaScript Origins
Click **"+ ADD URI"** under "Authorized JavaScript origins" and add:

**For Local Development:**
```
http://localhost:5173
```

**For Production:**
```
https://your-production-domain.com
```
(Replace with your actual domain)

### 3.4 Add Authorized Redirect URIs
Click **"+ ADD URI"** under "Authorized redirect URIs" and add:

**For Local Development:**
```
http://localhost:5173/gmail-oauth-callback
```

**For Production:**
```
https://your-production-domain.com/gmail-oauth-callback
```
(Replace with your actual domain)

### 3.5 Create & Save
1. Click **"CREATE"**
2. You'll see a popup with your credentials
3. **IMPORTANT**: Copy and save these values:
   - **Client ID**: `something.apps.googleusercontent.com`
   - **Client secret**: `GOCSPX-xxxxxxxxxxxxxxxxx`
4. Click **"OK"**

**⚠️ KEEP THESE SECRET!** Never commit these to Git or share publicly.

---

## Step 4: Add Credentials to Supabase

### 4.1 Add Edge Function Secrets
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `contractorai2`
3. In left sidebar, click **"Edge Functions"**
4. Click the **"Manage secrets"** button
5. Add two secrets:

**Secret 1:**
- Name: `GOOGLE_CLIENT_ID`
- Value: (Paste your Client ID from Step 3.5)
- Click **"Add secret"**

**Secret 2:**
- Name: `GOOGLE_CLIENT_SECRET`
- Value: (Paste your Client Secret from Step 3.5)
- Click **"Add secret"**

### 4.2 Redeploy Edge Functions (Important!)
After adding secrets, redeploy your functions so they can access the new secrets:

```bash
supabase functions deploy gmail-oauth-callback
supabase functions deploy send-gmail
```

---

## Step 5: Add Environment Variables to Frontend

### 5.1 Update .env.local File
Open `/Users/mikahalbertson/git/ContractorAI/contractorai2/.env.local` and add:

```bash
# Google OAuth - Gmail Integration
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GMAIL_REDIRECT_URI=http://localhost:5173/gmail-oauth-callback
```

**For Production**, update your production environment variables:
```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GMAIL_REDIRECT_URI=https://your-domain.com/gmail-oauth-callback
```

### 5.2 Restart Development Server
If your dev server is running, restart it:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Step 6: Verify Database Migration

### 6.1 Check Columns Exist
Run this in Supabase SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name LIKE 'gmail%';
```

You should see:
- ✅ `gmail_access_token` (text)
- ✅ `gmail_refresh_token` (text)
- ✅ `gmail_token_expiry` (timestamp with time zone)
- ✅ `gmail_email` (text)

### 6.2 If Columns Are Missing
Run this migration:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gmail_email TEXT;
```

---

## Step 7: Test the Integration

### 7.1 Connect Gmail Account
1. Start your app: `npm run dev`
2. Navigate to **Settings** page in your app
3. Scroll down to **"Email Integration"** section
4. Click **"Connect Gmail Account"** button
5. OAuth popup should open
6. Sign in with your Google account
7. Review permissions and click **"Allow"**
8. Popup should close and show **"Gmail Connected!"**

### 7.2 Test Sending Email via Cindy
1. Go to **"Cindy CRM"** page
2. Chat with Cindy: `"Draft an email to test@example.com about our services"`
3. Review the drafted email
4. Click **"Send Email"**
5. Check that email sends successfully through Gmail

### 7.3 Verify in Database
Run this query to see your connected Gmail:

```sql
SELECT id, email, gmail_email,
       gmail_token_expiry,
       (gmail_access_token IS NOT NULL) as has_access_token,
       (gmail_refresh_token IS NOT NULL) as has_refresh_token
FROM profiles
WHERE gmail_email IS NOT NULL;
```

---

## Step 8: Production Deployment Checklist

Before going live, verify:

### ✅ Google Cloud Console
- [ ] OAuth consent screen is published (not in testing)
- [ ] Production redirect URIs are added
- [ ] Production JavaScript origins are added

### ✅ Supabase
- [ ] `GOOGLE_CLIENT_ID` secret is set
- [ ] `GOOGLE_CLIENT_SECRET` secret is set
- [ ] Edge functions are deployed
- [ ] Database migration is applied

### ✅ Frontend
- [ ] Production environment variables are set
- [ ] `VITE_GMAIL_REDIRECT_URI` points to production domain
- [ ] App is built and deployed

---

## Troubleshooting

### Issue: "OAuth error: redirect_uri_mismatch"
**Solution**:
- Verify redirect URI in Google Console exactly matches your app's URL
- No trailing slashes
- Protocol must match (http vs https)
- Port must match for localhost

### Issue: "Gmail not connected" error
**Solution**:
- Check Supabase secrets are set correctly
- Redeploy edge functions after adding secrets
- Check browser console for errors

### Issue: Token expired errors
**Solution**:
- Tokens auto-refresh automatically
- If issues persist, disconnect and reconnect Gmail account

### Issue: Email not sending
**Solution**:
- Check Supabase Edge Functions logs:
  ```bash
  supabase functions logs send-gmail
  ```
- Verify Gmail API is enabled in Google Cloud Console
- Check user has granted "Send email" permission

---

## Security Notes

### ✅ Best Practices
- ✅ Tokens are stored in Supabase (not browser)
- ✅ RLS (Row Level Security) protects user data
- ✅ Tokens auto-refresh before expiry
- ✅ Users can disconnect Gmail anytime

### ⚠️ Never Commit
- Client Secret
- Access tokens
- Refresh tokens
- `.env.local` file

### 🔒 Production Security
- Use HTTPS only in production
- Enable CORS properly
- Keep Supabase secrets updated
- Monitor for unusual activity

---

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check browser console for errors
3. Verify all environment variables
4. Review Google Cloud Console OAuth setup

For more help, refer to:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
