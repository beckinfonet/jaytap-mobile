/**
 * src/screens/__tests__/ProfileScreen-handlers.test.tsx
 *
 * Phase 16 Plan 16-02 (PROF-03) — All 9 nav handler props fire on Pressable tap.
 *
 * Strategy:
 *   - Mock useRole as admin so all 9 surfaces mount in the admin-layout (8 of them
 *     directly mounted; onApplyLandlord goes through the LandlordApplicationStatusBanner
 *     which self-suppresses for staff — so we run THAT one sub-case with a user-role
 *     mock instead, via per-test useRole.mockReturnValue swap).
 *   - For each handler, locate the primitive instance (ProfileTile / ProfileToolTile /
 *     IdentityCard / LandlordApplicationStatusBanner) and invoke its `onPress` prop
 *     via act(), then assert the handler mock was called once.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// ---- useRole mock factory (swappable per-test) ----------------------------

jest.mock('../../hooks/useRole', () => {
  const actual = jest.requireActual('../../hooks/useRole');
  return {
    ...actual,
    useRole: jest.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRole } = require('../../hooks/useRole');

const setRoleMock = (role: 'admin' | 'user') => {
  (useRole as jest.Mock).mockReturnValue({
    role,
    isAdmin: role === 'admin',
    isModerator: false,
    isAuthenticated: true,
    can: (action: string) => {
      if (role === 'admin') return true;
      // role === 'user' — only manageListings is permitted.
      return action === 'manageListings';
    },
  });
};

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

// ---- Imports (after mocks) ------------------------------------------------

import { ProfileScreen } from '../ProfileScreen';
import ProfileTile from '../../components/profile/ProfileTile';
import ProfileToolTile from '../../components/profile/ProfileToolTile';
import IdentityCard from '../../components/profile/IdentityCard';
import { LandlordApplicationStatusBanner } from '../../components/LandlordApplicationStatusBanner';

// ---- Render helper --------------------------------------------------------

interface Handlers {
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
}

const renderScreen = async (): Promise<{
  tree: TestRenderer.ReactTestRenderer;
  handlers: Handlers;
}> => {
  const handlers: Handlers = {
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
      <ProfileScreen {...handlers} moderationCountRefreshKey={0} />,
    );
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return { tree, handlers };
};

// ---- Tests ----------------------------------------------------------------

describe('ProfileScreen — 9 nav handlers wire correctly (PROF-03)', () => {
  beforeEach(() => {
    (useRole as jest.Mock).mockReset();
  });

  test('onViewFavorites fires when admin MY ACTIVITY Favorites tile is tapped', async () => {
    setRoleMock('admin');
    const { tree, handlers } = await renderScreen();
    const tiles = tree.root.findAllByType(ProfileTile);
    expect(tiles.length).toBe(4);
    act(() => {
      tiles[0].props.onPress();
    });
    expect(handlers.onViewFavorites).toHaveBeenCalledTimes(1);
  });

  test('onViewAppointments fires when admin MY ACTIVITY Appointments tile is tapped', async () => {
    setRoleMock('admin');
    const { tree, handlers } = await renderScreen();
    const tiles = tree.root.findAllByType(ProfileTile);
    act(() => {
      tiles[1].props.onPress();
    });
    expect(handlers.onViewAppointments).toHaveBeenCalledTimes(1);
  });

  test('onViewListings fires when admin MY ACTIVITY My Listings tile is tapped', async () => {
    setRoleMock('admin');
    const { tree, handlers } = await renderScreen();
    const tiles = tree.root.findAllByType(ProfileTile);
    act(() => {
      tiles[2].props.onPress();
    });
    expect(handlers.onViewListings).toHaveBeenCalledTimes(1);
  });

  test('onCreateListing fires when admin MY ACTIVITY Create Listing accent tile is tapped', async () => {
    setRoleMock('admin');
    const { tree, handlers } = await renderScreen();
    const tiles = tree.root.findAllByType(ProfileTile);
    expect(tiles[3].props.accent).toBe(true);
    act(() => {
      tiles[3].props.onPress();
    });
    expect(handlers.onCreateListing).toHaveBeenCalledTimes(1);
  });

  test('onReviewLandlordApplications fires when ADMIN TOOLS Landlord Apps tile is tapped', async () => {
    setRoleMock('admin');
    const { tree, handlers } = await renderScreen();
    const toolTiles = tree.root.findAllByType(ProfileToolTile);
    expect(toolTiles.length).toBe(3);
    act(() => {
      toolTiles[0].props.onPress();
    });
    expect(handlers.onReviewLandlordApplications).toHaveBeenCalledTimes(1);
  });

  test('onReviewModerationQueue fires when ADMIN TOOLS Moderation Queue tile is tapped', async () => {
    setRoleMock('admin');
    const { tree, handlers } = await renderScreen();
    const toolTiles = tree.root.findAllByType(ProfileToolTile);
    act(() => {
      toolTiles[1].props.onPress();
    });
    expect(handlers.onReviewModerationQueue).toHaveBeenCalledTimes(1);
  });

  test('onOpenRoleManagement fires when ADMIN TOOLS Role Management tile is tapped', async () => {
    setRoleMock('admin');
    const { tree, handlers } = await renderScreen();
    const toolTiles = tree.root.findAllByType(ProfileToolTile);
    expect(toolTiles[2].props.wide).toBe(true);
    act(() => {
      toolTiles[2].props.onPress();
    });
    expect(handlers.onOpenRoleManagement).toHaveBeenCalledTimes(1);
  });

  test('onViewAccountSettings fires when the IdentityCard is tapped', async () => {
    setRoleMock('admin');
    const { tree, handlers } = await renderScreen();
    const cards = tree.root.findAllByType(IdentityCard);
    expect(cards.length).toBe(1);
    act(() => {
      cards[0].props.onPress();
    });
    expect(handlers.onViewAccountSettings).toHaveBeenCalledTimes(1);
  });

  test('onApplyLandlord fires when the LandlordApplicationStatusBanner is tapped (user role)', async () => {
    // Switch to a user role so the banner doesn't self-suppress.
    setRoleMock('user');
    const { tree, handlers } = await renderScreen();
    const banners = tree.root.findAllByType(LandlordApplicationStatusBanner);
    expect(banners.length).toBe(1);
    act(() => {
      banners[0].props.onPress();
    });
    expect(handlers.onApplyLandlord).toHaveBeenCalledTimes(1);
  });
});
