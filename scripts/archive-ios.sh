#!/bin/bash
set -e

SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PBXPROJ="$PROJECT_ROOT/ios/JayTap.xcodeproj/project.pbxproj"

# Auto-increment build number (CURRENT_PROJECT_VERSION)
current=$(grep "CURRENT_PROJECT_VERSION" "$PBXPROJ" | head -1 | sed -n 's/.*CURRENT_PROJECT_VERSION = \([0-9]*\);/\1/p')
new=$((current + 1))
echo "Bumping build number: $current -> $new"
sed -i '' "s/CURRENT_PROJECT_VERSION = $current;/CURRENT_PROJECT_VERSION = $new;/g" "$PBXPROJ"

cd "$PROJECT_ROOT/ios" && xcodebuild -workspace JayTap.xcworkspace -scheme JayTap -configuration Release archive
