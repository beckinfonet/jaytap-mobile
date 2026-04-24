---
phase: 4
slug: listing-form-taxonomy-decomposition
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `04-RESEARCH.md` §Validation Architecture. Planner to fill in
> `## Per-Task Verification Map` once plans are written.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (unit) + tsc --noEmit (type) + grep gates + manual physical-device QA |
| **Config file** | `jest.config.js` (exists) / `tsconfig.json` / `scripts/check-role-grep.sh` (Phase 3) |
| **Quick run command** | `npx tsc --noEmit && npm test -- --findRelatedTests src/utils/propertyCategory.test.ts` |
| **Full suite command** | `npm test && npx tsc --noEmit && ./scripts/check-role-grep.sh` |
| **Estimated runtime** | ~12 seconds (jest ~3s + tsc ~8s + grep ~0.5s) |

Per CLAUDE.md the M1 testing bar is manual physical-device QA. This phase adds
~5 pure-function unit tests for `src/utils/propertyCategory.ts` as an automated
anchor; the 18-cell manual QA matrix (10 property types × create + 8
edit-rehydration cases) is the real exit gate.

---

## Sampling Rate

- **After every task commit:** `npx tsc --noEmit` (~8s)
- **After every plan wave:** `npm test && npx tsc --noEmit && ./scripts/check-role-grep.sh`
- **Before `/gsd-verify-work`:** Full suite green + 18-cell manual QA matrix green on both iOS + Android physical devices
- **Max feedback latency:** 15 seconds per task

---

## Per-Task Verification Map

*To be populated by `gsd-planner` from each task's `<acceptance_criteria>` block.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | FORM-01 / FORM-02 / FORM-03 / FORM-05 / FORM-09 | — | N/A (UI-only phase; no new auth surface) | type + grep + manual | `npx tsc --noEmit` / `grep -r -i 'propertyType.land\|"Land"' src/` / 18-cell QA matrix | ✅ tsconfig + jest + role-grep exist | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `src/utils/propertyCategory.test.ts` — ~5 pure-function tests for `useCategory(propertyType)` / `PROPERTY_TYPE_TO_CATEGORY` (Apartment→Residential, Office→Commercial, Hostel→Hospitality, Hotel→Hospitality, unknown→fallback). Hardening for criterion 2.
- [ ] `scripts/check-land-removed.sh` (OR add a grep assertion to `scripts/check-role-grep.sh`) — exits 0 only when `grep -r -i 'propertyType.land\|"Land"' src/` returns no in-app matches. CI gate for criterion 1.
- [ ] `scripts/check-i18n-parity.sh` — compares key sets of `src/locales/en.ts` and `src/locales/ru.ts`; exits 0 only when identical. CI gate for criterion 4. (Project uses `.ts` locales — ROADMAP text says `.json` but files are `.ts` per RESEARCH finding.)

*Existing infrastructure (jest, tsconfig, role-grep from Phase 3) covers the
rest. No framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 10 property-type create smoke test | FORM-01, FORM-02, FORM-05 | UI layout regression, field-set correctness, keyboard behavior under New Arch can't be caught by unit tests | Open `CreateListingScreen` on physical iOS + Android, tap each of 10 property-type chips (Apartment, House, Townhome, Condo, Office, Retail, Warehouse, Industrial, Hostel, Hotel) and confirm: (a) category chip updates correctly, (b) section renders expected fields, (c) no layout break, (d) EN + RU both render |
| Edit-rehydration for 4 representative types | FORM-02, FORM-05 | `propertyToEdit` useEffect correctness only visible end-to-end | Seed a listing for Apartment / Office / Warehouse / Hostel → open edit → confirm category chip + section + field values all rehydrate correctly |
| Matterport URL gating preserved | FORM-03 (via Phase 3 `<Gated editMatterportUrl>` scope) | Regression check that MediaSection carves the wrap at the same scope | Sign in as non-admin → open CreateListing → verify entire Matterport section is hidden; sign in as admin → verify section visible and editable |
| Panoramic URL gating preserved | FORM-03 (via Phase 3 `<Gated editPanoramicUrl>` scope — input-only wrap) | Regression check: `videoUrl`/`instagramUrl` stay visible while only the panoramic `<TextInput>` is gated | Sign in as non-admin → confirm `videoUrl` + `instagramUrl` inputs visible, panoramic input hidden; sign in as admin → all three inputs visible |
| D-09 preserve-on-save anchors intact | FORM-03 | Integration behavior: non-admin save must not null out a pre-existing Matterport/panoramic URL on the listing | Admin sets both URLs on a listing → non-admin edits a non-URL field and saves → open listing again → verify both URLs still present on the record |
| EN + RU render parity | FORM-09 | Visual regression, truncation, RU length overflow | Toggle language during each of the 10 create smoke tests; confirm no truncation, no missing translations, no layout break |
| Dark + light theme parity | (CLAUDE.md convention) | Theme-token regression on new sub-components | Toggle theme inside CreateListingScreen; confirm all 7 sub-components render correctly in both |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (type + grep) or reference one of 18 manual QA cells
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`propertyCategory.test.ts`, `check-land-removed.sh`, `check-i18n-parity.sh`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] Manual QA matrix completed on iOS + Android physical devices
- [ ] Phase 3 `scripts/check-role-grep.sh` still exits 0 after MediaSection decomposition (regression check)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
