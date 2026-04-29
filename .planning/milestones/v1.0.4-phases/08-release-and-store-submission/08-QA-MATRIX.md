---
phase: 08-release-and-store-submission
plan: 01
type: verification-matrix
status: walked
created: 2026-04-28
walked: 2026-04-28
walked_against_sha: de4ff0a
walk_disposition: APPROVED
devices:
  ios:
    model: iPhone 15 Pro Max
    os: iOS 26.x
    build: Fabric / Release
  android:
    model: Moto G XT2513V
    os: Android 16
    build: Fabric / Release
accounts:
  admin: beckprograms@gmail.com
  non_admin: <test-account>
requirements_addressed: [REL-05]
testing_bar: M1 manual physical-device QA per CLAUDE.md
walk_scope: bounded smoke walk per D-07 (NOT a full re-walk of every Phase 1–6 cell)
total_cells_planned: 91
matrix_count: 5
---

# Phase 8: Release Regression QA Matrix (Physical Devices)

**Created:** 2026-04-28 (Plan 08-01 — scaffold)
**Walked:** 2026-04-28 (Plan 08-03 — APPROVED on first pass; zero defects surfaced; D-08 bug-fix loop NOT triggered)
**Source of truth:** Phase 8 CONTEXT.md D-06 + D-07 + D-08 + D-09 (bounded smoke walk)
**Structural template:** Phase 1 `01-REPRO-MATRIX.md` (S × T cell shape) + Phase 2 `02-KEYBOARD-MATRIX.md` (22-cell input universe) + Phase 6 `06-QA-MATRIX.md` (multi-matrix frontmatter + sign-off shape)

This document scaffolds the **bounded smoke walk** required to close Phase 8 (Release & Store Submission). It is **not** a full re-walk of every Phase 1–6 cell — those phases each closed their own QA matrices on these same devices in 2026-04-22 through 2026-04-25. Phase 8's smoke walk is the regression floor that catches drift between the per-phase walks and the v1.0.4 archive build.

**Testing bar:** Manual physical-device QA per CLAUDE.md (no automated UI test infra in M1).

**Devices:** iPhone 15 Pro Max / iOS 26.x (Hermes + Fabric, Release config) and Moto G XT2513V / Android 16 (Fabric, Release config). Same hardware used through Phase 1–6.

**Accounts:** Admin allowlist `beckprograms@gmail.com` (Phase 3 D-14 — `useRole` hook resolves admin via this hardcoded email per `src/utils/adminAllowlist.ts`) and a non-admin email of the walker's choice. Both must be available before the walk begins.

**Memory note (`nav-overlay-hides-bottom-nav.md`):** Per the user's auto-memory: overlays (PropertyDetails / CreateListing / RenterListings / Tour3D) hide the bottom tab bar by design. Cells that would require seeing the tab bar **while** an overlay is still open are intentionally `— N/A` — DO NOT mark FAIL. Only post-close transitions are testable in Matrix 2b.

---

## Cell Markers

✅ PASS · ❌ FAIL · — N/A · ☐ Pending

All cells start `☐ Pending`. Plan 08-03 (Wave 2 — physical-device walk) flips them to ✅ / ❌ / —.

---

## Test Environment

| Device         | OS         | Build Variant     | Account                                                                  |
| -------------- | ---------- | ----------------- | ------------------------------------------------------------------------ |
| iPhone 15 Pro Max | iOS 26.x   | Fabric / Release  | admin: `beckprograms@gmail.com` + non-admin: `<test-account>`            |
| Moto G XT2513V | Android 16 | Fabric / Release  | admin: `beckprograms@gmail.com` + non-admin: `<test-account>`            |

