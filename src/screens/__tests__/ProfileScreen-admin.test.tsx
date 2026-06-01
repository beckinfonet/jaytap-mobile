/**
 * src/screens/__tests__/ProfileScreen-admin.test.tsx
 *
 * Phase 16 Plan 16-02 (PROF-02) — Admin + Moderator layout structure assertion.
 *
 * Two cases (split via per-test mock swap on useRole — single React module graph
 * to avoid hooks-null errors from jest.isolateModules-style isolation):
 *   1. role: 'admin'   → 4 ProfileTile + 3 ProfileToolTile, the 3rd ToolTile has wide=true (Role Mgmt).
 *   2. role: 'moderator' → 4 ProfileTile + 2 ProfileToolTile, NO wide=true (Role Mgmt absent — even count).
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

const setRoleMock = (role: 'admin' | 'moderator') => {
  (useRole as jest.Mock).mockReturnValue({
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    isAuthenticated: true,
    can: (action: string) => {
      if (role === 'admin') return true;
      if (action === 'manageRoles') return false;
      return true;
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
import ProfileRow from '../../components/profile/ProfileRow';
import ProfileTile from '../../components/profile/ProfileTile';
import ProfileToolTile from '../../components/profile/ProfileToolTile';
import IdentityCard from '../../components/profile/IdentityCard';
import OutlinedLogoutPill from '../../components/profile/OutlinedLogoutPill';
import SectionLabel from '../../components/SectionLabel';

// ---- Render helper --------------------------------------------------------

const renderScreen = async (): Promise<TestRenderer.ReactTestRenderer> => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(
      <ProfileScreen
        onBack={jest.fn()}
        onCreateListing={jest.fn()}
        onViewListings={jest.fn()}
        onViewFavorites={jest.fn()}
        onViewAppointments={jest.fn()}
        onViewAccountSettings={jest.fn()}
        onApplyLandlord={jest.fn()}
        onReviewLandlordApplications={jest.fn()}
        onReviewModerationQueue={jest.fn()}
        onOpenRoleManagement={jest.fn()}
        moderationCountRefreshKey={0}
      />,
    );
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
};

// ---- Tests ----------------------------------------------------------------

describe('ProfileScreen — admin layout (PROF-02)', () => {
  beforeEach(() => {
    (useRole as jest.Mock).mockReset();
  });

  test('role="admin" mounts 4 ProfileTile + 3 ProfileToolTile with Role Mgmt wide=true', async () => {
    setRoleMock('admin');
    const tree = await renderScreen();

    // 1 IdentityCard at the top.
    const cards = tree.root.findAllByType(IdentityCard);
    expect(cards.length).toBe(1);
    expect(cards[0].props.roleBadgeLabel).toBeDefined();
    expect(cards[0].props.role).toBe('admin');

    // SectionLabels: MY ACTIVITY + ADMIN TOOLS (NOT activity/hosting).
    const sectionTexts = tree.root
      .findAllByType(SectionLabel)
      .map((n) => n.props.children);
    expect(sectionTexts).toContain('profile.section.myActivity');
    expect(sectionTexts).toContain('profile.section.adminTools');
    expect(sectionTexts).not.toContain('profile.section.activity');
    expect(sectionTexts).not.toContain('profile.section.hosting');

    // 4 ProfileTile primitives in MY ACTIVITY.
    const tiles = tree.root.findAllByType(ProfileTile);
    expect(tiles.length).toBe(4);
    expect(tiles.filter((t) => t.props.accent === true).length).toBe(1);

    // 3 ProfileToolTile primitives in ADMIN TOOLS.
    const toolTiles = tree.root.findAllByType(ProfileToolTile);
    expect(toolTiles.length).toBe(3);
    // The 3rd (last) is wide=true (D-05 odd-tile-full-width).
    expect(toolTiles[0].props.wide).not.toBe(true);
    expect(toolTiles[1].props.wide).not.toBe(true);
    expect(toolTiles[2].props.wide).toBe(true);

    // 0 ProfileRow primitives (user-layout MUST NOT mount).
    expect(tree.root.findAllByType(ProfileRow).length).toBe(0);

    // OutlinedLogoutPill present.
    expect(tree.root.findAllByType(OutlinedLogoutPill).length).toBe(1);
  });

  test('role="moderator" mounts 4 ProfileTile + 2 ProfileToolTile, no wide=true (Role Mgmt absent)', async () => {
    setRoleMock('moderator');
    const tree = await renderScreen();

    const cards = tree.root.findAllByType(IdentityCard);
    expect(cards.length).toBe(1);
    expect(cards[0].props.role).toBe('moderator');
    expect(cards[0].props.roleBadgeLabel).toBeDefined();

    const sectionTexts = tree.root
      .findAllByType(SectionLabel)
      .map((n) => n.props.children);
    expect(sectionTexts).toContain('profile.section.myActivity');
    expect(sectionTexts).toContain('profile.section.adminTools');

    expect(tree.root.findAllByType(ProfileTile).length).toBe(4);

    const toolTiles = tree.root.findAllByType(ProfileToolTile);
    expect(toolTiles.length).toBe(2);
    expect(toolTiles.every((t) => !t.props.wide)).toBe(true);

    expect(tree.root.findAllByType(ProfileRow).length).toBe(0);
  });
});
