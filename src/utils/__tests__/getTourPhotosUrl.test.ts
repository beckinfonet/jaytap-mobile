/**
 * @format
 *
 * 2026-05-26 tour-photos plan — Property.media now has a `tourPhotosUrl`
 * field. The reader returns it when present, undefined otherwise.
 *
 * The "no fallback to media.photos" and "no duplication of media.tourUrl"
 * invariants from the original 260525-eva fix are preserved.
 *
 * @see docs/superpowers/specs/2026-05-26-tour-photos-url-design.md
 */
import { getTourPhotosUrl } from '../getTourPhotosUrl';
import type { Property } from '../../types/Property';

describe('getTourPhotosUrl (2026-05-26 plan — schema-aware behavior)', () => {
  test('returns undefined for an empty property', () => {
    const property: Property = { id: 'prop-empty' };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns undefined when media.photos is populated but tourPhotosUrl is not (no fallback misuse)', () => {
    const property: Property = {
      id: 'prop-with-photos-only',
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

  test('returns undefined when media.tourUrl is populated but tourPhotosUrl is not (no duplication of 3D Virtual Tour target)', () => {
    const property: Property = {
      id: 'prop-with-3d-tour-only',
      media: {
        photos: [],
        videos: [],
        tourUrl: 'https://my.matterport.com/show/?m=abcdef',
      },
    };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns undefined when instagramUrl is populated but tourPhotosUrl is not (no cross-channel confusion)', () => {
    const property: Property = {
      id: 'prop-with-instagram-only',
      instagramUrl: 'https://instagram.com/jaytap-listing',
    };
    expect(getTourPhotosUrl(property)).toBeUndefined();
  });

  test('returns the URL when media.tourPhotosUrl is populated (Ricoh)', () => {
    const property: Property = {
      id: 'prop-with-ricoh',
      media: {
        photos: [],
        videos: [],
        tourPhotosUrl: 'https://my.ricoh360.com/r/abc123',
      },
    };
    expect(getTourPhotosUrl(property)).toBe('https://my.ricoh360.com/r/abc123');
  });

  test('returns the URL when media.tourPhotosUrl is populated (Matterport-style)', () => {
    const property: Property = {
      id: 'prop-with-matterport-photos',
      media: {
        photos: [],
        videos: [],
        tourPhotosUrl: 'https://my.matterport.com/show/?m=panphotos',
      },
    };
    expect(getTourPhotosUrl(property)).toBe('https://my.matterport.com/show/?m=panphotos');
  });

  test('returns the URL even when tourUrl is also set (independent fields)', () => {
    const property: Property = {
      id: 'prop-with-both-tours',
      media: {
        photos: [],
        videos: [],
        tourUrl:        'https://my.matterport.com/show/?m=walk',
        tourPhotosUrl:  'https://my.ricoh360.com/r/pan',
      },
    };
    expect(getTourPhotosUrl(property)).toBe('https://my.ricoh360.com/r/pan');
  });
});
