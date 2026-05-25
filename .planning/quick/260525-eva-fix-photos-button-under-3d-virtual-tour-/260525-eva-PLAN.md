---
id: 260525-eva
type: quick
status: ready
created: 2026-05-25
description: "Fix the small Photos tile in the action grid UNDER the 3D Virtual Tour card on PropertyDetailsScreen — currently misuses media.photos[0] and renders a JPG in the Tour3D WebView. Gate it on a real tour-photos URL (Matterport/Ricoh-style); when absent, keep it visually + functionally disabled."
files_modified:
  - src/screens/PropertyDetailsScreen.tsx
  - src/utils/getTourPhotosUrl.ts          # NEW thin reader
  - src/utils/__tests__/getTourPhotosUrl.test.ts  # NEW
must_haves:
  truths:
    - "Tapping the small Photos tile in the 2x2 grid does NOT open the regular property photo carousel in the Tour3D WebView."
    - "When a tour-photos URL is absent (which is every listing in production today — no such field exists in the M3 nested Property type), the Photos tile is visually disabled (theme-tokened disabled colors, 0.6 opacity, disabled chevron color) AND functionally disabled (onPress=undefined, disabled={true} on the TouchableOpacity)."
    - "When a tour-photos URL exists in the future, the Photos tile opens THAT URL via the existing `setActivePhotosUrl` overlay (Tour3DScreen WebView), not the photo carousel."
    - "The TOP photo carousel (the `<FlatList>` at the top of the screen using `media.photos`) is unchanged and still works for left/right swiping."
    - "The 3D Virtual Tour hero card (TourHeroCard) is unchanged — it still gates on `media.tourUrl`."
  artifacts:
    - path: "src/utils/getTourPhotosUrl.ts"
      provides: "Single source of truth for resolving a property's tour-photos URL. Returns `undefined` today (no schema field exists); becomes the one-line edit point when the schema decision lands in a future milestone."
    - path: "src/screens/PropertyDetailsScreen.tsx"
      provides: "Photos tile (lines ~941-962 in the 2x2 media grid) gates on getTourPhotosUrl(property), not on media.photos[0]."
  key_links:
    - from: "src/screens/PropertyDetailsScreen.tsx (Photos tile, 2x2 grid)"
      to: "src/utils/getTourPhotosUrl.ts"
      via: "import + invocation inside the IIFE that derives photoActive"
      pattern: "getTourPhotosUrl\\(property\\)"
---

# Quick Task 260525-eva — Fix Photos button under 3D Virtual Tour

## Goal

The small "Photos" tile in the 2x2 action grid (Instagram / **Photos** / Videos / Message) that sits **below** the "3D Virtual Tour" hero card on `PropertyDetailsScreen` currently misuses `media.photos[0]` as its target — so tapping it pushes a regular JPG URL into the Tour3D WebView (`Tour3DScreen`), which is wrong by design.

It is supposed to open a dedicated **tour-photos link** (Matterport / Ricoh / equivalent) that is conceptually distinct from both the photo carousel AND the 3D Virtual Tour. When no such link exists on a listing, the tile must remain visually and functionally disabled — like the Instagram tile already does when `instagramUrl` is absent.

**Key constraint surfaced during investigation:** the M3 nested `Property` type has **NO** tour-photos URL field. The legacy `panoramicPhotosUrl` was removed at M3 Phase 2 D-20 cutover (see comment at `PropertyDetailsScreen.tsx:941-943`). Adding a new schema field is milestone-shaped work (backend Mongoose schema + nested type + 6-step ContextualListingFlow capture + admin MediaCurationScreen capture + migration). That is **out of scope for a quick task**. The fix therefore lands as: introduce one thin reader (`getTourPhotosUrl`) that returns `undefined` today → the tile is unconditionally disabled today → when the schema decision lands later, only that one reader changes.

This makes today's correct user-visible behavior (no broken misroute, no surprise JPG-in-WebView) the **same line** that lights the tile up correctly once the field exists.

## Context

