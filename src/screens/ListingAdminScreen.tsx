/**
 * ListingAdminScreen — admin-only "Manage listing" overlay reached via the
 * PropertyDetailsScreen kebab. Shows status, audit timestamps, owner uid,
 * archive metadata, and full-width buttons for the same three live-listing
 * actions exposed by the kebab (Edit media / Suspend or Restore / Delete).
 *
 * Layer-2 role gate: useRole().can('editAnyListing'). Layer-3 in services
 * (PropertyService.archiveAnyListing / restoreListing / hardDeleteListing
 * all re-check canFromUser before issuing the HTTP call).
 *
 * Mounted as a full-screen overlay from App.tsx state machine when the
 * AdminListingMenu kebab picks the 'manage' action.
 *
 * Behavior:
 *   - Edit media → calls onOpenLiveMediaEdit(listingId) and closes the screen
 *     (parent dispatches MediaCurationScreen in 'edit-live-media' mode).
 *   - Suspend (when not archived) → opens internal ArchiveListingModal.
 *   - Restore (when archived) → Alert.alert confirm + PropertyService call.
 *   - Delete (when archived, admin-only) → opens HardDeleteConfirmModal.
 *
 * After successful Suspend/Restore the listing is re-fetched so the status
 * pill flips and the action buttons swap. After successful Delete, the
 * parent's onListingDeleted callback closes both this overlay AND the
 * underlying PropertyDetailsScreen so the user lands back on the renter list.
 *
 * Uid rows are Text `selectable` so admins can long-press to copy — a
 * dedicated copy-to-clipboard affordance was deferred (no clipboard
 * dependency installed). The `adminListing.manage.copy.*` keys remain in
 * the locale files for that future follow-up.
 *
 * Theme: 100% useTheme() tokens. NO hex / rgba literals. Substitution map
 * (per CLAUDE.md): `card` → surface, `textMuted` → textSecondary,
 * `disabled` → border.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useRole } from '../hooks/useRole';
import { useModActionGuard } from '../hooks/useModActionGuard';
import { PropertyService } from '../services/PropertyService';
import ArchiveListingModal from '../components/ArchiveListingModal';
import { HardDeleteConfirmModal } from '../components/HardDeleteConfirmModal';

interface ListingAdminScreenProps {
  listingId: string;
  onClose: () => void;
  onOpenLiveMediaEdit: (listingId: string) => void;
  /** Fires after a successful hard delete. Parent closes both this overlay
   *  AND the underlying PropertyDetailsScreen (clears selectedProperty). */
  onListingDeleted: () => void;
}

type ListingStatus = 'pending' | 'live' | 'rejected' | 'archived';

