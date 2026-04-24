---
phase: 05-listing-form-validation-edit-flow
plan: 05
type: execute
wave: 4
depends_on: [04]
files_modified:
  - App.tsx
  - src/types/Property.ts
  - .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md
  - .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md
autonomous: false
requirements: [FORM-07, FORM-08]
tags: [app-state-machine, nav-wiring, typescript, manual-qa, phase-exit]
must_haves:
  truths:
    - "App.tsx wires the new onNavigateToAccountSettings prop on the CreateListingScreen render site — on tap of 'Complete profile' in the Hospitality contact Alert, the CreateListing overlay closes and AccountSettingsScreen opens"
    - "Property type declares `status?: 'draft' | 'live'` — the `(propertyToEdit as any).status` cast in CreateListingScreen can be removed (or remains if executor prefers conservative change)"
    - "A 05-QA-MATRIX.md physical-device scaffold exists covering FORM-07 category-switch preservation, FORM-08 edit-mode initialization + D-16 Draft/Publish rule, D-04 scroll-to-first-error, and D-09 anchor preservation"
    - "A 05-VERIFICATION.md phase-exit regression bundle records tsc baseline, jest pass count, all 3 phase-gate script exits, and D-09 anchor grep counts — phase-exit gate before /gsd-verify-work"
  artifacts:
    - path: "App.tsx"
      provides: "onNavigateToAccountSettings callback wired to CreateListingScreen render site"
      contains: "onNavigateToAccountSettings"
    - path: "src/types/Property.ts"
      provides: "Property with optional status field"
      contains: "status?: 'draft' | 'live'"
    - path: ".planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md"
      provides: "manual QA matrix scaffold for physical-device walk on iOS + Android"
      min_lines: 80
    - path: ".planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md"
      provides: "phase-exit regression bundle with automated gate outputs"
      min_lines: 60
  key_links:
    - from: "App.tsx CreateListingScreen render site (~:821-840)"
      to: "src/screens/CreateListingScreen.tsx onNavigateToAccountSettings prop"
      via: "inline callback that closes CreateListing + opens AccountSettings"
      pattern: "setIsCreateListingOpen\\(false\\).*setIsAccountSettingsOpen\\(true\\)"
    - from: "App.tsx precedent"
      to: "src/screens/ProfileScreen.tsx onViewAccountSettings"
      via: "existing onProfileViewAccountSettings callback at :438"
      pattern: "setIsAccountSettingsOpen\\(true\\)"
---

<objective>
Close Phase 5 with the three remaining integration pieces and the phase-exit verification scaffold:

