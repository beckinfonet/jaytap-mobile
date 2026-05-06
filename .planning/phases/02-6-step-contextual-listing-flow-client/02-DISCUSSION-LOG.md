# Phase 2: 6-Step Contextual Listing Flow (Client) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 02-6-step-contextual-listing-flow-client
**Areas discussed:** Form state + validation architecture, Step 2 location capture (district + map pin), Container shape + flow navigation in App.tsx, Edit-on-behalf wiring + submit destination, Step 6 daily-rent treatment, Mod banner persistence

---

## Form state + validation architecture

### Form library

| Option | Description | Selected |
|--------|-------------|----------|
| useState + pure validateStep() | Mirrors M1 Phase 5; zero new deps; chip-enum-heavy steps don't need RHF/zod | ✓ |
| react-hook-form + zod | CLAUDE.md "if adopted" path; STACK pinned at RHF@7.73+ + zod@^3.24 | |
| Hybrid — RHF for state, hand-rolled validateStep | Splits the difference but pays for RHF without using its validation | |

**User's choice:** useState + pure validateStep() (Recommended).

### State location

| Option | Description | Selected |
|--------|-------------|----------|
| Single `<ContextualListingFlow>` orchestrator | One useState for the whole FormBag at the container; `values, onChange, errors` props (mirrors M1 Phase 4 SectionProps) | ✓ |
| React Context provider scoped to the flow | `useListingForm()` hook for descendants; useful if step components want to read sibling state | |
| Per-step local state, lifted on Next | Each step owns its slice; Back-navigation rehydration is fiddly | |

**User's choice:** Single orchestrator (Recommended).

### Currency token storage in FormBag

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt SPEC tokens from day 1 in new flow | FormBag uses `'KGS' \| 'USD' \| 'EUR'`; clean break aligned with Phase 1 atomic-break | ✓ |
| Keep M1 tokens internally, translate at submit | FormBag still has `'$' \| 'сом' \| '€'`; payload builder translates to canonical | |
| Dual-write in FormBag | Belt-and-suspenders; pure tax | |

**User's choice:** Adopt SPEC tokens from day 1 (Recommended).

### Test scope for Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| validateStep unit tests + a few RTL component smokes | Unit + light RTL; matches M1 Phase 5 testing posture | ✓ |
| validateStep unit tests only | Skip RTL; rely on Phase 5 device QA | |
| Full RTL coverage per step + integration test of full flow | Heaviest; pays off if regression risk is high | |

**User's choice:** Unit + RTL smokes (Recommended).

---

## Step 2 location capture (district + map pin)

### District handling — starter list + user-extensibility shape

| Option | Description | Selected |
|--------|-------------|----------|
| Starter chips + per-listing free-text "Other" | Hardcoded starter chips per city; "Other" reveals TextInput; per-listing string only | |
| Backend dictionary with mod-approval flow | `GET /districts/:city` returns approved list; "Other" → POST creates pending; mod approves via queue | ✓ |
| Pure free-text TextInput (no chips at all) | Universal; loses chip-discovery; worse UX | |

