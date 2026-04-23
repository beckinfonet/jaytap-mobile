---
phase: 02-universal-keyboard-handling
plan: 06
type: verification-matrix
status: complete
captured: 2026-04-23
devices:
  ios:
    model: iPhone 15 Pro Max
    os: iOS 26.4
  android:
    model: Moto G XT2513V
    os: Android 16
library_versions:
  react-native-reanimated: 4.3.0
  react-native-worklets: 0.8.1
  react-native-keyboard-controller: 1.21.6
build_mode: Fabric (New Architecture)
newArchEnabled: true
wave_3_entry_gate:
  phase_wide_grep_keyboardVerticalOffset_in_src: 0
  kasv_imports_across_6_screens: 6
  library_kav_imports_across_2_chat_screens: 2
  wave_2_summaries_present: 5
requirements_addressed: [KBD-01, KBD-02, KBD-04]
head_at_matrix_creation: 0b81112
---

# Phase 2: Universal Keyboard Handling — Verification Matrix

**Captured:** 2026-04-23
**Matrix plan:** 02-06-PLAN.md (Wave 3 — physical-device verification matrix + phase sign-off)
**Git HEAD at matrix creation:** `0b81112` (Wave 2 closed — `docs(02-05): complete Wave 2 chat slice — 2 KAV drop-ins; phase-wide keyboardVerticalOffset gate PASSED (KBD-01, KBD-02, D-09)`)

---

## Devices (D-13 — physical-device only)

| Role    | Device            | OS         |
| ------- | ----------------- | ---------- |
| iOS     | iPhone 15 Pro Max | iOS 26.4   |
| Android | Moto G XT2513V    | Android 16 |

## Library versions (from 02-01-SUMMARY.md — Wave 0 install receipts)

| Package                            | Installed  | Pin       |
| ---------------------------------- | ---------- | --------- |
| `react-native-reanimated`          | **4.3.0**  | `^4.3.0`  |
| `react-native-worklets`            | **0.8.1**  | `^0.8.0`  |
| `react-native-keyboard-controller` | **1.21.6** | `^1.21.6` |

## Build mode (KBD-04 evidence anchor)

Fabric / New Architecture — `newArchEnabled=true` confirmed in `android/gradle.properties`
(`grep -c "newArchEnabled=true" android/gradle.properties` → **1**).

iOS Fabric on — RCTNewArch enabled per `.planning/codebase/STACK.md:22` (pre-existing for RN 0.84).

---

## Exit gate (RESEARCH §7.5 phase-exit predicate)

> **Zero `Fail` cells in Tier 1 is the Phase 2 exit gate per RESEARCH §7.5.**
>
> - Tier 1 Fail → phase blocks; triage is "regression (revert + re-plan)" vs. "pre-existing
>   known issue (accept-with-note from user)."
> - Tier 2 Fail → smoke-tier; recoverable — accept-with-note OR open follow-up; does NOT
>   block phase exit IF user accepts in writing.
> - L10 multiline growth Fail → treat as Tier 1 severity per RESEARCH §8 L10 + §3.5 — chat
>   composer UX regression. Mitigation escalation path is `KeyboardStickyView` (D-10),
>   which is a scope expansion requiring user approval, not an inline fix.
> - Android back-button Fail → treat as Tier 1 severity — would indicate conflict with
>   Phase 1's BackHandler (`App.tsx:184-297`), a cross-phase regression.

---

## Cell markers

✅ Pass · ❌ Fail · — N/A · ⬜ Pending

---

## Tier 1 (Full test per CONTEXT D-12)

> 8 screens × 2 platforms = 16 cells. ALL must be `Pass` for phase exit.