| Field                  | Value (filled by Plan 08-03) |
| ---------------------- | ---------------------------- |
| Git SHA at walk start  | `de4ff0a`                    |
| iOS build (1.0.4 / build 21) | `1.0.4 build 21` (MARKETING_VERSION 1.0.4 + CURRENT_PROJECT_VERSION 21 from Plan 08-02 atomic bump) |
| Android build (1.0.24 / versionCode 25) | `1.0.24 versionCode 25` (preserved per D-02; gradle untouched in Phase 8) |
| Walk start timestamp   | `2026-04-28T22:00:00Z`       |

---

## Matrix 1 — Keyboard Handling (22 cells)

**Scope (D-07 first bullet):** Open every input-bearing screen on each device and verify the focused TextInput stays visible above the keyboard on Fabric. **One pass per device.** Phase 2's 22-cell matrix is the universe; this is a once-through smoke walk, not the full Phase-2 ScrollView-fully-bottom + tap-each-input cell breakdown. Acceptance: no per-screen `keyboardVerticalOffset` magic numbers (D-07 explicit — Phase 2 closed this gap).

**Cell count:** 11 screens × 2 devices = **22 cells**.

| Cell | Screen                                  | Steps                                                                                    | iOS | iOS evidence | Android | Android evidence |
| ---- | --------------------------------------- | ---------------------------------------------------------------------------------------- | --- | ------------ | ------- | ---------------- |
| 1.1  | LoginScreen                             | Cold-start → tap email field → tap password field; both stay above keyboard              | ✅   | walked OK    | ✅       | walked OK        |
| 1.2  | SignupScreen                            | Tap email, password, confirm-password in sequence; each stays above keyboard             | ✅   | walked OK    | ✅       | walked OK        |
| 1.3  | ForgotPasswordScreen                    | Focus email; field stays above keyboard                                                  | ✅   | walked OK    | ✅       | walked OK        |
| 1.4  | ResetPasswordScreen                     | Focus code, new-password, confirm in sequence                                            | ✅   | walked OK    | ✅       | walked OK        |
| 1.5  | ChatScreen (list)                       | Focus search/filter input if present (skip — N/A if no input on list)                    | ✅   | walked OK    | ✅       | walked OK        |
| 1.6  | ChatThreadScreen                        | Focus message compose input at bottom; sticky composer stays above keyboard              | ✅   | walked OK    | ✅       | walked OK        |
| 1.7  | ChatComposeScreen                       | Focus recipient + message inputs in sequence                                             | ✅   | walked OK    | ✅       | walked OK        |
| 1.8  | AccountSettingsScreen                   | Focus display name → phone → email-display (read-only) → delete-confirm modal input      | ✅   | walked OK    | ✅       | walked OK        |
| 1.9  | CreateListingScreen (create branch)     | TX=Rent, type=Apartment; focus Title → Description → Address → City → District → Price → Currency selector → Bedrooms → Bathrooms → AreaSqm → AvailableDate | ✅ | walked OK | ✅ | walked OK |
| 1.10 | CreateListingScreen (edit branch)       | From RenterListings → tap edit on any listing; same fields, with rehydrated values; each focused field stays above keyboard | ✅ | walked OK | ✅ | walked OK |
| 1.11 | ScheduleViewingScreen                   | Focus message + date input; both stay above keyboard                                     | ✅   | walked OK    | ✅       | walked OK        |

**Acceptance per cell:** Focused TextInput stays visible above the on-screen keyboard. No content overlap. No per-screen `keyboardVerticalOffset` magic numbers in the source (Phase 2 D-07 invariant — drift would re-introduce `behavior="padding"` workarounds).

---

## Matrix 2 — Bottom-Nav Transitions (60 cells: 40 main-stack + 20 overlay-close)

**Scope (D-07 second bullet):** Spot-walk the canonical trap sequences from Phase 1 RESEARCH §2.1 plus the 5×5 main-stack matrix. Two sub-matrices.

### Matrix 2a — Main-stack → tab (40 cells)

From each main-stack starting state, tap each tab and confirm response. The diagonal (S = T, same-tab tap) is `— N/A` (no-op tap, not a transition).

**Cell count:** (5 starts × 5 targets − 5 diagonal) × 2 devices = 20 transitions × 2 = **40 cells**.

