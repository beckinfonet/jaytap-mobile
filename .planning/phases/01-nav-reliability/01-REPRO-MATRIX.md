# Phase 1: Bottom-Nav Reproduction Matrix

**Baseline status:** ⊘ DEFERRED — not captured (accepted risk, user decision 2026-04-22)
**Reference pre-fix HEAD:** `0c04227` (commit that marks Plan 01-01 complete; any subsequent Wave-1 code commits are "post-fix" relative to this SHA)
**Platforms:** iOS iPhone 15 Pro Max, iOS 26.4 — Android Moto G (XT2513V), Android 16
**Test listing with ≥1 Matterport tour:** MongoDB `_id` `6987ab8b698816d4875ec37a` (confirmed by human)

> **⊘ Baseline deferred — branch taken: RESEARCH §9 A6 / §10 Q2 (zero-FAIL branch) upfront.**
>
> Per user decision 2026-04-22, the full 45-cell × 2-platform device matrix was not executed due to time constraints. Plan 03 still lands the pointerEvents + OVERLAY_FLAGS prophylactic code fix. Plan 04's gate semantics change from "FAILs reduced to 0" to "no regression introduced + primary trap sequence visibly fixed on both devices" — the canonical trap from RESEARCH §2.1 (Home → PropertyDetails → back → tap Profile) becomes the minimum evidence bar.
>
> **NAV-03 ordering preserved:** the baseline commit SHA (this document at `0c04227` reference HEAD) still predates any App.tsx touch-handling edit from Plan 03. The NAV-03 satisfying-artifact is now "documented baseline decision + reference SHA" rather than "filled 45-cell matrix."
>
> **D-04 trigger likelihood:** higher than with a full baseline. Because we lack measurable FAIL counts, any post-fix ambiguity (e.g., intermittent trap, unclear whether "fixed" or "never reproduced on these devices") routes to D-04 pause-and-reassess with the user.
>
> **Recourse:** if Plan 04 device re-run reveals the trap does reproduce on these specific devices, the zero-FAIL branch is exited and a focused Post-Wave-1 FAIL→PASS table replaces the missing baseline as evidence.

## Starting states (rows)

| ID | State | How to reach |
|----|-------|--------------|
| S1 | Home tab | Cold-start → Home |
| S2 | Favorites tab | Home → tap Favorites in BottomNavigator |
| S3 | Chat tab | Home → tap Chat |
| S4 | Profile tab | Home → tap Profile |
| S5 | Appointments screen | Profile → Appointments |
| S6 | PropertyDetails overlay open (selectedProperty ≠ null, zIndex:2) | Home → tap property card |
| S7 | CreateListing overlay open (full-screen zIndex:3) | Profile → Create Listing |
| S8 | RenterListings overlay open (full-screen zIndex:3) | Profile → View My Listings |
| S9 | Tour3D active (early-return, activeTourUrl ≠ null) | PropertyDetails → Open Tours → single tour |

## Target tabs (columns)

| T1 Home | T2 Favorites | T3 Add (opens CreateListing) | T4 Chat | T5 Profile |

## Cell markers

✅ PASS · ❌ FAIL · — N/A · ? FLAKY · ⬜ pending (not yet run) · ⊘ DEFERRED (intentionally not captured this phase — see header note)

## Baseline (pre-fix)

> All `⬜` cells in the iOS and Android tables below are interpreted as `⊘ DEFERRED` for this phase per the baseline-deferred decision recorded at the top of this document. They may be retroactively filled if Plan 04's device re-run triggers D-04 "pause and reassess." The tables are left structurally intact so a later run can slot measurements directly into the existing grid.

### iOS