| Row # | Screen                                    | Input(s) tested                                                                                        | iOS | Android | Notes |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ | --- | ------- | ----- |
| 1     | LoginScreen                               | email TextInput, PasswordTextInput (eye icon toggle under keyboard)                                    | ✅  | ✅      | Pass — user walk 2026-04-23 |
| 2     | SignupScreen                              | email TextInput, password PasswordTextInput, confirm PasswordTextInput                                 | ✅  | ✅      | Pass — user walk 2026-04-23 |
| 3     | ForgotPasswordScreen                      | email TextInput (autoFocus initial-pop case per PATTERNS line 424)                                     | ✅  | ✅      | Pass — user walk 2026-04-23 |
| 4     | ResetPasswordScreen                       | linkOrCode TextInput (multiline — L10), new password, confirm password                                 | ✅  | ✅      | Pass — user walk 2026-04-23 |
| 5     | CreateListingScreen — admin-verify branch | no inputs today — verify scroll & 3× Switch row interaction + save button remain unbroken              | ✅  | ✅      | Pass — user walk 2026-04-23 |
| 6     | CreateListingScreen — main form           | sample 3 inputs spanning top / middle / bottom (title, address, description)                           | ✅  | ✅      | Pass — user walk 2026-04-23 |
| 7     | ChatThreadScreen                          | composer TextInput (multiline — L10) + Android hardware back dismisses keyboard without popping screen | ✅  | ✅      | Initial walk FAILED (library KAV no-opped without `behavior` prop — disproves RESEARCH §9 A8). Fix committed as `47a52b7` — added `behavior="padding"`. Re-walk 2026-04-23 PASSED on both platforms. |
| 8     | ChatComposeScreen                         | composer TextInput (multiline — L10)                                                                   | ✅  | ✅      | Same root cause + fix as row 7. Re-walk 2026-04-23 PASSED on both platforms. |

---

## Tier 2 (Smoke test per CONTEXT D-12)

> 2 screens × 2 platforms = 4 cells. Smoke-tier failure is recoverable (RESEARCH §7.5).

| Row # | Screen                | Input                                                | iOS | Android | Notes |
| ----- | --------------------- | ---------------------------------------------------- | --- | ------- | ----- |
| 9     | AccountSettingsScreen | one TextInput while in edit mode (tap e.g. Name row) | ✅  | ✅      | Pass — user walk 2026-04-23 |
| 10    | HomeScreen            | search TextInput at top of home tab                  | ✅  | ✅      | Pass — user walk 2026-04-23. Both platforms PASS → HomeScreen workaround comment REMOVE approved per D-Discretion. |

---

## Out-of-scope (informational)

| Row # | Screen                | Input  | Status                                                            |
| ----- | --------------------- | ------ | ----------------------------------------------------------------- |
| —     | ScheduleViewingScreen | (none) | N/A — no TextInput in file today (D-12 + RESEARCH §3.1 inventory) |

---

## L10 multiline composer verification (RESEARCH §8 L10 + §3.5)

> Multiline `TextInput`s inside ScrollView under Fabric have a known refusal-to-grow bug
> (L10). Verification here is "type/paste enough text to force growth past 1 line on
> physical hardware and confirm the field expands to fit."
>
> Sites under test:
> - `src/screens/ChatThreadScreen.tsx` composer (multiline, maxLength 2000) — paste a
>   5-line message, confirm composer grows past 1 line
> - `src/screens/ChatComposeScreen.tsx` composer (multiline, maxLength 2000) — same test
> - `src/screens/ResetPasswordScreen.tsx` linkOrCode (multiline, minHeight:88,
>   textAlignVertical:'top') — paste a long reset link, confirm field grows

| Test                                     | iOS | Android | Notes |
| ---------------------------------------- | --- | ------- | ----- |
| ChatThread composer grows multiline      | ✅  | ✅      | Pass — after `behavior="padding"` fix. Multi-line messages grow past 1 line on both platforms. |
| ChatCompose composer grows multiline     | ✅  | ✅      | Pass — same fix, same platforms. |
| ResetPassword linkOrCode grows multiline | ✅  | ✅      | Pass — user walk 2026-04-23. minHeight:88 + textAlignVertical:'top' preserved; grew correctly with long reset link paste. |

**Escalation if any cell Fails:** `KeyboardStickyView` adoption is deferred to M2 per CONTEXT
D-10. An L10 failure is a scope-expansion request back to the user — NOT an inline patch.

---

## Android hardware back-button regression check (RESEARCH §3.5)

