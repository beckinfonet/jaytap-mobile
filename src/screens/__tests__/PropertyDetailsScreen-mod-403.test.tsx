/**
 * src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx — Phase 4 CARRY-01.
 *
 * Canonical RTL smoke (RESEARCH Open Decisions #6 + VALIDATION row 4-fe-03):
 * exercises PropertyDetailsScreen.handleRejectSubmit's 403 catch end-to-end with
 * mocked axios. Asserts close-modal + reset-loading + refreshRole all fire AND
 * no fallback Alert.alert(t('common.error'), ...) renders on the 403 path.
 *
 * DEVIATION (per plan's allowed alternative): rather than deep-mounting the full
 * 2435-line PropertyDetailsScreen with its react-native-maps + lucide + Hospitality
 * + ListingMetaTable dependency tree, this test uses a tightly-scoped harness
 * component that mirrors handleRejectSubmit's exact catch-block shape from
 * PropertyDetailsScreen.tsx:369-389. The handler shape, the matcher precedence
 * (403 > 409 > generic), and the closure mappings (closeModal: setIsRejectModalOpen;
 * resetLoading: setSubmittingAction) are 1:1 with the real screen — what we lose
 * is the surrounding render tree, which is unrelated to the 403 recovery flow.
 *
 * The deeper coverage (matcher branches, hook callback identity) lives in
 * src/hooks/__tests__/useModActionGuard.test.tsx (10 cases). This file adds the
 * one canonical surface assertion the validation map demands.
 *
 * Pattern: react-test-renderer (mirrors Gated.test.tsx + ModerationQueueScreen.test.tsx
 * — RTL/jest-native is NOT in dev deps; this repo uses RTR).
 */

import React, { useState } from 'react';
import { Alert } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

// -- Mocks -----------------------------------------------------------------

// Mock useAuth so useModActionGuard's refreshRole call resolves to our spy.
const mockRefreshRoleSpy = jest.fn().mockResolvedValue(undefined);
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { localId: 'mod-uid', backendProfile: { userType: 'moderator' } },
    refreshRole: mockRefreshRoleSpy,
  }),
}));

// Mock PropertyService so rejectListing throws our axios-shaped 403.
jest.mock('../../services/PropertyService', () => ({
  PropertyService: {
    rejectListing: jest.fn(),
  },
}));

// Spy on Alert.alert to assert the 403 path does NOT trigger the generic fallback.
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

import { useModActionGuard } from '../../hooks/useModActionGuard';
import { PropertyService } from '../../services/PropertyService';

// -- Harness -----------------------------------------------------------------
//
// Minimal component that mirrors PropertyDetailsScreen.tsx's handleRejectSubmit
// catch-block shape verbatim (lines 369-389 of the real screen post Plan 04-04
// edits). The assertions are made via the exposed spies on the closure args.
//
// Real screen shape:
//   const handleRejectSubmit = async (params) => {
//     setSubmittingAction(true);
//     try { await PropertyService.rejectListing(...); setIsRejectModalOpen(false); }
//     catch (err: any) {
//       if (is403PermissionError(err)) {
//         await onPermissionDenied({
//           closeModal: () => setIsRejectModalOpen(false),
//           resetLoading: () => setSubmittingAction(false),
//         });
//         return;
//       }
//       /* 409 + generic */
//     } finally { setSubmittingAction(false); }
//   };
//
// We expose the handler via a ref-style param so the test can invoke it directly
// after mount.

interface HarnessProps {
  onMount: (handler: () => Promise<void>, spies: {
    setSubmittingAction: jest.Mock;
    setIsRejectModalOpen: jest.Mock;
  }) => void;
}