| From \ To | T1 Home | T2 Favorites | T3 Add | T4 Chat | T5 Profile |
|-----------|---------|--------------|--------|---------|------------|
| S1 Home | — N/A | ⬜ | ⬜ | ⬜ | ⬜ |
| S2 Favorites | ⬜ | — N/A | ⬜ | ⬜ | ⬜ |
| S3 Chat | ⬜ | ⬜ | ⬜ | — N/A | ⬜ |
| S4 Profile | ⬜ | ⬜ | ⬜ | ⬜ | — N/A |
| S5 Appointments | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| S6 PropertyDetails | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| S7 CreateListing | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| S8 RenterListings | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| S9 Tour3D | ⬜ | ⬜ | — N/A | ⬜ | ⬜ |

### Android

| From \ To | T1 Home | T2 Favorites | T3 Add | T4 Chat | T5 Profile |
|-----------|---------|--------------|--------|---------|------------|
| S1 Home | — N/A | ⬜ | ⬜ | ⬜ | ⬜ |
| S2 Favorites | ⬜ | — N/A | ⬜ | ⬜ | ⬜ |
| S3 Chat | ⬜ | ⬜ | ⬜ | — N/A | ⬜ |
| S4 Profile | ⬜ | ⬜ | ⬜ | ⬜ | — N/A |
| S5 Appointments | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| S6 PropertyDetails | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| S7 CreateListing | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| S8 RenterListings | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| S9 Tour3D | ⬜ | ⬜ | — N/A | ⬜ | ⬜ |

### High-risk transitions (HR-1…HR-6) — video-evidenced

- HR-1 iOS (S6 PropertyDetails → T1..T5): ⬜ — video: videos/ios-S6-T{n}.mp4 — notes: TBD
- HR-1 Android (S6 PropertyDetails → T1..T5): ⬜ — video: videos/android-S6-T{n}.mp4 — notes: TBD
- HR-2 iOS (S7 CreateListing → T1..T5): ⬜ — video: videos/ios-S7-T{n}.mp4 — notes: TBD
- HR-2 Android (S7 CreateListing → T1..T5): ⬜ — video: videos/android-S7-T{n}.mp4 — notes: TBD
- HR-3 iOS (S8 RenterListings → T1..T5): ⬜ — video: videos/ios-S8-T{n}.mp4 — notes: TBD
- HR-3 Android (S8 RenterListings → T1..T5): ⬜ — video: videos/android-S8-T{n}.mp4 — notes: TBD
- HR-4 iOS (S9 Tour3D → back → tab): ⬜ — video: videos/ios-S9-back-T{n}.mp4 — notes: TBD
- HR-4 Android (S9 Tour3D → back → tab): ⬜ — video: videos/android-S9-back-T{n}.mp4 — notes: TBD
- HR-5 iOS (Nested S6 → Tour3D → back → S6 → back → tab): ⬜ — video: videos/ios-HR5-T{n}.mp4 — notes: TBD
- HR-5 Android (Nested S6 → Tour3D → back → S6 → back → tab): ⬜ — video: videos/android-HR5-T{n}.mp4 — notes: TBD
- HR-6 iOS (Post Android-back state → tab): — N/A (iOS has no hardware back)
- HR-6 Android (Post hardware-back state → tab): ⬜ — video: videos/android-HR6-T{n}.mp4 — notes: TBD

## Pass/fail predicate (from RESEARCH §3.6)

**PASS** for (Sn, Tm): within 1 s of tapping Tm, the app visually shows Tm's content (or overlay opens for T3); BottomNavigator remains responsive to a subsequent tap.

**FAIL**: Tm's content does NOT appear within 1 s; OR tap registers (ripple) but no state change; OR tap appears ignored (no ripple, no state change); OR new tab shows but old overlay content is still visible beneath / receives taps.

## Post-Wave-1 (pointerEvents + OVERLAY_FLAGS)

_Filled after Plan 03 lands and Plan 04 runs. Same 9×5 table shape × 2 platforms, plus HR-1..HR-6 re-run._

## Post-Wave-N (if C2/C3/C4 escalation reached)

_Filled only if Wave 2 gate fails and escalation plans run. Otherwise labeled "Not reached — Wave 1 achieved 0% repro"._
