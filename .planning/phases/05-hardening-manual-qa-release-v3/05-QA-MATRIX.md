---
phase: 05-hardening-manual-qa-release-v3
plan: 05
type: verification-matrix
status: scaffolded
created: 2026-05-08T01:21:59Z
walked: pending
walked_against_sha: 531e279
backend_walked_against_sha: 5bf23fe
walk_disposition: BLOCKED-PENDING-WALKS
walker: beckprograms@gmail.com
devices:
  ios:
    model: iPhone 15 Pro Max
    os: iOS 26.x
    build: Fabric / Release
    binary: 3.0.0 build 28
  android:
    model: Moto G XT2513V
    os: Android 16
    build: Fabric / Release
    binary: 3.0.0 versionCode 31
accounts:
  admin: beckprograms@gmail.com
  moderator: "<existing M2 mod OR promoted at walk time via Phase 5 RoleManagementScreen>"
  owner_with_rejected: "<created at walk time via Phase 3 reject-flow OR existing>"
  plain_user: "<test account>"
requirements_addressed: [REL-03]
testing_bar: M3 manual physical-device QA per CLAUDE.md
walk_scope: ~60-cell M3 cross-cutting (Phases 1-4 deferred walks + REL-03 happy-path)
paired_gates_prerequisite_clear: true   # Phase 4 closed paired-gates per 05-STORE-HISTORY.md
matrix_count: 7
verdict_taxonomy:   # D-09 four-state — no other states permitted at walk-time
  - PASS
  - PARTIAL
  - DEFERRED-USER-APPROVED
  - FAIL
totals:
  total_cells: 60   # populate exact count after walk completes
  pass: 0           # populated at walk close
  partial: 0
  deferred_user_approved: 4   # the 4 race cells in Section 10 (M2 precedent)
  fail: 0
  na: 0
deferrals:
  race_cells:
    cells: ["M3-RACE-01", "M3-RACE-02", "M3-RACE-03", "M3-RACE-04"]
    rationale: "M4+ deferred per memory `phase06-m3-carry-forward.md` + M2 Phase 6 precedent (cells 1.7 + 2.4-2.6 + 5.6 + 5.3 mismatch path). Backend supertest covers the atomic invariants (MOD-15 findOneAndUpdate guard + ROLE-11 roleRevokedAt invariant + HF-04 socket handshake JWKS + HF-03 firebaseUid mismatch 403). Physical-device race coordination requires a coordinated-curl test rig (see Future Requirements in REQUIREMENTS.md). User explicitly signed off on M4+ deferral at M2 Phase 6 close."
    follow_up: "M4 backlog: build coordinated-curl test rig with token-capture mechanism."
partials: {}   # populate during walk if any cell surfaces a minor cosmetic issue (e.g., geocoder Network Error retry-needed per memory `geocoder-nominatim-hang-axios-network-error.md`)
---

# Phase 5 — M3 v3.0.0 QA Matrix

Authored by Plan 05-05 to walk every M3 surface on iPhone 15 Pro Max + Moto G XT2513V before
v3.0.0 ships. D-06 makes this the canonical doc — supersedes 4 prior `*-HUMAN-UAT.md` /
`*-VERIFICATION.md` files (those carry a one-line "rolled into 05-QA-MATRIX.md" header note).

Per D-07 walk-once-count-for-both: each device walk closes a prior-phase deferred entry AND a
REL-03 cell from the same evidence. The `satisfies:` column on each row makes this dual-coverage
auditable in a single grep.

**Status: SCAFFOLDED 2026-05-08; walks pending physical-device session.**

Walked v3.0.0 (built from RN client commit `531e279`, against backend deploy SHA `5bf23fe`)
on iPhone 15 Pro Max + Moto G XT2513V. Walk window: pending.

## Cell verdict legend (D-09 four-state)

- ✅ PASS — observed expected behavior on the listed device
- ❌ FAIL — regression observed; bug-fix loop opens
- ⚠ PARTIAL — main behavior PASS; minor cosmetic/UX issue noted (still ships; logged for M4 polish backlog)
- 🅓 DEFERRED-USER-APPROVED — formally deferred per M2 Phase 6 precedent; follow-up backlog item recorded
- — N/A — cell intentionally not applicable on this device (e.g., overlay-hides-tab-bar per memory `nav-overlay-hides-bottom-nav.md`)
- ☐ Pending — not yet walked

## Test Environment

