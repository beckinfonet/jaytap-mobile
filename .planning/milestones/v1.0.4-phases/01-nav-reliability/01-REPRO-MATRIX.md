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

| ID  | State                                                            | How to reach                               |
| --- | ---------------------------------------------------------------- | ------------------------------------------ |
| S1  | Home tab                                                         | Cold-start → Home                          |
| S2  | Favorites tab                                                    | Home → tap Favorites in BottomNavigator    |
| S3  | Chat tab                                                         | Home → tap Chat                            |
| S4  | Profile tab                                                      | Home → tap Profile                         |
| S5  | Appointments screen                                              | Profile → Appointments                     |
| S6  | PropertyDetails overlay open (selectedProperty ≠ null, zIndex:2) | Home → tap property card                   |
| S7  | CreateListing overlay open (full-screen zIndex:3)                | Profile → Create Listing                   |
| S8  | RenterListings overlay open (full-screen zIndex:3)               | Profile → View My Listings                 |
| S9  | Tour3D active (early-return, activeTourUrl ≠ null)               | PropertyDetails → Open Tours → single tour |

## Target tabs (columns)

| T1 Home | T2 Favorites | T3 Add (opens CreateListing) | T4 Chat | T5 Profile |

## Cell markers

✅ PASS · ❌ FAIL · — N/A · ? FLAKY · ⬜ pending (not yet run) · ⊘ DEFERRED (intentionally not captured this phase — see header note)

## Baseline (pre-fix) — captured as Post-Wave-1 against Plan 03 build

> **Audit note (2026-04-22):** The cells filled in the iOS and Android tables below were captured during the Plan 04 device run on the Plan 03 build (reference SHA `cd2a52d`), not against the pre-fix baseline SHA `0c04227`. The formal pre-fix baseline remains ⊘ DEFERRED per Plan 02's A6 branch decision (see document header). What's recorded here is Post-Wave-1 data — left in the "Baseline" section only because that's where the captures landed during the device pass. Treat these tables as the Post-Wave-1 capture for downstream analysis; the Post-Wave-1 subsection below points back to them.
>
> The data captured is still load-bearing: the S5 Appointments FAIL pattern surfaced here drove the D-04 reassessment and identified the actual root cause (see 01-CONTEXT.md D-11..D-15).

### iOS

| From \ To          | T1 Home | T2 Favorites | T3 Add | T4 Chat | T5 Profile |
| ------------------ | ------- | ------------ | ------ | ------- | ---------- |
| S1 Home            | — N/A   | ✅           | ✅     | ✅      | ✅         |
| S2 Favorites       | ✅      | — N/A        | ✅     | ✅      | ✅         |
| S3 Chat            | ✅      | ✅           | ✅     | — N/A   | ✅         |
| S4 Profile         | ✅      | ✅           | ✅     | ✅      | — N/A      |
| S5 Appointments    | ❌      | ✅           | ✅     | ❌      | ❌         |
| S6 PropertyDetails | N/A     | N/A         | N/A    | N/A     | N/A       |
| S7 CreateListing   | N/A     | N/A         | N/A    | N/A     | N/A       |
| S8 RenterListings  | N/A     | N/A         | N/A    | N/A     | N/A       |
| S9 Tour3D          | N/A     | N/A         | N/A    | N/A     | N/A       |

### Android

| From \ To          | T1 Home | T2 Favorites | T3 Add | T4 Chat | T5 Profile |
| ------------------ | ------- | ------------ | ------ | ------- | ---------- |
| S1 Home            | — N/A   | ✅           | ✅     | ✅      | ✅         |
| S2 Favorites       | ✅      | — N/A        | ✅     | ✅      | ✅         |
| S3 Chat            | ✅      | ✅           | ✅     | — N/A   | ✅         |
| S4 Profile         | ✅      | ✅           | ✅     | ✅      | — N/A      |
| S5 Appointments    | ❌      | ✅           | ✅     | ❌      | ❌         |
| S6 PropertyDetails | N/A     | N/A         | N/A    | N/A     | N/A       |
| S7 CreateListing   | N/A     | N/A         | N/A    | N/A     | N/A       |
| S8 RenterListings  | N/A     | N/A         | N/A    | N/A     | N/A       |
| S9 Tour3D          | N/A     | N/A         | N/A    | N/A     | N/A       |


### High-risk transitions (HR-1…HR-6) — video-evidenced

> **⊘ DEFERRED per D-15 (amended 2026-04-22).** Video captures dropped after the D-04 reassessment identified the root cause as a deterministic code defect (incomplete sub-screen state clears in the tab handler — see 01-CONTEXT.md D-13), not a timing-sensitive touch-capture symptom. The HR transition set below is retained as documentation of the original test surface; if the fix regresses in the field, video capture can be re-enabled per this original protocol.

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

Captured against Plan 03 build (reference SHA `cd2a52d`). See tables under `## Baseline (pre-fix)` above — those are the Post-Wave-1 tables (audit note at the top of that section explains the label slip).

