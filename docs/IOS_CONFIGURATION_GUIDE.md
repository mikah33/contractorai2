# iOS Configuration Guide - App Store Preparation

## 1. Info.plist Required Updates

**File:** `/Users/mikahalbertson/git/ContractorAI/contractorai2/ios/App/App/Info.plist`

### Current Issues:
- Missing ALL permission usage descriptions
- Missing privacy-related keys
- Missing required iOS 17+ configurations

### Complete Updated Info.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Basic App Configuration -->
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>

    <key>CFBundleDisplayName</key>
    <string>ContractorAI</string>

    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>

    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>

    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>

    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>

    <key>CFBundlePackageType</key>
    <string>APPL</string>

    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>

    <key>CFBundleVersion</key>
    <string>1</string>

    <!-- REQUIRED: Permission Usage Descriptions -->

    <!-- Camera Access (for receipt capture) -->
    <key>NSCameraUsageDescription</key>
    <string>ContractorAI needs camera access to capture receipts, project photos, and documentation for your business records.</string>

    <!-- Photo Library Access -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>ContractorAI needs access to your photo library to select and upload receipts, project photos, and business documents.</string>

    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>ContractorAI needs permission to save receipts and project photos to your photo library for your records.</string>

    <!-- Calendar Access (Google Calendar integration) -->
    <key>NSCalendarsUsageDescription</key>
    <string>ContractorAI needs calendar access to sync appointments, project schedules, and client meetings with your device calendar.</string>

    <key>NSCalendarsWriteOnlyAccessUsageDescription</key>
    <string>ContractorAI needs permission to create and update calendar events for your project schedules and appointments.</string>

    <!-- User Tracking (iOS 14.5+) -->
    <key>NSUserTrackingUsageDescription</key>
    <string>This allows us to provide you with personalized features, improve the app experience, and measure advertising effectiveness if you use our ad management tools.</string>

    <!-- Contacts (if you plan to add contact import) -->
    <!-- Uncomment if you add contact features -->
    <!--
    <key>NSContactsUsageDescription</key>
    <string>ContractorAI needs access to your contacts to help you quickly add client information to your projects.</string>
    -->

    <!-- Location (if you add location features) -->
    <!-- Uncomment if you add location features -->
    <!--
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>ContractorAI uses your location to help you find nearby suppliers and calculate travel distances for project estimates.</string>

    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>ContractorAI uses your location to provide location-based features and project organization.</string>
    -->

    <!-- Face ID / Touch ID (if you add biometric authentication) -->
    <!-- Uncomment if you add biometric features -->
    <!--
    <key>NSFaceIDUsageDescription</key>
    <string>ContractorAI uses Face ID to securely protect your business and financial data.</string>
    -->

    <!-- App Transport Security -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <!-- Require HTTPS for all connections -->
        <key>NSAllowsArbitraryLoads</key>
        <false/>

        <!-- Exception domains (ONLY if absolutely necessary) -->
        <!-- Remove this if all APIs use HTTPS -->
        <!--
        <key>NSExceptionDomains</key>
        <dict>
            <key>localhost</key>
            <dict>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <true/>
            </dict>
        </dict>
        -->
    </dict>

    <!-- Background Modes (if you need background sync) -->
    <key>UIBackgroundModes</key>
    <array>
        <string>remote-notification</string>
    </array>

    <!-- Device Requirements -->
    <key>LSRequiresIPhoneOS</key>
    <true/>

    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>arm64</string>
    </array>

    <!-- UI Configuration -->
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>

    <key>UIMainStoryboardFile</key>
    <string>Main</string>

    <!-- Supported Orientations - iPhone -->
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>

    <!-- Supported Orientations - iPad -->
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>

    <key>UIViewControllerBasedStatusBarAppearance</key>
    <true/>

    <!-- URL Schemes (for OAuth callbacks) -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeRole</key>
            <string>Editor</string>
            <key>CFBundleURLName</key>
            <string>com.elevatedsystems.contractorai</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>contractorai</string>
            </array>
        </dict>
    </array>

    <!-- Queries Schemes (for opening external apps) -->
    <key>LSApplicationQueriesSchemes</key>
    <array>
        <string>googlechrome</string>
        <string>comgooglemaps</string>
    </array>

    <!-- iTunes File Sharing (allow users to access app documents) -->
    <key>UIFileSharingEnabled</key>
    <false/>

    <key>LSSupportsOpeningDocumentsInPlace</key>
    <false/>

    <!-- Scene Configuration (for modern apps) -->
    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <false/>
        <key>UISceneConfigurations</key>
        <dict>
            <key>UIWindowSceneSessionRoleApplication</key>
            <array>
                <dict>
                    <key>UISceneConfigurationName</key>
                    <string>Default Configuration</string>
                    <key>UISceneDelegateClassName</key>
                    <string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
                </dict>
            </array>
        </dict>
    </dict>

    <!-- Status Bar Style -->
    <key>UIStatusBarStyle</key>
    <string>UIStatusBarStyleDefault</string>

    <!-- Prevent Screenshot in App Switcher (for sensitive data) -->
    <!-- Uncomment if you want to hide content in app switcher -->
    <!--
    <key>UIApplicationSupportsIndirectInputEvents</key>
    <true/>
    -->
