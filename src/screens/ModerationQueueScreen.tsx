// Phase 3 — Moderation Queue overlay screen.
//
// Self-contained overlay screen mirroring Phase 4.5's LandlordApplicationQueueScreen
// structure (FIFO list + Approve/Reject + RefreshControl) but with three Phase 3 differences:
//   1. Service is PropertyService (not LandlordApplicationService); the methods
//      getModerationQueue / approveListing / rejectListing land in Plan 02 with
//      canFromUser belt-and-suspenders guards.
//   2. Row content reuses the existing PropertyCard component (CONTEXT.md D-01) — Phase 2
//      D-19's StatusPill already labels each card as «На модерации», so no new visual
//      variant is needed. Approve/Reject/Edit-on-behalf surface as a 3-button action row
//      below each card (UI-SPEC LAYOUT (b)).
//   3. RejectListingModal is the new extracted reusable component (Task 03-04-01); the
//      modal mounts here AND in PropertyDetailsScreen (Plan 06) — extraction is justified.
//
// AppState 'active' refresh uses a per-screen useRef cooldown (NOT module-scope; the
// screen unmounts when the overlay closes — module-scope state would leak across
// open/close cycles). Per PATTERNS §E.
//
// 409 race-condition handling per PATTERNS §C: close any open modal, fire the
// MOD-15 verbatim toast (the moderation race toast i18n key), refetch the queue.
//
// This screen is mounted by App.tsx in Plan 03-06 (App.tsx is NOT touched in Plan 03-04).
// The 3 callback props (onBack, onOpenPropertyDetails, onEditOnBehalf) define the
// contract Plan 06 will wire.
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { PropertyService } from '../services/PropertyService';
import { PropertyCard } from '../components/PropertyCard';
import RejectListingModal, { RejectReasonCode } from '../components/RejectListingModal';
import { PermissionDeniedError } from '../hooks/useRole';
import { useModActionGuard } from '../hooks/useModActionGuard';
import type { Property } from '../types/Property';
// Plan 02-03: Locations tab — service for the new location-curation queue.
import {
  fetchLocationsQueue,
  approveLocation,
  rejectLocation,
  type City,
  type DistrictWithCity,
} from '../services/locationService';
import { TextInput } from 'react-native';
import type { TranslationKeys } from '../locales';

interface ModerationQueueScreenProps {
  onBack: () => void;
  onOpenPropertyDetails: (property: Property) => void;
  onEditOnBehalf: (property: Property) => void;
  // Phase 3 Plan 03-06 — entry-point wiring. App.tsx's openMediaCuration callback
  // (declared in Plan 03-05) is forwarded here so the row-tap conditional branch
  // (W2 — D-01 + D-04 read together) can dispatch needs-media listings to the
  // MediaCurationScreen overlay instead of PropertyDetailsScreen. Optional to keep
  // pre-wire compatibility (deep-links / future call sites that don't pass it yet).
  onOpenMediaCuration?: (listingId: string) => void;
}

// Phase 3 Plan 03-06 — filter chip predicate (UI-SPEC §"Filter predicate").
// `'all-pending'` is the default (D-03 — preserves M2 first-render behavior).
// `'needs-media'` / `'has-media'` are derived purely from media.photos.length;
// tourUrl + videos do NOT factor into the predicate (RESEARCH §Open Question #1).
type ModFilterChip = 'all-pending' | 'needs-media' | 'has-media';

// Per-screen AppState cooldown — sibling to AuthContext's refreshRole cooldown
// (PATTERNS §E). Each AppState consumer uses its OWN cooldown ref because they perform
// DIFFERENT work (refreshRole vs queue refetch vs Profile count refetch).
const REFRESH_COOLDOWN_MS = 60_000;

