# Quick Security Fix (30 Minutes)

This is the FASTEST way to secure your API keys for App Store submission.

---

## Option 1: Environment Variables Only (Quick Fix)

This gets you to submission, but isn't perfect long-term.

### 1. Check Current .env File

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2
cat .env
```

### 2. Update .env - Remove Secrets

**Keep ONLY these (public keys are safe):**

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...your_publishable_key
```

**Remove EVERYTHING else** (move to secure backend later):
- ❌ SUPABASE_SERVICE_ROLE_KEY
- ❌ STRIPE_SECRET_KEY
- ❌ OPENAI_API_KEY
- ❌ GOOGLE_CLIENT_SECRET
- ❌ META_APP_SECRET

### 3. Add .env to .gitignore

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### 4. Remove from Git History (CRITICAL!)

```bash
# Remove .env from git if it was committed
git rm --cached .env
git commit -m "Remove .env from git"

# If .env was committed before, clean history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (rewrites history - be careful!)
git push origin --force --all
```

### 5. Rotate ALL Keys (MANDATORY!)

Since keys were exposed, generate new ones:

**Supabase:**
1. Go to https://app.supabase.com
2. Project Settings → API
3. Click "Generate New Anon Key" (if needed)
4. Copy new keys to `.env`

**Stripe:**
1. Go to https://dashboard.stripe.com/apikeys
2. Create new secret key
3. Delete old exposed key
4. Update your backend (not client!)

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create new key
3. Delete old exposed key
4. Update your backend

---

## Option 2: Backend Proxy (Proper Solution - 2 hours)

Follow the full guide: `SECURE_API_KEYS_IMPLEMENTATION.md`

---

## Immediate Action Checklist

- [ ] Update .env to only public keys
- [ ] Add .env to .gitignore
- [ ] Remove .env from git history
- [ ] Rotate Supabase anon key (if exposed)
- [ ] Rotate Stripe secret key
- [ ] Rotate OpenAI API key
- [ ] Rotate Google OAuth secret
- [ ] Rotate Meta app secret
- [ ] Verify no secrets in code with grep
- [ ] Build iOS app and check for secrets

---

## Verify No Secrets in Code

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Search for potential secrets
grep -r "sk_test" src/
grep -r "sk_live" src/
grep -r "service_role" src/
grep -r "client_secret" src/

# Should return NO results!
```

---

## For App Store Submission (Minimum)

Apple's automated scan looks for:
- Hardcoded API keys
- Secret keys in bundle
- Credentials in code

**To pass scan:**
1. No hardcoded secrets in source code ✅
2. .env not included in build ✅
3. Only public keys (VITE_ prefix) in client ✅

**This gets you approved.** Then implement proper backend proxy.

---

## After App Store Approval

Move sensitive operations to backend:
- Stripe payments → Edge function
- OpenAI calls → Edge function
- Admin operations → Edge function

See: `SECURE_API_KEYS_IMPLEMENTATION.md`

---

## What You Can Keep in Client

**✅ Safe for Client (iOS App):**
- Supabase URL
- Supabase Anon Key (protected by RLS)
- Stripe Publishable Key (meant to be public)
- Any VITE_ prefixed variables

**❌ Never in Client:**
- Service role keys
- Secret keys
- Admin keys
- API keys that cost money per call

---

## Emergency Contacts

**If keys were exposed publicly:**
1. Rotate immediately (5 minutes each)
2. Check Stripe for unauthorized charges
3. Check OpenAI for unusual usage
4. Enable 2FA on all accounts

**Timeline:**
- Keys rotation: 15 minutes
- Code cleanup: 10 minutes
- Git history cleanup: 5 minutes
- Verification: 5 minutes
- **Total: 35 minutes**

---

**Start here, then read full implementation guide.**
