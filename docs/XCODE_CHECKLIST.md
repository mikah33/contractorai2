# Xcode Configuration Checklist

Follow these steps **IN ORDER** in Xcode. Check each box as you complete it.

---

## 🎯 STEP 1: Select Target (30 seconds)

In Xcode (should be opening now):

1. **Left Sidebar (Project Navigator)**
   - Click on "App" (the blue icon at the top)

2. **Main Area - Targets**
   - Ensure "App" target is selected (not "App-Tests")
   - You should see tabs: General, Signing & Capabilities, Resource Tags, Info, Build Settings, Build Phases, Build Rules

**✅ Checkpoint:** You see the "General" tab with app settings

---

## 🎯 STEP 2: General Tab - Identity (2 minutes)

**Click the "General" tab**

### Identity Section:

- [ ] **Display Name:** `ContractorAI`
  - This is what users see on their home screen

- [ ] **Bundle Identifier:** `com.elevatedsystems.contractorai`
  - ⚠️ **CRITICAL:** This must match your App Store Connect app
  - If you need a different bundle ID, also update `capacitor.config.ts`

### Deployment Info:

- [ ] **Minimum Deployments:** iOS 13.0 (or newer if you prefer)
  - Supports iPhone back to iPhone 6s

- [ ] **Devices:**
  - Check "iPhone" ✅
  - Check "iPad" if you want iPad support (optional)

- [ ] **Device Orientation:**
  - Portrait ✅
  - Landscape Left ✅
  - Landscape Right ✅
  - (Uncheck Portrait Upside Down unless needed)

### App Icons and Launch Screen:

- [ ] **App Icons Source:** Should show "AppIcon" with icon preview
  - If you see your purple/blue helmet icon, you're good! ✅

- [ ] **Launch Screen:** Should show "LaunchScreen"

### Version:

- [ ] **Version:** `1.0.0`
  - This is what users see in App Store

- [ ] **Build:** `1`
  - Must increase with each upload to App Store
  - First submission = 1

**✅ Checkpoint:** Bundle ID is correct, Version is 1.0.0, Build is 1

---

## 🎯 STEP 3: Signing & Capabilities (5 minutes)

**Click "Signing & Capabilities" tab**

### Automatic Signing (Recommended):

- [ ] **Check:** ✅ "Automatically manage signing"

- [ ] **Team:** Select your Apple Developer team from dropdown
  - If you don't see your team:
    1. Xcode → Preferences → Accounts
    2. Click "+" → Add Apple ID
    3. Sign in with your Apple Developer account
    4. Close preferences
    5. Return here and select team

- [ ] **Bundle Identifier:** Should show `com.elevatedsystems.contractorai`

- [ ] **Provisioning Profile:** Should say "Xcode Managed Profile"

- [ ] **Signing Certificate:** Should say "Apple Development" or "Apple Distribution"

**⚠️ If you see errors about Bundle Identifier:**
1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click "+" to register new App ID
3. Bundle ID: `com.elevatedsystems.contractorai` (Explicit)
4. Check "Push Notifications" capability
5. Return to Xcode

### Add Capabilities:

**Click "+ Capability" button (top left)**

1. **Push Notifications:**
   - [ ] Search for "Push Notifications"
   - [ ] Click to add it
   - [ ] Should appear in list: ✅ Push Notifications

2. **Background Modes:**
   - [ ] Click "+ Capability" again
   - [ ] Search for "Background Modes"
   - [ ] Click to add it
   - [ ] Check: ☑️ "Remote notifications"

3. **Sign in with Apple** (if you use Apple Sign-In):
   - [ ] Click "+ Capability" again
   - [ ] Search for "Sign in with Apple"
   - [ ] Click to add it

**✅ Checkpoint:** You should see these capabilities listed:
```
✓ Push Notifications
✓ Background Modes (Remote notifications checked)
✓ Sign in with Apple (if added)
```

---

## 🎯 STEP 4: Build Settings (3 minutes)

**Click "Build Settings" tab**

At the top, ensure these are selected:
- [ ] Click "All" (not "Basic")
- [ ] Click "Combined" (not "Levels")

### Search and Verify Settings:

**1. Strip Debug Symbols (CRITICAL for App Store):**
- [ ] Type "Strip Debug" in search box
- [ ] Find "Strip Debug Symbols During Copy"
- [ ] Set **Debug** → No
- [ ] Set **Release** → Yes ✅

