/**
 * src/screens/__tests__/ProfileScreen-user.test.tsx
 *
 * Phase 16 Plan 16-02 (PROF-01) — User-layout structure assertion.
 *
 * Asserts that when `useRole()` returns a non-staff role (`role: 'user'`,
 * `isAdmin: false`, `isModerator: false`), the rewritten ProfileScreen mounts
 * the GROUPED-ROWS layout:
 *   - 1 IdentityCard (NO RoleBadge child)
 *   - 1 LandlordApplicationStatusBanner (self-suppressing for staff — visible here)
 *   - ACTIVITY SectionLabel
 *   - 2 ProfileRow primitives (Favorites + Appointments)
 *   - HOSTING SectionLabel
 *   - 1 ProfileRow (My Listings — gated by canManageListings)
 *   - 1 ProfileRow with `accent={true}` (Create Listing — gated by canManageListings)
 *   - 1 OutlinedLogoutPill
 *   - 0 ProfileTile / ProfileToolTile primitives
 *   - 0 ADMIN TOOLS SectionLabel
 *
 * Pattern: react-test-renderer + act (project convention). Mocks per
 * src/screens/__tests__/ModerationQueueScreen.test.tsx lines 39-99 (useRole
 * jest.mock + comprehensive useTheme colors dump + LanguageContext identity
 * translator).
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// ---- Mocks (must precede import of ProfileScreen) -------------------------

jest.mock('../../hooks/useRole', () => {
  const actual = jest.requireActual('../../hooks/useRole');
  return {
    ...actual,
    useRole: () => ({
      role: 'user',
      isAdmin: false,
      isModerator: false,
      isAuthenticated: true,
      // Plain user with backendProfile.canListProperties === true so HOSTING
      // card + Create Listing row render. Other actions remain denied.
      can: (action: string) =>
        action === 'manageListings' ? true : false,
    }),
  };
});

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
    user: { localId: 'test-user', email: 'user@example.com' },
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
import { LandlordApplicationStatusBanner } from '../../components/LandlordApplicationStatusBanner';

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
  // Drain microtasks (mount fetcher resolves).
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
};

// ---- Tests ----------------------------------------------------------------

describe('ProfileScreen — user layout (PROF-01)', () => {
  test('renders grouped-rows layout for role="user" with no admin surfaces', async () => {
    const tree = await renderScreen();

    // 1 IdentityCard mounted at the top of the screen.
    expect(tree.root.findAllByType(IdentityCard).length).toBe(1);

    // LandlordApplicationStatusBanner mounted unconditionally (self-suppresses
    // for staff — visible for the regular user case).
    expect(tree.root.findAllByType(LandlordApplicationStatusBanner).length).toBe(1);

    // 2 SectionLabels expected: ACTIVITY + HOSTING (no ADMIN TOOLS / MY ACTIVITY).
    const sectionLabels = tree.root.findAllByType(SectionLabel);
    const sectionTexts = sectionLabels.map((n) => n.props.children);
    expect(sectionTexts).toContain('profile.section.activity');
    expect(sectionTexts).toContain('profile.section.hosting');
    expect(sectionTexts).not.toContain('profile.section.adminTools');
    expect(sectionTexts).not.toContain('profile.section.myActivity');

    // 3 + 1 ProfileRow primitives expected: Favorites + Appointments + My Listings + Create Listing (accent).
    const rows = tree.root.findAllByType(ProfileRow);
    expect(rows.length).toBe(4);

    // Exactly 1 row has accent={true} (Create Listing).
    const accentRows = rows.filter((r) => r.props.accent === true);
    expect(accentRows.length).toBe(1);

    // 1 OutlinedLogoutPill at the bottom.
    expect(tree.root.findAllByType(OutlinedLogoutPill).length).toBe(1);

    // Zero tile primitives — admin-layout pieces MUST NOT mount.
    expect(tree.root.findAllByType(ProfileTile).length).toBe(0);
    expect(tree.root.findAllByType(ProfileToolTile).length).toBe(0);
  });
});
