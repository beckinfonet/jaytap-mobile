---
phase: 11-listing-address-geocode
plan: 05
subsystem: rn-client/i18n + display
tags:
  - rn-client
  - i18n
  - display
  - read-path
  - phase-11
requirements:
  - GEO-05
  - GEO-06
dependency_graph:
  requires:
    - 11-CONTEXT.md decisions 10 (LOCKED EN+RU strings) and 11 (precedence flip across details + browse surfaces)
    - Plan 11-03 (Property.location.address optional field on RN type + FormBag.location.address required string default '')
    - Plan 11-04 (geocodeService.ts + Step2Location.tsx wiring; the 4 `as TranslationKeys` casts at Step2Location.tsx:563/574/600/609)
  provides:
    - "src/locales/en.ts :: 4 new contextualListing.step2.address* keys (addressGeocoding / addressLabel / addressNotFound / addressPlaceholder)"
    - "src/locales/ru.ts :: same 4 keys at identical position with locked RU translations"
    - "src/screens/PropertyDetailsScreen.tsx :: addressDisplay prefers location.address with `, ` fallback to district+city"
    - "src/components/HospitalityCard.tsx :: addressDisplay prefers location.address with `, ` fallback (browse strip)"
    - "src/components/PropertyCard.tsx :: addressDisplay const prefers location.address with ` · ` (bullet) fallback (search/favorites share message)"
  affects:
    - Plan 11-06 (physical-device QA) — unblocks; closes WARNING #1 from plan-check (cast resolution) so QA matrix can rely on real i18n strings
tech-stack:
  added: []
  patterns:
    - "Trim-and-coalesce precedence: `(value ?? '').trim() || fallback` — whitespace-only addresses treated as empty so layout never gets accidentally whitespace-clobbered."
    - "Single-derivation propagation (PropertyDetailsScreen) — 1 const flip flows through 5+ consumer sites via existing closures (handleShare, email body, HeaderInfoCard prop, fullScreen map description + text)."
    - "Per-file fallback separator preservation — HospitalityCard preserves `, ` literal; PropertyCard preserves ` · ` (U+00B7) literal — pre-Phase-11 visual byte-identical."
    - "Intentional-exclusion audit comment block (PropertyCard Row 3 MapPin label) — geographic-context label deliberately NOT switched; comment documents reasoning + MapPreviewCard parallel for future contributors (T-11-25 mitigation)."
key-files:
  created: []
  modified:
    - src/locales/en.ts (+10 lines: 1 leading comment + 4 keys + 1 trailing blank line + 4 comment-context lines)
    - src/locales/ru.ts (+10 lines: same structure)
    - src/screens/PropertyDetailsScreen.tsx (+8 / -3 = net +5)
    - src/components/HospitalityCard.tsx (+6 / -1 = net +5)
    - src/components/PropertyCard.tsx (+12 / -1 = net +11; larger due to intentional-exclusion comment block)
    - .planning/phases/11-listing-address-geocode/deferred-items.md (NEW — 21 lines logging pre-existing PropertyCard.test.tsx failures + 17-error TSC baseline)
decisions:
  - "Apostrophe convention for addressNotFound EN: used DOUBLE quotes around `\"Couldn't find that address — drop a pin instead\"` matching the existing pattern at `auth.dontHaveAccount` + `property.contactModalSubtitle`. Single-quote-with-backslash style (used at `landlordApp.idPhotoHelper`) was also valid; double-quote was less visually noisy."
  - "i18n key placement: appended AFTER `contextualListing.step2.exactAddressToggle` (the last existing step2 key), BEFORE the `contextualListing.step3.*` block. Plan offered two placement options; chose end-of-block to minimize churn."
  - "Comment block on PropertyCard.tsx fallback (12 ins / 1 del) intentionally includes the literal `[districtLabel, cityLabel].filter(Boolean).join(' · ')` expression text — required by the plan's STEP 2B prescription. This produces a 3-match grep result (`grep -c \"\\[districtLabel, cityLabel\\].filter(Boolean).join(' · ')\" PropertyCard.tsx` = 3) where the plan AC expected 2; the third match is the audit-comment literal, not a third code expression. Code expression count remains 2 (line 85 const fallback + line 302 Row 3 inline JSX, Row 3 untouched as plan-spec'd)."
  - "PropertyCard.test.tsx 5 pre-existing Phase-8 specs-strip failures NOT auto-fixed — verified via `git stash && jest && stash pop` that all 5 fail at base 232fdd7 too. Per <deviation_rules> scope boundary (issues NOT directly caused by current task changes), logged to deferred-items.md instead of fixed."
  - "i18n parity script regex limitation observed but accepted: `grep -oE \"'[a-zA-Z.]+':\"` excludes ANY key containing digits (e.g. `step2.*`, `step3.*`, `rooms.1`). Script reports PASS via 565=565 set equality across NON-digit keys; digit-containing keys are invisible to it. TSC `Record<TranslationKeys, string>` is the actual gate that catches digit-key divergence. Not in scope to fix the script in this plan; flagged for future i18n hygiene cleanup."
