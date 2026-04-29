# Phase 2: Universal Keyboard Handling - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Every input-bearing screen in JayTap handles the soft keyboard cleanly on both iOS and Android physical devices, via a single root-level `KeyboardProvider` plus library-provided wrappers — **not** per-screen `keyboardVerticalOffset` magic numbers, **not** React Native's built-in `KeyboardAvoidingView`, and **not** the unmaintained APSL `react-native-keyboard-aware-scroll-view`. The solution must be universal so that every screen added in M2 and later inherits keyboard correctness by default.

Requirements: KBD-01, KBD-02, KBD-03, KBD-04.

</domain>

<decisions>
## Implementation Decisions

### Library + peer dep (already locked by STACK.md §1, PITFALLS.md §Pitfall 2 — not re-discussed)

- **D-01:** Library is `react-native-keyboard-controller@1.21.6` (or later 1.21.x if a patch ships before install). RN 0.84 + Fabric + bridgeless compatible; maintainer actively shipping 0.83.x/Fabric fixes. Not reconsidered — multi-source research verdict.
- **D-02:** Peer dependency `react-native-reanimated` is **NOT** in `package.json` today — confirmed via `grep -c "react-native-reanimated" package.json` → 0. Install-time gate is live. Install order is load-bearing: `react-native-reanimated` FIRST, with its Babel plugin added as the **LAST** entry in `babel.config.js`, then `pod install` on iOS, clean Android build, THEN `react-native-keyboard-controller`. Budget 1–2 hours for this alone.
- **D-03:** `<KeyboardProvider>` placement is fixed: inside `SafeAreaProvider`, wrapping `ThemeProvider → LanguageProvider → AuthProvider` in `App.tsx`. The existing provider order (from CLAUDE.md's "Key Conventions") is preserved verbatim — `KeyboardProvider` slots in between `SafeAreaProvider` and `ThemeProvider`. Missing this placement makes all keyboard-controller components silently no-op (PITFALLS §Pitfall 2, Risk: KeyboardProvider placement).
- **D-04:** Per-screen wrapper policy: `KeyboardAwareScrollView` for screens with >1 input (Auth, AccountSettings, CreateListing). `KeyboardAvoidingView` (the library's drop-in, NOT RN's built-in) for chat composer + single-input modals. Banned mixes: KASV + KAV in the same tree; KASV nested inside a `ScrollView`; RN's built-in `KeyboardAvoidingView`.
- **D-05:** For `FlatList` screens that need to contain inputs, use `renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}` per the library's docs. Do NOT wrap a FlatList in an external KASV — gesture conflicts.
- **D-06:** Android `android:windowSoftInputMode="adjustResize"` is already set in `android/app/src/main/AndroidManifest.xml:25`. No change needed; confirmed via grep before discussion.

### CreateListingScreen scope (Area 1 — discussed)

- **D-07:** Convert **both** top-level `ScrollView`s in `CreateListingScreen.tsx` to `KeyboardAwareScrollView`: the admin-verification branch (currently `src/screens/CreateListingScreen.tsx:455`) and the main listing form (currently `src/screens/CreateListingScreen.tsx:497`). Internal structure — including the nested inner `ScrollView`/`FlatList` patterns — is NOT touched in Phase 2. If Phase 4 (taxonomy decomposition) and Phase 5 (validation) split the screen into sub-components, those sub-components inherit the root `KeyboardProvider` and adopt KASV locally if they render inputs.
- **D-08:** Explicit acceptance: Phase 4/5 may reshape the KASV wrapping added here. That is expected — the wrappers added in Phase 2 are "minor rework, not throwaway" (user decision Area 1). The goal is to satisfy SC3 today so M1 doesn't ship with a broken keyboard on the most input-heavy screen.

### ChatThread / ChatCompose pattern (Area 2 — discussed)

- **D-09:** Drop-in replacement of React Native's built-in `KeyboardAvoidingView` with the library's `KeyboardAvoidingView` in both `src/screens/ChatThreadScreen.tsx:183` and `src/screens/ChatComposeScreen.tsx:114`. Concretely: change the import source from `'react-native'` to `'react-native-keyboard-controller'` and **remove** the `keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}` prop entirely — the library handles offset via `KeyboardProvider` automatically. Keep the existing `FlatList` + composer layout unchanged. ~5 lines changed per screen.
- **D-10:** `KeyboardStickyView` (composer pinned above keyboard, iMessage/Telegram-style) is **NOT** adopted in M1. Deferred to M2 Chat polish (see deferred ideas). Rationale: better UX but adds ~30–50 lines of layout restructure per screen plus Android soft-nav-bar edge-case testing; M1 ships-fast takes priority.

### KeyboardToolbar adoption (Area 3 — user took recommendation)

- **D-11:** `KeyboardToolbar` (prev/next/done accessory bar) is NOT adopted in Phase 2. Deferred to Phase 5 (Listing Form Validation & Edit Flow), since that's where the CreateListing form is reshaped and multi-input navigation becomes a first-class UX concern. AccountSettings does not need it in M1 (3 fields, not enough to justify the component).

### Verification strategy (Area 4 — user took recommendation)

- **D-12:** Risk-weighted device verification, mirroring Phase 1's escalation-gated approach. Tier definition:
  - **Full test per screen (each input × iOS + Android, portrait, no-modal / modal-open as applicable):** Auth flow (Login / Signup / ForgotPassword / ResetPassword), CreateListingScreen (both admin-verify and main-form branches), ChatThreadScreen, ChatComposeScreen.
  - **Smoke test per screen (tap one input on iOS + Android, confirm keyboard doesn't cover field):** AccountSettingsScreen, HomeScreen search bar.
  - **Out of scope:** ScheduleViewingScreen (`grep -n TextInput src/screens/ScheduleViewingScreen.tsx` → no matches; REQUIREMENTS.md SC3 lists it defensively but the screen has no inline inputs today). If ScheduleViewing grows inputs later, they'll inherit the root provider.
- **D-13:** Physical-device only (D-03 from Phase 1 convention carries forward — simulator passes don't satisfy exit criteria). Test devices: iPhone 15 Pro Max / iOS 26.4 + Moto G XT2513V / Android 16 (same as Phase 1).
- **D-14:** Verification captures are textual cell entries in a matrix doc — no video required (following Phase 1's D-15 evidence-relaxation precedent, since keyboard handling is also a deterministic install/wiring concern, not timing-sensitive). The phase's matrix doc location is the planner's call.

### Claude's Discretion

- Exact phase plan structure (install wave, provider wiring wave, screen conversion waves, verify wave) — the planner decides wave granularity. Recommended: Install precondition (reanimated + babel + pod install + clean builds) as Wave 0 with its own go/no-go gate before any other Phase 2 work, mirroring Phase 1's diagnostic-first structure.
- Whether to remove the HomeScreen workaround at `src/screens/HomeScreen.tsx:465` (`{/* Header outside FlatList to prevent TextInput focus issues */}`) after `KeyboardProvider` lands. Expected: the hack becomes unnecessary and can be cleaned up; verify via device test before committing the cleanup.
- Whether `PasswordTextInput` (custom component used by Login/Signup/ResetPassword) needs any wrapper-side changes to compose under `KeyboardAwareScrollView`. Expected: no — it's a plain `TextInput` composition; KASV finds the focused field via React Native's `currentlyFocused()` regardless of component nesting. Confirm during auth-screen conversion.
- Whether to batch the 4 auth screens into one plan/commit (they share identical structure) or split them. Planner's call.
- Android back-button behavior when keyboard is open: library handles this by default (back dismisses keyboard). Confirm no conflict with Phase 1's BackHandler `useEffect` at `App.tsx:184-297` during Chat screen testing.

### Folded Todos

None — no todos were matched to Phase 2 scope during cross-reference.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 2 definition and 4 Success Criteria (lines 54–66)
- `.planning/REQUIREMENTS.md` — KBD-01 (keyboard never covers focused input), KBD-02 (universal root-level solution, not per-screen patching), KBD-03 (reanimated install gate), KBD-04 (New Architecture / Fabric compat verified on physical devices)
- `.planning/STATE.md` — updated 2026-04-22 to reflect Phase 1 complete, Phase 2 next with reanimated install precondition flag carried forward

### Library decisions & pitfalls (load-bearing)
- `.planning/research/STACK.md` §1 "Keyboard Handling — Use `react-native-keyboard-controller`" (lines 65–98) — library comparison, version pin rationale, reanimated peer dep risk callout, `KeyboardProvider` placement risk callout, custom-navigation-overlay risk callout
- `.planning/research/PITFALLS.md` §Pitfall 2 "Shipping KeyboardAvoidingView as the 'universal keyboard fix' when it isn't universal" (lines 36–54) — the anti-patterns this phase deletes (RN built-in KAV, magic-number offsets, APSL KASV, nested ScrollViews, FlatList-in-avoider) and the concrete fixes (install `KeyboardProvider` at the root; use library's KAV for modals; use `renderScrollComponent` for FlatList screens)
- `.planning/research/PITFALLS.md` §Pitfall 1 tail (line 32) — explicit build-order dependency: Phase 2 can't start until Phase 1 (Nav Reliability) is complete, because keyboard fixes interact with scroll/layout on every screen and debugging on unreliable nav compounds diagnosis cost. ✓ Phase 1 closed 2026-04-22.

### Codebase anchors (source files)
- `App.tsx` — provider tree (current shape: `SafeAreaProvider → ThemeProvider → LanguageProvider → AuthProvider`). `KeyboardProvider` inserts between `SafeAreaProvider` and `ThemeProvider` per D-03.
- `src/screens/ChatThreadScreen.tsx:183` — existing anti-pattern site: RN built-in `KeyboardAvoidingView` with `keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}`. Drop-in replacement target per D-09.
- `src/screens/ChatComposeScreen.tsx:114` — same anti-pattern, same fix per D-09.
- `src/screens/CreateListingScreen.tsx:455` — admin-verification branch ScrollView (KASV target per D-07).
- `src/screens/CreateListingScreen.tsx:497` — main listing form ScrollView (KASV target per D-07).
- `src/screens/LoginScreen.tsx`, `SignupScreen.tsx`, `ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx` — auth flow screens; no current keyboard handling; KASV wrap targets.
- `src/screens/AccountSettingsScreen.tsx:150` — existing ScrollView, KASV swap target.
- `src/screens/HomeScreen.tsx:465` — pre-existing workaround comment `{/* Header outside FlatList to prevent TextInput focus issues */}`. Cleanup candidate (Claude's Discretion) after KeyboardProvider lands.
- `src/components/PasswordTextInput.tsx` — custom wrapper used by Login/Signup/ResetPassword. Expected to compose cleanly under KASV.
- `android/app/src/main/AndroidManifest.xml:25` — `android:windowSoftInputMode="adjustResize"` already set. No change.
- `babel.config.js` — reanimated Babel plugin MUST be added as the LAST entry per D-02.

### Project-level constraints
- `CLAUDE.md` "Key Conventions" — provider order (`ThemeProvider → LanguageProvider → AuthProvider`); don't reorder. KeyboardProvider slots above them per D-03.
- `CLAUDE.md` "Stack Decisions" — `react-native-keyboard-controller@1.21+` and `react-native-reanimated` peer gate; both already documented as M1 stack intent.
- `.planning/PROJECT.md` "Out of Scope" — per-screen KeyboardAvoidingView fixes that don't touch `KeyboardProvider` at the root would violate KBD-02 ("universal, not per-screen patching") and are implicitly out of scope.
- `.planning/phases/01-nav-reliability/01-CONTEXT.md` — Phase 1 decisions that carry forward: physical-device QA bar (D-03), the provider tree shape that `KeyboardProvider` must slot into without breaking, the `OVERLAY_FLAGS` array convention (not directly touched by Phase 2 but co-located in `App.tsx`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Provider tree** in `App.tsx`: `SafeAreaProvider` → `ThemeProvider` → `LanguageProvider` → `AuthProvider`. `KeyboardProvider` slots between `SafeAreaProvider` and `ThemeProvider` — surgical insertion, no reordering of existing providers.
- **`PasswordTextInput`** at `src/components/PasswordTextInput.tsx` — custom password input used in Login/Signup/ResetPassword. Plain TextInput composition; expected to work under KASV without modification (verify during conversion).
- **`styles.scrollView` / `styles.scrollContent`** patterns already in use on AccountSettings and CreateListing. KASV accepts the same `style` + `contentContainerStyle` props; swap is one import change + one element rename per site.

### Established Patterns
- Keep-alive tab screens (Phase 1 D-05/D-06): Home, Favorites, Chat, Profile, Listings are kept mounted with `display: 'none'` toggling. This is **orthogonal** to keyboard handling — KeyboardProvider works correctly across `display` toggles because keyboard events are Fabric-level, not view-tree-level. No interaction risk.
- OVERLAY_FLAGS array (Phase 1 D-09/D-10) at `App.tsx:84` — adjacent to where the tab-handler lives. `KeyboardProvider` placement is earlier in the render tree (outside `AppContent`), so no overlap.
- `react-i18next` via `useTranslation()` — every screen uses `t()` for strings. Keyboard changes don't touch copy, so EN+RU parity (CLAUDE.md convention) is not at risk in this phase.
- Theme tokens via `useTheme()` — KASV's background inherits from wrapping View, so dark/light parity is unaffected.

### Integration Points
- Root render tree in `App.tsx` — `KeyboardProvider` wraps everything below `SafeAreaProvider`. One-line change at top of render tree.
- 9 screen files (`src/screens/*.tsx`) need per-file changes. See D-07/D-09 and the screen inventory in `<canonical_refs>` above for exact sites.
- Phase 1's `resetProfileSubScreens()` helper + tab-handler fix (commit `bf33c41`) — no conflict with Phase 2. Keyboard events and tab-change events are independent event streams.
- `babel.config.js` — one append (reanimated plugin), MUST be last.

</code_context>

<specifics>
## Specific Ideas

- **Universal means universal.** KBD-02's bar is "single root-level solution, not per-screen patching." Any proposed fix that lives in one screen and doesn't trace back to `KeyboardProvider` at the root is out of scope — it would be the exact anti-pattern PITFALLS §Pitfall 2 describes.
- **Magic numbers are a smell.** The existing `keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}` in Chat screens is the canonical example of what NOT to ship. Part of Phase 2's exit criteria is zero magic-number offsets remaining in the codebase — `grep -rn "keyboardVerticalOffset" src/` should return zero matches when the phase closes.
- **Install precondition is high-risk.** Research explicitly flags reanimated + Babel plugin + pod install + clean Android build as 1–2 hours, not 5 minutes. Planner should gate Wave 1 (provider wiring) behind Wave 0 (install) with a concrete verification step: `npx react-native info` shows both libs; both platforms build cleanly in release mode.
- **Phase 4/5 ripples are accepted.** CreateListingScreen's KASV wrappers (D-07) will likely be reshaped when Phase 4 decomposes the form. Phase 2 doesn't pre-optimize for that — it ships correct keyboard handling today.

</specifics>

<deferred>
## Deferred Ideas

- **`KeyboardStickyView` for Chat screens** (composer pinned above keyboard, iMessage/Telegram-style) — better UX than drop-in KAV, but adds 30–50 lines per screen of layout restructure + Android soft-nav-bar edge-case testing. Deferred to M2 Chat polish milestone.
- **`KeyboardToolbar` (prev/next/done accessory bar) on multi-input forms** — library supports it natively; genuinely improves UX on forms with 5+ inputs. Deferred to Phase 5 (Listing Form Validation & Edit Flow), where CreateListing gets restructured and multi-input navigation becomes a first-class UX concern. Do not add in Phase 2 — would be throwaway work pre-refactor.
- **Full test matrix (every screen × iOS+Android × portrait/landscape × modal-open/not)** as prescribed in PITFALLS §Pitfall 2. Deferred in favor of risk-weighted verification (D-12) for M1. Full matrix revisited if M1 field reports surface keyboard regressions; otherwise becomes a test debt item for the M2 Chat polish milestone.
- **Landscape-orientation keyboard testing** — JayTap is portrait-only today (confirm in planner pass). If landscape is added in a later milestone, keyboard behavior in landscape is retested then.
- **HomeScreen header-outside-FlatList workaround cleanup** (`src/screens/HomeScreen.tsx:465`) — expected to become removable after `KeyboardProvider` lands. Handled opportunistically during Phase 2 verification if device testing confirms it's safe to remove; if not, left as a known cleanup for a later polish pass.

### Reviewed Todos (not folded)
None — no todos were matched to Phase 2 scope during cross-reference.

</deferred>

---

*Phase: 02-universal-keyboard-handling*
*Context gathered: 2026-04-22*
