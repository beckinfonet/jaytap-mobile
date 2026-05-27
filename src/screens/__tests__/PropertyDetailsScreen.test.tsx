/**
 * src/screens/__tests__/PropertyDetailsScreen.test.tsx — Phase 8 Plan 08-04.
 *
 * Co-located behavior pin for the PropertyDetailsScreen specs row (lines 1047-1077
 * post-rewrite). Five cases assert the Phase-8 anatomy:
 *
 *   Test 1: apartment (residential)         → 3 cells; Beds label = property.specs.bedrooms; Baths = bathroomCount
 *   Test 2: office (commercial, Beds hidden) → 2 cells; Baths label = property.specs.bathrooms
 *   Test 3: commercial (Beds hidden)         → 2 cells; areaSqm missing → '-'
 *   Test 4: hotel (hospitality, gate lifted) → 3 cells; Beds label = property.specs.rooms
 *   Test 5: hostel (gate lifted, empty Baths) → 3 cells; multiple '-' fallbacks
 *
 * Sibling regression fence: src/screens/__tests__/PropertyDetailsScreen-mod-403.test.tsx
 * is preserved untouched (CARRY-01 D-02 moderation 403 recovery dock).
 *
 * Pattern: react-test-renderer + act() ONLY (no @testing-library/*; no jest-native).
 * Heavy-tree mocking discipline cloned from PropertyDetailsScreen-mod-403.test.tsx.
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { Property } from '../../types/Property';

// -- Mocks -----------------------------------------------------------------

// Context hooks — return deterministic shape per test.
jest.mock('../../theme/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('../../hooks/useRole', () => ({ useRole: jest.fn() }));
jest.mock('../../hooks/useModActionGuard', () => ({
  useModActionGuard: () => ({
    is403PermissionError: jest.fn(() => false),
    onPermissionDenied: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Safe-area
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// PropertyService — getPropertyById fires in useEffect; resolve to the input so
// no state update + no flicker on render.
jest.mock('../../services/PropertyService', () => ({
  PropertyService: {
    getPropertyById: jest.fn().mockResolvedValue({}),
    approveListing: jest.fn(),
    rejectListing: jest.fn(),
    archiveAnyListing: jest.fn(),
    restoreListing: jest.fn(),
    hardDeleteListing: jest.fn(),
  },
}));

// Property category mock — drives `isHospitality` per case.
jest.mock('../../utils/propertyCategory', () => ({
  propertyTypeToCategory: jest.fn(),
  PROPERTY_TYPE_TO_CATEGORY: {},
  PROPERTY_TYPES: [],
}));

// Heavy subcomponents — render to null.
jest.mock('react-native-maps', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: () => null,
    Marker: () => null,
    PROVIDER_DEFAULT: 'default',
  };
});
jest.mock('@react-native-community/blur', () => ({ BlurView: () => null }));
jest.mock('@likashefqet/react-native-image-zoom', () => ({
  ImageZoom: () => null,
  ZOOM_TYPE: { DOUBLE_TAP: 'double-tap' },
}));
jest.mock('../../components/TourHeroCard', () => ({ TourHeroCard: () => null }));
jest.mock('../../components/ListingMetaTable', () => ({ ListingMetaTable: () => null }));
jest.mock('../../components/details/HeaderInfoCard', () => ({ HeaderInfoCard: ({ dealType, title, formattedAddress, statusPill, mapPreview }: any) => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const { useLanguage } = require('../../context/LanguageContext');
  const { t } = useLanguage();
  return React.createElement(View, { testID: 'header-info-card' },
    React.createElement(Text, null, dealType === 'sale' ? t('property.forSale') : t('property.forRent')),
    title ? React.createElement(Text, null, title) : null,
    statusPill ?? null,
    mapPreview ?? null,
  );
} }));
jest.mock('../../components/details/AttributeList', () => ({
  AttributeList: () => null,
  derivePropertyAttributes: () => [],
}));
jest.mock('../../components/details/MapPreviewCard', () => ({ MapPreviewCard: ({ onOpenFullScreen }: any) => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  const { useLanguage } = require('../../context/LanguageContext');
  const { t } = useLanguage();
  return React.createElement(TouchableOpacity, { onPress: onOpenFullScreen },
    React.createElement(Text, null, t('property.mapPreview.openButton')),
  );
} }));
jest.mock('../../components/details/KeyStatsCard', () => ({ KeyStatsCard: ({ beds, baths, areaSqm }: any) => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const { useLanguage } = require('../../context/LanguageContext');
  const { t } = useLanguage();
  return React.createElement(View, { testID: 'key-stats-card' },
    beds ? React.createElement(Text, null, String(beds.value)) : null,
    beds ? React.createElement(Text, null, t(beds.labelKey)) : null,
    React.createElement(Text, null, baths != null ? String(baths) : '-'),
    React.createElement(Text, null, t('property.specs.bathrooms')),
    React.createElement(Text, null, areaSqm != null ? String(areaSqm) : '-'),
    React.createElement(Text, null, 'm²'),
  );
} }));
jest.mock('../../components/StatusPill', () => ({ StatusPill: () => null }));
jest.mock('../../components/RejectionBanner', () => ({ RejectionBanner: () => null }));
jest.mock('../../components/NeedsMediaBanner', () => ({ NeedsMediaBanner: () => null }));
jest.mock('../../components/Gated', () => ({ Gated: ({ children }: any) => children ?? null }));
jest.mock('../../components/RejectListingModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/ArchiveListingModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/DeleteListingModal', () => ({ DeleteListingModal: () => null }));
jest.mock('../../components/HardDeleteConfirmModal', () => ({ HardDeleteConfirmModal: () => null }));

// Lucide icon set — render to null, not asserted.
jest.mock('lucide-react-native', () => {
  return new Proxy(
    {},
    {
      get: () => () => null,
    },
  );
});

// Other utilities (kept real — pure derivations on the Property shape).
jest.mock('../../utils/getTourPhotosUrl', () => ({
  getTourPhotosUrl: () => undefined,
}));

// -- Imports after mocks -----------------------------------------------------

import { PropertyDetailsScreen } from '../PropertyDetailsScreen';

const { useTheme } = require('../../theme/ThemeContext');
const { useAuth } = require('../../context/AuthContext');
const { useLanguage } = require('../../context/LanguageContext');
const { useRole } = require('../../hooks/useRole');
const { propertyTypeToCategory } = require('../../utils/propertyCategory');

// -- Helpers -----------------------------------------------------------------

const setupMocks = (category: 'Residential' | 'Commercial' | 'Hospitality') => {
  (propertyTypeToCategory as jest.Mock).mockReturnValue(category);

  useTheme.mockReturnValue({
    isDark: false,
    colors: {
      // Empty strings — tests do not assert color values.
      background: '',
      surface: '',
      text: '',
      textSecondary: '',
      textTertiary: '',
      primary: '',
      primaryLight: '',
      accent: '',
      border: '',
      inputBackground: '',
      chipBackground: '',
      chipBorder: '',
      error: '',
      success: '',
      warning: '',
      buttonText: '',
    },
  });

  useAuth.mockReturnValue({
    user: { localId: 'viewer-uid', backendProfile: { userType: 'user' } },
    refreshRole: jest.fn().mockResolvedValue(undefined),
  });

  // t mock: return the key verbatim so assertions match the literal key string.
  useLanguage.mockReturnValue({ t: (key: string) => key, language: 'en' });

  useRole.mockReturnValue({
    role: 'user',
    can: () => false,
  });
};

// Collect every rendered Text node's stringified children — clone of
// PropertyCard.specChip.test.tsx:111-124.
const collectTexts = (tree: TestRenderer.ReactTestRenderer): string[] => {
  const out: string[] = [];
  tree.root.findAllByType(Text).forEach((node) => {
    const c = node.props.children;
    if (typeof c === 'string') {
      out.push(c);
    } else if (typeof c === 'number') {
      out.push(String(c));
    } else if (Array.isArray(c)) {
      c.forEach((sub) => {
        if (typeof sub === 'string') out.push(sub);
        else if (typeof sub === 'number') out.push(String(sub));
      });
    }
  });
  return out;
};

const makeProperty = (overrides: Partial<Property>): Property =>
  ({
    id: 'p-test',
    dealType: 'rent_long',
    content: { title: 'Test listing', description: '' },
    media: { photos: [], videos: [] },
    location: { city: 'Bishkek', district: 'Center', coordinates: { lat: 0, lng: 0 } },
    ...overrides,
  } as unknown as Property);

const renderScreen = (property: Property): TestRenderer.ReactTestRenderer => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <PropertyDetailsScreen
        property={property}
        onBack={jest.fn()}
        onOpenTours={jest.fn()}
        onOpenPhotos={jest.fn()}
        onMessagePress={jest.fn()}
        onScheduleViewing={jest.fn()}
      />,
    );
  });
  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// -- Tests -----------------------------------------------------------------

describe('PropertyDetailsScreen specs row — Phase 8 Plan 08-04 (DISP-01..03)', () => {
  test('Test 1 (apartment, residential): Beds=2 / Baths=1.5 / m²=85 + bedrooms label', () => {
    setupMocks('Residential');
    const tree = renderScreen(
      makeProperty({
        propertyType: 'apartment',
        basics: { bedrooms: 2, bathroomCount: 1.5, areaSqm: 85 },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('2');
    expect(texts).toContain('1.5');
    expect(texts).toContain('85');
    expect(texts).toContain('property.specs.bedrooms');
    expect(texts).toContain('property.specs.bathrooms');
    expect(texts).toContain('m²');
    // Residential MUST NOT use the rooms label.
    expect(texts).not.toContain('property.specs.rooms');
  });

  test('Test 2 (office, Beds hidden): Baths=1 / m²=120; bedrooms label absent', () => {
    setupMocks('Commercial');
    const tree = renderScreen(
      makeProperty({
        propertyType: 'office',
        basics: { bathroomCount: 1, areaSqm: 120 },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('1');
    expect(texts).toContain('120');
    expect(texts).toContain('property.specs.bathrooms');
    expect(texts).toContain('m²');
    // Beds cell omitted entirely — neither label appears.
    expect(texts).not.toContain('property.specs.bedrooms');
    expect(texts).not.toContain('property.specs.rooms');
  });

  test('Test 3 (commercial, Beds hidden): Baths=2; bedrooms/rooms labels absent; areaSqm missing → "-"', () => {
    setupMocks('Commercial');
    const tree = renderScreen(
      makeProperty({
        propertyType: 'commercial',
        basics: { bathroomCount: 2 },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('2');
    expect(texts).toContain('property.specs.bathrooms');
    expect(texts).toContain('-'); // areaSqm absent → '-'
    expect(texts).not.toContain('property.specs.bedrooms');
    expect(texts).not.toContain('property.specs.rooms');
  });

  test('Test 4 (hotel, gate lifted): Beds=4 / Baths=1 / m²=20 + rooms label (NOT bedrooms)', () => {
    setupMocks('Hospitality');
    const tree = renderScreen(
      makeProperty({
        propertyType: 'hotel',
        basics: { hotelRooms: 4 as any, bathroomCount: 1, areaSqm: 20 },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('4');
    expect(texts).toContain('1');
    expect(texts).toContain('20');
    // Gate-lift + label-flip proof: hospitality uses rooms, NOT bedrooms.
    expect(texts).toContain('property.specs.rooms');
    expect(texts).toContain('property.specs.bathrooms');
    expect(texts).toContain('m²');
    expect(texts).not.toContain('property.specs.bedrooms');
  });

  test('Test 5 (hostel, gate lifted, empty Baths fallback): hotelRooms=1; bathroomCount + areaSqm absent', () => {
    setupMocks('Hospitality');
    const tree = renderScreen(
      makeProperty({
        propertyType: 'hostel',
        basics: { hotelRooms: 1 as any },
      }),
    );
    const texts = collectTexts(tree);
    expect(texts).toContain('1');
    expect(texts).toContain('property.specs.rooms');
    expect(texts).toContain('property.specs.bathrooms');
    expect(texts).toContain('m²');
    expect(texts).not.toContain('property.specs.bedrooms');
    // Both Baths cell (bathroomCount missing) and m² cell (areaSqm missing) fall back to '-'.
    const dashCount = texts.filter((s) => s === '-').length;
    expect(dashCount).toBeGreaterThanOrEqual(2);
  });
});

// -- New contract assertions (M5 Phase 1 redesign) ---------------------------

describe('PropertyDetailsScreen M5 redesign — HeaderInfoCard + MapPreviewCard wiring', () => {
  test('does NOT render For Sale / For Rent inside the hero image overlay (now in HeaderInfoCard)', () => {
    setupMocks('Residential');
    const tree = renderScreen(
      makeProperty({
        propertyType: 'apartment',
        dealType: 'sale',
        basics: { bedrooms: 2, bathroomCount: 1, areaSqm: 60 },
      }),
    );
    const texts = collectTexts(tree);
    // Post-redesign: deal label appears exactly once — inside HeaderInfoCard pill.
    // The hero-overlay statusBadge has been removed.
    const saleCount = texts.filter((s) => s === 'property.forSale').length;
    expect(saleCount).toBe(1);
  });

  test('renders FOR SALE in the HeaderInfoCard pill row (replaces hero badge)', () => {
    setupMocks('Residential');
    const tree = renderScreen(
      makeProperty({
        propertyType: 'apartment',
        dealType: 'sale',
        basics: { bedrooms: 2, bathroomCount: 1, areaSqm: 60 },
      }),
    );
    // t mock returns the i18n key verbatim per project convention.
    expect(collectTexts(tree)).toContain('property.forSale');
  });

  test('renders the MapPreviewCard "Map" button (replaces the inline map fullScreen overlay)', () => {
    setupMocks('Residential');
    const tree = renderScreen(
      makeProperty({
        propertyType: 'apartment',
        dealType: 'sale',
        basics: { bedrooms: 2, bathroomCount: 1, areaSqm: 60 },
      }),
    );
    const texts = collectTexts(tree);
    // New: MapPreviewCard button is present.
    expect(texts.some((s) => s.includes('property.mapPreview.openButton'))).toBe(true);
    // Old: inline map overlay "fullScreen" button text is gone.
    expect(texts.some((s) => s.includes('property.fullScreen'))).toBe(false);
  });
});