> Phase 1's BackHandler at `App.tsx:184-297` + library's keyboard-dismiss-on-back must not
> conflict. Phase 1 expected behavior: back button pops chat screen back to chat list.
> Library expected behavior: back button dismisses keyboard if open, falls through
> otherwise. Two presses should be required when keyboard is open.

| Test                                                                                                        | Android only | Notes |
| ----------------------------------------------------------------------------------------------------------- | ------------ | ----- |
| ChatThread: open keyboard → press hardware back → keyboard dismisses, screen does NOT pop                   | ✅           | Pass — user walk 2026-04-23. No BackHandler conflict with Phase 1 (App.tsx:184-297). |
| ChatThread: keyboard dismissed → press hardware back AGAIN → screen pops back per Phase 1 expected behavior | ✅           | Pass — user walk 2026-04-23. Second back pops to chat list as expected. |

**Escalation if either cell Fails:** Would indicate BackHandler conflict. Mitigation path
from RESEARCH §3.5 — `onBackPress` already returns `false` to fall through when no overlay
is open. If not sufficient: explicit "if keyboard open, return false (let RN dismiss)"
branch would require importing `Keyboard` and is an out-of-scope expansion.

---

## HomeScreen workaround removal decision (CONTEXT D-Discretion + RESEARCH §3.6)

> **Source site:** `src/screens/HomeScreen.tsx:465` — `{/* Header outside FlatList to prevent TextInput focus issues */}`
>
> **Post-`KeyboardProvider` reality:** the structural separation (`renderHeaderContent` as
> sibling above `FlatList` at line 466) is kept EITHER WAY — that's a non-keyboard rendering
> choice per RESEARCH §3.6 (image-cache / perf). Only the COMMENT is discretionary.

After Tier 2 row 10 (HomeScreen search) smoke test:

- **If Tier 2 row 10 PASSES on both platforms:** either REMOVE the comment at line 465 or
  KEEP it. Recommendation is REMOVE — comment is now stale because `KeyboardProvider` at
  the root resolves the original focus issue.
- **If Tier 2 row 10 FAILS on either platform:** DO NOT remove. Document why the comment
  still earns its keep in this section.

**Decision execution happens POST-approval in Plan 02-06 Task 5** (continuation agent).
This section is a placeholder for the recorded outcome.

| Field                                  | Value                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| DECISION                               | **REMOVE** — executed post-approval 2026-04-23                                                                                           |
| RATIONALE                              | Tier 2 row 10 PASSED on both iOS and Android. `KeyboardProvider` at the App root resolves the original TextInput focus issue the comment documented, so the comment is now stale. Structural separation (`renderHeaderContent` as sibling above `FlatList`) is preserved — that's a non-keyboard rendering choice per RESEARCH §3.6 and stays regardless. |
| Structural separation preserved?       | YES (mandatory regardless — `renderHeaderContent` as sibling above `FlatList` stays)                                                     |
| Post-removal verify (if REMOVE chosen) | `grep -c "Header outside FlatList" src/screens/HomeScreen.tsx` → 0 ✓ AND `grep -c "renderHeaderContent()" src/screens/HomeScreen.tsx` → ≥1 ✓ |

---

## Phase-wide grep gates (mechanical — re-verify at matrix-close sign-off)

> These are the 12 mechanical gates from RESEARCH §6. All must hold for the phase to close.
> Actual values to be filled by Task 5 (post-approval continuation agent).

