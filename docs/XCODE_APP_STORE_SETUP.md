# Xcode App Store Configuration Guide

## Step-by-Step Setup for ContractorAI

### 1. Configure Signing & Capabilities

**In Xcode (should be open now):**

1. **Select the Project**
   - Click "App" (blue icon) in the left sidebar
   - Make sure you're on the "Signing & Capabilities" tab

2. **Set Your Team**
   - Under "Signing", find the "Team" dropdown
   - Select your Apple Developer account
   - If you don't see it, click "Add an Account..." and sign in

3. **Bundle Identifier**
   - Should already be: `com.elevatedsystems.contractorai`
   - ✅ Leave this as is

4. **Enable Automatic Signing**
   - ✅ Check "Automatically manage signing"
   - Xcode will handle provisioning profiles

### 2. Configure App Information

1. **In the General Tab:**
   - Display Name: `ContractorAI`
   - Version: `1.0.0`
   - Build: `1`
   - Deployment Target: iOS 13.0 or higher

2. **App Category:**
   - Category: Business
   - Supports: iPhone and iPad

### 3. Add App Icons

**You need icons in these sizes:**
- 1024x1024 (App Store)
- 180x180, 120x120, 87x87, 80x80, 76x76, 60x60, 58x58, 40x40, 29x29, 20x20

**Quick Way:**

1. **In Xcode:**
   - Navigate to: `App > App > Assets.xcassets > AppIcon`
   - You'll see all the icon size slots

2. **Generate Icons:**
   - Use your logo at `/Users/mikahalbertson/git/ContractorAI/contractorai2/public/logo.png`
   - Go to https://appicon.co
   - Upload your logo
   - Download all iOS sizes
   - Drag and drop into Xcode icon slots

**Or use this script:**

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Generate icons with sips (macOS built-in)
mkdir -p ios_icons

# Generate all required sizes
sips -z 1024 1024 public/logo.png --out ios_icons/icon-1024.png
sips -z 180 180 public/logo.png --out ios_icons/icon-180.png
sips -z 167 167 public/logo.png --out ios_icons/icon-167.png
sips -z 152 152 public/logo.png --out ios_icons/icon-152.png
sips -z 120 120 public/logo.png --out ios_icons/icon-120.png
sips -z 87 87 public/logo.png --out ios_icons/icon-87.png
sips -z 80 80 public/logo.png --out ios_icons/icon-80.png
sips -z 76 76 public/logo.png --out ios_icons/icon-76.png
sips -z 60 60 public/logo.png --out ios_icons/icon-60.png
sips -z 58 58 public/logo.png --out ios_icons/icon-58.png
sips -z 40 40 public/logo.png --out ios_icons/icon-40.png
sips -z 29 29 public/logo.png --out ios_icons/icon-29.png
sips -z 20 20 public/logo.png --out ios_icons/icon-20.png

# Then drag these into Xcode
open ios_icons
```

### 4. Test on Simulator

**In Xcode:**

1. **Select a Simulator:**
   - Top toolbar: Click device dropdown
   - Select "iPhone 15 Pro" (or any iPhone simulator)

2. **Run the App:**
   - Click the Play button (▶️) or press `Cmd + R`
   - Wait for build to complete
   - App should launch in simulator

3. **Test Key Features:**
   - ✅ App launches without crash
   - ✅ UI displays correctly
   - ✅ Navigation works
   - ✅ Supabase connection works
   - ✅ Forms and inputs work

### 5. Test on Real Device (Recommended)

**Connect your iPhone:**

1. Plug in iPhone via USB
2. Trust computer if prompted on iPhone
3. In Xcode, select your iPhone from device dropdown
4. Click Run (▶️)
5. On iPhone: Settings > General > VPN & Device Management
6. Trust your developer certificate
7. App should launch on your phone

**Test everything on real device!**

### 6. Prepare for App Store

**Before archiving, update these files:**

1. **Info.plist Settings**
   - In Xcode: `App > App > Info.plist`
   - Add descriptions for permissions:
     ```xml
     <key>NSCameraUsageDescription</key>
     <string>ContractorAI needs camera access to capture project photos</string>

     <key>NSPhotoLibraryUsageDescription</key>
     <string>ContractorAI needs photo library access to attach images</string>

     <key>NSLocationWhenInUseUsageDescription</key>
     <string>ContractorAI uses location for project tracking</string>
     ```

2. **Version Numbers**
   - Version: `1.0.0`
   - Build: `1`

### 7. Archive the App

**Create the build for App Store:**

1. **Select "Any iOS Device"**
   - Device dropdown > "Any iOS Device (arm64)"

2. **Archive:**
   - Menu: `Product` > `Archive`
   - Wait 2-5 minutes for build
   - Archive window opens when done

3. **Organizer Window:**
   - Shows all your archives
   - Select the latest one
   - Click "Distribute App"

4. **Distribution Steps:**
   - Select: "App Store Connect"
   - Click "Next"
   - Select: "Upload"
   - Click "Next"
   - Select signing: "Automatically manage signing"
   - Click "Next"
   - Review and click "Upload"
   - Wait for upload (5-10 minutes)

### 8. App Store Connect Setup

**Go to:** https://appstoreconnect.apple.com

1. **Create App Listing:**
   - Click "My Apps" > "+" > "New App"
   - Platforms: iOS
   - Name: ContractorAI
   - Primary Language: English (U.S.)
   - Bundle ID: Select `com.elevatedsystems.contractorai`
   - SKU: `contractorai-001`
   - User Access: Full Access

2. **Fill In App Information:**

**App Information Tab:**
   - Name: ContractorAI
   - Subtitle: Smart Contractor Management
   - Category: Business > Productivity
   - Content Rights: Check if you own all rights

**Pricing and Availability:**
   - Price: Free (or set price)
   - Availability: All countries

**Version Information:**

**Description:**
```
ContractorAI is the ultimate contractor management platform for construction professionals.

