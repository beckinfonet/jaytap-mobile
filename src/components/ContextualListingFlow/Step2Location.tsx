/**
 * Phase 2 Plan 02-03 — Step 2: Location capture (FLOW-04 + FLOW-05 + FLOW-06).
 *
 * Composition (per CONTEXT D-07 + D-08 + D-09; quick-task 260527-0cg redesign):
 *   - City chip row (FlatList horizontal) + "Other" chip → submit-as-pending modal.
 *   - Map pin (react-native-maps draggable Marker WITH tap-to-move fallback per Pitfall 1).
 *   - Exact-address toggle (FLOW-06): hidden + forced-true for hotel/hostel; visible-default-false otherwise.
 *   - Address text input — gated on city selection (disabled until city chip is picked).
 *     Forward-geocode debounce 800ms; citySlug bias guaranteed non-empty.
 *
 * Boundary convention:
 *   - react-native-maps API uses { latitude, longitude } (lifted verbatim per the lib's prop shape).
 *   - FormBag storage uses { lat, lng } (CONTEXT D-08; matches backend nested schema after Phase 1 cutover).
 *   - Conversion happens in handleMapPress / handleMarkerDragEnd (read latitude → write lat) and at
 *     <Marker coordinate={...}> render (read lat → render latitude).
 *
 * Quick-task 260527-0cg (Phase 12 address-flow redesign):
 *   - District chip row + "Other district" modal REMOVED. district stays on FormBag for
 *     round-trip compat with legacy data, but is no longer surfaced or required.
 *   - Address input city-gate added (disabled until city picked; helper text below).
 *   - Forward-geocode debounce bumped 300ms → 800ms.
 *   - citySlug passed to geocodeService as guaranteed non-empty (drop `|| undefined`).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKeys } from '../../locales';
// Quick-task 260527-0cg (Phase 12) — district chip row + Other-district modal removed.
// `fetchDistricts`, `createDistrict`, `District` are no longer consumed by Step2Location.
import {
  fetchCities,
  createCity,
  type City,
} from '../../services/locationService';
import { geocodeAddress, reverseGeocode } from '../../services/geocodeService';
import { commonStyles } from './styles';
import type { SectionProps } from './types';

// react-native-maps shape constant — used to seed initialRegion when no city selected
// AND as the centroid fallback for "Other" city submissions when the user hasn't dropped a pin.
const BISHKEK_DEFAULT = { latitude: 42.8746, longitude: 74.5698 };

const COUNTRIES = ['KG', 'KZ', 'UZ'] as const;

export function Step2Location({ values, onChange, errors }: SectionProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();

  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  // Quick-task 260527-0cg — `otherModal` was generic (city|district). District modal
  // path is unreachable now (no district chip → no openOtherModal('district') call).
  // Simplified to a plain boolean; the modal is hard-coded to the city pathway.
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [otherInput, setOtherInput] = useState<{
    ru: string;
    en: string;
    country: 'KG' | 'KZ' | 'UZ';
  }>({ ru: '', en: '', country: 'KG' });
  const [otherSubmitting, setOtherSubmitting] = useState(false);

  const isHospitality = values.propertyType === 'hotel' || values.propertyType === 'hostel';

  // Phase 11 GEO-01 — address-input gate. Visible when the toggle is on OR for hospitality
  // (where the toggle is hidden but showExactAddress is force-true by the effect below).
  const showAddressInput = values.location.showExactAddress || isHospitality;
  const [addressInput, setAddressInput] = useState<string>(values.location.address ?? '');
  const [geocodingState, setGeocodingState] = useState<'idle' | 'loading' | 'notFound'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Quick-task 260527-tail — after a programmatic address write-back (forward or reverse
  // geocode), iOS keeps the cursor (and therefore the visible scroll window) at the END
  // of the new text. The canonical Nominatim displayName runs street → district → city →
  // postcode → country, so the user sees the country tail and the street number scrolls
  // off-left. Snap selection to {0,0} after each write-back so the street is visible.
  const addressInputRef = useRef<TextInput>(null);
  const scrollAddressInputToStart = useCallback(() => {
    requestAnimationFrame(() => {
      addressInputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } });
    });
  }, []);
  // CR-01 / CR-02 fix: deferred geocode callbacks read latest values from a ref instead of
  // the useCallback closure, so a city/district pick or a newer pin-drop made BETWEEN the
  // debounce arming and the network response is not silently reverted.
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  });

  // FLOW-06: hide the exact-address toggle for hotel/hostel and force showExactAddress=true.
  // Sync after first render if the FormBag default (false) drifted from the forced policy.
  useEffect(() => {
    if (isHospitality && !values.location.showExactAddress) {
      onChange('location', { ...values.location, showExactAddress: true });
    }
    // We intentionally only re-run when isHospitality / showExactAddress flip, NOT on every
    // values.location keystroke (would re-trigger onChange→re-render storms).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHospitality, values.location.showExactAddress]);

  // Phase 11 GEO-02 — mirror parent-driven address changes (e.g. reverse-geocode fill via
  // handleMapPress) into local input state. Local-typed updates flow via onChangeText →
  // scheduleGeocode → onChange (parent). This effect closes the loop in the parent→child
  // direction so the input doesn't go stale when reverse-geocode populates an empty address.
  useEffect(() => {
    setAddressInput(values.location.address ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.location.address]);

  // Phase 11 GEO-01 — clear pending debounce timer on unmount to avoid stale callbacks
  // firing after Step2Location has unmounted (back-button mid-typing race).
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Mount: fetch cities once.
  useEffect(() => {
    let cancelled = false;
    fetchCities()
      .then((c) => {
        if (cancelled) return;
        setCities(c);
        setLoadingCities(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Quick-task 260527-0cg (Phase 12) — district fetch effect REMOVED.
  // Districts are no longer surfaced on Step 2; the chip row + Other-district modal
  // were dropped, so fetchDistricts has no caller.

  const cityCentersMap = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number }>();
    cities.forEach((c) => m.set(c.slug, c.centroid));
    return m;
  }, [cities]);

  const selectedCityCenter = values.location.city
    ? cityCentersMap.get(values.location.city) ?? null
    : null;

  const handleSelectCity = useCallback(
    (slug: string) => {
      // Clear district when city changes — the prior district may not belong to the new city.
      onChange('location', { ...values.location, city: slug, district: '' });
    },
    [onChange, values.location],
  );

  // Quick-task 260527-0cg (Phase 12) — handleSelectDistrict REMOVED. No callers.

  // Phase 11 GEO-01 — debounced forward geocode (800ms after typing pauses; quick-task
  // 260527-0cg bumped 300ms → 800ms because typing pauses within a word are 200-400ms,
  // and a too-short debounce was firing cross-border misfires on slow typers).
  // On success: write BOTH address (canonical displayName) AND coordinates to FormBag,
  // re-center the map via the marker re-render. On failure: preserve typed text, DO NOT
  // move pin (anti-"random pin" defense; see 11-CONTEXT.md "THREE layers"). 3-char min +
  // trim prevents firing for single-letter typos. Backend's 5s AbortController fires
  // before apiClient's 15s on slow Nominatim.
  const scheduleGeocode = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 3) {
        setGeocodingState('idle');
        return;
      }
      setGeocodingState('loading');
      debounceRef.current = setTimeout(async () => {
        // CR-01: read from valuesRef so a city pick or pin drop in the 300ms+network
        // window is not reverted by the stale closure spread below.
        const latestAtArming = valuesRef.current.location;
        // Quick-task 260527-0cg — drop `|| undefined` fallback. The city-gate on the
        // address input guarantees `latestAtArming.city` is a non-empty string by the
        // time the user can type (input is disabled + editable=false until a city is
        // picked). Passing the slug as guaranteed-non-empty keeps the Nominatim viewbox
        // bias active (was silently disabled when city was empty).
        const result = await geocodeAddress({
          address: trimmed,
          citySlug: latestAtArming.city,
          lang: language as 'en' | 'ru',
        });
        if (result) {
          setGeocodingState('idle');
          const latest = valuesRef.current.location;
          onChange('location', {
            ...latest,
            address: result.displayName,
            coordinates: { lat: result.lat, lng: result.lng },
          });
          // canonicalize the input mirror — the prop-sync effect would do this too, but
          // setting it inline avoids the one-frame flash of pre-canonical text.
          setAddressInput(result.displayName);
          scrollAddressInputToStart();
        } else {
          // explicitly preserve typed text + static pin
          setGeocodingState('notFound');
        }
      }, 800);
    },
    [onChange, values.location, language],
  );

  // Tap-to-drop initial AND tap-to-move fallback per Pitfall 1 (Issue #5445).
  const handleMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const lat = e.nativeEvent.coordinate.latitude;
      const lng = e.nativeEvent.coordinate.longitude;
      onChange('location', {
        ...values.location,
        coordinates: { lat, lng },
      });
      // Phase 11 GEO-02 — best-effort reverse geocode. Only fills address if currently
      // empty (never clobbers typed text — T-11-18 mitigation). Silent on failure.
      // CR-02 fix: anti-clobber guard AND payload spread read from valuesRef so typed
      // text or newer pin drops between the drop and the ~1-5s Nominatim response are
      // honored; closes the T-11-18 race that Plan 11-04 originally accepted as residual.
      reverseGeocode({ lat, lng, lang: language as 'en' | 'ru' }).then((r) => {
        const latest = valuesRef.current.location;
        if (r && r.displayName && !(latest.address ?? '').trim()) {
          onChange('location', {
            ...latest,
            // a newer pin drop/drag may already have replaced these coords — keep latest.
            coordinates: latest.coordinates ?? { lat, lng },
            address: r.displayName,
          });
          setAddressInput(r.displayName);
          scrollAddressInputToStart();
        }
      });
    },
    [onChange, values.location, language, scrollAddressInputToStart],
  );

  // Primary refinement path (iOS-reliable; Android-uncertain per Issue #5445).
  const handleMarkerDragEnd = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const lat = e.nativeEvent.coordinate.latitude;
      const lng = e.nativeEvent.coordinate.longitude;
      onChange('location', {
        ...values.location,
        coordinates: { lat, lng },
      });
      // Phase 11 GEO-02 — same shape + anti-clobber guard as handleMapPress.
      // CR-02 fix: same valuesRef pattern as handleMapPress.
      reverseGeocode({ lat, lng, lang: language as 'en' | 'ru' }).then((r) => {
        const latest = valuesRef.current.location;
        if (r && r.displayName && !(latest.address ?? '').trim()) {
          onChange('location', {
            ...latest,
            coordinates: latest.coordinates ?? { lat, lng },
            address: r.displayName,
          });
          setAddressInput(r.displayName);
          scrollAddressInputToStart();
        }
      });
    },
    [onChange, values.location, language, scrollAddressInputToStart],
  );

  // Quick-task 260527-0cg — `openOtherModal` simplified to take no args (district
  // pathway removed). Hard-codes the city pathway. `closeOtherModal` + `submitOther`
  // also simplified to city-only (the district `else` branch was unreachable).
  const openOtherModal = useCallback(() => {
    setOtherInput({ ru: '', en: '', country: 'KG' });
    setOtherModalOpen(true);
  }, []);

  const closeOtherModal = useCallback(() => {
    setOtherModalOpen(false);
  }, []);

  const submitOther = useCallback(async () => {
    if (!otherInput.ru.trim() || !otherInput.en.trim()) {
      Alert.alert(t('common.error'), t('contextualListing.step2.cityOther.placeholder'));
      return;
    }
    setOtherSubmitting(true);
    try {
      // Per Tradeoff §F: client supplies centroid (drop-pin-first UX). For "Other"
      // city, derive from current map coords if user already dropped a pin; else
      // fall back to BISHKEK_DEFAULT.
      const centroid = values.location.coordinates
        ? { lat: values.location.coordinates.lat, lng: values.location.coordinates.lng }
        : { lat: BISHKEK_DEFAULT.latitude, lng: BISHKEK_DEFAULT.longitude };
      const r = await createCity({
        label: { ru: otherInput.ru.trim(), en: otherInput.en.trim() },
        country: otherInput.country,
        centroid,
      });
      // D-07 optimistic-use: use the new slug immediately. Defensive: clear district
      // (still on FormBag for round-trip compat) in case a legacy bag arrives populated.
      onChange('location', { ...values.location, city: r.city.slug, district: '' });
      // Refresh chip list so the new (pending) city is visible to caller.
      const updated = await fetchCities();
      setCities(updated);
      setOtherModalOpen(false);
      setOtherInput({ ru: '', en: '', country: 'KG' });
    } catch {
      Alert.alert(t('common.error'), t('contextualListing.step2.cityOther.duplicate'));
    } finally {
      setOtherSubmitting(false);
    }
  }, [otherInput, values.location, onChange, t]);

  const renderCityChip = ({ item }: { item: City | { slug: '__other__'; label: { ru: string; en: string } } }) => {
    const isOther = item.slug === '__other__';
    const isActive = !isOther && values.location.city === item.slug;
    return (
      <TouchableOpacity
        testID={isOther ? 'city-chip-other' : `city-chip-${item.slug}`}
        style={[
          commonStyles.chip,
          {
            backgroundColor: isActive
              ? colors.activeChipBackground
              : isDark
              ? '#2C2C2E'
              : '#F2F2F7',
            borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
          },
        ]}
        onPress={() => (isOther ? openOtherModal() : handleSelectCity(item.slug))}
      >
        <Text
          style={[
            commonStyles.chipText,
            { color: isActive ? colors.activeChipText : colors.text },
          ]}
        >
          {(item.label as { ru: string; en: string })[language as 'ru' | 'en']}
        </Text>
      </TouchableOpacity>
    );
  };

  const cityData = useMemo(
    () => [
      ...cities,
      {
        _id: '__other__',
        slug: '__other__' as const,
        label: { ru: t('contextualListing.step2.cityOther'), en: t('contextualListing.step2.cityOther') },
      },
    ],
    [cities, t],
  );

  // Quick-task 260527-0cg (Phase 12) — districtData memo REMOVED (no consumer).

  // Quick-task 260527-0cg — city-gate predicate for the address input. Disables the
  // input + shows helper text until the user picks a city. Once city is set, input is
  // enabled at full opacity and the helper text is hidden.
  const cityPicked = !!values.location.city;

  return (
    <View>
      <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
        {t('contextualListing.step2.title')}
      </Text>

      {/* City chip row */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step2.cityLabel')}
        </Text>
        {loadingCities ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={cityData}
            keyExtractor={(c) => c._id}
            contentContainerStyle={commonStyles.chipRowHorizontal}
            renderItem={renderCityChip}
          />
        )}
        {errors['location.city'] ? (
          <Text
            testID="city-error"
            style={[commonStyles.errorText, { color: colors.error }]}
          >
            {t(errors['location.city'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>

      {/* Quick-task 260527-0cg (Phase 12 address-flow redesign) — district chip row
          + "Other district" modal block REMOVED. Step 2 flow now reduces to:
          city chip row → map pin → exact-address toggle → (gated) address input. */}

      {/* Map pin (D-08 + Pitfall 1: tap-to-drop AND tap-to-move fallback) */}
      <View style={commonStyles.section}>
        <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
          {t('contextualListing.step2.mapLabel')}
        </Text>
        <View style={commonStyles.mapContainer} testID="step2-map-container">
          <MapView
            provider={PROVIDER_DEFAULT}
            style={commonStyles.map}
            initialRegion={{
              latitude: selectedCityCenter?.lat ?? BISHKEK_DEFAULT.latitude,
              longitude: selectedCityCenter?.lng ?? BISHKEK_DEFAULT.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={handleMapPress}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            {values.location.coordinates ? (
              <Marker
                testID="step2-map-marker"
                coordinate={{
                  latitude: values.location.coordinates.lat,
                  longitude: values.location.coordinates.lng,
                }}
                draggable
                onDragEnd={handleMarkerDragEnd}
              />
            ) : null}
          </MapView>
        </View>
        {errors['location.coordinates'] ? (
          <Text style={[commonStyles.errorText, { color: colors.error }]}>
            {t(errors['location.coordinates'] as TranslationKeys)}
          </Text>
        ) : null}
      </View>

      {/* Exact-address toggle (FLOW-06) — hidden when isHospitality */}
      {!isHospitality ? (
        <View
          style={[
            commonStyles.section,
            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
          ]}
          testID="exact-address-toggle-container"
        >
          <Text style={{ color: colors.text }}>
            {t('contextualListing.step2.exactAddressToggle')}
          </Text>
          <Switch
            testID="exact-address-toggle"
            value={values.location.showExactAddress}
            onValueChange={(v) =>
              onChange('location', { ...values.location, showExactAddress: v })
            }
          />
        </View>
      ) : null}

      {/* Phase 11 GEO-01 + GEO-02 — address input + debounced forward geocode.
          Visible when toggle is on (long-term/sale) OR for hospitality (toggle hidden,
          force-true). Inline spinner during request; "addressNotFound" error label on
          null result. Pin DOES NOT MOVE on failure (anti-"random pin" defense layer 3). */}
      {showAddressInput ? (
        <View style={commonStyles.section} testID="step2-address-input-section">
          <Text style={[commonStyles.sectionLabel, { color: colors.text }]}>
            {/* TODO(11-05): remove cast once keys land in TranslationKeys union */}
            {t('contextualListing.step2.addressLabel' as TranslationKeys)}
          </Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              testID="step2-address-input"
              ref={addressInputRef}
              value={addressInput}
              onChangeText={(v) => {
                setAddressInput(v);
                scheduleGeocode(v);
              }}
              // Quick-task 260527-0cg — input gated on city selection. While disabled,
              // opacity drops to 0.5 to communicate the state visually; the helper text
              // below the field tells the user to pick a city first.
              editable={cityPicked}
              placeholder={t('contextualListing.step2.addressPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={{
                borderWidth: 1,
                borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                borderRadius: 8,
                padding: 12,
                paddingRight: 36,
                color: colors.text,
                backgroundColor: colors.surface,
                opacity: cityPicked ? 1 : 0.5,
              }}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {geocodingState === 'loading' ? (
              <View
                style={{ position: 'absolute', right: 12, top: 12 }}
                testID="step2-address-geocoding-spinner"
              >
                <ActivityIndicator size="small" />
              </View>
            ) : null}
          </View>
          {/* Quick-task 260527-0cg — city-gate helper text. Only renders when the
              input is disabled (no city picked). Disappears the moment cityPicked flips. */}
          {!cityPicked ? (
            <Text
              testID="step2-address-city-gate"
              style={{ color: colors.textSecondary, marginTop: 4, fontSize: 12 }}
            >
              {t('contextualListing.step2.addressCityGate')}
            </Text>
          ) : null}
          {geocodingState === 'loading' ? (
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 12 }}>
              {t('contextualListing.step2.addressGeocoding')}
            </Text>
          ) : null}
          {geocodingState === 'notFound' ? (
            <Text
              testID="step2-address-not-found-error"
              style={[commonStyles.errorText, { color: colors.error }]}
            >
              {t('contextualListing.step2.addressNotFound')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Quick-task 260527-0cg — Other modal is now city-only (district pathway dead). */}
      <Modal
        visible={otherModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeOtherModal}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              padding: 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
              {t('contextualListing.step2.cityOther.modalTitle')}
            </Text>
            <TextInput
              testID="other-input-ru"
              value={otherInput.ru}
              onChangeText={(v) => setOtherInput((s) => ({ ...s, ru: v }))}
              placeholder={`RU: ${t('contextualListing.step2.cityOther.placeholder')}`}
              placeholderTextColor={colors.textSecondary}
              style={[
                commonStyles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  marginTop: 12,
                  backgroundColor: colors.inputBackground,
                },
              ]}
            />
            <TextInput
              testID="other-input-en"
              value={otherInput.en}
              onChangeText={(v) => setOtherInput((s) => ({ ...s, en: v }))}
              placeholder={`EN: ${t('contextualListing.step2.cityOther.placeholder')}`}
              placeholderTextColor={colors.textSecondary}
              style={[
                commonStyles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  marginTop: 8,
                  backgroundColor: colors.inputBackground,
                },
              ]}
            />
            {/* Country picker — city modal only path now. */}
            <View style={[commonStyles.chipRow, { marginTop: 12 }]}>
              {COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  testID={`other-country-${c}`}
                  onPress={() => setOtherInput((s) => ({ ...s, country: c }))}
                  style={[
                    commonStyles.chip,
                    {
                      backgroundColor:
                        otherInput.country === c
                          ? colors.activeChipBackground
                          : isDark
                          ? '#2C2C2E'
                          : '#F2F2F7',
                      borderColor: isDark ? '#3A3A3C' : '#E5E5EA',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        otherInput.country === c
                          ? colors.activeChipText
                          : colors.text,
                    }}
                  >
                    {t(`contextualListing.step2.cityOther.country.${c}` as TranslationKeys)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={closeOtherModal}
                style={[
                  commonStyles.footerButton,
                  { flex: 1, backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                ]}
              >
                <Text
                  style={[commonStyles.footerButtonText, { color: colors.text }]}
                >
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="other-submit"
                onPress={submitOther}
                disabled={otherSubmitting}
                style={[
                  commonStyles.footerButton,
                  { flex: 1, backgroundColor: colors.activeChipBackground },
                ]}
              >
                {otherSubmitting ? (
                  <ActivityIndicator color={colors.activeChipText} />
                ) : (
                  <Text
                    style={[
                      commonStyles.footerButtonText,
                      { color: colors.activeChipText },
                    ]}
                  >
                    {t('contextualListing.step2.cityOther.submit')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
