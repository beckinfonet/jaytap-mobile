/**
 * @format
 */

import axios from 'axios';
import { PropertyService } from '../PropertyService';
import { AuthService } from '../AuthService';

jest.mock('axios');
jest.mock('../AuthService');

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
