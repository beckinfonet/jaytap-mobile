/**
 * @format
 */

import axios from 'axios';
import { PropertyService } from '../PropertyService';
import { AuthService } from '../AuthService';
import { apiClient } from '../apiClient';

jest.mock('axios');
jest.mock('../AuthService');
jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('PropertyService.patchPlatformVerifications guard (D-17)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('throws with E_PERMISSION_DENIED message for non-admin user', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_non_admin',
      email: 'random@example.com',
      backendProfile: { userType: 'user' },
    });

    await expect(
      PropertyService.patchPlatformVerifications('property_id', {
        ownershipDocuments: true,
        ownerIdentityVerified: false,
        stateIssuedDocumentsVerified: false,
      }),
    ).rejects.toThrow('E_PERMISSION_DENIED');
    expect(axios.patch).not.toHaveBeenCalled();
  });

  test('does NOT throw for admin user and calls axios.patch once', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_admin',
      email: 'a@x.com',
      backendProfile: { userType: 'admin' },
    });
    (axios.patch as jest.Mock).mockResolvedValue({
      data: { _id: 'property_id', platformVerifications: {} },
    });

    await expect(
      PropertyService.patchPlatformVerifications('property_id', {
        ownershipDocuments: true,
        ownerIdentityVerified: false,
        stateIssuedDocumentsVerified: false,
      }),
    ).resolves.toMatchObject({ id: 'property_id' });
    expect(axios.patch).toHaveBeenCalledTimes(1);
  });

  test('does NOT throw for allowlisted-email user (M1 branch)', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_owner',
      email: 'beckprograms@gmail.com',
      backendProfile: {},
    });
    (axios.patch as jest.Mock).mockResolvedValue({
      data: { _id: 'property_id' },
    });

    await expect(
      PropertyService.patchPlatformVerifications('property_id', {
        ownershipDocuments: true,
        ownerIdentityVerified: false,
        stateIssuedDocumentsVerified: false,
      }),
    ).resolves.toBeDefined();
  });
});

// REL-03 fix-loop (Phase 5 Plan 05-05 walk uncovered M3_NESTED_BODY_REQUIRED 400 on Step 6 submit).
// Phase 1 commit 6f815f5 cut backend POST/PUT /properties over to JSON nested-shape body.
// Phase 3 commit 2be38d3 stripped multer from user-side propertyRoutes (multipart no longer parsed).
// Phase 2's __tests__/integration.test.tsx mocked PropertyService.createProperty itself, so the
// FormData/multipart serialization regression slipped past verifier+reviewer (memory
// gsd-verifier-misses-regressions.md). These tests exercise the real PropertyService with apiClient
// mocked at the module boundary, asserting the body shape that hits the wire.
describe('PropertyService.createProperty — Phase 1 cutover JSON body contract', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('POSTs a plain JS object (NOT FormData) to /properties with nested SPEC shape', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_owner_test',
      email: 'owner@example.com',
      backendProfile: {},
    });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { _id: 'new_listing_id', listingId: '123-456' },
    });

    const specPayload = {
      dealType: 'rent_long',
      propertyType: 'apartment',
      location: {
        city: 'Bishkek',
        district: 'Pervomayskiy',
        coordinates: { lat: 42.8746, lng: 74.5698 },
        showExactAddress: false,
      },
      basics: { areaSqm: 60, price: 800, currency: 'USD', rooms: '2' },
      conditionAndAmenities: { condition: 'good', furnished: true },
      content: {
        title: 'Cozy 2-room apartment',
        description: 'Walking distance to Vefa',
        language: 'ru',
      },
      terms: { negotiable: false, prepaymentMonths: 1, minTerm: '6m' },
    };

    await PropertyService.createProperty(specPayload);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [url, body] = (apiClient.post as jest.Mock).mock.calls[0];
    expect(url).toBe('/properties');
    // CRITICAL — the body MUST be a plain object, NOT a FormData instance.
    // Phase 3 D-13 + Phase 1 atomic-break: backend has no multer; multipart bodies
    // return 400 M3_NESTED_BODY_REQUIRED because content/location/basics destructure
    // to undefined.
    expect(body).not.toBeInstanceOf(FormData);
    expect(typeof body).toBe('object');
    // Nested-shape SPEC fields the backend validator on propertyRoutes.js:129-139 demands:
    expect(body?.content?.title).toBe('Cozy 2-room apartment');
    expect(body?.location?.coordinates?.lat).toBe(42.8746);
    expect(body?.location?.coordinates?.lng).toBe(74.5698);
    expect(body?.basics?.price).toBe(800);
    // Phase 3 D-13: user-side media write disabled — client MUST NOT smuggle a media key.
    // Backend silently drops it anyway, but cleaner not to send.
    expect(body?.media).toBeUndefined();
  });

  test('rejects when AuthService has no authenticated user', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue(null);
    await expect(PropertyService.createProperty({})).rejects.toThrow(
      'User not authenticated',
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

describe('PropertyService.updateProperty — Phase 1 cutover JSON body contract', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('PUTs a plain JS object (NOT FormData) to /properties/:id with nested SPEC shape', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_owner_test',
      email: 'owner@example.com',
      backendProfile: {},
    });
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { _id: 'existing_listing_id', listingId: '789-012' },
    });

    const specPayload = {
      dealType: 'sale',
      propertyType: 'house',
      location: {
        city: 'Almaty',
        district: '',
        coordinates: { lat: 43.2389, lng: 76.8897 },
        showExactAddress: true,
      },
      basics: { areaSqm: 180, price: 250000, currency: 'USD', rooms: '4+' },
      conditionAndAmenities: { condition: 'excellent', furnished: false },
      content: {
        title: 'Family home with garden',
        description: 'Kok-Jar district',
        language: 'ru',
      },
      terms: {},
    };

    await PropertyService.updateProperty('existing_listing_id', specPayload);

    expect(apiClient.put).toHaveBeenCalledTimes(1);
    const [url, body] = (apiClient.put as jest.Mock).mock.calls[0];
    expect(url).toBe('/properties/existing_listing_id');
    expect(body).not.toBeInstanceOf(FormData);
    expect(typeof body).toBe('object');
    expect(body?.content?.title).toBe('Family home with garden');
    expect(body?.location?.coordinates?.lat).toBe(43.2389);
    expect(body?.basics?.price).toBe(250000);
    expect(body?.media).toBeUndefined();
  });
});

