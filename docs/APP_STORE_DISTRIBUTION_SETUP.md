# App Store Distribution Setup Guide - ContractorAI

## 📋 Overview

This guide will walk you through setting up your iOS app for App Store distribution.

**Bundle ID:** `com.elevated.contractorai`
**Team ID:** `2D8X3GFX6G`
**App Name:** ContractorAI
**Version:** 1.0 (Build 1)

---

## ✅ Completed Steps

- [x] Privacy Policy created and hosted
- [x] NSPrivacy declarations added to Info.plist
- [x] App icons configured (all sizes)
- [x] Bundle identifier set
- [x] Development team configured
- [x] Permissions configured (Camera, Location, Photos, Calendar)
- [x] Web build synced to iOS

---

## 🚀 Required Steps for App Store Submission

### 1. Apple Developer Account Setup

**Required:** Apple Developer Program membership ($99/year)

1. **Enroll in Apple Developer Program:**
   - Visit: https://developer.apple.com/programs/
   - Sign in with your Apple ID
   - Complete enrollment (takes 24-48 hours for approval)

2. **Verify Team ID:**
   - Your current Team ID: `2D8X3GFX6G`
   - Confirm this matches your Apple Developer account

---

### 2. Create App Store Distribution Certificate

**Location:** Apple Developer Portal → Certificates, Identifiers & Profiles

#### Step A: Generate Certificate Signing Request (CSR)

On your Mac:

```bash
# Open Keychain Access
open /Applications/Utilities/Keychain\ Access.app

# Then:
# 1. Menu: Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
# 2. Fill in:
#    - User Email Address: [your email]
#    - Common Name: ContractorAI Distribution
#    - CA Email Address: [leave blank]
#    - Request is: Saved to disk
# 3. Click Continue
# 4. Save as: ContractorAI_Distribution.certSigningRequest
```

#### Step B: Create Distribution Certificate

1. Go to: https://developer.apple.com/account/resources/certificates/list
2. Click **+** (Add)
3. Select: **Apple Distribution**
4. Click Continue
5. Upload the CSR file you created
6. Download the certificate (.cer file)
7. Double-click to install in Keychain Access

---

### 3. Register App ID

**Bundle Identifier:** `com.elevated.contractorai`

1. Go to: https://developer.apple.com/account/resources/identifiers/list
2. Click **+** (Add)
3. Select **App IDs** → Continue
4. Select **App** → Continue
5. Configure:
   - **Description:** ContractorAI Business Management
   - **Bundle ID:** Explicit - `com.elevated.contractorai`
   - **Capabilities:** Enable:
     - [x] Push Notifications
     - [x] Sign in with Apple (optional)
     - [x] Associated Domains (if using deep links)
6. Click Continue → Register

---

### 4. Create App Store Provisioning Profile

1. Go to: https://developer.apple.com/account/resources/profiles/list
2. Click **+** (Add)
3. Select **App Store** → Continue
4. Select your App ID: `com.elevated.contractorai`
5. Select your Distribution Certificate
6. Name: `ContractorAI App Store Distribution`
7. Download the profile (.mobileprovision)

#### Install Provisioning Profile:

```bash
# Move to Xcode provisioning profiles directory
mv ~/Downloads/ContractorAI_App_Store_Distribution.mobileprovision \
   ~/Library/MobileDevice/Provisioning\ Profiles/
```

Or just double-click the downloaded file.

---

### 5. Configure Xcode for Distribution

#### Open Your Project:

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2
open ios/App/App.xcworkspace
```

**IMPORTANT:** Open `.xcworkspace`, NOT `.xcodeproj`

#### Configure Signing:

1. **Select Project** → Select "App" target → **Signing & Capabilities** tab

2. **Automatically Manage Signing:**
   - For **Debug:** ✅ Automatic signing
   - For **Release:** ❌ Manual signing (recommended for App Store)

3. **Release Configuration:**
   - Team: `Elevated Systems LLC (2D8X3GFX6G)`
   - Provisioning Profile: `ContractorAI App Store Distribution` (manual)
   - Signing Certificate: `Apple Distribution`

4. **Verify Bundle Identifier:**
   - Should be: `com.elevated.contractorai`

---

### 6. App Store Connect Setup

#### Create App Record:

1. Go to: https://appstoreconnect.apple.com/
2. Click **My Apps** → **+** → **New App**
3. Configure:
   - **Platforms:** iOS
   - **Name:** ContractorAI
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** `com.elevated.contractorai`
   - **SKU:** `contractorai-ios-001` (unique identifier)
   - **User Access:** Full Access

#### App Information:

**Category:**
- Primary: Business
- Secondary: Productivity

**Privacy Policy URL:**
```
https://contractorai.work/privacy
```
✅ Already hosted and accessible

**Age Rating:**
- Complete the questionnaire (likely 4+)

**App Icon:**
- 1024x1024px PNG (no alpha channel)
- Located: `ios/App/App/Assets.xcassets/AppIcon.appiconset/1024.png`

---

### 7. Prepare App Metadata

#### Required Information:

**App Description:** (Max 4000 characters)

```
ContractorAI is the ultimate business management solution designed specifically for contractors and construction professionals. Streamline your entire workflow with powerful tools that help you win more jobs and grow your business.

