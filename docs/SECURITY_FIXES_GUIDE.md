# Security Fixes Guide - URGENT

## 🚨 CRITICAL: API Keys Exposed - Immediate Action Required

### Step 1: Rotate ALL Exposed API Keys (TODAY)

#### Supabase
1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project: `ujhgwcurllkkeouzwvgk`
3. Settings → API → "Reset anon key" and "Reset service_role key"
4. Save new keys to secure password manager (1Password, LastPass, etc.)

#### Stripe
1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. Developers → API Keys
3. Click "Create secret key" for production
4. Delete old test key `sk_test_51Rq06lGcGCTrlHr7...`
5. Generate new keys for production

#### Google Ads
1. Go to Google Cloud Console: https://console.cloud.google.com
2. APIs & Services → Credentials
3. Delete current OAuth client ID `716912343285-0n9936g2gb6tko47no6p4qslu6n8e5vu`
4. Create new OAuth 2.0 Client ID
5. Update redirect URIs for production domain

#### Meta/Facebook
1. Go to Meta for Developers: https://developers.facebook.com
2. My Apps → Your App (779188654790108)
3. Settings → Basic → Reset App Secret
4. Generate new app secret

### Step 2: Remove Secrets from Client Code

#### Update .env to .env.example (Template Only)

```bash
# .env.example (SAFE - commit this)
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Stripe Configuration (TEST MODE for development)
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key_here

# Google Ads Configuration
VITE_GOOGLE_ADS_CLIENT_ID=your_client_id
VITE_GOOGLE_API_KEY=your_api_key

# Meta Ads Configuration
VITE_META_APP_ID=your_app_id
```

#### Create Environment-Specific Configuration

**File:** `src/config/environment.ts`
```typescript
// Client-safe configuration only
export const environment = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  stripe: {
    publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || '',
  },
  google: {
    clientId: import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID || '',
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
  },
  meta: {
    appId: import.meta.env.VITE_META_APP_ID || '',
  },
  production: import.meta.env.PROD,
};

// Validation - fail fast in development
if (!environment.supabase.url || !environment.supabase.anonKey) {
  throw new Error('Missing required environment variables');
}
```

### Step 3: Move Sensitive Operations to Backend

#### ❌ NEVER DO THIS (Client-Side Secret)
```typescript
// BAD - Secret key exposed in client code
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

#### ✅ CORRECT APPROACH (Backend Only)

**Supabase Edge Function:** `supabase/functions/create-payment-intent/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    const { amount, currency, customer } = await req.json();

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create payment intent with secret key (server-side only)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer,
      automatic_payment_methods: { enabled: true },
    });

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**Client-Side Call:**
```typescript
// SAFE - Only public key and client secret exposed
const response = await supabase.functions.invoke('create-payment-intent', {
  body: { amount: 2499, currency: 'usd', customer: customerId },
});

const { clientSecret } = await response.data;
const stripe = await loadStripe(environment.stripe.publicKey);
// Use clientSecret with Stripe Elements
```

### Step 4: Configure Secrets in Production

#### For Supabase Edge Functions
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add secrets:
   ```
   STRIPE_SECRET_KEY=sk_live_your_production_key
   OPENAI_API_KEY=sk-your-openai-key
   GOOGLE_ADS_CLIENT_SECRET=your-secret
   META_APP_SECRET=your-secret
   ```

#### For iOS Build (Capacitor)
**File:** `capacitor.config.ts`
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elevatedsystems.contractorai',
  appName: 'ContractorAI',
  webDir: 'dist',
  server: {
    // Only public configuration here
    androidScheme: 'https',
    iosScheme: 'https',
  },
};

export default config;
```

**Environment Injection at Build Time:**

**File:** `scripts/inject-env-ios.sh`
```bash
#!/bin/bash

