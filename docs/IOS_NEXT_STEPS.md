# iOS App Store - Next Steps (Priority Order)

## ✅ COMPLETED

- [x] Removed secret API keys from .env
- [x] Created backup of keys in .env.backup-KEEP-SAFE
- [x] Added permission descriptions to Info.plist
- [x] Created PrivacyInfo.xcprivacy file
- [x] Verified no secrets in source code

---

## 🚨 STEP 1: ROTATE API KEYS (DO THIS TODAY!)

**Why:** Your keys were exposed in .env and must be rotated before submission.

### Stripe Secret Key
```bash
# 1. Go to Stripe Dashboard
open https://dashboard.stripe.com/test/apikeys

# 2. Click "Create secret key"
# 3. Name it: "ContractorAI Server Key"
# 4. Copy the new key
# 5. Save to .env.backup-KEEP-SAFE
# 6. Delete old key from Stripe

# 7. Later: Upload to Supabase Edge Functions
# supabase secrets set STRIPE_SECRET_KEY=sk_test_NEW_KEY
```

### Supabase Service Role Key
```bash
# 1. Go to Supabase Dashboard
open https://app.supabase.com/project/ujhgwcurllkkeouzwvgk/settings/api

# 2. Under "Service Role Key", click "Reset key"
# 3. Copy new key to .env.backup-KEEP-SAFE
# 4. Later: Upload to Supabase Edge Functions
# supabase secrets set SUPABASE_SERVICE_ROLE_KEY=NEW_KEY
```

### Google OAuth Client Secret
```bash
# 1. Go to Google Cloud Console
open https://console.cloud.google.com/apis/credentials

# 2. Find OAuth 2.0 Client ID
# 3. Delete existing secret
# 4. Generate new secret
# 5. Save to .env.backup-KEEP-SAFE
```

### Meta App Secret
```bash
# 1. Go to Meta Developer Dashboard
open https://developers.facebook.com/apps/779188654790108/settings/basic/

# 2. Click "Reset" under App Secret
# 3. Confirm reset
# 4. Copy to .env.backup-KEEP-SAFE
```

**See:** `/docs/KEYS_TO_ROTATE.md` for detailed instructions

---

## 📋 STEP 2: CREATE PRIVACY POLICY (1-2 hours)

Apple REQUIRES a hosted privacy policy URL.

### Option A: Quick Privacy Policy Generator
```bash
# 1. Use a free generator:
open https://www.privacypolicygenerator.info/

# 2. Fill in:
# - App name: ContractorAI
# - App type: Business productivity
# - Data collected: Email, name, phone, photos, financial data
# - Third parties: Stripe (payments), Supabase (database), OpenAI (AI)

# 3. Generate and copy text
```

### Option B: Host on GitHub Pages (Free)
```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Create privacy.html
cat > privacy.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>ContractorAI Privacy Policy</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2563eb; }
        h2 { color: #1e40af; margin-top: 30px; }
    </style>
</head>
<body>
    <h1>Privacy Policy for ContractorAI</h1>
    <p><strong>Effective Date:</strong> [TODAY'S DATE]</p>

    <h2>1. Information We Collect</h2>
    <p>ContractorAI collects the following information to provide business management services:</p>
    <ul>
        <li><strong>Account Information:</strong> Email, name, company name</li>
        <li><strong>Contact Information:</strong> Phone number, business address</li>
        <li><strong>Business Data:</strong> Projects, clients, invoices, financial records</li>
        <li><strong>Photos:</strong> Job site photos, receipts (stored securely)</li>
        <li><strong>Calendar Data:</strong> Appointments and schedules (with your permission)</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>Your information is used to:</p>
    <ul>
        <li>Provide business management features</li>
        <li>Process subscription payments via Stripe</li>
        <li>Sync with your Google Calendar</li>
        <li>Provide AI-powered pricing and business insights</li>
    </ul>

    <h2>3. Data Security</h2>
    <p>We use industry-standard encryption and security measures. Your data is stored on Supabase (SOC 2 compliant).</p>

    <h2>4. Third-Party Services</h2>
    <ul>
        <li><strong>Stripe:</strong> Payment processing</li>
        <li><strong>Supabase:</strong> Secure database storage</li>
        <li><strong>OpenAI:</strong> AI assistant features</li>
        <li><strong>Google Calendar:</strong> Calendar synchronization (optional)</li>
    </ul>

    <h2>5. Your Rights</h2>
    <p>You can:</p>
    <ul>
        <li>Access your data at any time</li>
        <li>Delete your account and all data</li>
        <li>Export your business records</li>
        <li>Opt out of optional features (calendar sync, photos)</li>
    </ul>

    <h2>6. Contact Us</h2>
    <p>For privacy questions, contact: support@contractorai.com</p>

    <p><em>Last updated: [TODAY'S DATE]</em></p>
</body>
</html>
EOF

# Deploy to GitHub Pages or Netlify
# You'll get a URL like: https://yourusername.github.io/contractorai2/privacy.html
```

