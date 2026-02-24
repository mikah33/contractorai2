#!/bin/sh
set -e

echo "Navigating to repository root..."
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Installing npm dependencies..."
npm install

echo "Installing CocoaPods..."
cd ios/App
pod install

echo "Build setup complete"
