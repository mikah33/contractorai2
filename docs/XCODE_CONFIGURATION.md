# Xcode Configuration Guide for App Store Submission

## 🎯 Complete Xcode Setup (15 minutes)

This guide will configure your Xcode project for App Store submission.

---

## 📋 Prerequisites

Before starting:
- [ ] Apple Developer account ($99/year): https://developer.apple.com
- [ ] Xcode installed (latest version recommended)
- [ ] App icons installed (see APP_ICON_GUIDE.md)
- [ ] Info.plist updated with permissions ✅ (already done)
- [ ] PrivacyInfo.xcprivacy created ✅ (already done)

---

## 🔧 Step-by-Step Configuration

### Step 1: Open Project in Xcode

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# IMPORTANT: Open .xcworkspace, NOT .xcodeproj
open ios/App/App.xcworkspace
```

**Wait for Xcode to fully load and index the project (1-2 minutes)**

---

### Step 2: Configure General Settings

**In Xcode:**

1. **Select App Target**
   - In left sidebar (Project Navigator), click "App"
   - In main area, ensure "App" target is selected (not "App-Tests")

2. **General Tab Settings:**

   **Identity Section:**
   - **Display Name:** `ContractorAI`
   - **Bundle Identifier:** `com.elevatedsystems.contractorai`
     - ⚠️ **Important:** This must match your App Store Connect app
     - If you need to change it, also update in capacitor.config.ts

   **Deployment Info:**
   - **Minimum Deployments:** iOS 13.0 (or higher if you prefer)
   - **iPhone, iPad:** Check both (or iPhone only if iPad not supported)
   - **Device Orientation:** Portrait, Landscape Left, Landscape Right
   - **Status Bar Style:** Default

   **App Icons and Launch Screen:**
   - **App Icons Source:** Should show "AppIcon" (if icons installed correctly)
   - **Launch Screen:** Should show "LaunchScreen"

---

### Step 3: Configure Signing & Capabilities

**Signing & Capabilities Tab:**

1. **Automatic Signing (Recommended)**
   ```
   ✓ Automatically manage signing
   Team: [Select your Apple Developer team]
   ```

   **If you don't see your team:**
   - Xcode → Preferences → Accounts
   - Click "+" → Add Apple ID
   - Sign in with your Apple Developer account
   - Close preferences and return to Signing tab
   - Select your team from dropdown

2. **Bundle Identifier**
   - Should auto-fill: `com.elevatedsystems.contractorai`
   - **Provisioning Profile:** Xcode managed (automatic)
   - **Signing Certificate:** Apple Development (automatic)

3. **Add Capabilities** (Required for ContractorAI)

   Click "+ Capability" button and add:

   **a) Push Notifications**
   - Click "+ Capability"
   - Search "Push Notifications"
   - Add it
   - Should show: ✓ Push Notifications

   **b) Background Modes**
   - Click "+ Capability"
   - Search "Background Modes"
   - Add it
   - Check: ☑️ Remote notifications

   **c) Sign in with Apple** (if using Apple Sign-In)
   - Click "+ Capability"
   - Search "Sign in with Apple"
   - Add it

**Your capabilities should now show:**
```
✓ Push Notifications
✓ Background Modes (Remote notifications checked)
✓ Sign in with Apple (if added)
```

---

### Step 4: Build Settings Configuration

**Build Settings Tab:**

1. **Click "Build Settings" tab**
2. **Ensure "All" and "Combined" are selected** (top buttons)
3. **Search for these settings and verify/update:**

**Code Signing Identity (Release)**
```
Search: "Code Signing Identity"
Release → iOS App Store
```

**Enable Bitcode (Deprecated in iOS 14+)**
```
Search: "Bitcode"
Enable Bitcode → No (Apple deprecated bitcode)
```

**Strip Debug Symbols (CRITICAL for App Store)**
```
Search: "Strip Debug Symbols"
Debug → No
Release → Yes
```

**Optimization Level**
```
Search: "Optimization Level"
Debug → None [-O0]
Release → Fastest, Smallest [-Os]
```

**Validate Workspace**
```
Search: "Validate Workspace"
Yes (helps catch errors early)
```

**Dead Code Stripping**
```
Search: "Dead Code Stripping"
Release → Yes
```

---

### Step 5: Info.plist Verification

**Info Tab:**

1. Click "Info" tab
2. Verify these keys are present (we already added them):

```
✓ Privacy - Camera Usage Description
✓ Privacy - Photo Library Usage Description
✓ Privacy - Photo Library Additions Usage Description
✓ Privacy - Calendars Usage Description
✓ Privacy - User Tracking Usage Description
✓ Privacy - Location When In Use Usage Description
```

**If any are missing:**
- Right-click → Add Row
- Select the privacy key
- Add description

---

### Step 6: Version and Build Numbers

**Back to General Tab:**

**Version Section:**
```
Version: 1.0.0
Build: 1
```

**Important Notes:**
- **Version:** User-facing version (shown in App Store)
  - Format: Major.Minor.Patch (e.g., 1.0.0, 1.1.0, 2.0.0)
- **Build:** Internal build number (must increase with each upload)
  - First submission: 1
  - Second submission: 2
  - Must always increase (can't reuse build numbers)

---

### Step 7: App Category (App Store Connect)

This is set in App Store Connect, not Xcode, but prepare the info:

**Primary Category:** Business
**Secondary Category:** Productivity
**Content Rating:** 4+ (No Offensive Content)

---

### Step 8: Release Configuration

**Edit Scheme for Release Build:**

1. In Xcode toolbar, click "App" (next to device selector)
2. Select "Edit Scheme..."
3. Select "Run" in left sidebar
4. **Build Configuration:** Debug (for development)
5. Select "Archive" in left sidebar
6. **Build Configuration:** Release ✅
7. Click "Close"

---

## ✅ Verify Configuration

**Run these checks:**

### Check 1: Build Succeeds
```bash
# In Xcode:
# 1. Select "Any iOS Device (arm64)" as destination
# 2. Product → Build (⌘B)
# 3. Should succeed with no errors
```

### Check 2: No Signing Errors
```bash
# In Xcode:
# Report Navigator (⌘9) → Build
# Should show: Build Succeeded
# No signing errors or warnings
```

### Check 3: Capabilities Enabled
```bash
# Signing & Capabilities tab
# Should show:
✓ Push Notifications
✓ Background Modes (with Remote notifications checked)
```

### Check 4: Info.plist Complete
```bash
# Info tab
# Scroll through and verify all privacy descriptions present
```

---

## 🏗️ Build and Test

### Test Build (Debug)

```bash
# 1. Connect iPhone via USB
# 2. Select your iPhone in Xcode device dropdown
# 3. Product → Run (⌘R)
# 4. Wait for build and installation
# 5. App launches on your iPhone
```

**Test these features on physical device:**
- [ ] App launches without crashes
- [ ] Login/signup works
- [ ] Camera permission prompt appears
- [ ] Photo library permission prompt appears
- [ ] Calendar permission prompt appears
- [ ] All main features accessible
- [ ] No console errors

### Production Build (Release - for App Store)

**Don't run this yet!** This is for when you're ready to submit:

```bash
# 1. In Xcode: Select "Any iOS Device (arm64)"
# 2. Product → Archive
# 3. Wait 5-10 minutes for build
# 4. Organizer window opens with your archive
# 5. Select archive → "Distribute App"
# 6. Choose "App Store Connect"
# 7. Follow upload wizard
```

---

## 🔍 Common Xcode Errors & Fixes

### Error: "No signing certificate found"

**Fix:**
```bash
# 1. Xcode → Preferences → Accounts
# 2. Select your Apple ID
# 3. Click "Manage Certificates..."
# 4. Click "+" → "Apple Development"
# 5. Close and retry signing
```

### Error: "Bundle identifier cannot be found"

**Fix:**
```bash
# 1. Go to: https://developer.apple.com/account/resources/identifiers/list
# 2. Click "+" to register new App ID
# 3. Select "App IDs" → "App"
# 4. Description: ContractorAI
# 5. Bundle ID: com.elevatedsystems.contractorai (Explicit)
# 6. Capabilities: Check "Push Notifications"
# 7. Register
# 8. Return to Xcode and retry
```

### Error: "Provisioning profile doesn't include signing certificate"

**Fix:**
```bash
# 1. In Xcode Signing & Capabilities:
# 2. Uncheck "Automatically manage signing"
# 3. Wait 5 seconds
# 4. Re-check "Automatically manage signing"
# 5. Xcode will regenerate profiles
```

### Error: "App icon is missing"

**Fix:**
```bash
# Verify icons exist:
ls -la /Users/mikahalbertson/git/ContractorAI/contractorai2/ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Should see all icon PNG files
# If missing, see APP_ICON_GUIDE.md
```

### Error: "The operation couldn't be completed. Unable to launch"

**Fix:**
```bash
# 1. On iPhone: Settings → General → VPN & Device Management
# 2. Trust your developer certificate
# 3. Retry running from Xcode
```

---

## 📝 Quick Configuration Checklist

**Before moving to next step, verify:**

- [ ] Xcode project opens without errors
- [ ] App target selected
- [ ] Display Name: ContractorAI
- [ ] Bundle Identifier: com.elevatedsystems.contractorai
- [ ] Version: 1.0.0, Build: 1
- [ ] Minimum Deployment: iOS 13.0+
- [ ] Team selected in Signing & Capabilities
- [ ] Automatically manage signing: ✓ Checked
- [ ] Push Notifications capability added
- [ ] Background Modes capability added (Remote notifications)
- [ ] All privacy descriptions in Info.plist
- [ ] Strip Debug Symbols: Yes (Release)
- [ ] Build succeeds without errors (⌘B)
- [ ] Tested on physical device (Debug build)
- [ ] No signing errors in Report Navigator

---

## 🚀 Next Steps

**After completing Xcode configuration:**

1. ✅ Test thoroughly on physical device (Step 5 in main guide)
2. ✅ Verify no secrets in build bundle (Step 6)
3. ✅ Prepare screenshots (Step 7)
4. ✅ Create archive and upload (Step 8)
5. ✅ Submit to App Store Connect (Step 9)

---

## 🛠️ Helpful Xcode Shortcuts

```
⌘B          Build
⌘R          Run
⌘.          Stop
⌘K          Clear Console
⌘⇧K         Clean Build Folder
⌘⇧F         Find in Project
⌘1-9        Navigate tabs
⌘0          Show/Hide Navigator
```

---

## 📞 Additional Resources

**Apple Documentation:**
- Xcode Help: Xcode → Help → Xcode Help
- Signing Guide: https://developer.apple.com/documentation/xcode/preparing-your-app-for-distribution
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/

**Troubleshooting:**
- Apple Developer Forums: https://developer.apple.com/forums/
- Stack Overflow: https://stackoverflow.com/questions/tagged/xcode

---

**✅ Configuration Complete!**

You're now ready to build, test, and submit your app to the App Store.

**Current Status:**
- Step 2: Privacy Policy ✅
- Step 3: App Icons ✅
- Step 4: Xcode Configuration ✅

**Next:** Test on physical device and prepare for submission!