| Field | Value |
|-------|-------|
| iOS device | iPhone 15 Pro Max / iOS 26.x / Fabric Release |
| Android device | Moto G XT2513V / Android 16 / Fabric Release |
| Walker | beckprograms@gmail.com |
| Walked against RN SHA | 531e279 |
| Walked against backend SHA | 5bf23fe |
| iOS build | 3.0.0 (28) |
| Android build | 3.0.0 versionCode 31 |
| Pre-flight verify-PASS | listings-m3 + landlord-uid-repair + locations-seed all green per 05-PREFLIGHT.md |

## Memory anchors

Per memory `nav-overlay-hides-bottom-nav.md`: ContextualListingFlow / MediaCurationScreen / PropertyDetails overlays hide the bottom tab bar by design. Cells that would require seeing the tab bar WHILE an overlay is still open are intentionally `— N/A`. DO NOT mark FAIL.

Per memory `geocoder-nominatim-hang-axios-network-error.md`: if Step 2 location triggers an axios "Network Error" during a Matrix 1 happy-path walk, retry once is the documented workaround (Nominatim hang). Mark the cell PARTIAL with the retry note in `partials:` frontmatter; do NOT FAIL.

Per memory `last-admin-lockout-semantics.md`: ADMIN-03 last-admin lockout only fires on Promise.all race or count==1 self-demote. The Matrix 4 ROLE-11 cells walk a NON-last-admin demote; do not expect lockout.

Per memory `gsd-verifier-misses-regressions.md`: paired-gates prerequisite confirmed clear by Phase 4 close (per 05-STORE-HISTORY.md `phase_4_paired_gates_prerequisite.status: clear`).

---

## Matrix 1 — Happy-path 6-step contextual flow (REL-03)

Walks: 15 combinations × 2 devices = 30 cells. Each cell = one device × one (deal_type, property_type) tuple. Walker signs into a non-mod owner account, taps "Create listing", walks all 6 steps to submission, confirms status flips to `pending` in OwnerListings.

| Cell | Deal type | Property type | Device | Verdict | Evidence | satisfies |
|------|-----------|---------------|--------|---------|----------|-----------|
| 1.1  | sale | apartment | iOS | ☐ Pending | | satisfies: REL-03 cell apartment+sale |
| 1.2  | sale | apartment | Android | ☐ Pending | | satisfies: REL-03 cell apartment+sale |
| 1.3  | rent_long | apartment | iOS | ☐ Pending | | satisfies: Phase 2 W1 + REL-03 cell apartment+rent_long |
| 1.4  | rent_long | apartment | Android | ☐ Pending | | satisfies: Phase 2 W1 + REL-03 cell apartment+rent_long |
| 1.5  | rent_daily | apartment | iOS | ☐ Pending | | satisfies: REL-03 cell apartment+rent_daily |
| 1.6  | rent_daily | apartment | Android | ☐ Pending | | satisfies: REL-03 cell apartment+rent_daily |
| 1.7  | sale | house | iOS | ☐ Pending | | satisfies: REL-03 cell house+sale |
| 1.8  | sale | house | Android | ☐ Pending | | satisfies: REL-03 cell house+sale |
| 1.9  | rent_long | house | iOS | ☐ Pending | | satisfies: REL-03 cell house+rent_long |
| 1.10 | rent_long | house | Android | ☐ Pending | | satisfies: REL-03 cell house+rent_long |
| 1.11 | sale | office | iOS | ☐ Pending | | satisfies: REL-03 cell office+sale + Phase 2 W6 propertyType reflow |
| 1.12 | sale | office | Android | ☐ Pending | | satisfies: REL-03 cell office+sale + Phase 2 W6 |
| 1.13 | rent_long | office | iOS | ☐ Pending | | satisfies: REL-03 cell office+rent_long |
| 1.14 | rent_long | office | Android | ☐ Pending | | satisfies: REL-03 cell office+rent_long |
| 1.15 | sale | commercial | iOS | ☐ Pending | | satisfies: REL-03 cell commercial+sale |
| 1.16 | sale | commercial | Android | ☐ Pending | | satisfies: REL-03 cell commercial+sale |
| 1.17 | rent_long | commercial | iOS | ☐ Pending | | satisfies: REL-03 cell commercial+rent_long (FLOW-08 conditional sub-fields: rooms + bathroom + kitchen render) |
| 1.18 | rent_long | commercial | Android | ☐ Pending | | satisfies: REL-03 cell commercial+rent_long |
| 1.19 | rent_daily | hotel | iOS | ☐ Pending | | satisfies: Phase 2 W4 + REL-03 cell hotel+rent_daily (D-19 thin Step 6) |
| 1.20 | rent_daily | hotel | Android | ☐ Pending | | satisfies: Phase 2 W4 + REL-03 cell hotel+rent_daily |
| 1.21 | rent_long | hotel | iOS | ☐ Pending | | satisfies: REL-03 cell hotel+rent_long |
| 1.22 | rent_long | hotel | Android | ☐ Pending | | satisfies: REL-03 cell hotel+rent_long |
| 1.23 | sale | hotel | iOS | ☐ Pending | | satisfies: REL-03 cell hotel+sale |
| 1.24 | sale | hotel | Android | ☐ Pending | | satisfies: REL-03 cell hotel+sale |
| 1.25 | rent_daily | apartment (cross-device EN+RU re-walk; Phase 2 W1) | iOS | ☐ Pending | | satisfies: Phase 2 W1 cross-device |
| 1.26 | rent_daily | apartment | Android | ☐ Pending | | satisfies: Phase 2 W1 cross-device |
| 1.27 | sale | hotel (Bishkek districts validator at Step 2) | iOS | ☐ Pending | | satisfies: Phase 2 W5 Locations + Bishkek districts |
| 1.28 | sale | hotel (Bishkek districts validator) | Android | ☐ Pending | | satisfies: Phase 2 W5 Locations + Bishkek districts |
| 1.29 | rent_long | apartment (FLOW-06 toggle visible) | iOS | ☐ Pending | | satisfies: REL-03 exact-address-toggle (visible for non-hotel/hostel) |
| 1.30 | rent_daily | hotel (FLOW-06 toggle hidden) | Android | ☐ Pending | | satisfies: REL-03 exact-address-toggle hidden for hotel/hostel + Phase 2 W4 |

