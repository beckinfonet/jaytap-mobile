// Read-only Applicant Profile screen reached by tapping the header row on
// LandlordApplicationQueueScreen's card. Pure presentation — receives the full
// LandlordApplication (with joined `applicant` block) via props and does not refetch.
// Approve / Reject actions delegate to handlers owned by the parent (App.tsx wires them).
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, MessageCircle, Send, Check, X, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LandlordApplication } from '../services/LandlordApplicationService';

interface ApplicantProfileScreenProps {
  application: LandlordApplication;
  onBack: () => void;
  onApprove: (app: LandlordApplication) => void;
  onReject: (app: LandlordApplication) => void;
}

function formatDate(iso: string | null | undefined, locale: 'en' | 'ru' = 'en'): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function safeOpen(url: string) {
  Linking.openURL(url).catch(() => {
    /* silent fallback — admin can tap a different channel */
  });
}

export const ApplicantProfileScreen: React.FC<ApplicantProfileScreenProps> = ({
  application,
  onBack,
  onApprove,
  onReject,
}) => {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();

  const a = application.applicant;
  const notProvided = t('applicantProfile.notProvided');

  const fullName =
    a && (a.firstName || a.lastName)
      ? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim()
      : notProvided;
  const email = a?.email ?? notProvided;
  const joined = a?.createdAt
    ? t('applicantProfile.joined', { date: formatDate(a.createdAt, language as 'en' | 'ru') })
    : '';
  const showAppPhone = !!application.phone && application.phone !== a?.profilePhone;
  const showIncompleteChip = a === null || a?.profileComplete === false;

  const renderContactRow = (
    key: 'profilePhone' | 'whatsapp' | 'telegram',
    Icon: typeof Phone,
    label: string,
    rawValue: string | null,
    onPress: (() => void) | null
  ) => {
    const tappable = !!rawValue && !!onPress;
    return (
      <TouchableOpacity
        key={key}
        testID={`contact-row-${key}`}
        style={[styles.contactRow, { borderBottomColor: colors.border }]}
        onPress={tappable ? onPress! : undefined}
        disabled={!tappable}
        activeOpacity={tappable ? 0.6 : 1}
      >
        <Icon size={18} color={tappable ? colors.text : colors.textSecondary} />
        <View style={styles.contactRowText}>
          <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.contactValue, { color: tappable ? colors.text : colors.textSecondary }]}>
            {rawValue ?? notProvided}
          </Text>
        </View>
        {tappable && <ExternalLink size={16} color={colors.accent} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton} accessibilityRole="button">
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('applicantProfile.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Identity header */}
        <View style={styles.identityBlock}>
          <Text style={[styles.fullName, { color: colors.text }]}>{fullName}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
          {!!joined && <Text style={[styles.joined, { color: colors.textSecondary }]}>{joined}</Text>}
          {showIncompleteChip && (
            <View style={[styles.chip, { borderColor: colors.warning }]}>
              <Text style={[styles.chipText, { color: colors.text }]}>
                {t('applicantProfile.profileIncomplete')}
              </Text>
            </View>
          )}
        </View>

        {/* Contact section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('applicantProfile.contact')}
        </Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {renderContactRow(
            'profilePhone',
            Phone,
            t('applicantProfile.profilePhone'),
            a?.profilePhone ?? null,
            a?.profilePhone ? () => safeOpen(`tel:${a.profilePhone}`) : null
          )}
          {renderContactRow(
            'whatsapp',
            MessageCircle,
            t('applicantProfile.whatsapp'),
            a?.whatsapp ?? null,
            a?.whatsapp ? () => safeOpen(`https://wa.me/${digitsOnly(a.whatsapp!)}`) : null
          )}
          {renderContactRow(
            'telegram',
            Send,
            t('applicantProfile.telegram'),
            a?.telegram ?? null,
            a?.telegram ? () => safeOpen(`https://t.me/${a.telegram!.replace(/^@/, '')}`) : null
          )}
        </View>

        {/* Application section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('applicantProfile.application')}
        </Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {showAppPhone && (
            <View style={[styles.applicationRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.applicationLabel, { color: colors.textSecondary }]}>
                {t('applicantProfile.appPhone')}
              </Text>
              <Text style={[styles.applicationValue, { color: colors.text }]}>{application.phone}</Text>
            </View>
          )}
          <View style={[styles.applicationRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.applicationLabel, { color: colors.textSecondary }]}>
              {t('applicantProfile.intent')}
            </Text>
            <Text style={[styles.applicationValue, { color: colors.text }]}>
              {(application.listingTypeIntents || []).map((i) => t(`landlordApp.intent.${i}` as any)).join(', ')}
            </Text>
          </View>
          <Image source={{ uri: application.idPhotoUrl }} style={styles.idPhoto} resizeMode="cover" />
          {!!application.applicantNote && (
            <View style={styles.noteBlock}>
              <Text style={[styles.applicationLabel, { color: colors.textSecondary }]}>
                {t('landlordApp.noteLabel')}
              </Text>
              <Text style={[styles.noteText, { color: colors.text }]}>{application.applicantNote}</Text>
            </View>
          )}
          <Text style={[styles.submittedAt, { color: colors.textSecondary }]}>
            {t('applicantProfile.submittedAt', { date: formatDate(application.submittedAt, language as 'en' | 'ru') })}
          </Text>
        </View>

        {/* Action footer */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onReject(application)}
            accessibilityRole="button"
          >
            <X size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>{t('landlordApp.reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onApprove(application)}
            accessibilityRole="button"
          >
            <Check size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>{t('landlordApp.approve')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  identityBlock: { marginBottom: 20 },
  fullName: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 14, marginTop: 4 },
  joined: { fontSize: 12, marginTop: 4 },
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  contactRowText: { flex: 1 },
  contactLabel: { fontSize: 12 },
  contactValue: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  applicationRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  applicationLabel: { fontSize: 13, width: 130 },
  applicationValue: { fontSize: 14, flex: 1 },
  idPhoto: { width: '100%', height: 220 },
  noteBlock: { padding: 14 },
  noteText: { fontSize: 14, marginTop: 4, lineHeight: 19 },
  submittedAt: { fontSize: 12, padding: 14 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  approveBtn: { backgroundColor: '#059669' },
  rejectBtn: { backgroundColor: '#DC2626' },
});
