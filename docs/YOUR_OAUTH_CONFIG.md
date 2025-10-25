# Your OAuth Configuration - ContractorAI.tools

## Quick Reference for YOUR Setup

Your production domain: **contractorai.tools**

---

## Step 1: Google Cloud Console OAuth Setup

### OAuth Consent Screen Configuration

#### App Information:
- **App name**: `ContractorAI`
- **User support email**: Your email
- **Application home page**: `https://contractorai.tools`
- **Privacy policy**: `https://contractorai.tools/privacy`
- **Terms of service**: `https://contractorai.tools/terms`

#### Authorized Domains:
Add these two domains (one at a time):
```
contractorai.tools
supabase.co
```

---

### OAuth Client ID Configuration

#### Authorized JavaScript Origins:
Click "+ ADD URI" for each:

**Local Development**:
```
http://localhost:5173
```

**Production**:
```
https://contractorai.tools
```

#### Authorized Redirect URIs:
Click "+ ADD URI" for each:

**Local Development**:
```
http://localhost:5173/gmail-oauth-callback
```

**Production**:
```
https://contractorai.tools/gmail-oauth-callback
```

---

## Step 2: Supabase Edge Functions Secrets

Go to: https://supabase.com/dashboard → Your Project → Edge Functions → Manage secrets

Add these two secrets:

**Secret 1:**
```
Name: GOOGLE_CLIENT_ID
Value: [YOUR_CLIENT_ID].apps.googleusercontent.com
```

**Secret 2:**
```
Name: GOOGLE_CLIENT_SECRET
Value: GOCSPX-[YOUR_CLIENT_SECRET]
```

Then redeploy:
```bash
supabase functions deploy gmail-oauth-callback
supabase functions deploy send-gmail
```

---

## Step 3: Local Environment (.env.local)

Create/update your `.env.local` file:

```bash
# Supabase
VITE_SUPABASE_URL=https://ujhgwcurllkkeouzwvgk.supabase.co
VITE_SUPABASE_ANON_KEY=[your_anon_key]

# Google OAuth - Gmail Integration
VITE_GOOGLE_CLIENT_ID=[YOUR_CLIENT_ID].apps.googleusercontent.com
VITE_GMAIL_REDIRECT_URI=http://localhost:5173/gmail-oauth-callback
```

---

## Step 4: Production Environment Variables

For your production deployment (Netlify/Vercel/etc):

```bash
VITE_GOOGLE_CLIENT_ID=[YOUR_CLIENT_ID].apps.googleusercontent.com
VITE_GMAIL_REDIRECT_URI=https://contractorai.tools/gmail-oauth-callback
```

---

## Complete Checklist

### Google Cloud Console:
- [ ] Project created: "ContractorAI"
- [ ] Gmail API enabled
- [ ] OAuth consent screen configured with:
  - [ ] App name: ContractorAI
  - [ ] Authorized domains: `contractorai.tools` and `supabase.co`
  - [ ] Scopes: gmail.send and userinfo.email
  - [ ] Test users: Your email added
- [ ] OAuth Client ID created with:
  - [ ] JavaScript origins: `http://localhost:5173` and `https://contractorai.tools`
  - [ ] Redirect URIs:
    - [ ] `http://localhost:5173/gmail-oauth-callback`
    - [ ] `https://contractorai.tools/gmail-oauth-callback`
- [ ] Client ID and Secret copied

### Supabase:
- [ ] `GOOGLE_CLIENT_ID` secret added
- [ ] `GOOGLE_CLIENT_SECRET` secret added
- [ ] Edge functions redeployed

### Local Development:
- [ ] `.env.local` updated with Client ID
- [ ] `.env.local` has local redirect URI
- [ ] Dev server restarted

### Production:
- [ ] Production env vars set with Client ID
- [ ] Production env vars have production redirect URI
- [ ] App deployed

---

## Test URLs

### Local Testing:
```
http://localhost:5173/settings
```
Go to Email Integration → Connect Gmail

### Production Testing:
```
https://contractorai.tools/settings
```
Go to Email Integration → Connect Gmail

---

## Important URLs Summary

| Purpose | URL |
|---------|-----|
| **Local App** | `http://localhost:5173` |
| **Local OAuth Callback** | `http://localhost:5173/gmail-oauth-callback` |
| **Production App** | `https://contractorai.tools` |
| **Production OAuth Callback** | `https://contractorai.tools/gmail-oauth-callback` |
| **Google Cloud Console** | `https://console.cloud.google.com/` |
| **Supabase Dashboard** | `https://supabase.com/dashboard` |

---

## After Setup - How to Use

1. **User goes to Settings**
   ```
   https://contractorai.tools/settings
   ```

2. **Scrolls to "Email Integration" section**

3. **Clicks "Connect Gmail Account"**
   - OAuth popup opens
   - User signs in with Google
   - Grants permissions
   - Popup closes automatically

4. **User goes to Cindy CRM**
   ```
   https://contractorai.tools/cindy-crm
   ```

5. **Asks Cindy to draft an email**
   ```
   "Draft an email to john@example.com about our new deck installation services"
   ```

6. **Cindy drafts the email**
   - User reviews it
   - Clicks "Send Email"
   - Email sends through their connected Gmail!

---

## Troubleshooting

### "redirect_uri_mismatch" Error
**Check**:
- Authorized Redirect URIs must include: `https://contractorai.tools/gmail-oauth-callback`
- No trailing slash
- Exact match required

### "Access blocked" Error
**Fix**:
- Add your email to Test Users in OAuth consent screen
- Wait 5 minutes for changes to propagate

### "Client ID not found"
**Fix**:
- Double-check you copied the full Client ID
- Should end in `.apps.googleusercontent.com`

---

## Quick Commands

### Deploy Edge Functions:
```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2
supabase functions deploy gmail-oauth-callback
supabase functions deploy send-gmail
```

### Restart Dev Server:
```bash
npm run dev
```

### Check Logs:
```bash
supabase functions logs send-gmail --follow
```

---

## Security Notes

✅ **Safe to commit**:
- `.env.example` (with placeholder values)
- OAuth configuration guides

❌ **NEVER commit**:
- `.env.local` (in .gitignore)
- Client Secret
- Access tokens
- Refresh tokens

---

You're all set! Follow the checklist above and you'll have Gmail OAuth working on both local and production.
