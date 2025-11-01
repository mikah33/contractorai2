# TestFlight Setup & Developer Account Switch Guide

## 📱 Part 1: Switch Developer Account in Xcode

### Step 1: Remove Old Apple Account
1. Open **Xcode**
2. Go to **Xcode** → **Settings** (or **Preferences** on older versions)
3. Click the **Accounts** tab
4. Select the old Apple ID account in the left sidebar
5. Click the **minus (-)** button at the bottom to remove it
6. Confirm removal

### Step 2: Add New Apple Account
1. Still in **Accounts** tab
2. Click the **plus (+)** button at the bottom
3. Select **Apple ID**
4. Enter your new Apple ID credentials
5. Click **Sign In**
6. Complete two-factor authentication if prompted

### Step 3: Update Project Team
1. Close Xcode Settings
2. Open your project: `ios/App/App.xcworkspace`
3. Select the **App** target in the left navigator
4. Click the **Signing & Capabilities** tab
5. Under **Team**, select your new Apple Developer account from dropdown
6. Xcode will automatically provision a new signing certificate

### Step 4: Update Bundle Identifier (if needed)
1. Still in **Signing & Capabilities**
2. Change **Bundle Identifier** if you need to use a different one
3. Current: `com.contractorai.app`
4. Format: `com.yourcompany.appname`
5. Must be unique across all App Store apps

### Step 5: Handle Signing Errors
If you see signing errors:
1. Click **"Try Again"** button
2. If still errors, go to **Xcode** → **Settings** → **Accounts**
3. Select your account → Click **"Manage Certificates..."**
4. Click **+** → **Apple Development** (creates new certificate)
5. Go back to project and try again

---

## 🚀 Part 2: Upload to TestFlight

### Prerequisites
- ✅ Paid Apple Developer account ($99/year)
- ✅ App must be signed with correct team
- ✅ All required app icons present (you have these)
- ✅ Privacy policy live (you have this)
- ✅ Info.plist properly configured (you have this)

### Step 1: Archive the App
1. In Xcode, select **Any iOS Device (arm64)** as the build destination (top toolbar)
   - Do NOT select a simulator
2. Go to **Product** → **Archive**
3. Wait for the archive to complete (2-5 minutes)
4. The **Organizer** window will appear automatically

### Step 2: Validate the Archive
1. In **Organizer**, select your archive
2. Click **Validate App**
3. Choose your team from dropdown
4. Keep default options:
   - ✅ Upload your app's symbols
   - ✅ Manage Version and Build Number
5. Click **Validate**
6. Wait for validation (1-3 minutes)
7. If validation succeeds, you'll see "✓ Validation Successful"

### Step 3: Distribute to App Store Connect
1. In **Organizer**, click **Distribute App**
2. Select **App Store Connect**
3. Click **Next**
4. Select **Upload** (not Export)
5. Click **Next**
6. Choose your distribution certificate and provisioning profile
   - Xcode will usually auto-select the correct ones
7. Review app information
8. Click **Upload**
9. Wait for upload (3-10 minutes depending on connection)

### Step 4: Processing in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Sign in with your new Apple ID
3. Click **My Apps**
4. If this is your first upload:
   - Click **+ (plus)** button
   - Select **New App**
   - Fill in:
     - **Platform**: iOS
     - **Name**: ContractorAI
     - **Primary Language**: English (U.S.)
     - **Bundle ID**: Select your bundle ID from dropdown
     - **SKU**: contractorai-ios (or any unique identifier)
5. Wait for Apple to process your build (5-30 minutes)
   - You'll receive an email when processing is complete

### Step 5: Enable TestFlight
1. In App Store Connect, go to your app
2. Click the **TestFlight** tab at the top
3. After processing completes, your build will appear under **Builds**
4. Click on your build number (e.g., 1.0.0)
5. Fill in **"What to Test"** field:
   ```
   Initial TestFlight build for ContractorAI.

   Please test:
   - User authentication (sign in/sign up)
   - Dashboard functionality
   - Estimates creation and editing
   - Calculator tools
   - Mobile responsiveness

   Known issues: None
   ```
6. Click **Save**

### Step 6: Add Internal Testers
1. Go to **TestFlight** → **Internal Testing**
2. Click **Default** test group (or create a new group)
3. Click the **+ (plus)** next to **Testers**
4. Add testers by email:
   - Must be users added to your App Store Connect team
   - Or add external testers (see next step)