**Walk pattern for each cell:**

1. Sign in as non-mod owner.
2. Tap "Create listing" — `<ContextualListingFlow>` opens at Step 1.
3. Step 1: select Deal Type chip + Property Type chip (per cell row).
4. Step 2: location autocomplete + map pin + (where applicable) exact-address toggle visible/hidden per FLOW-06.
5. Step 3: area + price + currency chip + conditional sub-fields per FLOW-08 (apartment/house → rooms only; office/commercial → rooms + bathroom + kitchen; hotel/hostel → hotelRooms + hotelClass).
6. Step 4: condition + furnished.
7. Step 5: title + description.
8. Step 6: deal-conditions matrix per FLOW-11 (Sale → bargain + optional deposit; rent_long → bargain + deposit + prepaymentMonths preset 0/1/2/custom + minTerm; rent_daily → optional deposit only).
9. Submit.
10. Verify status flips to `pending` in OwnerListings → Pending tab.

---

## Matrix 2 — Edit mode (FLOW-13 + FLOW-15 + Phase 2 W2 + W3)

Walks: 6 representative cells × 2 devices = 12 cells. Phase 2 W7-W9 deferred set; modify a pending listing through edit-owner OR edit-mod paths and confirm submission flips status appropriately (M2 MOD-14 semantics preserved per FLOW-15).

| Cell | Mode | Property type | Device | Verdict | Evidence | satisfies |
|------|------|---------------|--------|---------|----------|-----------|
| 2.1  | edit-owner | apartment | iOS | ☐ Pending | | satisfies: Phase 2 W2 + REL-03 edit-owner cell |
| 2.2  | edit-owner | apartment | Android | ☐ Pending | | satisfies: Phase 2 W2 + REL-03 |
| 2.3  | edit-owner | hotel | iOS | ☐ Pending | | satisfies: Phase 2 W2 cross-property |
| 2.4  | edit-owner | hotel | Android | ☐ Pending | | satisfies: Phase 2 W2 cross-property |
| 2.5  | edit-mod | apartment (mod-context banner top of Step 1) | iOS | ☐ Pending | | satisfies: Phase 2 W3 + REL-03 edit-mod cell + FLOW-15 |
| 2.6  | edit-mod | apartment | Android | ☐ Pending | | satisfies: Phase 2 W3 + REL-03 |
| 2.7  | edit-mod | commercial (FLOW-08 sub-fields preserved on edit) | iOS | ☐ Pending | | satisfies: Phase 2 W3 cross-property |
| 2.8  | edit-mod | commercial | Android | ☐ Pending | | satisfies: Phase 2 W3 cross-property |
| 2.9  | edit-mod-flip-to-live (rejected → edit-on-behalf submit → live) | apartment | iOS | ☐ Pending | | satisfies: M2 MOD-14 semantic preserved + FLOW-13 |
| 2.10 | edit-mod-flip-to-live | apartment | Android | ☐ Pending | | satisfies: M2 MOD-14 semantic preserved + FLOW-13 |
| 2.11 | edit-owner re-submit rejected listing → status pending; banner auto-dismisses | apartment | iOS | ☐ Pending | | satisfies: RejectionBanner re-submit path |
| 2.12 | edit-owner re-submit rejected | apartment | Android | ☐ Pending | | satisfies: RejectionBanner re-submit path |

