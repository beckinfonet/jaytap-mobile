/**
 * src/screens/__tests__/ProfileScreen-handlers.test.tsx
 *
 * Phase 16 Plan 16-02 (PROF-03) — All 9 nav handler props fire on Pressable tap.
 *
 * Strategy:
 *   - Mock useRole as admin so all 9 surfaces mount in the admin-layout (8 of them
 *     directly mounted; onApplyLandlord goes through the LandlordApplicationStatusBanner
 *     which self-suppresses for staff — so we run THAT one sub-case with a user-role
 *     mock instead, via jest.isolateModulesAsync).
 *   - For each handler, locate the Pressable inside the corresponding primitive
 *     (ProfileTile / ProfileToolTile / IdentityCard / OutlinedLogoutPill) by walking
 *     primitive instances and reading their `onPress` prop directly. We invoke the
 *     primitive's own onPress (which is bound to the handler we passed into ProfileScreen)
 *     via act(), then assert the handler mock was called once.
 *
 * 9 sub-cases (handler name → primitive carrying it):
 *   1. onViewFavorites               — ProfileTile #0 (admin) / ProfileRow #0 (user)
 *   2. onViewAppointments            — ProfileTile #1
 *   3. onViewListings                — ProfileTile #2 (admin) / ProfileRow #2 (user)
 *   4. onCreateListing               — ProfileTile #3 (admin accent) / ProfileRow #3 (user accent)
 *   5. onReviewLandlordApplications  — ProfileToolTile #0 (admin)
 *   6. onReviewModerationQueue       — ProfileToolTile #1 (admin)
 *   7. onOpenRoleManagement          — ProfileToolTile #2 (admin)
 *   8. onViewAccountSettings         — IdentityCard onPress
 *   9. onApplyLandlord               — LandlordApplicationStatusBanner press (user role)
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// ---- Shared mocks ---------------------------------------------------------

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    isDark: true,
    colors: {
      background: '#121214',
      bgDim: '#0c0c0e',
      surface: '#1c1c20',
      surface2: '#26262c',
      surface3: '#303038',
      border: 'rgba(255,255,255,0.08)',
      hair2: 'rgba(255,255,255,0.14)',
      text: '#f4f4f6',
      textSecondary: 'rgba(244,244,246,0.60)',
      textTertiary: 'rgba(244,244,246,0.40)',
      iconChipFg: 'rgba(244,244,246,0.85)',
      primary: '#FFFFFF',
      primaryLight: '#353941',
      success: '#66BB6A',
      error: '#EF5350',
      warning: '#F59E0B',
      onWarning: '#0F172A',
      onAccent: '#FFFFFF',
      accent: '#ff5a6f',
      accentSoft: 'rgba(255,90,111,0.16)',
      accentLine: 'rgba(255,90,111,0.45)',
      landlordGreen: '#35c98f',
      destructiveRed: '#ff4d4d',
      destructiveSoft: 'rgba(255,77,77,0.13)',
      scrim: 'rgba(0,0,0,0.55)',
      cardShadow: '#000000',
      buttonText: '#E0E0E0',
      inputBackground: '#2E3238',
      chipBackground: '#2E3238',
      chipBorder: '#3E4349',
      activeChipBackground: '#E0E0E0',
      activeChipText: '#121212',
    },
  }),
}));

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
  }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { localId: 'test-staff', email: 'staff@example.com' },
    logout: jest.fn().mockResolvedValue(undefined),
    refreshRole: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../services/AuthService', () => ({
  AuthService: {
    getBackendUser: jest.fn().mockResolvedValue({ canListProperties: true }),
  },
}));

jest.mock('../../services/PropertyService', () => ({
  PropertyService: {
    getModerationQueueCount: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../../services/LandlordApplicationService', () => ({
  LandlordApplicationService: {
    getMine: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement(RN.View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const stub = (name: string) => (props: any) =>
    React.createElement(RN.View, { ...props, accessibilityLabel: name });
  return new Proxy(
    {},
    { get: (_t, prop) => stub(String(prop)) },
  );
});

// ---- Render helper with role override -------------------------------------

interface RenderResult {
  tree: TestRenderer.ReactTestRenderer;
  handlers: {
    onBack: jest.Mock;
    onCreateListing: jest.Mock;
    onViewListings: jest.Mock;
    onViewFavorites: jest.Mock;
    onViewAppointments: jest.Mock;
    onViewAccountSettings: jest.Mock;
    onApplyLandlord: jest.Mock;
    onReviewLandlordApplications: jest.Mock;
    onReviewModerationQueue: jest.Mock;
    onOpenRoleManagement: jest.Mock;
  };
  Primitives: {
    ProfileTile: any;
    ProfileToolTile: any;
    ProfileRow: any;
    IdentityCard: any;
    OutlinedLogoutPill: any;
    LandlordApplicationStatusBanner: any;
  };
}

const renderWithRole = async (
  role: 'admin' | 'user',
): Promise<RenderResult> => {
  let result: RenderResult | null = null;
  await jest.isolateModulesAsync(async () => {
    jest.doMock('../../hooks/useRole', () => {
      const actual = jest.requireActual('../../hooks/useRole');
      return {
        ...actual,
        useRole: () => ({
          role,
          isAdmin: role === 'admin',
          isModerator: false,
          isAuthenticated: true,
          can: (action: string) => {
            if (role === 'admin') return true;
            // role === 'user' — only manageListings is permitted.
            return action === 'manageListings';
          },
        }),
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProfileScreen } = require('../ProfileScreen');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ProfileTileMod = require('../../components/profile/ProfileTile').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ProfileToolTileMod = require('../../components/profile/ProfileToolTile').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ProfileRowMod = require('../../components/profile/ProfileRow').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IdentityCardMod = require('../../components/profile/IdentityCard').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OutlinedLogoutPillMod = require('../../components/profile/OutlinedLogoutPill').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LandlordApplicationStatusBanner: LandlordBannerMod } =
      require('../../components/LandlordApplicationStatusBanner');

    const handlers = {
      onBack: jest.fn(),
      onCreateListing: jest.fn(),
      onViewListings: jest.fn(),
      onViewFavorites: jest.fn(),
      onViewAppointments: jest.fn(),
      onViewAccountSettings: jest.fn(),
      onApplyLandlord: jest.fn(),
      onReviewLandlordApplications: jest.fn(),
      onReviewModerationQueue: jest.fn(),
      onOpenRoleManagement: jest.fn(),
    };

    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(
        <ProfileScreen
          {...handlers}
          moderationCountRefreshKey={0}
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    result = {
      tree,
      handlers,
      Primitives: {
        ProfileTile: ProfileTileMod,
        ProfileToolTile: ProfileToolTileMod,
        ProfileRow: ProfileRowMod,
        IdentityCard: IdentityCardMod,
        OutlinedLogoutPill: OutlinedLogoutPillMod,
        LandlordApplicationStatusBanner: LandlordBannerMod,
      },
    };
  });
  return result!;
};

// ---- Tests ----------------------------------------------------------------

describe('ProfileScreen — 9 nav handlers wire correctly (PROF-03)', () => {
  test('onViewFavorites fires when admin MY ACTIVITY Favorites tile is tapped', async () => {
    const { tree, handlers, Primitives } = await renderWithRole('admin');
    const tiles = tree.root.findAllByType(Primitives.ProfileTile);
    expect(tiles.length).toBe(4);
    act(() => {
      tiles[0].props.onPress();
    });
    expect(handlers.onViewFavorites).toHaveBeenCalledTimes(1);
  });

  test('onViewAppointments fires when admin MY ACTIVITY Appointments tile is tapped', async () => {
    const { tree, handlers, Primitives } = await renderWithRole('admin');
    const tiles = tree.root.findAllByType(Primitives.ProfileTile);
    act(() => {
      tiles[1].props.onPress();
    });
    expect(handlers.onViewAppointments).toHaveBeenCalledTimes(1);
  });

  test('onViewListings fires when admin MY ACTIVITY My Listings tile is tapped', async () => {
    const { tree, handlers, Primitives } = await renderWithRole('admin');
    const tiles = tree.root.findAllByType(Primitives.ProfileTile);
    act(() => {
      tiles[2].props.onPress();
    });
    expect(handlers.onViewListings).toHaveBeenCalledTimes(1);
  });

  test('onCreateListing fires when admin MY ACTIVITY Create Listing accent tile is tapped', async () => {
    const { tree, handlers, Primitives } = await renderWithRole('admin');
    const tiles = tree.root.findAllByType(Primitives.ProfileTile);
    // 4th tile is the accent Create Listing variant.
    expect(tiles[3].props.accent).toBe(true);
    act(() => {
      tiles[3].props.onPress();
    });
    expect(handlers.onCreateListing).toHaveBeenCalledTimes(1);
  });

  test('onReviewLandlordApplications fires when ADMIN TOOLS Landlord Apps tile is tapped', async () => {
    const { tree, handlers, Primitives } = await renderWithRole('admin');
    const toolTiles = tree.root.findAllByType(Primitives.ProfileToolTile);
    expect(toolTiles.length).toBe(3);
    act(() => {
      toolTiles[0].props.onPress();
    });
    expect(handlers.onReviewLandlordApplications).toHaveBeenCalledTimes(1);
  });

  test('onReviewModerationQueue fires when ADMIN TOOLS Moderation Queue tile is tapped', async () => {
    const { tree, handlers, Primitives } = await renderWithRole('admin');
    const toolTiles = tree.root.findAllByType(Primitives.ProfileToolTile);
    act(() => {
      toolTiles[1].props.onPress();
    });
    expect(handlers.onReviewModerationQueue).toHaveBeenCalledTimes(1);
  });

  test('onOpenRoleManagement fires when ADMIN TOOLS Role Management tile is tapped', async () => {
    const { tree, handlers, Primitives } = await renderWithRole('admin');
    const toolTiles = tree.root.findAllByType(Primitives.ProfileToolTile);
    expect(toolTiles[2].props.wide).toBe(true);
    act(() => {
      toolTiles[2].props.onPress();
    });
    expect(handlers.onOpenRoleManagement).toHaveBeenCalledTimes(1);
  });

  test('onViewAccountSettings fires when the IdentityCard is tapped', async () => {
    const { tree, handlers, Primitives } = await renderWithRole('admin');
    const cards = tree.root.findAllByType(Primitives.IdentityCard);
    expect(cards.length).toBe(1);
    act(() => {
      cards[0].props.onPress();
    });
    expect(handlers.onViewAccountSettings).toHaveBeenCalledTimes(1);
  });

  test('onApplyLandlord fires when the LandlordApplicationStatusBanner is tapped (user role)', async () => {
    // Switch to a user role so the banner mounts (self-suppresses for staff).
    const { tree, handlers, Primitives } = await renderWithRole('user');
    const banners = tree.root.findAllByType(Primitives.LandlordApplicationStatusBanner);
    expect(banners.length).toBe(1);
    act(() => {
      banners[0].props.onPress();
    });
    expect(handlers.onApplyLandlord).toHaveBeenCalledTimes(1);
  });
});
