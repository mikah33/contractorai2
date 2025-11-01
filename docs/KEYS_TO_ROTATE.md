# API Keys That Need Rotation

**CRITICAL:** These keys were exposed in your `.env` file and must be rotated immediately before App Store submission.

---

## ⚠️ Keys Requiring IMMEDIATE Rotation

### 1. Supabase Service Role Key
**Status:** ❌ EXPOSED
**Risk Level:** CRITICAL
**Impact:** Full admin access to your database, can bypass Row Level Security

**How to Rotate:**
1. Go to: https://app.supabase.com/project/ujhgwcurllkkeouzwvgk/settings/api
2. Under "Service Role Key", click "Reset key"
3. Copy the new key to `.env.backup-KEEP-SAFE`
4. Upload to Supabase secrets: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<new_key>`

**Old Key (COMPROMISED):**
```
[REDACTED - Key has been rotated]
```

---

### 2. Stripe Secret Key (TEST MODE)
**Status:** ❌ EXPOSED
**Risk Level:** CRITICAL
**Impact:** Can create charges, refunds, and access customer payment data

**How to Rotate:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click "Create secret key"
3. Name it "ContractorAI Server Key"
4. Copy the new key to `.env.backup-KEEP-SAFE`
5. Delete the old key from Stripe dashboard
6. Upload to Supabase: `supabase secrets set STRIPE_SECRET_KEY=<new_key>`

**Old Key (COMPROMISED):**
```
[REDACTED - Key has been rotated]
```

**Note:** This is a TEST mode key. Before production, you'll also need to rotate your LIVE mode keys.

---

### 3. Google Ads Client Secret
**Status:** ❌ EXPOSED
**Risk Level:** HIGH
**Impact:** Can access Google Ads account and OAuth tokens

**How to Rotate:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Delete the existing secret
4. Generate a new secret
5. Copy to `.env.backup-KEEP-SAFE`
6. Upload to Supabase: `supabase secrets set GOOGLE_ADS_CLIENT_SECRET=<new_secret>`

**Old Secret (COMPROMISED):**
```
[REDACTED - Secret has been rotated]
```

---

### 4. Meta App Secret
**Status:** ❌ EXPOSED
**Risk Level:** HIGH
**Impact:** Can access Facebook/Instagram Ads account and OAuth tokens

**How to Rotate:**
1. Go to: https://developers.facebook.com/apps/779188654790108/settings/basic/
2. Under "App Secret", click "Reset"
3. Confirm the reset
4. Copy new secret to `.env.backup-KEEP-SAFE`
5. Upload to Supabase: `supabase secrets set META_APP_SECRET=<new_secret>`

**Old Secret (COMPROMISED):**
```
[REDACTED - Secret has been rotated]
```

---

## ✅ Keys That Are Safe (No Rotation Needed)

### Supabase Anon Key
**Status:** ✅ SAFE
**Reason:** Public key, protected by Row Level Security (RLS)

### Stripe Publishable Key
**Status:** ✅ SAFE
**Reason:** Meant to be public, can only create payment intents (not charge cards)

### Google Ads Client ID
**Status:** ✅ SAFE
**Reason:** Public OAuth client identifier

### Google API Key
**Status:** ✅ SAFE
**Reason:** Public API key with domain restrictions

### Meta App ID
**Status:** ✅ SAFE
**Reason:** Public app identifier

---

## Timeline

**Immediate (Today):**
- [x] Remove secrets from `.env` file ✅ COMPLETED
- [x] Add backup to `.env.backup-KEEP-SAFE` ✅ COMPLETED
- [ ] Rotate Stripe secret key
- [ ] Check Stripe dashboard for unauthorized charges

**Within 24 Hours:**
- [ ] Rotate Supabase service role key
- [ ] Rotate Google OAuth client secret
- [ ] Rotate Meta app secret
- [ ] Enable 2FA on all accounts (Stripe, Supabase, Google, Meta)

**Within 1 Week:**
- [ ] Set up Supabase Edge Functions (see `/docs/SECURE_API_KEYS_IMPLEMENTATION.md`)
- [ ] Move all secret key operations to backend
- [ ] Test payment flow through Edge Functions
- [ ] Test OAuth flows with new secrets

---

## Verification Steps

After rotating all keys:

1. **Test Stripe payments still work**
2. **Test Google OAuth login**
3. **Test Meta OAuth login**
4. **Check Supabase admin operations**
5. **Build iOS app and scan for secrets:**
   ```bash
   npm run build
   npx cap sync ios
   cd ios/App/App
   grep -r "sk_test" . # Should return NO results
   grep -r "service_role" . # Should return NO results
   ```

---

## Security Checklist

- [x] Secret keys removed from `.env`
- [x] `.env` added to `.gitignore`
- [x] Backup created in `.env.backup-KEEP-SAFE`
- [x] No secrets found in source code
- [ ] Stripe key rotated
- [ ] Supabase service key rotated
- [ ] Google client secret rotated
- [ ] Meta app secret rotated
- [ ] 2FA enabled on all accounts
- [ ] Edge Functions deployed
- [ ] iOS build verified clean

---

**Next Step:** Start rotating keys, beginning with Stripe (highest priority).
