---
id: 260525-eva
type: quick
status: complete-pending-user-qa
created: 2026-05-25
completed: 2026-05-25
one_liner: "Photos tile in the 2x2 action grid under the 3D Virtual Tour card now gates on a dedicated `getTourPhotosUrl(property)` reader instead of misusing `media.photos[0]`; tile stays visually + functionally disabled today (no schema field yet) and becomes a one-line edit point when the schema decision lands."
key_files:
  created:
    - src/utils/getTourPhotosUrl.ts
    - src/utils/__tests__/getTourPhotosUrl.test.ts
  modified:
    - src/screens/PropertyDetailsScreen.tsx
commits:
  - hash: d34c821
    type: feat
    title: "feat(quick-260525-eva): add getTourPhotosUrl reader (returns undefined today)"
  - hash: f8bac08
    type: fix
    title: "fix(quick-260525-eva): gate Photos tile on getTourPhotosUrl, drop media.photos[0] misroute"
tags:
  - bug-fix
  - propertydetailsscreen
  - tour3d
  - schema-cutover-prep
---

# Quick Task 260525-eva — Fix Photos button under 3D Virtual Tour — SUMMARY

## What shipped

The small **Photos** tile in the 2x2 action grid (Instagram / **Photos** / Videos / Message) immediately below the 3D Virtual Tour hero card on `PropertyDetailsScreen` no longer misroutes `media.photos[0]` (a regular hero JPG) into the `Tour3DScreen` WebView.

It now gates on a new thin reader `getTourPhotosUrl(property)`, which returns `undefined` today — and so the tile sits in the same visually + functionally disabled state as the Instagram tile when `instagramUrl` is absent. When a tour-photos URL field is added to the nested `Property` schema in a future milestone, **only `getTourPhotosUrl.ts` needs to change** — the tile, its disabled-state styling, the `setActivePhotosUrl` overlay wiring, and the Tour3D WebView all light up automatically.

## Tasks executed

| Task | Description                                                                  | Commit  | Files                                                                                              |
| ---- | ---------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| 1    | Add the thin reader + co-located test (4 cases pinning current behavior)     | d34c821 | `src/utils/getTourPhotosUrl.ts` (NEW), `src/utils/__tests__/getTourPhotosUrl.test.ts` (NEW)        |
| 2    | Wire `PropertyDetailsScreen.tsx` Photos tile through the reader + update comment | f8bac08 | `src/screens/PropertyDetailsScreen.tsx` (import + IIFE body + block comment)                       |

## Verification results

### Task 1

- `npx jest src/utils/__tests__/getTourPhotosUrl.test.ts` → **4/4 pass**
  - returns undefined for an empty property
  - returns undefined when `media.photos` is populated (no misuse of the photo carousel as fallback — that was the original bug)
  - returns undefined when `media.tourUrl` is populated (does not duplicate the 3D Virtual Tour target)
  - returns undefined when `instagramUrl` is populated
- `npx tsc --noEmit` → 0 errors mentioning `getTourPhotosUrl.ts` or its test. All errors surfaced are pre-existing (App.tsx `Property.tours`, DeleteListingModal `title`/`address`, ChatComposeScreen `imageUrl`/`title`, ChatScreen `title`, ScheduleViewingScreen `title`, TourSelectionScreen `Tour`/`tours`, ThemeContext `ColorSchemeName`). Same baseline as the M3 close — matches the memory note `260515-iqi` ("3 pre-existing App.tsx Property.tours errors untouched").

### Task 2

- `npx tsc --noEmit` → **0 errors mention `PropertyDetailsScreen.tsx`**. Full error set unchanged from baseline.
- `npx jest --testPathPattern='PropertyDetailsScreen|getTourPhotosUrl'` → **6/6 pass across 2 suites**
  - `src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx` — existing, unchanged behavior
  - `src/utils/__tests__/getTourPhotosUrl.test.ts` — new, all 4 cases green

## Plan must-haves — confirmation

All five truths from the plan frontmatter are now true:

1. **No JPG-in-WebView misroute.** `photoTarget = getTourPhotosUrl(property)` returns `undefined` today, so `photoActive` is false, so `onPress={undefined}` and `disabled={true}` on the tile. Tapping it is a no-op (no `setActivePhotosUrl`, no Tour3D WebView push, no toast).
2. **Disabled state mirrors the Instagram tile pattern verbatim.** Opacity 0.6, `colors.text` → `colors.textSecondary` for the icon + label, `colors.textTertiary` for the chevron, `onPress={undefined}`, `disabled={true}`. Theme tokens preserved — no hardcoded colors, dark + light parity intact via `useTheme()`.
3. **Future-correct.** When a tour-photos URL field is added to the nested schema, the reader switches from `return undefined` to `return property.media?.tourPhotosUrl` (or whatever field name wins) and the tile auto-lights via the same `photoActive` derivation; the existing `setActivePhotosUrl` overlay wiring then opens the correct URL in the Tour3D WebView.
4. **Top photo carousel unchanged.** The hero `<FlatList>` reading `media.photos` was not touched.
5. **3D Virtual Tour hero card unchanged.** `TourHeroCard` still gates on `media.tourUrl`.

## Key links established

