# Pitfalls Research — JayTap v1.0.4 Polish Milestone

**Domain:** React Native 0.84 (New Architecture) brownfield polish release — universal keyboard handling, custom state-machine navigator debugging, category-driven listing forms, client-side role gating, iOS + Android store submission
**Researched:** 2026-04-22
**Confidence:** HIGH for store submission and keyboard ecosystem findings (multi-source, current); MEDIUM–HIGH for custom-navigator pitfalls (tied directly to `App.tsx` read at `.planning/codebase/ARCHITECTURE.md` and `CONCERNS.md` so specific to this codebase); MEDIUM for category-form data-loss patterns (generalized from RHF/Formik docs, not JayTap-specific libs — JayTap uses raw `useState`).

This file exists to inform roadmap phase ordering and success criteria. Every pitfall below is mapped to a workstream (Keyboard / Nav / Forms / Gating / Release) and, where applicable, a specific file and line number already identified in `.planning/codebase/CONCERNS.md` so the planner can cite it in phase specs.

---

## Critical Pitfalls

### Pitfall 1: Treating the bottom-nav bug as a `BottomNavigator` issue instead of an `App.tsx` state-machine issue

**What goes wrong:**
Developers open `src/components/BottomNavigator.tsx` looking for the bug, tweak its `onPress` handlers or its render conditions, ship a "fix" that masks the symptom on one screen, and the trap reappears on another screen a week later. The real bug is in the 20+ boolean flags in `App.tsx:36-76` that gate which screen is "visible" — specifically the cascade of mutually-exclusive `show*` computations at `App.tsx:337-388` that derive visibility from a chain of negations. When a screen is shown via `display: none` but its `pointerEvents`/touch capture is still live, taps on the bottom nav hit the invisible layer above it first. React Navigation has a well-documented identical bug with `tabBarStyle: { display: 'none' }` (see Issue #12824 below), which is the same failure mode as JayTap's hand-rolled keep-alive.

**Why it happens:**
The bottom nav *is* the most visible surface where the trap presents, so it looks like a nav component bug. The 23-dependency `useEffect` for Android back-handler (`App.tsx:184-297` per `CONCERNS.md`) adds confusion because stale-closure bugs there will also surface as "nav broken" symptoms. First-time responders pattern-match on "button doesn't work" and patch the button.

**How to avoid:**
1. Before touching code, write a reproduction checklist: from each of the 8+ possible "visible states" (Home, Favorites, Chat, Profile, PropertyDetails overlay, CreateListing, OwnerListings, RenterListings, Tour3D), tap each of the 4 bottom-nav tabs. Build the truth table of which transitions fail.
2. Add `pointerEvents="none"` to any screen rendered with `display: 'none'` — this alone may fix the trap without any state-machine changes. This is the single highest-leverage, lowest-risk change.
3. Log every nav state transition (`console.log` with flag snapshot) during reproduction so you can see whether the state *updated* but rendering didn't follow (stale closure) versus the state *didn't update* (touch was captured by hidden layer).
4. Do NOT attempt a react-navigation migration in M1 (explicit out-of-scope per PROJECT.md constraints); fix within the existing state machine.

**Warning signs:**
- A "fix" reduces reproduction rate from 100% to 80% — that means you patched one path in the cascade, not the root cause. Insist on 0% repro before shipping.
- The back-handler effect (`App.tsx:184-297`) is re-created on every render because of its 23-dep array — if you add a `console.log` inside its cleanup, you'll see it fire constantly. That's a separate latent bug that can eat the bottom-nav intent if state batches coincide.

**Phase to address:**
Phase 1 (Nav reliability) — reproduce → root-cause → fix. This phase must land before Phase 2 (Keyboard) because keyboard fixes interact with layout/scroll in every screen, and debugging keyboard issues on a nav that's unreliable compounds the diagnosis cost.

---

### Pitfall 2: Shipping `KeyboardAvoidingView` as the "universal keyboard fix" when it isn't universal

**What goes wrong:**
Team adds `<KeyboardAvoidingView behavior="padding" />` to the screens that have current complaints, verifies on iOS simulator, ships. In production: (a) Android behaves differently (on Android, `padding` is usually wrong — `height` or no wrapper at all is usually right, and the `windowSoftInputMode` setting in `AndroidManifest.xml` fights the RN component); (b) screens with a header require a `keyboardVerticalOffset` calculated from `useHeaderHeight` + safe-area bottom inset — JayTap has no native nav headers because it has no nav library, so the header height is whatever each screen's custom header happens to be, which is NOT uniform; (c) `FlatList` (used in Home, Favorites, OwnerListings, RenterListings, Chat) behaves differently inside `KeyboardAvoidingView` — "inverted FlatList + padding behavior" has known perf issues and dropped frames; (d) the `Tour3DScreen` WebView and any `Modal` (e.g., contact modal at `PropertyDetailsScreen.tsx:866-1050`) don't inherit the parent's keyboard avoidance and silently break.

**Why it happens:**
The built-in `KeyboardAvoidingView` is marketed as the native answer, so it's tried first. Its behavior is platform-divergent by design, and its interaction with modals/headers/FlatLists is the single most recurring RN support question in the ecosystem (referenced in DEV.to, Netguru, and the official RN docs explicitly). A screen-by-screen retrofit looks reasonable but isn't "universal."

**How to avoid:**
- Commit to `react-native-keyboard-controller` (KC) at the app shell level as the default solution. It's the current ecosystem standard (Context7 high reputation, 81.22 benchmark; Expo docs recommend it), it works on both New Architecture and old, handles modals/headers uniformly via `automaticOffset`, and its `KeyboardAvoidingView` has a consistent animation on both platforms.
- Install `KeyboardProvider` once at the root (above the navigation state machine in `App.tsx`) and use KC's `KeyboardAvoidingView` + `KeyboardAwareScrollView` in leaf screens.
- For `FlatList` screens, use `renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}` (from KC docs) rather than wrapping the list in an external avoider.
- Write a concrete test matrix: every screen × iOS + Android × {portrait, landscape if supported} × {has-modal-open, no-modal}. Capture video of each test to attach to the release notes.
- Audit `android/app/src/main/AndroidManifest.xml` for `android:windowSoftInputMode` — confirm `adjustResize` (RN's default) isn't overridden. If it is, KC can still work but will fight the native setting.

**Warning signs:**
- Any per-screen `keyboardVerticalOffset={87}`-style magic number. Magic numbers for header height are a smell — they break when the header changes.
- Mixing `KeyboardAwareScrollView` with `KeyboardAvoidingView` in the same tree (they fight; KC docs explicitly warn).
- Nesting a `ScrollView` inside a `KeyboardAwareScrollView` (KASV *is* a scroll view — double-nesting creates gesture conflicts).
- `multiline` TextInputs inside a `ScrollView` under Fabric that refuse to grow (known KASV + new-architecture issue per ecosystem discussion; test explicitly).

**Phase to address:**
Phase 2 (Universal keyboard). Must happen after Phase 1 (nav) so that keyboard testing can rely on stable navigation. Library choice (keyboard-controller) is the planner's decision per PROJECT.md "Key Decisions" — this research recommends it.

---

### Pitfall 3: `display: none` keep-alive screens still capture touches

**What goes wrong:**
JayTap's tab keep-alive pattern (`App.tsx:70-76`, `App.tsx:337-388`, `mainStackScreenStyle()`) keeps screens mounted but hides them with `display: 'none'`. On some RN versions and especially under the New Architecture, `display: 'none'` correctly removes a view from the layout tree but the touch-responder chain can still be live on descendants in edge cases (overlays with explicit `zIndex`, absolute-positioned children). This is the same failure mode documented in react-navigation Issue #12824 — an invisible touchable area remains active and captures taps meant for overlaid UI (including the bottom nav).

**Why it happens:**
`display: 'none'` is a web-style mental model. In RN + Yoga, it mostly works like CSS, but the responder system is independent of the layout tree. A child with `position: 'absolute'` and `zIndex > 0` can still receive touches even when its parent has `display: 'none'` in some combinations. Further, a screen that cached its own `Modal` or `Portal` at mount time may still have that modal attached to the root when the screen is hidden — the modal doesn't hide with its parent.

**How to avoid:**
1. Wrap every keep-alive screen in a `<View pointerEvents={isVisible ? 'auto' : 'none'}>` rather than relying only on `display: 'none'`. Belt + suspenders.
2. Audit every screen for `Modal` instances — any `Modal` must be conditionally rendered (`{isVisible && <Modal />}`), never just `<Modal visible={isVisible} />` on a hidden parent (the `Modal` sits at the root window regardless of parent visibility).
3. Add an invariant check: when `showHome` is true, assert that `isFavoritesOpen && isChatOpen && isProfileOpen` are all false (they should be mutually exclusive per `App.tsx:359-366`). Violations = a missed state transition.
4. For the overlay screens (`PropertyDetails` at zIndex 2, `CreateListing` at zIndex 3, auth modals at zIndex 1000 per ARCHITECTURE.md) confirm `pointerEvents` are explicitly handled — zIndex alone does not gate input.

**Warning signs:**
- A user reports "the tap registered but nothing happened" (state updated, render didn't) vs. "the tap was ignored entirely" (touch went to wrong layer). The second symptom is this pitfall.
- Logging `onStartShouldSetResponder` on the hidden screens and seeing them fire.

**Phase to address:**
Phase 1 (Nav reliability) — this is likely *the* root cause of the bottom-nav trap. Fix here first.

---

### Pitfall 4: Category-change data loss when editing a listing

**What goes wrong:**
User edits a Hostel listing. The form initializes with category = Hospitality, fields = `{rooms, bathrooms, amenities}`, price hidden. User accidentally taps the "Residential" category chip, then taps back to "Hospitality." The amenities they were editing are gone — blanked because the form re-ran its init for the new category. Same pattern: a user creating a new listing fills out 10 fields, switches category once to see what it looks like, all 10 fields blank. Silent data loss.

A sharper variant: user edits a Rent listing, changes Residential → Commercial. Bedrooms/bathrooms fields disappear (correctly) but their *values* remain in form state, so on save the API receives a Commercial listing with rogue `bedrooms: 3` in the payload. Either the backend rejects it (confusing error) or persists the dead fields (data rot).

**Why it happens:**
JayTap uses raw `useState` in `CreateListingScreen.tsx` (1300 LOC, no RHF/Formik per CONCERNS.md). When category changes, the natural implementation is `setFormData({ ...initialForCategory })` which nukes everything. The sharper variant happens when the dev adds category-branched validation but leaves the existing state object alone, so validated-away fields leak into the payload.

**How to avoid:**
1. Separate "form state" from "submit payload." Keep all fields in state unconditionally. On submit, filter the payload by the active category's schema so only valid fields are sent.
2. Treat category change as a warning, not a destructive action: if the user has non-empty fields in the current category that would be hidden under the new category, show a confirm dialog. Or — cheaper — don't ever blank state on category change, only on explicit "reset form."
3. Use a single source of truth for the category → required-field map. Place it in `src/utils/` (e.g., `listingCategorySchema.ts`) that exports `{ residential: ['bedrooms','bathrooms','area'], commercial: ['area'], hospitality: ['rooms','bathrooms','amenities'] }` with explicit `hiddenFields` and `hiddenSubmitFields` lists. Validation, rendering, and payload filtering all read from this one file. No divergence possible.
4. For the edit-flow, initialize the category FROM the loaded listing (`propertyToEdit.category`), not from a default. Write a test case: edit each of (Residential/Commercial/Hospitality × Rent/Sell) and confirm fields are prefilled correctly.
5. i18n drift prevention: when you remove `Land`, `grep -r 'propertyType.land' src/locales/ src/screens/ src/components/` and delete every hit. The `en.json`/`ru.json` references should go at the same commit as the type definition change — don't let them straggle.

**Warning signs:**
- The fix for "Hospitality has no price" is implemented by setting `price = 0` on save rather than removing `price` from the payload. That's data rot waiting.
- Separate validation functions per type that are maintained independently (divergence).
- A `t('propertyType.land')` call anywhere after Land is supposedly removed. That's a regression opportunity.

**Phase to address:**
Phase 3 (Listing form overhaul) — this is the core of the workstream. Must address category schema source-of-truth on day 1 of the phase.

---

### Pitfall 5: Hardcoded admin email allowlist leaks into VCS, screenshots, logs, and M2 technical debt

**What goes wrong:**
Dev writes `const ADMIN_EMAILS = ['beckprograms@gmail.com', 'other@example.com']` in a utility file, ships it. The list is now (a) in every APK/IPA ever distributed — decompilable in seconds, (b) in git history forever, (c) printed to logs every time the check fires if any surrounding `console.log` captures it, (d) visible in TypeScript type errors and autocomplete popups during screenshare demos, (e) orphaned when M2 ships the real roles system — the planner removes the feature but forgets to delete the array, leaving stale code that *still runs* because the check was called conditionally and no error surfaced to remove it.

A subtler failure: the check is trusted in isolation. `userType === 'admin'` is also used at `PropertyDetailsScreen.tsx:178` and `CreateListingScreen.tsx:110,319,396,926` per CONCERNS.md. If M1 adds a *second* gate (email allowlist) but doesn't reconcile it with the existing `userType` check, you have two parallel permission systems — classic recipe for "admin can't do X but the other admin can" bugs.

**Why it happens:**
Speed pressure ("ship ASAP to stores"), the obvious-implementation bias ("it's just an array"), and the absence of a real role system in M1 by design. The M1→M2 seam is not enforced by any test or linter, so M1 code lingers.

**How to avoid:**
1. **Accept that obfuscation ≠ security.** Hashing the emails, base64-ing them, or pulling from an env var on the client all still ship the secret to the device. The only correct gate is server-side: the backend endpoint (`PATCH /properties/:id/verifications`, `PATCH /properties/:id/tours`) must verify the authenticated user is an admin regardless of what the client thinks. This MUST be confirmed with the Railway backend team before M1 ships. Client-side gating is UX only ("hide the button"), never security.
2. For the client-side UX gate, put the list ONE place (`src/utils/adminAllowlist.ts`), export a `useIsAdmin()` hook that reads from auth context, and every UI gate consumes the hook. No direct email comparisons inline. This makes M2 migration trivial: the hook's implementation changes, consumers don't.
3. Add a `// TODO(M2): replace with server-provided role` comment at the allowlist definition AND a failing-unless-manually-deleted assertion or ESLint comment rule. On M2 start, search for that TODO string — it's the migration checklist.
4. Version the list. Put it alone in its own file so `git blame` and PR diffs clearly show who added which email.
5. Send the Firebase `idToken` (not just `x-firebase-uid` header — see CONCERNS.md "Firebase uid used as sole auth") on the admin endpoints, so backend can verify identity independently. This is table-stakes for any real role check.
6. Lowercase-normalize emails on both sides of the comparison. `Beck@...` vs `beck@...` is a real footgun.

**Warning signs:**
- A PR that *adds* admin functionality without a parallel backend endpoint change. That's client-only security.
- Tests that "admin can edit Matterport URL" pass by mocking `userType = 'admin'` without verifying the backend actually allows it.
- M2 roadmap item "replace email allowlist" missing from the M2 planning doc.
- Emails visible in bundle analyzer / `react-native bundle --dev false` output grep.

**Phase to address:**
Phase 4 (Role gating precursor). Must also land a backend verification checkpoint (coordinate with backend owner) in the same phase — client-only gating without backend confirmation is a critical security gap, not a polish item.

---

### Pitfall 6: iOS Privacy Manifest mismatch triggers App Store Connect rejection

**What goes wrong:**
Per CONCERNS.md, `ios/JayTap/PrivacyInfo.xcprivacy:29-30` has `<key>NSPrivacyCollectedDataTypes</key><array/>` — an empty array — despite the app collecting email, name, phone, whatsapp, telegram, photos, and location. Team submits v1.0.4. App Store Connect's automated review flags the mismatch (App Privacy responses in ASC must match `PrivacyInfo.xcprivacy`). Alternatively/additionally, ASC's automated scan detects use of Required Reason APIs (UserDefaults, file timestamp, system boot time, disk space, active keyboard) via third-party libraries like `@react-native-async-storage/async-storage` without corresponding declarations. Result: rejection, 24–72 hour resubmit cycle, missed launch.

As of April 2026 per web search: "Starting April 2026, all new submissions and app updates must be built with the iOS 26 SDK using Xcode 26." This is a potential automated upload reject *before a reviewer sees the app* — the team's local Xcode version must be verified current.

**Why it happens:**
Privacy manifest was added by an `npx react-native init` scaffold years ago and never populated as features were added. Third-party libraries silently add Required Reason API usage (AsyncStorage uses UserDefaults; several common libs use file timestamp). Without an audit, the manifest stays empty and the app ships.

**How to avoid:**
1. Populate `NSPrivacyCollectedDataTypes` in `PrivacyInfo.xcprivacy` with the actual collected types. Minimum for JayTap: `NSPrivacyCollectedDataTypeEmailAddress`, `NSPrivacyCollectedDataTypeName`, `NSPrivacyCollectedDataTypePhoneNumber`, `NSPrivacyCollectedDataTypePhotoOrVideo`, `NSPrivacyCollectedDataTypeOtherContactInfo` (WhatsApp/Telegram handles), `NSPrivacyCollectedDataTypePreciseLocation` or `NSPrivacyCollectedDataTypeCoarseLocation` (depending on how maps uses location), and `NSPrivacyCollectedDataTypeCrashData` if Crashlytics/Sentry is added in the release.
2. For each type, set `NSPrivacyCollectedDataTypeLinked = true` (they're linked to Firebase auth identity), `NSPrivacyCollectedDataTypeTracking = false` (unless actually tracking across apps), and enumerate `NSPrivacyCollectedDataTypePurposes` accurately (typically `NSPrivacyCollectedDataTypePurposeAppFunctionality` for listing contact info).
3. Populate `NSPrivacyAccessedAPITypes` — at minimum the UserDefaults reason (`CA92.1` for app functionality), which `@react-native-async-storage/async-storage` triggers.
4. Cross-check App Store Connect's "App Privacy" responses against the manifest before submission. They must agree.
5. Verify Xcode version is current (≥ 26) and iOS SDK matches April 2026 requirement. This is not optional.
6. Run `xcodebuild -showBuildSettings` and confirm `MARKETING_VERSION = 1.0.4` and `CURRENT_PROJECT_VERSION = 21` — per PROJECT.md M1 requirements.

**Warning signs:**
- The file `PrivacyInfo.xcprivacy` hasn't been edited in git history in six months but features have shipped. Guaranteed mismatch.
- ASC automated review email with subject "ITMS-xxxxx" before a human reviewer responds — that's the automated privacy scan.
- `IOS_APP_STORE_READINESS.md` documents a version that doesn't match `project.pbxproj` (per CONCERNS.md: docs say 1.0, code is at 1.0.3).

**Phase to address:**
Phase 5 (Release prep) — final checklist before submission. Start the audit on day 1 of Phase 5 because fixes may require adding dependencies and rebuilding.

---

## Technical Debt Patterns

Shortcuts that seem reasonable in M1 but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Adding a 21st boolean flag to `App.tsx` for the Hospitality section rendering | Zero-friction feature add | Every future feature touches `App.tsx`; `App.tsx` is already 941 LOC and a god-file per CONCERNS.md. The truth table at `:359-366` gets harder to verify each addition. | Only if the new flag is truly orthogonal (unrelated to existing visibility cascade). For category branching in the listing form, do NOT put it in `App.tsx` — it belongs to `CreateListingScreen`/`HomeScreen` state. |
| `KeyboardAvoidingView` sprinkled per-screen instead of a root-level keyboard provider | Fast per-screen fix | Per-screen magic numbers for `keyboardVerticalOffset`; inconsistent animations; fights with modals; Android/iOS divergence. | Never for a "universal" fix. Acceptable only for a truly one-off screen with no header and no modal — which on JayTap means never. |
| Hardcoding admin emails inline in component files (instead of one utility) | 5 lines of code vs 15 | Emails spread across files, M2 migration takes a week instead of an hour, any typo causes a silent permission bypass. | Never. One source of truth file, minimum. |
| Category-branched validation as multiple `if (category === 'x')` blocks in the form component | "Works" immediately | Validation drifts from rendering; adding a 4th category requires editing 5+ places; typos in category names silently fail (any-typed). | Never long-term. Acceptable as a one-day spike to prove the data model before extraction. |
| Bumping version numbers in `package.json`/`build.gradle`/`project.pbxproj` manually | 2-minute task | Guaranteed to diverge over time (CONCERNS.md already flags docs vs code mismatches for both platforms). | Only until a single-source `scripts/bump-version.js` is added. Phase 5 should add this. |
| Using client-only `userType === 'admin'` without backend verification | Unblocks Hospitality URL gating | Anyone can reverse-engineer and call the unprotected backend endpoint directly. This is already true per CONCERNS.md "High: Firebase uid used as sole auth". | Only if paired with backend enforcement confirmed by the Railway backend team. Client gate = UX layer; backend = security layer. Both required. |
| Leaving `Land` references in i18n tables after removing from chips/types | "Tests pass" | Dead translation keys accumulate; future developers don't know which are live; translation budget wasted on dead strings. | Never. Delete at the same commit. |
| Not adding a crash reporter (Sentry/Crashlytics) before shipping to stores | Saves a day in M1 | Production crashes from the new keyboard/nav/form code are invisible. User reports "it crashes" with no stack trace. CONCERNS.md flags this at "High: No crash / error monitoring." | Only if Phase 5 explicitly accepts the risk AND commits to adding Sentry in M1.5/M2. Not acceptable long-term. |

---

## Integration Gotchas

Common mistakes when connecting this project's integrations.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `react-native-keyboard-controller` + Fabric/New Architecture | Assume old-arch installation docs apply; skip `KeyboardProvider` at root | Install per KC's new-architecture instructions; wrap root in `KeyboardProvider`; verify with `useKeyboardHandler` that native module is loaded (silent failure mode is common). |
| `react-native-keyboard-controller` inside `Modal` | Assume the provider at app root covers the modal | iOS `Modal` presents a new window; KC works but KeyboardAvoidingView within the modal needs its own context. Use `automaticOffset` in modal children. |
| `react-native-keyboard-controller` + JayTap's display:none keep-alive | Screen hidden via `display: none` but its inputs still have focus | Blur all inputs (`Keyboard.dismiss()`) before transitioning off a screen; KC doesn't know the screen is gone. |
| Firebase Identity Toolkit REST (per `AuthService.ts`) — role checks | Trust the client-stored `backendProfile.userType` forever; never refresh | Refresh backend profile after any admin action; on token expiry (~1 hour for Firebase idTokens) the client still has a stale profile. Firebase REST doesn't auto-refresh per CONCERNS.md. |
| iOS associated domains (`applinks:`) | Leave legacy `bizdinkonush.com` entitlement in place (per CONCERNS.md) | Audit `ios/JayTap/JayTap.entitlements:8` during Phase 5. If the domain is dead, remove the entitlement before submission or risk deep-link hijack if the domain is re-registered by a bad actor. |
| Google Maps Android key in manifest placeholder | Ship with no Cloud Console restrictions (package + SHA-1) | Verify restrictions are in Cloud Console before Phase 5 submission. Per CONCERNS.md this is already known-at-risk. |
| `react-native-maps` 1.27.1 pinned (not `^`) on RN 0.84 new-arch | Upgrade RN or the maps library and break map rendering silently | Do NOT bump either in M1. Both are out of scope. Test map on any OS update before submission. |
| Railway backend role enforcement | Add email allowlist on client only | Backend MUST verify `idToken` (not just `x-firebase-uid`) and check admin role server-side for Matterport/panoramic URL writes. Coordinate with backend team in Phase 4. |

---

## Performance Traps

Patterns that work for M1's 0 production listings but will fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `KeyboardAvoidingView` with `behavior="padding"` wrapping a FlatList | Dropped frames on scroll while keyboard open; frame drops worse on Android | Use `react-native-keyboard-controller` `KeyboardAwareScrollView` with `renderScrollComponent` per KC docs | Any list >50 items on mid-range Android |
| Back-handler effect with 23-dep array rebinding every render (`App.tsx:184-297`) | Battery drain, occasional duplicate back-handler fires | Use a ref to hold the up-to-date handler, attach once at mount (per CONCERNS.md "Medium: Android back-handler useEffect with 19 dependencies" — already known) | Already degraded; worsens as more state flags are added. Phase 1 should address. |
| Forms that re-render every TextInput on every keystroke (common with raw `useState` in a 1300-LOC form like `CreateListingScreen`) | Input lag on low-RAM devices, especially on Android | Isolate each field's state (lifted component with `memo`) OR adopt `react-hook-form` (uncontrolled, no re-render on keystroke). Given the 1300 LOC and split-by-category work, RHF is worth considering for Phase 3 IF scope allows. | 10+ fields visible simultaneously on low-end Android. Hospitality amenities list likely has >10 checkboxes — test there. |
| `LayoutAnimation` enabled globally in `HomeScreen` (CONCERNS.md: `src/screens/HomeScreen.tsx:20-23`) conflicting with Fabric | Visual glitches, inconsistent animations across screens | Remove the `setLayoutAnimationEnabledExperimental(true)` line; if animations are needed use `react-native-reanimated` layout animations | Already a latent conflict on RN 0.84 new-arch per CONCERNS.md; may manifest as keyboard-transition jank in Phase 2. |
| Polling chat unread count every 60s while app is backgrounded (per CONCERNS.md) | Battery drain; review team may flag in "app uses excessive background activity" | Already known; Phase 5 should at minimum guard the interval behind `AppState === 'active'` | Already degraded; not new in M1. |

---

## Security Mistakes

Domain-specific security issues for this project.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-side `userType === 'admin'` (or hardcoded email allowlist) without backend role verification | Anyone can reverse-engineer the APK/IPA, find the admin endpoints, send a crafted request and modify verification flags / tour URLs on any listing. Critical — this is tampering with platform trust signals. | Backend (Railway) must independently verify the authenticated user's role on every write to `/properties/:id/verifications` and `/properties/:id/tours`. Client gating is UX only. |
| Hardcoded Firebase API key (`AuthService.ts:5`) — known, from CONCERNS.md | Abuse of the Firebase project with signup/signin traffic; quota consumption; if Auth isn't restricted, credential stuffing attacks route through your project | Already flagged as Critical in CONCERNS.md. Not part of M1 scope unless release is blocked. Apply Firebase Auth restrictions (allowed domains, App Check) at minimum in Phase 5. |
| Sending `x-firebase-uid` header instead of `Authorization: Bearer ${idToken}` (CONCERNS.md High) | Anyone with another user's `localId` from a shared listing response can impersonate them to the backend | Backend change required. Ideally lands with Phase 4 (role gating) since both require backend verification discipline — bundling them protects release timeline. |
| Storing tokens in AsyncStorage unencrypted (CONCERNS.md High) | Rooted Android + backed-up iOS devices leak tokens | Out-of-scope for M1 polish. Note for M2. |
| Privacy manifest advertises less data collection than app actually performs | App Store rejection; also deceptive-practice concern if live users' App Privacy labels are wrong | Phase 5 — audit and populate `PrivacyInfo.xcprivacy` comprehensively. |
| Admin allowlist emails visible in decompiled bundle | Attacker knows which accounts to target (phishing, credential stuffing against those specific Gmail accounts) | Accept this as a limitation of client-side gating. Mitigate by ensuring backend never trusts the client, AND by short-listing only accounts with strong 2FA enabled. |
| Hardcoded Matterport/panoramic URLs editable only by admins on the client, but backend accepts any user's PATCH | User bypasses client gate, submits their own 3D tour URL for any listing, effectively vandalizing verification | Paired backend enforcement (same as roles). Test with a crafted `curl` request as a non-admin — if it succeeds, the gate is fake. |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Keyboard fix works in portrait only; landscape is broken | Broken rotation experience; store reviewers rotate | Test portrait AND landscape on both platforms explicitly in the keyboard test matrix. |
| Bottom nav fix reduces trap from 100% to 80% repro and ships | Users hit it on edge cases; store reviewers hit it; one-star reviews cite "app gets stuck" | Require 0% repro across the full transition matrix before shipping. Video-record each test. |
| Category change silently drops user-entered fields | User frustration, trust loss, "the app ate my form" reviews | Never destroy form state on category change. Filter at submit time only. |
| "Hospitality" label in EN but "Гостиничное" stays missing/wrong in RU | Russian-locale users see raw key or English string | Sync EN and RU table entries in the same commit. CI lint step would catch it; manual `diff <(jq keys en.json) <(jq keys ru.json)` as a cheaper check. |
| Hospitality section visually identical to residential section, just missing price | Users think it's a bug or missing data | Explicit visual treatment — label the section, use tour-first media layout (per PROJECT.md "tours-first, no price"), show "Contact for pricing" placeholder. |
| Admin-only fields (Matterport URL) shown-but-disabled to non-admins | Users tap the field, get no response, assume bug | Hide entirely for non-admins; do not show disabled. The field's existence is itself information leak. |
| Form submit button enabled while required fields are empty | User taps, gets error, loses faith in form | Disable button until required-for-category set is complete. Scroll to first invalid field on submit attempt. |
| Password-reset deep link opens two screens at once (per CONCERNS.md "High: Deep-link handler re-runs on every auth change") | Overlapping UI, user confused | Already known. Not in M1 scope unless it regresses under nav fixes. |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces. Use this during Phase 5 release prep.

- [ ] **Universal keyboard fix:** Verify on iOS + Android × every screen with TextInput × inside modals (contact modal, delete modal, auth modal) × with a header × at the bottom of a long form (hospitality amenities) × inside a FlatList (chat composer if any). Missing any one cell = not universal.
- [ ] **Bottom nav fix:** Verify from each of the 8+ visible states × each of 4 nav tabs = 32+ transitions tested. Video-record the full matrix. Any miss = not fixed.
- [ ] **Land removal:** `grep -r -i 'land' src/ | grep -v 'landlord\|landscape\|landing'` returns zero matches in type definitions, chips, filters, locale tables. Also check iOS/Android manifests and backend if reachable.
- [ ] **Hostel/Hotel addition:** Both types appear in chips, filters, required-field branch, i18n EN + RU, and render correctly as *both* "for rent" and "for sell" with price hidden in both modes. Separate home-screen section confirmed on Home + Favorites + OwnerListings screens.
- [ ] **Admin allowlist:** Lowercased comparison; single source of truth file; consumed via `useIsAdmin()` hook everywhere (grep for inline `.includes(ADMIN_EMAILS)` — none should exist outside the utility); backend endpoint independently verifies admin status (test with curl as non-admin).
- [ ] **Version bump:** `package.json` 1.0.4, Android `versionCode 25 versionName "1.0.4"` in `build.gradle`, iOS `MARKETING_VERSION = 1.0.4 CURRENT_PROJECT_VERSION = 21` in `project.pbxproj`. All four must match. Docs (`IOS_APP_STORE_READINESS.md`, `ANDROID_PLAY_STORE_READINESS.md`) updated. Per CONCERNS.md these have drifted before.
- [ ] **Privacy manifest (iOS):** `NSPrivacyCollectedDataTypes` populated with email/name/phone/photo/location at minimum; `NSPrivacyAccessedAPITypes` includes UserDefaults reason for AsyncStorage; App Store Connect App Privacy responses match manifest.
- [ ] **App Store Connect metadata:** Screenshots refreshed to show the new Hospitality UI (not old Land UI); review notes mention that Hostel/Hotel listings intentionally have no price and drive offline booking; demo account credentials provided (reviewers always need these for auth-gated apps).
- [ ] **Android permissions declared match usage:** Per CONCERNS.md the readiness doc claims permissions that aren't in the manifest; reconcile and add `READ_MEDIA_IMAGES` if needed by `react-native-image-picker 8.x` on Android 13+.
- [ ] **Universal link entitlement cleanup:** Decide whether `applinks:www.bizdinkonush.com` stays (if backward-compat is still wanted and the domain is still yours) or goes (if the domain lapsed). Don't ship with a hijackable entitlement.
- [ ] **Xcode + iOS SDK version:** Per April 2026 App Store requirement — must submit with Xcode 26 / iOS 26 SDK. Confirm build machine before submission.
- [ ] **Release keystore / signing:** Android signing config valid; iOS automatic signing works on CI or local Xcode. Test build a release AAB and IPA before submission day.
- [ ] **i18n parity:** Every new key added to EN also in RU. `diff <(keys-of en.json) <(keys-of ru.json)` returns empty.
- [ ] **Manual device QA pass:** Per PROJECT.md — physical iOS + physical Android, not just simulators. Simulator passes have false-negatives for keyboard + touch capture issues specifically.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Bottom-nav "fix" regressed a different screen | LOW | Video-record exactly which transition breaks. Revert to pre-fix. Re-apply with that transition added to the test matrix. Total: hours. |
| Keyboard library causes crash on Android | MEDIUM | Roll back to per-screen `KeyboardAvoidingView` as an emergency hotfix. File issue on keyboard-controller with minimal repro. Re-enable library behind a feature flag next release. Total: 1–2 days. |
| Category change data loss discovered post-ship | MEDIUM | Hotfix: snapshot form state before category change, restore-on-revert. Patch release 1.0.5. Affected users whose data was lost: unrecoverable unless backend had partial saves. Clean-slate data assumption per PROJECT.md helps. |
| Admin allowlist leaked in App Store review / bundle analysis | LOW–MEDIUM | The emails were already in git and in every build — there's nothing to "unleak." Notify affected users to enable 2FA (which they should have anyway). Move to M2 roles ASAP. |
| App Store Connect rejects on privacy manifest mismatch | LOW | Fix manifest, resubmit. 24–48 hour review cycle. If blocking a critical deadline, contact Apple via App Review Contact with business justification. Total: 1–3 days. |
| Google Play rejects on broken navigation (reviewer hit the bottom-nav trap) | MEDIUM | Fix nav, resubmit. Play Store review is often faster than Apple's (hours to ~2 days). Worst case: appeal via Play Console. Total: 1–3 days. |
| iOS 26 SDK requirement missed, automated upload rejected | LOW | Upgrade Xcode to 26, re-archive, resubmit. Total: hours if no build errors, 1–2 days if dependency incompatibilities surface. |
| Firebase API key abuse detected after launch | HIGH | Rotate key in Firebase Console (every user logged out); apply App Check + Auth restrictions; submit a new build with the new key. Total: 1 day rotation + 1–3 days review. |
| Keep-alive `display: none` trap reappears on a screen added later (M2 moderation) | LOW if pattern fix landed in M1 | If M1 Pitfall 3 fix applied `pointerEvents` belt-and-suspenders globally, the M2 screen inherits the protection. Otherwise: same fix applied to the new screen only. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls. Phases numbered in recommended execution order.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Pitfall 1: Bottom-nav patch-the-symptom trap | Phase 1 (Nav reliability) | Zero-repro across the full 32+ transition matrix; video evidence. |
| Pitfall 3: `display: none` keep-alive touch capture | Phase 1 (Nav reliability) | Explicit `pointerEvents="none"` on hidden screens verified by touch-target logging; all modals conditionally rendered not just `visible={false}`. |
| Pitfall 2: KeyboardAvoidingView-as-universal-fix | Phase 2 (Universal keyboard) | Single root-level `KeyboardProvider`; no per-screen magic-number offsets; every screen × platform × modal cell tested. |
| Pitfall 4: Category-change data loss + validation divergence | Phase 3 (Listing form overhaul) | Single source-of-truth `listingCategorySchema.ts`; form state never destroyed on category change; `grep 'land'` returns zero matches; EN/RU keyset parity. |
| Pitfall 5: Email allowlist in source / backend enforcement missing | Phase 4 (Role gating precursor) | One file with the list; `useIsAdmin()` consumed everywhere; backend coordination checkpoint confirms server-side verification; M2 migration TODO comment in place. |
| Pitfall 6: Privacy manifest / SDK version / store submission drift | Phase 5 (Release prep + submission) | Privacy manifest populated and cross-checked with App Store Connect responses; Xcode 26 / iOS 26 SDK confirmed; version numbers consistent across `package.json`, `build.gradle`, `project.pbxproj`, docs. |
| Back-handler 23-dep useEffect latent bug | Phase 1 (touch during nav work) | Ref-based handler; single addEventListener call verified with a `console.log` in the cleanup that only fires once per app lifecycle. |
| Deep-link double-navigation (CONCERNS.md) | Phase 1 or Phase 5 | Deep-link useEffect doesn't depend on `[user]`; test password-reset deep link on cold start when user is already logged in. |

---

## Roadmap-Level Takeaways

For the planner creating the M1 roadmap:

1. **Phase order matters.** Nav (Phase 1) must land before Keyboard (Phase 2). Keyboard testing relies on stable navigation — if you test keyboard fixes on a screen that sometimes traps, you can't tell whether a failure is keyboard or nav.

2. **Listing form (Phase 3) is independent** from Nav/Keyboard for development, but depends on them for QA. Can start in parallel after Phase 1 completes.

3. **Role gating (Phase 4) requires a backend coordination checkpoint** that isn't a code change — explicitly budget time for confirming with the Railway backend owner that admin endpoints verify server-side. If they don't, that's a scope expansion or a release-blocking security risk that must be surfaced.

4. **Phase 5 (release prep) is NOT just a version bump.** It includes privacy manifest population, Xcode SDK verification, entitlement cleanup, App Store Connect metadata refresh, i18n parity check, store screenshots for the new Hospitality UI, permissions reconciliation. Budget at least 2 days, not 2 hours.

5. **Manual device QA is the testing bar** per PROJECT.md — budget explicit time for it in each phase's exit criteria, not just at the end. Phase 1 and Phase 2 especially need device testing (simulators give false negatives on touch capture and keyboard).

6. **The "obvious" fix is usually wrong** for Pitfalls 1, 2, and 4. Anchor each phase's approach in the root-cause framing from this file to resist shortcut pressure.

---

## Sources

- JayTap codebase map: `.planning/codebase/ARCHITECTURE.md` (custom navigator details), `.planning/codebase/CONCERNS.md` (pre-existing technical debt), `.planning/PROJECT.md` (M1 requirements and constraints) — [HIGH confidence — read directly]
- [React Native KeyboardAvoidingView official docs](https://reactnative.dev/docs/keyboardavoidingview) — [HIGH]
- [react-native-keyboard-controller KeyboardAvoidingView docs](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-avoiding-view) — [HIGH, Context7 verified]
- [react-native-keyboard-controller Architecture](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/recipes/architecture) — [HIGH]
- [react-native-keyboard-controller KeyboardAwareScrollView + FlatList](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-aware-scroll-view) — [HIGH, Context7 verified]
- [DEV.to: Fixing Keyboard Avoiding in React Native](https://dev.to/iway1/fixing-keyboard-avoiding-in-react-native-1k5i) — [MEDIUM, community]
- [Medium: Keyboard-avoiding with native headers or iOS modals](https://medium.com/@felippepuhle/react-native-quick-tip-solving-keyboardavoidingview-problems-on-screens-using-native-headers-or-1c77b5ec417c) — [MEDIUM]
- [React Navigation Issue #12824: Bottom Tab hidden leaves invisible touchable area](https://github.com/react-navigation/react-navigation/issues/12824) — [HIGH, confirms `display:none` touch-capture failure mode in React Navigation itself]
- [React Native BackHandler docs](https://reactnative.dev/docs/backhandler) — [HIGH]
- [Apple Privacy Manifests (react-native-community discussion)](https://github.com/react-native-community/discussions-and-proposals/discussions/766) — [HIGH]
- [Action Required: iOS Privacy Manifest for React Native](https://github.com/react-native-community/discussions-and-proposals/discussions/776) — [HIGH]
- [Apple Privacy Manifest Files official docs](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) — [HIGH]
- [DEV.to: Apple privacy manifest for React Native](https://dev.to/dannyhw/apple-privacy-manifest-for-react-native-29fk) — [MEDIUM]
- [Medium: Required Reason API troubleshooting PrivacyInfo.xcprivacy](https://jochen-holzer.medium.com/required-reason-api-troubleshooting-your-ios-privacy-manifest-file-privacyinfo-xcprivacy-c81084dc9d51) — [MEDIUM]
- [Apple App Store Rejection Guide 2026 — 15 most common reasons](https://www.openspaceservices.com/blog/apple-app-store-rejection-guide-2026-the-15-most-common-reasons-and-how-to-fix-each) — [MEDIUM, 2026-current]
- [Forge: Top 10 App Store Rejection Reasons in 2026](https://forgeasc.com/blog/app-store-rejection-reasons) — [MEDIUM, 2026-current; flags iOS 26 SDK requirement]
- [Top Reasons iOS Apps Get Rejected by App Store in 2026](https://www.eitbiz.com/blog/top-reasons-ios-apps-get-rejected-by-the-app-store-and-fixes/) — [MEDIUM, 2026-current]
- [OneMobile: 11 Common Google Play Store Rejections](https://onemobile.ai/common-google-play-store-rejections/) — [MEDIUM]
- [Prime Test Lab: Google Play App Rejection Rate in 2026](https://primetestlab.com/blog/google-play-app-rejection-rate-2026) — [MEDIUM, 2026-current]
- [React Hook Form Advanced Usage (conditional fields, shouldUnregister)](https://react-hook-form.com/advanced-usage) — [HIGH]
- [React Native Security official docs](https://reactnative.dev/docs/security) — [HIGH]
- [Quokka Labs: React Native App Security Risks & Best Practices (2026)](https://quokkalabs.com/blog/react-native-app-security/) — [MEDIUM, 2026-current]
- [RNSEC Security Rules](https://www.rnsec.dev/docs/security-rules) — [MEDIUM]

---
*Pitfalls research for: JayTap v1.0.4 polish milestone — universal keyboard, nav reliability, category-driven forms, role gating, store submission*
*Researched: 2026-04-22*