5. Enable **Automatic Distribution** (recommended)
   - New builds automatically go to testers
6. Click **Add**

### Step 7: Add External Testers (Optional)
1. Go to **TestFlight** → **External Testing**
2. Click **+ (plus)** to create a new group
3. Name it (e.g., "Beta Testers")
4. Add build to test
5. Add tester emails (can be anyone, up to 10,000)
6. Submit for **Beta App Review** (required for external testers)
   - Usually approved in 24-48 hours
7. Once approved, testers will receive email invitations

### Step 8: Testers Install TestFlight
1. Testers receive email: **"You're invited to test ContractorAI"**
2. Testers must:
   - Install **TestFlight** app from App Store
   - Open invitation email on their iPhone
   - Tap **"View in TestFlight"**
   - Tap **"Accept"** → **"Install"**
3. App appears on home screen like any other app
4. Orange dot indicates it's a TestFlight beta

---

## 🔄 Part 3: Update App with New Builds

### When You Make Changes
1. Increment build number in Xcode:
   - Open `ios/App/App.xcodeproj`
   - Select **App** target
   - Go to **General** tab
   - Change **Build** number (e.g., 1 → 2 → 3)
   - Keep **Version** same (e.g., 1.0.0) unless major release
2. Rebuild: `npm run build && npx cap sync ios`
3. Repeat archive and upload process (Steps 1-3 from Part 2)
4. New build appears in TestFlight in 5-30 minutes
5. If auto-distribution enabled, testers get notified

---

## 🔧 Common Issues & Fixes

### Issue: "No Signing Certificate Found"
**Fix:**
1. Xcode → Settings → Accounts
2. Select your account → Manage Certificates
3. Click + → Apple Development
4. Go back to project and try again

### Issue: "Bundle Identifier Already in Use"
**Fix:**
1. Change bundle ID to something unique
2. Example: `com.yourname.contractorai`
3. Update in Xcode under Signing & Capabilities

### Issue: "Export Compliance Missing"
**Fix:**
1. In App Store Connect, select your build
2. Answer export compliance questions:
   - "Does your app use encryption?" → Usually **No** (unless you use end-to-end encryption beyond HTTPS)
3. Click **Start Internal Testing**

### Issue: "Missing Privacy Policy"
**Fix:**
- You already have this live at https://contractorai.work/privacy ✅

### Issue: "Invalid Icon"
**Fix:**
- You already have all required icons installed ✅

### Issue: "Provisioning Profile Expired"
**Fix:**
1. Xcode → Settings → Accounts
2. Select account → Download Manual Profiles
3. Or delete and re-download in Signing & Capabilities

---

## 📋 Quick Checklist

### Before First Upload
- [ ] New Apple Developer account added to Xcode
- [ ] Old account removed (if switching)
- [ ] Project team updated in Xcode
- [ ] Bundle ID set and unique
- [ ] Signing certificate created
- [ ] All app icons present (you have these ✅)
- [ ] Privacy policy live (you have this ✅)
- [ ] Info.plist configured (you have this ✅)

### Upload Process
- [ ] Build destination: "Any iOS Device (arm64)"
- [ ] Archive created successfully
- [ ] Archive validated (no errors)
- [ ] Uploaded to App Store Connect
- [ ] Build processed (wait 5-30 min)
- [ ] "What to Test" field filled in
- [ ] Testers added to TestFlight
- [ ] Testers received invitation emails

### For Updates
- [ ] Build number incremented
- [ ] Changes tested locally
- [ ] Re-archived and uploaded
- [ ] New build shows in TestFlight
- [ ] Testers notified (if auto-distribution on)

---

## 🎯 Next Steps After TestFlight

Once testing is complete and you're ready for full App Store release:

1. **App Store Connect** → Your App → **App Store** tab
2. Fill in all required metadata:
   - App description
   - Keywords
   - Screenshots (you have 5 ready ✅)
   - App category
   - Age rating
   - Privacy policy URL
3. Select your TestFlight build for release
4. Submit for review (usually 1-3 days)
5. Once approved, you can release immediately or schedule

---

## 📞 Support Resources

- **Apple Developer Help**: https://developer.apple.com/support/
- **TestFlight Documentation**: https://developer.apple.com/testflight/
- **App Store Connect Help**: https://help.apple.com/app-store-connect/

---

**Your app is 100% ready for TestFlight!** All technical requirements are met. Just follow the steps above to switch accounts and upload.
