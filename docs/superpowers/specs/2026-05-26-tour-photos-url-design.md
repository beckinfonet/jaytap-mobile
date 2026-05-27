# Design — Activate the Photos tile to host a 360° / panoramic URL (Ricoh / Matterport)

**Date:** 2026-05-26
**Type:** Design spec
**Predecessor:** Quick task `260525-eva` (set up the single-point cutover; left schema field deferred)
**Scope:** RN client (JayTap) + backend (JayTap-services)

---

## Problem

The small "Photos" tile in the 2x2 action grid (Instagram / **Photos** / Videos / Message) under the 3D Virtual Tour hero card on `PropertyDetailsScreen` is functionally disabled today. The previous quick task `260525-eva` removed a JPG-in-WebView misroute and wired the tile through a thin reader `getTourPhotosUrl(property)` that currently returns `undefined`, leaving the tile in the same visually + functionally disabled state as the Instagram tile when `instagramUrl` is absent. That reader is the single-point cutover for activating the tile — but no schema field exists yet for the URL to live in.

The activated tile must host a 360° panoramic photos URL (typically Ricoh, sometimes Matterport) and open it in the same `Tour3DScreen` WebView that drives the 3D Virtual Tour hero — so on tap, the user sees a Matterport/Ricoh-style panoramic viewer instead of the regular photo carousel that already exists at the top of the screen.

## Goals

1. Owners/admins can attach a single panoramic-photos URL per listing.
2. The Photos tile becomes tappable on listings with such a URL; on tap it opens the URL in the existing `Tour3DScreen` WebView (identical to how `media.tourUrl` is rendered today).
3. The tile remains in its current disabled state on listings without the URL (no regression to the 260525-eva behavior).
4. The tile label is unambiguous — it must not suggest a regular photo carousel.

## Non-goals

- No owner-side capture in `ContextualListingFlow` — admin-side capture only (mirrors `media.tourUrl`).
- No per-provider field split — a single provider-agnostic URL string, matching the `media.tourUrl` shape.
- No change to the top photo carousel, the 3D Virtual Tour hero card, the Instagram / Video / Message tiles, or the photo-required approval gate.
- No new UI for switching between Ricoh / Matterport / etc. — the WebView renders whatever the provider serves at the given URL.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D-1 | **Schema field:** `Property.media.tourPhotosUrl?: string` (single optional string under `media`, mirroring `media.tourUrl`) | Provider-agnostic per user constraint ("only Ricoh, accept a web URL just like Matterport"). Same shape as `media.tourUrl`. Single-point cutover already anticipated in `src/utils/getTourPhotosUrl.ts`. |
| D-2 | **Capture surface:** admin-side `MediaCurationScreen` only | Mirrors M3 media-flow inversion — `media.tourUrl` is already admin-only. Smallest surface change. ContextualListingFlow untouched. |
| D-3 | **Tile label:** new i18n key `property.photos360` → "360° Photos" / "360° Фото" | Renter taps expecting regular photos would otherwise be surprised by a 360° viewer. Mirrors the "360° VIEW" badge already used in `TourSelectionScreen`. |
| D-4 | **Render path:** unchanged — existing `setActivePhotosUrl` overlay + `Tour3DScreen` WebView | The 260525-eva refactor set this up; the new field flips `getTourPhotosUrl` from `undefined` to the URL and the rest of the pipeline activates automatically. |
| D-5 | **Validator:** rename the existing `validateTourUrl` callback in `MediaCurationScreen` (lines 250–258) to `validateHttpsUrl` and reuse it for both inputs | Its body is already generic — `new URL(value)` + `u.protocol === 'https:'` + empty-string-is-valid escape hatch. Two consumers, one identity-stable `useCallback`, no duplication. |
| D-6 | **Old key `property.photos` kept in place** (additive, not value-swap) | Diff stays additive; key semantically honest. Currently only referenced by the one tile JSX line we're changing, so leaving it costs nothing and avoids future surprise if it's ever reused. |

## Architecture