KEY FEATURES:

📊 Smart Pricing Calculators
• 20+ specialized calculators for different trades
• Real-time material cost updates
• Labor calculations with crew size
• AI-powered pricing recommendations

💼 Project Management
• Track jobs from estimate to completion
• Timeline visualization
• Progress tracking
• Client communication logs

💰 Financial Tracking
• Income and expense management
• Profit margin analysis
• Invoice generation
• Receipt scanning with OCR

📋 Estimate Generator
• Professional PDF estimates
• Customizable templates
• Email delivery
• Follow-up reminders

👥 Client Management (CRM)
• Contact database
• Project history
• Communication tracking
• Customer insights

📅 Calendar Integration
• Appointment scheduling
• Google Calendar sync
• Job site reminders
• Team coordination

🤖 AI Team Assistants
• Saul - Financial Analysis
• Cindy - CRM & Client Management
• Bill - Project Management
• AI-powered recommendations

✨ Additional Features:
• Photo documentation
• Receipt capture
• Multi-language support
• Offline mode
• Cloud backup
• Export to PDF/Excel

Perfect for:
Contractors, Builders, Remodelers, Electricians, Plumbers, HVAC, Painters, Roofers, Landscapers, and all construction professionals.

SUBSCRIPTION PLANS:
• Free tier with basic features
• Pro: $29.99/month - Full access to all features
• Premium: $49.99/month - Advanced AI, priority support

Privacy focused. Your data stays yours. No ads. Professional tools for serious contractors.
```

**Keywords:** (Max 100 characters)
```
contractor,estimate,invoice,pricing,construction,project,business,CRM,calendar
```

**Support URL:**
```
https://contractorai.app/support
```

**Marketing URL (Optional):**
```
https://contractorai.app
```

**Promotional Text:** (Max 170 characters)
```
The #1 business management app for contractors. Smart pricing, project tracking, and AI assistants to grow your construction business.
```

---

### 8. Screenshots Requirements

**Required Sizes:**

1. **6.9" Display (iPhone 17 Pro Max)**
   - 1320 x 2868 pixels
   - Or 2868 x 1320 (landscape)

2. **6.7" Display (iPhone 15 Pro Max)**
   - 1290 x 2796 pixels
   - Or 2796 x 1290 (landscape)

3. **iPad Pro (6th Gen) 12.9"**
   - 2048 x 2732 pixels
   - Or 2732 x 2048 (landscape)

**Number Required:** 1-10 screenshots per size (3-5 recommended)

**Current Screenshots Location:**
```
/Users/mikahalbertson/Desktop/ContractorAI-AppStore-Screenshots/
```

**Recommended Screenshots:**
1. Dashboard/Home screen
2. Pricing calculator in action
3. Project management view
4. Estimate generation
5. Calendar/scheduling

---

### 9. Create Archive Build

#### Build for Release:

1. **In Xcode:**
   - Select: **Any iOS Device (arm64)** as destination
   - Menu: **Product → Scheme → Edit Scheme**
   - Run → Build Configuration: **Release**
   - Click Close

2. **Archive:**
   - Menu: **Product → Archive**
   - Wait for build to complete (5-10 minutes)

3. **Validate Archive:**
   - When build completes, Organizer opens
   - Select your archive
   - Click **Validate App**
   - Select your team
   - Click **Validate**
   - Fix any errors/warnings

4. **Upload to App Store:**
   - Click **Distribute App**
   - Select **App Store Connect**
   - Click **Upload**
   - Select distribution options:
     - [x] Upload symbols for crash analysis
     - [x] Manage Version and Build Number
   - Click **Next** → **Upload**

---

### 10. Submit for Review

#### In App Store Connect:

1. Go to your app → **TestFlight** tab
2. Verify build appears (takes 5-10 minutes)
3. Go to **App Store** tab
4. Click **+ Version or Platform** → **iOS**
5. Enter version: **1.0**
6. Fill in all required fields:
   - Screenshots
   - Description
   - Keywords
   - Support URL
   - Marketing URL
7. Under **Build**, select your uploaded build
8. Complete **App Review Information:**
   - Sign-in required? (Yes/No)
   - Demo account (if required)
   - Contact information
   - Notes for reviewer

9. **Export Compliance:**
   - Does your app use encryption? **YES**
   - Does it use exempt encryption? **YES**
   - Reason: HTTPS only

10. Click **Submit for Review**

---

## 🔐 Privacy Policy

✅ **Privacy Policy Already Hosted:**
```
https://contractorai.work/privacy
```

This URL is already configured in:
- Info.plist (`NSPrivacyPolicyURL`)
- Use this URL in App Store Connect

**In App Store Connect:**
- Go to App Information
- Privacy Policy URL: `https://contractorai.work/privacy`
- Save