**User's choice:** Backend dictionary with mod-approval flow.
**Notes:** User pushed back on the original "API option is reject" framing; clarified that user-extensibility (custom districts during listing creation if app doesn't offer the district) is a core requirement because users may create listings in any district within Central Asia. The reformulation surfaced three real shapes (per-listing free-text, backend dictionary, pure free-text) and the user picked the persistent dictionary path.

### City coverage / handling

| Option | Description | Selected |
|--------|-------------|----------|
| Starter chips for known KG/KZ/UZ cities + "Other" free-text | Chip row of seed cities; "Other" reveals TextInput; per-listing string | |
| Pure autocomplete TextInput against a static city list | Typeahead; no chips; scales to dozens of cities | |
| Backend cities API + mod-approval flow | Symmetric with district option B | ✓ |

**User's choice:** Backend cities API + mod-approval flow (symmetric to districts).
**Notes:** Same geographic-scope rationale — Central Asia has many smaller cities beyond Bishkek/Almaty/Tashkent, and user wants to support listings in any of them.

### Map pin interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Draggable Marker on a MapView centered on city default | Native UX; matches Airbnb/Avito | |
| Tap-anywhere-to-drop-pin (`onPress` writes coords) | Simpler model; less discoverable | |
| Both — tap to drop initially, then drag to refine | More forgiving onboarding; more code paths | (initial selection) |
| `react-native-maps` draggable Marker + tap-to-drop, REQUIRED | Same library as PropertyMap.tsx; tap initial + drag refine; coordinates required (FLOW-05 verbatim) | ✓ |
| `react-native-maps` pin, but OPTIONAL (city centroid as fallback) | Step 2 advances even without a pin; centroid as default | |
| Defer all map UX to M4 (2GIS bridge milestone) | Step 2 collects city+district only; coords default to centroid | |
| MapLibre GL Native (new map dep, OSM tiles) | Open-source path; two map libs in repo | |

**User's choice:** `react-native-maps` draggable Marker + tap-to-drop initial; coordinates REQUIRED.
**Notes:** User asked which map library can support tap-to-drop + drag-to-refine. They mentioned the current map seemed to have coordinate issues and that they were advised to build a 2GIS bridge for better coordinates and integration. They explicitly authorized making map logic OPTIONAL (defer to M4) if the feature was too big to fit. Resolution: `react-native-maps` already ships in the codebase (read-only PropertyMap.tsx + PropertyDetailsScreen) and supports both `<Marker draggable>` and `MapView onPress`. Coordinate accuracy is the user's eyes (visual placement on map), not relying on POI labels — eliminates the Nominatim hang issue per memory `geocoder-nominatim-hang-axios-network-error.md`. 2GIS bridge deferred to M4 as a coordinated read+write swap per `2GIS_BRIDGE_PLAN.md` (PROJECT.md Out of Scope).

### Map default center on Step 2 entry

| Option | Description | Selected |
|--------|-------------|----------|
| Center on selected city's coords | City chip selection sets initial map region; recenter on switch | ✓ |
| Always Bishkek default | Awkward when Almaty/Tashkent listings come online | |
| Use device location if granted, else city default | Adds permission prompt; heavy for small UX gain | |

**User's choice:** Center on selected city's coords (Recommended).

### Districts/cities backend dictionary — phase

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 2 — ships with the user-facing chip + Other flow | Backend Location model + endpoints + mod queue tab + seed migration land in Phase 2 | ✓ |
| Phase 3 — ships alongside the mod media-curation queue extension | Phase 2 falls back to hardcoded chips + per-listing free-text in the gap | |
| Split — Phase 2 endpoints + chip UI; Phase 3 mod-approval queue tab | Hybrid; effectively same UX as Phase 3 in the gap window | |

**User's choice:** Phase 2 (Recommended).

### Seed data source

| Option | Description | Selected |
|--------|-------------|----------|
| Planner drafts a starter list for your review | Researcher pulls from public sources; user reviews on PR | ✓ |
| I'll provide the canonical starter list | User supplies; most accurate; blocks planner | |
| Bishkek-only starter; everything else is user-added | Lightest seed; slowest organic growth | |

**User's choice:** Planner drafts starter list (Recommended).

### HomeScreen's existing district filter — swap or stay?

| Option | Description | Selected |
|--------|-------------|----------|
| Leave hardcoded in Phase 2; swap in M4 | Phase 2 reads new shape but filter chip source stays on existing const | ✓ |
| Swap in Phase 2 — Home filter reads `GET /api/locations/...` | Heavier scope; ties Home to endpoint perf | |
| Add to ROADMAP as a Phase 6 (new) hardening pass | Track explicitly as next-milestone work | |

**User's choice:** Leave hardcoded; swap in M4 (Recommended).

---

## Container shape + flow navigation in App.tsx

### Read-path client cutover scope

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into Phase 2 (per Phase 1 CONTEXT) | Phase 2 updates 6 read surfaces to nested shape; atomic-break window closes when Phase 2 ships | ✓ |
| Insert a Phase 1.5 "client read-path cutover" before Phase 2 | Decimal phase ships ONLY the read-path swap | |
| Defer read paths to Phase 5 hardening pass | Atomic-break window stays open until Phase 5; reject | |

**User's choice:** Fold into Phase 2 (Recommended).

### Container shape — how does `<ContextualListingFlow>` mount in App.tsx?

| Option | Description | Selected |
|--------|-------------|----------|
| Single overlay flag with internal step-index state | One App.tsx flag; component owns its own `currentStep` state | ✓ |
| Six App.tsx booleans (`isFlowStep1Open` … `isFlowStep6Open`) | Each step is a top-level overlay; worsens App.tsx's 1215-LOC budget; reject | |
| Single flag + step routed via separate `currentStep` state in App.tsx | Splits flow state across App.tsx and component | |

**User's choice:** Single overlay flag with internal step-index state (Recommended).

### Mid-flow back / discard handling

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm modal on flow exit only; in-flow Back is silent | Tap Back at Step 2-6 silent; X / Step 1 hardware back shows discard confirm | ✓ |
| AsyncStorage draft persistence (resume on next open) | Form auto-saved per step; "Resume draft?" on next open; new edge cases | |
| No confirm — just exit; no draft | Lightest; biggest data-loss footgun | |

**User's choice:** Confirm modal on exit only; in-flow Back silent (Recommended).

### Progress indicator visual style

| Option | Description | Selected |
|--------|-------------|----------|
| "Step N of 6" text + segmented progress bar | Standard wizard pattern; visual scan + explicit count | ✓ |
| "Step N of 6" plain text only | Smallest diff, least visual feedback | |
| Circular pip indicator (six dots, current animated) | Distinctive but more bespoke to test/accessibility-audit | |

**User's choice:** Text + segmented progress bar (Recommended).

---

## Edit-on-behalf wiring + submit destination

### Edit/mod-edit component shape

| Option | Description | Selected |
|--------|-------------|----------|
| Single component with `mode: 'create' \| 'edit-owner' \| 'edit-mod'` + `initialListing?` | One orchestrator; mode affects banner + submit + cancel only | ✓ |
| Two orchestrators (`<CreateListingFlow>` + `<EditListingFlow>`) sharing step components | Cleaner mental separation; ~2x orchestrator LOC | |
| Single component, mode inferred from prop presence | Implicit; harder to grep for mode-specific logic | |

**User's choice:** Single component with explicit mode (Recommended).

### Initial values mapping for edit mode

| Option | Description | Selected |
|--------|-------------|----------|
| Pure adapter `propertyToFormBag(p: Property): FormBag` in a sibling util | Pure function; unit-testable; reused by mod and owner edit | ✓ |
| Inline initialization inside the orchestrator's useState initializer | Big object literal; less clean to test | |
| Per-step initialization functions (each step pulls its slice) | Distributes mapping; more places to break consistency | |

**User's choice:** Pure adapter (Recommended).

### Submit success destination per mode

| Option | Description | Selected |
|--------|-------------|----------|
| Owner create → RenterListings 'pending' tab; owner edit → same; mod-edit → ModerationQueueScreen | Matches M2 RenterListings 4-tab + moderationCountRefreshKey patterns | ✓ |
| Owner create → PropertyDetailsScreen of new listing; owner edit → same; mod → queue | Stronger feedback loop; needs empty-state for not-yet-photographed listings | |
| Owner paths → HomeScreen with success toast; mod → queue | Lightweight feedback; loses "see your pending listing" affordance | |

**User's choice:** RenterListings 'pending' tab + ModerationQueueScreen (Recommended).

### Old `CreateListingScreen.tsx` deletion timing

| Option | Description | Selected |
|--------|-------------|----------|
| Last commit of Phase 2 (after new flow is verified working) | Plans build new flow + read-path cutover; final plan deletes old screen | ✓ |
| First commit of Phase 2 (TDD-style: delete first, build replacement) | Repo briefly has zero working create-listing screen | |
| Same commit as the new flow's final wire-up to App.tsx | Strongest atomicity; single huge diff harder to code-review | |

**User's choice:** Last commit (Recommended).

---

## Step 6 daily-rent treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as a separate step (predictable structure) | Daily rent users see Step 6 with just deposit field; matches SPEC's own recommendation | ✓ |
| Merge into Step 5 for daily-rent only | Deposit input renders below description on Step 5; Step 6 skipped | |
| Make Step 6 dynamic — daily-rent shows richer screen | Scope creep; reject | |

**User's choice:** Keep as separate step (Recommended).

---

## Mod-context banner persistence across Step 1–6

| Option | Description | Selected |
|--------|-------------|----------|
| Banner persists at TOP of every step (Step 1–6) | Layout-level component above step body; matches M1+M2 pattern | ✓ |
| Banner only on Step 1 (literal ROADMAP SC #5 reading) | Strict reading; mod loses visual reminder Step 2-6 | |
| Banner on Step 1 + smaller indicator on Step 2-6 | Compromise; more design + i18n work | |

**User's choice:** Persists across all steps (Recommended).

### i18n keys for mod banner

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse M2's existing `moderation.editOnBehalf.banner` (and `.reason`) keys | Already in EN+RU; zero parity-gate work | ✓ |
| New keys under `contextualListing.modBanner.*` namespace | Adds 2-4 key pairs; no real copy improvement | |

**User's choice:** Reuse M2's keys (Recommended).

---

## Claude's Discretion

The following items were explicitly deferred to planner discretion (see `02-CONTEXT.md` §"Claude's Discretion"):

- Step 1 layout (both chips simultaneously vs sequential reveal — recommend simultaneous)
- Mod queue location-curation tab UI (label, sort order, reject-reason copy, action footer style)
- `Location` model unified vs split (recommend split: City + District)
- Slug generation strategy (lowercase + diacritic-strip + trim; Cyrillic-only edge case)
- Mod-rejection 30-day blocklist for repeated user-rejected location names (Phase 2 vs hardening pass)
- City-of-other → centroid derivation (user drops pin first vs backend computes from first listing's pin)
- Step 2 chip row layout when KG/KZ/UZ approved cities exceed ~6 (horizontal scroll vs wrap vs autocomplete swap)
- Map provider on Android (verify Google Maps API key in AndroidManifest.xml)
- Error scroll-to-first-error pattern (mirror M1 Phase 5 D-04 FIELD_ORDER_BY_CATEGORY pattern)
- Empty state when no approved districts exist for a selected city
- Nested-shape compat in `HospitalitySection.tsx` derivation (likely `dealType !== 'sale'` for the rent strip)

---

## Deferred Ideas

The following ideas surfaced during discussion but belong outside Phase 2 (see `02-CONTEXT.md` §"Deferred Ideas" for the full list):

- 2GIS native map bridge — M4+ per `2GIS_BRIDGE_PLAN.md`
- MapLibre GL Native — rejected; second map lib stack
- HomeScreen district filter dynamic-from-dictionary swap — M4+
- AsyncStorage draft persistence — rejected; re-evaluate in M4+ if user feedback demands
- `react-hook-form` + `zod` adoption — STACK.md "if adopted" stays adoption-ready but unused
- City-of-other → centroid via backend computation from first listing's pin — planner discretion
- City-or-district auto-translate (RU↔EN) — out of Phase 2 scope
- KZT + UZS currency support — M4+ market expansion
