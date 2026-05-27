/**
 * getTourPhotosUrl — Single source of truth for resolving a property's
 * dedicated tour-photos URL (Ricoh / Matterport / any https:// panoramic
 * photo-tour provider).
 *
 * Distinct from BOTH the regular photo carousel (`media.photos[]` — the
 * swipeable hero JPGs at the top of PropertyDetailsScreen) AND the 3D
 * Virtual Tour (`media.tourUrl` — drives the `TourHeroCard` hero). It is
 * the target opened by the "360° Photos" tile in the 2x2 action grid
 * under the 3D Tour card.
 *
 * Convention: matches `propertyCategory.ts` shape (named export, pure fn,
 * no React imports, no side effects).
 *
 * @see src/screens/PropertyDetailsScreen.tsx — 360° Photos tile in the 2x2 media grid
 * @see docs/superpowers/specs/2026-05-26-tour-photos-url-design.md
 * @see quick task 260525-eva — set up this single-point cutover
 */
import type { Property } from '../types/Property';

export function getTourPhotosUrl(property: Property): string | undefined {
  return property.media?.tourPhotosUrl;
}