const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export const ListingAdminScreen: React.FC<ListingAdminScreenProps> = ({
  listingId,
  onClose,
  onOpenLiveMediaEdit,
  onListingDeleted,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { can } = useRole();
  const { is403PermissionError, onPermissionDenied } = useModActionGuard();
  const insets = useSafeAreaInsets();

  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);
  const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState<boolean>(false);

  // Re-fetch helper used after Suspend/Restore so the status pill + button
  // set update immediately. Delete does NOT re-fetch — the listing is gone.
  const refetchListing = useCallback(async () => {
    try {
      const data = await PropertyService.getPropertyById(listingId);
      setListing(data);
    } catch (err: any) {
      // Stay on the screen if the refetch fails — the action itself succeeded.
      if (__DEV__) console.warn('[ListingAdminScreen] refetch failed', err?.message);
    }
  }, [listingId]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const data = await PropertyService.getPropertyById(listingId);
        if (!mounted) return;
        setListing(data);
      } catch (err: any) {
        if (mounted) setLoadError(err?.message || 'Failed to load listing');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [listingId]);

  // Belt-and-suspenders Layer-2 gate. App.tsx already mount-gates on
  // `!!user`, but the role itself can flip mid-session. Sits AFTER all
  // hooks per HG-01 invariant — never move above the hook calls.
  if (!can('editAnyListing')) {
    if (__DEV__) {
      console.error(
        '[ListingAdminScreen] mounted by non-admin — gating closed (belt-and-suspenders)',
      );
    }
    return null;
  }

  // -- Action handlers ---------------------------------------------------

  const handleSuspendSubmit = async (params: { reasonCode: any; reasonNote?: string }) => {
    setSubmittingAction(true);
    try {
      await PropertyService.archiveAnyListing(listingId, params.reasonCode, params.reasonNote);
      setIsArchiveModalOpen(false);
      await refetchListing();
    } catch (err: any) {
      if (is403PermissionError(err)) {
        await onPermissionDenied({
          closeModal: () => setIsArchiveModalOpen(false),
          resetLoading: () => setSubmittingAction(false),
        });
        Alert.alert(t('common.error'), t('adminListing.errors.permissionDenied'));
        onClose();
        return;
      }
      if (err?.response?.status === 404) {
        Alert.alert(t('common.error'), t('adminListing.errors.listingGone'));
        setIsArchiveModalOpen(false);
        onClose();
        return;
      }
      Alert.alert(t('common.error'), t('adminListing.errors.suspendFailed'));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      t('adminListing.restore.title'),
      t('adminListing.restore.body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('adminListing.restore.confirm'),
          onPress: async () => {
            setSubmittingAction(true);
            try {
              await PropertyService.restoreListing(listingId);
              Alert.alert(t('common.success'), t('adminListing.restore.success'));
              await refetchListing();
            } catch (err: any) {
              if (is403PermissionError(err)) {
                await onPermissionDenied({
                  closeModal: () => {},
                  resetLoading: () => setSubmittingAction(false),
                });
                Alert.alert(t('common.error'), t('adminListing.errors.permissionDenied'));
                onClose();
                return;
              }
              if (err?.response?.status === 404) {
                Alert.alert(t('common.error'), t('adminListing.errors.listingGone'));
                onClose();
                return;
              }
              Alert.alert(t('common.error'), t('adminListing.errors.restoreFailed'));
            } finally {
              setSubmittingAction(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteConfirm = async () => {
    setSubmittingAction(true);
    try {
      await PropertyService.hardDeleteListing(listingId);
      setIsHardDeleteModalOpen(false);
      Alert.alert(t('common.success'), t('adminListing.delete.success'));
      // Parent closes both this overlay AND the underlying PropertyDetailsScreen.
      onListingDeleted();
    } catch (err: any) {
      if (is403PermissionError(err)) {
        await onPermissionDenied({
          closeModal: () => setIsHardDeleteModalOpen(false),
          resetLoading: () => setSubmittingAction(false),
        });
        Alert.alert(t('common.error'), t('adminListing.errors.permissionDenied'));
        onClose();
        return;
      }
      if (err?.response?.status === 404) {
        Alert.alert(t('common.error'), t('adminListing.errors.listingGone'));
        setIsHardDeleteModalOpen(false);
        onClose();
        return;
      }
      Alert.alert(t('common.error'), t('adminListing.errors.deleteFailed'));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleEditMediaPress = () => {
    onOpenLiveMediaEdit(listingId);
    onClose();
  };

  // -- Derived state -----------------------------------------------------
  const status: ListingStatus | undefined = listing?.status;
  const isArchived = status === 'archived';
  const canDelete = can('hardDeleteListing');
  const deleteEnabled = isArchived && !submittingAction;
  // Owner uid lookup. Property type uses top-level `ownerUid`; some legacy
  // call sites also reference `owner.uid`. Plan spec said prefer `userId`
  // but no such field exists on the Property type — using `ownerUid` then
  // falling back to `owner.uid` is the closest correct mapping.
  const ownerUid = listing?.ownerUid || listing?.owner?.uid || '';

  // -- Status pill color mapping (mirrors StatusPill.tsx, but inline so
  //    we can show a 'live' pill too — StatusPill returns null for live). --
  const statusPillBg = (() => {
    switch (status) {
      case 'live':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'rejected':
        return colors.error;
      case 'archived':
        return colors.textTertiary;
      default:
        return colors.border;
    }
  })();
  const statusPillFg = (() => {
    switch (status) {
      case 'pending':
        return colors.onWarning;
      default:
        return colors.onAccent;
    }
  })();
  const statusLabelKey = ((): string => {
    switch (status) {
      case 'live':
        return 'adminListing.manage.status.live';
      case 'pending':
        return 'adminListing.manage.status.pending';
      case 'rejected':
        return 'adminListing.manage.status.rejected';
      case 'archived':
        return 'adminListing.manage.status.archived';
      default:
        return 'adminListing.manage.status.label';
    }
  })();

  // -- Row sub-renderer (label + value, value is `selectable` so admins
  //    can long-press to copy — no clipboard dep needed). -----------------
  const renderRow = (label: string, value: string, opts?: { mono?: boolean }) => (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          { color: colors.text },
          opts?.mono && styles.rowValueMono,
        ]}
        selectable
        numberOfLines={2}
      >
        {value || '—'}
      </Text>
    </View>
  );

  // -- Render -----------------------------------------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header — same X-close + centered title shape used by MediaCurationScreen / ModerationQueueScreen. */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          style={styles.headerIconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {t('adminListing.manage.title')}
        </Text>
        {/* Right-side spacer to keep title centered between the X and the empty slot. */}
        <View style={styles.headerIconBtn} />
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!loading && loadError && (
        <View style={styles.loadingWrap}>
          <Text style={[styles.errorText, { color: colors.error }]}>{loadError}</Text>
        </View>
      )}

      {!loading && !loadError && listing && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status pill */}
          <View style={styles.statusRow}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
              {t('adminListing.manage.status.label')}
            </Text>
            <View
              style={[styles.statusPill, { backgroundColor: statusPillBg }]}
              accessibilityLabel={t(statusLabelKey as any)}
            >
              <Text style={[styles.statusPillLabel, { color: statusPillFg }]}>
                {t(statusLabelKey as any)}
              </Text>
            </View>
          </View>

          {/* Audit metadata card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {renderRow(t('adminListing.manage.submittedAt'), formatDate(listing.submittedAt))}
            {renderRow(t('adminListing.manage.approvedAt'), formatDate(listing.approvedAt))}
            {renderRow(t('adminListing.manage.approvedBy'), listing.approvedByUid || '', { mono: true })}
            {renderRow(t('adminListing.manage.ownerUid'), ownerUid, { mono: true })}
          </View>

          {/* Archive metadata card — shown only when archived. */}
          {isArchived && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {renderRow(t('adminListing.manage.archivedAt'), formatDate(listing.archivedAt))}
              {renderRow(t('adminListing.manage.archivedBy'), listing.archivedByUid || '', { mono: true })}
              {renderRow(t('adminListing.manage.archivedReason'), listing.archivedReasonCode || '')}
              {renderRow(t('adminListing.manage.archivedNote'), listing.archivedReasonNote || '')}
            </View>
          )}

          {/* Full-width action buttons */}
          <View style={styles.actions}>
            {/* Edit media */}
            <TouchableOpacity
              onPress={handleEditMediaPress}
              disabled={submittingAction}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: submittingAction ? 0.5 : 1,
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.actionBtnText, { color: colors.onAccent }]}>
                {t('adminListing.menu.editMedia')}
              </Text>
            </TouchableOpacity>

            {/* Suspend (non-archived) OR Restore (archived) */}
            {!isArchived ? (
              <TouchableOpacity
                onPress={() => setIsArchiveModalOpen(true)}
                disabled={submittingAction}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: submittingAction ? 0.5 : 1,
                  },
                ]}
                accessibilityRole="button"
              >
                <Text style={[styles.actionBtnText, { color: colors.onAccent }]}>
                  {t('adminListing.menu.suspend')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleRestore}
                disabled={submittingAction}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: submittingAction ? 0.5 : 1,
                  },
                ]}
                accessibilityRole="button"
              >
                <Text style={[styles.actionBtnText, { color: colors.onAccent }]}>
                  {t('adminListing.menu.restore')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete — admin only, disabled unless archived. */}
            {canDelete && (
              <>
                <TouchableOpacity
                  onPress={() => setIsHardDeleteModalOpen(true)}
                  disabled={!deleteEnabled}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: deleteEnabled ? colors.error : colors.border,
                      opacity: deleteEnabled ? 1 : 0.5,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !deleteEnabled }}
                >
                  <Text style={[styles.actionBtnText, { color: colors.onAccent }]}>
                    {t('adminListing.menu.delete')}
                  </Text>
                </TouchableOpacity>
                {!isArchived && (
                  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                    {t('adminListing.delete.blockedReason')}
                  </Text>
                )}
              </>
            )}
          </View>

          {submittingAction && (
            <View style={styles.inlineSpinner}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>
      )}

      {/* Suspend modal — same shape used by PropertyDetailsScreen. */}
      <ArchiveListingModal
        visible={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onSubmit={handleSuspendSubmit}
        submitting={submittingAction}
      />

      {/* Hard-delete confirm — typed-DELETE gate. */}
      <HardDeleteConfirmModal
        visible={isHardDeleteModalOpen}
        submitting={submittingAction}
        onClose={() => setIsHardDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusPillLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 0,
    maxWidth: '40%',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '400',
    flexShrink: 1,
    textAlign: 'right',
  },
  rowValueMono: {
    fontFamily: 'Menlo',
    fontSize: 12,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: -2,
  },
  inlineSpinner: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});

export default ListingAdminScreen;
