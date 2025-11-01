# OAuth Configuration - Detailed Walkthrough

## Part 1: Access Google Cloud Console

### Step 1: Go to Google Cloud Console
1. Open your browser
2. Go to: **https://console.cloud.google.com/**
3. Sign in with your Google account (the one you want to manage the app)

### Step 2: Create or Select Project
**Look at the top bar** - you'll see a dropdown that says "Select a project"

**Option A: Create New Project**
1. Click the dropdown → Click **"NEW PROJECT"**
2. Fill in:
   - **Project name**: `ContractorAI` (or whatever you want)
   - **Organization**: Leave as "No organization" (unless you have Google Workspace)
   - **Location**: Leave as default
3. Click **"CREATE"**
4. Wait 10-30 seconds for project creation
5. You'll see a notification when done

**Option B: Use Existing Project**
1. Click the dropdown
2. Select your existing project from the list

---

## Part 2: Enable Gmail API

### Step 3: Open API Library
1. Look at the **left sidebar** (hamburger menu if collapsed)
2. Find **"APIs & Services"** section
3. Click **"Library"**

### Step 4: Enable Gmail API
1. You'll see the API Library page with search bar
2. In the search box, type: `Gmail API`
3. Click on the **"Gmail API"** card (should be first result)
4. Click the blue **"ENABLE"** button
5. Wait a few seconds - you'll see "API enabled" message

---

## Part 3: Configure OAuth Consent Screen

### Step 5: Start OAuth Consent Screen Setup
1. In **left sidebar**, click **"APIs & Services"** → **"OAuth consent screen"**
2. You'll see two options: **Internal** or **External**

**Choose "External"**:
- Select the **"External"** radio button
- Click **"CREATE"** button

*(Note: "Internal" only works if you have Google Workspace)*

---

### Step 6: OAuth Consent Screen - Page 1 (App Information)

You'll see a form with multiple sections. Fill it out exactly:

#### **App Information Section**

**App name** (Required):
```
ContractorAI
```
*This is what users see when they authorize*

**User support email** (Required):
- Click the dropdown
- Select your email address

**App logo** (Optional):
- Click "Choose File" if you want to upload a logo
- Recommended: 120x120 pixels PNG
- Skip if you don't have one ready

#### **App Domain Section**

**Application home page**:
```
https://your-domain.com
```
*Replace with your actual domain. For testing, you can use: http://localhost:5173*

**Application privacy policy link**:
```
https://your-domain.com/privacy
```
*You'll need to create this page on your site*

**Application terms of service link**:
```
https://your-domain.com/terms
```
*You'll need to create this page on your site*

#### **Authorized Domains Section**

Click **"+ ADD DOMAIN"** and add these one by one:

1. First domain:
```
supabase.co
```
*(Required for Supabase Edge Functions)*

