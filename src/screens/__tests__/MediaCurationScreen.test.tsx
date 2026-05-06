/**
 * Phase 3 Plan 03-05 — RTL smoke test for MediaCurationScreen.
 *
 * Asserts the three D-12 + T-04 invariants:
 *   1. Approve button is disabled when listing.media.photos.length === 0
 *      (i.e. the disabled-hint i18n key renders below the button row).
 *   2. Approve button is enabled when listing.media.photos.length > 0
 *      (the disabled-hint key does NOT render).
 *   3. The screen returns null when useRole().can('approveListings') is
 *      false (belt-and-suspenders mod gate; deep-link / hot-reload race).
 *
 * Pattern: react-test-renderer (matches existing repo pattern at
 * src/components/__tests__/Gated.test.tsx — RTL/jest-native isn't yet in
 * the dev deps; smoke covers the gating logic without needing a real
 * native runtime).
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { MediaCurationScreen } from '../MediaCurationScreen';

// -- Mocks -----------------------------------------------------------------

jest.mock('../../services/MediaCurationService', () => ({
  MediaCurationService: {
    uploadMedia: jest.fn(),
    deleteMediaAsset: jest.fn(),
  },
}));

jest.mock('../../services/PropertyService', () => ({
  PropertyService: {
    getPropertyById: jest.fn(),
    approveListing: jest.fn(),
  },
}));

jest.mock('../../hooks/useRole', () => ({
  useRole: jest.fn(),
}));

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFF',
      surface: '#FFF',
      text: '#000',
      textSecondary: '#666',
      textTertiary: '#999',
      border: '#EEE',
      success: '#4CAF50',
      error: '#F44',
      warning: '#F59E0B',
      onWarning: '#FFF',
      onAccent: '#FFF',
      scrim: 'rgba(0,0,0,0.55)',
      accent: '#FF385C',
      primary: '#000',
      primaryLight: '#F2EFE9',
      activeChipBackground: '#000',
      activeChipText: '#FFF',
      chipBackground: '#FFF',
      chipBorder: '#EEE',
      inputBackground: '#FFF',
    },
    isDark: false,
  }),
}));

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    // Identity-style translator: returns the key (interpolation ignored —
    // we assert on key presence, not the resolved string).
    t: (k: string) => k,
  }),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-keyboard-controller', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    KeyboardAwareScrollView: ({ children, ...props }: any) =>
      React.createElement(RN.ScrollView, props, children),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement(RN.View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// lucide-react-native ships pure JS icon components; mock to a noop View so
// the test runtime doesn't need to load SVG.
jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const stub = (name: string) => (props: any) =>
    React.createElement(RN.View, { ...props, accessibilityLabel: name });
  return new Proxy(
    {},
    {
      get: (_t, prop) => stub(String(prop)),
    },
  );
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRole } = require('../../hooks/useRole');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PropertyService } = require('../../services/PropertyService');

describe('MediaCurationScreen — Phase 3 Plan 03-05 smoke', () => {
  beforeEach(() => {
    (useRole as jest.Mock).mockReset();
    PropertyService.getPropertyById.mockReset();
    PropertyService.approveListing.mockReset();
  });

  test('Approve disabled-hint renders when listing.media.photos.length === 0', async () => {
    (useRole as jest.Mock).mockReturnValue({
      can: (a: string) => a === 'approveListings',
    });
    PropertyService.getPropertyById.mockResolvedValue({
      _id: 'l1',
      media: { photos: [], videos: [], tourUrl: undefined },
      status: 'pending',
    });

    let tree: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <MediaCurationScreen
          listingId="l1"
          onClose={jest.fn()}
          onApproveSuccess={jest.fn()}
        />,
      );
    });
    // Drain pending microtasks (the on-mount fetch + setState).
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });
    const json = JSON.stringify(tree!.toJSON());
    // The disabled-hint key MUST render when photos is empty (D-12).
    expect(json).toContain('moderation.mediaCuration.approve.disabled.hint');
    // Approve button label key is also present — the disabled state is via
    // `disabled` prop + opacity, not by hiding the button.
    expect(json).toContain('moderation.mediaCuration.approve.button');
  });

  test('Approve disabled-hint does NOT render when photos is non-empty', async () => {
    (useRole as jest.Mock).mockReturnValue({
      can: (a: string) => a === 'approveListings',
    });
    PropertyService.getPropertyById.mockResolvedValue({
      _id: 'l1',
      media: {
        photos: ['https://x/p.jpg'],
        videos: [],
        tourUrl: undefined,
      },
      status: 'pending',
    });

    let tree: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <MediaCurationScreen
          listingId="l1"
          onClose={jest.fn()}
          onApproveSuccess={jest.fn()}
        />,
      );
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain(
      'moderation.mediaCuration.approve.disabled.hint',
    );
    // Sanity: the photo-section header key still renders (interpolated key
    // is the same regardless of {count}).
    expect(json).toContain('moderation.mediaCuration.photos.section');
  });

  test('Returns null when useRole.can("approveListings") is false (mod gate)', async () => {
    (useRole as jest.Mock).mockReturnValue({ can: () => false });
    PropertyService.getPropertyById.mockResolvedValue({
      _id: 'l1',
      media: { photos: [], videos: [], tourUrl: undefined },
      status: 'pending',
    });

    let tree: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <MediaCurationScreen
          listingId="l1"
          onClose={jest.fn()}
          onApproveSuccess={jest.fn()}
        />,
      );
    });
    expect(tree!.toJSON()).toBeNull();
  });

  // ----------------------------------------------------------------------
  // HG-01 regression — role flips false mid-session.
  //
  // Reviewer (`03-REVIEW.md` HG-01) flagged that the mod gate used to sit
  // BEFORE useMemo/useEffect/useCallback inside the component. If
  // `useRole()` flipped to false on a subsequent render (e.g. via M2
  // ROLE-09 single-flight 401/403 demoting the user mid-action), the next
  // render would call FEWER hooks than the prior render and React would
  // throw `Invariant Violation: Rendered fewer hooks than expected`.
  //
  // The fix relocated the gate to AFTER every hook in the component. This
  // test asserts the regression is closed by:
  //   1. Mounting with `can() = true` (full hook set runs).
  //   2. Flipping the `useRole` mock to return `can() = false`.
  //   3. Re-rendering: must NOT throw, must collapse to null.
  //
  // If the gate is ever moved back above the hooks, this test will throw
  // `Rendered fewer hooks than expected` on the rerender and fail loudly.
  // ----------------------------------------------------------------------
  test('does not violate React hooks rules when role flips false mid-session (HG-01 regression)', async () => {
    (useRole as jest.Mock).mockReturnValue({
      can: (a: string) => a === 'approveListings',
    });
    PropertyService.getPropertyById.mockResolvedValue({
      _id: 'l1',
      media: { photos: [], videos: [], tourUrl: undefined },
      status: 'pending',
    });

    let tree: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <MediaCurationScreen
          listingId="l1"
          onClose={jest.fn()}
          onApproveSuccess={jest.fn()}
        />,
      );
    });
    // Drain on-mount fetch + setState — first render produces real JSX.
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });
    expect(tree!.toJSON()).not.toBeNull();

    // Flip useRole to non-mod, simulating a mid-session role demote
    // (M2 ROLE-09 single-flight 401/403 refresh, or admin demotion in
    // a sibling session).
    (useRole as jest.Mock).mockReturnValue({ can: () => false });

    // The rerender MUST NOT throw `Invariant Violation: Rendered fewer
    // hooks than expected`. With HG-01 fixed (gate after all hooks),
    // every hook still runs; only the JSX render collapses to null.
    expect(() => {
      ReactTestRenderer.act(() => {
        tree!.update(
          <MediaCurationScreen
            listingId="l1"
            onClose={jest.fn()}
            onApproveSuccess={jest.fn()}
          />,
        );
      });
    }).not.toThrow();

    // Post-flip render: screen unmounts cleanly to null (mod gate engaged).
    expect(tree!.toJSON()).toBeNull();
  });

  test('Photo grid renders with photos.section label', async () => {
    (useRole as jest.Mock).mockReturnValue({
      can: (a: string) => a === 'approveListings',
    });
    PropertyService.getPropertyById.mockResolvedValue({
      _id: 'l1',
      media: { photos: [], videos: [], tourUrl: undefined },
      status: 'pending',
    });

    let tree: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <MediaCurationScreen
          listingId="l1"
          onClose={jest.fn()}
          onApproveSuccess={jest.fn()}
        />,
      );
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });
    const json = JSON.stringify(tree!.toJSON());
    // Header + both section labels render.
    expect(json).toContain('moderation.mediaCuration.header.title');
    expect(json).toContain('moderation.mediaCuration.photos.section');
    expect(json).toContain('moderation.mediaCuration.videos.section');
    // Empty state renders when photos === 0 + pendingPhotos === 0.
    expect(json).toContain('moderation.mediaCuration.empty.title');
  });
});