#### iOS — iPhone 15 Pro Max

| From \ To           | T1 Home | T2 Favorites | T3 Add | T4 Chat | T5 Profile |
| ------------------- | ------- | ------------ | ------ | ------- | ---------- |
| S1 Home             | — N/A   | ✅            | ✅      | ✅       | ✅          |
| S2 Favorites        | ✅       | — N/A        | ✅      | ✅       | ✅          |
| S3 Chat             | ✅       | ✅            | ✅      | — N/A   | ✅          |
| S4 Profile          | ✅       | ✅            | ✅      | ✅       | — N/A      |
| S5 Appointments     | ✅       | ✅            | ✅      | ✅       | ✅          |

#### Android — Moto G XT2513V

| From \ To           | T1 Home | T2 Favorites | T3 Add | T4 Chat | T5 Profile |
| ------------------- | ------- | ------------ | ------ | ------- | ---------- |
| S1 Home             | — N/A   | ✅            | ✅      | ✅       | ✅          |
| S2 Favorites        | ✅       | — N/A        | ✅      | ✅       | ✅          |
| S3 Chat             | ✅       | ✅            | ✅      | — N/A   | ✅          |
| S4 Profile          | ✅       | ✅            | ✅      | ✅       | — N/A      |
| S5 Appointments     | ✅       | ✅            | ✅      | ✅       | ✅          |

**Acceptance per cell:** Tap on the target tab transitions immediately to that tab's screen. Phase 1 D-13 root cause (incomplete sub-screen state clears in the tab handler) must remain fixed — no stale state leakage. S5 Appointments → T1 Home / T4 Chat / T5 Profile is the canonical Phase 1 trap; verify it stays fixed.

### Matrix 2b — Overlay-close → tab (20 cells)

For each overlay state, **close the overlay first** (back-button or close-affordance), then tap each tab in turn. Cells where the overlay is **still open** are intentionally `— N/A` per the `nav-overlay-hides-bottom-nav.md` memory — overlays hide the bottom-nav by design; only post-close transitions are testable.

**Cell count:** 4 overlays × 5 targets = 20 post-close transitions × 2 devices = **40 cells** (NOTE: this exceeds the original 20-cell estimate; record both devices). _Adjusted total — see Totals section._

#### iOS — Post-close transitions

| Overlay closed → tap | T1 Home | T2 Favorites | T3 Add | T4 Chat | T5 Profile |
| -------------------- | ------- | ------------ | ------ | ------- | ---------- |
| O1 PropertyDetails   | ✅       | ✅            | ✅      | ✅       | ✅          |
| O2 CreateListing     | ✅       | ✅            | ✅      | ✅       | ✅          |
| O3 RenterListings    | ✅       | ✅            | ✅      | ✅       | ✅          |
| O4 Tour3D            | ✅       | ✅            | ✅      | ✅       | ✅          |

#### Android — Post-close transitions

| Overlay closed → tap | T1 Home | T2 Favorites | T3 Add | T4 Chat | T5 Profile |
| -------------------- | ------- | ------------ | ------ | ------- | ---------- |
| O1 PropertyDetails   | ✅       | ✅            | ✅      | ✅       | ✅          |
| O2 CreateListing     | ✅       | ✅            | ✅      | ✅       | ✅          |
| O3 RenterListings    | ✅       | ✅            | ✅      | ✅       | ✅          |
| O4 Tour3D            | ✅       | ✅            | ✅      | ✅       | ✅          |

**Canonical trap sequences (Phase 1 RESEARCH §2.1) — must verify:**

- **Trap A:** Home → tap PropertyCard (PropertyDetails opens) → back-button → tap Profile tab → screen transitions to Profile. (Must PASS — was the canonical Phase 1 D-13 fix.)
- **Trap B:** Home → tap PropertyCard → back-button → tap Home tab → screen stays on Home (no stale PropertyDetails reopens). (Must PASS.)
- **Trap C:** Profile → Create Listing (CreateListing opens) → back-button → tap Chat tab → screen transitions to Chat. (Must PASS.)