### Option C: Add to Existing Website
If you have contractorai.com, add the privacy policy there.

**Save the URL - you'll need it for App Store Connect!**

---

## 🎨 STEP 3: GENERATE APP ICONS (30 minutes)

Apple requires app icons in multiple sizes.

```bash
# 1. Create a 1024x1024 app icon design
# Tools: Figma, Canva, Photoshop, or hire on Fiverr ($5-20)

# 2. Use icon generator
open https://www.appicon.co/

# 3. Upload your 1024x1024 icon
# 4. Download iOS icon set
# 5. Extract and copy to:
cp -r ~/Downloads/AppIcon.appiconset/* \
  /Users/mikahalbertson/git/ContractorAI/contractorai2/ios/App/App/Assets.xcassets/AppIcon.appiconset/

# 6. Verify icons
ls -la /Users/mikahalbertson/git/ContractorAI/contractorai2/ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

**Required sizes:**
- 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024 (all @1x, @2x, @3x)

---

## 🔧 STEP 4: CONFIGURE XCODE (15 minutes)

```bash
# Open Xcode project
open /Users/mikahalbertson/git/ContractorAI/contractorai2/ios/App/App.xcworkspace

# In Xcode:
# 1. Select "App" target
# 2. General tab:
#    - Display Name: ContractorAI
#    - Bundle Identifier: com.elevatedsystems.contractorai
#    - Version: 1.0.0
#    - Build: 1

# 3. Signing & Capabilities:
#    - Select your Apple Developer Team
#    - Enable "Automatically manage signing"
#    - Add capability: Push Notifications

# 4. Build Settings:
#    - Search "Strip Debug Symbols"
#    - Set to YES for Release

# 5. Clean build folder: ⌘⇧K
```

---

## 🧪 STEP 5: TEST ON PHYSICAL DEVICE (1 hour)

**CRITICAL:** You MUST test on a real iPhone, not just simulator.

```bash
# 1. Build for production
cd /Users/mikahalbertson/git/ContractorAI/contractorai2
npm run build
npx cap sync ios

# 2. Connect iPhone via USB

# 3. In Xcode:
#    - Select your iPhone as destination
#    - Product → Run (⌘R)

# 4. Test checklist:
# - [ ] App launches without crashes
# - [ ] Sign up/login works
# - [ ] All calculators function
# - [ ] Camera permission works (take receipt photo)
# - [ ] Photo library access works
# - [ ] Stripe payment flow works (use test card: 4242 4242 4242 4242)
# - [ ] Calendar sync works
# - [ ] No crashes during 10-minute usage
# - [ ] App works in airplane mode (offline features)
```

---

## 🔍 STEP 6: VERIFY NO SECRETS IN BUILD (5 minutes)

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Search build for secrets
grep -r "sk_test\|sk_live\|service_role" dist/
grep -r "sk_test\|sk_live\|service_role" ios/App/App/

# Should return NO results!
# If secrets found, they're being bundled - STOP and fix!
```

---

## 📸 STEP 7: PREPARE SCREENSHOTS (2 hours)

Apple requires screenshots for multiple device sizes.

### Required Sizes:
- **6.7" display** (iPhone 15 Pro Max): 1290 x 2796 px
- **6.5" display** (iPhone 11 Pro Max): 1242 x 2688 px
- **5.5" display** (iPhone 8 Plus): 1242 x 2208 px

### How to Capture:
```bash
# Option A: Real device
# - Take screenshots on your iPhone: Power + Volume Up
# - AirDrop to Mac

# Option B: Simulator
# - Open iOS Simulator
# - Select device size (iPhone 15 Pro Max)
# - Navigate to screen you want
# - ⌘S to save screenshot
```

### Screenshots to Prepare (3-5 screens):
1. **Main Dashboard** - Show overview of features
2. **Pricing Calculator** - Show one calculator in action
3. **Project Management** - Show project list
4. **Financial Tracking** - Show revenue/expense charts
5. **AI Assistant** - Show chatbot conversation

---

## 📦 STEP 8: CREATE ARCHIVE & UPLOAD (1 hour)

```bash
# In Xcode:
# 1. Select "Any iOS Device (arm64)" as destination
# 2. Product → Archive
# 3. Wait 5-10 minutes
# 4. Archives window appears
# 5. Select archive → "Distribute App"
# 6. Choose "App Store Connect"
# 7. Next → Upload
# 8. Wait 10-20 minutes for upload
# 9. Wait 30-60 minutes for Apple to process
```

