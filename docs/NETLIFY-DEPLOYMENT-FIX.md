# Netlify Secrets Scanning Fix

## The Problem
Netlify's secret scanner blocks deployment because it detects public frontend keys in the build output.

## The Solution
**Environment variables for secrets scanning MUST be set in Netlify UI, NOT in netlify.toml**

### Steps to Fix:

1. **Go to Netlify Dashboard**
   - Navigate to: Site Settings → Environment Variables

2. **Add this environment variable:**
   ```
   Key: SECRETS_SCAN_ENABLED
   Value: false
   Scope: All deploys (or Production only)
   ```

3. **Click "Save"**

4. **Clear Cache and Redeploy:**
   - Go to: Deploys → Options → Clear cache and retry deploy
   - Or: Trigger new deploy

### Alternative: Whitelist Specific Keys

Instead of disabling entirely, you can whitelist the public keys:

```
Key: SECRETS_SCAN_OMIT_KEYS
Value: VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,VITE_STRIPE_PUBLIC_KEY,VITE_GOOGLE_ADS_CLIENT_ID,VITE_META_APP_ID,STRIPE_PRICE_1_MONTH,STRIPE_PRICE_3_MONTHS,STRIPE_PRICE_1_YEAR
Scope: All deploys
```

## Why These Are Safe to Expose

All detected "secrets" are **public frontend keys**:
- `VITE_*` variables are meant to be in browser bundle
- Stripe public key and price IDs are meant to be visible
- Supabase anon key is protected by Row Level Security
- OAuth client IDs are public by design

Your **actual secrets** (STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY) are NOT in the bundle.

## Source
https://docs.netlify.com/manage/security/secret-scanning/