**iOS Post-Wave-1 summary:** 14 PASS / 3 FAIL / 23 N/A / 0 FLAKY — run on 2026-04-22.
**Android Post-Wave-1 summary:** 14 PASS / 3 FAIL / 23 N/A / 0 FLAKY — run on 2026-04-22.

**C1 predicate evaluation (iOS):** RULED-OUT. The C1 hypothesis predicted uniform "tap-ignored" from non-overlay states. Actual pattern was PASS from S1–S4 and FAIL localized to S5 Appointments with S5 → Favorites PASSing — inconsistent with a stale `hideMainStackUnderOverlay` flag. [NAV] logs not captured (debugger attach issues); pattern-based ruling only.

**C1 predicate evaluation (Android):** RULED-OUT. Same pattern and reasoning as iOS.

**Baseline→Post-Wave-1 delta:** Baseline formally deferred (Plan 02 A6 branch). Delta is against "no measured baseline" — the Post-Wave-1 data itself surfaced the localized S5 Appointments FAIL pattern and drove D-04 reassessment.

**HR-6 Android (post-hardware-back tab tap):** not re-tested. BackHandler useEffect untouched by Plan 03 and by the tab-handler fix (`bf33c41`), so HR-6 behavior is unchanged from pre-phase state. Flagged as out-of-scope for this phase's evidence bar per D-15.

## Post-Reassessment (commit `bf33c41` — tab-handler fix)

Focused device verify after D-04 reassessment landed the new root-cause fix. Gate: "every tab tap from every Profile sub-screen must promote the target tab on both platforms" (CONTEXT D-14). Cell-by-cell 45×2 re-run was not repeated — the reassessed root cause is a deterministic code defect whose fix either lands or doesn't; the user's focused device verify targets the failing cells from Post-Wave-1 plus the Account Settings path that the matrix had not originally tested.

**iOS + Android — Profile sub-screen tab navigation (2026-04-22, commit `bf33c41` installed):**

| From | To | Post-Wave-1 | Post-Reassessment |
|------|----|-------------|-------------------|
| Appointments | Home | ❌ FAIL | ✅ PASS |
| Appointments | Chat | ❌ FAIL | ✅ PASS |
| Appointments | Profile | ❌ FAIL | ✅ PASS |
| Appointments | Favorites | ✅ PASS | ✅ PASS (no regression) |
| Appointments | Add | ✅ PASS | ✅ PASS (no regression) |
| Account Settings | Home | not tested | ✅ PASS |
| Account Settings | Chat | not tested | ✅ PASS |

Broader navigation surface: "app is functional" reported by user on both devices after the bundled fix was installed. No regression observed on S1–S4 tab-to-tab transitions.

**Verification form:** human visual confirmation on iPhone 15 Pro Max / iOS 26.4 and Moto G XT2513V / Android 16. [NAV] diagnostic logs not captured (debugger failed to attach on this session); accepted per D-15 evidence relaxation — behavior itself is the signal of record for a deterministic code defect.

## Post-Wave-1 Go/No-Go Decision

**Decision:** C. PAUSE-AND-REASSESS per D-04 → NEW ROOT CAUSE IDENTIFIED → REASSESSMENT-PROCEED

Initial Post-Wave-1 matrix data triggered D-04: a partial success pattern (S5 Appointments row FAIL on both platforms while S1–S4 all PASSed on both platforms) is inconsistent with the C1 stale-overlay-flag model. Reassessment (see 01-CONTEXT.md D-11..D-15) identified a different root cause — the tab-change handler at `App.tsx:678–735` omitted `setIsAppointmentsOpen(false)` and `setIsAccountSettingsOpen(false)` in every branch, so the `show*` priority ladder at `App.tsx:360–389` blocked Home/Chat/Profile from promoting. Fix landed in commit `bf33c41`; Post-Reassessment device verify on both platforms confirmed navigation works from all tested Profile sub-screens.

**Evidence:**
- iOS delta: Post-Wave-1 S5 Appointments FAIL on 3 of 4 effective targets → Post-Reassessment all PASS.
- Android delta: Post-Wave-1 S5 Appointments FAIL on 3 of 4 effective targets → Post-Reassessment all PASS.
- HR-6 Android: not re-tested; BackHandler path untouched by `bf33c41`, so behavior preserved from pre-phase state. If a HR-6 regression surfaces in the field it is a separate bug from the one closed here.
- C1 predicate: RULED-OUT (D-12).
- Baseline delta: Baseline was formally deferred (Plan 02 A6 branch). Post-Wave-1 signal alone was sufficient to diagnose.
- D-04 check: triggered → reassessment completed → new root cause fixed → device re-verify passed.

**Next plan to run:** Plan 06 (strip + finalize) — ran inline in this same work session; diagnostic [NAV] logs removed in commit `c273a72`. Plan 05 (C2/C3/C4 escalation) SKIPPED entirely per D-15.

**Signed:** beckinfonet, 2026-04-22
