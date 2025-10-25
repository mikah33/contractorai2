# Gmail OAuth Troubleshooting

## ❌ Error: "invalid_grant - Bad Request"

This is a common OAuth error that means the authorization code is no longer valid.

### Why This Happens:
- OAuth codes are **single-use only** - once used, they can't be reused
- Codes **expire in 10 minutes** - if you wait too long, they become invalid
- Previous authorization attempt may have failed partway through

### ✅ How to Fix:

**Simply try connecting again!** The next attempt will generate a fresh authorization code.

1. **Refresh your Settings page:**
   ```
   http://localhost:5173/settings
   ```

2. **Scroll to "Email Integration"**

3. **Click "Connect Gmail Account" again**
   - This will generate a NEW authorization code
   - The old code is discarded
   - Fresh start!

4. **Complete the OAuth flow:**
   - Sign in to Google
   - Click "Allow"
   - Wait for popup to close

---

## Other Common Errors:

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI doesn't match what's configured in Google Console

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Click your OAuth Client ID
3. Check "Authorized redirect URIs" includes:
   ```
   http://localhost:5173/gmail-oauth-callback
   ```
4. Save and try again

---

### Error: "Access blocked: This app's request is invalid"

**Cause**: You're not in the Test Users list

**Fix**:
1. Go to Google Cloud Console → OAuth consent screen
2. Scroll to "Test users"
3. Add your email address
4. Try again (may take 5 minutes to propagate)

---

### Error: "Gmail not connected" when sending email

**Cause**: Database columns weren't added or tokens weren't stored

**Fix**:
1. Run this SQL in Supabase:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name LIKE 'gmail%';
   ```
2. Should see 4 columns: gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email
3. If missing, run the migration again

---

### Error: Cross-Origin-Opener-Policy warnings

**What it is**: Browser console warnings about popup communication

**Impact**: None - these warnings are cosmetic and don't break functionality

**Ignore these** - they don't affect OAuth flow

---

## Quick Checklist:

Before trying again, verify:

- [ ] Database migration was applied (Gmail columns exist)
- [ ] Supabase secrets are set (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
- [ ] Edge functions were redeployed after adding secrets
- [ ] .env.local has VITE_GOOGLE_CLIENT_ID
- [ ] Dev server was restarted after updating .env.local
- [ ] You're in Google Cloud Console Test Users list

If all checked, just **try connecting again** - the new attempt will work!

---

## Still Having Issues?

### Check Edge Function Logs:

Open Supabase Dashboard → Edge Functions → gmail-oauth-callback → Logs

Look for:
- ✅ "🔐 Exchanging code for tokens..."
- ✅ "✅ Tokens received"
- ✅ "📧 Gmail email: your@email.com"
- ✅ "✅ Gmail connected successfully"

If you see errors, they'll show what went wrong.

---

## Success Looks Like:

1. Click "Connect Gmail Account"
2. Popup opens (Google sign-in page)
3. Sign in and click "Allow"
4. Popup closes automatically (within 2 seconds)
5. Settings page shows:
   ```
   ✅ Connected
   Emails will be sent from: your-email@gmail.com
   ```

That's it! Now you can send emails through Cindy using your Gmail.
