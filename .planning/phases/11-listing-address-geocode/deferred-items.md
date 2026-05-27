# Phase 11 — Deferred Items

Out-of-scope discoveries surfaced during Phase 11 plan execution that are NOT being fixed in this phase.

## 1. PropertyCard.test.tsx — 5 pre-existing Phase-8 specs-strip assertion failures

- **Surfaced during:** Plan 11-05 Task 3 jest sentinel.
- **Test file:** `src/components/__tests__/PropertyCard.test.tsx`
- **Failing cases:** Phase-8 specs-strip anatomy DISP-01 / DISP-02 / DISP-05 — Cases 1, 2, 3, 4, 5 (all 5 cases in the describe block).
- **Symptom:** Tests expect labels `property.specs.bedrooms` / `property.specs.bathrooms` and the `'-'` placeholder in the rendered output; they aren't present in `collectTexts(tree)` output (the rendered tree contains `property.forRent`, `property.price`, `property.statusBadge.live.rent`, `Test`, the numeric value, and the `↗` glyph — but NOT the specs-strip text or '-' fallback).
- **Pre-existing:** Verified via `git stash && npx jest ... && git stash pop` against base commit `232fdd7` — 5/5 failed BEFORE Plan 11-05 edits. NOT a Phase 11 regression.
- **Scope decision:** OUT OF SCOPE for Phase 11. Phase 11 owns address-geocode read/write path (frontmatter `tags: [rn-client, i18n, display, read-path]`); the failing assertions are M5-era specs-strip rendering and unrelated to `location.address`. Per `<deviation_rules>` scope boundary: do NOT fix issues not directly caused by current task changes.
- **Owner:** Future cleanup plan (M6 likely; suggest a "tests baseline" hygiene plan when 17-error TSC baseline + these 5 jest failures get addressed together).

## 2. TSC 17-error baseline (pre-existing M3 brownfield)

- **Surfaced during:** Every Phase 11 plan TSC check.
- **Errors live in:** `ChatComposeScreen.tsx` (6 errors on Property.imageUrl / images / title), `ChatScreen.tsx` (1 on title), `ScheduleViewingScreen.tsx` (1 on title), `TourSelectionScreen.tsx` (2 on missing Tour export + Property.tours), `DeleteListingModal.tsx`, `StepperInput.test.tsx`, `ThemeContext.tsx`, etc.
- **Pre-existing:** Documented as 17-error baseline in Plan 11-04 SUMMARY (line 91-95) and the Plan 11-05 plan body (line 365–366). Phase 11 plans hold this baseline constant; they do NOT add new errors.
- **Scope decision:** OUT OF SCOPE for Phase 11. Surfaces are legacy `Property.title` / `Property.imageUrl` / `Property.tours` reads against the M3 nested shape — a brownfield Property-shape migration is the right cleanup vehicle.
- **Owner:** M6 brownfield-cleanup phase or a targeted "Property shape migration" plan.