- Bug location: `src/screens/PropertyDetailsScreen.tsx` lines ~921–993, specifically the Photos tile at ~944–962 (the IIFE deriving `photoTarget` / `photoActive`).
- Bug trace: `photoTarget = photos[0]` → `onOpenPhotos(photoTarget)` → `App.tsx:957 setActivePhotosUrl(url)` → `PropertyDetailsScreen.tsx:694 if (activePhotosUrl) return <Tour3DScreen url={activePhotosUrl} ...>` (a `react-native-webview`).
- Mirror pattern to copy (already correct in same file): the **Instagram tile** at lines 923–939 — gates entirely on `property.instagramUrl`, applies `opacity: 0.6` when absent, uses `colors.text` / `colors.textSecondary` / `colors.textTertiary` for icon / label / chevron, sets `onPress={undefined}` and `disabled={true}` when the source field is absent.
- The TOP photo carousel (the swipeable hero at the top of the screen) is a separate `<FlatList>` and is **not touched** by this fix.
- The 3D Virtual Tour hero (`TourHeroCard`, gates on `media.tourUrl`) is **not touched** either.
- The `onOpenPhotos` prop wiring stays as-is: `App.tsx:957 onOpenPhotos={(url) => setActivePhotosUrl(url)}` is still correct for the future-real case; we just stop feeding it the wrong URL today.

## Tasks

### Task 1 — Add the thin reader + tests

**Files:**
- `src/utils/getTourPhotosUrl.ts` (NEW)
- `src/utils/__tests__/getTourPhotosUrl.test.ts` (NEW)

**Action:**
Create `src/utils/getTourPhotosUrl.ts` exporting a single pure function:

```
export function getTourPhotosUrl(property: Property): string | undefined
```

For the body: return `undefined`. Add a `// TODO(milestone):` comment with three lines explaining (a) why it currently returns undefined (no schema field exists in the M3 nested Property type — `panoramicPhotosUrl` was removed at M3 Phase 2 D-20), (b) what should change here when the schema decision lands (read e.g. `property.media?.tourPhotosUrl` — exact field name TBD), and (c) that **no caller should change** when that future edit happens — this reader is the single point of cutover.

Do **not** invent a schema field on the `Property` type. Do **not** read from `media.photos[0]` (that is the bug). Do **not** read from `media.tourUrl` (that would duplicate the 3D Virtual Tour button).

Add the co-located test (`__tests__/getTourPhotosUrl.test.ts`) that asserts the reader currently returns `undefined` for: an empty property, a property with photos populated, a property with `media.tourUrl` populated, and a property with `instagramUrl` populated. The test pins the **current** behavior so the future schema-field edit is forced to also update the test (which is the desired forcing function).

Follow project conventions: `camelCase` filename + function name (per `CONVENTIONS.md` Functions/Utilities rule), no default export, single-quote strings, 2-space indent, trailing commas allowed, prettier-clean.

**Verify:**
```
npx jest src/utils/__tests__/getTourPhotosUrl.test.ts
```
All cases pass; `npx tsc --noEmit` adds zero new errors attributable to the new file.

**Done:**
- File exists and exports `getTourPhotosUrl(property: Property): string | undefined`.
- TODO comment present and explicit about the future schema cutover point.
- Test file pins current behavior across four property shapes.
- Zero new `tsc` errors introduced.

---

### Task 2 — Wire the Photos tile through the new reader + drop the bug

**Files:**
- `src/screens/PropertyDetailsScreen.tsx`

**Action:**
In `PropertyDetailsScreen.tsx`, inside the Photos tile IIFE at lines ~944–962:

1. Import `getTourPhotosUrl` from `'../utils/getTourPhotosUrl'` at the top of the file (group with other `../utils/*` imports).
2. Change the body of the IIFE from:
   - `const photoTarget = photos[0];` (the bug)
   - `const photoActive = !!photoTarget && !!onOpenPhotos;`
   to:
   - `const photoTarget = getTourPhotosUrl(property);` (reads the reader; today it returns `undefined`)
   - `const photoActive = !!photoTarget && !!onOpenPhotos;` (unchanged shape; both conjuncts now strictly track the new field)
3. Leave the rendered JSX identical — the disabled-state styling (`opacity: 0.6`, `colors.textSecondary` / `colors.textTertiary`, `disabled={!photoActive}`, `onPress={photoActive ? () => onOpenPhotos!(photoTarget!) : undefined}`) is already correct. **Do not** change any color, opacity, or wrapper style — those already mirror the Instagram tile pattern.
4. Update the existing block comment at lines 941–943 to reflect the new behavior. New comment must say something equivalent to: "Photos tile (NOT the top carousel — see hero FlatList above) opens a dedicated tour-photos URL (Matterport / Ricoh / equivalent) via the existing setActivePhotosUrl overlay. Source of truth: `getTourPhotosUrl(property)`. Until the M3-nested schema adds a tour-photos field, the reader returns undefined and the tile stays disabled by design — see `src/utils/getTourPhotosUrl.ts` TODO." Reference quick-task id `260525-eva` in the comment so future blame lands here.
5. Do NOT touch the Instagram, Videos, or Message tiles. Do NOT touch the `TourHeroCard`. Do NOT touch the top photo carousel `<FlatList>`. Do NOT touch the `if (activePhotosUrl) return <Tour3DScreen ...>` block at line ~694 — that wiring is still correct for the future tour-photos URL.

