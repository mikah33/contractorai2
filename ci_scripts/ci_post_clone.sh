#!/bin/sh

# Xcode Cloud build script
set -e

echo "Installing npm dependencies..."
npm install

echo "Installing CocoaPods dependencies..."
cd ios/App
pod install

echo "Build setup complete"
