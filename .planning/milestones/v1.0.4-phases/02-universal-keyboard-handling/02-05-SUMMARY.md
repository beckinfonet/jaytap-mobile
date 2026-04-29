---
phase: 02-universal-keyboard-handling
plan: 05
status: complete
wave: 2
autonomous: true
requirements_addressed: [KBD-01, KBD-02]
completed: 2026-04-23
---

# 02-05 — Wave 2 Chat Slice (library KAV drop-in)

## Outcome

Wave 2 **chat slice complete**. Both chat screens now import
`KeyboardAvoidingView` from `react-native-keyboard-controller` (library's drop-in)
and the `keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}` magic-number
anti-pattern (PITFALLS §Pitfall 2) is eliminated from the entire `src/` tree.
The cross-platform `behavior` conditional is also gone — library defaults handle
offset + behavior via the root `KeyboardProvider` wired in Plan 02-02.

Combined with Plan 02-03 (4 auth screens KASV) + Plan 02-04 (AccountSettings +
CreateListing both branches KASV), **all of Wave 2 is now landed**. Plan 02-06
(Wave 3 physical-device matrix walk + phase sign-off) is unblocked.

## Commits

| SHA | Message | Files | Diff |
|-----|---------|-------|------|
| `f728b3b` | feat(02-05): swap ChatThreadScreen RN KeyboardAvoidingView → library KAV; remove magic offset (KBD-01, KBD-02, D-09) | `src/screens/ChatThreadScreen.tsx` | +2 −7 (net −5) |
| `8fd7b6f` | feat(02-05): swap ChatComposeScreen RN KeyboardAvoidingView → library KAV; remove magic offset (KBD-01, KBD-02, D-09) | `src/screens/ChatComposeScreen.tsx` | +2 −7 (net −5) |

Each commit is a single-file atomic change, bisectable independently if Plan 06
device verification surfaces a per-screen regression. Both match D-09's
"~5 lines per file" contract.

## What changed (verbatim diff shape — structurally identical twins)

### ChatThreadScreen.tsx

Import block (lines 1–13):

```diff
 import React, { useState, useEffect, useRef, useCallback } from 'react';
 import {
   View,
   Text,
   StyleSheet,
   FlatList,
   TextInput,
   TouchableOpacity,
   ActivityIndicator,
   Alert,
-  KeyboardAvoidingView,
-  Platform,
 } from 'react-native';
+import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
 import { SafeAreaView } from 'react-native-safe-area-context';
```

KAV opening tag (was lines 183–187, now line 182):

```diff
-        <KeyboardAvoidingView
-          style={styles.keyboardView}
-          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
-          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
-        >
+        <KeyboardAvoidingView style={styles.keyboardView}>
```

`</KeyboardAvoidingView>` closing tag UNCHANGED (now resolves to library's
component via the new import). FlatList + composer body + `multiline` TextInput
UNCHANGED.

### ChatComposeScreen.tsx

Structurally identical diff — same 2 edits, same shape. Only difference: the
RN import block for ChatComposeScreen includes `Image` (used for the property
avatar preview card); `Image` is preserved. See commit `8fd7b6f`.

## Per-file Platform-import retention decision

| File | Pre-grep result (`grep -nE "Platform\." src/…`) | Decision | Evidence |
|------|-------------------------------------------------|----------|----------|
| `src/screens/ChatThreadScreen.tsx` | Only 2 lines: `185: behavior=…Platform.OS…`, `186: keyboardVerticalOffset=…Platform.OS…` | **REMOVED** `Platform,` from RN import (choice a) | Both `Platform.OS` references sat inside the two props this plan deletes. No other `Platform.*` usage in the file. Post-edit `grep -c "Platform" src/screens/ChatThreadScreen.tsx` returns 0. `npx tsc --noEmit` introduces zero new errors on this file. |
| `src/screens/ChatComposeScreen.tsx` | Only 2 lines: `116: behavior=…Platform.OS…`, `117: keyboardVerticalOffset=…Platform.OS…` | **REMOVED** `Platform,` from RN import (choice a) | Same analysis. Post-edit `grep -c "Platform" src/screens/ChatComposeScreen.tsx` returns 0. Zero new TS errors. `Image` retained in the RN import (used by the avatar `<Image source={{ uri: imageUrl }} />` preview). |

Plan 06 verifier: both files are `Platform`-free; any future use of
`Platform.OS` in either file will need to re-import it explicitly.

## Mechanical gates (all pass)

### Per-file gates

| Gate | `ChatThreadScreen` | `ChatComposeScreen` |
|------|:---:|:---:|
| `grep -c "from 'react-native-keyboard-controller'"` | 1 ✓ | 1 ✓ |
| `grep -c "import { KeyboardAvoidingView }"` | 1 ✓ | 1 ✓ |
| `grep -c "<KeyboardAvoidingView"` | 1 ✓ | 1 ✓ |
| `grep -c "</KeyboardAvoidingView>"` | 1 ✓ | 1 ✓ |
| `grep -c "keyboardVerticalOffset"` | **0** ✓ | **0** ✓ |
| `grep -c "behavior="` | **0** ✓ | **0** ✓ |
| `grep -c "Platform"` | **0** ✓ | **0** ✓ |
| `grep -c "multiline"` | 1 ✓ (composer preserved) | 1 ✓ (composer preserved) |
| `grep -c "FlatList"` | 3 ✓ (import + type + JSX) | — (not used) |
| `grep -c "Image"` | — | 3 ✓ (import + JSX + uri) |
| `npx tsc --noEmit` new errors on this file | 0 ✓ | 0 ✓ |

### Plan exit gate (combined chat surface)

```bash
$ grep -rn 'keyboardVerticalOffset' \
    src/screens/ChatThreadScreen.tsx \
    src/screens/ChatComposeScreen.tsx | wc -l
0
```

### Phase exit gate (RESEARCH §6 SC3.a / KBD-02 — phase-wide)

```bash
$ grep -rn 'keyboardVerticalOffset' /Users/beckmaldinVL/development/mobileApps/JayTap/src/
(no matches)

$ grep -rn 'keyboardVerticalOffset' /Users/beckmaldinVL/development/mobileApps/JayTap/src/ | wc -l
0
```

**PASSED.** The canonical anti-pattern PITFALLS §Pitfall 2 calls out is now
absent from the entire `src/` tree. Phase 2's load-bearing mechanical exit
predicate is satisfied; KBD-02 "single root-level solution, not per-screen
patching" is provably held.

### i18n parity gate

```bash
$ git diff HEAD~2 -- src/locales/en.json src/locales/ru.json
(empty)
```

Phase 2 introduced zero new UI strings on the chat surface — confirmed across
both commits. EN + RU parity preserved (no action needed).

### Atomic commit gate

```bash
$ git diff HEAD~2 --name-only
src/screens/ChatComposeScreen.tsx
src/screens/ChatThreadScreen.tsx
```

Exactly 2 files touched across the 2 commits; no collateral edits.

## Preserved verbatim (Plan 06 verification contract)

- **multiline composer on ChatThreadScreen** (`src/screens/ChatThreadScreen.tsx:201`
  — was 203 pre-edit, shifted by 2 removed JSX lines): preserved verbatim with
  `multiline maxLength={2000} editable={!sending}`. Plan 06 D-12 Tier 1 **row 7**
  contract: paste a multi-line message, confirm composer grows on iPhone 15 Pro
  Max / iOS 26.4 + Moto G XT2513V / Android 16. Tests for the L10 landmine
  (RESEARCH §8 — multiline TextInput inside ScrollView under Fabric refuses to
  grow).
- **multiline composer on ChatComposeScreen** (`src/screens/ChatComposeScreen.tsx:121`
  — was 126 pre-edit, shifted by 5 removed JSX lines): same `multiline` props
  preserved verbatim. Plan 06 D-12 Tier 1 **row 8** contract: same paste-a-multi-
  line test on both devices.
- **FlatList + composer layout in ChatThreadScreen**: the existing
  FlatList-above-composer arrangement is unchanged. No inverted-list refactor
  was attempted (D-09 scope).

## Android back-button conflict (code review)

Phase 1's `BackHandler` `useEffect` at `App.tsx:214–297` (commit `bf33c41`) was
re-inspected during this plan. It only intercepts back presses when an overlay
is open (listing detail, profile sub-screen, etc.) — it does NOT watch the
keyboard state. Library's `KeyboardProvider` does not register a competing
back-handler; it relies on RN's native keyboard-dismiss-on-back under
`windowSoftInputMode="adjustResize"` (already set per D-06). No conflict
expected. Device confirmation happens in Plan 06 (Wave 3 matrix rows 7/8
back-button sub-check).

## Deviations from Plan

**None.** Plan 02-05 executed exactly as written:

- No Rule 1 bug fixes needed (edits succeeded cleanly on first pass).
- No Rule 2 missing functionality added (D-09 is a literal ~5-line drop-in).
- No Rule 3 blocking issues (library was installed in Plan 02-01, provider
  wired in Plan 02-02 — preconditions verified in Task 1).
- No Rule 4 architectural decisions needed (KeyboardStickyView deferred per
  D-10 — executor did not attempt it).

## Deferred / Out of scope (re-anchored)

- **`KeyboardStickyView`** (composer pinned above keyboard, iMessage/Telegram
  style) — NOT introduced. Deferred to M2 per CONTEXT D-10. Both files still
  use the standard `KeyboardAvoidingView` wrapper shape.
- **Pre-existing TypeScript errors** in `src/context/AuthContext.tsx` and
  `src/theme/ThemeContext.tsx` (10 total) — unchanged by this plan; already
  logged at `.planning/phases/02-universal-keyboard-handling/deferred-items.md`
  per Plan 02-02 precedent. Out of Phase 2 scope.
- **iOS behavior fine-tuning** — if Plan 06 device verification surfaces a
  1–2 px visual gap between composer and keyboard, the fix per the plan +
  RESEARCH §3.5 is a `paddingBottom` on `styles.inputRow`, NOT a re-introduced
  `keyboardVerticalOffset` prop. Re-introducing the offset would break the
  phase exit gate.

## Downstream contract

**Wave 2 is fully landed.** With commits `857bd05`, `a0acd3d`, `0cca44a`,
`54987f6` (Plan 02-03 auth ×4) + `092caf7`, `ecbe3c5` (Plan 02-04 settings +
listing ×3) + `f728b3b`, `8fd7b6f` (this plan — chat ×2), every D-12 Tier 1
and Tier 2 screen is now on library wrappers. **Plan 02-06 Tier 1 rows 7–8
ready for device matrix walk.** The planner/executor of 02-06 can proceed
without further Wave-2 blocker checks.

## Self-Check: PASSED

Verified claims:

- `src/screens/ChatThreadScreen.tsx` modified as documented
  (`grep -c "from 'react-native-keyboard-controller'" src/screens/ChatThreadScreen.tsx` → 1; `grep -c "keyboardVerticalOffset" src/screens/ChatThreadScreen.tsx` → 0)
- `src/screens/ChatComposeScreen.tsx` modified as documented
  (same two greps → 1 and 0 respectively)
- Commit `f728b3b` present: `git log --oneline | grep f728b3b` → found
- Commit `8fd7b6f` present: `git log --oneline | grep 8fd7b6f` → found
- Phase-wide exit gate: `grep -rn 'keyboardVerticalOffset' src/ | wc -l` → 0
- Plan-exit gate (chat surface): `grep -rn 'keyboardVerticalOffset' src/screens/Chat*Screen.tsx | wc -l` → 0
- i18n parity: `git diff HEAD~2 -- src/locales/en.json src/locales/ru.json` empty
- Atomic file touch: `git diff HEAD~2 --name-only` lists only the two chat screen files

All success criteria satisfied. Plan 02-05 complete.