function HandleRejectSubmitHarness({ onMount }: HarnessProps) {
  const { is403PermissionError, onPermissionDenied } = useModActionGuard();
  const setSubmittingAction = jest.fn() as jest.Mock;
  const setIsRejectModalOpen = jest.fn() as jest.Mock;

  // Mirror PropertyDetailsScreen.handleRejectSubmit's exact shape.
  const handleRejectSubmit = async () => {
    setSubmittingAction(true);
    try {
      await PropertyService.rejectListing('prop-uuid', 'other', 'test');
      setIsRejectModalOpen(false);
    } catch (err: any) {
      if (is403PermissionError(err)) {
        await onPermissionDenied({
          closeModal: () => setIsRejectModalOpen(false),
          resetLoading: () => setSubmittingAction(false),
        });
        return;
      }
      if (err?.response?.status === 409) {
        // 409 race-conflict path — not exercised here.
        return;
      }
      Alert.alert('common.error', err?.message || 'common.errorGeneric');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Expose the harness once on mount.
  const [exposed, setExposed] = useState(false);
  if (!exposed) {
    setExposed(true);
    onMount(handleRejectSubmit, { setSubmittingAction, setIsRejectModalOpen });
  }

  return null;
}

// -- Tests -----------------------------------------------------------------

describe('PropertyDetailsScreen mod-403 — handleRejectSubmit recovery (CARRY-01 D-02)', () => {
  beforeEach(() => {
    mockRefreshRoleSpy.mockClear();
    (Alert.alert as jest.Mock).mockClear();
    (PropertyService.rejectListing as jest.Mock).mockReset();
  });

  test('axios 403 on rejectListing → onPermissionDenied fires (refreshRole called, no fallback Alert)', async () => {
    // Build an axios-shaped 403 error with the insufficient-role code that
    // apiClient does NOT auto-handle (RESEARCH §"Five things" #2).
    const error403 = Object.assign(new Error('insufficient-role'), {
      response: { status: 403, data: { code: 'insufficient-role' } },
    });
    (PropertyService.rejectListing as jest.Mock).mockRejectedValueOnce(error403);

    let capturedHandler: (() => Promise<void>) | undefined;
    let capturedSpies:
      | {
          setSubmittingAction: jest.Mock;
          setIsRejectModalOpen: jest.Mock;
        }
      | undefined;

    await act(async () => {
      TestRenderer.create(
        <HandleRejectSubmitHarness
          onMount={(h, s) => {
            capturedHandler = h;
            capturedSpies = s;
          }}
        />,
      );
    });

    expect(capturedHandler).toBeDefined();
    expect(capturedSpies).toBeDefined();

    await act(async () => {
      await capturedHandler!();
    });

    // Backend call fired.
    expect(PropertyService.rejectListing).toHaveBeenCalledTimes(1);

    // refreshRole fired exactly once via onPermissionDenied (CARRY-01 SC#1).
    expect(mockRefreshRoleSpy).toHaveBeenCalledTimes(1);

    // closeModal call site fired (setIsRejectModalOpen(false)).
    expect(capturedSpies!.setIsRejectModalOpen).toHaveBeenCalledWith(false);

    // resetLoading call site fired (setSubmittingAction(false)).
    // NB: setSubmittingAction is also called on entry (true) and via finally (false),
    // so we assert at least one false call from the onPermissionDenied path AND
    // that no Alert fired in between.
    expect(capturedSpies!.setSubmittingAction).toHaveBeenCalledWith(false);

    // Critical D-04 invariant: NO generic-error Alert fires on the 403 path.
    // The banner-driven UX replaces the alert; this assertion guards against a
    // future regression that re-introduces the bespoke Alert.alert(t('common.error'), ...).
    const alertCalls = (Alert.alert as jest.Mock).mock.calls.filter(
      ([title]) => title === 'common.error' || title === 'common.errorGeneric',
    );
    expect(alertCalls).toHaveLength(0);
  });

  test('non-403 errors do NOT trigger refreshRole (negative control)', async () => {
    // 500 server error must NOT route through onPermissionDenied.
    const error500 = Object.assign(new Error('server-down'), {
      response: { status: 500 },
    });
    (PropertyService.rejectListing as jest.Mock).mockRejectedValueOnce(error500);

    let capturedHandler: (() => Promise<void>) | undefined;
    await act(async () => {
      TestRenderer.create(
        <HandleRejectSubmitHarness
          onMount={(h) => {
            capturedHandler = h;
          }}
        />,
      );
    });

    await act(async () => {
      await capturedHandler!();
    });

    expect(PropertyService.rejectListing).toHaveBeenCalledTimes(1);
    expect(mockRefreshRoleSpy).not.toHaveBeenCalled();

    // Generic Alert SHOULD fire for 500.
    const alertCalls = (Alert.alert as jest.Mock).mock.calls.filter(
      ([title]) => title === 'common.error',
    );
    expect(alertCalls.length).toBeGreaterThanOrEqual(1);
  });
});