2. Second domain (if you have a custom domain):
```
your-domain.com
```
*(Without https:// or www)*

**For localhost testing**: You don't need to add localhost here

#### **Developer Contact Information Section**

**Email addresses** (Required):
- Enter your email address
- You can add multiple emails separated by commas

**Example**:
```
youremail@gmail.com
```

---

**When done with this page**:
- Click **"SAVE AND CONTINUE"** at bottom

---

### Step 7: OAuth Consent Screen - Page 2 (Scopes)

This page defines what permissions your app needs.

#### **Add Scopes**

1. Click the **"ADD OR REMOVE SCOPES"** button
2. You'll see a sidebar panel open with lots of options

#### **Filter and Select Scopes**

In the **"Filter"** search box at the top, type:
```
gmail.send
```

3. Find and **CHECK** these two scopes:

   **Scope 1**:
   ```
   .../auth/gmail.send
   ```
   Description: "Send email on your behalf"

   **Scope 2** - Also search for:
   ```
   userinfo.email
   ```
   Then check:
   ```
   .../auth/userinfo.email
   ```
   Description: "See your primary Google Account email address"

4. You should now have **2 scopes selected**

5. Scroll to bottom of the sidebar panel
6. Click **"UPDATE"**

7. Back on main page, click **"SAVE AND CONTINUE"**

---

### Step 8: OAuth Consent Screen - Page 3 (Test Users)

While your app is in "Testing" mode, only specific users can authorize it.

#### **Add Test Users**

1. Click **"+ ADD USERS"** button
2. A text box appears
3. Add your email addresses (one per line):

```
your-email@gmail.com
your-other-email@gmail.com
team-member@example.com
```

4. Click **"ADD"**
5. You'll see the emails listed in the table
6. Click **"SAVE AND CONTINUE"**

**Important**: Only these users can test until you publish the app!

---

### Step 9: OAuth Consent Screen - Page 4 (Summary)

1. Review all the information you entered
2. Check for any errors or missing fields
3. If everything looks good, click **"BACK TO DASHBOARD"**

**You'll see a warning banner**: "Your app is in testing mode"
- This is normal for development
- You'll publish it later for production

---

## Part 4: Create OAuth Credentials

### Step 10: Navigate to Credentials
1. In **left sidebar**, click **"APIs & Services"** → **"Credentials"**
2. You'll see the credentials page (might be empty)

### Step 11: Create OAuth Client ID
1. At the top, click **"+ CREATE CREDENTIALS"**
2. Select **"OAuth client ID"** from dropdown

### Step 12: Configure Application Type
1. **Application type**: Select **"Web application"** from dropdown

2. **Name** field:
```
ContractorAI Web Client
```
*This is just for your reference*

---

### Step 13: Add Authorized JavaScript Origins

This tells Google which domains can initiate OAuth.

Click **"+ ADD URI"** under "Authorized JavaScript origins"

**For Local Development**, add:
```
http://localhost:5173
```
*(Make sure it's http, not https)*

**For Production**, add:
```
https://your-production-domain.com
```
*(Replace with your actual domain)*

You can add both! Just click "+ ADD URI" multiple times.

---

### Step 14: Add Authorized Redirect URIs

This is where Google sends users after they authorize.

Click **"+ ADD URI"** under "Authorized redirect URIs"

**For Local Development**, add:
```
http://localhost:5173/gmail-oauth-callback
```

**For Production**, add:
```
https://your-production-domain.com/gmail-oauth-callback
```

**IMPORTANT**:
- Must match EXACTLY
- Include `/gmail-oauth-callback` at the end
- No trailing slashes
- Check http vs https

---

### Step 15: Create and Save Credentials

1. Click **"CREATE"** button at bottom
2. A popup appears with your credentials

**CRITICAL - COPY THESE NOW**:

You'll see two values:

**Your Client ID**:
```
1234567890-abcdefghijklmnop.apps.googleusercontent.com
```
- Click the copy icon
- Save it somewhere safe (Notes app, password manager)

**Your Client Secret**:
```
GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
```
- Click the copy icon
- Save it somewhere safe

3. Click **"OK"** to close the popup

**⚠️ IMPORTANT**: These are secrets! Never:
- Commit them to Git
- Share them publicly
- Post them in forums/Discord

---

## Part 5: What You Should Have Now

After completing OAuth configuration, you should have:

✅ Gmail API enabled
✅ OAuth consent screen configured
✅ Test users added
✅ OAuth Client ID created
✅ Two values copied:
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`

---

## Next Steps

Now that OAuth is configured, you need to:

1. **Add credentials to Supabase** (Step 2 in main guide)
2. **Add to .env.local file** (Step 3 in main guide)
3. **Test the integration** (Step 4 in main guide)

Go back to `/docs/GMAIL_SETUP_STEPS.md` and start at **Step 4: Add Credentials to Supabase**

---

## Common Issues & Solutions

### Issue: "Authorized redirect URI mismatch"
**Cause**: Redirect URI doesn't match exactly

**Solution**:
1. Go back to Credentials page
2. Click your OAuth Client ID
3. Check "Authorized redirect URIs"
4. Make sure it's EXACTLY: `http://localhost:5173/gmail-oauth-callback`
5. No spaces, no trailing slash
6. Save changes

### Issue: "Access blocked: Authorization Error"
**Cause**: You're not in the test users list

**Solution**:
1. Go to "OAuth consent screen"
2. Click "Test users" section
3. Add your email address
4. Try again

### Issue: "The OAuth client was not found"
**Cause**: Wrong Client ID or project

**Solution**:
1. Go to "Credentials" page
2. Click your OAuth Client ID
3. Copy the Client ID again
4. Make sure you're using the right project

### Issue: Can't find "OAuth consent screen" menu
**Cause**: Project not selected or API not enabled

**Solution**:
1. Check project dropdown at top - make sure project is selected
2. Go to "APIs & Services" → "Library"
3. Enable Gmail API first
4. Then try OAuth consent screen again

---

## Visual Checklist

Before moving on, verify:

### In Google Cloud Console:
- [ ] Project created/selected
- [ ] Gmail API is enabled (check in "APIs & Services" → "Enabled APIs")
- [ ] OAuth consent screen shows "External" and "Testing"
- [ ] Scopes include gmail.send and userinfo.email
- [ ] Test users include your email
- [ ] OAuth Client ID created
- [ ] Redirect URIs include `/gmail-oauth-callback`

### Saved Locally:
- [ ] Client ID copied and saved
- [ ] Client Secret copied and saved
- [ ] Both values are safe and NOT in Git

---

## Ready to Continue?

Once you've completed all the steps above and have your Client ID and Client Secret, continue with:

**Next**: `/docs/GMAIL_SETUP_STEPS.md` - Step 4: Add Credentials to Supabase
