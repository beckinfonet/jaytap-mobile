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