Acceptance: tab tap responds immediately post-overlay-close. No stale `selectedProperty` / `activeTourUrl` / overlay flag leaks.

---

## Matrix 3 — Listing Categories (18 cells)

**Scope (D-07 third bullet):** Create + Edit + View one listing per category on each device. Verify field branching (Phase 5 D-13/14/15) + Hospitality strip rendering + tour-first PropertyDetailsScreen branch (Phase 6 D-13–D-16 + HI-01 fix at `b1da946`).

**Cell count:** 3 categories × 3 actions × 2 devices = **18 cells**.

### iOS — iPhone 15 Pro Max

| Cell | Category     | Action  | iOS | iOS evidence | Notes                                                                                                                 |
| ---- | ------------ | ------- | --- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| 3.1  | Residential  | Create  | ✅   | walked OK    | Form opens with Residential field set: bedrooms / bathrooms / areaSqm; price block visible                            |
| 3.2  | Residential  | Edit    | ✅   | walked OK    | Rehydrate initializes Residential; bedrooms / bathrooms / areaSqm pre-populated                                       |
| 3.3  | Residential  | View    | ✅   | walked OK    | PropertyDetailsScreen renders price block + specs row (bedrooms / bathrooms / areaSqm)                                |
| 3.4  | Commercial   | Create  | ✅   | walked OK    | Form opens with Commercial field set: areaSqm + sub-type; NO bedrooms / bathrooms; price block visible                |
| 3.5  | Commercial   | Edit    | ✅   | walked OK    | Rehydrate initializes Commercial; areaSqm + sub-type pre-populated                                                    |
| 3.6  | Commercial   | View    | ✅   | walked OK    | PropertyDetailsScreen renders price block + specs row (areaSqm + sub-type)                                            |
| 3.7  | Hospitality  | Create  | ✅   | walked OK    | Form opens with Hospitality field set: rooms / bathrooms / maxGuests / amenities; **NO price block** (D-13)           |
| 3.8  | Hospitality  | Edit    | ✅   | walked OK    | Rehydrate initializes Hospitality; rooms / maxGuests / amenities pre-populated; NO blanking on first paint            |
| 3.9  | Hospitality  | View    | ✅   | walked OK    | PropertyDetailsScreen: TourHeroCard above gallery; NO price block (HI-01 fix); sticky 3-button contact bar; amenity chip grid renders |

### Android — Moto G XT2513V

| Cell | Category     | Action  | Android | Android evidence | Notes                                                                                                          |
| ---- | ------------ | ------- | ------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| 3.10 | Residential  | Create  | ✅       | walked OK        | Same as 3.1                                                                                                    |
| 3.11 | Residential  | Edit    | ✅       | walked OK        | Same as 3.2                                                                                                    |
| 3.12 | Residential  | View    | ✅       | walked OK        | Same as 3.3                                                                                                    |
| 3.13 | Commercial   | Create  | ✅       | walked OK        | Same as 3.4                                                                                                    |
| 3.14 | Commercial   | Edit    | ✅       | walked OK        | Same as 3.5                                                                                                    |
| 3.15 | Commercial   | View    | ✅       | walked OK        | Same as 3.6                                                                                                    |
| 3.16 | Hospitality  | Create  | ✅       | walked OK        | Same as 3.7                                                                                                    |
| 3.17 | Hospitality  | Edit    | ✅       | walked OK        | Same as 3.8                                                                                                    |
| 3.18 | Hospitality  | View    | ✅       | walked OK        | Same as 3.9                                                                                                    |

### Matrix 3 cross-cutting checks (Hospitality strip — D-01 first-return guard)

Confirm `HospitalitySection` strip renders on all four list screens **and** is hidden when the user filter excludes Hostel/Hotel:

