/**
 * src/context/__tests__/AuthContext.emailVerification.test.tsx
 *
 * Quick task 260515-iqi — AuthContext email-verification wiring.
 *
 * Covers:
 *   - signup() sends the verification email best-effort; a send failure does
 *     NOT fail sign-up (the banner + resend is the safety net).
 *   - signup() seeds user.emailVerified from the :signUp response.
 *   - recheckEmailVerified() reads :lookup and updates user.emailVerified.
 *   - recheckEmailVerified() recovers from a stale id token by refreshing it
 *     and re-looking-up (the documented stale-token gotcha).
 *
 * Pattern: react-test-renderer + act (RTL/jest-native is NOT in dev deps).
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../AuthContext';
import { LanguageProvider } from '../LanguageContext';
import { AuthService } from '../../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../services/AuthService');
jest.mock('../../services/apiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  registerAuthHooks: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn(),
}));

const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;

// Capture the live context value so tests can drive it.
let ctx: ReturnType<typeof useAuth>;
const Probe = () => {
  ctx = useAuth();
  return null;
};

const renderProvider = async () => {
  await act(async () => {
    TestRenderer.create(
      <LanguageProvider>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </LanguageProvider>,
    );
  });
};

describe('AuthContext signup() — best-effort verification send (260515-iqi)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuthService.getUserData.mockResolvedValue(null);
    mockedAuthService.saveToken.mockResolvedValue(undefined as any);
    mockedAuthService.createBackendUser.mockResolvedValue(undefined as any);
    mockedAuthService.getBackendUser.mockResolvedValue(null);
  });

  test('sends VERIFY_EMAIL after a successful sign-up and seeds emailVerified', async () => {
    mockedAuthService.signUp.mockResolvedValue({
      email: 'new@example.com',
      localId: 'uid_new',
      idToken: 'id-token-fresh',
      refreshToken: 'refresh-1',
      emailVerified: false,
    });
    mockedAuthService.sendEmailVerification.mockResolvedValue({} as any);

    await renderProvider();
    await act(async () => {
      await ctx.signup('new@example.com', 'Passw0rd!');
    });

    expect(mockedAuthService.sendEmailVerification).toHaveBeenCalledWith('id-token-fresh');
    expect(ctx.user?.emailVerified).toBe(false);
  });

  test('sign-up still succeeds when the verification-email send throws', async () => {
    mockedAuthService.signUp.mockResolvedValue({
      email: 'new@example.com',
      localId: 'uid_new',
      idToken: 'id-token-fresh',
      refreshToken: 'refresh-1',
      emailVerified: false,
    });
    mockedAuthService.sendEmailVerification.mockRejectedValue({ message: 'QUOTA_EXCEEDED' });

    await renderProvider();
    await act(async () => {
      await ctx.signup('new@example.com', 'Passw0rd!');
    });

    // sign-up completed: the user is set despite the failed send
    expect(ctx.user?.localId).toBe('uid_new');
  });
});

describe('AuthContext recheckEmailVerified() (260515-iqi)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuthService.getUserData.mockResolvedValue(null);
    mockedAuthService.saveToken.mockResolvedValue(undefined as any);
    mockedAuthService.createBackendUser.mockResolvedValue(undefined as any);
    mockedAuthService.getBackendUser.mockResolvedValue(null);
    mockedAuthService.signUp.mockResolvedValue({
      email: 'new@example.com',
      localId: 'uid_new',
      idToken: 'id-token-fresh',
      refreshToken: 'refresh-1',
      emailVerified: false,
    });
    mockedAuthService.sendEmailVerification.mockResolvedValue({} as any);
  });

  test('flips emailVerified to true when :lookup reports verified', async () => {
    mockedAuthService.getToken.mockResolvedValue('id-token-fresh');
    mockedAuthService.lookupAccount.mockResolvedValue({
      users: [{ localId: 'uid_new', emailVerified: true }],
    });

    await renderProvider();
    await act(async () => {
      await ctx.signup('new@example.com', 'Passw0rd!');
    });
    await act(async () => {
      await ctx.recheckEmailVerified();
    });

    expect(ctx.user?.emailVerified).toBe(true);
  });

  test('recovers from a stale token by refreshing then re-looking-up', async () => {
    mockedAuthService.getToken.mockResolvedValue('id-token-stale');
    // first lookup with the stale token throws; after refresh the retry succeeds
    mockedAuthService.lookupAccount
      .mockRejectedValueOnce({ message: 'INVALID_ID_TOKEN' })
      .mockResolvedValueOnce({ users: [{ localId: 'uid_new', emailVerified: true }] });
    mockedAuthService.refreshIdToken.mockResolvedValue('id-token-refreshed');

    await renderProvider();
    await act(async () => {
      await ctx.signup('new@example.com', 'Passw0rd!');
    });
    await act(async () => {
      await ctx.recheckEmailVerified();
    });

    expect(mockedAuthService.refreshIdToken).toHaveBeenCalledWith('refresh-1');
    expect(mockedAuthService.lookupAccount).toHaveBeenLastCalledWith('id-token-refreshed');
    expect(ctx.user?.emailVerified).toBe(true);
  });

  test('persists the resolved emailVerified to AsyncStorage (survives app restart)', async () => {
    mockedAuthService.getToken.mockResolvedValue('id-token-fresh');
    mockedAuthService.lookupAccount.mockResolvedValue({
      users: [{ localId: 'uid_new', emailVerified: true }],
    });
    // A stored userData blob exists, as it would after signup/login saveToken.
    mockedAuthService.getUserData.mockResolvedValue({
      localId: 'uid_new',
      email: 'new@example.com',
      emailVerified: false,
    });

    await renderProvider();
    await act(async () => {
      await ctx.signup('new@example.com', 'Passw0rd!');
    });
    await act(async () => {
      await ctx.recheckEmailVerified();
    });

    // Without this write, loadStorageData would rehydrate emailVerified=false
    // on the next launch and re-show the banner to a verified user.
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'userData',
      expect.stringContaining('"emailVerified":true'),
    );
  });
});