| From                                                                | To                          | Via                                                                                            | Pattern                  |
| ------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------ |
| `src/screens/PropertyDetailsScreen.tsx` (Photos tile, 2x2 grid IIFE) | `src/utils/getTourPhotosUrl.ts` | `import { getTourPhotosUrl } from '../utils/getTourPhotosUrl';` + invocation inside IIFE       | `getTourPhotosUrl\(property\)` |

The updated block comment at lines 942–949 references both `getTourPhotosUrl.ts` and the quick-task id `260525-eva` so future `git blame` lands here.

## i18n parity

**No new locale keys.** The tile continues to render the existing `t('property.photos')` label, which remains the correct visible string in both EN and RU (a Matterport/Ricoh-style virtual photo tour is still "Photos" to the end user, just as the 3D Virtual Tour stays "Tour"). The CI gate `scripts/check-i18n-parity.sh` is not at risk from this change.

## Deviations from Plan

**None.** The plan executed exactly as written.

- No Property-type schema change was made (explicitly out of scope per plan + constraint).
- No color / opacity / wrapper-style change to the Photos tile JSX beyond gating `disabled` / `onPress` on the new derived `photoActive` boolean.
- No touch to Instagram / Videos / Message tiles, `TourHeroCard`, the top photo carousel `<FlatList>`, the `if (activePhotosUrl) return <Tour3DScreen ...>` block, or the `App.tsx` `setActivePhotosUrl` overlay wiring.

No auto-fixes triggered (no bugs found in adjacent code during execution; the targeted misroute was the only defect, and it was the explicit subject of the task).

## Pending user QA (manual physical-device verification — USER action)

Per plan Task 2 verification block, the following manual QA on one device (iPhone 15 Pro Max OR Moto G XT2513V) is the user's call to run when convenient. It is NOT blocking on the code shipping:

1. **Open any listing** on `PropertyDetailsScreen` in **dark mode**, then **light mode**.
2. **Confirm (a):** the top photo carousel still swipes left / right and the pagination dot indicator updates with the swipe (covered by quick task `260515-djv` zoom work).
3. **Confirm (b):** on a listing that has a 3D Tour URL, the 3D Virtual Tour hero card still opens the WebView; on a listing without one, the hero is still in its disabled state.
4. **Confirm (c):** the small Photos tile in the 2x2 grid is grayed at ~0.6 opacity (icon + label in `textSecondary`, chevron in `textTertiary`) in both themes.
5. **Confirm (d):** tapping the small Photos tile produces **no** navigation, **no** WebView push, **no** toast — it is a true no-op today.

If any of (a)–(d) fail, surface as a new quick task; the fix here intentionally produces a disabled tile until the schema decision lands.

## Out of Scope (deferred — milestone-shaped)

These were called out in the plan as open questions and are NOT addressed by this quick task — surfaced here so they land in M4 scoping if the user decides to enable the Photos tile end-to-end:

1. **Where in the nested `Property` schema does the tour-photos URL live?** Candidates: `media.tourPhotosUrl?: string`, `media.tourPhotos?: { matterportUrl?: string; ricohUrl?: string }`, or a separate top-level alongside `instagramUrl`. `getTourPhotosUrl` is the single-point cutover; whichever shape wins, only that one file changes here.
2. **Who captures the URL?** Owner (during 6-step ContextualListingFlow) vs. admin/moderator (during `MediaCurationScreen`). M3's media-flow inversion put `media.tourUrl` capture on the admin side via `MediaCurationScreen`; this likely should mirror that pattern.
3. **Single URL vs. per-provider** (Matterport / Ricoh / etc.) — affects the schema shape above.

Adding the field is a milestone-shaped change (backend Mongoose schema + nested-type update + ContextualListingFlow step capture + admin `MediaCurationScreen` capture + migration script + any new i18n keys for capture-side labels). All out of scope for this quick task — the fix lands today because the current disabled-by-design behavior is the correct user-visible outcome until that schema decision is made.

## Self-Check: PASSED

**Files exist:**

- `src/utils/getTourPhotosUrl.ts` → FOUND
- `src/utils/__tests__/getTourPhotosUrl.test.ts` → FOUND
- `src/screens/PropertyDetailsScreen.tsx` (modified) → FOUND
- `.planning/quick/260525-eva-fix-photos-button-under-3d-virtual-tour-/260525-eva-SUMMARY.md` → FOUND (this file)

**Commits exist:**

- `d34c821` → FOUND (`feat(quick-260525-eva): add getTourPhotosUrl reader ...`)
- `f8bac08` → FOUND (`fix(quick-260525-eva): gate Photos tile on getTourPhotosUrl ...`)

**Verifications green:**

- `npx jest src/utils/__tests__/getTourPhotosUrl.test.ts` → 4/4 pass
- `npx jest --testPathPattern='PropertyDetailsScreen|getTourPhotosUrl'` → 6/6 pass across 2 suites
- `npx tsc --noEmit` → 0 new errors attributable to either new file or modified file

**No stubs introduced.** The `undefined` return in `getTourPhotosUrl` is the correct behavior today, fully documented in the file's TODO(milestone) comment and pinned by 4 test cases — not a placeholder that needs to be filled in to make the plan's goal achievable. The plan's goal IS the disabled-tile outcome (per all 5 plan truths).

**No threat-surface additions.** Pure-function reader + an existing tile's `disabled`/`onPress` gating swap. No new network endpoint, no auth path, no file access, no schema mutation.
