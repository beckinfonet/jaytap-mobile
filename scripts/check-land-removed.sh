#!/usr/bin/env bash
# check-land-removed.sh — Phase 4 (FORM-01) atomic removal enforcer.
#
# Runs grep invariants across src/ and fails non-zero if any `Land` touchpoint leaked back.
# Exception: lexical English words landlord / landscape are permitted (invariant #1
# matches quoted 'Land'/"Land" only, so landlord/landscape do not match).

set -u
cd "$(dirname "$0")/.."

fail=0
violations=""

echo "== Phase-4 FORM-01 Land-removal grep invariant =="

# Invariant 1: no 'Land' or "Land" string literal in src/ (allow landlord/landscape as wordy alternates)
hits1=$(grep -rn "'Land'\|\"Land\"" src/ 2>/dev/null || true)
if [ -n "$hits1" ]; then
  echo "FAIL #1: 'Land' or \"Land\" string literal found in src/"
  echo "$hits1"
  fail=1
  violations="$violations #1"
else
  echo "OK   #1: no 'Land' string literal in src/"
fi

# Invariant 2: no propertyType.land i18n key in src/
hits2=$(grep -rn "propertyType\.land" src/ 2>/dev/null || true)
if [ -n "$hits2" ]; then
  echo "FAIL #2: propertyType.land key reference found in src/"
  echo "$hits2"
  fail=1
  violations="$violations #2"
else
  echo "OK   #2: propertyType.land key removed"
fi

echo "==========================================="
if [ $fail -eq 0 ]; then
  echo "PASS: all FORM-01 grep invariants hold"
  exit 0
else
  echo "FAIL: FORM-01 violations in invariants:$violations"
  exit 1
fi
