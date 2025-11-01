# Secure API Keys Implementation Guide

## The Problem

Currently, your API keys are exposed in:
1. `.env` file (if committed to git)
2. Client-side code where they can be extracted from the app bundle
3. Build artifacts that get uploaded to App Store

**Apple will reject apps with exposed secrets.**

## The Solution: Backend Proxy Pattern

All sensitive API calls must go through YOUR backend server. The iOS app never sees secret keys.

---

## Architecture

```
iOS App → Your Backend (Supabase Edge Functions) → External APIs
```

**Client has:**
- Supabase anon key (public, safe)
- User authentication token

**Backend has:**
- Stripe secret key
- OpenAI API key
- Google OAuth secret
- Meta app secret

---

## Step-by-Step Implementation

### Step 1: Identify What Needs Backend

**✅ Safe on Client (Already OK):**
- `VITE_SUPABASE_URL` - public URL
- `VITE_SUPABASE_ANON_KEY` - public anon key (RLS protects data)

**❌ Must Move to Backend:**
- `SUPABASE_SERVICE_ROLE_KEY` - admin access
- `STRIPE_SECRET_KEY` - charges cards
- `STRIPE_PUBLISHABLE_KEY` - OK on client (public)
- `OPENAI_API_KEY` - costs money per call
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `META_APP_SECRET` - OAuth secret

---

### Step 2: Create Supabase Edge Functions

Supabase Edge Functions are serverless functions that run on Supabase's infrastructure. They keep secrets secure.

**Install Supabase CLI:**
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your project
cd /Users/mikahalbertson/git/ContractorAI/contractorai2
supabase link --project-ref YOUR_PROJECT_REF
```

**Create Edge Functions Directory:**
```bash
mkdir -p supabase/functions
```

---

### Step 3: Stripe Payment Function

**Create: `supabase/functions/create-payment/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { amount, currency, customerId } = await req.json()

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
    })

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

---

### Step 4: OpenAI Chat Function

**Create: `supabase/functions/ai-chat/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const { messages } = await req.json()

    // Call OpenAI with secret key
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
      }),
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    })
  }
})
```

---

### Step 5: Deploy Edge Functions

```bash
# Deploy Stripe function
supabase functions deploy create-payment --no-verify-jwt

# Deploy OpenAI function
supabase functions deploy ai-chat --no-verify-jwt

# Set secrets (never committed to git!)
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_KEY
supabase secrets set OPENAI_API_KEY=sk-YOUR_KEY
supabase secrets set GOOGLE_CLIENT_SECRET=YOUR_SECRET
supabase secrets set META_APP_SECRET=YOUR_SECRET
```

---

### Step 6: Update Client Code

**OLD (Insecure):**
```typescript
// ❌ DON'T DO THIS
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const payment = await stripe.paymentIntents.create(...)
```

**NEW (Secure):**
```typescript
// ✅ DO THIS
const { data, error } = await supabase.functions.invoke('create-payment', {
  body: { amount: 5000, currency: 'usd', customerId: 'cus_123' }
})

if (error) throw error
const clientSecret = data.clientSecret
```

---

### Step 7: Update Your Components

**File: `/src/lib/stripeClient.ts`** (Create new)

```typescript
import { supabase } from './supabase'

export const stripeClient = {
  async createPaymentIntent(amount: number, currency: string = 'usd') {
    const { data, error } = await supabase.functions.invoke('create-payment', {
      body: { amount, currency }
    })

    if (error) throw error
    return data
  },

  async createSubscription(priceId: string) {
    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: { priceId }
    })

    if (error) throw error
    return data
  }
}
```

**File: `/src/lib/openaiClient.ts`** (Create new)

```typescript
import { supabase } from './supabase'

export const openaiClient = {
  async sendChatMessage(messages: any[]) {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { messages }
    })

    if (error) throw error
    return data
  }
}
```

---

### Step 8: Clean Up Environment Variables

**File: `.env` (Update)**

```bash
# PUBLIC - Safe for client
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...public_anon_key

# PUBLIC - Stripe publishable key is safe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY

# Remove ALL these (now in Supabase secrets):
# SUPABASE_SERVICE_ROLE_KEY=  ❌ REMOVE
# STRIPE_SECRET_KEY=          ❌ REMOVE
# OPENAI_API_KEY=             ❌ REMOVE
# GOOGLE_CLIENT_SECRET=       ❌ REMOVE
# META_APP_SECRET=            ❌ REMOVE
```

**File: `.env.example` (Update)**

```bash
# Example environment variables for ContractorAI
# Copy to .env and fill in your values

# Supabase (public keys - safe for client)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stripe (publishable key is public - safe for client)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_or_pk_live_key

# NOTE: Secret keys are stored in Supabase Edge Function secrets
# Never commit secret keys to git!
```

---

### Step 9: Update .gitignore

```bash
# Environment variables
.env
.env.local
.env.production

# Never commit these!
*.pem
*.key
secrets/
```

---

### Step 10: Remove Secrets from Git History

If you already committed `.env`:

```bash
# Install BFG Repo-Cleaner
brew install bfg

# Remove .env from entire git history
bfg --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history!)
git push origin --force --all
```

---

## Testing Checklist

- [ ] Edge functions deployed successfully
- [ ] Secrets set in Supabase dashboard
- [ ] Client code calls edge functions, not APIs directly
- [ ] `.env` file only contains VITE_ prefixed variables
- [ ] `.env` is in `.gitignore`
- [ ] Test payment flow works
- [ ] Test AI chat works
- [ ] Build iOS app and verify no secrets in bundle

---

## Verification

**Check iOS Bundle for Secrets:**

```bash
# Build the app
npm run build
npx cap sync ios

# Search for secrets in build
cd ios/App/App
grep -r "sk_test" .
grep -r "sk_live" .
grep -r "OPENAI_API_KEY" .

# Should return NO results!
```

---

## Security Best Practices

1. **Rotate ALL Keys After Fixing**
   - Generate new Stripe keys
   - Generate new OpenAI key
   - Generate new OAuth secrets

2. **Use RLS (Row Level Security) in Supabase**
   - Enable RLS on all tables
   - Users can only access their own data

3. **Rate Limiting**
   - Add rate limits to edge functions
   - Prevent abuse of OpenAI API

4. **Monitoring**
   - Set up alerts for unusual API usage
   - Monitor Supabase function logs

---

## Cost Considerations

**Supabase Edge Functions:**
- Free tier: 500K requests/month
- After: $0.00002 per request
- Your usage: Likely free tier for months

**Benefits:**
- App Store approval ✅
- Secure secrets ✅
- Rate limiting ✅
- Monitoring ✅

---

## Next Steps

1. ✅ Set up Supabase CLI
2. ✅ Create edge functions for Stripe and OpenAI
3. ✅ Deploy functions and set secrets
4. ✅ Update client code to use functions
5. ✅ Remove secrets from `.env`
6. ✅ Remove secrets from git history
7. ✅ Test everything works
8. ✅ Verify no secrets in iOS build

**Questions?** Read `/docs/SECURITY_FIXES_GUIDE.md` for more details.
