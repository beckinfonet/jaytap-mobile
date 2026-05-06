#!/usr/bin/env bash
# Phase 2 atomic-deletion sentinel — enforces FLOW-14 + D-22.
# Exits 0 if NO references to the deleted CreateListingScreen / CreateListingForm exist.
# Exits 1 if any reference is found (would mean the deletion regressed).
#
# Pattern source: M1 Phase 4 `scripts/check-land-removed.sh` enforcement pattern.
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Search the source tree (excluding node_modules + ios + android + .planning + scripts itself)
# for any import or path reference to the deleted screen + barrel.
MATCHES=$(grep -rnE "from ['\"].*src/screens/CreateListingScreen['\"]|from ['\"].*components/CreateListingForm['\"]|import.*CreateListingScreen|require\(['\"].*CreateListingScreen['\"]|import\(['\"].*CreateListingScreen['\"]" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=ios --exclude-dir=android --exclude-dir=.planning --exclude-dir=scripts \
  src/ App.tsx 2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  echo "FLOW-14 / D-22 atomic-deletion sentinel FAILED."
  echo "Found references to deleted CreateListingScreen / CreateListingForm:"
  echo "$MATCHES"
  exit 1
fi

echo "FLOW-14 / D-22 atomic-deletion sentinel PASSED — no references to deleted screen/barrel."
exit 0
