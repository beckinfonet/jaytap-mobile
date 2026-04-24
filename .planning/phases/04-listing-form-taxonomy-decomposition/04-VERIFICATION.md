# Phase 4 Exit Regression Bundle

**Plan:** 04-06 Task 3 — phase-exit regression verification
**Base commit (pre-reduction):** 633637c (Plan 04-02 — last prior touch on CreateListingScreen.tsx)
**Orchestrator reduction commit:** ac02eb2 (refactor(04-06): reduce CreateListingScreen to orchestrator)
**Recorded at:** 2026-04-24T06:17:31Z

---

## 1. CI Gates — all MUST exit 0

```
$ ./scripts/check-role-grep.sh
== D-14 Phase-3 role-gating grep invariant ==
OK   #1: no inline userType === 'admin' comparisons outside useRole.ts
OK   #2: backendProfile.userType read only inside useRole.ts
OK   #3: allowlist identifiers confined to useRole.ts + adminAllowlist.ts
OK   #4: isAllowlistedAdmin symbol confined to its definition + hook consumer
===========================================
PASS: all 4 D-14 grep invariants hold
exit: 0

$ ./scripts/check-land-removed.sh
== Phase-4 FORM-01 Land-removal grep invariant ==
OK   #1: no 'Land' string literal in src/
OK   #2: propertyType.land key removed
===========================================
PASS: all FORM-01 grep invariants hold
exit: 0

$ ./scripts/check-i18n-parity.sh
== Phase-4 FORM-09 i18n parity grep ==
OK   #1: en.ts and ru.ts key sets are identical
===========================================
PASS: FORM-09 key-set parity holds
exit: 0
```

## 2. Gated Wrap Counts (T-04-01 mitigation)

```
MediaSection <Gated count (expect 2): 2
Orchestrator <Gated count (expect 1): 1
In-tree <Gated total (expect 3): 3
```

## 3. D-09 Anchors (T-04-02 mitigation)

```
Anchor A — rehydrate useEffect (expect 1): 1
Anchor B — panoramicPhotosUrl payload (expect 1): 1
Anchor C — tours payload (expect 1): 1
```

## 4. Single Source of Truth

```
PROPERTY_TYPE_TO_CATEGORY declarations (expect 1 in propertyCategory.ts): 1
propertyTypeToCategory consumer files: 4
```

## 5. i18n Property Type Keys (FORM-09)

```
en.ts Hostel/Hotel keys (expect 2): 2
ru.ts Hostel/Hotel keys (expect 2): 2
```

## 6. CreateListingForm Directory Shape

```
Directory file count (expect 10): 10

Directory listing:
  BasicInfoSection.tsx
  CommercialSection.tsx
  HospitalitySection.tsx
  index.ts
  MediaSection.tsx
  PriceSection.tsx
  ResidentialSection.tsx
  styles.ts
  types.ts
  VerificationSection.tsx
```

## 7. TypeScript

```
$ npx tsc --noEmit
tsc output lines: 16 (baseline: 16 — AuthContext + ThemeContext pre-existing)
```

## 8. Full Jest Suite

```
$ npm test

Test Suites: 5 passed, 5 total
Tests:       22 passed, 22 total
Snapshots:   0 total
Time:        1.221 s
Ran all test suites.
```

## 9. Orchestrator LOC

```
$ wc -l src/screens/CreateListingScreen.tsx
     871 src/screens/CreateListingScreen.tsx

Pre-plan baseline: 1404 LOC (from Plan 04-02 @ 633637c)
Post-plan actual: 871 LOC — reduction of 533 LOC (37%)
UI-SPEC row 480 target: <500 LOC — not a strict gate.
04-PATTERNS.md §15 row 418 realistic range: 350-450.
Actual exceeds realistic range by keeping Contact + Status + verificationOnly branch inline + large onChange switch (64 LOC).
```

## 10. Atomic Land-Removal Regression

```
$ grep -rn -i "'Land'|\"Land\"|propertyType\.land" src/ (excluding test carve-out):
(no hits — PASS)
```

---

## Phase-Exit Readiness

All automated gates pass. Remaining work before phase closure:

- [ ] 18-cell manual QA matrix walk on physical iOS + Android devices
      (see `04-QA-MATRIX.md` — Task 2 checkpoint)

Once the QA matrix is filled and all cells PASS, run `/gsd-verify-work`
to close Phase 4.
