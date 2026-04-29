---
phase: 02-universal-keyboard-handling
plan: 03
status: complete
wave: 2
autonomous: true
requirements_addressed: [KBD-01]
completed: 2026-04-23
---

# 02-03 — Wave 2 Auth Screens (KASV wrap ×4)

## Outcome

Wave 2 auth slice **complete**. All four auth-flow screens (Login / Signup /
ForgotPassword / ResetPassword) now wrap their header + content sub-tree in
`<KeyboardAwareScrollView>` from `react-native-keyboard-controller`. Each
screen keeps `<AuthModalCloseButton>` as a **sibling** of KASV (per
RESEARCH §3.2 step 3) so the absolute-positioned close-button tap target
remains responsive. No new magic-number `keyboardVerticalOffset` was
introduced — the library-idiomatic `bottomOffset={20}` is used instead.

**Wave 2 (auth slice) complete — Plan 06 Tier 1 rows 1-4 ready for device matrix walk.**

## Commits

| # | SHA | Screen | Insertions / Deletions |
|---|-----|--------|------------------------|
| 1 | `857bd05` | LoginScreen.tsx | +66 / -59 |
| 2 | `a0acd3d` | SignupScreen.tsx | +80 / -73 |
| 3 | `0cca44a` | ForgotPasswordScreen.tsx | +79 / -73 |
| 4 | `54987f6` | ResetPasswordScreen.tsx | +92 / -86 |

All four are atomic (one file per commit) so Plan 06 can bisect any per-screen
regression independently.

Net code change per file is ~+7 lines (1 import + 4 KASV lines of opening tag
block + 1 closing tag + 1 sibling positioning); remaining line churn is indent
shifts inside the existing JSX block.

## What changed per screen

### LoginScreen (`857bd05`)

BEFORE → AFTER (representative diff; the other three screens share the same
shape transformation):

```diff
 import { SafeAreaView } from 'react-native-safe-area-context';
+import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

 return (
   <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
     {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}
-    <View style={styles.header}>
-      ...
-    </View>
-    <View style={styles.content}>
-      ...email + PasswordTextInput + buttons...
-    </View>
+    <KeyboardAwareScrollView
+      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
+      keyboardShouldPersistTaps="handled"
+      bottomOffset={20}
+    >
+      <View style={styles.header}>
+        ...
+      </View>
+      <View style={styles.content}>
+        ...email + PasswordTextInput + buttons...
+      </View>
+    </KeyboardAwareScrollView>
   </SafeAreaView>
 );
```

Inputs: email TextInput + PasswordTextInput (1 each).

### SignupScreen (`a0acd3d`)

Same shape transformation as LoginScreen. Inputs: email TextInput + 2×
PasswordTextInput (password + confirm). `<PasswordRequirements>` stays
interleaved between password and confirm inside the wrapped content block —
not an input, not touched.

### ForgotPasswordScreen (`0cca44a`)

Same shape transformation. The conditional `sent ? (success branch) : (form
branch)` is rendered **inside** the wrapped `<View style={styles.content}>` —
both branches are under KASV, which is correct (the form branch carries the
email TextInput; the success branch carries only buttons but benefits from the
consistent scroll container).

Load-bearing note: the email TextInput has `autoFocus`, so the keyboard pops
immediately on screen mount. KASV handles this initial-focus case per its
documented behavior — no additional code needed. Device verification deferred
to Plan 06 D-12 Tier 1 row 3.

### ResetPasswordScreen (`54987f6`)

Same shape transformation. Inputs: `linkOrCode` multiline TextInput + 2×
PasswordTextInput (newPassword + confirm). `<PasswordRequirements>` stays
interleaved between newPassword and confirm inside the wrapped content block.

**L10 mitigation (RESEARCH §8):** the `linkOrCode` TextInput carries
`multiline`, `minHeight: 88`, and `textAlignVertical: 'top'` — this is the
known "multiline TextInput refuses to grow inside ScrollView under Fabric"
landmine. Per the plan's mitigation strategy, those three props are preserved
**verbatim** in this wiring phase. Grow-behavior verification is deferred to
Plan 06 D-12 Tier 1 row 4 (paste a long reset link, confirm field grows on
both physical iPhone 15 Pro Max and Moto G XT2513V).

## Mechanical gates