metrics:
  duration_minutes: 9
  completed_date: 2026-05-26
  task_count: 3
  file_count: 6
  commit_count: 4
  new_en_keys: 4
  new_ru_keys: 4
  loc_delta_property_details: "+8 / -3 (net +5)"
  loc_delta_hospitality_card: "+6 / -1 (net +5)"
  loc_delta_property_card: "+12 / -1 (net +11)"
---

# Phase 11 Plan 05: i18n + Display Surfaces Summary

**One-liner:** Closed Plan 11-04's `as TranslationKeys` casts by registering the 4 LOCKED EN+RU Step 2 address-input keys, and flipped `addressDisplay` precedence in PropertyDetailsScreen + HospitalityCard + PropertyCard (preserving each file's existing fallback separator and the M5 Phase 1 details redesign layout bit-for-bit) — completing the read-side of the Phase 11 round-trip across details + browse surfaces.

## Outcome

A listing created via Step 2 with a typed address ("100 Manas Street, Bishkek") now displays that geocoded `location.address` on:
- PropertyDetailsScreen header (HeaderInfoCard via `formatAddress(addressDisplay)`)
- PropertyDetailsScreen share-sheet message body
- PropertyDetailsScreen email body (`Address: ${addressDisplay}`)
- PropertyDetailsScreen full-screen map marker description + bottom address text
- HospitalityCard browse-strip visible address row + share message
- PropertyCard search-results / favorites share-sheet message body

Pre-Phase-11 listings (no `location.address` set) render byte-identically to today across all three surfaces — the `(value ?? '').trim() || fallback` pattern coalesces undefined/empty/whitespace-only into the existing district+city synthesis (`, ` separator for details + hospitality strip; ` · ` bullet for property card).

The PropertyCard Row 3 MapPin label (district · city, line 302) is INTENTIONALLY UNCHANGED — geographic-context label parallel to MapPreviewCard's role on PropertyDetailsScreen. An audit comment block above the addressDisplay const documents the reasoning so a future contributor doesn't "fix" it.

## Files Modified

| File | Type | Change |
|------|------|--------|
| `src/locales/en.ts` | modified | +10 lines: 4 keys + 1 comment header + 5 contextual lines under existing step2.* block |
| `src/locales/ru.ts` | modified | +10 lines: identical structure with locked RU translations |
| `src/screens/PropertyDetailsScreen.tsx` | modified | +8 / -3 — single derivation line + comment expansion at line 525 |
| `src/components/HospitalityCard.tsx` | modified | +6 / -1 — single derivation line + comment expansion at line 75 |
| `src/components/PropertyCard.tsx` | modified | +12 / -1 — derivation line + intentional-exclusion audit comment block at line 74 |
| `.planning/phases/11-listing-address-geocode/deferred-items.md` | created | +21 lines — logs PropertyCard.test.tsx Phase-8 failures + 17-error TSC baseline as out-of-scope for Phase 11 |

## Commits (on `worktree-agent-a7553dfcba239f15c`)

| Hash | Type | Description |
|------|------|-------------|
| `ec08691` | feat (Task 1) | `feat(11-05): add 4 EN+RU i18n keys for Step 2 address input` |
| `f13caa1` | feat (Task 2) | `feat(11-05): prefer location.address in PropertyDetailsScreen (GEO-06)` |
| `4a294af` | feat (Task 3) | `feat(11-05): prefer location.address in HospitalityCard + PropertyCard (GEO-06)` |
| `f7bc8ea` | docs (deferred) | `docs(11-05): log Phase 11 deferred items (pre-existing brownfield)` |