---

## 🚀 STEP 9: APP STORE CONNECT SETUP (2 hours)

```bash
# Go to App Store Connect
open https://appstoreconnect.apple.com

# 1. My Apps → + → New App
# 2. Fill in:
#    - Platform: iOS
#    - Name: ContractorAI
#    - Primary Language: English (U.S.)
#    - Bundle ID: com.elevatedsystems.contractorai
#    - SKU: CONTRACTORAI-2025

# 3. App Information:
#    - Category: Business
#    - Subcategory: Productivity

# 4. Pricing & Availability:
#    - Price: Free
#    - In-App Purchases: Set up subscription ($24.99/month)

# 5. Prepare for Submission → Version Information:
#    - Upload screenshots (all 3-5 for each device size)
#    - Description: (see below)
#    - Keywords: contractor, business, pricing, project management, invoice
#    - Support URL: https://contractorai.com/support (or create one)
#    - Marketing URL: https://contractorai.com (optional)
#    - Privacy Policy URL: [YOUR PRIVACY POLICY URL]

# 6. Build:
#    - Select uploaded build
#    - Export Compliance: No encryption (if true)

# 7. App Review Information:
#    - Demo account email: demo@contractorai.com
#    - Demo account password: DemoPass123!
#    - Notes: "ContractorAI is a business management tool for contractors.
#              Stripe is used for subscription payments (business tool, not digital content).
#              AI features use OpenAI for business assistance.
#              Calendar sync is optional and requires user permission."

# 8. Version Release:
#    - Automatically release after approval

# 9. Submit for Review
```

### App Description Template:
```
ContractorAI - The Complete Business Management Solution for Contractors

Manage your contracting business from anywhere with AI-powered tools designed specifically for contractors, builders, and trades professionals.

✓ AI-POWERED PRICING CALCULATORS
Get instant, accurate pricing for 20+ trades including roofing, HVAC, plumbing, electrical, concrete, framing, and more. Our AI analyzes market rates and materials to help you create competitive quotes.

✓ PROJECT & JOB MANAGEMENT
Track all your projects in one place. Manage timelines, budgets, materials, and team members with ease.

✓ SMART FINANCIAL TRACKING
Monitor revenue, expenses, and profitability. Capture receipts with your camera and track every dollar automatically.

✓ CLIENT RELATIONSHIP MANAGEMENT
Keep detailed client records, communication history, and project notes all in one secure system.

✓ CALENDAR & SCHEDULING
Sync with Google Calendar. Schedule jobs, set reminders, and never miss an appointment.

✓ AI BUSINESS ASSISTANTS
• Bill - Your Project Management AI
• Cindy - Your CRM Assistant
• Saul - Your Financial Advisor

✓ PROFESSIONAL INVOICING
Create and send professional invoices directly from the app.

✓ EMPLOYEE MANAGEMENT
Track your team, hours, and payroll information.

SUBSCRIPTION: $24.99/month
7-day free trial • Cancel anytime

PRIVACY & SECURITY
Your business data is encrypted and secure. We never sell your information.

Privacy Policy: [YOUR URL]
Terms of Service: [YOUR URL]
Support: support@contractorai.com

Built by contractors, for contractors. Transform your business today!
```

---

## ⏱️ REALISTIC TIMELINE

**Week 1:**
- Day 1: Rotate API keys ✓
- Day 2: Privacy policy, Info.plist ✓
- Day 3: App icons, Xcode config
- Day 4: Physical device testing

**Week 2:**
- Day 5: Screenshots, description
- Day 6: Create archive, upload
- Day 7: App Store Connect setup, submit

**Week 3-4:**
- Apple review: 1-7 days (typically 2-3 days)
- Fix any rejections if needed

**Total:** 2-3 weeks to approval

---

## ✅ QUICK CHECKLIST

Before submitting:
- [ ] All API keys rotated (Stripe, Supabase, Google, Meta)
- [ ] Privacy policy created and URL saved
- [ ] Info.plist has all permission descriptions
- [ ] PrivacyInfo.xcprivacy created
- [ ] App icons generated (all sizes)
- [ ] Tested on physical iPhone
- [ ] No secrets in build
- [ ] Screenshots prepared (3-5 per device size)
- [ ] App description written
- [ ] Demo account created
- [ ] Archive uploaded to App Store Connect

---

## 🆘 NEED HELP?

**See full documentation:**
- `/docs/KEYS_TO_ROTATE.md` - API key rotation
- `/docs/SECURE_API_KEYS_IMPLEMENTATION.md` - Backend proxy setup
- `/docs/SUBMISSION_QUICK_START.md` - Complete submission guide

**Apple Resources:**
- App Store Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/

**Your current status: Ready for Step 1 (Rotate API Keys)**
