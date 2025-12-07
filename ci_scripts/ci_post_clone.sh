#!/bin/sh

# Xcode Cloud build script
set -e

echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

echo "Installing npm dependencies..."
npm install

echo "Checking node_modules..."
ls -la node_modules/@revenuecat/ || echo "RevenueCat not found in node_modules"

echo "Installing CocoaPods dependencies..."
cd ios/App
pod install

echo "Build setup complete"