## Acceptance Criteria

All 13 plan success criteria pass:

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | HEAD assertion passes; worktree base = 232fdd7 | ✓ | Branch `worktree-agent-a7553dfcba239f15c`; `git merge-base HEAD 232fdd7 = 232fdd7` after reset |
| 2 | 4 EN keys added in alphabetical order under `contextualListing.step2.*` | ✓ | `grep -c "contextualListing.step2.address" en.ts` = 4; alphabetical: Geocoding < Label < NotFound < Placeholder |
| 3 | 4 RU keys at identical position in identical alphabetical order | ✓ | `grep -c "contextualListing.step2.address" ru.ts` = 4 |
| 4 | `scripts/check-i18n-parity.sh` exits 0 | ✓ | `OK #1: en.ts and ru.ts key sets are identical` / `PASS: FORM-09 key-set parity holds` |
| 5 | PropertyDetailsScreen line 525 region: precedence-flip expression matches spec | ✓ | See git diff excerpt below; exact expression `(property.location?.address ?? '').trim() \|\| [districtLabel, cityLabel].filter(Boolean).join(', ')` |
| 6 | HospitalityCard line 75: same precedence, `, ` separator preserved | ✓ | grep -c `[districtLabel, cityLabel].filter(Boolean).join(', ')` = 1 |
| 7 | PropertyCard line 84: same precedence, ` · ` (bullet) separator preserved | ✓ | const at line 85 + Row 3 JSX at line 302 both use ` · ` |
| 8 | PropertyCard line ~291/302 inline JSX (Row 3) UNCHANGED | ✓ | `grep -n "Row 3: MapPin" PropertyCard.tsx` → line 293 (shifted +11 from comment addition); JSX content byte-identical |
| 9 | HeaderInfoCard.tsx + MapPreviewCard.tsx + formatAddress.ts NOT edited | ✓ | `git diff --stat src/components/details/ src/utils/formatAddress.ts` → empty |
| 10 | M5 Phase 1 details layout preserved bit-for-bit | ✓ | `git diff HEAD~3..HEAD~2 -- src/screens/PropertyDetailsScreen.tsx` shows ONLY the addressDisplay derivation + comment expansion; no JSX/style changes |
| 11 | Pre-Phase-11 listings (no location.address) render IDENTICALLY across all 3 surfaces | ✓ | Expression eval: `(undefined ?? '').trim()` → `''` → falsy → fallback fires (verified per file via the preserved separator) |
| 12 | `as TranslationKeys` casts in Step2Location.tsx resolve to real union members | ✓ | 4 cast sites at lines 563/574/600/609 reference `addressLabel`/`addressPlaceholder`/`addressGeocoding`/`addressNotFound` respectively — all 4 keys NOW in TranslationKeys union via en.ts addition |
| 13 | TSC ≤ 17 (Plan 11-04 baseline preserved) | ✓ | `npx tsc --noEmit 2>&1 \| grep -c "error TS"` = 17 (unchanged); 0 errors on en.ts, ru.ts, Step2Location.tsx, PropertyDetailsScreen.tsx, HospitalityCard.tsx, PropertyCard.tsx |
| 14 | KBD-02 grep = 0 | ✓ | `grep -rn "keyboardVerticalOffset" src/ \| grep -v node_modules \| wc -l` = 0 (M1 KBD-02 invariant preserved) |
| 15 | SUMMARY.md created and committed in `.planning/phases/11-listing-address-geocode/11-05-SUMMARY.md` | ✓ | THIS FILE (pending the final docs commit below) |
| 16 | No modifications to STATE.md or ROADMAP.md | ✓ | `git diff 232fdd7..HEAD -- .planning/STATE.md .planning/ROADMAP.md` → empty |

## TSC Diagnostic Delta

| Metric | Before (Plan 11-04 close) | After (Plan 11-05 close) | Delta |
|--------|---------------------------|---------------------------|-------|
| Total `error TS` count | 17 | 17 | 0 |
| Errors on en.ts | 0 | 0 | 0 |
| Errors on ru.ts | 0 | 0 | 0 |
| Errors on Step2Location.tsx (the cast sites) | 0 | 0 | 0 |
| Errors on PropertyDetailsScreen.tsx | 0 | 0 | 0 |
| Errors on HospitalityCard.tsx | 0 | 0 | 0 |
| Errors on PropertyCard.tsx | 0 | 0 | 0 |