KEY FEATURES:
• Professional Estimates & Invoices
• Project Management & Tracking
• Client Management
• Calendar & Scheduling
• Expense Tracking
• Financial Reports
• Offline Support

Perfect for contractors, HVAC techs, plumbers, electricians, and all service professionals.

Streamline your contracting business with ContractorAI.
```

**Keywords:**
```
contractor, estimate, invoice, construction, project management, hvac, plumbing, electrical, business
```

**Support URL:** Your website
**Marketing URL:** Your website (optional)
**Privacy Policy URL:** Required! (you need to create this)

### 9. Create Screenshots

**Required Screenshot Sizes:**
- 6.7" Display (iPhone 15 Pro Max): 1290 x 2796
- 6.5" Display (iPhone 11 Pro Max): 1242 x 2688
- 5.5" Display (iPhone 8 Plus): 1242 x 2208
- 12.9" iPad Pro: 2048 x 2732

**How to Create:**

1. Run app on each simulator size
2. Take screenshots: `Cmd + S` in simulator
3. Screenshots saved to Desktop
4. Upload to App Store Connect

**Screenshot Tips:**
- Show 3-5 key features
- Use actual app screens
- Add text overlay explaining features (optional)
- First screenshot is most important

### 10. Submit for Review

**In App Store Connect:**

1. **Select Build:**
   - In your app's "App Store" tab
   - Under "Build", click "+"
   - Select the uploaded build
   - Add export compliance: Select "No" if not using encryption

2. **Age Rating:**
   - Answer the questionnaire
   - Likely result: 4+

3. **Review Information:**
   - Contact Email
   - Contact Phone
   - Review Notes (optional but helpful)

4. **Submit:**
   - Click "Save"
   - Click "Add for Review"
   - Click "Submit for Review"

### 11. Review Process

**Timeline:**
- 24-48 hours typically
- Can be faster (few hours) or slower (1 week)

**Common Rejection Reasons:**
- Missing privacy policy
- Incomplete functionality
- App crashes
- Misleading screenshots
- Missing permission descriptions

**If Rejected:**
- Read rejection email carefully
- Fix issues
- Resubmit

### 12. After Approval

**When approved:**
- ✅ App goes live automatically (or on date you set)
- ✅ Available on App Store
- ✅ Users can download

**To Update:**
1. Make changes in your code
2. Build: `npm run build`
3. Sync: `npx cap sync ios`
4. Open Xcode
5. Increment version/build number
6. Archive and upload again
7. Submit new version

## Quick Reference Commands

```bash
# Build app
cd /Users/mikahalbertson/git/ContractorAI/contractorai2
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios

# Generate icons
# See section 3 above
```

## Troubleshooting

### "Provisioning profile doesn't include signing certificate"
- Xcode > Preferences > Accounts
- Select your Apple ID
- Click "Download Manual Profiles"
- Try archive again

### "Failed to register bundle identifier"
- Bundle ID might be taken
- Try: `com.elevatedsystems.contractorai.app`
- Or: `com.yourcompany.contractorai`

### App crashes on launch
- Check Console in Xcode for errors
- Likely Supabase keys or API issues
- Test in simulator first

### Build succeeds but archive fails
- Clean build folder: Product > Clean Build Folder
- Close Xcode
- Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Reopen and try again

## Need Help?

- **Apple Developer Forums:** https://developer.apple.com/forums/
- **Capacitor Docs:** https://capacitorjs.com/docs/ios
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/

---

**Next Steps:**
1. ✅ Generate app icons
2. ✅ Test on simulator
3. ✅ Test on real device
4. ✅ Archive for App Store
5. ✅ Upload to App Store Connect
6. ✅ Add screenshots and metadata
7. ✅ Submit for review

Good luck with your App Store submission! 🚀
