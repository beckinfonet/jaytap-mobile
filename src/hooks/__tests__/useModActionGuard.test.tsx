/**
 * src/hooks/__tests__/useModActionGuard.test.tsx — Phase 4 CARRY-01 D-02 unit + RTL coverage.
 *
 * Covers:
 *   - is403PermissionError matcher: 7 cases (PermissionDeniedError instance, axios 403 with various
 *     codes, message string fallback, 409/401 negative cases, null/undefined, generic Error).
 *   - useModActionGuard hook: onPermissionDenied calls reset+close+refreshRole exactly once;
 *     swallows refreshRole rejection (non-fatal — preserves UX even if backend re-fetch fails).
 *
 * Pattern source: src/hooks/__tests__/useRole.test.ts (pure-helper unit) + src/components/__tests__/Gated.test.tsx
 * (react-test-renderer scaffolding — RTL/jest-native is NOT in dev deps; this repo uses RTR).
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { is403PermissionError, useModActionGuard } from '../useModActionGuard';
import { PermissionDeniedError } from '../useRole';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));
const { useAuth } = require('../../context/AuthContext');

describe('is403PermissionError matcher', () => {
  test('returns true for PermissionDeniedError instance', () => {
    expect(is403PermissionError(new PermissionDeniedError())).toBe(true);
  });

  test('returns true for axios-shaped 403 error (code-agnostic)', () => {
    expect(is403PermissionError({ response: { status: 403 } })).toBe(true);
    expect(
      is403PermissionError({
        response: { status: 403, data: { code: 'insufficient-role' } },
      }),
    ).toBe(true);
    expect(
      is403PermissionError({
        response: { status: 403, data: { code: 'role-revoked' } },
      }),
    ).toBe(true);
  });

  test('returns true for E_PERMISSION_DENIED message string', () => {
    expect(is403PermissionError({ message: 'E_PERMISSION_DENIED' })).toBe(true);
  });

  test('returns false for 409 race conflict', () => {
    expect(is403PermissionError({ response: { status: 409 } })).toBe(false);
  });

  test('returns false for 401 unauthorized', () => {
    expect(is403PermissionError({ response: { status: 401 } })).toBe(false);
  });

  test('returns false for null and undefined', () => {
    expect(is403PermissionError(null)).toBe(false);
    expect(is403PermissionError(undefined)).toBe(false);
  });

  test('returns false for generic Error', () => {
    expect(is403PermissionError(new Error('boom'))).toBe(false);
  });
});

describe('useModActionGuard hook — onPermissionDenied behavior', () => {
  const refreshRoleMock = jest.fn();

  beforeEach(() => {
    refreshRoleMock.mockReset().mockResolvedValue(undefined);
    (useAuth as jest.Mock).mockReturnValue({ refreshRole: refreshRoleMock });
  });

  test('calls resetLoading + closeModal + refreshRole exactly once each', async () => {
    const closeModal = jest.fn();
    const resetLoading = jest.fn();

    let hookResult: ReturnType<typeof useModActionGuard> | undefined;
    function Probe() {
      hookResult = useModActionGuard();
      return null;
    }

    await act(async () => {
      TestRenderer.create(<Probe />);
    });

    await act(async () => {
      await hookResult!.onPermissionDenied({ closeModal, resetLoading });
    });

    expect(resetLoading).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(refreshRoleMock).toHaveBeenCalledTimes(1);
  });

  test('swallows refreshRole rejection (non-fatal)', async () => {
    refreshRoleMock.mockRejectedValueOnce(new Error('network'));
    const closeModal = jest.fn();
    const resetLoading = jest.fn();

    let hookResult: ReturnType<typeof useModActionGuard> | undefined;
    function Probe() {
      hookResult = useModActionGuard();
      return null;
    }
    await act(async () => {
      TestRenderer.create(<Probe />);
    });

    // Must NOT throw — the try/catch wrapper preserves UX even if refreshRole fails.
    await act(async () => {
      await expect(
        hookResult!.onPermissionDenied({ closeModal, resetLoading }),
      ).resolves.toBeUndefined();
    });

    expect(resetLoading).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  test('hook return shape is stable: matcher reference equals module export', async () => {
    let hookResult: ReturnType<typeof useModActionGuard> | undefined;
    function Probe() {
      hookResult = useModActionGuard();
      return null;
    }
    await act(async () => {
      TestRenderer.create(<Probe />);
    });

    // The hook re-exports the module-level matcher so service files can import it
    // without instantiating the hook (per CONTEXT D-02).
    expect(hookResult!.is403PermissionError).toBe(is403PermissionError);
  });
});