| Gate | Result | Notes |
|------|--------|-------|
| `grep -l "KeyboardAwareScrollView" src/screens/{Login,Signup,ForgotPassword,ResetPassword}Screen.tsx` | 4 / 4 ✓ | One match per file |
| `grep -c "from 'react-native-keyboard-controller'" src/screens/{Login,Signup,ForgotPassword,ResetPassword}Screen.tsx` totals 4 | 1+1+1+1 = 4 ✓ | |
| `grep -c 'keyboardShouldPersistTaps="handled"' …` totals 4 | 1+1+1+1 = 4 ✓ | |
| `grep -c "bottomOffset={20}" …` totals 4 | 1+1+1+1 = 4 ✓ | |
| `grep -c "flexGrow: 1, justifyContent: 'center'" …` totals 4 | 1+1+1+1 = 4 ✓ | |
| `grep -rn "keyboardVerticalOffset" src/screens/{Login,Signup,ForgotPassword,ResetPassword}Screen.tsx` | 0 matches ✓ | No anti-pattern introduced |
| AuthModalCloseButton sibling-of-KASV (grep -B2) | 4 / 4 ✓ | Line immediately before `<KeyboardAwareScrollView` contains `AuthModalCloseButton` conditional |
| `git diff HEAD~4 -- src/components/PasswordTextInput.tsx` | empty ✓ | PasswordTextInput untouched across all 4 commits |
| `git diff HEAD~4 -- src/components/PasswordRequirements.tsx` | empty ✓ | PasswordRequirements untouched |
| `git diff HEAD~4 -- src/locales/en.json src/locales/ru.json` | empty ✓ | Zero new strings — Phase 2 is wiring, not copy (PATTERNS Pattern 4) |
| ResetPasswordScreen: `multiline` + `textAlignVertical` + `minHeight` preserved | 1 / 1 / 1 ✓ | L10 mitigation |
| ForgotPasswordScreen: `autoFocus` preserved | 1 ✓ | Initial-focus case for Plan 06 row 3 |
| ForgotPasswordScreen: `sent ?` conditional preserved | 2 matches ✓ | Both branches under KASV |
| `git log --oneline HEAD~4..HEAD` | 4 commits ✓ | One per screen |
| Per-commit `git diff --name-only HEAD~N HEAD~(N-1)` | 1 file each ✓ | Atomic; no cross-screen contamination |
| `npx tsc --noEmit` error count | 11 (unchanged baseline) ✓ | Pre-existing errors in `src/context/AuthContext.tsx` and `src/theme/ThemeContext.tsx` (documented at `deferred-items.md`); zero new errors introduced by any of the 4 edits |

## Deviations

**None.** Plan 02-03 executed exactly as contracted. Each of the 4 screens
received the verbatim wrap shape from PATTERNS Pattern 1 with the three
mandated props. No bugs surfaced, no missing critical functionality, no
blocking issues, no architectural surprises — this was pure mechanical wiring.

One minor observation, not a deviation: Plan 02-02's SUMMARY reported the
pre-existing TS error baseline as 10, but the actual count at HEAD is 11. The
delta (1) is a pre-existing TS7006/TS7053/TS2322 error cluster in
`AuthContext.tsx` / `ThemeContext.tsx` that was already present on `33d52f4`
before this plan ran. Verified by `git stash` pre-edit: `npx tsc --noEmit 2>&1
| grep -c "error TS"` returned 11 with my edits stashed. No new errors
introduced by any of this plan's 4 commits. Logged here for accuracy; no
action needed (pre-existing-in-deferred-items scope).

## Deferred (out-of-scope)

Same 11 pre-existing TS errors flagged by Plan 02-02 remain untouched. Address
outside Phase 2 scope. See `.planning/phases/02-universal-keyboard-handling/deferred-items.md`.

## Plan 06 handoff

The 4 Tier 1 rows that this plan unblocks for Plan 06's device-matrix walk:

| Row | Screen | Device-verification focus |
|-----|--------|---------------------------|
| 1 | LoginScreen | Email + password fields scroll above keyboard on iOS + Android; submit button reachable with keyboard open (single-tap, `keyboardShouldPersistTaps="handled"`); AuthModalCloseButton responds when tapped with keyboard open. |
| 2 | SignupScreen | All 3 inputs (email + password + confirm) scroll above keyboard; PasswordRequirements remains visible as user types; no layout jump on keyboard close. |
| 3 | ForgotPasswordScreen | `autoFocus` initial-focus case — keyboard appears on mount with email field centered above it (KASV should handle this automatically; verify no dead-space or field-occlusion). Success branch → form branch transition does not leak scroll position. |
| 4 | ResetPasswordScreen | L10 landmine — paste a long reset-link URL into the multiline `linkOrCode` field; verify the field grows (minHeight:88 is the floor; contents should push height up on both platforms). Both password fields scroll above keyboard. |

## Self-Check: PASSED

Artifacts verified present:
- `src/screens/LoginScreen.tsx` ✓ FOUND (contains `KeyboardAwareScrollView`)
- `src/screens/SignupScreen.tsx` ✓ FOUND (contains `KeyboardAwareScrollView`)
- `src/screens/ForgotPasswordScreen.tsx` ✓ FOUND (contains `KeyboardAwareScrollView`)
- `src/screens/ResetPasswordScreen.tsx` ✓ FOUND (contains `KeyboardAwareScrollView`)
- `.planning/phases/02-universal-keyboard-handling/02-03-SUMMARY.md` ✓ FOUND (this file)

Commits verified present:
- `857bd05` ✓ FOUND (LoginScreen)
- `a0acd3d` ✓ FOUND (SignupScreen)
- `0cca44a` ✓ FOUND (ForgotPasswordScreen)
- `54987f6` ✓ FOUND (ResetPasswordScreen)
