#!/bin/bash
set -e

cd "$(dirname "$0")/../ios" && xcodebuild -workspace JayTap.xcworkspace -scheme JayTap -configuration Release archive
