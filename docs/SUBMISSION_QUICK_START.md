# App Store Submission Quick Start Guide

## ⚡ Priority Order - Do This First!

### 🚨 DAY 1: CRITICAL SECURITY FIXES (Must Do Today!)

**Time Required:** 2-3 hours

#### 1. Rotate ALL API Keys (URGENT!)
```bash
# Your keys are EXPOSED in .env file! Rotate immediately:

# ✅ Supabase
https://app.supabase.com → Settings → API → Reset keys

# ✅ Stripe
https://dashboard.stripe.com → Developers → API keys → Create new

# ✅ Google
https://console.cloud.google.com → Credentials → Delete + Recreate OAuth

# ✅ Meta
https://developers.facebook.com → Settings → Basic → Reset App Secret
```

#### 2. Remove Secrets from Code
```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Verify .env is NOT in git
git ls-files | grep "\.env$"
# Should return NOTHING!

# If .env is tracked, remove from git history:
git rm --cached .env
git commit -m "Remove exposed secrets from repository"

# Delete .env file completely
rm .env

# Create .env.local with NEW rotated keys (NEVER commit this)
cp .env.example .env.local
# Edit .env.local with NEW keys
```

**Read Full Guide:** `docs/SECURITY_FIXES_GUIDE.md`

---

### 📋 DAY 2: PRIVACY & CONFIGURATION

**Time Required:** 4-5 hours

#### 3. Create Privacy Policy
```bash
# 1. Customize template
open docs/PRIVACY_POLICY_TEMPLATE.md

# 2. Replace placeholders:
# - [INSERT DATE] → Current date
# - [INSERT PHYSICAL ADDRESS] → Your business address
# - [INSERT DPO CONTACT] → Data protection officer (if applicable)

# 3. Host privacy policy:
# Option A: Add to your website (https://contractorai.com/privacy)
# Option B: Use free hosting (GitHub Pages, Netlify)
# Option C: Privacy policy generator services

# 4. Save URL - you'll need it for App Store Connect
```

#### 4. Update Info.plist
```bash
# Open iOS Info.plist
open ios/App/App/Info.plist

# Add ALL permission descriptions
# Copy from: docs/IOS_CONFIGURATION_GUIDE.md (Section 1)

# REQUIRED permissions for ContractorAI:
# - NSCameraUsageDescription
# - NSPhotoLibraryUsageDescription
# - NSPhotoLibraryAddUsageDescription
# - NSCalendarsUsageDescription
# - NSUserTrackingUsageDescription
```

#### 5. Create PrivacyInfo.xcprivacy
```bash
# Create new file
touch ios/App/App/PrivacyInfo.xcprivacy

# Copy content from: docs/IOS_CONFIGURATION_GUIDE.md (Section 2)
```

#### 6. Fix Stripe Configuration
```bash
# Edit stripe-config.ts
open src/stripe-config.ts

# Replace placeholder:
priceId: 'price_YOUR_STRIPE_PRICE_ID'
# With actual Stripe price ID from dashboard:
priceId: 'price_1SJDBnGcGCTrlHr7CapiSyPk' # Your actual ID
```

---

### 🎨 DAY 3: ASSETS & METADATA

**Time Required:** 3-4 hours

#### 7. Generate App Icons
```bash
# Use icon generator:
# 1. Go to https://appicon.co
# 2. Upload 1024x1024 app icon
# 3. Download iOS icon set
# 4. Replace files in: ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Verify all sizes present:
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/
# Should see: icon-20@2x.png, icon-29@2x.png, ... icon-1024.png
```

#### 8. Prepare Screenshots
```bash
# Required sizes:
# - 6.7" (iPhone 15 Pro Max): 1290 x 2796
# - 6.5" (iPhone 11 Pro Max): 1242 x 2688
# - 5.5" (iPhone 8 Plus): 1242 x 2208
# - 12.9" iPad Pro: 2048 x 2732

# Tools:
# - Screenshot on real device: Power + Volume Up
# - Use simulator: ⌘S to capture
# - Design tool: Figma, Sketch, Photoshop

# Prepare 3-5 screenshots showing:
# 1. Main dashboard
# 2. Pricing calculator
# 3. Project management
# 4. Financial tracking
# 5. AI assistant
```

