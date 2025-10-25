# Gmail OAuth Integration Setup Guide

## Overview
This guide will help you set up Gmail OAuth so users can send emails through their own Gmail accounts via Cindy.

## Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or use existing)
   - Click "Select a project" → "New Project"
   - Name: "ContractorAI Gmail Integration"
   - Click "Create"

3. **Enable Gmail API**
   - In the left sidebar, go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "ContractorAI Web Client"

   **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   https://your-domain.com
   ```

   **Authorized redirect URIs:**
   ```
   http://localhost:5173/gmail-oauth-callback
   https://your-domain.com/gmail-oauth-callback
   ```

   - Click "Create"
   - **Save the Client ID and Client Secret** (you'll need these)

5. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - User Type: External
   - App name: "ContractorAI"
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Save and continue

## Step 2: Database Migration

Create a new migration to store OAuth tokens:

```sql
-- File: supabase/migrations/YYYYMMDD_add_gmail_oauth.sql

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gmail_email TEXT;

COMMENT ON COLUMN public.profiles.gmail_access_token IS 'Encrypted Gmail OAuth access token';
COMMENT ON COLUMN public.profiles.gmail_refresh_token IS 'Encrypted Gmail OAuth refresh token';
COMMENT ON COLUMN public.profiles.gmail_token_expiry IS 'When the access token expires';
COMMENT ON COLUMN public.profiles.gmail_email IS 'Connected Gmail email address';
```

## Step 3: Environment Variables

Add to your `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
VITE_GMAIL_REDIRECT_URI=http://localhost:5173/gmail-oauth-callback
```

Add to Supabase Edge Functions secrets:

```bash
supabase secrets set GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
supabase secrets set GOOGLE_CLIENT_SECRET="your-client-secret"
```

## Step 4: Implementation Files

The implementation consists of:

1. **Edge Functions:**
   - `supabase/functions/gmail-oauth-callback/index.ts` - Handles OAuth callback
   - `supabase/functions/send-gmail/index.ts` - Sends emails via Gmail API

2. **Frontend Components:**
   - Gmail connection button in Settings
   - OAuth popup handler
   - Updated Cindy email approval flow

3. **Routes:**
   - `/gmail-oauth-callback` - OAuth redirect handler

## Step 5: Deployment

1. **Run migration:**
   ```bash
   supabase db push
   ```

2. **Deploy edge functions:**
   ```bash
   supabase functions deploy gmail-oauth-callback
   supabase functions deploy send-gmail
   ```

3. **Update frontend environment variables**

## Security Notes

- ✅ Tokens are stored encrypted in the database
- ✅ Refresh tokens allow long-term access without re-authentication
- ✅ Access tokens expire after 1 hour and are auto-refreshed
- ✅ Users can revoke access at any time from their Google Account settings
- ✅ OAuth scopes are minimal (only send permission)

## Testing

1. Go to Settings → Connect Gmail
2. Click "Connect Gmail Account"
3. Authorize in popup
4. Draft an email with Cindy
5. Email should be sent from your Gmail account

## Troubleshooting

**Error: redirect_uri_mismatch**
- Check that your redirect URI in Google Console exactly matches the one in your app

**Error: access_denied**
- User declined authorization or app is not verified

**Error: invalid_grant**
- Refresh token expired or was revoked - user needs to reconnect
