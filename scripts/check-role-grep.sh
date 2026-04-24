#!/usr/bin/env bash
# check-role-grep.sh — Phase 3 (Role Gating Precursor) D-14 invariant enforcer.
#
# Runs four grep invariants across src/ and fails non-zero if any regressed.
# Designed to run in CI or pre-commit. No external deps beyond bash + grep.
#
# Expected clean output: four "OK" lines + a banner. Exit 0.
# Any failure prints the violating grep output and the invariant number, exit 1.

set -u
cd "$(dirname "$0")/.."

fail=0
violations=""

echo "== D-14 Phase-3 role-gating grep invariant =="

# Invariant 1: no inline `userType === 'admin'` in src/
# Exception: src/hooks/useRole.ts IS the single canonical site where this comparison
# lives (the D-03 priority-ladder branch 2 + doc-comment). All call sites must route
# through `can(action)` / `<Gated>` — see D-14 + D-05. This mirrors invariant #2's
# "hook internals" carve-out from CONTEXT.md.
hits1=$(grep -rn "userType === 'admin'" src/ 2>/dev/null | grep -v '^src/hooks/useRole\.ts:' || true)
if [ -n "$hits1" ]; then
  echo "FAIL #1: userType === 'admin' found outside src/hooks/useRole.ts"
  echo "$hits1"
  fail=1
  violations="$violations #1"
else
  echo "OK   #1: no inline userType === 'admin' comparisons outside useRole.ts"
fi

# Invariant 2: `backendProfile.userType` only inside useRole.ts
hits2=$(grep -rn "backendProfile\.userType" src/ 2>/dev/null | grep -v '^src/hooks/useRole\.ts:' || true)
if [ -n "$hits2" ]; then
  echo "FAIL #2: backendProfile.userType found outside src/hooks/useRole.ts"
  echo "$hits2"
  fail=1
  violations="$violations #2"
else
  echo "OK   #2: backendProfile.userType read only inside useRole.ts"
fi

# Invariant 3: ADMIN_EMAIL / adminAllowlist identifiers only in useRole.ts + adminAllowlist.ts
hits3=$(grep -rn -E "ADMIN_EMAIL|adminAllowlist" src/ 2>/dev/null | grep -v -E '^src/(constants/adminAllowlist\.ts:|hooks/useRole\.ts:)' || true)
if [ -n "$hits3" ]; then
  echo "FAIL #3: ADMIN_EMAIL or adminAllowlist referenced outside the two allowed files"
  echo "$hits3"
  fail=1
  violations="$violations #3"
else
  echo "OK   #3: allowlist identifiers confined to useRole.ts + adminAllowlist.ts"
fi

# Invariant 4: isAllowlistedAdmin only in adminAllowlist.ts + useRole.ts
hits4=$(grep -rn "isAllowlistedAdmin" src/ 2>/dev/null | grep -v -E '^src/(constants/adminAllowlist\.ts:|hooks/useRole\.ts:)' || true)
if [ -n "$hits4" ]; then
  echo "FAIL #4: isAllowlistedAdmin referenced outside the two allowed files"
  echo "$hits4"
  fail=1
  violations="$violations #4"
else
  echo "OK   #4: isAllowlistedAdmin symbol confined to its definition + hook consumer"
fi

echo "==========================================="
if [ $fail -eq 0 ]; then
  echo "PASS: all 4 D-14 grep invariants hold"
  exit 0
else
  echo "FAIL: D-14 violations in invariants:$violations"
  exit 1
fi
