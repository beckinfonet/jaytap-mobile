/**
 * src/hooks/useModActionGuard.ts — Phase 4 CARRY-01 D-02.
 *
 * Shared 403 detection + recovery for all moderator/admin action popups.
 * Catches both client-side PermissionDeniedError (canFromUser pre-check throws)
 * AND in-flight axios 403s (backend role-guard rejects after demote-mid-request,
 * including code: 'insufficient-role' which apiClient does NOT auto-handle).
 *
 * On 403: resetLoading + closeModal + refreshRole.
 * RoleRefreshBanner (mounted globally at App.tsx root since Phase 1 ROLE-10)
 * auto-surfaces from the AuthContext role-change mutation.
 */

import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { PermissionDeniedError } from './useRole';

export const is403PermissionError = (err: any): boolean =>
  err instanceof PermissionDeniedError ||
  err?.message === 'E_PERMISSION_DENIED' ||
  err?.response?.status === 403;

export interface OnPermissionDeniedArgs {
  closeModal: () => void;
  resetLoading: () => void;
}

export interface UseModActionGuardResult {
  is403PermissionError: (err: any) => boolean;
  onPermissionDenied: (args: OnPermissionDeniedArgs) => Promise<void>;
}

export function useModActionGuard(): UseModActionGuardResult {
  const { refreshRole } = useAuth();

  const onPermissionDenied = useCallback(
    async ({ closeModal, resetLoading }: OnPermissionDeniedArgs) => {
      resetLoading();
      closeModal();
      try {
        await refreshRole();
      } catch {
        // Non-fatal — refreshRole already warns; banner driven by AuthContext mutation.
      }
    },
    [refreshRole],
  );

  return { is403PermissionError, onPermissionDenied };
}
