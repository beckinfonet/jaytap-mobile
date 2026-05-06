import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTheme } from '../theme/ThemeContext';
import { useRole } from '../hooks/useRole';
import { useLanguage } from '../context/LanguageContext';
import { PropertyService } from '../services/PropertyService';
import { Property } from '../types/Property';

/**
 * AdminVerificationScreen — admin-minimal screen to PATCH platform-verification
 * flags on an existing listing.
 *
 * Phase 2 / Plan 02-09 (FLOW-14 / D-22): extracted from the legacy
 * `CreateListingScreen.verificationOnly` branch ahead of the atomic deletion of
 * CreateListingScreen.tsx + the CreateListingForm/ barrel. The legacy branch
 * compiled inside the same file as the user-facing M1 form, which transitively
 * imported the doomed CreateListingForm barrel — collapsing the deletion would
 * have broken admin doc verification (PATCH /api/properties/:id/verifications).
 *
 * This screen owns ONLY the admin-only document-verification surface:
 *   - 3 boolean switches (ownership / owner identity / state-issued).
 *   - Hydrate from propertyToEdit.platformVerifications.
 *   - Submit via PropertyService.patchPlatformVerifications + role gate.
 *   - Cancel via onBack; success toast + onSuccess callback.
 *
 * No FormBag / no validators / no CreateListingForm imports — purely standalone.
 * Reuses existing i18n keys: `verification.*`, `createListing.cancel`,
 * `createListing.updateFailed`. No new locale keys are introduced.
 *
 * M4+ may revisit: a richer admin verification surface (history audit, optional
 * note text, multi-doc upload) could land here without dragging the user-facing
 * listing form back in.
 */
interface AdminVerificationScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  propertyToEdit?: Property;
  /**
   * Optional moderator-context for parity with the legacy callsite. Not used
   * for branching logic in this screen — the role gate (`editVerifications`)
   * is the single source of truth — but kept on the prop surface so App.tsx
   * can pass it without diverging from the older shape.
   */
  moderatorContext?: { editingOwnerUid: string; reason?: string; ownerEmail?: string };
}

export const AdminVerificationScreen: React.FC<AdminVerificationScreenProps> = ({
  onBack,
  onSuccess,
  propertyToEdit,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { can } = useRole();

  const [verifyOwnership, setVerifyOwnership] = useState(false);
  const [verifyOwnerId, setVerifyOwnerId] = useState(false);
  const [verifyStateDocs, setVerifyStateDocs] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hydrate from propertyToEdit on mount + whenever it changes (the underlying
  // property's flags may have been edited by a prior admin in the same session).
  useEffect(() => {
    const pv = propertyToEdit?.platformVerifications;
    setVerifyOwnership(!!pv?.ownershipDocuments);
    setVerifyOwnerId(!!pv?.ownerIdentityVerified);
    setVerifyStateDocs(!!pv?.stateIssuedDocumentsVerified);
  }, [propertyToEdit]);

  const verificationSwitchRow = (
    label: string,
    value: boolean,
    setVal: React.Dispatch<React.SetStateAction<boolean>>,
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingVertical: 4,
      }}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 15, paddingRight: 12, fontWeight: '500' }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={setVal}
        trackColor={{ false: '#767577', true: colors.accent }}
        thumbColor="#f4f3f4"
      />
    </View>
  );

  const handleSubmit = async () => {
    if (!propertyToEdit?.id || !can('editVerifications')) return;
    setLoading(true);
    try {
      await PropertyService.patchPlatformVerifications(propertyToEdit.id, {
        ownershipDocuments: verifyOwnership,
        ownerIdentityVerified: verifyOwnerId,
        stateIssuedDocumentsVerified: verifyStateDocs,
      });
      Alert.alert(t('common.success'), t('verification.saved'), [
        { text: t('common.ok'), onPress: onSuccess },
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      Alert.alert(t('common.error'), msg || t('createListing.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>{`← ${t('createListing.cancel')}`}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {t('verification.screenTitle')}
        </Text>
        <View style={{ width: 80 }} />
      </View>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 16 }]}>
          {propertyToEdit?.content?.title ? propertyToEdit.content.title : ''}
        </Text>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
          {t('verification.adminSectionTitle')}
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 20 }]}>
          {t('verification.adminSectionHint')}
        </Text>
        {verificationSwitchRow(t('verification.ownershipDocuments'), verifyOwnership, setVerifyOwnership)}
        {verificationSwitchRow(t('verification.ownerIdentity'), verifyOwnerId, setVerifyOwnerId)}
        {verificationSwitchRow(t('verification.stateIssued'), verifyStateDocs, setVerifyStateDocs)}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[styles.submitButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>
              {t('verification.save')}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