# Create environment-specific config
cat > src/config/build-env.ts << EOF
export const BUILD_ENV = {
  SUPABASE_URL: '${VITE_SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${VITE_SUPABASE_ANON_KEY}',
  STRIPE_PUBLIC_KEY: '${VITE_STRIPE_PUBLIC_KEY}',
  // Only public keys here!
};
EOF
```

**Package.json script:**
```json
{
  "scripts": {
    "build:ios": "npm run inject-env && vite build && npx cap sync ios",
    "inject-env": "bash scripts/inject-env-ios.sh"
  }
}
```

### Step 5: Verify No Secrets Exposed

```bash
# Search for common secret patterns
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Check for API keys in code
grep -r "sk_live\|sk_test\|SECRET\|service_role" src/

# Check for hardcoded credentials
grep -r "password.*=\|apiKey.*=\|secret.*=" src/

# Verify .env is gitignored
git ls-files | grep "\.env$"
# Should return NOTHING (file should not be tracked)

# Check what would be committed
git status --ignored
```

### Step 6: Git Cleanup (Remove Exposed Secrets from History)

```bash
# If .env was committed to git, remove from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: coordinate with team)
git push origin --force --all
git push origin --force --tags
```

### Step 7: Production Build Configuration

**File:** `vite.config.ts`
```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Only expose VITE_ prefixed variables
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_STRIPE_PUBLIC_KEY': JSON.stringify(env.VITE_STRIPE_PUBLIC_KEY),
    },
    build: {
      sourcemap: false, // Don't expose source maps in production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // Remove console.log in production
          drop_debugger: true,
        },
      },
    },
  };
});
```

### Step 8: Security Audit Checklist

- [ ] All API keys rotated
- [ ] No secrets in client-side code
- [ ] Secrets configured in Supabase Edge Functions
- [ ] .env removed from git history
- [ ] .gitignore includes .env, .env.local, .env.production
- [ ] Build process doesn't expose secrets
- [ ] Source maps disabled in production
- [ ] Console logs removed from production builds
- [ ] Environment validation added
- [ ] Documentation updated with new setup process

### Step 9: Set Up Environment Variables for iOS

**File:** `ios/App/App/config.xcconfig`
```
// Do NOT commit actual values, use build-time injection
SUPABASE_URL = ${SUPABASE_URL}
STRIPE_PUBLIC_KEY = ${STRIPE_PUBLIC_KEY}
```

**Alternative: Use Capacitor Preferences Plugin**
```typescript
import { Preferences } from '@capacitor/preferences';

// Set at app initialization (from secure remote config)
await Preferences.set({
  key: 'api_endpoint',
  value: environment.supabase.url,
});
```

## Testing Security Fixes

```bash
# 1. Build production version
npm run build

# 2. Search built files for secrets
grep -r "sk_test\|sk_live\|service_role\|eyJhbGci" dist/

# Should return NOTHING!

# 3. Verify environment variables work
npm run dev
# Check browser console - no errors about missing env vars

# 4. Test Edge Functions
npx supabase functions serve
# Test all functions that use secrets
```

## Emergency Rollout Plan

If secrets are already exposed in production:

1. **Immediate (15 minutes):**
   - Rotate ALL API keys
   - Revoke old keys completely
   - Monitor for unauthorized usage

2. **Within 1 hour:**
   - Review Stripe dashboard for suspicious transactions
   - Check Supabase logs for unauthorized access
   - Enable 2FA on all service accounts

3. **Within 24 hours:**
   - Implement all security fixes above
   - Deploy new build with fixes
   - Security audit of all systems

4. **Within 1 week:**
   - Review access logs for all services
   - Implement additional monitoring
   - Document incident and prevention measures

## Questions?

**Q: Can I use VITE_ prefixed environment variables?**
A: YES - But ONLY for PUBLIC values (API URLs, public keys). Never for secrets.

**Q: Where should API secrets live?**
A: ONLY in Supabase Edge Functions environment variables, never in client code.

**Q: How do I test with production keys locally?**
A: Use separate test/staging environment. Never use production keys in development.

**Q: What about CI/CD?**
A: Use GitHub Secrets, never commit to repository.
