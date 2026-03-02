#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_BUILD_GRADLE="$ROOT_DIR/android/app/build.gradle"

if [[ ! -f "$APP_BUILD_GRADLE" ]]; then
  echo "Could not find android/app/build.gradle. Are you in the project root?"
  exit 1
fi

echo "Using $APP_BUILD_GRADLE"

# --- Bump versionCode ---
current_code_line="$(grep -m1 'versionCode' "$APP_BUILD_GRADLE" || true)"
if [[ -z "$current_code_line" ]]; then
  echo "versionCode not found in $APP_BUILD_GRADLE"
  exit 1
fi

current_code="$(echo "$current_code_line" | awk '{print $2}')"
if ! [[ "$current_code" =~ ^[0-9]+$ ]]; then
  echo "Could not parse numeric versionCode from line: $current_code_line"
  exit 1
fi

new_code=$((current_code + 1))

echo "Bumping versionCode: $current_code -> $new_code"
perl -pi -e "s/versionCode[[:space:]]+$current_code/versionCode $new_code/" "$APP_BUILD_GRADLE"

# --- Optionally bump versionName patch (e.g. 1.0.1 -> 1.0.2) ---
current_name_line="$(grep -m1 'versionName' "$APP_BUILD_GRADLE" || true)"
if [[ -n "$current_name_line" ]]; then
  current_name="$(echo "$current_name_line" | sed -E 's/.*versionName[[:space:]]+\"(.*)\".*/\1/')"

  IFS='.' read -r major minor patch <<< "$current_name"
  if [[ -n "${patch:-}" && "$patch" =~ ^[0-9]+$ ]]; then
    new_patch=$((patch + 1))
    new_name="${major}.${minor}.${new_patch}"
    echo "Bumping versionName: $current_name -> $new_name"
    perl -pi -e "s/versionName[[:space:]]+\"$current_name\"/versionName \"$new_name\"/" "$APP_BUILD_GRADLE"
  else
    echo "versionName does not look like MAJOR.MINOR.PATCH (got \"$current_name\"). Leaving it unchanged."
  fi
else
  echo "versionName not found; leaving unchanged."
fi

echo "Running Android bundleRelease..."
cd "$ROOT_DIR/android"
./gradlew bundleRelease

echo
echo "Done."
echo "Output bundle:"
echo "  $ROOT_DIR/android/app/build/outputs/bundle/release/app-release.aab"