describe('PropertyService.editAsModerator — Phase 1 cutover JSON body contract', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('PUTs a plain JS object (NOT FormData) to /moderation/listings/:id with nested SPEC shape + reason', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_mod_test',
      email: 'mod@example.com',
      backendProfile: { userType: 'moderator' },
    });
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { _id: 'listing_being_modded', listingId: '345-678' },
    });

    const specPayload = {
      dealType: 'rent_long',
      propertyType: 'apartment',
      location: {
        city: 'Bishkek',
        district: 'Asanbay',
        coordinates: { lat: 42.8746, lng: 74.5698 },
        showExactAddress: false,
      },
      basics: { areaSqm: 45, price: 600, currency: 'USD', rooms: '1' },
      conditionAndAmenities: { condition: 'good', furnished: true },
      content: { title: 'Mod-corrected title', description: '', language: 'ru' },
      terms: {},
    };

    await PropertyService.editAsModerator(
      'listing_being_modded',
      specPayload,
      [],
      'fixed-typo-in-title',
    );

    expect(apiClient.put).toHaveBeenCalledTimes(1);
    const [url, body] = (apiClient.put as jest.Mock).mock.calls[0];
    expect(url).toBe('/moderation/listings/listing_being_modded');
    // Phase 5 Plan 05-05 walk uncovered the same FormData/multipart regression
    // here: backend at moderationRoutes.js:813-815 only parses features/amenities
    // from JSON-strings; nested subtrees (location/basics/content/terms) arrive
    // as strings, get spread into updateData, and Mongoose rejects them.
    // Phase 3 D-13: mod media uploads go via MediaCurationService → POST
    // /moderation/listings/:id/media, NOT this PUT endpoint. So PUT is JSON-only.
    expect(body).not.toBeInstanceOf(FormData);
    expect(typeof body).toBe('object');
    expect(body?.content?.title).toBe('Mod-corrected title');
    expect(body?.location?.coordinates?.lat).toBe(42.8746);
    expect(body?.basics?.price).toBe(600);
    // reason rides in the JSON body (was previously a multipart field)
    expect(body?.reason).toBe('fixed-typo-in-title');
    // MOD-14 + memory phase45-landlord-application-uid-mismatch-bug.md:
    // ownerUid + status MUST NOT be in the body (backend strips defensively but
    // client hygiene avoids sending them).
    expect(body?.ownerUid).toBeUndefined();
    expect(body?.status).toBeUndefined();
    expect(body?._id).toBeUndefined();
    expect(body?.id).toBeUndefined();
  });

  test('throws PermissionDeniedError when user lacks editAnyListing capability', async () => {
    (AuthService.getUserData as jest.Mock).mockResolvedValue({
      localId: 'uid_user',
      email: 'user@example.com',
      backendProfile: { userType: 'user' },
    });
    await expect(
      PropertyService.editAsModerator('any_id', {}),
    ).rejects.toThrow('E_PERMISSION_DENIED');
    expect(apiClient.put).not.toHaveBeenCalled();
  });
});
