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
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { ChevronLeft, Check, X, Edit3 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { PropertyService } from '../services/PropertyService';
import { PropertyCard } from '../components/PropertyCard';
import RejectListingModal, { RejectReasonCode } from '../components/RejectListingModal';
import type { Property } from '../types/Property';

interface ModerationQueueScreenProps {
  onBack: () => void;
  onOpenPropertyDetails: (property: Property) => void;
  onEditOnBehalf: (property: Property) => void;
}

// Per-screen AppState cooldown — sibling to AuthContext's refreshRole cooldown
// (PATTERNS §E). Each AppState consumer uses its OWN cooldown ref because they perform
// DIFFERENT work (refreshRole vs queue refetch vs Profile count refetch).
const REFRESH_COOLDOWN_MS = 60_000;

const ModerationQueueScreen: React.FC<ModerationQueueScreenProps> = ({
  onBack,
  onOpenPropertyDetails,
  onEditOnBehalf,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Property | null>(null);
  const [submittingReject, setSubmittingReject] = useState(false);

  // Per-screen cooldown ref — useRef survives re-renders; resets on screen unmount.
  const lastRefreshAt = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: queueItems } = await PropertyService.getModerationQueue();
      setItems(queueItems as Property[]);
    } catch (err: any) {
      console.error('Failed to load moderation queue:', err);
      Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || '');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

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
  const handleRaceConflict = async () => {
    setRejectTarget(null);
    Alert.alert('', t('moderation.race.toast'));
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
              if (err?.response?.status === 409) {
                await handleRaceConflict();
                return;
              }
              Alert.alert(
                t('common.error'),
                err?.response?.data?.message || err?.message || '',
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
      if (err?.response?.status === 409) {
        await handleRaceConflict();
        return;
      }
      Alert.alert(t('common.error'), err?.response?.data?.message || err?.message || '');
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

  const renderItem = ({ item }: { item: Property }) => {
    const isActing = actingId === item.id;
    return (
      <View style={styles.row}>
        <PropertyCard
          property={item}
          onPress={onOpenPropertyDetails}
          onViewTour={handleViewTour}
          onViewVideo={handleViewVideo}
        />
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            onPress={() => handleApprove(item)}
            disabled={isActing}
            activeOpacity={0.7}
          >
            {isActing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Check size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>{t('moderation.action.approve')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.error }]}
            onPress={() => setRejectTarget(item)}
            disabled={isActing}
            activeOpacity={0.7}
          >
            <X size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>{t('moderation.action.reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
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
            <Edit3 size={18} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>
              {t('moderation.action.editOnBehalf')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
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

      <RejectListingModal
        visible={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleRejectSubmit}
        submitting={submittingReject}
      />
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
  row: { marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  // Action label role per UI-SPEC §"Typography": 14/600/20.
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  // Empty-state heading per UI-SPEC revision 2026-05-01: 14/600/20 (was 15/600/20).
  emptyText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
});

export default ModerationQueueScreen;
