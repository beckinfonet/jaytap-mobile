/**
 * AdminReviewDock — single-primary-CTA bottom dock for the admin review surface.
 * Spec: docs/superpowers/specs/2026-05-29-admin-review-dock-redesign-design.md § 3
 *
 * Replaces the inline `showModerationDock` JSX block (PropertyDetailsScreen
 * lines ~1685–1893 pre-redesign). Owns:
 *   - The locked-vs-unlocked Approve button.
 *   - The "More actions" disclosure trigger + expanded menu card.
 *   - The frosted blur background.
 *
 * All handlers passed in as props — this component is presentational only. The
 * parent screen owns confirmation flows, modal opens, and HTTP calls.
 *
 * Zero-hex rule: all colors via useTheme(); static StyleSheet has no `color:` or
 * `backgroundColor:` keys.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import {
  Lock,
  Check,
  ChevronDown,
  AlertTriangle,
  X,
  Edit3,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export interface AdminReviewDockProps {
  isApproveEnabled: boolean;
  submittingAction: boolean;
  canReviewActions: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canHardDelete: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEditOnBehalf: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}

export const AdminReviewDock: React.FC<AdminReviewDockProps> = ({
  isApproveEnabled,
  submittingAction,
  canReviewActions,
  canArchive,
  canRestore,
  canHardDelete,
  onApprove,
  onReject,
  onEditOnBehalf,
  onArchive,
  onRestore,
  onHardDelete,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);

  const approveDisabled = !isApproveEnabled || submittingAction;
  const hasAnySecondary = canReviewActions || canArchive || canRestore || canHardDelete;

  const closeMenuAnd = (handler: () => void) => () => {
    setMoreOpen(false);
    handler();
  };

  // Glow shadow (dark mode only) — applied inline since it depends on the
  // success token. Light mode: no shadow at all (haze on white).
  const approveGlow =
    isDark && isApproveEnabled
      ? Platform.select({
          ios: {
            shadowColor: colors.success,
            shadowOpacity: 0.6,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 10 },
          },
          android: { elevation: 6 },
        })
      : undefined;

  return (
    <View style={[styles.dockOuter, { borderTopColor: colors.border }]}>
      <BlurView
        style={StyleSheet.absoluteFillObject}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={Platform.OS === 'ios' ? 22 : 32}
        reducedTransparencyFallbackColor={colors.surface}
      />
      <View style={styles.dockContent}>
        {/* Approve button — locked vs unlocked */}
        <TouchableOpacity
          testID="admin-review-dock-approve"
          onPress={onApprove}
          disabled={approveDisabled}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: approveDisabled }}
          accessibilityLabel={
            isApproveEnabled
              ? t('adminReview.approve.unlocked.label')
              : t('adminReview.approve.locked.label')
          }
          style={[
            styles.approveBtn,
            isApproveEnabled
              ? [{ backgroundColor: colors.success }, approveGlow]
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          {submittingAction ? (
            <ActivityIndicator color={isApproveEnabled ? colors.onAccent : colors.textTertiary} />
          ) : isApproveEnabled ? (
            <>
              <Check size={18} color={colors.onAccent} />
              <Text style={[styles.approveLabel, { color: colors.onAccent }]}>
                {t('adminReview.approve.unlocked.label')}
              </Text>
            </>
          ) : (
            <>
              <Lock size={15} color={colors.textTertiary} />
              <Text style={[styles.approveLabel, { color: colors.textTertiary }]}>
                {t('adminReview.approve.locked.label')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Helper line — only when locked */}
        {!isApproveEnabled && (
          <View style={styles.helperRow}>
            <AlertTriangle size={12} color={colors.warning} />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              {t('adminReview.approve.locked.helper')}
            </Text>
          </View>
        )}

        {/* Expanded menu — renders ABOVE the trigger, between Approve and trigger */}
        {hasAnySecondary && moreOpen && (
          <View
            testID="admin-review-dock-more-menu"
            style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.menuHeader}>
              <Text style={[styles.menuHeaderText, { color: colors.textSecondary }]}>
                {t('adminReview.moreActions.menuHeader')}
              </Text>
            </View>
            {canReviewActions && (
              <TouchableOpacity
                testID="admin-review-dock-row-reject"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onReject)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <X size={16} color={colors.error} />
                <Text style={[styles.menuRowLabel, { color: colors.error }]}>
                  {t('moderation.action.reject')}
                </Text>
              </TouchableOpacity>
            )}
            {canReviewActions && (
              <TouchableOpacity
                testID="admin-review-dock-row-edit"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onEditOnBehalf)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <Edit3 size={16} color={colors.textSecondary} />
                <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                  {t('moderation.action.editOnBehalf')}
                </Text>
              </TouchableOpacity>
            )}
            {canArchive && (
              <TouchableOpacity
                testID="admin-review-dock-row-archive"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onArchive)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <Archive size={16} color={colors.textSecondary} />
                <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                  {t('property.archive')}
                </Text>
              </TouchableOpacity>
            )}
            {canRestore && (
              <TouchableOpacity
                testID="admin-review-dock-row-restore"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onRestore)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <ArchiveRestore size={16} color={colors.textSecondary} />
                <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                  {t('property.unarchive')}
                </Text>
              </TouchableOpacity>
            )}
            {canHardDelete && (
              <TouchableOpacity
                testID="admin-review-dock-row-delete"
                style={[styles.menuRow, { borderTopColor: colors.border }]}
                onPress={closeMenuAnd(onHardDelete)}
                disabled={submittingAction}
                accessibilityRole="button"
              >
                <Trash2 size={16} color={colors.error} />
                <Text style={[styles.menuRowLabel, { color: colors.error }]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* More actions trigger */}
        {hasAnySecondary && (
          <TouchableOpacity
            testID="admin-review-dock-more-trigger"
            onPress={() => setMoreOpen((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: moreOpen }}
            style={[styles.moreTrigger, { borderColor: colors.border }]}
          >
            <Text style={[styles.moreTriggerLabel, { color: colors.textSecondary }]}>
              {moreOpen
                ? t('adminReview.moreActions.trigger.expanded')
                : t('adminReview.moreActions.trigger.collapsed')}
            </Text>
            <View
              style={[
                styles.moreChevron,
                moreOpen && styles.moreChevronOpen,
              ]}
            >
              <ChevronDown size={15} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockOuter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    overflow: 'hidden',
  },
  dockContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 10,
  },
  approveBtn: {
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  approveLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -2,
  },
  helperText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  moreTrigger: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  moreTriggerLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  moreChevron: {
    transform: [{ rotate: '0deg' }],
  },
  moreChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  menuCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuHeader: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuHeaderText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuRowLabel: {
    fontSize: 14.5,
    fontWeight: '600',
  },
});

export default AdminReviewDock;