#### 9. Write App Store Description
```markdown
# Title (30 characters max)
ContractorAI - Business Manager

# Subtitle (30 characters max)
AI-Powered Pricing & Projects

# Description (4000 characters max)
ContractorAI is the complete business management solution for contractors...

[Features]
✓ AI-Powered Pricing Calculators
✓ Project & Job Management
✓ Financial Tracking & Invoicing
✓ Customer Relationship Management
✓ Calendar & Scheduling
✓ Receipt Capture & Organization
✓ Real-time Syncing

[Calculators Included]
- Roofing - HVAC - Plumbing
- Electrical - Framing - Concrete
- And 15+ more trades

[AI Assistants]
• Bill - Project Management AI
• Cindy - CRM AI Assistant
• Saul - Financial AI Advisor

[Subscription]
$24.99/month - Full access to all features
7-day free trial available

Privacy Policy: [YOUR URL]
Terms of Service: [YOUR URL]
Support: support@contractorai.com
```

---

### 🧪 DAY 4-5: TESTING

**Time Required:** 6-8 hours

#### 10. Production Build Test
```bash
# 1. Build production version
npm run build

# 2. Check for exposed secrets in build
grep -r "sk_test\|sk_live\|service_role" dist/
# Should return NOTHING!

# 3. Sync to iOS
npx cap sync ios

# 4. Open in Xcode
open ios/App/App.xcworkspace

# 5. Connect physical iPhone via USB

# 6. Select your iPhone as destination

# 7. Run app (⌘R)
```

#### 11. Feature Testing Checklist

**Authentication:**
- [ ] Sign up with email
- [ ] Email verification
- [ ] Login
- [ ] Logout
- [ ] Password reset
- [ ] Session persistence

**Subscription:**
- [ ] View subscription plans
- [ ] Start checkout flow
- [ ] Test payment (use Stripe test card: 4242 4242 4242 4242)
- [ ] Verify subscription activation
- [ ] Access premium features

**Permissions:**
- [ ] Camera access for receipt capture
- [ ] Photo library access
- [ ] Calendar sync
- [ ] Push notifications

**Core Features:**
- [ ] All calculators function correctly
- [ ] Projects can be created/edited
- [ ] Client management works
- [ ] Financial tracking accurate
- [ ] AI chatbots respond
- [ ] Calendar syncs with Google

**Performance:**
- [ ] App launches in <3 seconds
- [ ] No crashes during 10-minute usage
- [ ] Offline mode works (calculator, viewing data)
- [ ] Sync works when back online
- [ ] No memory warnings
- [ ] Battery drain acceptable

**Edge Cases:**
- [ ] Poor network (enable Network Link Conditioner)
- [ ] No network (airplane mode)
- [ ] Low storage warning
- [ ] Interruptions (phone call, app switch)
- [ ] Background → Foreground transition

---

### 📦 DAY 6: BUILD & ARCHIVE

**Time Required:** 2-3 hours

#### 12. Configure Xcode Project
```bash
# Open Xcode
open ios/App/App.xcworkspace

# In Xcode:
# 1. Select App target
# 2. General tab:
#    - Version: 1.0.0
#    - Build: 1
# 3. Signing & Capabilities:
#    - Select your team
#    - Add Push Notifications capability
# 4. Build Settings:
#    - Strip Debug Symbols: YES (Release)
```

#### 13. Create Archive
```bash
# In Xcode:
# 1. Select "Any iOS Device" as destination
# 2. Product → Archive
# 3. Wait 5-10 minutes for build
# 4. Archives window opens
# 5. Select your archive
# 6. Click "Distribute App"
# 7. Choose "App Store Connect"
# 8. Upload (10-20 minutes)
```

---

### 🚀 DAY 7: APP STORE CONNECT

**Time Required:** 3-4 hours

#### 14. Create App Store Listing
```bash
# Go to: https://appstoreconnect.apple.com

# 1. My Apps → + → New App
# 2. Fill in:
#    - Platform: iOS
#    - Name: ContractorAI
#    - Primary Language: English
#    - Bundle ID: com.elevatedsystems.contractorai
#    - SKU: CONTRACTORAI-2025

# 3. App Information:
#    - Category: Business
#    - Subcategory: Productivity

# 4. Pricing:
#    - Free with in-app subscription
#    - Set up subscription: $24.99/month

# 5. App Privacy:
#    - Answer privacy questions
#    - Add privacy policy URL

# 6. Prepare for Submission:
#    - Upload screenshots (all sizes)
#    - Add description
#    - Add keywords
#    - Add support URL
#    - Add marketing URL (optional)

# 7. Build:
#    - Select uploaded build
#    - Wait for processing (30-60 min)

# 8. App Review Information:
#    - Add demo account:
#      Email: reviewer@example.com
#      Password: TestPass123!
#    - Add notes:
#      "ContractorAI is a business management tool for contractors.
#       Stripe is used for subscription payments (business tool, not digital content).
#       AI features require internet connection for OpenAI integration.
#       Calendar permissions are for business scheduling integration."

# 9. Submit for Review
```