1. **App.tsx wiring** — thread the new `onNavigateToAccountSettings` prop onto the CreateListingScreen render site so the D-11 "Complete profile" CTA actually navigates. Follow the `onProfileViewAccountSettings` precedent at `App.tsx:438` / render site `:602-607`.
2. **Property type extension** — add `status?: 'draft' | 'live'` to the Property type (per RESEARCH Open Question #2) so the `as any` cast in D-16 can be removed or left consistent. Low-risk one-line change.
3. **Manual QA matrix** — create `05-QA-MATRIX.md` as a physical-device walk scaffold. M1 testing bar per CLAUDE.md is manual physical-device QA; Phase 5's correctness work needs its own matrix.
4. **Phase-exit verification bundle** — create `05-VERIFICATION.md` recording all automated gate outputs (tsc, jest, 3 phase-gate scripts, D-09 anchor grep counts) as the handoff to `/gsd-verify-work`.

This plan closes the Phase 5 arc. After this plan lands, the phase is ready for `/gsd-verify-work` — the verifier will read 05-VERIFICATION.md + cross-check against the phase's must_haves.

Output:
- App.tsx: 1 prop added to 1 render site (~5-8 lines)
- Property.ts: 1 line added
- 05-QA-MATRIX.md: scaffold for physical-device walk (~80 LOC)
- 05-VERIFICATION.md: regression bundle record (~60 LOC)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md
@.planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md
@.planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md
@.planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md
@.planning/phases/05-listing-form-validation-edit-flow/05-VALIDATION.md
@.planning/phases/04-listing-form-taxonomy-decomposition/04-QA-MATRIX.md
@.planning/phases/04-listing-form-taxonomy-decomposition/04-VERIFICATION.md
@App.tsx
@src/types/Property.ts
@src/screens/ProfileScreen.tsx

<interfaces>
From App.tsx (current state — grep output):
- Line 43: `const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);`
- Line 44: `const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);`
- Line 199: `setIsCreateListingOpen(false);` (inside a useCallback — existing close path)
- Line 264: `setIsCreateListingOpen(false);` (another existing close path)
- Line 438: `const onProfileViewAccountSettings = useCallback(() => setIsAccountSettingsOpen(true), []);` — PRECEDENT for the new pattern
- Line 607: `onViewAccountSettings={onProfileViewAccountSettings}` (render site for ProfileScreen)
- Line 821-840 area: CreateListingScreen render site — this is where the new prop gets wired

From src/screens/ProfileScreen.tsx:18:
```typescript
onViewAccountSettings?: () => void;  // optional prop precedent
```

From src/types/Property.ts (current — needs inspection):
Property type exists but does NOT declare `status` — RESEARCH Open Question #2 recommends adding `status?: 'draft' | 'live'` during Phase 5.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire onNavigateToAccountSettings on CreateListingScreen render site in App.tsx + add status? to Property type</name>
  <files>App.tsx, src/types/Property.ts</files>
  <read_first>
    - App.tsx (lines 815-845 — the CreateListingScreen render site; lines 430-440 — the onProfileViewAccountSettings precedent; line 44 — isCreateListingOpen; line 43 — isAccountSettingsOpen)
    - src/types/Property.ts (full — current Property interface)
    - src/screens/ProfileScreen.tsx (lines 1-30 — optional-prop precedent)
    - .planning/phases/05-listing-form-validation-edit-flow/05-PATTERNS.md §14 (App.tsx nav-wiring contract — transcribe verbatim)
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Finding #8 (prop wiring shape + optional-with-no-op-fallback recommendation)
    - .planning/phases/05-listing-form-validation-edit-flow/05-RESEARCH.md Open Question #2 (Property status field)
  </read_first>
  <action>
    **Edit A — App.tsx — wire onNavigateToAccountSettings on the CreateListingScreen render site:**

    At the CreateListingScreen render block (around lines 821-840), currently the props are:
    ```tsx
    <CreateListingScreen
      onBack={() => {
        setIsCreateListingOpen(false);
        setPropertyToEdit(null);
        setIsAdminVerificationMode(false);
        skipRenterListingsReopenRef.current = false;
      }}
      onSuccess={...}
      propertyToEdit={propertyToEdit || undefined}
      verificationOnly={isAdminVerificationMode}
    />
    ```

    Add a NEW `onNavigateToAccountSettings` prop IMMEDIATELY after `verificationOnly`:
    ```tsx
    <CreateListingScreen
      onBack={...existing...}
      onSuccess={...existing...}
      propertyToEdit={propertyToEdit || undefined}
      verificationOnly={isAdminVerificationMode}
      // Phase 5 D-11: Hospitality contact recovery — close CreateListing, open AccountSettings
      onNavigateToAccountSettings={() => {
        setIsCreateListingOpen(false);
        setPropertyToEdit(null);
        setIsAdminVerificationMode(false);
        setIsAccountSettingsOpen(true);
      }}
    />
    ```

    The callback closes the CreateListing overlay (sets flag false + clears propertyToEdit + clears adminVerificationMode mirroring the existing `onBack` pattern) and opens AccountSettings (mirroring `onProfileViewAccountSettings`). Inline arrow function is acceptable here — consistent with other App.tsx overlay render sites; no need to extract a useCallback unless the executor finds the pattern useful for consistency.

    **DO NOT:**
    - Extract a new top-level `useCallback` (inline is fine — the JSX render isn't in a hot loop; App.tsx's existing overlay render sites mix inline + extracted callbacks).
    - Touch the ProfileScreen render site or its `onProfileViewAccountSettings` callback — Phase 5 adds a parallel sibling callback, doesn't modify existing.
    - Wire `onNavigateToAccountSettings` on the `verificationOnly` branch if it has a separate render path — the admin-minimal verificationOnly branch in CreateListingScreen never triggers Hospitality submit, so the callback is unreachable there and would be dead code.

    **Edit B — src/types/Property.ts — add optional status field:**

    Inspect Property.ts for the existing interface. Add `status?: 'draft' | 'live';` to the Property interface. Place it with the other top-level optional fields (after `description?: string;` or similar — executor picks the semantic position; the exact placement doesn't matter as long as it's inside the interface body).

    Add an inline comment per CONVENTIONS.md §Comments:
    ```typescript
    /** Listing publication state. 'draft' is the author's staging area; 'live' is user-visible. Added Phase 5 D-16 — FORM-08 edit-mode Draft/Publish rule. */
    status?: 'draft' | 'live';
    ```

    After this addition, the Plan 04 `(propertyToEdit as any).status` / `(propertyToEdit as any)?.status` casts MAY be cleanable to plain `propertyToEdit?.status` — executor's discretion whether to clean them in this task or leave as-is for a future pass. Either way, tsc baseline must not regress.

    **After both edits, verify:**
    - `npx tsc --noEmit 2>&1 | wc -l` ≤ 17 (Plan 04 baseline; should drop back to 16 if the status cast cleanup is applied)
    - `./scripts/check-role-grep.sh` exits 0
    - `./scripts/check-i18n-parity.sh` exits 0
    - `./scripts/check-land-removed.sh` exits 0
    - `npm test` exits 0
  </action>
  <verify>
    <automated>grep -c "onNavigateToAccountSettings" App.tsx && grep -c "setIsAccountSettingsOpen(true)" App.tsx && grep -c "status?: 'draft' | 'live'" src/types/Property.ts && grep -c "onViewAccountSettings={onProfileViewAccountSettings}" App.tsx | grep -q "^1$" && npx tsc --noEmit 2>&1 | wc -l | awk '{exit ($1 > 17) ? 1 : 0}' && ./scripts/check-role-grep.sh && ./scripts/check-i18n-parity.sh && ./scripts/check-land-removed.sh && npm test --silent 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "onNavigateToAccountSettings" App.tsx` returns at least `1` (the new prop wire-up on CreateListingScreen render site)
    - `grep -c "setIsCreateListingOpen(false)" App.tsx` returns at least `3` (existing 2 at lines 199 + 264 + new 1 inside onNavigateToAccountSettings callback — may be 2 if the existing one inside onBack is shared; tolerate ≥2)
    - The new `onNavigateToAccountSettings={() => { ... }}` callback calls `setIsAccountSettingsOpen(true)` — verify via: `grep -A5 "onNavigateToAccountSettings={" App.tsx | grep -c "setIsAccountSettingsOpen(true)"` returns at least `1`
    - `grep -c "onViewAccountSettings={onProfileViewAccountSettings}" App.tsx` returns exactly `1` (ProfileScreen precedent untouched)
    - `grep -c "status?: 'draft' | 'live'" src/types/Property.ts` returns exactly `1`
    - `npx tsc --noEmit 2>&1 | wc -l` ≤ 17 (tolerant of 1-line carry from Plan 04)
    - `./scripts/check-role-grep.sh` exits 0
    - `./scripts/check-i18n-parity.sh` exits 0
    - `./scripts/check-land-removed.sh` exits 0
    - `npm test` exits 0
  </acceptance_criteria>
  <done>
    App.tsx CreateListingScreen render site wires `onNavigateToAccountSettings` to a callback that closes CreateListing and opens AccountSettings. Property type declares `status?: 'draft' | 'live'`. All 3 phase-gate scripts exit 0. tsc ≤ 17. Jest suite green.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create 05-QA-MATRIX.md physical-device walk scaffold</name>
  <files>.planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md</files>
  <read_first>
    - .planning/phases/04-listing-form-taxonomy-decomposition/04-QA-MATRIX.md (Phase 4's matrix — use as format analog; 18-cell scaffold with columns for cell, steps, iOS result, Android result, notes)
    - CLAUDE.md (M1 testing bar: manual physical-device QA on iPhone iOS 26 + Moto G Android 16 Fabric)
    - .planning/phases/05-listing-form-validation-edit-flow/05-VALIDATION.md Manual-Only Verifications table (6 behaviors that need device QA)
    - .planning/phases/05-listing-form-validation-edit-flow/05-CONTEXT.md D-01, D-02, D-04, D-05, D-09, D-10, D-11, D-12, D-16 (the decisions that produce device-observable behaviors)
  </read_first>
  <action>
    Create `.planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` as a scaffold (empty result columns) the user will fill during physical-device walk.

    Match Phase 4's matrix format. Include these sections:

    **Header:**
    ```markdown
    # Phase 5 — Manual QA Matrix

    **Purpose:** Physical-device verification of FORM-04, FORM-06, FORM-07, FORM-08 + D-16 status toggle + D-04 scroll-to-error + D-11 Hospitality contact recovery. M1 testing bar per CLAUDE.md.

    **Devices required:**
    - iPhone 15 Pro Max / iOS 26 (admin account: beckprograms@gmail.com + non-admin account)
    - Moto G XT2513V / Android 16 Fabric (admin + non-admin)

    **Fill in:** Results per cell as `PASS`, `FAIL` (with note), or `N/A` (with rationale).
    ```

    **Matrix 1 — FORM-07 category-switch preservation (9 cells × 2 devices = 18 cells):**

    A 3×3 grid — user starts filling fields in category X (rows), then switches to category Y (columns). Verify shared fields (title/description/address/city/district) persist; category-specific fields' values persist in orchestrator state (may be invisible during the intermediate category).

    | From → To | Residential | Commercial | Hospitality |
    |-----------|-------------|------------|-------------|
    | Residential (Apartment) | same-cat: bedrooms/bathrooms/areaSqm persist | switch: shared persist; Commercial shows areaSqm; switch back to Res → bedrooms/bathrooms visible again | switch: shared persist; Hospitality shows rooms/maxGuests/bathrooms; switch back → residential fields visible |
    | Commercial (Office) | — | same-cat: areaSqm persist | — |
    | Hospitality (Hostel) | — | — | same-cat: rooms/bathrooms/maxGuests persist |

    9 unique test steps; results fields per iOS + Android = 18 cells.

    **Matrix 2 — FORM-08 edit-mode + D-16 Draft/Publish rule (6 cells × 2 devices = 12 cells):**

    | # | Cell | Steps | Expected | iOS | Android |
    |---|------|-------|----------|-----|---------|
    | 1 | Create draft Residential, close, reopen in edit → toggle visible, label 'Save as Draft' | 1) Create with status=draft, save. 2) Return to OwnerListings. 3) Tap listing → CreateListing (edit) | Toggle visible; submit button shows 'Save as Draft' | | |
    | 2 | Edit draft Residential, flip toggle to 'live', save → submit label shows 'Publish Listing' | Continue from Cell 1; tap Submit/Live chip | Submit label now 'Publish Listing' (new key) | | |
    | 3 | Edit live Residential (previously published) → toggle hidden, label 'Update Listing' | 1) Ensure listing is published. 2) Open in edit | Toggle section NOT rendered; submit button shows 'Update Listing' | | |
    | 4 | Create draft Commercial → toggle visible (same as Res) | | Same | | |
    | 5 | Create draft Hospitality → toggle visible | | Same | | |
    | 6 | Edit draft Hospitality → toggle visible with Save as Draft label | | Same as Cell 1 for Hospitality | | |

    **Matrix 3 — D-01 inline error rendering + D-04 scroll-to-first-error (5 cells × 2 devices = 10 cells):**

    | # | Cell | Steps | Expected | iOS | Android |
    |---|------|-------|----------|-----|---------|
    | 1 | Submit Residential with empty title → inline red "Title is required" under title; scroll lands on title | Leave all fields empty, tap Submit | Red error text under title; scroll position = top of BasicInfoSection | | |
    | 2 | D-02 clear on keystroke: type one char in title after Cell 1 fail → error clears instantly | Continue from Cell 1 | Red error text vanishes on first keystroke | | |
    | 3 | Submit Commercial missing areaSqm → inline red error + scroll to Commercial section | Fill shared fields, select Office, leave areaSqm empty, tap Submit | Scroll lands near Commercial section; red error under areaSqm | | |
    | 4 | Submit Hospitality missing rooms → inline red error + scroll to Hospitality section | Shared filled, select Hostel, leave rooms empty, tap Submit | Scroll lands near Hospitality section; red error under rooms | | |
    | 5 | D-03 negative check: NO asterisks / NO "required" labels BEFORE first submit attempt | Open fresh create screen | Clean layout; no red indicators until submit fails | | |

    **Matrix 4 — D-11 Hospitality contact hybrid rule (4 cells × 2 devices = 8 cells):**

    | # | Cell | Steps | Expected | iOS | Android |
    |---|------|-------|----------|-----|---------|
    | 1 | D-09 pass-through: all profile contacts empty → Hospitality submit succeeds | 1) In Account Settings, clear all contacts. 2) Create Hostel listing with shared + rooms/bathrooms/maxGuests filled, NO changes to contact. 3) Submit | Listing saves successfully; no Alert | | |
    | 2 | Partial contact (phone only): Hospitality submit → Alert with 'Complete profile' CTA | 1) In profile: set only phone. 2) Create Hostel, submit | Alert.alert with title 'Contact info incomplete', 'Complete profile' button | | |
    | 3 | Tap 'Complete profile' → navigates to AccountSettingsScreen | From Cell 2 result | CreateListing overlay closes; AccountSettings opens | | |
    | 4 | D-12 edit mode same hybrid rule: edit existing Hostel with partial contacts → Alert fires on submit | 1) Create Hostel with full contacts. 2) Clear profile whatsapp. 3) Edit Hostel, tap Submit | Alert fires with same Complete profile CTA | | |

    **Matrix 5 — D-09 anchor preservation regression (3 cells × 2 devices = 6 cells):**

    | # | Cell | Steps | Expected | iOS | Android |
    |---|------|-------|----------|-----|---------|
    | 1 | Non-admin creates listing: panoramicPhotosUrl should be '' in request (admin-gated from UI; preserve anchor on submit) | Log in as non-admin, create Residential, submit | Network request payload contains `panoramicPhotosUrl: ''` — verify via dev console / Proxyman | | |
    | 2 | Non-admin edits admin-set panoramic URL → preserved on save | 1) Admin sets panoramic URL. 2) Switch to non-admin. 3) Edit that listing (shared fields only). 4) Save | Backend shows panoramicPhotosUrl UNCHANGED (not wiped) | | |
    | 3 | Non-admin edits admin-set tours → preserved on save | Same flow, with tours | Backend shows tours UNCHANGED | | |

    **Aggregate summary table (fill at end of walk):**

    | Matrix | Total cells | iOS PASS | Android PASS | FAIL details |
    |--------|-------------|----------|--------------|--------------|
    | 1. FORM-07 switch | 18 | — | — | — |
    | 2. FORM-08 + D-16 | 12 | — | — | — |
    | 3. D-01 + D-04 errors | 10 | — | — | — |
    | 4. D-11 hospitality contact | 8 | — | — | — |
    | 5. D-09 anchor regression | 6 | — | — | — |
    | **Total** | **54** | — | — | — |

    **Notes section at bottom** for deviations, device-specific findings, and any Phase-4 regressions observed.

    **IMPORTANT:** Create the matrix as a SCAFFOLD — leave iOS / Android result columns as empty table cells (dashes or blank). The user fills during the physical-device walk. Do NOT self-approve any cells.
  </action>
  <verify>
    <automated>test -f .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md && wc -l .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md | awk '{exit ($1 < 80) ? 1 : 0}' && grep -c "Matrix 1" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md && grep -c "Matrix 2" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md && grep -c "Matrix 3" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md && grep -c "Matrix 4" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md && grep -c "Matrix 5" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md && grep -c "FORM-07" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md && grep -c "FORM-08" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md && grep -c "D-16" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md && grep -c "D-09" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md</automated>
  </verify>
  <acceptance_criteria>
    - `.planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` exists
    - File has ≥ 80 lines
    - `grep -c "Matrix 1"` returns at least `1` (FORM-07 switch matrix header)
    - `grep -c "Matrix 2"` returns at least `1` (FORM-08 + D-16)
    - `grep -c "Matrix 3"` returns at least `1` (D-01 + D-04)
    - `grep -c "Matrix 4"` returns at least `1` (D-11 hospitality contact)
    - `grep -c "Matrix 5"` returns at least `1` (D-09 anchor regression)
    - `grep -c "FORM-04\|FORM-06\|FORM-07\|FORM-08" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` returns at least `4`
    - `grep -c "D-01\|D-02\|D-04\|D-09\|D-11\|D-16" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` returns at least `6`
    - Result columns present but empty (scaffold status): `grep -c "| iOS | Android |" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` returns at least `4` (one per result-column matrix)
    - Aggregate summary table present: `grep -c "Total cells" .planning/phases/05-listing-form-validation-edit-flow/05-QA-MATRIX.md` returns at least `1`
  </acceptance_criteria>
  <done>
    05-QA-MATRIX.md scaffold exists with 5 matrix sections (FORM-07 switch, FORM-08/D-16, D-01/D-04 errors, D-11 contact, D-09 anchors) covering 54 device-cells (27 unique × 2 devices). Result columns empty for user fill during physical-device walk.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create 05-VERIFICATION.md phase-exit regression bundle</name>
  <files>.planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md</files>
  <read_first>
    - .planning/phases/04-listing-form-taxonomy-decomposition/04-VERIFICATION.md (phase-exit format precedent)
    - .planning/phases/05-listing-form-validation-edit-flow/05-VALIDATION.md (per-plan automated gate map)
    - .planning/ROADMAP.md §"Phase 5" (5 success criteria to attest)
  </read_first>
  <action>
    Create `.planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md` recording all automated gate outputs at phase exit. This is NOT the manual QA results (those live in 05-QA-MATRIX.md). This is the automated regression bundle.

    Sections to include (follow Phase 4's 04-VERIFICATION.md format):

    **Header:**
    ```markdown
    # Phase 5 — Verification Bundle

    **Generated:** <timestamp at task exit>
    **Purpose:** Automated regression bundle for phase-exit gate. Cross-checked against phase must_haves by /gsd-verify-work.
    **Branch:** main (or phase branch per config)
    **Scope:** Phase 5 listing-form-validation-edit-flow — FORM-04 / FORM-06 / FORM-07 / FORM-08 + D-16 user-reported bug
    ```

    **Section 1 — Automated gates (fill at run-time):**
    ```markdown
    ## Automated Gates

    Run each gate below. Paste the exit code + tail output for each.

    ### 1.1 TypeScript compile (tsc)
    Command: `npx tsc --noEmit 2>&1 | wc -l`
    Baseline (Phase 4 exit): 16 lines
    Target: ≤ 17 lines (1-line tolerance for any Property.status cast carry-over)
    Exit: __ lines
    Status: __ (PASS / FAIL)
    If > 17: diff against Phase 4 baseline and list new error lines.

    ### 1.2 Jest full suite
    Command: `npm test 2>&1 | tail -5`
    Baseline (Phase 4 exit): 22 tests / 5 suites green
    Target: ≥ 44 tests green (22 baseline + ≥22 validators from Plan 01)
    Actual: __ tests / __ suites — __ green, __ failed
    Status: __

    ### 1.3 i18n parity (scripts/check-i18n-parity.sh)
    Command: `./scripts/check-i18n-parity.sh && echo "EXIT:$?"`
    Target: EXIT:0
    Actual: __
    Status: __

    ### 1.4 Role-grep gate (scripts/check-role-grep.sh)
    Command: `./scripts/check-role-grep.sh && echo "EXIT:$?"`
    Target: EXIT:0 (Phase 3 D-14 invariant)
    Actual: __
    Status: __

    ### 1.5 Land-removed gate (scripts/check-land-removed.sh)
    Command: `./scripts/check-land-removed.sh && echo "EXIT:$?"`
    Target: EXIT:0 (Phase 4 FORM-01 invariant)
    Actual: __
    Status: __
    ```

    **Section 2 — D-09 anchor grep invariants:**
    ```markdown
    ## D-09 Anchor Preservation (Phase 3 → Phase 4 → Phase 5 carry)

    | Anchor | Before Phase 5 (Phase 4 exit) | After Phase 5 | Target |
    |--------|-------------------------------|---------------|--------|
    | A. Rehydrate (`setPanoramicPhotosUrl(propertyToEdit.panoramicPhotosUrl \|\| '')`) in CreateListingScreen.tsx | 1 | __ | ≥ 1 |
    | B. Payload panoramicPhotosUrl (`panoramicPhotosUrl:`) | 1 in CreateListingScreen.tsx | 0 in CLS + 1 in validators.ts | 1 in validators.ts |
    | C. Payload tours ternary (`tours.length > 0`) | 1 in CreateListingScreen.tsx | 0 in CLS + 1 in validators.ts | 1 in validators.ts |

    Commands:
    ```bash
    grep -c "setPanoramicPhotosUrl(" src/screens/CreateListingScreen.tsx
    grep -c "panoramicPhotosUrl:" src/screens/CreateListingScreen.tsx
    grep -c "panoramicPhotosUrl:" src/components/CreateListingForm/validators.ts
    grep -c "tours.length > 0" src/screens/CreateListingScreen.tsx
    grep -c "tours.length > 0" src/components/CreateListingForm/validators.ts
    ```

    Paste actual counts below each command. Status: __
    ```

    **Section 3 — FORM-06 single-source-of-truth invariant:**
    ```markdown
    ## FORM-06 Single Source of Truth

    Old Alert.alert validation checks (must be ZERO):
    ```bash
    grep -cE "Alert\\.alert\\(t\\('common\\.error'\\), t\\('createListing\\.(title|address|currency|price)Required'\\)\\)" src/screens/CreateListingScreen.tsx
    ```
    Target: 0
    Actual: __

    Validator call-sites:
    ```bash
    grep -c "validateByCategory" src/screens/CreateListingScreen.tsx
    grep -c "buildPayloadByCategory" src/screens/CreateListingScreen.tsx
    ```
    Target: ≥ 2 each (import + call)
    Actual: __
    ```

    **Section 4 — D-16 Status toggle rule:**
    ```markdown
    ## D-16 Status Toggle Visibility + Submit Label

    Visibility guard:
    ```bash
    grep -c "propertyToEdit?.status === 'draft' || !isEditMode\|!isEditMode || propertyToEdit?.status === 'draft'" src/screens/CreateListingScreen.tsx
    ```
    Target: ≥ 1
    Actual: __

    publishListing label usage:
    ```bash
    grep -c "createListing.publishListing" src/screens/CreateListingScreen.tsx
    grep -c "createListing.publishListing" src/locales/en.ts
    grep -c "createListing.publishListing" src/locales/ru.ts
    ```
    Target: 1 / 1 / 1
    Actual: __
    ```

    **Section 5 — Phase 5 Must-Haves cross-check:**

    List the phase-level must_haves (from Plan 01 frontmatter + all other plans' must_haves aggregated), attest each as PASS / PARTIAL / FAIL with evidence (grep command + output). Target: 5 of 5 PASS matching ROADMAP.md Phase 5's 5 success criteria.

    1. Per-category required-field branching (FORM-04) — evidence: validators.test.ts Residential/Commercial/Hospitality describe blocks all green in jest output
    2. Single validateByCategory() source of truth (FORM-06) — evidence: grep old Alert.alert = 0, new validateByCategory call = 1
    3. Category switch preserves shared fields (FORM-07) — evidence: architecture unchanged from Phase 4 (orchestrator useState persists); manual QA Matrix 1 attests
    4. Edit mode initializes correct category (FORM-08) + D-16 — evidence: grep propertyToEdit?.status guard present + manual QA Matrix 2 attests
    5. Hospitality saves under Rent and Sell without price leak — evidence: buildPayloadByCategory Hospitality branch does NOT include price/currency (validators.test.ts "Hospitality payload does NOT contain price/currency" assertion)

    **Section 6 — Phase-entry to Phase-exit delta:**

    Record: LOC delta on CreateListingScreen.tsx (Phase 4 exit 871 → Phase 5 exit ???); validators.ts + validators.test.ts new; i18n keys added (14 EN + 14 RU).

    **Section 7 — Handoff to /gsd-verify-work:**

    ```markdown
    ## Handoff to /gsd-verify-work

    - [ ] All automated gates PASS (§1)
    - [ ] D-09 anchors preserved (§2)
    - [ ] FORM-06 single source of truth enforced (§3)
    - [ ] D-16 Status rule implemented (§4)
    - [ ] 5/5 phase must_haves attested (§5)
    - [ ] Manual QA Matrix 05-QA-MATRIX.md walked on physical iOS + Android — results recorded separately

    Next: `/gsd-verify-work 5` to close Phase 5.

    Open follow-ups (NOT blocking):
    - Phase 6 amenity validation + payload inclusion (D-13/D-14 handoff)
    - WR-02 regex fix for check-i18n-parity.sh (digit-containing keys silently skipped — quick fix for Phase 8 or earlier)
    ```

    **IMPORTANT:** Most grep/command outputs are PLACEHOLDERS (`__`). The executor RUNS the commands and FILLS the placeholders with actual output. The "Status: __" cells get PASS / FAIL. If any gate FAILs, the phase is NOT ready for /gsd-verify-work; escalate.
  </action>
  <verify>
    <automated>test -f .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md && wc -l .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md | awk '{exit ($1 < 60) ? 1 : 0}' && grep -c "Automated Gates" .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md && grep -c "D-09 Anchor Preservation" .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md && grep -c "FORM-06 Single Source of Truth" .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md && grep -c "D-16 Status Toggle" .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md && grep -c "Phase 5 Must-Haves" .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md && grep -c "Handoff to /gsd-verify-work" .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md && grep -c "validateByCategory" .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md && grep -c "buildPayloadByCategory" .planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md && npx tsc --noEmit 2>&1 | wc -l | awk '{exit ($1 > 17) ? 1 : 0}' && ./scripts/check-role-grep.sh && ./scripts/check-i18n-parity.sh && ./scripts/check-land-removed.sh && npm test --silent 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `.planning/phases/05-listing-form-validation-edit-flow/05-VERIFICATION.md` exists with ≥ 60 lines
    - Contains "Automated Gates" header (≥ 1 match)
    - Contains "D-09 Anchor Preservation" header (≥ 1 match)
    - Contains "FORM-06 Single Source of Truth" header (≥ 1 match)
    - Contains "D-16 Status Toggle" header (≥ 1 match)
    - Contains "Phase 5 Must-Haves" cross-check section (≥ 1 match)
    - Contains "Handoff to /gsd-verify-work" section (≥ 1 match)
    - References `validateByCategory` at least 2 times (in commands + must-have cross-check)
    - References `buildPayloadByCategory` at least 1 time
    - Includes the exact grep commands needed (parseable by executor at runtime)
    - The FIVE phase-level success criteria from ROADMAP.md §Phase 5 appear in the Must-Haves section with evidence hooks
    - All 3 phase-gate scripts exit 0 (automated gate outputs valid to paste into the scaffold)
    - `npm test` exits 0
    - tsc ≤ 17
  </acceptance_criteria>
  <done>
    05-VERIFICATION.md scaffold exists with all 7 sections; contains runnable grep/bash commands the executor can invoke to fill placeholders; 5-of-5 phase success criteria have evidence hooks. All 3 phase-gate scripts still exit 0; tsc ≤ 17; full jest suite green. Phase 5 is ready for `/gsd-verify-work 5`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CreateListingScreen overlay → AccountSettings overlay | App.tsx state machine mediates the transition. No secret/PII crosses (only open/close boolean flags). |
| Property type extension | Compile-time only; no runtime change. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-05-01 | Tampering | App.tsx callback | mitigate | Inline callback captures `setIsCreateListingOpen`/`setIsAccountSettingsOpen` from App.tsx lexical scope — not user-supplied. Callback shape matches the existing `onProfileViewAccountSettings` precedent which has shipped since Phase 3+. |
| T-05-05-02 | Information Disclosure | QA matrix + verification file | accept | Planning docs only; no secrets. User-curated during physical-device walk. |
| T-05-05-03 | Elevation of Privilege | Property.status field | mitigate | Type-only addition; no runtime dispatch on status. Visibility rule at `CreateListingScreen.tsx:701` is UI-only — backend owns authoritative status (accepted risk UNCONFIRMED-AT-SHIP per D-22). |
| T-05-05-04 | Denial of Service | App.tsx render site | accept | Inline callback is allocated on every App render — same cost profile as existing overlay callbacks. No DoS surface. |
| T-05-05-05 | Repudiation | N/A | accept | No logging in these edits. |
| T-05-05-06 | Spoofing | N/A | accept | No identity surface in nav-wiring. |
</threat_model>

<verification>
End-of-plan checks:

1. **App.tsx wiring landed:** `grep -c "onNavigateToAccountSettings" App.tsx` ≥ 1; the callback body calls `setIsAccountSettingsOpen(true)`.
2. **Property type has status field:** `grep -c "status?: 'draft' | 'live'" src/types/Property.ts` = 1.
3. **QA matrix scaffold created:** 05-QA-MATRIX.md exists with 5 matrix sections covering 54 device-cells.
4. **Verification bundle scaffold created:** 05-VERIFICATION.md exists with 7 sections + runnable grep commands + 5-of-5 must-have cross-check hooks.
5. **All 3 phase-gate scripts exit 0:** role-grep, i18n-parity, land-removed.
6. **tsc baseline:** ≤ 17 lines (ideally dropping back to 16 if the Plan 04 status-cast workaround was cleaned up; tolerate 17).
7. **Jest suite:** ≥ 44 tests green.
8. **Phase 4 regression check (executor may want to re-run these from Phase 4's VERIFICATION.md):**
   - `grep -c "<Gated" src/components/CreateListingForm/MediaSection.tsx` = 2 (Phase 3 Gated wraps in Media preserved)
   - `grep -c "<Gated action=\"editVerifications\">" src/screens/CreateListingScreen.tsx` = 1 (in-orchestrator wrap preserved)
   - `grep -c "from '../components/CreateListingForm'" src/screens/CreateListingScreen.tsx` = 1 (barrel consumer preserved)
</verification>

<success_criteria>
- App.tsx wires `onNavigateToAccountSettings` on CreateListingScreen render site (D-11 recovery nav active)
- Property type declares `status?: 'draft' | 'live'`
- 05-QA-MATRIX.md exists as a 5-section / 54-cell scaffold for physical-device walk
- 05-VERIFICATION.md exists as a 7-section automated regression bundle with runnable commands
- All 3 phase-gate scripts exit 0
- tsc baseline ≤ 17 lines
- Full Jest suite ≥ 44 tests green
- Phase 5 is ready for `/gsd-verify-work 5`
</success_criteria>

<output>
Create `.planning/phases/05-listing-form-validation-edit-flow/05-05-SUMMARY.md` with:
- App.tsx lines touched (target: +5 to +8)
- Property.ts lines touched (target: +2)
- 05-QA-MATRIX.md created (line count, matrix count, cell count)
- 05-VERIFICATION.md created (line count, section count)
- tsc baseline line count
- Jest pass count
- All 3 phase-gate script exit codes
- Signal: Phase 5 coded work is complete; user walks 05-QA-MATRIX.md on physical iOS + Android; on all-PASS, runs `/gsd-verify-work 5` to close phase. Defects route to targeted fix commit or deferred-with-rationale per user approval (CLAUDE.md M1 testing bar).
</output>
