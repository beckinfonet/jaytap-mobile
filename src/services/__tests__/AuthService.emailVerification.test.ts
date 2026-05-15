/**
 * @format
 *
 * Quick task 260515-iqi — REST helpers for email-verification.
 * sendEmailVerification + lookupAccount mirror the Identity Toolkit REST
 * pattern already used by sendPasswordResetEmail / signUp.
 */

import axios from 'axios';
import { AuthService } from '../AuthService';

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService.sendEmailVerification (260515-iqi)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('POSTs to :sendOobCode with requestType VERIFY_EMAIL and the idToken', async () => {
    mockedAxios.post.mockResolvedValue({ data: { email: 'a@b.com' } });

    const result = await AuthService.sendEmailVerification('id-token-123');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, body] = mockedAxios.post.mock.calls[0];
    expect(url).toContain(':sendOobCode');
    expect(body).toEqual({ requestType: 'VERIFY_EMAIL', idToken: 'id-token-123' });
    expect(result).toEqual({ email: 'a@b.com' });
  });

  test('rethrows the Firebase error payload on failure', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: { message: 'INVALID_ID_TOKEN' } } },
    });

    await expect(AuthService.sendEmailVerification('bad')).rejects.toEqual({
      message: 'INVALID_ID_TOKEN',
    });
  });
});

describe('AuthService.lookupAccount (260515-iqi)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('POSTs to :lookup with the idToken and returns the account payload', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { users: [{ localId: 'uid_1', emailVerified: true }] },
    });

    const result = await AuthService.lookupAccount('id-token-123');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, body] = mockedAxios.post.mock.calls[0];
    expect(url).toContain(':lookup');
    expect(body).toEqual({ idToken: 'id-token-123' });
    expect(result.users[0].emailVerified).toBe(true);
  });

  test('rethrows the Firebase error payload on failure', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: { message: 'INVALID_ID_TOKEN' } } },
    });

    await expect(AuthService.lookupAccount('bad')).rejects.toEqual({
      message: 'INVALID_ID_TOKEN',
    });
  });
});