---

## 📊 Progress Tracker

### Critical Issues (Must Fix)
- [ ] API keys rotated
- [ ] Secrets removed from code
- [ ] Privacy policy created & hosted
- [ ] Info.plist updated with permissions
- [ ] PrivacyInfo.xcprivacy created
- [ ] Stripe placeholder replaced
- [ ] Console logs removed from production
- [ ] All HTTP changed to HTTPS

### Required Assets
- [ ] App icons generated (all sizes)
- [ ] Screenshots prepared (all devices)
- [ ] App description written
- [ ] Privacy policy URL ready
- [ ] Support URL configured

### Testing Complete
- [ ] Authentication flow tested
- [ ] Subscription payment tested
- [ ] All features tested
- [ ] Physical device tested
- [ ] Performance acceptable
- [ ] No crashes in 30-minute session

### Build & Submit
- [ ] Xcode project configured
- [ ] Archive created successfully
- [ ] Build uploaded to App Store Connect
- [ ] App Store listing complete
- [ ] Submitted for review

---

## ⏱️ Realistic Timeline

### Week 1: Preparation
- **Day 1-2:** Security fixes, API rotation
- **Day 3-4:** Privacy policy, configuration
- **Day 5-7:** Assets, testing

### Week 2: Build & Submit
- **Day 8-9:** Final testing, bug fixes
- **Day 10:** Build, archive, upload
- **Day 11:** App Store Connect configuration
- **Day 12:** Submit for review

### Week 3-4: Review Process
- **Day 13-20:** Apple review (typically 1-7 days)
- **Day 21+:** Fix rejections if any, resubmit

**Total Time:** 2-4 weeks from start to approval

---

## 🆘 Common Rejection Reasons & Quick Fixes

### "Exposed API Keys Detected"
**Fix:** Follow Day 1 security guide, resubmit

### "Missing Privacy Policy"
**Fix:** Add privacy policy URL to App Store Connect

### "Incomplete App Functionality"
**Fix:** Ensure all features work, test with demo account

### "Missing Permission Descriptions"
**Fix:** Add to Info.plist, rebuild, resubmit

### "Stripe IAP Violation"
**Fix:** Add note: "Business tool subscription, not digital content"

### "App Crashes on Launch"
**Fix:** Test on physical device, fix bugs, resubmit

---

## 📞 Need Help?

**Documentation:**
- Full Analysis: `docs/APP_STORE_SUBMISSION_ANALYSIS.md`
- Security Guide: `docs/SECURITY_FIXES_GUIDE.md`
- iOS Configuration: `docs/IOS_CONFIGURATION_GUIDE.md`
- Privacy Template: `docs/PRIVACY_POLICY_TEMPLATE.md`

**Apple Resources:**
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Store Connect Help: https://developer.apple.com/help/app-store-connect/

**Support:**
- Apple Developer Forums: https://developer.apple.com/forums/
- Stack Overflow: https://stackoverflow.com/questions/tagged/ios
- Capacitor Discord: https://discord.gg/UPYYRhtyzp

---

## ✅ Final Pre-Submission Checklist

**Before clicking "Submit for Review":**

- [ ] All API keys rotated (Supabase, Stripe, Google, Meta)
- [ ] No secrets in client code
- [ ] Privacy policy live and URL added
- [ ] All permission descriptions in Info.plist
- [ ] PrivacyInfo.xcprivacy created
- [ ] App icons present in all sizes
- [ ] Screenshots uploaded for all device sizes
- [ ] Stripe price IDs configured (not placeholders)
- [ ] Console logs removed from production
- [ ] HTTP URLs changed to HTTPS
- [ ] Tested on physical device
- [ ] No crashes in testing
- [ ] Demo account credentials provided
- [ ] App review notes added
- [ ] Version set to 1.0.0
- [ ] Build number set to 1

**If all boxes checked:** You're ready to submit! 🚀

**If any boxes unchecked:** Fix those issues first to avoid rejection.

---

**Good luck with your submission! 🎉**
