---
phase: 6
slug: hospitality-rendering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `06-RESEARCH.md` § Validation Architecture (lines 1043–1114).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.6.3 (RN preset via `@react-native/*`) |
| **Config file** | `package.json` (`"test": "jest"`, default config) |
| **Quick run command** | `npm test -- --testPathPattern validators` (~2s) |
| **Full suite command** | `npm test` (6 suites / 50 tests GREEN at Phase 5 exit) |
| **Estimated runtime** | ~2s quick / ~6s full |

---

## Sampling Rate

- **After every task commit:** `./scripts/check-i18n-parity.sh && ./scripts/check-role-grep.sh && ./scripts/check-land-removed.sh` (three gate scripts, ≈0.1s each)
- **After every plan wave:** `npm test -- --testPathPattern validators`
- **Before `/gsd-verify-work`:** Full `npm test` GREEN + three gate scripts exit 0 + physical-device QA matrix walk
- **Max feedback latency:** ~2s (quick run); ~6s (full suite)

---

## Per-Task Verification Map

> Filled by gsd-planner during plan generation. Each task's `<automated>` block must reference one row here OR mark `manual-only` with a QA cell reference.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD-by-planner | — | — | — | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Net-new files / extensions called out by RESEARCH.md § Wave 0 gaps:

- [ ] `src/utils/hospitalityAmenities.ts` — `HOSPITALITY_AMENITIES` + `HospitalityAmenity` token union + `AMENITY_ICONS` map
- [ ] `src/types/Property.ts` — add `amenities?: HospitalityAmenity[]`, `rooms?: number`, `maxGuests?: number` (Gap 9.1)
- [ ] `src/locales/en.ts` + `ru.ts` — 32 new keys added in parity (12 amenity labels + 20 UI strings)
- [ ] `src/components/CreateListingForm/types.ts` — narrow `FormBag.amenities` to `HospitalityAmenity[]` (D-21)
- [ ] `src/components/CreateListingForm/__tests__/validators.test.ts` — extend Hospitality describe block with ~3 amenity assertions; flip existing `'amenities' in payload === false` → `true`

*Existing infrastructure covers all other phase requirements (Jest 29 already installed; no new test runners or fixtures needed).*

---

## Manual-Only Verifications

Per CLAUDE.md "Testing bar: manual physical-device QA for M1 (iOS + Android)". The ~80-cell QA matrix from RESEARCH.md § QA matrix is the M1 exit criterion.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HospitalitySection renders only when `hospitalityProperties.length > 0` on 3 list screens | HOSP-01 | UI render | QA matrix: empty vs populated cells (Home / Favorites / RenterListings / OwnerListings × empty/populated × iOS/Android = 16 cells) |
| Hospitality cards appear under both Rent and Sell toggles | HOSP-02 | UI render | QA matrix: HomeScreen transactionType × Hospitality (4 cells) |
| HospitalityCard renders no price chip and tour-first hero | HOSP-03 | UI render | QA matrix: card variants — has tour / no tour × has amenities / no amenities × iOS/Android (8 cells) |
| PropertyDetailsScreen Hostel/Hotel: no price block, tours above gallery, contact quick-actions sticky bar | HOSP-04 | UI render | QA matrix: detail screen cells — Hostel + Hotel × has tour / no tour × WA/TG/phone combos × iOS/Android (32 cells) |
| Amenity multi-select grid (12 items) on Create form | HOSP-05 | UI interaction | QA matrix: create form amenity picker — 0/1/12 selections × iOS/Android (6 cells) |
| Edit-mode rehydrate populates `rooms` / `maxGuests` / `amenities` (Gap 9.2) | HOSP-05 | Round-trip integration | Physical device: edit an existing Hospitality listing; confirm fields restore (2 cells) |
| EN + RU parity on all new strings (live language toggle) | HOSP-06 | UI render | QA matrix: language swap during active filter (2 cells) |
| HomeScreen tri-state filter (Residential / Commercial / Hospitality chip) | HOSP-01 | UI interaction | QA matrix: tri-state filter (6 cells) |
| HomeScreen type chip under Hospitality (Hostel / Hotel) | HOSP-01 | UI interaction | QA matrix: type chip cells (4 cells) |

**Total manual cells: ~80** (per RESEARCH.md § QA matrix). Budget ~2–3 hours per device for a full walk.

---

## Phase-Gate Regression Bundle

These must all pass before phase sign-off:

- `./scripts/check-role-grep.sh` exits 0 (Phase 3 D-14 invariant — Phase 6 introduces zero new role gates)
- `./scripts/check-land-removed.sh` exits 0 (Phase 4 FORM-01 invariant)
- `./scripts/check-i18n-parity.sh` exits 0 (Phase 4 FORM-09 invariant — Phase 6 adds 32 keys × 2 locales in parity)
- `npm test` — 50/50 baseline (Phase 5) + new amenity assertions Phase 6 lands
- `grep -c '<Gated' src/components/CreateListingForm/MediaSection.tsx == 2` (Phase 4 invariant)
- D-09 preserve-on-save anchors — 3 greps, each exactly 1 hit. Note: Gap 9.2 adds 3 lines INSIDE the rehydrate `useEffect`, which may shift `CreateListingScreen.tsx:253` line numbers. Update `04-VERIFICATION.md` if anchor lines shift.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (or explicit manual-only flag)
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`--watch` blocked)
- [ ] Feedback latency < 6s for full suite
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