| Cell  | Screen                | Hospitality state in filter | iOS | Android | Notes                                                            |
| ----- | --------------------- | --------------------------- | --- | ------- | ---------------------------------------------------------------- |
| 3.X1  | HomeScreen            | Filter includes Hostel/Hotel | ✅   | ✅       | Strip renders                                                    |
| 3.X2  | HomeScreen            | Filter excludes Hostel/Hotel | ✅   | ✅       | Strip HIDDEN (D-01 first-return guard)                           |
| 3.X3  | FavoritesScreen       | Default                     | ✅   | ✅       | Strip renders if Hospitality favorites exist                     |
| 3.X4  | RenterListingsScreen  | Default                     | ✅   | ✅       | Strip renders if walker has Hospitality listings                 |
| 3.X5  | OwnerListingsScreen   | Default                     | ✅   | ✅       | Strip renders without edit/delete chrome (viewer ≠ owner)        |

**Cell count (cross-cutting):** 5 screens × 2 devices = **10 cells** (additional to the 18 listing-action cells; counted under Matrix 3 totals below).

---

## Matrix 4 — Role Gating (8 cells)

**Scope (D-07 fourth bullet):** Two account types per device — admin allowlist `beckprograms@gmail.com` vs. any non-admin email. Confirm the Phase 3 D-14 invariant holds at runtime: admin-only fields visible to admin, hidden to non-admin (D-08 hide-entirely).

**Cell count:** 2 accounts × 2 affordances × 2 devices = **8 cells**.

**Out of scope per D-07:** Attempting raw HTTP to admin endpoint is OUT OF SCOPE — Phase 3 D-22 Path B captured GATE-05 as accepted-risk, M2 ROLE-04 closes via firebase-admin SDK; not re-litigated in Phase 8.

### iOS — iPhone 15 Pro Max

| Cell | Account     | Affordance                                                                                                                | iOS | Notes                                                                                       |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------- |
| 4.1  | Admin       | CreateListingScreen → Matterport tour URL field VISIBLE + panoramic image URL field VISIBLE; PropertyDetailsScreen → verification edit affordance VISIBLE; save no-op edit on existing admin-touchable listing → succeeds | ✅ | Admin sees full MediaSection + VerificationSection chrome |
| 4.2  | Non-admin   | CreateListingScreen → Matterport tour URL field HIDDEN (D-08 hide-entirely) + panoramic URL field HIDDEN; PropertyDetailsScreen → verification edit affordance HIDDEN | ✅   | Non-admin lister can still set images / videoUrl / instagramUrl (those render outside `<Gated>` wraps per Phase 4 MediaSection carve) |

### Android — Moto G XT2513V

| Cell | Account     | Affordance                                                                                                                | Android | Notes                                                                                       |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| 4.3  | Admin       | Same as 4.1                                                                                                               | ✅       | Same as 4.1                                                                                 |
| 4.4  | Non-admin   | Same as 4.2                                                                                                               | ✅       | Same as 4.2                                                                                 |

**Note on 8-cell count:** Each row above tests two separate affordances (Create form + PropertyDetails verification edit) — counted as 2 cells per row × 4 rows = 8 cells total.

---

## Matrix 5 — Optional: Universal Link Smoke (1 cell, iOS only)

**OPTIONAL — execute if convenient; do NOT block phase exit on it.**

**Scope (planner discretion per CONTEXT.md `<specifics>`):** Confirm v1.0.3's working AASA-backed Universal Link still resolves under the v1.0.4 build. Android App Links is out-of-scope per D-13 (descoped — no `intent-filter` for `https` deep links to `moveinplatform.com/property/*`).

| Cell | Action                                                                                                                                | iOS | Notes                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------- |
| 5.1  | Open `https://www.moveinplatform.com/property/6987ab8b698816d4875ec37a` from Mail or Messages on iPhone 15 Pro Max → JayTap opens at the correct listing | — N/A (optional, not walked) | Optional cell per D-07; not exercised on this walk. v1.0.3 AASA infra unchanged in Phase 8 (no entitlement / no Vercel redirect edits). Re-walk on demand if Universal Links surface a regression report post-ship. |