```
                                            ┌──────────────────────────────────────┐
                                            │  Backend (JayTap-services)           │
                                            │  Mongoose Property.media.tourPhotosUrl│
                                            │  PATCH /api/properties/:id whitelist │
                                            └──────────┬───────────────────────────┘
                                                       │
                                                       ▼
                                       ┌──────────────────────────────────┐
                  ┌────────────────────│  RN Client                        │
                  │                    │                                   │
                  │     ┌──────────────▼──────────────┐                   │
                  │     │  MediaCurationScreen        │                   │
                  │     │  • new "360° photos URL"    │                   │
                  │     │    input (https:// only)    │                   │
                  │     │  • diff-tracked + saved     │                   │
                  │     │    via existing PATCH       │                   │
                  │     └──────────────┬──────────────┘                   │
                  │                    │ sets media.tourPhotosUrl         │
                  │                    ▼                                   │
                  │     ┌─────────────────────────────┐                   │
                  │     │  Property.media             │                   │
                  │     │  .tourPhotosUrl?: string    │                   │
                  │     └──────────────┬──────────────┘                   │
                  │                    │                                   │
                  │     ┌──────────────▼──────────────┐                   │
                  │     │ getTourPhotosUrl(property)  │ ◄─ ONE-LINE FLIP  │
                  │     │ → property.media            │                   │
                  │     │   ?.tourPhotosUrl           │                   │
                  │     └──────────────┬──────────────┘                   │
                  │                    │ url|undefined                    │
                  │                    ▼                                   │
                  │     ┌─────────────────────────────┐                   │
                  │     │ PropertyDetailsScreen tile  │                   │
                  │     │ • activated if url set      │                   │
                  │     │ • label: "360° Photos"      │                   │
                  │     │ • onPress: setActivePhotos  │                   │
                  │     │   Url(url)                  │                   │
                  │     └──────────────┬──────────────┘                   │
                  │                    │                                  │
                  │     ┌──────────────▼──────────────┐                   │
                  │     │  Tour3DScreen WebView       │ (unchanged)       │
                  │     │  renders Ricoh/Matterport   │                   │
                  │     │  panoramic viewer           │                   │
                  │     └─────────────────────────────┘                   │
                  └─────────────────────────────────────────────────────────┘
```

## Components

### 1. Schema — `Property.media.tourPhotosUrl?: string`

**RN client** — `src/types/Property.ts`, in the nested `media` block:
```ts
media?: {
  photos: string[];
  videos: string[];
  tourUrl?: string;
  tourPhotosUrl?: string;  // NEW — panoramic photos URL (Ricoh / Matterport / equiv.)
};
```

**Backend** — JayTap-services Mongoose schema gets a matching `tourPhotosUrl: { type: String, default: undefined }` under `media`. The `PATCH /api/properties/:id` body whitelist accepts the field, identical to how `media.tourUrl` is handled today.

### 2. Reader — `src/utils/getTourPhotosUrl.ts`

One-line cutover:
```ts
export function getTourPhotosUrl(property: Property): string | undefined {
  return property.media?.tourPhotosUrl;
}
```

Update the doc comment to remove the "deferred open question" framing now that the field exists. The 4 co-located tests in `src/utils/__tests__/getTourPhotosUrl.test.ts` are updated to pin the new behavior:
- empty property → undefined
- `media.photos` populated (no field) → undefined (no fallback misuse)
- `media.tourUrl` populated (no field) → undefined (does not duplicate the 3D tour)
- `media.tourPhotosUrl` populated → returns the URL (new positive case)

### 3. Capture — `MediaCurationScreen`

New input rendered directly below the existing 3D tour URL input. Mirrors the existing pattern exactly:

| Concern | Mirrors `tourUrl` shape |
|---|---|
| State | `tourPhotosUrlDraft`, `tourPhotosUrlValid` |
| Initial load | `setTourPhotosUrlDraft(data?.media?.tourPhotosUrl ?? '')` |
| Validator | Rename existing `validateTourUrl` (`useCallback`, `[]` deps, body is already protocol-agnostic) → `validateHttpsUrl`. Both `tourUrlDraft` and `tourPhotosUrlDraft` use it. |
| Diff | `tourPhotosUrlChanged` joins `isSaveEnabled` |
| Save | `tourPhotosUrlToSend` added to PATCH payload alongside `tourUrlToSend` |
| Post-save sync | `setTourPhotosUrlDraft(updated?.media?.tourPhotosUrl ?? '')` |

### 4. Tile label — i18n key swap

New key `property.photos360`:
```ts
// src/locales/en.ts
'property.photos360': '360° Photos',
// src/locales/ru.ts
'property.photos360': '360° Фото',
```

`PropertyDetailsScreen.tsx` line 930 changes from `t('property.photos')` → `t('property.photos360')`. The old `property.photos` key stays in both locale files unchanged.

### 5. MediaCurationScreen capture input — i18n

Four new key pairs (EN + RU), structured identically to the existing `moderation.mediaCuration.tourUrl.*` keys:
```
moderation.mediaCuration.tourPhotosUrl.label       → "360° photos URL" / "Ссылка на 360° фото"
moderation.mediaCuration.tourPhotosUrl.placeholder → "https://my.ricoh360.com/r/…"
moderation.mediaCuration.tourPhotosUrl.hint        → "Paste a Ricoh, Matterport, or other https://
                                                      panoramic-photos link. Optional."
                                                     / RU equivalent
moderation.mediaCuration.tourPhotosUrl.invalid     → "URL must start with https://"
                                                     / "Ссылка должна начинаться с https://"
```