**2. Optimization Level:**
- [ ] Clear search, type "Optimization Level"
- [ ] **Debug** → None [-O0]
- [ ] **Release** → Fastest, Smallest [-Os] ✅

**3. Enable Bitcode (Apple deprecated, should be No):**
- [ ] Clear search, type "Enable Bitcode"
- [ ] Set to **No** (Apple no longer uses bitcode)

**4. Dead Code Stripping:**
- [ ] Clear search, type "Dead Code Stripping"
- [ ] **Release** → Yes ✅

**✅ Checkpoint:** Strip Debug Symbols is YES for Release builds

---

## 🎯 STEP 5: Info Tab Verification (1 minute)

**Click "Info" tab**

Scroll through and verify these privacy descriptions are present:
(We already added these, just verify they're there)

- [ ] ✅ Privacy - Camera Usage Description
- [ ] ✅ Privacy - Photo Library Usage Description
- [ ] ✅ Privacy - Photo Library Additions Usage Description
- [ ] ✅ Privacy - Calendars Usage Description
- [ ] ✅ Privacy - User Tracking Usage Description
- [ ] ✅ Privacy - Location When In Use Usage Description

**✅ Checkpoint:** All 6 privacy descriptions are present

---

## 🎯 STEP 6: Edit Scheme for Release (2 minutes)

**Configure for App Store release builds:**

1. **Click "App" in toolbar** (next to device selector)
2. Select **"Edit Scheme..."**
3. **Left sidebar:** Click "Archive"
4. **Build Configuration:** Select "Release" ✅
5. Click **"Close"**

**✅ Checkpoint:** Archive uses Release configuration

---

## 🎯 STEP 7: Test Build (2 minutes)

**Verify everything compiles:**

1. **Select destination:** "Any iOS Device (arm64)"
   - Click device dropdown in toolbar
   - Select "Any iOS Device (arm64)"

2. **Build:**
   - Product → Build (or press ⌘B)
   - Wait for build to complete

3. **Check for errors:**
   - If build succeeds: ✅ Perfect!
   - If errors appear: Note them and we'll fix

**✅ Checkpoint:** Build succeeded with no errors

---

## ✅ FINAL VERIFICATION

**All these should be true:**

- [ ] App target selected
- [ ] Display Name: ContractorAI
- [ ] Bundle Identifier: com.elevatedsystems.contractorai
- [ ] Version: 1.0.0, Build: 1
- [ ] Team selected in Signing
- [ ] Automatically manage signing: ✅
- [ ] Push Notifications capability added
- [ ] Background Modes capability added (Remote notifications)
- [ ] Strip Debug Symbols: YES (Release)
- [ ] Archive scheme uses Release configuration
- [ ] Build succeeds without errors
- [ ] App icons visible in General tab

---

## 🎉 CONFIGURATION COMPLETE!

**Your Xcode project is now configured for App Store submission!**

### What's Ready:
1. ✅ Bundle ID and version configured
2. ✅ Signing configured with your team
3. ✅ All required capabilities added
4. ✅ Build settings optimized for release
5. ✅ App icons installed
6. ✅ Privacy descriptions present
7. ✅ Project builds successfully

### What's Next:

**Option A: Test on iPhone (Recommended Next)**
1. Connect iPhone via USB
2. Select iPhone in device dropdown
3. Product → Run (⌘R)
4. App installs and runs on your phone
5. Verify all features work

**Option B: Rotate API Keys (Critical Before Submission)**
1. See: `/docs/KEYS_TO_ROTATE.md`
2. Rotate Stripe, Supabase, Google, Meta keys
3. Takes ~30 minutes

**Option C: Create Archive for App Store**
1. Product → Archive
2. Wait 5-10 minutes
3. Distribute to App Store Connect

---

## 🆘 Common Issues

### "No signing certificate found"
**Fix:**
- Xcode → Preferences → Accounts
- Select your Apple ID
- Click "Manage Certificates..."
- Click "+" → "Apple Development"

### "Bundle identifier cannot be found"
**Fix:**
- Go to https://developer.apple.com/account/resources/identifiers/list
- Register App ID: com.elevatedsystems.contractorai
- Add Push Notifications capability

### "Provisioning profile doesn't match"
**Fix:**
- Uncheck "Automatically manage signing"
- Wait 5 seconds
- Re-check "Automatically manage signing"

### "App icon missing"
**Fix:**
- Icons should already be installed
- If not showing: Clean Build Folder (⌘⇧K), rebuild

---

**Status: Xcode Configuration Complete ✅**

**Next:** Test on device or rotate API keys!
