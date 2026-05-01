// Phase 4.5 — User-facing application form + pending-review state.
// On mount, fetches current applications. If a 'submitted' application exists, renders a
// status view with a Withdraw action instead of the empty form. Otherwise, renders the form.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'react-native-image-picker';
import { Camera, Upload, ChevronLeft, Check, Clock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LandlordApplicationService,
  LandlordApplication,
  ListingTypeIntent,
} from '../services/LandlordApplicationService';

interface LandlordApplicationScreenProps {
  onBack: () => void;
  /** Called after a successful submit so the parent can refresh status banner / close screen. */
  onSubmitted?: () => void;
}

const INTENT_OPTIONS: ListingTypeIntent[] = ['residential', 'commercial', 'hospitality'];

export const LandlordApplicationScreen: React.FC<LandlordApplicationScreenProps> = ({
  onBack,
  onSubmitted,
}) => {
  const { colors, isDark } = useTheme();
  const { user, refreshRole } = useAuth();
  const { t } = useLanguage();

  // Initial loading: fetching the user's applications.
  const [loading, setLoading] = useState(true);
  // Newest submitted application, if any. Drives the pending-review view.
  const [activeApplication, setActiveApplication] = useState<LandlordApplication | null>(null);
  // Newest rejected application, if any. Drives the rejection banner above the re-apply form.
  const [latestRejected, setLatestRejected] = useState<LandlordApplication | null>(null);
  // Track whether the form has been pre-filled, so we can preserve user edits.
  const [withdrawing, setWithdrawing] = useState(false);

  // Form state
  const [phone, setPhone] = useState('');
  const [intents, setIntents] = useState<Set<ListingTypeIntent>>(new Set(['residential']));
  const [applicantNote, setApplicantNote] = useState('');
  const [idPhoto, setIdPhoto] = useState<{ uri: string; type?: string; name?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Submit button text adapts to the theme — colors.primary in dark mode is light, so white text vanishes.
  const submitTextColor = isDark ? '#121212' : '#FFFFFF';

  // Load profile phone + existing applications on mount.
  // Also refresh AuthContext.user.backendProfile via /auth/me so canListProperties
  // reflects any admin decisions made since the user's last login. Without this,
  // the screen would render stale form/rejection state for an already-approved user.
  // Dep is `[user?.localId]` (not `[user]`) because refreshRole calls setUser, which
  // would otherwise re-trigger this effect and loop.
  useEffect(() => {
    const profilePhone = (user as any)?.backendProfile?.phone;
    if (profilePhone) setPhone(profilePhone);

    refreshRole().catch(() => { /* best-effort; AuthContext already warns */ });

    let cancelled = false;
    LandlordApplicationService.getMine()
      .then((apps) => {
        if (cancelled) return;
        const submitted = apps.find((a) => a.status === 'submitted') || null;
        const rejected = apps.find((a) => a.status === 'rejected') || null;
        setActiveApplication(submitted);
        if (!submitted && rejected) setLatestRejected(rejected);
      })
      .catch((err) => {
        // Best-effort — treat as "no active application" on failure.
        console.warn('[LandlordApplicationScreen] getMine failed:', err?.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.localId, refreshRole]);

  const toggleIntent = (opt: ListingTypeIntent) => {
    setIntents((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) {
        if (next.size > 1) next.delete(opt); // keep at least one selected
      } else {
        next.add(opt);
      }
      return next;
    });
  };

  const handlePickIdPhoto = useCallback(() => {
    if (!ImagePicker || !ImagePicker.launchImageLibrary) {
      Alert.alert(t('common.error'), t('landlordApp.imagePickerUnavailable'));
      return;
    }
    ImagePicker.launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, selectionLimit: 1, includeBase64: false },
      (response) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          Alert.alert(t('common.error'), response.errorMessage);
          return;
        }
        const asset = response.assets?.[0];
        if (asset?.uri) {
          setIdPhoto({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || `id-${Date.now()}.jpg`,
          });
        }
      }
    );
  }, [t]);

  const handleSubmit = async () => {
    if (!phone.trim()) {
      Alert.alert(t('common.error'), t('landlordApp.phoneRequired'));
      return;
    }
    if (intents.size === 0) {
      Alert.alert(t('common.error'), t('landlordApp.intentRequired'));
      return;
    }
    if (!idPhoto) {
      Alert.alert(t('common.error'), t('landlordApp.idPhotoRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const created = await LandlordApplicationService.submit({
        phone: phone.trim(),
        listingTypeIntents: Array.from(intents),
        applicantNote: applicantNote.trim() || undefined,
        idPhoto,
      });
      Alert.alert(t('landlordApp.submittedTitle'), t('landlordApp.submittedMessage'));
      onSubmitted?.();
      // Stay on screen, but flip to the pending state.
      setActiveApplication(created);
      setLatestRejected(null);
    } catch (error: any) {
      const code = error?.response?.data?.code;
      if (code === 'ACTIVE_APPLICATION_EXISTS') {
        Alert.alert(t('landlordApp.alreadyActiveTitle'), t('landlordApp.alreadyActiveMessage'));
        // Refresh state so the pending view appears.
        try {
          const apps = await LandlordApplicationService.getMine();
          const submitted = apps.find((a) => a.status === 'submitted') || null;
          if (submitted) setActiveApplication(submitted);
        } catch {/* ignore */}
      } else if (code === 'ALREADY_APPROVED') {
        Alert.alert(t('landlordApp.alreadyApprovedTitle'), t('landlordApp.alreadyApprovedMessage'));
        onBack();
      } else {
        Alert.alert(t('common.error'), error?.response?.data?.message || error?.message || t('landlordApp.submitFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = () => {
    if (!activeApplication) return;
    Alert.alert(
      t('landlordApp.withdrawConfirmTitle'),
      t('landlordApp.withdrawConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('landlordApp.withdrawAction'),
          style: 'destructive',
          onPress: async () => {
            setWithdrawing(true);
            try {
              await LandlordApplicationService.withdraw(activeApplication._id);
              setActiveApplication(null);
              onSubmitted?.(); // notify parent (banner state will refresh)
              Alert.alert(t('landlordApp.withdrawnToastTitle'), t('landlordApp.withdrawnToastMessage'));
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.response?.data?.message || error?.message || t('landlordApp.withdrawFailed'));
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  const Header = (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.iconButton} accessibilityLabel={t('common.back')}>
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{t('landlordApp.title')}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        {Header}
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Approved state ----------
  // Short-circuits the form/rejection branches so this screen can never contradict
  // the Profile banner. Both views must derive the "approved" verdict from the same
  // canListProperties bit on backendProfile.
  const isApproved = (user as any)?.backendProfile?.canListProperties === true;
  if (isApproved) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        {Header}
        <View style={styles.scrollContent}>
          <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statusHeaderRow}>
              <Check size={20} color="#059669" />
              <Text style={[styles.statusTitle, { color: colors.text }]}>{t('landlordApp.alreadyApprovedTitle')}</Text>
            </View>
            <Text style={[styles.statusBody, { color: colors.textSecondary }]}>
              {t('landlordApp.alreadyApprovedMessage')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={onBack}
          >
            <Text style={[styles.submitBtnText, { color: submitTextColor }]}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Pending-review state ----------
  if (activeApplication) {
    const submittedDate = new Date(activeApplication.submittedAt).toLocaleDateString();
    const intentsLabel = activeApplication.listingTypeIntents
      ?.map((i) => t(`landlordApp.intent.${i}` as any))
      .join(', ');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        {Header}
        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statusHeaderRow}>
              <Clock size={20} color="#D97706" />
              <Text style={[styles.statusTitle, { color: colors.text }]}>{t('landlordApp.pendingTitle')}</Text>
            </View>
            <Text style={[styles.statusBody, { color: colors.textSecondary }]}>
              {t('landlordApp.pendingMessage', { date: submittedDate })}
            </Text>

            <View style={styles.statusDivider} />

            <View style={styles.statusRow}>
              <Text style={[styles.statusRowLabel, { color: colors.textSecondary }]}>{t('landlordApp.phoneLabel')}</Text>
              <Text style={[styles.statusRowValue, { color: colors.text }]}>{activeApplication.phone}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.statusRowLabel, { color: colors.textSecondary }]}>{t('landlordApp.intentLabel')}</Text>
              <Text style={[styles.statusRowValue, { color: colors.text }]}>{intentsLabel}</Text>
            </View>
            {activeApplication.applicantNote ? (
              <View style={styles.statusRow}>
                <Text style={[styles.statusRowLabel, { color: colors.textSecondary }]}>{t('landlordApp.noteLabel')}</Text>
                <Text style={[styles.statusRowValue, { color: colors.text }]} numberOfLines={4}>
                  {activeApplication.applicantNote}
                </Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.withdrawBtn, { borderColor: colors.border, opacity: withdrawing ? 0.6 : 1 }]}
            onPress={handleWithdraw}
            disabled={withdrawing}
          >
            {withdrawing ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.withdrawBtnText}>{t('landlordApp.withdrawAction')}</Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  // ---------- Form state (none / rejected / withdrawn) ----------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {Header}

      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>{t('landlordApp.intro')}</Text>

        {latestRejected && (
          <View style={[styles.rejectedBanner, { backgroundColor: colors.surface, borderColor: '#DC2626' }]}>
            <Text style={[styles.rejectedTitle, { color: '#DC2626' }]}>
              {t('landlordApp.rejectedBannerTitle')}
            </Text>
            <Text style={[styles.rejectedBody, { color: colors.text }]}>
              {t(`landlordApp.rejectReason.${latestRejected.rejectionReasonCode || 'other'}` as any)}
              {latestRejected.rejectionReasonNote ? ` — ${latestRejected.rejectionReasonNote}` : ''}
            </Text>
          </View>
        )}

        {/* Phone */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>{t('landlordApp.phoneLabel')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder={t('landlordApp.phonePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {/* ID photo */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>{t('landlordApp.idPhotoLabel')}</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>{t('landlordApp.idPhotoHelper')}</Text>
          {idPhoto ? (
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: idPhoto.uri }} style={styles.photoPreview} />
              <TouchableOpacity
                style={[styles.replacePhotoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handlePickIdPhoto}
              >
                <Camera size={16} color={colors.text} />
                <Text style={[styles.replacePhotoText, { color: colors.text }]}>{t('landlordApp.replacePhoto')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handlePickIdPhoto}
            >
              <Upload size={20} color={colors.text} />
              <Text style={[styles.uploadButtonText, { color: colors.text }]}>{t('landlordApp.uploadPhoto')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Listing type intent — multi-select */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>{t('landlordApp.intentLabel')}</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>{t('landlordApp.intentHelper')}</Text>
          <View style={styles.intentGroup}>
            {INTENT_OPTIONS.map((opt) => {
              const selected = intents.has(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.intentRow,
                    { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
                  ]}
                  onPress={() => toggleIntent(opt)}
                >
                  <View style={[
                    styles.checkboxBox,
                    { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' },
                  ]}>
                    {selected && <Check size={14} color={isDark ? '#121212' : '#FFFFFF'} />}
                  </View>
                  <Text style={[styles.intentText, { color: colors.text }]}>{t(`landlordApp.intent.${opt}` as any)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Applicant note (optional) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>{t('landlordApp.noteLabel')}</Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder={t('landlordApp.notePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            value={applicantNote}
            onChangeText={setApplicantNote}
          />
        </View>

        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>{t('landlordApp.disclaimer')}</Text>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={submitTextColor} />
          ) : (
            <Text style={[styles.submitBtnText, { color: submitTextColor }]}>{t('landlordApp.submit')}</Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  section: { marginBottom: 22 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  helper: { fontSize: 12, marginBottom: 8, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 24,
    gap: 10,
  },
  uploadButtonText: { fontSize: 14, fontWeight: '600' },
  photoPreviewWrapper: { gap: 10 },
  photoPreview: { width: '100%', height: 220, borderRadius: 10, resizeMode: 'cover' },
  replacePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  replacePhotoText: { fontSize: 13, fontWeight: '600' },
  intentGroup: { gap: 8 },
  intentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 10,
    gap: 12,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentText: { fontSize: 15, flex: 1 },
  disclaimer: { fontSize: 12, lineHeight: 18, marginBottom: 20 },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
  // Pending status
  statusCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  statusHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusTitle: { fontSize: 17, fontWeight: '700' },
  statusBody: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  statusDivider: { height: 1, backgroundColor: 'rgba(127,127,127,0.18)', marginBottom: 12 },
  statusRow: { flexDirection: 'row', marginBottom: 8 },
  statusRowLabel: { fontSize: 13, width: 110 },
  statusRowValue: { fontSize: 14, flex: 1 },
  withdrawBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
  // Rejection banner (above re-apply form)
  rejectedBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  rejectedTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  rejectedBody: { fontSize: 13, lineHeight: 18 },
});
