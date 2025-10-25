# Netlify Deployment Steps for contractorai.tools

## ✅ Status: Code is Pushed to GitHub

Your latest changes (including Cindy CRM and Gmail OAuth) are now on GitHub.

Netlify should be auto-deploying them right now!

---

## Step 1: Check Deployment Status

### Go to Netlify Dashboard:
```
https://app.netlify.com/
```

### What to Look For:

1. **Find your site** (probably named "contractorai2" or similar)

2. **Check deployment status:**
   - 🟡 **Yellow/Building** = Deployment in progress (wait 2-5 minutes)
   - ✅ **Green/Published** = Deployment complete
   - ❌ **Red/Failed** = Deployment error (check logs)

3. **Look at "Production deploys"** section:
   - Should show latest commit: `9bc367d - Add Gmail OAuth integration and Cindy AI CRM chatbot`
   - If you see this commit, the deployment is happening or done!

---

## Step 2: Add Production Environment Variables (CRITICAL!)

**BEFORE** the deployment finishes, add these environment variables:

### Go to Site Settings:
1. Click your site in Netlify dashboard
2. Click **"Site configuration"** → **"Environment variables"**
3. Click **"Add a variable"** → **"Add a single variable"**

### Add These Variables:

**Variable 1: Google Client ID**
- **Key**: `VITE_GOOGLE_CLIENT_ID`
- **Value**: `244912967505-80c3fhnvgiedfti5mutmlisqk17nugl4.apps.googleusercontent.com`
- Click **"Create variable"**

**Variable 2: Gmail Redirect URI**
- **Key**: `VITE_GMAIL_REDIRECT_URI`
- **Value**: `https://contractorai.tools/gmail-oauth-callback`
- Click **"Create variable"**

### Verify Existing Variables:

Make sure these are already set (they should be):
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`

---

## Step 3: Trigger Redeploy (If Needed)

If the deployment finished BEFORE you added the environment variables:

1. Go to **"Deploys"** tab
2. Click **"Trigger deploy"** dropdown
3. Select **"Clear cache and deploy site"**
4. Wait 2-5 minutes for rebuild

This ensures the new environment variables are included in the build.

---

## Step 4: Verify Deployment

After deployment is complete (green checkmark):

### Test 1: Check Cindy is Available
```
https://contractorai.tools/ai-team
```

**Expected:**
- ✅ Cindy card shows **"Talk to Cindy"** button
- ❌ NO "Under Construction" badge

### Test 2: Open Cindy CRM
```
https://contractorai.tools/cindy-crm
```

**Expected:**
- ✅ Cindy chat interface loads
- ✅ Can ask questions and get responses
- ✅ Quick Info sidebar shows stats

### Test 3: Gmail OAuth (After connecting)
```
https://contractorai.tools/settings
```

**Expected:**
- ✅ "Email Integration" section visible
- ✅ "Connect Gmail Account" button works
- ✅ OAuth popup opens with production redirect

---

## Troubleshooting

### Issue: Deployment is "Building" for over 10 minutes
**Fix:**
1. Click on the deployment
2. Check "Deploy log" for errors
3. Common issues:
   - TypeScript errors
   - Missing dependencies
   - Build timeout

### Issue: Deployment Failed
**Fix:**
1. Click on failed deployment
2. Read the error log (scroll to red text)
3. Usually shows specific error
4. Common fixes:
   - Missing environment variables
   - Node version mismatch
   - Build command issues

### Issue: Cindy still shows "Under Construction"
**Cause:** Browser cache or old deployment

**Fix:**
1. Hard refresh: Ctrl+Shift+F5 (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Verify deployment timestamp matches your push time
4. Check deployed commit matches GitHub (9bc367d)

### Issue: Gmail OAuth fails with redirect_uri_mismatch
**Cause:** Environment variable not set correctly

**Fix:**
1. Verify `VITE_GMAIL_REDIRECT_URI` in Netlify settings
2. Should be exactly: `https://contractorai.tools/gmail-oauth-callback`
3. No trailing slash
4. Redeploy after fixing

---

## Quick Reference

### Netlify Dashboard URLs:

**Main Dashboard:**
```
https://app.netlify.com/
```

**Site Settings (Replace [site-id] with your site ID):**
```
https://app.netlify.com/sites/[site-id]/configuration/env
```

**Deploys:**
```
https://app.netlify.com/sites/[site-id]/deploys
```

---

## Deployment Timeline

**Normal deployment takes:**
- ⏱️ **2-5 minutes** total
- 30 seconds: Install dependencies
- 1-2 minutes: Build React app
- 30 seconds: Upload to CDN
- 1 minute: Propagation

**You should see Cindy working within 5 minutes of pushing to GitHub!**

---

## Need Help?

If deployment fails or Cindy isn't showing up after 10 minutes:

1. Check Netlify deploy logs for specific errors
2. Verify environment variables are set correctly
3. Make sure commit 9bc367d is deployed
4. Try clearing browser cache

Let me know what you see in the Netlify dashboard and I can help troubleshoot! 🚀