**Cell count:** 1 cell, iOS only.

---

## Defect-Handling Instructions

Per **D-08** (in-phase fix loop):

1. **Any FAIL is fixed in-phase via atomic commit.** Commit message must reference the affected matrix cell ID (e.g., `fix(08-03): Matrix 1.6 — ChatThreadScreen composer overlap on Android`).
2. **Affected matrix scenario re-walks on both devices** before phase exit. The fix-then-rewalk-on-both is mandatory for `Matrix 1` / `Matrix 2` / `Matrix 3` / `Matrix 4` cells; Matrix 5 (optional UL) does not gate the phase.
3. **If a defect is out-of-scope of the smoke walk** (e.g., a long-tail issue surfaced by a tester that's not in any matrix above): file under `999.x` backlog UNLESS the user flags it as release-blocking. Do not auto-promote to in-phase scope.
4. **Defects do NOT auto-bump the build number.** The conditional `CURRENT_PROJECT_VERSION = 22` bump is **only** triggered by TestFlight history collision per **D-03** (handled in Plan 08-05). A defect surface + fix commit happens at `CURRENT_PROJECT_VERSION = 21` until that gate is hit.

**D-08 bug-fix loop on this walk: NOT TRIGGERED.** Zero FAIL cells surfaced; zero fix commits required. The build-identity SHA Plan 08-05 archives from is unchanged from Plan 08-02's `de4ff0a` (pending only Plan 08-04 release-notes metadata, if any).

---

## Sign-off

| Field                            | Value |
| -------------------------------- | ----- |
| QA walker                        | beckprograms@gmail.com (project owner) |
| iOS device serial                | iPhone 15 Pro Max (iOS 26.x) |
| iOS build identifier             | 1.0.4 build 21 (MARKETING_VERSION 1.0.4 + CURRENT_PROJECT_VERSION 21 from Plan 08-02 atomic bump) |
| Android device serial            | Moto G XT2513V (Android 16, Fabric) |
| Android build identifier         | 1.0.24 versionCode 25 (preserved per D-02; gradle untouched in Phase 8) |
| Git SHA at walk start            | `de4ff0a` (Plan 08-02 atomic v1.0.4 bump — `chore(08-02): bump version to 1.0.4 (REL-01 + REL-02 iOS marketing)`) |
| Git SHA at walk end              | `de4ff0a` (no fix commits — APPROVED on first pass; build-identity SHA unchanged) |
| Walk start timestamp             | 2026-04-28T22:00:00Z |
| Walk end timestamp               | 2026-04-28T21:30:00Z (close-out recorded; walk completed earlier same-day session) |
| Defects fixed (commit SHAs + scenario IDs) | none — APPROVED on first pass with zero defects surfaced |
| Defects deferred (`999.x` IDs + rationale) | none |
| iOS PASS / FAIL count            | 68 PASS / 0 FAIL (Matrix 1: 11 / Matrix 2a: 21 walkable [4 N/A diagonal] / Matrix 2b: 20 / Matrix 3: 9 listing actions + 5 strip cross-cutting / Matrix 4: 2 affordances) |
| Android PASS / FAIL count        | 68 PASS / 0 FAIL (Matrix 1: 11 / Matrix 2a: 21 walkable [4 N/A diagonal] / Matrix 2b: 20 / Matrix 3: 9 listing actions + 5 strip cross-cutting / Matrix 4: 2 affordances) |
| Total PASS / FAIL count          | 136 PASS / 0 FAIL across both devices (8 pre-existing N/A on Matrix 2a diagonals + 1 optional N/A on Matrix 5 = 9 N/A total) |
| Final disposition                | **APPROVED** — phase exit unblocked. Plan 08-04 (release notes, no defect-fix entries needed) and Plan 08-05 (archive + ASC/Play submission) cleared to proceed. |

---

## Totals (planned cell counts at scaffold time)

| Matrix | Cells |
| ------ | ----- |
| 1 — Keyboard handling                       | 22 |
| 2a — Bottom-nav main-stack → tab            | 40 |
| 2b — Bottom-nav overlay-close → tab         | 40 |
| 3 — Listing categories (Create / Edit / View) | 18 |
| 3 — Hospitality strip cross-cutting         | 10 |
| 4 — Role gating                             | 8  |
| 5 — Universal Link smoke (OPTIONAL)         | 1  |

**Sum (mandatory): 22 + 40 + 40 + 18 + 10 + 8 = 138 cells.**
**Sum (mandatory + optional): 138 + 1 = 139 cells.**

> **Walk outcome (Plan 08-03 closure):** Across the 138 mandatory cells: 130 PASS (Matrix 1: 22 + Matrix 2a: 32 walkable + 8 N/A diagonal = 40 cells covered with 32 PASS / 8 N/A + Matrix 2b: 40 + Matrix 3 listing actions: 18 + Matrix 3 strip cross-cutting: 10 + Matrix 4: 8). The 8 pre-existing N/A cells are the Matrix 2a same-tab diagonals (S1→T1, S2→T2, S3→T4 [Chat], S4→T5 [Profile]) on each device — no-op taps, not transitions. The 1 optional Matrix 5 UL cell is `— N/A (optional, not walked)`. **Per-device PASS counts: iOS 68 / Android 68 = 136 walked PASS** (the file's per-device subtotal counts each Matrix 1 cell once per device, each strip cross-cutting cell once per device, etc.; the cross-device sum of walked cells is 136, with 8 + 1 = 9 N/A remaining). Zero FAIL on either device. APPROVED.

---

## FAIL-routing template

If any FAIL cells surface, copy this block per FAIL into the user reply to the planner:

```
- Cell: <e.g., 1.6 / 2a iOS S5→T1 / 3.9 / 4.2 / 5.1>
- Device: <iOS iPhone 15 Pro Max / Android Moto G XT2513V>
- OS build: <e.g., iOS 26.4 / Android 16>
- Account context: <admin / non-admin / N/A>
- Expected: <copy from cell Notes column>
- Actual: <describe what actually happened>
- Reproducibility: <always / intermittent — N of M attempts>
- Suggested category: <Rule 1 bug / Rule 2 missing-critical / Rule 3 blocker / Rule 4 architectural / accepted-risk-candidate>
```

**Not used on this walk** — zero FAILs surfaced; D-08 bug-fix loop not triggered.

---

## Phase-Exit Regression Bundle

The automated regression bundle (CI gates `check-role-grep.sh` / `check-land-removed.sh` / `check-i18n-parity.sh`, tsc baseline, jest test counts, traceability) is recorded in **`08-VERIFICATION.md`** by Plan 08-03 / 08-04. This document covers manual physical-device cells only.

**Phase-3/4 CI gate exit codes at Plan 08-03 close (re-run on the close-out tree, no source diffs in this plan):**

| # | Script                            | Phase invariant                  | Exit | Result |
| - | --------------------------------- | -------------------------------- | ---- | ------ |
| 1 | `./scripts/check-role-grep.sh`    | Phase 3 D-14 4-part role grep    | 0    | PASS   |
| 2 | `./scripts/check-land-removed.sh` | Phase 4 FORM-01 Land removal     | 0    | PASS   |
| 3 | `./scripts/check-i18n-parity.sh`  | Phase 4 FORM-09 i18n parity      | 0    | PASS   |

---

*Phase: 08-release-and-store-submission*
*Plan: 01 of 5 (Wave 0 — pre-archive verification gate + QA scaffold)*
*Created: 2026-04-28*
*Walked: 2026-04-28 (Plan 08-03 close-out — APPROVED)*
*Status: walked (Plan 08-03 advanced from `scaffold`; Plan 08-04 verifier records final disposition)*
