// Phase 4.5 — Profile-screen status banner showing the user's current landlord-application state.
// State derivation: combines `backendProfile.canListProperties` and the most-recent application
// row from /landlord-applications/mine (cached on mount). Tapping the CTA delegates to the parent.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LandlordApplicationService,
  LandlordApplication,
  RejectionReasonCode,
} from '../services/LandlordApplicationService';

interface Props {
  /** Tap handler. Parent decides where to route (typically to LandlordApplicationScreen). */
  onPress: () => void;
}

type DerivedState =
  | { kind: 'approved' }
  | { kind: 'submitted'; submittedAt?: string }
  | { kind: 'rejected'; reasonCode?: RejectionReasonCode | null; reasonNote?: string | null }
  | { kind: 'withdrawn' }
  | { kind: 'none' };

function deriveState(
  canListProperties: boolean | undefined,
  applications: LandlordApplication[]
): DerivedState {
  if (canListProperties === true) return { kind: 'approved' };
  const newest = applications[0];
  if (!newest) return { kind: 'none' };
  switch (newest.status) {
    case 'submitted':
      return { kind: 'submitted', submittedAt: newest.submittedAt };
    case 'rejected':
      return { kind: 'rejected', reasonCode: newest.rejectionReasonCode, reasonNote: newest.rejectionReasonNote };
    case 'withdrawn':
      return { kind: 'withdrawn' };
    default:
      return { kind: 'none' };
  }
}

export const LandlordApplicationStatusBanner: React.FC<Props> = ({ onPress }) => {
  const { colors } = useTheme();
  const { user, refreshRole } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<LandlordApplication[]>([]);

  const canListProperties = (user as any)?.backendProfile?.canListProperties as boolean | undefined;
  const userType = (user as any)?.backendProfile?.userType as string | undefined;

  // Refresh AuthContext.user.backendProfile on every mount so canListProperties
  // reflects any admin decisions made since login. The banner's "approved" branch
  // depends on this bit; without the refresh, the user has to log out + back in
  // to see an approval. Dep is `[user?.localId]` so the refresh's setUser doesn't
  // re-trigger the effect.
  useEffect(() => {
    if (!user?.localId) {
      setLoading(false);
      return;
    }
    refreshRole().catch(() => { /* best-effort; AuthContext already warns */ });

    let cancelled = false;
    LandlordApplicationService.getMine()
      .then((apps) => {
        if (!cancelled) setApplications(apps);
      })
      .catch((err) => {
        // Don't surface errors here — banner is best-effort.
        console.warn('[LandlordApplicationStatusBanner] failed to load applications:', err?.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.localId, refreshRole]);

  // Admins/moderators have implicit listing rights — banner is irrelevant for them.
  if (userType === 'admin' || userType === 'moderator') return null;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  const state = deriveState(canListProperties, applications);

  let title = '';
  let body = '';
  let accent = colors.primary;

  switch (state.kind) {
    case 'approved':
      title = t('landlordApp.banner.approvedTitle');
      body = t('landlordApp.banner.approvedBody');
      accent = '#059669';
      break;
    case 'submitted':
      title = t('landlordApp.banner.submittedTitle');
      body = t('landlordApp.banner.submittedBody');
      accent = '#D97706';
      break;
    case 'rejected':
      title = t('landlordApp.banner.rejectedTitle');
      body = state.reasonNote
        ? `${t(`landlordApp.rejectReason.${state.reasonCode || 'other'}` as any)} — ${state.reasonNote}`
        : t(`landlordApp.rejectReason.${state.reasonCode || 'other'}` as any);
      accent = '#DC2626';
      break;
    case 'withdrawn':
      title = t('landlordApp.banner.withdrawnTitle');
      body = t('landlordApp.banner.withdrawnBody');
      accent = colors.textSecondary;
      break;
    case 'none':
      title = t('landlordApp.banner.noneTitle');
      body = t('landlordApp.banner.noneBody');
      break;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>{body}</Text>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 14 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 13, lineHeight: 18 },
});