| Gate                                           | Command                                                                                                        | Expected | Actual |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| KBD-02 / SC3.a — zero magic offsets in src/    | `grep -rn "keyboardVerticalOffset" src/ \| wc -l`                                                              | 0        | **0 ✓** |
| KBD-04 / SC4.a — Fabric on                     | `grep -c "newArchEnabled=true" android/gradle.properties`                                                      | 1        | **1 ✓** |
| SC1.a — reanimated installed                   | `grep -c "react-native-reanimated" package.json`                                                               | 1        | **1 ✓** |
| SC1.b — worklets installed                     | `grep -c "react-native-worklets" package.json`                                                                 | 1        | **1 ✓** |
| SC1.c — Babel plugin is LAST                   | `tail -n 5 babel.config.js \| grep -c "react-native-worklets/plugin"`                                          | 1        | **1 ✓** |
| SC2.a — keyboard-controller installed          | `grep -c "react-native-keyboard-controller" package.json`                                                      | 1        | **1 ✓** |
| SC2.b — KeyboardProvider wired in App.tsx      | `grep -cE "KeyboardProvider" App.tsx`                                                                          | ≥ 2      | **3 ✓** |
| KBD-02 — chat surface clean of magic offsets   | `grep -rn "keyboardVerticalOffset" src/screens/Chat*Screen.tsx \| wc -l`                                       | 0        | **0 ✓** |
| KBD-01 (auth) — 4 auth screens KASV-wrapped    | `grep -l "KeyboardAwareScrollView" src/screens/{Login,Signup,ForgotPassword,ResetPassword}Screen.tsx \| wc -l` | 4        | **4 ✓** |
| KBD-01 (listing) — CreateListing both branches | `grep -c "KeyboardAwareScrollView" src/screens/CreateListingScreen.tsx`                                        | ≥ 2      | **5 ✓** (1 import + 2 open + 2 close tags) |
| KBD-01 (settings) — AccountSettings KASV       | `grep -c "KeyboardAwareScrollView" src/screens/AccountSettingsScreen.tsx`                                      | ≥ 1      | **3 ✓** (1 import + 1 open + 1 close) |
| KBD-01 (chat) — 2 chat screens library-KAV     | `grep -l "from 'react-native-keyboard-controller'" src/screens/Chat*Screen.tsx \| wc -l`                       | 2        | **2 ✓** |

---

## Session metadata (to be captured at walk-time)

| Field                                         | Value                                    |
| --------------------------------------------- | ---------------------------------------- |
| Walk date                                     | 2026-04-23                               |
| Pre-fix HEAD at walk start                    | `0c271ca` (matrix scaffolded)            |
| Post-fix HEAD at walk end                     | `47a52b7` (chat KAV `behavior="padding"` fix) |
| Walker (user)                                 | `beckprograms@gmail.com` (project owner) |
| Notes                                         | First pass: Tier 1 rows 7-8 + L10 row 3 FAILED on both platforms. Root cause: library's `KeyboardAvoidingView` `behavior` prop is optional with NO default (per `node_modules/react-native-keyboard-controller/lib/typescript/components/KeyboardAvoidingView/index.d.ts:29`) — omitting it = component no-ops. Fix: `behavior="padding"` added to both chat KAVs (commit `47a52b7`). Second pass (post-fix): all Tier 1 + Tier 2 + L10 + back-button cells PASS on both iPhone 15 Pro Max / iOS 26.4 and Moto G XT2513V / Android 16. Disproves RESEARCH §9 A8. |

---

## How to walk this matrix (per-row instructions)

> Consolidated from 02-06-PLAN.md Task 3 + Task 4 `<how-to-verify>`.

### Tier 1

**Row 1 — LoginScreen:**
  - Open Profile tab → tap Sign In.
  - Tap email `TextInput`. Expected: keyboard pops, email stays visible above keyboard.
  - Tap `PasswordTextInput`. Expected: password field stays visible above keyboard.
  - Tap the eye icon (visibility toggle) WHILE keyboard is open. Expected: eye responds
    without first dismissing the keyboard (`keyboardShouldPersistTaps="handled"`).
  - PASS: both fields visible above keyboard; eye icon works while keyboard open.

**Row 2 — SignupScreen:**
  - Profile → Sign In → Sign Up link.
  - Tap email, password, confirm password in turn. Expected: all three visible above
    keyboard; `PasswordRequirements` component visible between password + confirm.
  - PASS: all 3 inputs visible above keyboard.

**Row 3 — ForgotPasswordScreen:**
  - Profile → Sign In → Forgot password?
  - On mount, email field has `autoFocus` so keyboard pops IMMEDIATELY.
  - Expected: email field visible above keyboard from the moment the screen appears.
  - PASS: email field visible above keyboard at mount time.

