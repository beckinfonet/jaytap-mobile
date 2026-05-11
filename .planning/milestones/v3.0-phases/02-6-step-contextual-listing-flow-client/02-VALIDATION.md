---
phase: 02
slug: 6-step-contextual-listing-flow-client
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `02-RESEARCH.md` §"Validation Architecture" (lines 973-1039).
> This phase touches BOTH repos — RN client (cwd) AND backend (`/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services`). Quick run + full suite commands below distinguish the two surfaces.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (RN client)** | Jest 29.6.3 + react-test-renderer 19.2.3 (RTL implied by M1+M2 component tests) |
| **Framework (backend)** | Jest + supertest (per existing `JayTap-services/src/__tests__/*.test.js`) |
| **Config file (RN client)** | `package.json` `test` script: `jest`; default config; co-located `__tests__/` |
| **Config file (backend)** | `JayTap-services/jest.config.js` (or default Jest discovery) |
| **Quick run command (RN client, single file)** | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx jest <test-file-path> -x` |
| **Full suite command (RN client)** | `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npm test` |
| **Quick run command (backend)** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npx jest <test-file-path> -x` |
| **Full suite command (backend)** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test` |
| **Estimated runtime (RN client full)** | ~30-45 seconds (Jest cold; warm: ~15s) |
| **Estimated runtime (backend full)** | ~20-30 seconds (138 tests today, +~15 new from Phase 2) |

---

## Sampling Rate

- **After every task commit:** Run quick run command for the touched test file(s) — < 5 seconds.
- **After every plan wave:** Run full suite for the affected repo (RN client OR backend) — < 60 seconds.
- **Before `/gsd-verify-work`:** Both full suites green + atomic-deletion sentinel exit 0 + i18n parity gate exit 0 + manual physical-device dry-run (Plan 02-08) walked.
- **Max feedback latency:** 60 seconds per repo (full suite); 5 seconds per file (quick run).

---

## Per-Task Verification Map

> Plans not yet generated; this map is keyed by FLOW requirement and Plan ID. Tests not yet authored — every row marked Wave 0 EXCEPT FLOW-13 backend half (existing `propertyRoutes.test.js` + `moderationRoutes.test.js` already cover the backend M2 paths) and FLOW-16 (existing `scripts/check-i18n-parity.sh` CI gate).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-WAVE0 | 01 | 0 | — | — | Backend Location model + supertest scaffold | scaffold | (Wave 0 install — author the test file) | ❌ W0 | ⬜ pending |
| 02-01-T1..N | 01 | 1 | (backend Location surface — supports FLOW-04) | T-02-01 (anti-spoof), T-02-02 (rate-limit) | `createdByUid` from `req.firebaseUid`; rate-limit POST | supertest | `npx jest src/__tests__/locationRoutes.test.js -x` (backend) | ❌ W0 | ⬜ pending |
| 02-01-T-grep | 01 | 1 | FLOW-04 (anti-spoof gate) | T-02-01 | Anti-spoofing grep gate exit 0 | shell | `grep -nE "createdByUid:\s*req\.(body\|headers)" src/routes/locationRoutes.js` returns no matches | ❌ W0 | ⬜ pending |
| 02-02-WAVE0 | 02 | 0 | FLOW-12 | — | `validateStep` test scaffold + adapter scaffold | scaffold | (Wave 0 install — author validators.test.ts + adapters.test.ts) | ❌ W0 | ⬜ pending |
| 02-02-T1..N | 02 | 2 | FLOW-01, FLOW-02, FLOW-12 | — | Step 1 + validateStep SoT + integration walk skeleton | RTL + unit | `npx jest src/components/ContextualListingFlow/__tests__/{validators,adapters,Step1}.test.{ts,tsx} -x` | ❌ W0 | ⬜ pending |
| 02-03-T1..N | 03 | 2 | FLOW-04, FLOW-05, FLOW-06, FLOW-07, FLOW-08 | T-02-03 (mock map) | Step 2 + Step 3 with conditional sub-fields | RTL + unit | `npx jest src/components/ContextualListingFlow/__tests__/{Step2,Step3}.test.tsx -x` (mock `react-native-maps`) | ❌ W0 | ⬜ pending |
| 02-04a-T1..N | 04a | 3 | FLOW-09, FLOW-10 | — | Step 4 (Condition+Amenities) + Step 5 (Title+Description) | RTL + unit | `npx jest src/components/ContextualListingFlow/__tests__/{Step4,Step5}.test.tsx -x` | ❌ W0 | ⬜ pending |
| 02-04b-T1..N | 04b | 3 | FLOW-11 | — | Step 6 deal-type gated matrix + prepayment Custom-int | RTL + unit | `npx jest src/components/ContextualListingFlow/__tests__/{validators,Step6}.test.{ts,tsx} -x` (4 deal-type cells) | ❌ W0 | ⬜ pending |
| 02-05-T1..N | 05 | 4 | (read-path cutover, supports rendering of FLOW-* output) | — | Home + Favorites + RenterListings + OwnerListings + PropertyCard + HospitalitySection + HospitalityCard + ListingMetaTable + PropertyMap → nested shape | snapshot/light unit | `npm test` (RN client; affected test files) | ❌ W0 | ⬜ pending |
| 02-06-T1..N | 06 | 5 | (read-path cutover for PropertyDetailsScreen) | — | PropertyDetailsScreen 1680 LOC nested-shape swap + map embed coord rename | snapshot/light unit | `npm test` (RN client; PropertyDetailsScreen test if exists) | ❌ W0 | ⬜ pending |
| 02-07-T1..N | 07 | 6 | FLOW-01, FLOW-13, FLOW-15 | — | App.tsx overlay flag swap + integration walk for mode='create' happy path | RTL integration | `npx jest src/components/ContextualListingFlow/__tests__/integration.test.tsx -x` | ❌ W0 | ⬜ pending |
| 02-08-T-manual | 08 | 7 | FLOW-* (smoke) | — | Physical-device dry-run on iPhone 15 Pro Max + Moto G XT2513V before atomic deletion | manual | (Phase 5 inputs captured here early) | N/A | ⬜ pending |
| 02-09-T1 | 09 | 8 | FLOW-14 | — | DELETE old screen+barrel; sentinel script enforces no-references | shell | `bash scripts/check-create-listing-screen-removed.sh` exit 0 | ❌ W0 | ⬜ pending |
| 02-09-T2 | 09 | 8 | FLOW-16 | — | EN+RU parity for new keys + orphaned-key cleanup | shell CI | `bash scripts/check-i18n-parity.sh` exit 0 | ✅ existing CI | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> Per-Task IDs above are Plan-level placeholders. The planner refines into atomic tasks at PLAN.md generation. Wave numbers may shift slightly based on planner's dependency analysis.

---

## Phase Requirements → Test Map (Source of Truth)

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLOW-01 | 6-step container renders with progress indicator + Back/Next + per-step validation gating | RTL component | `npx jest src/components/ContextualListingFlow/__tests__/integration.test.tsx -x` | ❌ Wave 0 |
| FLOW-02 | Step 1A — dealType chips render; required to advance | RTL unit | `npx jest src/components/ContextualListingFlow/__tests__/Step1.test.tsx -x` | ❌ Wave 0 |
| FLOW-03 | Step 1B — propertyType chips render; required to advance | RTL unit | `npx jest src/components/ContextualListingFlow/__tests__/Step1.test.tsx -x` | ❌ Wave 0 |
| FLOW-04 | Step 2 — city + district chip rows render dynamically | RTL unit | `npx jest src/components/ContextualListingFlow/__tests__/Step2.test.tsx -x` | ❌ Wave 0 |
| FLOW-05 | Step 2 — map pin captures coords; required to advance | RTL unit + integration + manual on device | `npx jest src/components/ContextualListingFlow/__tests__/Step2.test.tsx -x` (mock `react-native-maps`) | ❌ Wave 0 + manual-only on device for actual Marker drag |
| FLOW-06 | Step 2 — exact-address toggle hidden for hotel/hostel | RTL unit | `npx jest src/components/ContextualListingFlow/__tests__/Step2.test.tsx -x` | ❌ Wave 0 |
| FLOW-07 | Step 3 — area + price + currency required | unit | `npx jest src/components/ContextualListingFlow/__tests__/validators.test.ts -x` | ❌ Wave 0 |
| FLOW-08 | Step 3 — conditional sub-fields per propertyType | unit + RTL | `validators.test.ts` (validation) + `Step3.test.tsx` (rendering) | ❌ Wave 0 |
| FLOW-09 | Step 4 — condition + furnished required | unit + RTL | `validators.test.ts` + `Step4.test.tsx` | ❌ Wave 0 |
| FLOW-10 | Step 5 — title + description required | unit + RTL | `validators.test.ts` + `Step5.test.tsx` | ❌ Wave 0 |
| FLOW-11 | Step 6 — gated matrix per dealType | unit + RTL | `validators.test.ts` (4 deal-type cells) + `Step6.test.tsx` (rendering + Custom-int seed-from-current) | ❌ Wave 0 |
| FLOW-12 | `validateStep` is single SoT | unit | `npx jest src/components/ContextualListingFlow/__tests__/validators.test.ts -x` (~20 cases) | ❌ Wave 0 |
| FLOW-13 | Submit dispatches correct path per mode; status flips to pending | RTL integration + backend supertest | RN: `integration.test.tsx` (mock fetch); Backend: existing `propertyRoutes.test.js` + `moderationRoutes.test.js` | ❌ Wave 0 (RN) / ✅ (backend already exists) |
| FLOW-14 | Old `CreateListingScreen.tsx` deleted; sentinel script enforces | shell | `bash scripts/check-create-listing-screen-removed.sh` exit 0 | ❌ Wave 0 (script — Plan 02-09) |
| FLOW-15 | mod-context banner renders on `mode='edit-mod'` | RTL integration | `integration.test.tsx` (mode='edit-mod' cell) | ❌ Wave 0 |
| FLOW-16 | EN+RU parity for new keys | shell CI | `bash scripts/check-i18n-parity.sh` exit 0 | ✅ existing CI gate |

**Backend Location-routes coverage (NEW supertest file):**

| Behavior | Test | Automated Command |
|----------|------|-------------------|
| `GET /api/locations/cities` returns approved + caller's pending | supertest | `npx jest src/__tests__/locationRoutes.test.js -x` |
| `POST /api/locations/cities` creates pending; HF-03 anti-spoof | supertest | (same) |
| `POST /api/locations/cities` dedupes existing approved → 200 | supertest | (same) |
| `POST /api/locations/cities` dedupes existing pending → 409 | supertest | (same) |
| `GET /api/locations/cities/:slug/districts` returns approved + caller's pending | supertest | (same) |
| `POST /api/locations/cities/:slug/districts` 404 on non-existent city | supertest | (same) |
| Mod approve/reject — atomic findOneAndUpdate (race-safe) | supertest | `npx jest src/__tests__/moderationRoutes.test.js -x` (extends existing) |
| Anti-spoofing grep gate `createdByUid:\s*req\.(body\|headers)` exit 0 | shell | `grep -nE "createdByUid:\s*req\.(body\|headers)" src/routes/locationRoutes.js` |

---

## Wave 0 Requirements

**RN client (cwd):**
- [ ] `src/components/ContextualListingFlow/__tests__/validators.test.ts` — covers FLOW-07, FLOW-08, FLOW-09, FLOW-10, FLOW-11, FLOW-12 (the validator covers ~80% of validation requirements)
- [ ] `src/components/ContextualListingFlow/__tests__/adapters.test.ts` — covers `propertyToFormBag` + `formBagToPropertyPayload` round-trip
- [ ] `src/components/ContextualListingFlow/__tests__/Step1.test.tsx` — RTL component smoke
- [ ] `src/components/ContextualListingFlow/__tests__/Step2.test.tsx` — RTL component smoke (mocks `react-native-maps`)
- [ ] `src/components/ContextualListingFlow/__tests__/Step3.test.tsx` — RTL component smoke (conditional sub-fields per propertyType)
- [ ] `src/components/ContextualListingFlow/__tests__/Step4.test.tsx` — RTL component smoke
- [ ] `src/components/ContextualListingFlow/__tests__/Step5.test.tsx` — RTL component smoke
- [ ] `src/components/ContextualListingFlow/__tests__/Step6.test.tsx` — RTL component smoke (deal-type gated matrix + Custom-int)
- [ ] `src/components/ContextualListingFlow/__tests__/integration.test.tsx` — Step 1→6 walk for `apartment + rent_long`; mode='edit-mod' cell for FLOW-15
- [ ] `scripts/check-create-listing-screen-removed.sh` — sentinel script (added in Plan 02-09)

**Backend:**
- [ ] `JayTap-services/src/__tests__/locationRoutes.test.js` — supertest cases (NEW file, ~12 cases)
- [ ] Existing `JayTap-services/src/__tests__/moderationRoutes.test.js` — extend with location approve/reject + race-safe findOneAndUpdate cases

**No framework install required** — Jest is already wired in both repos.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `react-native-maps` Marker `draggable onDragEnd` actually fires on a physical device with RN 0.84 + Fabric | FLOW-05 | Per RESEARCH §1, Issues #5445/#5836/#5798/#5877 indicate this API may regress on Fabric. Jest mocks the map; only a device walks the real native code path. The tap-to-move fallback (`MapView onPress`) is the safety net. | Plan 02-08 dry-run on iPhone 15 Pro Max + Moto G XT2513V: open Step 2, tap to drop pin (must succeed), then drag the marker (must update coords) on both platforms. If drag fails on either, the tap-to-move fallback alone satisfies FLOW-05 — log the regression for Phase 5 and proceed. |
| Mod-context banner persists across Steps 1–6 | FLOW-15 / D-18 | Visual continuity check that the banner renders ABOVE the step body and stays mounted across step changes. RTL integration test covers Step 1 cell only. | Plan 02-08: open `<ContextualListingFlow mode="edit-mod" moderatorContext={...}>`; observe banner on Step 1; tap Next; observe banner persists on Step 2; repeat through Step 6. |
| EN+RU + dark/light parity per screen | (cross-cutting; Phase 5 REL-03 owns the matrix) | Visual layout regression — automated snapshots brittle on RN. | Plan 02-08 + Phase 5 QA matrix: walk every step in EN-light, EN-dark, RU-light, RU-dark. |
| Step 6 daily-rent UX (deposit-only single field) | FLOW-11 / D-19 | Validates "predictable structure beats minor screen savings" decision lands well. | Plan 02-08: walk Step 1→6 with `dealType: 'rent_daily'` and any propertyType; observe Step 6 renders deposit-only and Submit advances without required-field gating. |
| Atomic deletion final-commit invariant | FLOW-14 / D-22 | Sentinel script enforces post-deletion; verifying the cutover-then-delete sequence requires a manual git log walk. | Plan 02-09 close: `git log --oneline | head -10` should show 02-09 deletion AS THE LAST commit; no commit between 02-07 and 02-09 should ship both old screen + new flow live in `App.tsx`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner enforces at PLAN.md generation)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (above checklist)
- [ ] No watch-mode flags (every command above uses `-x` for fail-fast or no flag for full)
- [ ] Feedback latency < 60 seconds (full suite per repo); < 5 seconds (quick run per file)
- [ ] `nyquist_compliant: true` set in frontmatter — flip after Wave 0 setup tasks complete in Plan 02-02 + Plan 02-01

**Approval:** pending (will flip to approved at Plan 02-02 Wave 0 close)