</dict>
</plist>
```

---

## 2. PrivacyInfo.xcprivacy (iOS 17+ Required)

**File:** `/Users/mikahalbertson/git/ContractorAI/contractorai2/ios/App/App/PrivacyInfo.xcprivacy`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Tracking Declaration -->
    <key>NSPrivacyTracking</key>
    <false/>

    <!-- Tracking Domains (empty if not tracking) -->
    <key>NSPrivacyTrackingDomains</key>
    <array/>

    <!-- Data Collection Types -->
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <!-- Email Address -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
                <string>NSPrivacyCollectedDataTypePurposeProductPersonalization</string>
            </array>
        </dict>

        <!-- Name -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeName</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>

        <!-- Customer Info (business contacts) -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeOtherContactInfo</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>

        <!-- Payment Info -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypePaymentInfo</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>

        <!-- Photos (receipts) -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypePhotosorVideos</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>

        <!-- Device ID -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeDeviceID</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
            </array>
        </dict>

        <!-- Product Interaction (usage analytics) -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeProductInteraction</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
                <string>NSPrivacyCollectedDataTypePurposeProductPersonalization</string>
            </array>
        </dict>

        <!-- Crash Data -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeCrashData</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>

        <!-- Performance Data -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypePerformanceData</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>

    <!-- Accessed API Types -->
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <!-- UserDefaults -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string> <!-- Access user defaults from app -->
            </array>
        </dict>

        <!-- File Timestamp -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>C617.1</string> <!-- Display file info -->
            </array>
        </dict>

        <!-- System Boot Time -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>35F9.1</string> <!-- Measure time intervals -->
            </array>
        </dict>

        <!-- Disk Space -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>E174.1</string> <!-- Check available storage -->
            </array>
        </dict>
    </array>
</dict>
</plist>
```

---

## 3. Xcode Project Configuration

### Update Build Settings

1. **Open Xcode project:**
```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2
open ios/App/App.xcworkspace
```

2. **Select App target → General:**
   - Display Name: `ContractorAI`
   - Bundle Identifier: `com.elevatedsystems.contractorai`
   - Version: `1.0.0`
   - Build: `1`
   - Minimum Deployments: `iOS 14.0` (or higher)

3. **Signing & Capabilities:**
   - Team: Select your Apple Developer team
   - Signing Certificate: Apple Development / Distribution
   - Provisioning Profile: Automatic or manual

   **Add Capabilities:**
   - Push Notifications
   - Background Modes → Remote notifications
   - Associated Domains (if using universal links)

4. **Build Settings:**
   - Enable Bitcode: `NO` (deprecated)
   - Strip Debug Symbols During Copy: `YES` (Release only)
   - Generate Debug Symbols: `YES`
   - Optimization Level: `-Os` (Release)
   - Swift Compilation Mode: `Whole Module` (Release)

---

## 4. App Icons Configuration

### Required Icon Sizes