The 4 `as TranslationKeys` casts in Step2Location.tsx now reference real TranslationKeys union members (Plan 11-04 doc commit 124-132 — the casts were tagged `// TODO(11-05): remove cast`). They are now inert; removing them is purely cleanup and is NOT required by this plan's must_haves (and was not done, to preserve atomic-diff hygiene).

The remaining 17 errors are unchanged M3 brownfield gaps (ChatComposeScreen.tsx Property.imageUrl / images / title, ChatScreen.tsx Property.title, ScheduleViewingScreen.tsx Property.title, TourSelectionScreen.tsx Tour export + Property.tours, plus a handful of test-file ElementType errors). All documented in `deferred-items.md` as M6+ brownfield cleanup work, NOT Phase 11 scope.

## i18n Parity Sentinel

```
$ bash scripts/check-i18n-parity.sh
== Phase-4 FORM-09 i18n parity grep ==
OK   #1: en.ts and ru.ts key sets are identical
===========================================
PASS: FORM-09 key-set parity holds
```

Note (decision row): the parity grep `'[a-zA-Z.]+':` excludes any key containing digits (so all `step2.*` and `step3.*` keys are invisible to it). Both files added the same 4 keys at the same alphabetical position, so the script's set comparison passes by construction. The TypeScript `Record<TranslationKeys, string>` enforcement on `ru.ts` is the actual gate that catches digit-containing key divergence — and `npx tsc --noEmit` is clean.

## `as TranslationKeys` Cast Resolution (WARNING #1 Closure)

Plan 11-04 inserted 4 temporary `as TranslationKeys` casts as a bridge pattern. Each cast site now references a key that exists in the union post-Plan-11-05:

```
$ grep -n "as TranslationKeys" src/components/ContextualListingFlow/Step2Location.tsx
400:            {t(errors['location.city'] as TranslationKeys)}                          [pre-existing dynamic-key pattern]
490:            {t(errors['location.district'] as TranslationKeys)}                       [pre-existing dynamic-key pattern]
528:            {t(errors['location.coordinates'] as TranslationKeys)}                    [pre-existing dynamic-key pattern]
563:            {t('contextualListing.step2.addressLabel' as TranslationKeys)}            [Plan 11-04 bridge → NOW REAL UNION MEMBER]
574:              placeholder={t('contextualListing.step2.addressPlaceholder' as TranslationKeys)}   [Plan 11-04 bridge → NOW REAL UNION MEMBER]
600:              {t('contextualListing.step2.addressGeocoding' as TranslationKeys)}      [Plan 11-04 bridge → NOW REAL UNION MEMBER]
609:              {t('contextualListing.step2.addressNotFound' as TranslationKeys)}       [Plan 11-04 bridge → NOW REAL UNION MEMBER]
710:                      {t(`contextualListing.step2.cityOther.country.${c}` as TranslationKeys)}   [pre-existing template-literal dynamic key]
```

Each of the 4 Plan-11-04 bridge casts (lines 563/574/600/609) targets exactly one of the 4 keys added by THIS plan. No cast-key mismatch typos. The casts can be removed in a future cleanup pass (purely stylistic — they are now no-ops); not required by this plan's must_haves.

## Browse-Surface Coverage (CONTEXT.md Decision 11 / ROADMAP SC #6)

```
$ grep -lE "property\.location\?\.address" \
    src/screens/PropertyDetailsScreen.tsx \
    src/components/HospitalityCard.tsx \
    src/components/PropertyCard.tsx | wc -l
3
```

