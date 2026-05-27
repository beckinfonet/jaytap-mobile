/**
 * Phase 2 Plan 02-03 — Step2Location RTL smoke tests.
 *
 * Test stack: react-test-renderer (matches Step1.test.tsx; @testing-library/react-native NOT installed).
 *
 * Mocks:
 *   - react-native-maps — replaces global jest.setup.js stub with a richer mock
 *     that surfaces testID + onPress + props so we can simulate map interactions.
 *   - locationService — stubbed at module boundary; per-test jest.fn assignments.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import { Step2Location } from '../Step2Location';
import { emptyFormBag } from '../validators';
import type { FormBag, FormErrorBag } from '../types';

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
      activeChipBackground: '#2D2D2D',
      activeChipText: '#FFFFFF',
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

// Replace the globally-stubbed Fragment-based map mock with a richer one that
// preserves testID + onPress so we can simulate tap-to-drop / tap-to-move events.
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

jest.mock('../../../services/locationService', () => ({
  fetchCities: jest.fn(),
  fetchDistricts: jest.fn(),
  createCity: jest.fn(),
  createDistrict: jest.fn(),
}));

// Phase 11 GEO-01 + GEO-02 — Step2Location now imports geocodeService; without
// this mock the real apiClient fires Railway POSTs during the map onPress / drag
// tests (return null → tests still pass via the anti-clobber guard, but log noise
// + flakiness risk is unacceptable). Both helpers default to null (= "miss") so
// existing tests' guards behave exactly as they would for a not-found geocode.
jest.mock('../../../services/geocodeService', () => ({
  geocodeAddress: jest.fn().mockResolvedValue(null),
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

import {
  fetchCities,
  fetchDistricts,
  createCity,
  createDistrict,
} from '../../../services/locationService';
import {
  geocodeAddress,
  reverseGeocode,
} from '../../../services/geocodeService';

const fetchCitiesMock = fetchCities as jest.Mock;
const fetchDistrictsMock = fetchDistricts as jest.Mock;
const createCityMock = createCity as jest.Mock;
const createDistrictMock = createDistrict as jest.Mock;
const geocodeAddressMock = geocodeAddress as jest.Mock;
const reverseGeocodeMock = reverseGeocode as jest.Mock;

function findByTestID(root: ReactTestInstance, testID: string): ReactTestInstance {
  return root.findByProps({ testID });
}

function tryFindByTestID(root: ReactTestInstance, testID: string): ReactTestInstance | null {
  const matches = root.findAllByProps({ testID });
  return matches.length > 0 ? matches[0] : null;
}

interface RenderArgs {
  values?: FormBag;
  errors?: FormErrorBag;
}

async function renderStep2(args: RenderArgs = {}) {
  const onChange = jest.fn();
  const values = args.values ?? emptyFormBag();
  const errors = args.errors ?? {};
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Step2Location values={values} onChange={onChange} errors={errors} />,
    );
  });
  return { tree, root: tree.root, onChange };
}

const SAMPLE_CITIES = [
  {
    _id: 'c1',
    slug: 'bishkek',
    label: { ru: 'Бишкек', en: 'Bishkek' },
    country: 'KG' as const,
    centroid: { lat: 42.8746, lng: 74.5698 },
    status: 'approved' as const,
    createdByUid: 'admin',
  },
  {
    _id: 'c2',
    slug: 'osh',
    label: { ru: 'Ош', en: 'Osh' },
    country: 'KG' as const,
    centroid: { lat: 40.5283, lng: 72.7985 },
    status: 'approved' as const,
    createdByUid: 'admin',
  },
];

const SAMPLE_DISTRICTS = [
  {
    _id: 'd1',
    cityId: 'c1',
    slug: 'mkr-3',
    label: { ru: 'Микрорайон 3', en: 'Microdistrict 3' },
    status: 'approved' as const,
    createdByUid: 'admin',
  },
];

describe('Step2Location (Plan 02-03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchCitiesMock.mockResolvedValue(SAMPLE_CITIES);
    fetchDistrictsMock.mockResolvedValue(SAMPLE_DISTRICTS);
  });

  // Test 1
  test('on mount, calls fetchCities() and renders one chip per city + Other chip', async () => {
    const { root } = await renderStep2();
    expect(fetchCitiesMock).toHaveBeenCalledTimes(1);
    expect(findByTestID(root, 'city-chip-bishkek')).toBeTruthy();
    expect(findByTestID(root, 'city-chip-osh')).toBeTruthy();
    expect(findByTestID(root, 'city-chip-other')).toBeTruthy();
  });

  // Test 2
  test('tapping a city chip dispatches onChange("location", { city: slug, ... })', async () => {
    const { root, onChange } = await renderStep2();
    const chip = findByTestID(root, 'city-chip-bishkek');
    await ReactTestRenderer.act(async () => {
      chip.props.onPress();
    });
    expect(onChange).toHaveBeenCalled();
    const [field, value] = onChange.mock.calls[0];
    expect(field).toBe('location');
    expect((value as FormBag['location']).city).toBe('bishkek');
  });

  // Test 3
  test('district chip row disabled while no city is selected', async () => {
    const { root } = await renderStep2();
    expect(tryFindByTestID(root, 'districts-disabled')).not.toBeNull();
  });

  // Test 4
  test('after city selection, district chips render from fetchDistricts', async () => {
    const values: FormBag = { ...emptyFormBag(), location: { ...emptyFormBag().location, city: 'bishkek' } };
    const { root } = await renderStep2({ values });
    // wait microtask flush so the city-driven useEffect resolves
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });
    expect(fetchDistrictsMock).toHaveBeenCalledWith('bishkek');
    expect(findByTestID(root, 'district-chip-mkr-3')).toBeTruthy();
    expect(findByTestID(root, 'district-chip-other')).toBeTruthy();
  });

  // Test 5
  test('empty districts response renders empty-state copy + Other chip lit', async () => {
    fetchDistrictsMock.mockResolvedValueOnce([]);
    const values: FormBag = { ...emptyFormBag(), location: { ...emptyFormBag().location, city: 'bishkek' } };
    const { root } = await renderStep2({ values });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });
    expect(tryFindByTestID(root, 'districts-empty')).not.toBeNull();
    expect(tryFindByTestID(root, 'district-chip-other')).not.toBeNull();
  });

  // Test 6
  test('city Other modal Submit calls createCity and writes slug to FormBag (optimistic per D-07)', async () => {
    createCityMock.mockResolvedValueOnce({
      city: {
        _id: 'c-new',
        slug: 'naryn',
        label: { ru: 'Нарын', en: 'Naryn' },
        country: 'KG',
        centroid: { lat: 41.42, lng: 75.99 },
        status: 'pending',
        createdByUid: 'me',
      },
      status: 201,
    });
    const { root, onChange } = await renderStep2();
    // Open modal via Other chip
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'city-chip-other').props.onPress();
    });
    // Type in modal inputs
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'other-input-ru').props.onChangeText('Нарын');
    });
    await ReactTestRenderer.act(async () => {
      findByTestID(root, 'other-input-en').props.onChangeText('Naryn');
    });
    await ReactTestRenderer.act(async () => {
      await findByTestID(root, 'other-submit').props.onPress();
    });
    expect(createCityMock).toHaveBeenCalled();
    // onChange must be called with the new slug at some point during the flow
    const locationCalls = onChange.mock.calls.filter((c) => c[0] === 'location');
    const sawNewSlug = locationCalls.some(
      ([, v]) => (v as FormBag['location']).city === 'naryn',
    );
    expect(sawNewSlug).toBe(true);
  });

  // Test 7
  test('map mounts with initialRegion centered on selected city centroid', async () => {
    const values: FormBag = { ...emptyFormBag(), location: { ...emptyFormBag().location, city: 'bishkek' } };
    const { root } = await renderStep2({ values });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });
    const map = findByTestID(root, 'step2-map-container').findByProps({ testID: 'mock-mapview' });
    expect(map.props.initialRegion.latitude).toBeCloseTo(42.8746, 4);
    expect(map.props.initialRegion.longitude).toBeCloseTo(74.5698, 4);
  });

  // Test 8
  test('map onPress dispatches onChange("location", { coordinates: { lat, lng } }) — tap-to-drop', async () => {
    const { root, onChange } = await renderStep2();
    const map = findByTestID(root, 'step2-map-container').findByProps({ testID: 'mock-mapview' });
    await ReactTestRenderer.act(async () => {
      map.props.onPress({ nativeEvent: { coordinate: { latitude: 42.9, longitude: 74.6 } } });
    });
    const locationCalls = onChange.mock.calls.filter((c) => c[0] === 'location');
    const last = locationCalls[locationCalls.length - 1];
    expect(last[1].coordinates).toEqual({ lat: 42.9, lng: 74.6 });
  });

  // Test 9
  test('Marker only renders after coordinates are set; subsequent onPress re-positions (tap-to-move fallback)', async () => {
    // No coordinates → no marker
    const { root: noCoordsRoot } = await renderStep2();
    expect(tryFindByTestID(noCoordsRoot, 'step2-map-marker')).toBeNull();

    // With coordinates → marker present
    const values: FormBag = {
      ...emptyFormBag(),
      location: {
        ...emptyFormBag().location,
        city: 'bishkek',
        coordinates: { lat: 42.9, lng: 74.6 },
      },
    };
    const { root: withCoordsRoot, onChange } = await renderStep2({ values });
    expect(tryFindByTestID(withCoordsRoot, 'step2-map-marker')).not.toBeNull();
    // Re-tap re-positions via tap-to-move fallback
    const map = findByTestID(withCoordsRoot, 'step2-map-container').findByProps({ testID: 'mock-mapview' });
    await ReactTestRenderer.act(async () => {
      map.props.onPress({ nativeEvent: { coordinate: { latitude: 43.0, longitude: 74.7 } } });
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[1].coordinates).toEqual({ lat: 43.0, lng: 74.7 });
  });

  // Test 10
  test('Marker has draggable + onDragEnd (primary refinement path)', async () => {
    const values: FormBag = {
      ...emptyFormBag(),
      location: {
        ...emptyFormBag().location,
        city: 'bishkek',
        coordinates: { lat: 42.9, lng: 74.6 },
      },
    };
    const { root, onChange } = await renderStep2({ values });
    const marker = findByTestID(root, 'step2-map-marker');
    expect(marker.props.draggable).toBe(true);
    expect(typeof marker.props.onDragEnd).toBe('function');
    await ReactTestRenderer.act(async () => {
      marker.props.onDragEnd({
        nativeEvent: { coordinate: { latitude: 43.5, longitude: 74.8 } },
      });
    });
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last[1].coordinates).toEqual({ lat: 43.5, lng: 74.8 });
  });

  // Test 11
  test('exact-address toggle is HIDDEN when propertyType === "hotel" (FLOW-06)', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'hotel' };
    const { root } = await renderStep2({ values });
    expect(tryFindByTestID(root, 'exact-address-toggle')).toBeNull();
  });

  // Test 12
  test('exact-address toggle is HIDDEN when propertyType === "hostel" (FLOW-06)', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'hostel' };
    const { root } = await renderStep2({ values });
    expect(tryFindByTestID(root, 'exact-address-toggle')).toBeNull();
  });

  // Test 13
  test('exact-address toggle is VISIBLE when propertyType === "apartment" and defaults false', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'apartment' };
    const { root } = await renderStep2({ values });
    const sw = findByTestID(root, 'exact-address-toggle');
    expect(sw).toBeTruthy();
    expect(sw.props.value).toBe(false);
  });

  // Phase 11 GEO-01 / GEO-02 — address input gating + debounced forward + reverse
  // geocode behavior. Closes CR-03 from the Phase 11 code review.

  // Test G1 — address input HIDDEN when showExactAddress=false on non-hospitality.
  test('GEO: address input hidden when showExactAddress=false and not hospitality', async () => {
    const values: FormBag = {
      ...emptyFormBag(),
      propertyType: 'apartment',
      location: { ...emptyFormBag().location, showExactAddress: false },
    };
    const { root } = await renderStep2({ values });
    expect(tryFindByTestID(root, 'step2-address-input')).toBeNull();
  });

  // Test G2 — address input VISIBLE when showExactAddress=true.
  test('GEO: address input visible when showExactAddress=true', async () => {
    const values: FormBag = {
      ...emptyFormBag(),
      propertyType: 'apartment',
      location: { ...emptyFormBag().location, showExactAddress: true },
    };
    const { root } = await renderStep2({ values });
    expect(tryFindByTestID(root, 'step2-address-input')).not.toBeNull();
  });

  // Test G3 — address input FORCE-VISIBLE for hospitality (toggle hidden per FLOW-06,
  // but the effect inside Step2Location flips showExactAddress=true on mount).
  test('GEO: address input force-visible for propertyType="hotel"', async () => {
    const values: FormBag = { ...emptyFormBag(), propertyType: 'hotel' };
    const { onChange, root } = await renderStep2({ values });
    // The mount-time effect dispatches an onChange to flip showExactAddress=true. The
    // input itself is gated by `values.location.showExactAddress || isHospitality`, so
    // it also renders on first commit because isHospitality alone is sufficient.
    expect(tryFindByTestID(root, 'step2-address-input')).not.toBeNull();
    expect(
      onChange.mock.calls.some(
        ([f, v]: [string, FormBag['location']]) => f === 'location' && v.showExactAddress === true,
      ),
    ).toBe(true);
  });

  // Test G4 + G5 — typing fires the 300ms debounce; on success, onChange writes BOTH
  // address and coordinates (the canonical Nominatim displayName + the resolved lat/lng).
  test('GEO-01: successful forward geocode writes address AND coordinates after 300ms debounce', async () => {
    jest.useFakeTimers();
    try {
      geocodeAddressMock.mockResolvedValueOnce({
        lat: 42.876,
        lng: 74.612,
        displayName: '100 Manas St, Bishkek, Kyrgyzstan',
      });
      const values: FormBag = {
        ...emptyFormBag(),
        propertyType: 'apartment',
        location: { ...emptyFormBag().location, showExactAddress: true, city: 'bishkek' },
      };
      const { root, onChange } = await renderStep2({ values });
      const input = findByTestID(root, 'step2-address-input');
      await ReactTestRenderer.act(async () => {
        input.props.onChangeText('100 Manas St');
      });
      // Pre-debounce: only the synchronous onChange for the unrelated city flip (if any)
      // should have fired. The geocode mock is NOT called yet.
      expect(geocodeAddressMock).not.toHaveBeenCalled();
      await ReactTestRenderer.act(async () => {
        jest.advanceTimersByTime(310);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(geocodeAddressMock).toHaveBeenCalledTimes(1);
      const args = geocodeAddressMock.mock.calls[0][0];
      expect(args.address).toBe('100 Manas St');
      expect(args.citySlug).toBe('bishkek');
      // onChange should now contain a call with the resolved address + coordinates.
      const writeCall = onChange.mock.calls.find(
        ([f, v]: [string, FormBag['location']]) =>
          f === 'location' && v.address === '100 Manas St, Bishkek, Kyrgyzstan',
      );
      expect(writeCall).toBeTruthy();
      const [, value] = writeCall as [string, FormBag['location']];
      expect(value.coordinates).toEqual({ lat: 42.876, lng: 74.612 });
    } finally {
      jest.useRealTimers();
    }
  });

  // Test G6 — anti-"random pin" defense layer 3: on null forward-geocode, the typed
  // text is preserved (no onChange overwrite) and the pin (coordinates) does NOT move.
  // This is the single most important invariant of the phase per CONTEXT.md decision 9.
  test('GEO-01: null forward geocode preserves typed text and does NOT move pin (anti-random-pin)', async () => {
    jest.useFakeTimers();
    try {
      geocodeAddressMock.mockResolvedValueOnce(null);
      const startingCoords = { lat: 42.0, lng: 74.0 };
      const values: FormBag = {
        ...emptyFormBag(),
        propertyType: 'apartment',
        location: {
          ...emptyFormBag().location,
          showExactAddress: true,
          city: 'bishkek',
          coordinates: startingCoords,
        },
      };
      const { root, onChange } = await renderStep2({ values });
      const input = findByTestID(root, 'step2-address-input');
      const onChangesBeforeType = onChange.mock.calls.length;
      await ReactTestRenderer.act(async () => {
        input.props.onChangeText('gibberish-asdfasdf');
      });
      await ReactTestRenderer.act(async () => {
        jest.advanceTimersByTime(310);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(geocodeAddressMock).toHaveBeenCalledTimes(1);
      // Critical assertion: NO onChange call mutated location.coordinates or location.address
      // after the gibberish typed (any new onChange call between onChangesBeforeType and
      // now must NOT contain a coordinates flip or a non-empty address write).
      const newCalls = onChange.mock.calls.slice(onChangesBeforeType);
      for (const [field, value] of newCalls) {
        expect(field).toBe('location');
        // pin must NOT have moved from startingCoords
        expect((value as FormBag['location']).coordinates).toEqual(startingCoords);
        // address must NOT have been auto-populated with a displayName
        // (the typed text lives in local state, not the FormBag; address stays empty)
        expect((value as FormBag['location']).address).toBe('');
      }
    } finally {
      jest.useRealTimers();
    }
  });

  // Test G7 — reverse-geocode on pin-drop fills EMPTY address opportunistically.
  test('GEO-02: pin drop with empty address triggers reverse-geocode and fills displayName', async () => {
    reverseGeocodeMock.mockResolvedValueOnce({ displayName: 'Reverse Address from Pin' });
    const values: FormBag = {
      ...emptyFormBag(),
      propertyType: 'apartment',
      location: {
        ...emptyFormBag().location,
        showExactAddress: true,
        city: 'bishkek',
        address: '',
      },
    };
    const { root, onChange } = await renderStep2({ values });
    const map = findByTestID(root, 'step2-map-container').findByProps({ testID: 'mock-mapview' });
    await ReactTestRenderer.act(async () => {
      map.props.onPress({
        nativeEvent: { coordinate: { latitude: 43.1, longitude: 74.7 } },
      });
      // flush the reverse-geocode microtask
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(reverseGeocodeMock).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 43.1, lng: 74.7 }),
    );
    const addressFill = onChange.mock.calls.find(
      ([f, v]: [string, FormBag['location']]) =>
        f === 'location' && v.address === 'Reverse Address from Pin',
    );
    expect(addressFill).toBeTruthy();
  });

  // Test G8 — CR-02 fix: reverse-geocode does NOT clobber a PRE-EXISTING non-empty
  // address even when the response arrives. This is the anti-clobber guard that
  // protects user-typed text from being overwritten by an opportunistic reverse fill.
  test('GEO-02: pin drop with non-empty address does NOT clobber typed text', async () => {
    reverseGeocodeMock.mockResolvedValueOnce({ displayName: 'Reverse Address from Pin' });
    const values: FormBag = {
      ...emptyFormBag(),
      propertyType: 'apartment',
      location: {
        ...emptyFormBag().location,
        showExactAddress: true,
        city: 'bishkek',
        address: 'User Typed This',
      },
    };
    const { root, onChange } = await renderStep2({ values });
    const map = findByTestID(root, 'step2-map-container').findByProps({ testID: 'mock-mapview' });
    await ReactTestRenderer.act(async () => {
      map.props.onPress({
        nativeEvent: { coordinate: { latitude: 43.1, longitude: 74.7 } },
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    // Reverse-geocode call still fires (it's opportunistic), but the guard blocks the
    // address-write onChange. The only onChange should be the synchronous coordinate
    // write — no subsequent call should contain 'Reverse Address from Pin'.
    expect(reverseGeocodeMock).toHaveBeenCalled();
    const clobberAttempt = onChange.mock.calls.find(
      ([f, v]: [string, FormBag['location']]) =>
        f === 'location' && v.address === 'Reverse Address from Pin',
    );
    expect(clobberAttempt).toBeUndefined();
  });
});
