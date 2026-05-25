/**
 * getTourPhotosUrl — Single source of truth for resolving a property's dedicated
 * tour-photos URL (e.g., Matterport / Ricoh / equivalent virtual photo-tour link).
 *
 * Distinct from BOTH the regular photo carousel (`media.photos[]` — the swipeable
 * hero JPGs at the top of PropertyDetailsScreen) AND the 3D Virtual Tour
 * (`media.tourUrl` — drives the `TourHeroCard` hero). It is the target opened
 * by the small "Photos" tile in the 2x2 action grid under the 3D Tour card.
 *
 * Convention: matches `propertyCategory.ts` shape (named export, pure fn,
 * no React imports, no side effects).
 *
 * @see src/screens/PropertyDetailsScreen.tsx — Photos tile in the 2x2 media grid
 * @see quick task 260525-eva — gates the Photos tile through this reader
 */
import type { Property } from '../types/Property';

/**
 * Pure derivation.
 *
 * Returns `undefined` today: the M3 nested `Property` type intentionally has
 * NO tour-photos URL field. The legacy `panoramicPhotosUrl` was removed at
 * M3 Phase 2 D-20 cutover, and no replacement field has been added to the
 * nested shape yet (open question deferred to a future milestone — see PLAN
 * "Open Questions" in `.planning/quick/260525-eva-fix-photos-button-under-3d-virtual-tour-/260525-eva-PLAN.md`).
 *
 * Consumer behavior: callers gate the Photos tile on `!!getTourPhotosUrl(...)`,
 * so an `undefined` return keeps the tile visually + functionally disabled
 * (mirroring the Instagram tile's disabled pattern). This is the correct
 * user-visible behavior today — the previous code misused `media.photos[0]`,
 * which pushed a regular JPG into the Tour3D WebView.
 *
 * TODO(milestone): when the schema decision for the tour-photos URL field
 * lands (candidate shapes: `media.tourPhotosUrl?: string` /
 * `media.tourPhotos?: { matterportUrl?: string; ricohUrl?: string }` /
 * a separate top-level alongside `instagramUrl`), this is the ONE file that
 * changes — return the resolved URL from the new field here. No caller
 * elsewhere should need to change: this reader is the single point of cutover,
 * and the co-located test file pins the current `undefined`-everywhere
 * behavior so the future schema-field edit is forced to also update the test.
 */
export function getTourPhotosUrl(_property: Property): string | undefined {
  return undefined;
}
