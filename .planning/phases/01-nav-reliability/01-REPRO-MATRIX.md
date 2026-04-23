# Phase 1: Bottom-Nav Reproduction Matrix

**Baseline captured:** TBD (fill at Wave 0.5 commit time), commit TBD (SHA of Wave 0.5 baseline commit)
**Platforms:** iOS iPhone 15 Pro Max, iOS 26.4 — Android Moto G (XT2513V), Android 16
**Test listing with ≥1 Matterport tour:** MongoDB `_id` `6987ab8b698816d4875ec37a` (confirmed by human)

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

✅ PASS · ❌ FAIL · — N/A · ? FLAKY · ⬜ pending (not yet run)

## Baseline (pre-fix)

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