Do not add or modify any locale keys; the tile already uses the existing `property.photos` label which remains the correct visible string (a Matterport/Ricoh-style virtual photo tour is still "Photos" to the end user, just like the 3D Virtual Tour stays "Tour"). i18n parity untouched.

Theme tokens unchanged — fix reuses the existing `colors.text` / `colors.textSecondary` / `colors.textTertiary` palette already in the tile.

**Verify:**
```
npx tsc --noEmit
npx jest --testPathPattern='PropertyDetailsScreen|getTourPhotosUrl'
```
- `tsc` adds zero new errors attributable to this file edit.
- Existing PropertyDetailsScreen test suite (if any) stays green.
- Manual physical-device QA (one device sufficient — iPhone 15 Pro Max OR Moto G XT2513V) on any listing in dark + light mode: confirm (a) top photo carousel still swipes left/right, (b) 3D Virtual Tour hero card still opens the WebView on listings with a tour, (c) small Photos tile in the 2x2 grid is grayed at 0.6 opacity, (d) tapping the small Photos tile produces **no** navigation / no WebView push / no toast.

**Done:**
- Photos tile gates on `getTourPhotosUrl(property)`, not on `photos[0]`.
- Tapping the Photos tile in the 2x2 grid is a no-op today (no Tour3D WebView push, no carousel open, no error toast).
- Visually disabled state matches the Instagram tile's disabled pattern (0.6 opacity, secondary text color, tertiary chevron color) in dark + light mode.
- Top photo carousel is verified unchanged.
- 3D Virtual Tour hero card is verified unchanged.
- Updated block comment references `260525-eva` and points at `getTourPhotosUrl`.

## Out of Scope

- **The top photo carousel** (`<FlatList>` rendering `media.photos` at the top of `PropertyDetailsScreen`) — it is the working "way to see photos" per the user's bug report and must not be touched.
- **The 3D Virtual Tour hero card** (`TourHeroCard`) — gates on `media.tourUrl`, not on tour-photos URL; unrelated to this bug.
- **Adding a `tourPhotosUrl` / `matterportPhotosUrl` / `ricohPhotosUrl` field to the `Property` Mongoose schema or to `src/types/Property.ts`** — this is a milestone-shaped change (backend Mongoose schema + nested-type update + 6-step ContextualListingFlow capture + admin MediaCurationScreen capture + migration script + i18n keys for any new capture-side labels). Flagged as the **open question** below; should be picked up at M4 scoping.
- **Wiring the future tour-photos field into the 6-step ContextualListingFlow** or into `MediaCurationScreen` — same reason, milestone-shaped.
- Any change to `Tour3DScreen.tsx`, `App.tsx` overlay wiring, or the `setActivePhotosUrl` state — current wiring is correct for the future tour-photos URL once the schema field exists.
- New i18n keys, new theme tokens, new lucide icons — reuse what's already in place on the tile.

## Open Questions (for milestone-level follow-up, NOT this quick task)

1. **Where should the tour-photos URL live in the nested Property schema?** Candidates: `media.tourPhotosUrl?: string`, `media.tourPhotos?: { matterportUrl?: string; ricohUrl?: string }`, or a separate top-level alongside `instagramUrl`. The thin reader `getTourPhotosUrl` is the single-point cutover; whichever shape wins, only that file changes here.
2. **Who captures the URL?** Owner (during ContextualListingFlow Step N), or admin/moderator (during MediaCurationScreen)? M3's media-flow inversion put `media.tourUrl` capture on the admin/mod side via `MediaCurationScreen`; this likely should mirror that pattern, but is a milestone decision.
3. **Is it a single URL, or per-provider (Matterport / Ricoh / etc.)?** Matters for the schema shape above.

These are surfaced for visibility — they do **not** block this quick task from shipping, because the current correct user-visible behavior (disabled tile, no broken misroute) is exactly what the fix produces today.
