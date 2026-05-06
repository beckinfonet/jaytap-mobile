/**
 * Phase 2 Plan 02-04b — ContextualListingFlow integration test (FLOW-13 + FLOW-15).
 *
 * Test stack: react-test-renderer (matches Step1-6 test files in this dir).
 *
 * Coverage:
 *   - INT-1: mode='create', apartment + rent_long Step 1→6 walk dispatches
 *     PropertyService.createProperty with the SPEC §"Suggested Data Shape" payload.
 *   - INT-2: mode='edit-mod' renders mod-context banner on Step 1 (FLOW-15).
 *   - INT-3: Step 6 footer Submit-button label morphs to `contextualListing.submit.modEdit`
 *     for mode='edit-mod' (CONTEXT specifics §"Step 6 Submit button").
 *
 * Mocks: theme, language, react-native-maps, locationService, PropertyService.
 * The mock PropertyService surfaces createProperty/updateProperty/editAsModerator
 * as jest.fn() so we can assert call args + counts.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import { ContextualListingFlow } from '../index';
import type { FormBag } from '../types';

jest.mock('../../../theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light' as const,
    colors: {
      text: '#000',
      textSecondary: '#666',
      background: '#FFF',
      surface: '#FFF',
      primary: '#007AFF',
      accent: '#FF385C',
      border: '#E0E0E0',
      error: '#FF3B30',
      warning: '#FF9500',
      activeChipBackground: '#2D2D2D',
      activeChipText: '#FFFFFF',
      inputBackground: '#FFF',
    },
    isDark: false,
    toggleTheme: () => undefined,
  }),
}));

jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: async () => undefined,
  }),
}));

// react-native-maps mock — same pattern as Step2.test.tsx (passes onPress through).
jest.mock('react-native-maps', () => {
  const ReactM = require('react');
  const { View } = require('react-native');
  const MapView = ({ children, onPress, testID, initialRegion, ...rest }: any) =>
    ReactM.createElement(
      View,
      { testID: testID ?? 'mock-mapview', onPress, initialRegion, ...rest },
      children,
    );
  const Marker = ({ testID, draggable, onDragEnd, coordinate, ...rest }: any) =>
    ReactM.createElement(View, {
      testID: testID ?? 'mock-marker',
      draggable,
      onDragEnd,
      coordinate,
      ...rest,
    });
  return { __esModule: true, default: MapView, Marker, PROVIDER_DEFAULT: 'default' };
});

// locationService mock — Bishkek + Asanbay seeded.
jest.mock('../../../services/locationService', () => ({
  fetchCities: jest.fn().mockResolvedValue([
    {
      _id: 'c1',
      slug: 'bishkek',
      label: { ru: 'Бишкек', en: 'Bishkek' },
      country: 'KG',
      centroid: { lat: 42.87, lng: 74.57 },
      status: 'approved',
      createdByUid: 'seed',
    },
  ]),
  fetchDistricts: jest.fn().mockResolvedValue([
    {
      _id: 'd1',
      cityId: 'c1',
      slug: 'asanbay',
      label: { ru: 'Асанбай', en: 'Asanbay' },
      status: 'approved',
      createdByUid: 'seed',
    },
  ]),
  createCity: jest.fn(),
  createDistrict: jest.fn(),
}));

// PropertyService mock — surface dispatch methods so we can assert calls.
jest.mock('../../../services/PropertyService', () => ({
  PropertyService: {
    createProperty: jest.fn().mockResolvedValue({ id: 'new-listing-id', _id: 'new-listing-id' }),
    updateProperty: jest.fn().mockResolvedValue({ id: 'updated-id', _id: 'updated-id' }),
    editAsModerator: jest.fn().mockResolvedValue({ id: 'mod-edited-id', _id: 'mod-edited-id' }),
  },
}));

// react-native-safe-area-context mock — orchestrator wraps in SafeAreaView.
jest.mock('react-native-safe-area-context', () => {
  const ReactM = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: any) =>
      ReactM.createElement(View, rest, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// lucide-react-native icons — render as plain Views so testID lookups don't fail.
jest.mock('lucide-react-native', () => {
  const ReactM = require('react');
  const { View } = require('react-native');
  const Stub = (props: any) => ReactM.createElement(View, props);
  return new Proxy(
    {},
    {
      get: () => Stub,
    },
  );
});

import { PropertyService } from '../../../services/PropertyService';

const createPropertyMock = PropertyService.createProperty as jest.Mock;
const updatePropertyMock = PropertyService.updateProperty as jest.Mock;
const editAsModeratorMock = PropertyService.editAsModerator as jest.Mock;

function findByTestID(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.findByProps({ testID });
}

function tryFindByTestID(root: ReactTestInstance, testID: string): ReactTestInstance | null {
  const matches = root.findAllByProps({ testID });
  return matches.length > 0 ? matches[0] : null;
}

function findAllTextNodesContaining(
  root: ReactTestInstance,
  needle: string,
): ReactTestInstance[] {
  const matches: ReactTestInstance[] = [];
  root.findAll((n) => {
    // react-test-renderer host-component types are string literals (e.g. 'Text', 'View').
    // TS narrows `type` to a string-literal union of intrinsic JSX names that doesn't
    // include 'Text' — cast to string for the comparison.
    const typeStr = typeof n.type === 'string' ? (n.type as string) : '';
    if (typeStr === 'Text') {
      const children = Array.isArray(n.children) ? n.children : [n.children];
      const textChild = children.find((c) => typeof c === 'string') as string | undefined;
      if (textChild && textChild.includes(needle)) {
        matches.push(n);
      }
    }
    return false;
  });
  return matches;
}

describe('ContextualListingFlow integration (Plan 02-04b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createPropertyMock.mockResolvedValue({ id: 'new-listing-id', _id: 'new-listing-id' });
    updatePropertyMock.mockResolvedValue({ id: 'updated-id', _id: 'updated-id' });
    editAsModeratorMock.mockResolvedValue({ id: 'mod-edited-id', _id: 'mod-edited-id' });
  });

  // INT-1: mode='create' — apartment + rent_long Step 1→6 walk dispatches createProperty
  test('INT-1: apartment + rent_long Step 1→6 walk dispatches PropertyService.createProperty with SPEC payload', async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ContextualListingFlow mode="create" onClose={onClose} onSuccess={onSuccess} />,
      );
    });
    const root = tree.root;

    // -- Step 1: pick rent_long + apartment, then Next --
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'deal-type-chip-rent_long').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'property-type-chip-apartment').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'contextual-listing-next').props.onPress();
    });

    // -- Step 2: wait for cities, pick city + district + drop pin --
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'city-chip-bishkek').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'district-chip-asanbay').props.onPress();
    });
    // Drop pin via mock MapView onPress passthrough
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'mock-mapview').props.onPress({
        nativeEvent: { coordinate: { latitude: 42.87, longitude: 74.57 } },
      });
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'contextual-listing-next').props.onPress();
    });

    // -- Step 3: area, price, currency, rooms --
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'basics-areaSqm').props.onChangeText('80');
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'basics-price').props.onChangeText('1000');
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'currency-chip-KGS').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'rooms-chip-2').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'contextual-listing-next').props.onPress();
    });

    // -- Step 4: condition + furnished --
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'condition-chip-good').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'furnished-chip-yes').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'contextual-listing-next').props.onPress();
    });

    // -- Step 5: title + description --
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'content-title').props.onChangeText('Cozy 2BR');
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'content-description').props.onChangeText('Nice place');
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'contextual-listing-next').props.onPress();
    });

    // -- Step 6: negotiable, prepayment, minTerm, then Submit --
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'negotiable-chip-yes').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'prepayment-chip-1').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'minTerm-chip-1_month').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      await findByTestID(root, 'contextual-listing-next').props.onPress();
    });

    // Allow the async submit to flush
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createPropertyMock).toHaveBeenCalledTimes(1);
    const payload = createPropertyMock.mock.calls[0][0];

    expect(payload).toMatchObject({
      dealType: 'rent_long',
      propertyType: 'apartment',
      location: {
        city: 'bishkek',
        district: 'asanbay',
        coordinates: { lat: 42.87, lng: 74.57 },
        showExactAddress: false,
      },
      basics: {
        areaSqm: 80,
        price: 1000,
        currency: 'KGS',
        rooms: '2',
      },
      conditionAndAmenities: {
        condition: 'good',
        furnished: true,
      },
      content: {
        title: 'Cozy 2BR',
        description: 'Nice place',
      },
      terms: {
        negotiable: true,
        prepaymentMonths: 1,
        minTerm: '1_month',
      },
    });
    // Server defaults status:'pending' (M2 D-22 sanitizer); client never sends status
    // and Phase 3 owns media.
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('media');

    expect(onSuccess).toHaveBeenCalledWith('new-listing-id');
    expect(onClose).toHaveBeenCalled();
  });

  // INT-2: mode='edit-mod' renders mod-context banner on Step 1 (FLOW-15)
  test('INT-2: mode=edit-mod renders mod-context-banner on Step 1', async () => {
    const initialListing = {
      id: 'lst-1',
      _id: 'lst-1',
      dealType: 'sale',
      propertyType: 'apartment',
    } as unknown as FormBag;

    const moderatorContext = {
      editingOwnerUid: 'owner-uid',
      ownerEmail: 'owner@example.com',
      reason: 'fix typo in description',
    };

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ContextualListingFlow
          mode="edit-mod"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialListing={initialListing as any}
          moderatorContext={moderatorContext}
          onClose={jest.fn()}
        />,
      );
    });

    expect(tryFindByTestID(tree.root, 'mod-context-banner')).not.toBeNull();
  });

  // INT-3: on Step 6 in edit-mod mode, the footer button text is the modEdit submit label key
  test('INT-3: Step 6 Submit button shows contextualListing.submit.modEdit for mode=edit-mod', async () => {
    const initialListing = {
      id: 'lst-1',
      _id: 'lst-1',
      dealType: 'rent_long',
      propertyType: 'apartment',
      location: {
        city: 'bishkek',
        district: 'asanbay',
        coordinates: { lat: 42.87, lng: 74.57 },
        showExactAddress: false,
      },
      basics: {
        areaSqm: 80,
        price: 1000,
        currency: 'KGS',
        rooms: '2',
      },
      conditionAndAmenities: { condition: 'good', furnished: true },
      content: { title: 'X', description: 'Y', language: 'en' },
      terms: { negotiable: true, prepaymentMonths: 1, minTerm: '1_month' },
    };

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ContextualListingFlow
          mode="edit-mod"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialListing={initialListing as any}
          moderatorContext={{ editingOwnerUid: 'owner-uid' }}
          onClose={jest.fn()}
        />,
      );
    });
    const root = tree.root;

    // Advance to Step 6 — initialListing has all valid Step 1-5 data.
    // Steps 1, 3, 4, 5 advance synchronously on Next; Step 2 needs to wait for
    // fetchCities/fetchDistricts since the validator gates on coordinates+city+district
    // — but initialListing already has coordinates + city + district set, so no async wait needed.
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      await ReactTestRenderer.act(async () => {
        await Promise.resolve();
        findByTestID(root, 'contextual-listing-next').props.onPress();
      });
    }

    // On Step 6 the Next button label morphs to the submit label.
    // Mock t() returns the key string; for edit-mod mode it should be 'contextualListing.submit.modEdit'.
    const nextButton = findByTestID(root, 'contextual-listing-next');
    const buttonTextNodes = findAllTextNodesContaining(
      nextButton,
      'contextualListing.submit.modEdit',
    );
    expect(buttonTextNodes.length).toBeGreaterThan(0);
  });
});