**Row 4 — ResetPasswordScreen (L10 risk):**
  - Reach screen via deep link OR Forgot password → Sent → tap "I have a code".
  - Tap `linkOrCode` `TextInput`. Expected: field visible above keyboard.
  - PASTE a long 5+ line string into `linkOrCode`. Expected: multiline field GROWS.
    (Also record in L10 section row 3.)
  - Tap new password, then confirm `PasswordTextInput`. Expected: visible above keyboard.
  - PASS: all 3 inputs visible above keyboard AND linkOrCode grows.

**Row 5 — CreateListingScreen admin-verify branch:**
  - Sign in as admin email → Profile → Create Listing → Edit existing listing →
    Verification section (admin-only branch).
  - No TextInputs today — verify the page scrolls cleanly; 3× Switch rows + save button
    respond (KASV degrades to inert ScrollView when no input is focused).
  - PASS: page scrolls; switches toggle; save button taps register.

**Row 6 — CreateListingScreen main form:**
  - Profile → Create Listing (any property type).
  - Sample 3 inputs spanning form: title (top), address (middle), description (bottom).
  - Tap each. Expected: each focused field scrolls above the keyboard.
  - PASS: all 3 sampled inputs visible above keyboard.

**Row 7 — ChatThreadScreen (L10 risk + back-button regression):**
  - Open any chat conversation.
  - Tap composer `TextInput`. Expected: composer rises with keyboard; FlatList not pushed
    off-screen.
  - Type a long multi-line message (return / shift-return). Expected: composer GROWS past
    1 line. (Record in L10 section row 1.)
  - Send — confirm message appears in FlatList; composer clears.
  - **Android only — back-button regression:** with keyboard still open, press hardware
    back. Expected: keyboard dismisses; chat screen does NOT pop. (Record in back-button
    section.)
  - **Android only — after dismiss:** press hardware back AGAIN. Expected: chat screen
    pops back to chat list per Phase 1 BackHandler behavior.
  - PASS: composer + L10 growth + back-button-no-conflict all green.

**Row 8 — ChatComposeScreen (L10 risk):**
  - Chat list → tap new-message button (or equivalent route to ChatComposeScreen).
  - Tap composer `TextInput`. Expected: composer rises with keyboard.
  - Type a long multi-line message. Expected: composer GROWS past 1 line. (Record in L10
    section row 2.)
  - PASS: composer visible above keyboard + grows correctly.

### Tier 2

**Row 9 — AccountSettingsScreen:**
  - Profile → Account Settings.
  - Tap an info row (e.g. Name) to enter edit mode → renders `TextInput` inline.
  - Tap the `TextInput`. Expected: field visible above keyboard.
  - PASS: at least one TextInput in edit mode visible above keyboard.

**Row 10 — HomeScreen search:**
  - Home tab (cold-start or navigate).
  - Tap search `TextInput` at top of screen.
  - Expected: search field visible above keyboard; type a few characters, filtered
    results appear in FlatList below.
  - PASS: search field visible above keyboard; filtering works.
  - **If PASS on both platforms:** approve HomeScreen workaround comment removal (line 465).
  - **If FAIL on either platform:** keep the comment; document rationale.

---

## Phase exit checklist (for Task 5 sign-off)

- [x] Tier 1: 16/16 cells `Pass`
- [x] Tier 2: 4/4 cells `Pass`
- [x] L10 multiline: 6/6 cells `Pass`
- [x] Android back-button: 2/2 cells `Pass`
- [x] HomeScreen workaround comment decision executed (REMOVE) with rationale
- [x] All 12 phase-wide grep gates `Actual` match `Expected`
- [x] `02-VALIDATION.md` frontmatter flipped: `status: complete`, `nyquist_compliant: true`
- [x] Physical-device builds succeed on both platforms (pre-fix builds: Wave 0 boot smoke + Wave 1 boot smoke; post-fix builds: matrix walk both passes)
- [x] `02-06-SUMMARY.md` written + committed

---

*Matrix scaffold generated by Plan 02-06 executor. Cells filled by human during physical-device walk. Post-walk decisions + VALIDATION sign-off handled by continuation agent per CHECKPOINT protocol.*
