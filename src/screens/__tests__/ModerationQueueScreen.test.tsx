/**
 * Phase 3 Plan 03-06 — RTL smoke test for ModerationQueueScreen filter chip predicate.
 *
 * Asserts the W2 + Open-Question-#1 invariants of the new filter chip row:
 *   1. Default filter `'all-pending'` displays all 3 listings.
 *   2. `'needs-media'` chip filters down to listings with media.photos.length === 0.
 *   3. `'has-media'` chip filters down to listings with media.photos.length > 0.
 *   4. tourUrl + videos do NOT factor into the predicate (Open Question #1).
 *   5. Row tap on a needs-media listing dispatches onOpenMediaCuration with id.
 *
 * Pattern: react-test-renderer (mirrors src/screens/__tests__/MediaCurationScreen.test.tsx
 * Plan 03-05 pattern + src/components/__tests__/Gated.test.tsx repo precedent — RTL/jest-native
 * is not in dev deps yet; smoke covers the predicate / branch logic without a real native runtime).
 *
 * PropertyCard is mocked to a deterministic stub so we can assert on a stable text
 * marker (`PROPERTY-CARD-{id}`) and trigger row tap by props.onPress directly.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ModerationQueueScreen } from '../ModerationQueueScreen';

// -- Mocks -----------------------------------------------------------------

jest.mock('../../services/PropertyService', () => ({
  PropertyService: {
    getModerationQueue: jest.fn(),
    approveListing: jest.fn(),
    rejectListing: jest.fn(),
  },
}));

jest.mock('../../services/locationService', () => ({
  fetchLocationsQueue: jest.fn().mockResolvedValue({ cities: [], districts: [] }),
  approveLocation: jest.fn(),
  rejectLocation: jest.fn(),
}));

jest.mock('../../hooks/useRole', () => {
  // Re-export the real PermissionDeniedError so the screen's `instanceof` check works.
  const actual = jest.requireActual('../../hooks/useRole');
  return {
    ...actual,
    useRole: () => ({
      role: 'moderator',
      isAdmin: false,
      isModerator: true,
      isAuthenticated: true,
      can: () => true,
    }),
  };
});

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
    // Identity-style translator: returns the key (interpolation ignored — assertions
    // are on key presence, not resolved string).
    t: (k: string) => k,
  }),
}));

// Phase 4 CARRY-01 D-02 — useModActionGuard reads useAuth().refreshRole at render
// time. Provide a no-op mock so the screen mounts; the recovery flow itself is
// covered by src/hooks/__tests__/useModActionGuard.test.tsx and the canonical
// PropertyDetailsScreen-mod-403 RTL surface.
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { localId: 'mod-uid', backendProfile: { userType: 'moderator' } },
    refreshRole: jest.fn().mockResolvedValue(undefined),
  }),
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

// PropertyCard stub — renders a deterministic marker per id so we can assert on it.
// Exposes onPress via testID so we can trigger the row tap programmatically.
jest.mock('../../components/PropertyCard', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    PropertyCard: ({ property, onPress }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        {
          testID: `propertycard-stub-${String(property.id)}`,
          onPress: () => onPress(property),
        },
        React.createElement(
          RN.Text,
          { testID: `propertycard-stub-text-${String(property.id)}` },
          `PROPERTY-CARD-${String(property.id)}`,
        ),
      ),
  };
});

// RejectListingModal stub — render nothing, the test does not exercise reject flow.
jest.mock('../../components/RejectListingModal', () => {
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: () => null,
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PropertyService } = require('../../services/PropertyService');

// FIXTURE — 3 listings:
//   A: photos=['x'], videos=[], tourUrl=undefined  → has-media
//   B: photos=[], videos=[], tourUrl=undefined     → needs-media
//   C: photos=[], videos=['v'], tourUrl='https://x' → needs-media (Open Question #1: tourUrl + videos do NOT count)
const FIXTURE = [
  {
    _id: 'a',
    id: 'a',
    status: 'pending',
    media: { photos: ['https://x/p.jpg'], videos: [], tourUrl: undefined },
    content: { title: 'A' },
    location: {},
  },
  {
    _id: 'b',
    id: 'b',
    status: 'pending',
    media: { photos: [], videos: [], tourUrl: undefined },
    content: { title: 'B' },
    location: {},
  },
  {
    _id: 'c',
    id: 'c',
    status: 'pending',
    media: { photos: [], videos: ['https://x/v.mp4'], tourUrl: 'https://x/tour' },
    content: { title: 'C' },
    location: {},
  },
];

const renderScreen = async (
  onOpenMediaCuration: jest.Mock = jest.fn(),
  onOpenPropertyDetails: jest.Mock = jest.fn(),
) => {
  let tree: ReactTestRenderer.ReactTestRenderer | null = null;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ModerationQueueScreen
        onBack={jest.fn()}
        onOpenPropertyDetails={onOpenPropertyDetails}
        onEditOnBehalf={jest.fn()}
        onOpenMediaCuration={onOpenMediaCuration}
      />,
    );
  });
  // Drain pending microtasks (the on-mount fetch + setState).
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree!;
};

// Test helper — predicate returns true if a PropertyCard stub for the given id is mounted.
// Uses findAllByProps (returns array — empty if no match) instead of JSON.stringify on
// tree.toJSON() (which can hit a circular-structure error on VirtualizedList internals
// during a setState-triggered re-render).
const hasRow = (tree: ReactTestRenderer.ReactTestRenderer, id: string): boolean => {
  return tree.root.findAllByProps({ testID: `propertycard-stub-${id}` }).length > 0;
};

describe('ModerationQueueScreen — Phase 3 Plan 03-06 filter chip predicate', () => {
  beforeEach(() => {
    PropertyService.getModerationQueue.mockReset();
    PropertyService.getModerationQueue.mockResolvedValue({
      items: FIXTURE.map((p) => ({ ...p })),
      totalCount: FIXTURE.length,
    });
  });

  test('Default filter all-pending shows all 3 listings (D-03 first-render preserved)', async () => {
    const tree = await renderScreen();
    expect(hasRow(tree, 'a')).toBe(true);
    expect(hasRow(tree, 'b')).toBe(true);
    expect(hasRow(tree, 'c')).toBe(true);
  });

  test('Tapping needs-media chip shows only listings with photos.length === 0 (B + C)', async () => {
    const tree = await renderScreen();
    const chip = tree.root.findByProps({
      testID: 'moderation-filter-chip-needs-media',
    });
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    // A has photos -> filtered OUT.
    expect(hasRow(tree, 'a')).toBe(false);
    // B + C are needs-media -> visible.
    expect(hasRow(tree, 'b')).toBe(true);
    // C has tourUrl + videos but ZERO photos -> still needs-media (Open Question #1).
    expect(hasRow(tree, 'c')).toBe(true);
  });

  test('Tapping has-media chip shows only listings with photos.length > 0 (A only)', async () => {
    const tree = await renderScreen();
    const chip = tree.root.findByProps({
      testID: 'moderation-filter-chip-has-media',
    });
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    // A has photos -> visible.
    expect(hasRow(tree, 'a')).toBe(true);
    // B has zero photos -> filtered OUT.
    expect(hasRow(tree, 'b')).toBe(false);
    // C has tourUrl + videos but ZERO photos -> NOT has-media (Open Question #1 resolution).
    expect(hasRow(tree, 'c')).toBe(false);
  });

  test('Row tap on needs-media listing dispatches onOpenPropertyDetails (post-fix 260514-rk1: unified row-tap so PropertyDetailsScreen photo-gate applies)', async () => {
    const onOpenMediaCuration = jest.fn();
    const onOpenPropertyDetails = jest.fn();
    const tree = await renderScreen(onOpenMediaCuration, onOpenPropertyDetails);

    // Tap row for listing B (zero-photos -> unified row-tap routes to
    // PropertyDetailsScreen so the existing photo-gate banner + disabled
    // Approve UX fires the same way as every other entry path).
    const rowB = tree.root.findByProps({ testID: 'propertycard-stub-b' });
    await ReactTestRenderer.act(async () => {
      rowB.props.onPress();
    });

    expect(onOpenPropertyDetails).toHaveBeenCalledTimes(1);
    expect(onOpenPropertyDetails.mock.calls[0][0]).toMatchObject({ id: 'b' });
    expect(onOpenMediaCuration).not.toHaveBeenCalled();
  });

  test('Row tap on has-media listing dispatches onOpenPropertyDetails (W2 mod-action branch — D-04)', async () => {
    const onOpenMediaCuration = jest.fn();
    const onOpenPropertyDetails = jest.fn();
    const tree = await renderScreen(onOpenMediaCuration, onOpenPropertyDetails);

    // Tap row for listing A (has-photos -> mod-action branch).
    const rowA = tree.root.findByProps({ testID: 'propertycard-stub-a' });
    await ReactTestRenderer.act(async () => {
      rowA.props.onPress();
    });

    expect(onOpenPropertyDetails).toHaveBeenCalledTimes(1);
    expect(onOpenPropertyDetails.mock.calls[0][0]).toMatchObject({ id: 'a' });
    expect(onOpenMediaCuration).not.toHaveBeenCalled();
  });
});