**File:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json`

```json
{
  "images": [
    {
      "size": "20x20",
      "idiom": "iphone",
      "filename": "icon-20@2x.png",
      "scale": "2x"
    },
    {
      "size": "20x20",
      "idiom": "iphone",
      "filename": "icon-20@3x.png",
      "scale": "3x"
    },
    {
      "size": "29x29",
      "idiom": "iphone",
      "filename": "icon-29@2x.png",
      "scale": "2x"
    },
    {
      "size": "29x29",
      "idiom": "iphone",
      "filename": "icon-29@3x.png",
      "scale": "3x"
    },
    {
      "size": "40x40",
      "idiom": "iphone",
      "filename": "icon-40@2x.png",
      "scale": "2x"
    },
    {
      "size": "40x40",
      "idiom": "iphone",
      "filename": "icon-40@3x.png",
      "scale": "3x"
    },
    {
      "size": "60x60",
      "idiom": "iphone",
      "filename": "icon-60@2x.png",
      "scale": "2x"
    },
    {
      "size": "60x60",
      "idiom": "iphone",
      "filename": "icon-60@3x.png",
      "scale": "3x"
    },
    {
      "size": "1024x1024",
      "idiom": "ios-marketing",
      "filename": "icon-1024.png",
      "scale": "1x"
    }
  ],
  "info": {
    "version": 1,
    "author": "xcode"
  }
}
```

### Generate Icons

Use a tool like:
- https://appicon.co
- https://www.appicon.build
- Sketch/Figma with iOS template

**Upload 1024x1024 master icon, download all sizes**

---

## 5. LaunchScreen Configuration

Ensure launch screen is properly configured:

**File:** `ios/App/App/Base.lproj/LaunchScreen.storyboard`

Should display:
- App logo
- Company name (optional)
- Clean, simple design matching app style

---

## 6. Entitlements Configuration

**File:** `ios/App/App/App.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Push Notifications -->
    <key>aps-environment</key>
    <string>production</string>

    <!-- App Groups (if you need to share data with extensions) -->
    <!--
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.elevatedsystems.contractorai</string>
    </array>
    -->

    <!-- Associated Domains (for universal links) -->
    <!--
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:contractorai.com</string>
    </array>
    -->
</dict>
</plist>
```

---

## 7. Build and Archive Checklist

### Pre-Build Checklist

- [ ] All Info.plist keys configured
- [ ] PrivacyInfo.xcprivacy created
- [ ] App icons generated and added
- [ ] Launch screen configured
- [ ] Signing certificates configured
- [ ] Push notification certificates configured
- [ ] App version set to 1.0.0
- [ ] Build number set to 1

### Build Process

1. **Clean build folder:**
```bash
cd ios/App
xcodebuild clean
```

2. **Build web app:**
```bash
cd ../..
npm run build
```

3. **Sync Capacitor:**
```bash
npx cap sync ios
```

4. **Open Xcode:**
```bash
open ios/App/App.xcworkspace
```

5. **Select "Any iOS Device" as destination**

6. **Product → Archive**

7. **Wait for archive to complete**

8. **Distribute App → App Store Connect**

---

## 8. Common Build Errors & Fixes

### Error: "No valid code signing identity"
**Fix:** Configure signing in Xcode → Signing & Capabilities

### Error: "Missing Info.plist key"
**Fix:** Add missing key to Info.plist

### Error: "App icon missing"
**Fix:** Generate and add all required icon sizes

### Error: "Invalid bundle"
**Fix:** Ensure bundle ID matches App Store Connect

### Error: "Unsupported architecture"
**Fix:** Remove simulator slices: `lipo -remove x86_64`

---

## 9. Testing Before Submission

```bash
# Test on physical device
# 1. Connect iPhone via USB
# 2. Select your iPhone as destination in Xcode
# 3. Run (⌘R)

# Test features:
- [ ] Login/authentication
- [ ] Push notifications
- [ ] Camera access (receipt capture)
- [ ] Photo library access
- [ ] Calendar sync
- [ ] Payment flow
- [ ] Offline functionality
- [ ] All calculators
- [ ] AI chatbots
- [ ] Project management

# Performance testing:
- [ ] App launches quickly (<3 seconds)
- [ ] No crashes or freezes
- [ ] Memory usage reasonable
- [ ] Battery drain acceptable
- [ ] Network requests complete
```

---

## 10. App Store Connect Configuration

After successful archive and upload:

1. **Create App Record:**
   - Name: ContractorAI
   - Primary Language: English
   - Bundle ID: com.elevatedsystems.contractorai
   - SKU: CONTRACTORAI-001

2. **App Information:**
   - Category: Business / Productivity
   - Content Rights: Does not contain third-party content
   - Age Rating: 4+

3. **Pricing:**
   - Free app with in-app subscription
   - Configure subscription pricing ($24.99/month)

4. **App Privacy:**
   - Complete privacy questions based on PrivacyInfo.xcprivacy
   - Add privacy policy URL: https://contractorai.com/privacy

5. **App Review Information:**
   - Add demo account credentials for reviewers
   - Add notes explaining:
     - Stripe is for business tool subscriptions (not digital content)
     - AI features require OpenAI integration
     - Calendar permissions for business scheduling

---

**Complete these configurations before attempting App Store submission!**
