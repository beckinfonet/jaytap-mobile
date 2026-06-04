#!/bin/bash
set -e

SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PBXPROJ="$PROJECT_ROOT/ios/JayTap.xcodeproj/project.pbxproj"

# Optionally set the marketing version (CFBundleShortVersionString) via the first arg:
#   ./scripts/archive-ios.sh 3.0.11
#
# WHY THIS EXISTS: bumping only the build number (below) is enough while a version
# is still in review, but once a marketing version is APPROVED/released on App
# Store Connect its "train" CLOSES — no new build (even with a higher build
# number) is accepted under it. That surfaces as upload errors:
#   90062  "...must contain a higher version than the previously approved version"
#   90186  "Invalid Pre-Release Train. The train version 'X.Y.Z' is closed..."
# The fix for both is to raise the marketing version. Pass the next version here.
if [ -n "$1" ]; then
  if ! echo "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo "ERROR: marketing version must look like X.Y.Z (got '$1')" >&2
    exit 1
  fi
  echo "Setting marketing version (CFBundleShortVersionString) -> $1"
  sed -i '' "s/MARKETING_VERSION = [0-9.]*;/MARKETING_VERSION = $1;/g" "$PBXPROJ"
fi

# Auto-increment build number (CURRENT_PROJECT_VERSION) — must be unique per upload.
current=$(grep "CURRENT_PROJECT_VERSION" "$PBXPROJ" | head -1 | sed -n 's/.*CURRENT_PROJECT_VERSION = \([0-9]*\);/\1/p')
new=$((current + 1))
echo "Bumping build number: $current -> $new"
sed -i '' "s/CURRENT_PROJECT_VERSION = $current;/CURRENT_PROJECT_VERSION = $new;/g" "$PBXPROJ"

marketing=$(grep "MARKETING_VERSION" "$PBXPROJ" | head -1 | sed -n 's/.*MARKETING_VERSION = \([0-9.]*\);/\1/p')
echo ""
echo "==> Archiving JayTap  version ${marketing}  (build ${new})"
echo "    If ${marketing} was already approved on App Store Connect, re-run with a"
echo "    higher version:  ./scripts/archive-ios.sh <next-version>"
echo ""

cd "$PROJECT_ROOT/ios" && xcodebuild -workspace JayTap.xcworkspace -scheme JayTap -configuration Release archive