---

## Matrix 3 — Mod media curation (Phase 3 deferred 6-walk set + REL-03)

Walks: 4 walks × 2 devices = 8 cells. Sign in as moderator; navigate to ModerationQueueScreen → "needs media" filter chip → tap a row with photoCount === 0 → MediaCurationScreen overlay opens → upload + manage media + return to queue.

| Cell | Walk | Device | Verdict | Evidence | satisfies |
|------|------|--------|---------|----------|-----------|
| 3.1  | filter-needs-media chip predicate (chip filters to status: pending AND media.photos.length === 0; tourUrl + videos do NOT count per Open Question #1) | iOS | ☐ Pending | | satisfies: Phase 3 deferred walk filter-needs-media + has-media-filter (Open Question #1 negative) |
| 3.2  | filter-needs-media chip predicate | Android | ☐ Pending | | satisfies: Phase 3 deferred walk filter-needs-media + has-media-filter |
| 3.3  | MEDIA_REQUIRED 400 UX block (mod tries to Approve a listing with photoCount=0 from MediaCurationScreen + PropertyDetailsScreen + ModerationQueueScreen row-Approve — all 3 surfaces should show disabled-Approve OR clear toast on attempted POST per D-12) | iOS | ☐ Pending | | satisfies: Phase 3 deferred walk MEDIA_REQUIRED 400 UX (D-12 3-surface gate) |
| 3.4  | MEDIA_REQUIRED 400 UX block | Android | ☐ Pending | | satisfies: Phase 3 deferred walk MEDIA_REQUIRED 400 UX |
| 3.5  | EN+RU parity for media curation strings (32 keys per locale per Phase 3 close — switch app locale to RU mid-MediaCurationScreen, confirm strings re-render in Cyrillic) + cap-overflow toast (D-05 client-side cap; mod attempts to upload more than the cap, sees translated truncation toast) | iOS | ☐ Pending | | satisfies: Phase 3 deferred walks EN+RU parity + cap-overflow toast |
| 3.6  | EN+RU + cap-overflow | Android | ☐ Pending | | satisfies: Phase 3 deferred walks EN+RU parity + cap-overflow toast |
| 3.7  | per-asset DELETE round-trip (mod uploads 3 photos; deletes 1 via swipe/long-press; verifies remaining 2 persist via re-fetch + DELETE /api/moderation/listings/:id/media?url=...&kind=photo round-trip) | iOS | ☐ Pending | | satisfies: Phase 3 deferred walk per-asset DELETE round-trip |
| 3.8  | per-asset DELETE round-trip | Android | ☐ Pending | | satisfies: Phase 3 deferred walk per-asset DELETE round-trip |

---

## Matrix 4 — ROLE-11 demote-mid-action recovery (CARRY-01)

Walks: 2 paired-device cells. Device A (admin, iOS) demotes Device B (moderator) while B has a mod-action popup OPEN. CARRY-01 invariant: B's popup loading state resets, popup closes, RoleRefreshBanner surfaces within ~1s.

Per memory `last-admin-lockout-semantics.md`: ADMIN-03 lockout will NOT fire here — these walks are non-last-admin demote flows. Lockout-not-firing is the EXPECTED behavior.

| Cell | Scenario | Device A | Device B (demoted) | Verdict | Evidence | satisfies |
|------|----------|----------|---------------------|---------|----------|-----------|
| 4.1  | A demotes B; B has Approve popup open in ModerationQueueScreen → on B: popup closes; RoleRefreshBanner surfaces ≤1s; tap-to-reload works without app restart | iOS (admin) | iPhone 15 Pro Max (mod) | ☐ Pending | | satisfies: Phase 4 CARRY-01 deferred banner-latency on iPhone + REL-03 |
| 4.2  | A demotes B; B has Reject popup open in PropertyDetailsScreen → same recovery semantics | iOS (admin) | Moto G XT2513V (mod) | ☐ Pending | | satisfies: Phase 4 CARRY-01 cross-device coverage |

---

## Matrix 5 — Phase 4.5 uid-mismatch repair (CARRY-02 SC#3)

Walks: 1 cell (live Atlas walk). The supertest already proves the invariant in-memory; this cell walks the device-to-Atlas round-trip end-to-end after the Plan 05-01 uid-repair migration has run.

Per memory `phase45-landlord-application-uid-mismatch-bug.md`: diagnostic uids saved from prior session; the repair-migration has run in production (per 05-PREFLIGHT.md `landlord_uid_repair_migration_verify_pass_at: 2026-05-08T00:00:00Z`); this cell is the live device walk that proves the fix is durable in production.

| Cell | Scenario | Device | Verdict | Evidence | satisfies |
|------|----------|--------|---------|----------|-----------|
| 5.1  | Sign up as a new Firebase user → submit landlord application via the in-app flow → query Atlas (mongosh / temp admin debug endpoint / user-relay): the LandlordApplication doc's `uid` MUST equal `firebase.user.localId` from the device's auth state | iPhone 15 Pro Max | ☐ Pending | | satisfies: Phase 4 CARRY-02 SC#3 + REL-03 |

---

## Matrix 6 — EN+RU parity (M3-new surfaces)

Walks: 4 cells × 2 devices = 8 cells. Switch app locale to RU mid-session, verify all M3-new strings render in Cyrillic.

| Cell | Screen | Device RU | Verdict | Evidence | satisfies |
|------|--------|-----------|---------|----------|-----------|
| 6.1  | ContextualListingFlow steps 1-6 (all step headers + chip labels + validation toasts) | iOS | ☐ Pending | | satisfies: FLOW-16 + REL-03 EN+RU parity |
| 6.2  | ContextualListingFlow | Android | ☐ Pending | | satisfies: FLOW-16 + REL-03 EN+RU parity |
| 6.3  | MediaCurationScreen + NeedsMediaBanner + filter chip row labels (Phase 3 32-keys-per-locale) | iOS | ☐ Pending | | satisfies: MEDIA-09 + REL-03 EN+RU parity |
| 6.4  | MediaCurationScreen | Android | ☐ Pending | | satisfies: MEDIA-09 + REL-03 EN+RU parity |
| 6.5  | RoleRefreshBanner copy on demote (CARRY-01) | iOS | ☐ Pending | | satisfies: REL-03 RU parity for ROLE-11 surface |
| 6.6  | RoleRefreshBanner | Android | ☐ Pending | | satisfies: REL-03 RU parity for ROLE-11 surface |
| 6.7  | RejectionBanner copy in RU (M2 carry; verify Phase 4.5 paths render correctly post-migration) | iOS | ☐ Pending | | satisfies: M2 carry + REL-03 EN+RU parity |
| 6.8  | RejectionBanner | Android | ☐ Pending | | satisfies: M2 carry + REL-03 EN+RU parity |

---

## Matrix 7 — Dark/light parity (M3-new surfaces only)

Walks: 4 cells × 2 devices = 8 cells. Toggle device-level dark mode; verify M3-new surfaces have theme parity.

Per CLAUDE.md "use `useTheme()` tokens — no hardcoded colors; dark/light parity required". Phase 3 already used theme tokens (W6 zero-hex audit per 03-06-SUMMARY); this matrix is the empirical confirmation.

| Cell | Surface | Device dark | Verdict | Evidence | satisfies |
|------|---------|-------------|---------|----------|-----------|
| 7.1  | ContextualListingFlow steps 1-6 (chips + map pin + currency chip + Step 6 prepaymentMonths preset) | iOS dark | ☐ Pending | | satisfies: REL-03 dark parity for 6-step flow |
| 7.2  | ContextualListingFlow | Android dark | ☐ Pending | | satisfies: REL-03 dark parity for 6-step flow |
| 7.3  | MediaCurationScreen photo grid + 2-button action footer + cap-overflow toast (W6 zero-hex audit per Phase 3 03-05/03-06) | iOS dark | ☐ Pending | | satisfies: REL-03 dark parity for media curation |
| 7.4  | MediaCurationScreen | Android dark | ☐ Pending | | satisfies: REL-03 dark parity for media curation |
| 7.5  | NeedsMediaBanner + ModerationQueueScreen filter chip row | iOS dark | ☐ Pending | | satisfies: REL-03 dark parity for needs-media banner + filter chips |
| 7.6  | NeedsMediaBanner + filter row | Android dark | ☐ Pending | | satisfies: REL-03 dark parity for needs-media banner + filter chips |
| 7.7  | RoleRefreshBanner contrast on demote | iOS dark | ☐ Pending | | satisfies: REL-03 dark parity for ROLE-11 surface |
| 7.8  | RoleRefreshBanner | Android dark | ☐ Pending | | satisfies: REL-03 dark parity for ROLE-11 surface |

---

## DEFERRED-USER-APPROVED — race cells (M4+)

Per memory `phase06-m3-carry-forward.md` + M2 Phase 6 precedent (cells 1.7 + 2.4-2.6 + 5.6 + 5.3 mismatch path), the following race-condition cells stay M4+ deferred. The user explicitly signed off on this deferral at M2 Phase 6 close; the deferral carries forward to M3 unchanged.

| Cell ID | Description | Reason for deferral | Backend coverage |
|---------|-------------|---------------------|------------------|
| M3-RACE-01 | Concurrent demote race (two admins simultaneously demote target moderator) | Physical-device race coordination requires coordinated-curl test rig | Backend supertest covers ROLE-11 atomic invariant |
| M3-RACE-02 | Two-device mod-action race (Device A approves / Device B rejects same listing simultaneously) | Same — race rig needed | Backend supertest covers MOD-15 findOneAndUpdate guard |
| M3-RACE-03 | Socket attacker (curl + websocat scripted; HF-04 verification) | Tooling-driven; out of REL-03 device-walk scope | Backend supertest covers HF-04 socket handshake JWKS |
| M3-RACE-04 | HF-03 mismatch path attacker token | Tooling-driven; out of REL-03 device-walk scope | Backend supertest covers HF-03 firebaseUid mismatch 403 |

These cells are NOT walked in Phase 5. They re-open in M4 when the coordinated-curl race rig is built (REQUIREMENTS.md Future Requirements).

---

## Sign-off

| Field | Value |
|-------|-------|
| Walker | beckprograms@gmail.com |
| Walk start | pending |
| Walk end | pending |
| Total cells walked | pending |
| PASS | pending |
| PARTIAL | pending (with brief rationale per cell) |
| DEFERRED-USER-APPROVED | 4 (race cells, M4+) |
| FAIL | pending (MUST be 0 for APPROVED disposition) |
| N/A | pending (with brief rationale per N/A cell) |
| Disposition | BLOCKED-PENDING-WALKS (flips to APPROVED iff FAIL count = 0; flips to BLOCKED-BY-FAIL otherwise) |

Bug-fix loop (per M1 D-08): If any cell FAILs, the executor opens a sub-task to fix the regression in-phase, re-walks the affected cell on both devices, then resumes. APPROVED disposition requires zero blocking FAILs. PARTIAL cells ship (logged for M4 polish backlog).

## Re-open conditions

- If a backend redeploy lands during the walk, the matrix's `backend_walked_against_sha` is stale; re-walk affected cells against the new SHA.
- If Plan 05-03's atomic bump is amended (force-push), the matrix's `walked_against_sha` is stale; re-walk all cells.
- If the M4 race-cell rig is built, the DEFERRED-USER-APPROVED cells re-open and walk in that future phase.

## Cross-references

- M2 Phase 6 precedent: `.planning/milestones/v2.0-phases/06-hardening-manual-physical-device-qa-release/06-QA-MATRIX.md`
- Memory `nav-overlay-hides-bottom-nav.md` (overlay-hides-tab-bar invariant — N/A cell rationale)
- Memory `phase06-m3-carry-forward.md` (M4+ race-cell deferral — DEFERRED-USER-APPROVED rationale)
- Memory `geocoder-nominatim-hang-axios-network-error.md` (PARTIAL classification path for retry-on-Network-Error)
- Memory `last-admin-lockout-semantics.md` (ADMIN-03 semantic clarification)
- Memory `phase45-landlord-application-uid-mismatch-bug.md` (CARRY-02 SC#3 context — diagnostic uids saved)
- Memory `gsd-verifier-misses-regressions.md` (paired-gates discipline)
- 02-HUMAN-UAT.md (12 deferred walks rolled forward — Matrices 1 + 2)
- 03-VERIFICATION.md `deferred:` (6 deferred walks rolled forward — Matrix 3)
- 04-VERIFICATION.md (2 deferred walks rolled forward — Matrices 4 + 5)
- 05-PREFLIGHT.md (pre-flight gate `health_check_status: 200`)
- 05-STORE-HISTORY.md (build identity binding values: iOS build 28 / Android versionCode 31)
