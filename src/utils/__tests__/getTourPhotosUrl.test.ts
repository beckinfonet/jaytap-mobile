/**
 * @format
 *
 * Pins the CURRENT behavior of `getTourPhotosUrl`: it must return `undefined`
 * for every property shape, because the M3 nested `Property` type has no
 * tour-photos URL field (the legacy `panoramicPhotosUrl` was removed at
 * M3 Phase 2 D-20 cutover).
 *
 * This is the forcing function: when a future milestone adds a tour-photos
 * field to the schema, the implementation in `getTourPhotosUrl.ts` will
 * change to read from that field — and these tests will need to be updated
 * to reflect the new behavior. That coupling is intentional.
 *
 * @see quick task 260525-eva
 */
import { getTourPhotosUrl } from '../getTourPhotosUrl';
import type { Property } from '../../types/Property';

describe('getTourPhotosUrl (quick task 260525-eva — current behavior)', () => {
  test('returns undefined for an empty property', () => {
    const property: Property = { id: 'prop-empty' };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns undefined when media.photos is populated (does NOT misuse the photo carousel as a fallback — that was the original bug)', () => {
    const property: Property = {
      id: 'prop-with-photos',
      media: {
        photos: [
          'https://example.com/photo-1.jpg',
          'https://example.com/photo-2.jpg',
        ],
        videos: [],
      },
    };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns undefined when media.tourUrl is populated (does NOT duplicate the 3D Virtual Tour target)', () => {
    const property: Property = {
      id: 'prop-with-tour',
      media: {
        photos: [],
        videos: [],
        tourUrl: 'https://my.matterport.com/show/?m=abcdef',
      },
    };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns undefined when instagramUrl is populated (does NOT confuse social with tour-photos)', () => {
    const property: Property = {
      id: 'prop-with-instagram',
      instagramUrl: 'https://instagram.com/jaytap-listing',
    };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });
});