---

## 📱 Testing Before Submission

### TestFlight Testing:

1. After uploading build, go to **TestFlight** in App Store Connect
2. Add internal testers (up to 100)
3. Click **External Testing** → **Create Group**
4. Add external testers (requires beta review, 24-48 hours)
5. Send test invitations
6. Collect feedback

### Pre-Submission Checklist:

- [ ] App builds without errors
- [ ] All features work on real device
- [ ] Screenshots match current app version
- [ ] Privacy policy is accessible
- [ ] Contact information is correct
- [ ] App doesn't crash on launch
- [ ] Subscriptions work (if applicable)
- [ ] Sign-in works
- [ ] Camera/Photos/Location permissions work
- [ ] Calendar sync works
- [ ] Tested on multiple iOS versions
- [ ] Tested on both iPhone and iPad

---

## 🚨 Common Rejection Reasons

### Avoid These Issues:

1. **Privacy Policy Issues:**
   - ✅ Make sure it's accessible without signing in
   - ✅ Must match data collection in app

2. **Missing Demo Account:**
   - If login required, provide test credentials

3. **App Completeness:**
   - No placeholder content
   - All features functional
   - No broken links

4. **Guideline 2.1 - Performance:**
   - App must not crash
   - Must work on latest iOS version

5. **Guideline 4.0 - Design:**
   - App icons must match
   - Screenshots must be current

6. **Guideline 5.1.1 - Privacy:**
   - Must have privacy policy
   - Must declare data collection

---

## 📊 Review Timeline

**Typical Timeline:**
- Upload: Instant
- Processing: 5-30 minutes
- In Review: 24-48 hours
- Approved: Instant (or rejected with feedback)

**First submission typically takes longer** (3-5 days)

---

## 🔧 Quick Commands

```bash
# Navigate to project
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Build web app
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Or directly:
open ios/App/App.xcworkspace

# Clean build (if needed)
cd ios/App
pod deintegrate
pod install
```

---

## 📞 Support Resources

**Apple Developer:**
- Portal: https://developer.apple.com/account
- Support: https://developer.apple.com/support/
- Guidelines: https://developer.apple.com/app-store/review/guidelines/

**App Store Connect:**
- Dashboard: https://appstoreconnect.apple.com/
- Help: https://developer.apple.com/support/app-store-connect/

**Capacitor Docs:**
- iOS: https://capacitorjs.com/docs/ios

---

## ✅ Final Checklist

Before clicking "Submit for Review":

- [ ] Apple Developer account active ($99/year)
- [ ] Distribution certificate created and installed
- [ ] App ID registered (`com.elevated.contractorai`)
- [ ] Provisioning profile created and installed
- [ ] Xcode configured for App Store distribution
- [ ] App Store Connect app record created
- [ ] Privacy policy hosted and accessible
- [ ] All metadata entered (description, keywords, etc.)
- [ ] Screenshots uploaded (all required sizes)
- [ ] App icon uploaded (1024x1024)
- [ ] Archive build created successfully
- [ ] Build validated in Xcode
- [ ] Build uploaded to App Store Connect
- [ ] TestFlight testing completed
- [ ] Export compliance completed
- [ ] App review information filled out
- [ ] Demo account provided (if login required)

---

## 🎉 After Approval

Once approved:

1. **Release Options:**
   - Automatic release after approval
   - Manual release (you choose when)
   - Scheduled release (specific date/time)

2. **Monitor:**
   - App Analytics in App Store Connect
   - Crash reports
   - User reviews
   - Download metrics

3. **Updates:**
   - Increment version: `1.1`, `1.2`, etc.
   - Build number: auto-increment
   - Repeat steps 9-10 for updates

---

**Generated:** November 15, 2025
**App:** ContractorAI v1.0
**Bundle ID:** com.elevated.contractorai