const ModerationQueueScreen: React.FC<ModerationQueueScreenProps> = ({
  onBack,
  onOpenPropertyDetails,
  onEditOnBehalf,
  onOpenMediaCuration,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  // Phase 4 CARRY-01 D-02 — shared 403 detection + recovery for the 4 mod-action
  // handlers below (handleApprove, handleRejectSubmit, handleApproveLocation,
  // submitLocationReject). Hook drives close-modal + reset-loading + refreshRole;
  // RoleRefreshBanner auto-surfaces from the AuthContext role-change mutation.
  // Precedence in each catch: 403 > 409 > generic.
  const { is403PermissionError, onPermissionDenied } = useModActionGuard();

  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Property | null>(null);
  const [submittingReject, setSubmittingReject] = useState(false);

  // Plan 02-03: Locations tab — additive 2-tab segmented control per Tradeoff §B.
  // Both tab bodies stay MOUNTED with display:'none' (Pitfall 3 mitigation —
  // matches RenterListingsScreen.tsx:184-196 keep-alive pattern). Listings
  // surface is unchanged; this is purely additive UI.
  const [activeTab, setActiveTab] = useState<'listings' | 'locations'>('listings');

  // Phase 3 Plan 03-06 — Listings tab filter chip state (default 'all-pending'
  // per D-03; preserves M2 first-render behavior — every row visible until the
  // mod taps a different chip). Chip row renders ONLY in the Listings tab body
  // (UI-SPEC §"Placement"); auto-hidden via the existing keep-alive display:'none'
  // wrapping the Listings FlatList.
  const [activeFilter, setActiveFilter] = useState<ModFilterChip>('all-pending');
  const [pendingCities, setPendingCities] = useState<City[]>([]);
  const [pendingDistricts, setPendingDistricts] = useState<DistrictWithCity[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [actingLocationId, setActingLocationId] = useState<string | null>(null);
  const [rejectLocationTarget, setRejectLocationTarget] = useState<{
    kind: 'city' | 'district';
    id: string;
    label: string;
  } | null>(null);
  const [rejectLocationNote, setRejectLocationNote] = useState('');
  const [submittingLocationReject, setSubmittingLocationReject] = useState(false);

  // Per-screen cooldown ref — useRef survives re-renders; resets on screen unmount.
  const lastRefreshAt = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: queueItems } = await PropertyService.getModerationQueue();
      setItems(queueItems as Property[]);
    } catch (err: any) {
      console.error('Failed to load moderation queue:', err);
      // WR-06 fix — surface PermissionDeniedError as a translated message and bounce
      // out (the moderator can't see this screen anyway). Previously the user saw
      // the literal sentinel string 'E_PERMISSION_DENIED' as the Alert body.
      if (err instanceof PermissionDeniedError || err?.message === 'E_PERMISSION_DENIED') {
        Alert.alert(t('common.error'), t('errors.permissionDenied'));
        onBack();
        return;
      }
      // WR-01 fix — fall back to a generic translated error string when the server
      // returns a 5xx with no body and the axios error has no .message; prevents
      // the empty-Alert UX from rendering just an "OK" button with no message body.
      Alert.alert(
        t('common.error'),
        err?.response?.data?.message || err?.message || t('common.errorGeneric'),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, onBack]);

  useEffect(() => {
    load();
  }, [load]);

  // Plan 02-03: Locations queue loader (mounted + fetched on first tab activation
  // and on subsequent activeTab toggles back to 'locations'). 409 race-conflict
  // handling reuses handleRaceConflict via a refetch (lighter UX — no toast
  // duplication).
  const loadLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const { cities, districts } = await fetchLocationsQueue();
      setPendingCities(cities);
      setPendingDistricts(districts);
    } catch (err: any) {
      // PermissionDeniedError handled by router-level guard upstream; surface generic
      // error to keep the listings tab usable.
      Alert.alert(
        t('common.error'),
        err?.response?.data?.message || err?.message || t('common.errorGeneric'),
      );
    } finally {
      setLoadingLocations(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeTab === 'locations') {
      loadLocations();
    }
  }, [activeTab, loadLocations]);

  // AppState 'active' refetch — separate subscription from AuthContext per PATTERNS §E.
  // The 60s cooldown ref is per-screen so this listener never duplicates auth's refresh
  // cadence; it only fires its OWN work (queue refetch).
  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      const now = Date.now();
      if (lastRefreshAt.current && now - lastRefreshAt.current < REFRESH_COOLDOWN_MS) return;
      lastRefreshAt.current = now;
      load();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [load]);

  // 409 race-condition UX (PATTERNS §C / CONTEXT D-08): close any open modal FIRST
  // (no overlapping surfaces), THEN fire the MOD-15 verbatim toast, THEN refetch.
  // WR-05 fix — title was empty string '' which renders awkwardly on iOS (naked
  // body with whitespace) and inconsistently on Android. Use a translated title.
  const handleRaceConflict = async () => {
    setRejectTarget(null);
    Alert.alert(t('moderation.race.title'), t('moderation.race.toast'));
    await load();
  };

  const handleApprove = (property: Property) => {
    Alert.alert(
      t('moderation.approve.confirmTitle'),
      t('moderation.approve.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('moderation.action.approve'),
          onPress: async () => {
            setActingId(property.id);
            try {
              await PropertyService.approveListing(property.id);
              // Pessimistic optimistic update: only remove the row AFTER the await
              // resolves successfully (PATTERNS §"Pitfall 7: Pessimistic UI").
              setItems((prev) => prev.filter((p) => p.id !== property.id));
            } catch (err: any) {
              // Phase 4 CARRY-01 D-02 — 403 branch precedes 409: precedence 403 > 409 > generic.
              if (is403PermissionError(err)) {
                await onPermissionDenied({
                  closeModal: () => {},
                  resetLoading: () => setActingId(null),
                });
                return;
              }
              if (err?.response?.status === 409) {
                await handleRaceConflict();
                return;
              }
              // WR-01 fix — generic translated fallback prevents empty-Alert UX.
              Alert.alert(
                t('common.error'),
                err?.response?.data?.message || err?.message || t('common.errorGeneric'),
              );
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    );
  };

  const handleRejectSubmit = async (params: {
    reasonCode: RejectReasonCode;
    reasonNote?: string;
  }) => {
    if (!rejectTarget) return;
    setSubmittingReject(true);
    try {
      await PropertyService.rejectListing(
        rejectTarget.id,
        params.reasonCode,
        params.reasonNote,
      );
      setItems((prev) => prev.filter((p) => p.id !== rejectTarget.id));
      setRejectTarget(null);
    } catch (err: any) {
      // Phase 4 CARRY-01 D-02 — 403 branch precedes 409: precedence 403 > 409 > generic.
      if (is403PermissionError(err)) {
        await onPermissionDenied({
          closeModal: () => setRejectTarget(null),
          resetLoading: () => setSubmittingReject(false),
        });
        return;
      }
      if (err?.response?.status === 409) {
        await handleRaceConflict();
        return;
      }
      // WR-01 fix — generic translated fallback prevents empty-Alert UX.
      Alert.alert(
        t('common.error'),
        err?.response?.data?.message || err?.message || t('common.errorGeneric'),
      );
    } finally {
      setSubmittingReject(false);
    }
  };

  // PropertyCard tap-row callbacks. The queue does not expose tour/video viewers
  // (mods inspect the listing on PropertyDetailsScreen via row tap per CONTEXT D-02),
  // so noop the handlers; PropertyCard's tour/video buttons remain visible but the
  // mod's primary path is row-tap -> details.
  const handleViewTour = (property: Property) => onOpenPropertyDetails(property);
  const handleViewVideo = (property: Property) => onOpenPropertyDetails(property);

  // Phase 3 Plan 03-06 — W2 conditional row-tap branch (encodes D-01 + D-04 read
  // together). Listings with photos.length === 0 route to MediaCurationScreen
  // (curation surface — D-01 needs-media row); listings with photos.length > 0
  // route to PropertyDetailsScreen (mod-action surface preserves Approve / Reject /
  // Edit-on-behalf for has-media listings — D-04). The forwarded App.tsx callback
  // (`onOpenMediaCuration`) was declared in Plan 03-05.
  const handleRowTap = useCallback(
    (listing: Property) => {
      const photoCount = listing.media?.photos?.length ?? 0;
      if (photoCount === 0 && onOpenMediaCuration) {
        // Curation surface — D-01 needs-media row routes to MediaCurationScreen.
        onOpenMediaCuration(String(listing.id));
        return;
      }
      // Mod-action surface — D-04 has-media (or missing callback fallback).
      onOpenPropertyDetails(listing);
    },
    [onOpenMediaCuration, onOpenPropertyDetails],
  );

  // Phase 3 Plan 03-06 — Listings tab filter predicate (UI-SPEC §"Filter predicate").
  // Pure client-side filter; predicate considers ONLY media.photos.length per RESEARCH
  // §Open Question #1 — tourUrl + videos do NOT count toward "has media".
  const filteredItems = useMemo(() => {
    return items.filter((listing) => {
      if (activeFilter === 'all-pending') return true;
      const photoCount = listing.media?.photos?.length ?? 0;
      if (activeFilter === 'needs-media') return photoCount === 0;
      if (activeFilter === 'has-media') return photoCount > 0;
      return true;
    });
  }, [items, activeFilter]);

  const renderItem = ({ item }: { item: Property }) => {
    const isActing = actingId === item.id;
    // Phase 3 Plan 03-06 / D-12 — Approve disabled-state (3rd surface). The
    // inline Approve button on each queue row is gated by photoCount > 0 (UX
    // guidance only; backend Plan 03-03 MEDIA_REQUIRED is the actual trust
    // boundary — T-02 defense-in-depth). When disabled, visual opacity 0.5
    // signals "not actionable yet"; the row-tap conditional (handleRowTap)
    // routes the mod to MediaCurationScreen so they can curate photos first.
    const rowPhotoCount = item.media?.photos?.length ?? 0;
    const isApproveEnabled = rowPhotoCount > 0;
    return (
      <View
        style={[
          styles.queueItemShell,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
        testID={`moderation-queue-row-${String(item.id)}`}
      >
        <PropertyCard
          property={item}
          onPress={handleRowTap}
          onViewTour={handleViewTour}
          onViewVideo={handleViewVideo}
          groupWithFooter
        />
        <View style={[styles.actionsBlock, { borderTopColor: colors.border }]}>
          <View style={styles.actionsRowTop}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnHalf,
                { backgroundColor: colors.success },
                !isApproveEnabled && { opacity: 0.5 },
              ]}
              onPress={() => handleApprove(item)}
              disabled={isActing || !isApproveEnabled}
              activeOpacity={0.7}
              accessibilityState={{ disabled: isActing || !isApproveEnabled }}
            >
              {isActing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>{t('moderation.action.approve')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnHalf, { backgroundColor: colors.error }]}
              onPress={() => setRejectTarget(item)}
              disabled={isActing}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>{t('moderation.action.reject')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnFull,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onEditOnBehalf(item)}
            disabled={isActing}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, { color: colors.text }]}>
              {t('moderation.action.editOnBehalf')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ===== Plan 02-03: Locations tab handlers + row renderer =====

  const handleApproveLocation = (kind: 'city' | 'district', id: string, label: string) => {
    Alert.alert(
      t('moderation.approve.confirmTitle'),
      label,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('moderation.action.approve'),
          onPress: async () => {
            setActingLocationId(id);
            try {
              await approveLocation(kind, id);
              if (kind === 'city') {
                setPendingCities((prev) => prev.filter((c) => c._id !== id));
              } else {
                setPendingDistricts((prev) => prev.filter((d) => d._id !== id));
              }
            } catch (err: any) {
              // Phase 4 CARRY-01 D-02 — 403 branch precedes 409: precedence 403 > 409 > generic.
              if (is403PermissionError(err)) {
                await onPermissionDenied({
                  closeModal: () => {},
                  resetLoading: () => setActingLocationId(null),
                });
                return;
              }
              if (err?.response?.status === 409) {
                // Race-conflict — refetch the queue and surface a generic
                // already-moderated toast (reuses the listings race copy).
                Alert.alert(t('moderation.race.title'), t('moderation.race.toast'));
                await loadLocations();
                return;
              }
              Alert.alert(
                t('common.error'),
                err?.response?.data?.message || err?.message || t('common.errorGeneric'),
              );
            } finally {
              setActingLocationId(null);
            }
          },
        },
      ],
    );
  };

  const submitLocationReject = async () => {
    if (!rejectLocationTarget) return;
    setSubmittingLocationReject(true);
    try {
      await rejectLocation(
        rejectLocationTarget.kind,
        rejectLocationTarget.id,
        rejectLocationNote.trim() || undefined,
      );
      if (rejectLocationTarget.kind === 'city') {
        setPendingCities((prev) =>
          prev.filter((c) => c._id !== rejectLocationTarget.id),
        );
      } else {
        setPendingDistricts((prev) =>
          prev.filter((d) => d._id !== rejectLocationTarget.id),
        );
      }
      setRejectLocationTarget(null);
      setRejectLocationNote('');
    } catch (err: any) {
      // Phase 4 CARRY-01 D-02 — 403 branch precedes 409: precedence 403 > 409 > generic.
      if (is403PermissionError(err)) {
        await onPermissionDenied({
          closeModal: () => {
            setRejectLocationTarget(null);
            setRejectLocationNote('');
          },
          resetLoading: () => setSubmittingLocationReject(false),
        });
        return;
      }
      if (err?.response?.status === 409) {
        Alert.alert(t('moderation.race.title'), t('moderation.race.toast'));
        await loadLocations();
        setRejectLocationTarget(null);
        setRejectLocationNote('');
        return;
      }
      Alert.alert(
        t('common.error'),
        err?.response?.data?.message || err?.message || t('common.errorGeneric'),
      );
    } finally {
      setSubmittingLocationReject(false);
    }
  };

  const renderLocationRow = (
    kind: 'city' | 'district',
    id: string,
    title: string,
    subtitle: string,
  ) => {
    const isActing = actingLocationId === id;
    return (
      <View
        key={`${kind}-${id}`}
        style={[
          styles.queueItemShell,
          { borderColor: colors.border, backgroundColor: colors.surface, padding: 12 },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: 16 }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
            {subtitle}
          </Text>
        ) : null}
        <View style={[styles.actionsRowTop, { marginTop: 12 }]}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnHalf,
              { backgroundColor: colors.success },
            ]}
            onPress={() => handleApproveLocation(kind, id, title)}
            disabled={isActing}
            activeOpacity={0.7}
          >
            {isActing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>{t('moderation.action.approve')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnHalf,
              { backgroundColor: colors.error },
            ]}
            onPress={() => {
              setRejectLocationNote('');
              setRejectLocationTarget({ kind, id, label: title });
            }}
            disabled={isActing}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>{t('moderation.action.reject')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Locations tab counts (drives tab label badges).
  const pendingLocationsCount = pendingCities.length + pendingDistricts.length;
  const pendingListingsCount = items.length;
  const listingsTabLabel = t('moderation.queue.tabs.listings', {
    count: String(pendingListingsCount),
  });
  const locationsTabLabel = t('moderation.queue.tabs.locations', {
    count: String(pendingLocationsCount),
  });

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('moderation.queue.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Plan 02-03: 2-tab segmented control (Tradeoff §B). */}
      <View
        style={[styles.tabsRow, { borderBottomColor: colors.border }]}
        testID="moderation-queue-tabs"
      >
        <TouchableOpacity
          testID="moderation-queue-tab-listings"
          onPress={() => setActiveTab('listings')}
          activeOpacity={0.8}
          style={[
            styles.tabButton,
            activeTab === 'listings' && {
              borderBottomColor: colors.accent,
              borderBottomWidth: 2,
            },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'listings' }}
        >
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'listings' ? colors.text : colors.textSecondary,
                fontWeight: activeTab === 'listings' ? '600' : '500',
              },
            ]}
          >
            {listingsTabLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="moderation-queue-tab-locations"
          onPress={() => setActiveTab('locations')}
          activeOpacity={0.8}
          style={[
            styles.tabButton,
            activeTab === 'locations' && {
              borderBottomColor: colors.accent,
              borderBottomWidth: 2,
            },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'locations' }}
        >
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'locations' ? colors.text : colors.textSecondary,
                fontWeight: activeTab === 'locations' ? '600' : '500',
              },
            ]}
          >
            {locationsTabLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pitfall 3 mitigation: keep BOTH lists mounted with display:'none' (matches
          RenterListingsScreen.tsx:184-196 keep-alive pattern). Listings surface is
          unchanged from M2 Phase 3; this is purely additive UI per Plan 02-03 Tradeoff §B. */}
      <View
        style={{ flex: 1, display: activeTab === 'listings' ? 'flex' : 'none' }}
        testID="moderation-queue-tab-body-listings"
      >
        {/* Phase 3 Plan 03-06 — 3-chip filter row (UI-SPEC §Surface 2). Renders
            ONLY inside the Listings tab body (auto-hidden when Locations tab
            active via the parent's display:'none' wrapper). Chip pattern
            mirrors Step4ConditionAmenities (visual continuity). */}
        <View style={chipStyles.chipRow} testID="moderation-filter-chip-row">
          {(['all-pending', 'needs-media', 'has-media'] as const).map((chip) => {
            const isActive = activeFilter === chip;
            const labelKey: TranslationKeys =
              chip === 'all-pending'
                ? 'moderation.filter.allPending'
                : chip === 'needs-media'
                ? 'moderation.filter.needsMedia'
                : 'moderation.filter.hasMedia';
            return (
              <TouchableOpacity
                key={chip}
                testID={`moderation-filter-chip-${chip}`}
                style={[
                  chipStyles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.activeChipBackground
                      : colors.chipBackground,
                    borderColor: isActive
                      ? colors.activeChipBackground
                      : colors.chipBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActiveFilter(chip)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    chipStyles.chipText,
                    { color: isActive ? colors.activeChipText : colors.text },
                  ]}
                >
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            // WR-03 fix — defensively coerce to String; the upstream PropertyService
            // mapping already does this, but a belt-and-suspenders String() here
            // protects against future regressions if items ever flow in unmapped.
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('moderation.queue.empty')}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <View
        style={{ flex: 1, display: activeTab === 'locations' ? 'flex' : 'none' }}
        testID="moderation-queue-tab-body-locations"
      >
        {loadingLocations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : pendingCities.length === 0 && pendingDistricts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('moderation.queue.locations.empty')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={[]}
            keyExtractor={() => '__locations__'}
            renderItem={() => null}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View>
                {pendingCities.map((c) =>
                  renderLocationRow(
                    'city',
                    c._id,
                    `${c.label.ru} / ${c.label.en}`,
                    c.country,
                  ),
                )}
                {pendingDistricts.map((d) => {
                  const cid = d.cityId as
                    | string
                    | { _id: string; slug: string; label: { ru: string; en: string } };
                  const parent = typeof cid === 'string' ? cid : cid.slug;
                  return renderLocationRow(
                    'district',
                    d._id,
                    `${d.label.ru} / ${d.label.en}`,
                    parent,
                  );
                })}
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={loadingLocations}
                onRefresh={loadLocations}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        )}
      </View>

      <RejectListingModal
        visible={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleRejectSubmit}
        submitting={submittingReject}
      />

      {/* Lightweight reject modal for Locations tab — re-uses common copy. */}
      {rejectLocationTarget ? (
        <View
          style={styles.locationRejectOverlay}
          testID="moderation-queue-location-reject-modal"
        >
          <View
            style={[
              styles.locationRejectSheet,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('moderation.action.reject')}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              {rejectLocationTarget.label}
            </Text>
            <TextInput
              testID="moderation-queue-location-reject-note"
              value={rejectLocationNote}
              onChangeText={setRejectLocationNote}
              multiline
              placeholder={t('common.cancel') as string}
              placeholderTextColor={colors.textTertiary}
              style={{
                marginTop: 12,
                minHeight: 80,
                borderWidth: 1,
                borderRadius: 10,
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.inputBackground,
                padding: 10,
                textAlignVertical: 'top',
              }}
            />
            <View style={[styles.actionsRowTop, { marginTop: 12 }]}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.actionBtnHalf,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setRejectLocationTarget(null);
                  setRejectLocationNote('');
                }}
                disabled={submittingLocationReject}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.actionBtnHalf,
                  { backgroundColor: colors.error },
                ]}
                onPress={submitLocationReject}
                disabled={submittingLocationReject}
                activeOpacity={0.7}
              >
                {submittingLocationReject ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>{t('moderation.action.reject')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  // Heading role per UI-SPEC §"Typography": 18/600/24. Diverges from Phase 4.5's 700.
  headerTitle: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  // Single bordered shell per listing so actions read as part of the same unit as the card.
  queueItemShell: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  actionsBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  actionsRowTop: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  actionBtnHalf: { flex: 1, minWidth: 0 },
  actionBtnFull: { alignSelf: 'stretch' },
  // Action label role per UI-SPEC §"Typography": 14/600/20.
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  // Empty-state heading per UI-SPEC revision 2026-05-01: 14/600/20 (was 15/600/20).
  emptyText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  // Plan 02-03: 2-tab segmented control styles (Tradeoff §B). Mirrors
  // RenterListingsScreen.tsx tabsScroll/tabButton/tabLabel pattern (M2 Phase 2 D-09).
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Plan 02-03: Locations tab reject modal — lightweight bottom-sheet overlay.
  locationRejectOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  locationRejectSheet: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
});

// Phase 3 Plan 03-06 — chip row stylesheet. Mirrors ContextualListingFlow
// commonStyles.chip{Row,Text} verbatim (visual continuity); colors are applied
// inline at consumption per CONVENTIONS.md "no hardcoded colors in static styles"
// rule. Inlined as a separate StyleSheet.create rather than imported from
// ContextualListingFlow/styles.ts to avoid the import-chain dependency on a
// flow-internal styles module (the chips here are a moderation surface, not part
// of the contextual listing flow — keeping the dimensional tokens local makes
// the screen self-contained).
const chipStyles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

// Named export added in Plan 03-06 so the new RTL test (and any future direct
// imports) can use the named-import pattern; default export preserved for
// existing call sites.
export { ModerationQueueScreen };
export default ModerationQueueScreen;
