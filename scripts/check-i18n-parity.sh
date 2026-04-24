#!/usr/bin/env bash
# check-i18n-parity.sh — Phase 4 FORM-09 EN+RU key-set parity gate.
# Belt-and-suspenders: TypeScript already enforces via ru.ts: Record<TranslationKeys, string>.
# Use alongside `npx tsc --noEmit`; do NOT remove the tsc check in favor of this alone.

set -u
cd "$(dirname "$0")/.."

echo "== Phase-4 FORM-09 i18n parity grep =="

en_keys=$(grep -oE "'[a-zA-Z.]+':" src/locales/en.ts | sort -u)
ru_keys=$(grep -oE "'[a-zA-Z.]+':" src/locales/ru.ts | sort -u)

diff_out=$(diff <(echo "$en_keys") <(echo "$ru_keys") || true)

if [ -z "$diff_out" ]; then
  echo "OK   #1: en.ts and ru.ts key sets are identical"
  echo "==========================================="
  echo "PASS: FORM-09 key-set parity holds"
  exit 0
else
  echo "FAIL: en.ts and ru.ts key sets differ"
  echo "$diff_out"
  echo "==========================================="
  echo "FAIL: FORM-09 key-set parity broken"
  exit 1
fi
