#!/bin/bash

# ContractorAI - Push Notifications Setup Script
# This script installs and configures push notifications for iOS

set -e  # Exit on error

echo "🔔 ContractorAI Push Notifications Setup"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Step 1: Installing Capacitor notification plugins..."
npm install @capacitor/push-notifications @capacitor/local-notifications

echo ""
echo "✅ Packages installed successfully!"
echo ""

echo "🔄 Step 2: Syncing with iOS project..."
npx cap sync ios

echo ""
echo "✅ iOS project synced!"
echo ""

echo "📱 Step 3: Opening Xcode..."
echo "   You'll need to configure the following in Xcode:"
echo ""
echo "   1. Select 'App' target → Signing & Capabilities"
echo "   2. Click '+ Capability' and add:"
echo "      • Push Notifications"
echo "      • Background Modes (check 'Remote notifications')"
echo ""
echo "   3. Verify Info.plist contains:"
echo "      • NSUserNotificationsUsageDescription"
echo ""

read -p "Press Enter to open Xcode..."
npx cap open ios

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next Steps:"
echo "   1. Configure capabilities in Xcode (see above)"
echo "   2. Create APNs key in Apple Developer Portal"
echo "   3. Test notifications on a real device"
echo ""
echo "   📖 Full documentation: docs/PUSH_NOTIFICATIONS_SETUP.md"
echo ""
