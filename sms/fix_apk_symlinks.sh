#!/bin/bash
# Fix missing APK symlinks for Flutter builds
# This script ensures that APK symlinks exist in the expected Flutter build directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ANDROID_APK_DIR="android/app/build/outputs/flutter-apk"
FLUTTER_APK_DIR="build/app/outputs/flutter-apk"

# Create Flutter APK directory if it doesn't exist
mkdir -p "$FLUTTER_APK_DIR"

# Create symlinks for debug and release APKs if they exist
if [ -f "$ANDROID_APK_DIR/app-debug.apk" ]; then
    ln -sf "../../../../$ANDROID_APK_DIR/app-debug.apk" "$FLUTTER_APK_DIR/app-debug.apk"
    echo "✓ Created symlink for app-debug.apk"
else
    echo "⚠ app-debug.apk not found in $ANDROID_APK_DIR"
fi

if [ -f "$ANDROID_APK_DIR/app-release.apk" ]; then
    ln -sf "../../../../$ANDROID_APK_DIR/app-release.apk" "$FLUTTER_APK_DIR/app-release.apk"
    echo "✓ Created symlink for app-release.apk"
else
    echo "⚠ app-release.apk not found in $ANDROID_APK_DIR"
fi

echo "Done! APK symlinks fixed."