All three browse-surface derivations are wired. The CONTEXT.md Decision 11 inventory of files originally listed `PropertyDetailsScreen.tsx, HospitalityCard.tsx, HeaderInfoCard.tsx`. HeaderInfoCard inherits via composition (it receives `formattedAddress={formatAddress(addressDisplay)}` as a prop from PropertyDetailsScreen line 969 — no direct edit needed). PropertyCard was added to the browse-surface group during planning (ROADMAP SC #6 "downstream renderers using location text") and is covered here.

## PropertyDetailsScreen Diff (M5 Phase 1 Layout Preservation Evidence)

```
$ git diff 232fdd7..HEAD -- src/screens/PropertyDetailsScreen.tsx
@@ -520,9 +520,14 @@
   const descriptionText = property.content?.description ?? '';
   const cityLabel = property.location?.city ?? '';
   const districtLabel = property.location?.district ?? '';
-  // Address line synthesized from nested location (no flat property.address on M3 shape).
-  // Render slug-as-is — M4 owns dynamic-dictionary label lookup (Plan 02-05 D-10).
-  const addressDisplay = [districtLabel, cityLabel].filter(Boolean).join(', ');
+  // Phase 11 GEO-06: address line prefers the geocoded `location.address` (typed by
+  // the lister in Step 2 or reverse-geocoded from pin drop) when non-empty. Falls back
+  // to the synthesized [district, city] slug pair when address is absent/empty (existing
+  // pre-Phase-11 listings + listings where the lister never typed an address). M5 Phase 1
+  // details redesign layout is preserved — only this one derivation flips precedence,
+  // which propagates through HeaderInfoCard / share / email / fullScreenMap consumers.
+  const addressDisplay = (property.location?.address ?? '').trim()
+    || [districtLabel, cityLabel].filter(Boolean).join(', ');
   const photos = property.media?.photos ?? [];
   const tourUrl = property.media?.tourUrl;
   const videoUrl = property.media?.videos?.[0];
```

ONLY the addressDisplay derivation + comment expansion. Zero JSX changes, zero style changes, zero changes to any other derivation. M5 Phase 1 redesign layout preserved bit-for-bit.

```
$ git diff --stat 232fdd7..HEAD -- src/components/details/ src/utils/formatAddress.ts
(empty — no detail-card or formatAddress edits)
```

## Threat Model Compliance

| Threat ID | Mitigation in this plan | Status |
|-----------|--------------------------|--------|
| T-11-21 (i18n key collision) | New `contextualListing.step2.address*` prefix verified collision-free pre-add (`grep "address" src/locales/en.ts` showed only `emailAddress` in a different namespace). Parity sentinel + TS `Record<TranslationKeys, string>` are belt-and-suspenders. | ✓ no collision |
| T-11-22 (address rendered into share message / email body) | Accept — same disclosure surface as the prior district+city synthesis. Server-sanitized at write time (Plan 11-01). | ✓ accepted by design |
| T-11-23 (no client-side address validation) | Accept — Plan 11-01 enforces server-side trim + maxlength=200. RN `<Text>` is plain-text, no XSS surface. | ✓ accepted |
| T-11-24 (long address overflow) | Mitigated — HeaderInfoCard + HospitalityCard address rows enforce `numberOfLines={1}` + `ellipsizeMode="tail"`; PropertyCard share message is bounded by 200-char backend cap. | ✓ existing layout mitigations sufficient |
| T-11-25 (future contributor "fixes" PropertyCard Row 3) | Mitigated — audit comment block above `addressDisplay` const explicitly documents the intentional exclusion + MapPreviewCard parallel. Future PR review should reference this comment + CONTEXT.md Decision 11 before changing Row 3. | ✓ audit comment in code |

No new attack surface added — pure read-path widening across three surfaces.

## Deviations from Plan

### Auto-fixed Issues

None. No Rule 1 / Rule 2 / Rule 3 deviations encountered during execution.

### Beyond the Plan

**1. [Hardening / scope-boundary documentation] Created `deferred-items.md` at the phase root**

The plan's `<output>` section enumerated 6 files modified. This SUMMARY records a 7th (`deferred-items.md`) created to log 2 out-of-scope discoveries surfaced during Task 3 jest verification:
- 5 pre-existing PropertyCard.test.tsx Phase-8 specs-strip failures (verified pre-existing at base 232fdd7 via `git stash && jest && stash pop`).
- 17-error TSC baseline (Plan 11-04 baseline preserved; out-of-scope per phase frontmatter `tags: [rn-client, i18n, display, read-path]`).

This is `<deviation_rules>` scope-boundary compliance (log discoveries, don't auto-fix unrelated brownfield), NOT scope creep on Phase 11. The 4th `docs(11-05)` commit (`f7bc8ea`) captures this file.

### Plan AC Footnote (grep-pattern wrinkle, NOT a regression)

The plan's Task 3 AC #4 expected `grep -c "[districtLabel, cityLabel].filter(Boolean).join(' · ')" PropertyCard.tsx` = 2 (one const fallback + one Row 3 JSX). Actual = 3, because the prescribed intentional-exclusion comment block (from STEP 2B) contains the literal expression text as comment-string. Code expressions remain 2 (line 85 const fallback + line 302 Row 3 inline JSX). The third match is the audit-comment text, prescribed by the plan body itself.

No deviation from plan-spec'd behavior — diff is the plan-prescribed comment block + the const flip. Row 3 untouched (verified by re-reading the diff). Decision logged in the frontmatter `decisions` array.

## Authentication Gates

None. No new auth surface; all changes are i18n strings + pure expression flips.

## Known Stubs

None. The 4 i18n keys are fully wired into Step2Location.tsx (Plan 11-04). The 3 addressDisplay derivations are fully wired to consumers via the established prop / closure pattern. Pre-Phase-11 listings without `location.address` render via the fallback synthesis — that's the documented design, not a stub.

## Threat Flags

None. New surface (4 i18n strings + 3 expression flips) is fully covered by the plan `<threat_model>` and Plan 11-01..11-04 backend/client threat models. No new network endpoints, no new auth paths, no new schema changes at trust boundaries.

## Self-Check: PASSED

- File `src/locales/en.ts` — FOUND; `grep -c "contextualListing.step2.address" en.ts` = 4.
- File `src/locales/ru.ts` — FOUND; `grep -c "contextualListing.step2.address" ru.ts` = 4.
- File `src/screens/PropertyDetailsScreen.tsx` — FOUND; `grep -c "property.location?.address"` = 1; fallback `, ` separator preserved (grep `[districtLabel, cityLabel].filter(Boolean).join` = 1).
- File `src/components/HospitalityCard.tsx` — FOUND; `grep -c "property.location?.address"` = 1; fallback `, ` separator preserved.
- File `src/components/PropertyCard.tsx` — FOUND; `grep -c "property.location?.address"` = 1; ` · ` separator preserved in const fallback AND Row 3 JSX (intentional).
- File `.planning/phases/11-listing-address-geocode/deferred-items.md` — FOUND.
- Commit `ec08691` (Task 1) — FOUND in `git log --oneline -5`.
- Commit `f13caa1` (Task 2) — FOUND in `git log --oneline -5`.
- Commit `4a294af` (Task 3) — FOUND in `git log --oneline -5`.
- Commit `f7bc8ea` (deferred-items doc) — FOUND in `git log --oneline -5`.
- TSC: 17 baseline preserved; 0 errors on all 6 edited source files.
- Jest sentinel: 221 / 226 passing; 5 pre-existing PropertyCard.test.tsx Phase-8 failures documented as out-of-scope.
- i18n parity sentinel: PASS.
- KBD-02 grep gate: 0 (M1 invariant preserved).
- Browse-surface coverage grep (3 files with `property.location?.address`): 3 / 3.
- Step2Location.tsx 4 Plan-11-04 cast sites at lines 563/574/600/609 each reference one of the 4 keys added by THIS plan (WARNING #1 closed).
- STATE.md, ROADMAP.md, REQUIREMENTS.md untouched (`git diff 232fdd7..HEAD -- .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md` → empty per orchestrator directive).

## Hand-off to Plan 11-06

Plan 11-06 (physical-device QA matrix) can now exercise the full read-side surface knowing:
- All 4 i18n strings render on Step 2 (EN + RU) per CONTEXT.md decision 10 LOCKED text.
- PropertyDetailsScreen address line shows `location.address` when present (via HeaderInfoCard formattedAddress prop).
- HospitalityCard browse strip shows `location.address` when present (visible row + share message).
- PropertyCard share-sheet message shows `location.address` when present; Row 3 MapPin label intentionally still shows district·city.
- Pre-Phase-11 listings (no `location.address`) render IDENTICALLY to today across all three surfaces.

QA matrix cells to add (suggested):
- "Phase-11 listing with typed address → details screen shows the typed displayName, not district+city" (EN + RU).
- "Phase-11 listing with typed address → hospitality strip card shows the typed displayName" (EN + RU).
- "Phase-11 listing with typed address → PropertyCard share message contains the typed displayName; Row 3 visual still shows district·city" (EN + RU).
- "Pre-Phase-11 listing (no address) → all 3 surfaces render byte-identically to pre-Phase-11 build" (regression check).
- "Whitespace-only address backend-payload → falls back to district+city (whitespace coalesce)" (edge case).
