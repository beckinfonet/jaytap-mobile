/**
 * src/screens/__tests__/ProfileScreen-admin.test.tsx
 *
 * Phase 16 Plan 16-02 (PROF-02) — Admin + Moderator layout structure assertion.
 *
 * Two cases (split into separate describe blocks so each can swap the useRole mock
 * via jest.isolateModules — matches PATTERNS.md § Test patterns guidance):
 *   1. role: 'admin'   → 4 ProfileTile + 3 ProfileToolTile, the 3rd ToolTile has wide=true (Role Mgmt).
 *   2. role: 'moderator' → 4 ProfileTile + 2 ProfileToolTile, NO wide=true (Role Mgmt absent — even count).
 *
 * The fixture also asserts:
 *   - IdentityCard renders with a roleBadgeLabel prop in both cases (RoleBadge child).
 *   - SectionLabels include MY ACTIVITY + ADMIN TOOLS (NOT ACTIVITY/HOSTING).
 *   - Zero ProfileRow primitives mount (user-layout pieces MUST NOT mount).
 *
 * Pattern: react-test-renderer + act + jest.isolateModules to swap useRole mocks
 * per case. Theme + Language + Auth mocks shared via top-level jest.mock.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// ---- Shared mocks (theme, language, auth, services, native libs) ----------

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

// ---- Per-case useRole mock swap helper ------------------------------------

const renderWithRole = async (role: 'admin' | 'moderator') => {
  let tree!: TestRenderer.ReactTestRenderer;
  let modules: any = {};
  await jest.isolateModulesAsync(async () => {
    jest.doMock('../../hooks/useRole', () => {
      const actual = jest.requireActual('../../hooks/useRole');
      return {
        ...actual,
        useRole: () => ({
          role,
          isAdmin: role === 'admin',
          isModerator: role === 'moderator',
          isAuthenticated: true,
          // admin: all actions allowed; moderator: all EXCEPT manageRoles.
          can: (action: string) => {
            if (role === 'admin') return true;
            if (action === 'manageRoles') return false;
            return true;
          },
        }),
      };
    });
    // Re-require modules AFTER doMock so the new useRole is bound.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProfileScreen } = require('../ProfileScreen');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ProfileRowMod = require('../../components/profile/ProfileRow').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ProfileTileMod = require('../../components/profile/ProfileTile').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ProfileToolTileMod = require('../../components/profile/ProfileToolTile').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IdentityCardMod = require('../../components/profile/IdentityCard').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OutlinedLogoutPillMod = require('../../components/profile/OutlinedLogoutPill').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SectionLabelMod = require('../../components/SectionLabel').default;
    modules = {
      ProfileRow: ProfileRowMod,
      ProfileTile: ProfileTileMod,
      ProfileToolTile: ProfileToolTileMod,
      IdentityCard: IdentityCardMod,
      OutlinedLogoutPill: OutlinedLogoutPillMod,
      SectionLabel: SectionLabelMod,
    };

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
  });
  return { tree, ...modules };
};

// ---- Tests ----------------------------------------------------------------

describe('ProfileScreen — admin layout (PROF-02)', () => {
  test('role="admin" mounts 4 ProfileTile + 3 ProfileToolTile with Role Mgmt wide=true', async () => {
    const {
      tree,
      ProfileRow: ProfileRowT,
      ProfileTile: ProfileTileT,
      ProfileToolTile: ProfileToolTileT,
      IdentityCard: IdentityCardT,
      OutlinedLogoutPill: OutlinedLogoutPillT,
      SectionLabel: SectionLabelT,
    } = await renderWithRole('admin');

    // 1 IdentityCard at the top.
    const cards = tree.root.findAllByType(IdentityCardT);
    expect(cards.length).toBe(1);
    // The IdentityCard receives a roleBadgeLabel (RoleBadge child renders inside).
    expect(cards[0].props.roleBadgeLabel).toBeDefined();
    expect(cards[0].props.role).toBe('admin');

    // SectionLabels: MY ACTIVITY + ADMIN TOOLS (NOT activity/hosting).
    const sectionTexts = tree.root
      .findAllByType(SectionLabelT)
      .map((n: any) => n.props.children);
    expect(sectionTexts).toContain('profile.section.myActivity');
    expect(sectionTexts).toContain('profile.section.adminTools');
    expect(sectionTexts).not.toContain('profile.section.activity');
    expect(sectionTexts).not.toContain('profile.section.hosting');

    // 4 ProfileTile primitives in MY ACTIVITY (Favorites + Appointments + My Listings + Create Listing).
    const tiles = tree.root.findAllByType(ProfileTileT);
    expect(tiles.length).toBe(4);
    // Exactly one is accent (Create Listing).
    expect(tiles.filter((t: any) => t.props.accent === true).length).toBe(1);

    // 3 ProfileToolTile primitives in ADMIN TOOLS.
    const toolTiles = tree.root.findAllByType(ProfileToolTileT);
    expect(toolTiles.length).toBe(3);
    // The 3rd (last) is wide=true (D-05 odd-tile-full-width).
    expect(toolTiles[0].props.wide).not.toBe(true);
    expect(toolTiles[1].props.wide).not.toBe(true);
    expect(toolTiles[2].props.wide).toBe(true);

    // 0 ProfileRow primitives (user-layout MUST NOT mount).
    expect(tree.root.findAllByType(ProfileRowT).length).toBe(0);

    // OutlinedLogoutPill present.
    expect(tree.root.findAllByType(OutlinedLogoutPillT).length).toBe(1);
  });

  test('role="moderator" mounts 4 ProfileTile + 2 ProfileToolTile, no wide=true (Role Mgmt absent)', async () => {
    const {
      tree,
      ProfileRow: ProfileRowT,
      ProfileTile: ProfileTileT,
      ProfileToolTile: ProfileToolTileT,
      IdentityCard: IdentityCardT,
      SectionLabel: SectionLabelT,
    } = await renderWithRole('moderator');

    // IdentityCard with role='moderator' + roleBadgeLabel set.
    const cards = tree.root.findAllByType(IdentityCardT);
    expect(cards.length).toBe(1);
    expect(cards[0].props.role).toBe('moderator');
    expect(cards[0].props.roleBadgeLabel).toBeDefined();

    // SectionLabels: MY ACTIVITY + ADMIN TOOLS still present (moderator still gets dashboard).
    const sectionTexts = tree.root
      .findAllByType(SectionLabelT)
      .map((n: any) => n.props.children);
    expect(sectionTexts).toContain('profile.section.myActivity');
    expect(sectionTexts).toContain('profile.section.adminTools');

    // 4 ProfileTile primitives (same MY ACTIVITY grid).
    expect(tree.root.findAllByType(ProfileTileT).length).toBe(4);

    // 2 ProfileToolTile primitives (Landlord Apps + Moderation Queue — NO Role Mgmt).
    const toolTiles = tree.root.findAllByType(ProfileToolTileT);
    expect(toolTiles.length).toBe(2);

    // NO ToolTile has wide=true (even count, normal 2-up grid).
    expect(toolTiles.every((t: any) => !t.props.wide)).toBe(true);

    // 0 ProfileRow primitives.
    expect(tree.root.findAllByType(ProfileRowT).length).toBe(0);
  });
});
