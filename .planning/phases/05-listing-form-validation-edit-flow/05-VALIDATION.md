---
phase: 5
slug: listing-form-validation-edit-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (React Native preset) |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest src/components/CreateListingForm/__tests__/validators.test.ts` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~8 seconds (validators.test.ts only); ~30s full suite |

---

## Sampling Rate

- **After every task commit:** Run quick command (validators suite)
- **After every plan wave:** Run full jest suite
- **Before `/gsd-verify-work`:** Full suite must be green + tsc clean (`npx tsc --noEmit`) + i18n parity (`scripts/check-i18n-parity.sh`)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

> Planner fills this table in PLAN.md generation — `<automated>` blocks map back to task IDs.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | FORM-06 | — | `validateByCategory` pure derivation | unit | `npx jest src/components/CreateListingForm/__tests__/validators.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | FORM-04 | — | Required-field map per category | unit | `npx jest -t "Residential\|Commercial\|Hospitality required"` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | FORM-06 | — | `buildPayloadByCategory` payload shape | unit | `npx jest -t "payload"` | ❌ W0 | ⬜ pending |
| 5-01-04 | 01 | 1 | FORM-06 | — | D-09 anchors (panoramicPhotosUrl + tours) preserved | unit | `npx jest -t "D-09\|payload invariants"` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | FORM-06 | — | Type-clean `FormBag.currency: Currency \| ''` | static | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 5-03-01 | 03 | 2 | FORM-07 | — | Errors threading compiles across 7 sections | static | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 5-04-01 | 04 | 3 | FORM-06, FORM-07, FORM-08 | — | Orchestrator submit flow uses validator + payload builder | static+manual | `npx tsc --noEmit` + physical-device QA | ✅ | ⬜ pending |
| 5-05-01 | 05 | 3 | FORM-06 | — | EN+RU i18n parity for new validation keys | lint | `scripts/check-i18n-parity.sh` | ✅ | ⬜ pending |
| 5-06-01 | 06 | 3 | FORM-08 | — | Status toggle visibility + submit label rule | static+manual | `npx tsc --noEmit` + physical-device QA | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Note: Wave/plan numbers above are indicative — planner may adjust wave assignments during PLAN.md generation. Task IDs will be renumbered to match planner output.*

---

## Wave 0 Requirements

- [ ] `src/components/CreateListingForm/__tests__/validators.test.ts` — NEW file, ~15–20 assertions per D-17
- [ ] Jest harness: no new install required — existing `jest.config.js` + `babel.config.js` cover `src/components/**/__tests__/*.test.ts` (verified by RESEARCH §Finding 2 via `npx jest --listTests`)

*Validators suite does not require any new fixtures — pure-function, zero mocks, zero RN test-renderer.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scroll-to-first-error on failed submit (D-04) | FORM-06 | RN scroll + keyboard-controller behavior is platform-native | iOS + Android: create listing, leave title empty, tap submit → verify scroll lands on title with error text visible above keyboard |
| Draft/Publish toggle visible when editing a draft listing (D-16) | FORM-08 | UI visibility rule needs device verification | iOS + Android: save listing as draft, reopen in edit mode → verify toggle is visible with "Save as Draft" label; publish, reopen → toggle hidden, label "Update Listing" |
| Category-switch preserves shared fields (FORM-07) | FORM-07 | Multi-step UI interaction | Fill Residential fields, switch to Office → verify title/description/address/city/district persist; switch back to House → verify bedrooms still populated |
| Hospitality submit passes with ALL contacts empty (D-09 pass-through) | FORM-06 | Trigger rule is branch-dependent on user profile state | Log in as user with empty profile contacts, create Hospitality listing → submit succeeds silently |
| Hospitality submit shows "Complete profile" CTA when contacts partial (D-10/11) | FORM-06 | Alert.alert navigation | Log in as user with phone only (no WhatsApp/Telegram), create Hospitality listing → Alert appears, tap "Complete profile" → navigates to AccountSettingsScreen |
| Edit-mode Hospitality listing with profile contacts cleared after publish (D-12) | FORM-06 | Sequential user flow | Create Hospitality listing with full contacts → clear profile WhatsApp → reopen listing in edit mode → submit fails with same CTA |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (validators.test.ts)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