## Data flow

1. Admin/moderator opens `MediaCurationScreen` for a listing in the moderation queue.
2. Admin pastes a Ricoh (or Matterport, or other https://) URL into the new "360° photos URL" input.
3. Local validator runs on change — invalid input surfaces the inline error message; save remains disabled if invalid.
4. On save, the PATCH payload includes `media.tourPhotosUrl` alongside the existing `media.tourUrl` (and any pending photo/video curation).
5. Backend whitelist accepts the field, Mongoose writes it under `media`, returns the updated property.
6. RN state resyncs from the server response — drafts match listing.
7. On any subsequent render of `PropertyDetailsScreen` for that listing, `getTourPhotosUrl(property)` returns the URL, `photoActive` becomes true, the tile activates with the "360° Photos" label, and tapping it pushes the URL through `onOpenPhotos` → `setActivePhotosUrl` → `Tour3DScreen` WebView.

## Error handling

- **Invalid URL on save** — handled by the existing inline-error UX pattern (`tourPhotosUrlValid` mirrors `tourUrlValid`); save button stays disabled, no payload sent.
- **Backend rejects payload** — the existing MediaCurationScreen save-failure surface (toast/alert) handles this generically.
- **URL set but provider returns 404 / dead link** — out of band, identical to how a dead `media.tourUrl` behaves today. The WebView renders the provider error; the user can tap the close (✕) button to return.
- **Empty string** — frontend treats empty draft as "not changed" via the existing `tourUrlChanged` pattern (compare draft to listing). Cleared values send `undefined`, matching `tourUrl` clearing semantics.

## Testing

### Unit
- `src/utils/__tests__/getTourPhotosUrl.test.ts` — 4 cases updated to pin the new schema-aware behavior.
- New MediaCurationScreen test (or extension of an existing one) asserting:
  - Invalid URL keeps the save button disabled and surfaces the inline error.
  - Valid URL → `tourPhotosUrlChanged` flips → save button enables → payload includes `tourPhotosUrl`.

### Type check
- `npx tsc --noEmit` — no new errors attributable to the change.

### i18n parity
- `scripts/check-i18n-parity.sh` (existing CI gate) — all 5 new keys (`property.photos360` + 4 `moderation.mediaCuration.tourPhotosUrl.*`) must be present in both `en.ts` and `ru.ts`.

### Backend
- Existing JayTap-services test suite for `PATCH /api/properties/:id` — extend to assert `media.tourPhotosUrl` round-trips through the route handler.

### Manual / on-device
Physical-device QA (iOS + Android) following the moderation flow end-to-end:
1. Submit a listing as owner (no 360° URL).
2. Open the listing in Moderation Queue → MediaCurationScreen.
3. Paste a real Ricoh URL into the new input; confirm validator + diff + save.
4. Approve the listing; open it in PropertyDetailsScreen.
5. Confirm tile label reads "360° Photos" / "360° Фото", is active (full opacity), and chevron is in `textSecondary`.
6. Tap the tile → Tour3D WebView opens the Ricoh viewer → confirm gyroscope / panoramic navigation works.
7. Close the WebView → returns to PropertyDetailsScreen.
8. Repeat for a Matterport URL to verify provider-agnostic behavior.
9. Repeat for an owner-cleared / never-set URL — tile is disabled, taps are no-ops.

## Out of scope

- Owner-side capture in `ContextualListingFlow` — decided admin-only.
- Per-provider field shape (`media.tourPhotos.{ricoh,matterport}`) — single URL only.
- Migration script for existing M3+ listings — no existing listings have this field; the field is purely additive and optional.
- Any change to the top photo carousel, 3D Virtual Tour hero card, the Instagram / Video / Message tiles, or the photo-required approval gate.
- Any change to the WebView rendering itself — Tour3DScreen handles whatever the provider serves.
- Renaming or repurposing the existing `property.photos` i18n key.

## Open question for the implementation plan

**Should this ship as a `/gsd-quick` task or a small phase?** It's a small RN-side change (one schema field, one reader flip, one new input, one tile label key, four locale-key pairs, test updates). But it touches the JayTap-services backend repo too (schema field + route whitelist). The cross-repo coordination may justify treating it as a phase rather than a quick task. Decide during the `writing-plans` step based on user preference; both shapes can execute this scope cleanly.

## Predecessor links

- `.planning/quick/260525-eva-fix-photos-button-under-3d-virtual-tour-/260525-eva-SUMMARY.md` — sets up the single-point cutover this design exercises.
- `src/utils/getTourPhotosUrl.ts` — the one file that changes on the reader side, with a `TODO(milestone)` comment that names this design as the milestone-shaped change to make.
