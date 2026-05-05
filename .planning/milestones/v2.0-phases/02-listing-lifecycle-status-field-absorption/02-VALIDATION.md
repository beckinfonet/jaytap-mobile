---
phase: 2
slug: listing-lifecycle-status-field-absorption
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 02-RESEARCH.md §"Validation Architecture (Nyquist Dimension 8)" (line 1061+).
> Two-repo phase — backend tests are the load-bearing automated surface; client tests stay manual per project posture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend framework** | Jest 29.7.0 + supertest 7.1.4 + mongodb-memory-server (Phase 1 scaffold) |
| **Backend config file** | `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/jest.config.cjs` |
| **Backend quick run command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test -- --testPathPattern=propertyRoutes` |
| **Backend full suite command** | `cd /Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services && nvm use 24 && npm test` |
| **Backend baseline** | 42/42 green post-Phase-1; Phase 2 target ~58 |
| **Backend estimated runtime** | quick ~1.5s, full <5s |
| **RN client framework** | Jest 29.6.3 + react-test-renderer (de facto unused per CONVENTIONS.md "effectively zero tests") |
| **RN client config** | `/Users/beckmaldinVL/development/mobileApps/JayTap/jest.config.js` (preset: 'react-native') |
| **RN client quick run** | `npx tsc --noEmit` (TypeScript baseline gate; preserve 2 pre-existing ThemeContext errors only) |
| **RN client full suite** | `npm test` (1 file `__tests__/App.test.tsx`); `npx tsc --noEmit`; `bash scripts/check-i18n-parity.sh` |
| **RN client estimated runtime** | <10s combined |
| **Manual QA bar** | Physical iPhone 15 Pro Max + Moto G XT2513V; EN+RU + dark/light parity per CONVENTIONS.md |

---

## Sampling Rate

- **After every backend task commit:** Run `npm test -- --testPathPattern=propertyRoutes` (~1.5s)
- **After every backend wave merge:** Run full backend suite `npm test` (target ≥42 green; Phase 2 reaches ~58)
- **After every client task commit:** Run `npx tsc --noEmit` (preserve baseline; 2 pre-existing ThemeContext errors are the ceiling)
- **After every client wave merge:** Run `bash scripts/check-i18n-parity.sh` (EN+RU parity hard gate)
- **Before `/gsd-verify-work`:** Backend full suite green + client tsc baseline preserved + i18n parity exits 0
- **Before phase exit:** Manual physical-device QA matrix walked APPROVED on both devices (EN+RU + dark/light parity)
- **Max feedback latency:** ~5 seconds (backend full suite); ~10 seconds (client tsc + parity)

---

## Per-Task Verification Map

> Status updates as plans land. Plan IDs use `02-NN-PP` (NN = plan number, PP = plan-internal task index). Filled with actual task IDs after gsd-planner runs; rows below are the requirement-level expected coverage.

| Req / Decision | Wave | Behavior to Verify | Threat Ref | Test Type | Automated Command | File Status |
|----------------|------|--------------------|------------|-----------|-------------------|-------------|
| **MOD-01** | 1 | `Property.status` enum cutover (drop `'draft'`, add `'rejected'`, default `'pending'` per D-01 + D-18) | T-V5-01 | unit (Mongoose schema) | `npm test -- --testPathPattern=Property` | ❌ Wave 0 — `src/__tests__/Property.test.js` |
| **MOD-01** | 1 | Audit fields additive (D-21: `submittedAt`, `approvedAt`, `approvedByUid`, `rejectedAt`, `rejectedByUid`, `rejectionReasonCode`, `rejectionReasonNote`, `archivedAt`, `archivedByUid` exist as nullable) | — | unit (Mongoose schema) | as above | ❌ Wave 0 |
| **MOD-02** | 2 | Legacy null-status absorbed by D-04 migration backfill + client `?? 'live'` (D-07) | — | integration + manual | `npm test -- --testPathPattern=propertyRoutes` extension + manual cold-start QA | ❌ Wave 0 — extends `propertyRoutes.test.js` |
| **MOD-03** | 1 | POST /api/properties writes `status: 'pending'` (schema default applied; body `status` field IGNORED for non-mod/admin per D-18 + research §security recommendation) | T-V5-Tampering-01 | integration | as above | ❌ Wave 0 |
| **MOD-04** | 2 | GET /api/properties returns only `status: 'live'` (+ legacy null coalesced) regardless of role; `?includeAll=1` is a no-op (D-05) | T-Info-Disclosure-01 | integration | as above | ❌ Wave 0 |
| **MOD-05** | 2 | GET /api/properties/:id returns 404 to non-owner-non-mod for non-live listings; full payload to owner + mod/admin (D-06) | T-Info-Disclosure-02 | integration | as above (this is the highest-priority test — closes the gsd-verifier-misses-regressions class from M2 P1) | ❌ Wave 0 |
| **MOD-06** | 3 | RenterListings 4-tab segmented control (Live / Pending / Rejected / Archived) — default tab Pending per D-09; per-tab Hospitality `ListHeaderComponent` per D-10; per-tab empty states per D-11 | — | manual-only | physical-device QA EN+RU + dark/light | manual |
| **MOD-07** | 3 | Status pill on PropertyCard at top-left below rent/sale badge per D-19 (UI-SPEC supersession); EN+RU labels per D-16 | — | manual-only | physical-device QA EN+RU + dark/light | manual |
| **MOD-08** | 3 | RejectionBanner on PropertyDetailsScreen — per-session in-memory dismiss per D-13; reappears on cold start, AppState 'active' after >5min background, OR navigate-to-listing | — | manual-only | physical-device QA + per-session-dismiss verification (cold start + multitask + nav) | manual |
| **MOD-09** | 3 | HomeRejectionBanner persistence — auto-dismiss when `count(rejected) === 0`; tap routes to RenterListings → Rejected tab per D-14 + D-15 | — | manual-only | physical-device QA | manual |
| **D-12** (under MOD-04 envelope) | 2 | `GET /api/properties/user/:firebaseUid` returns ALL statuses to owner + mod/admin; live-only to others | T-Info-Disclosure-03 | integration | as above | ❌ Wave 0 |
| **D-15 + D-22** (under MOD-08 envelope) | 2 | PUT /:id from owner on `'rejected'` listing atomically: applies edits + flips `status: 'pending'` + re-stamps `submittedAt` + clears reason fields | T-V5-Tampering-02 | integration | as above | ❌ Wave 0 |
| **D-22** (security) | 2 | PUT /:id strips `req.body.status` from non-mod/admin requests except `'archived'` (Phase 4 reserves that transition) | T-V5-Tampering-03 | integration | as above (defense-in-depth from research §"Phase 2 specific recommendation") | ❌ Wave 0 |
| **D-22** (lifecycle) | 2 | PUT /:id from owner on `'archived'` listing returns 409 (archive lifecycle is Phase 4) | — | integration | as above | ❌ Wave 0 |
| **D-17** | 4 | AppState 'active' role-refresh hook + 60s cooldown debounce | — | manual-only (jest discretionary) | physical-device test: background app, change role server-side, foreground, observe banner within 60s | manual |
| **D-03** (migration) | 0 | `migrate-listings-m2.js --dry-run` previews ops; `--verify` exits 0; idempotent on re-run | — | bash CLI | `npm run migrate:listings-m2 -- --dry-run` against staging Mongo; `npm run migrate:listings-m2 -- --verify` | ❌ Wave 0 — `src/scripts/migrate-listings-m2.js` |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · `❌ Wave 0` = test scaffold owed by Wave 0 task*

---

## Wave 0 Requirements

Backend deliverables (all in `/Users/beckmaldinVL/development/mobileApps/backend-services/JayTap-services/`):

- [ ] `src/__tests__/Property.test.js` — schema unit tests (enum cutover, default `'pending'`, audit fields exist as nullable, body-status sanitizer)
- [ ] `src/__tests__/propertyRoutes.test.js` — extend with `describe('Phase 2 status filter — D-05/D-06/D-12/D-15/D-22')` block (~10 new integration tests)
- [ ] `src/scripts/migrate-listings-m2.js` — migration script (mirrors `migrate-roles-m2.js` pattern: `--dry-run` / live / `--verify` subcommands; idempotent `updateMany`; verbatim post-condition `db.properties.countDocuments({status: {$nin: ['pending', 'live', 'rejected', 'archived']}})` returns 0)
- [ ] `package.json` — `scripts.migrate:listings-m2` entry pointing to the script

Client deliverables (no Wave 0 test owed; project posture is manual physical-device QA):

- [ ] `scripts/check-i18n-parity.sh` (already exists per CONVENTIONS.md) — assert exits 0 after each client wave merge
- [ ] `npx tsc --noEmit` — assert post-Phase-2 baseline ≤ 2 ThemeContext errors (no new errors)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 4-tab segmented control on RenterListings (default: Pending) | MOD-06 | RN component layout + segmented-control behavior with FlatList `ListHeaderComponent` per D-10 — no automated component test infra | iOS + Android: open RenterListings, confirm Pending tab is selected; switch through Live / Rejected / Archived; confirm per-tab empty states + per-tab Hospitality strip; pull-to-refresh refetches |
| Per-tab empty-state copy in EN+RU | MOD-06, D-11 | Visual i18n parity check | Toggle `LanguageProvider` to RU on each empty tab; confirm Avito-anchored copy matches D-11; confirm "Create listing" CTA renders only on Live + Pending |
| Status pill on PropertyCard | MOD-07, D-16, D-19 | Pixel-level positioning conflict with share/heart actions; theme-token rendering across light/dark | Physical device, both locales, both themes: `'pending'` shows "Pending review"/«На модерации»; `'rejected'` "Rejected"/«Отклонено»; `'archived'` "Unpublished"/«Снято с публикации»; `'live'` shows NO pill; pill is at top-left below rent/sale badge (NOT top-right) |
| RejectionBanner per-session dismiss | MOD-08, D-13 | In-memory dismiss flag (NOT AsyncStorage) — must verify reappear semantics manually | (a) Tap X to dismiss → reload screen → still dismissed; (b) cold start app → banner reappears; (c) background app >5min → foreground → banner reappears; (d) navigate away and back to listing → banner re-evaluates |
| HomeRejectionBanner auto-dismiss | MOD-09, D-14 | Banner state derives from server data — must observe dismiss when last rejected listing exits state | Submit listing → admin rejects → confirm Home banner appears with count; edit + resubmit OR archive (Phase 4) → confirm banner disappears |
| AppState 'active' role refresh | D-17 | Real OS multitask behavior + 60s cooldown across 403 interceptor + AppState hook | Sign in as user; admin demotes role server-side; foreground app; confirm role-refresh banner appears within 60s; confirm cooldown prevents thrash on rapid foreground/background |
| Edit-resubmit flow | D-15, D-22 | Cross-screen navigation + server-side auto-flip observed in UI | On rejected listing, tap "Edit & resubmit"/«Исправить»; CreateListingScreen opens in edit mode; save; confirm listing moves from Rejected tab → Pending tab; confirm RejectionBanner stops appearing on that listing |
| Submit-button copy on CreateListingScreen | D-20, MOD-03 | Locale string review on physical device | Open CreateListingScreen as new (NOT edit); confirm submit button reads "Submit for review" / «Отправить на модерацию»; on edit-resubmit path confirm distinct CTA renders |
| Deep-link 404 to non-owner-non-mod | MOD-05, D-06 | End-to-end deep-link test with three different user roles | Owner deep-links to own pending listing → 200 + status pill; mod/admin deep-links → 200 + status pill; unrelated user deep-links → 404 surfaced as "Listing not found" UI |

---

## Validation Sign-Off

- [ ] All MOD-01..MOD-09 + D-12/D-15/D-17/D-22 have either `<automated>` integration tests OR explicit Wave 0 dependencies OR a Manual-Only row
- [ ] Sampling continuity: no 3 consecutive backend tasks without an automated `npm test -- --testPathPattern=propertyRoutes` checkpoint
- [ ] Wave 0 covers all `❌ Wave 0` references in the Per-Task Verification Map
- [ ] No watch-mode flags in test commands (`--watch` / `--watchAll` forbidden)
- [ ] Backend feedback latency < 5 seconds (full suite); client < 10 seconds (tsc + parity)
- [ ] `nyquist_compliant: true` set in frontmatter after planner produces plans that satisfy this contract

**Approval:** pending
