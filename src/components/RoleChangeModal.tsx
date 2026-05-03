// src/components/RoleChangeModal.tsx
// Phase 5 — Admin role-change modal (ADMIN-02 + D-05 + D-06 + D-07).
//
// Source pattern: fork of RejectListingModal.tsx with 6-8 edits per RESEARCH §Pattern 5
// (vs the canonical 4-edit fork in Phase 4's ArchiveListingModal). The extra edits are:
//   - chip set changes from REJECT_CODES to ROLE_TYPES
//   - reasonNote TextInput is dropped entirely
//   - currentRole prop drives the de-emphasized current chip (D-05)
//   - confirmStep state gates the 2-tap flow (D-06)
//   - inline error row maps backend envelope codes to localized copy (D-07 + D-11)
//   - submit button label switches from destructive 'Reject' to neutral 'Update Role'
//
// CRITICAL invariants (PATTERNS §2):
//   - Gated belongs to the entry-point (ProfileScreen) and overlay mount (App.tsx),
//     NOT inside the modal. The modal trusts the parent's gate.
//   - pendingRole state is INDEPENDENT of step (Pitfall 7): tapping the current-role
//     chip clears pendingRole and disables Submit; re-picking the same NEW chip
//     restores submit-ready state.
//   - Selected-chip text uses isDark ? '#121212' : '#FFFFFF' (verbatim from
//     RejectListingModal.tsx line 94 — Phase 4.5 → Phase 3 → Phase 5 inheritance).
//   - Submit button is disabled until pendingRole !== null && pendingRole !== currentRole.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { UserRole, AdminUserListItem } from '../services/UserService';

const ROLE_TYPES: UserRole[] = ['user', 'moderator', 'admin'];

export type RoleChangeErrorCode =
  | 'LAST_ADMIN_LOCKOUT'
  | 'SELF_MUTATION'
  | 'ROLE_ALREADY_CHANGED'
  | 'USER_NOT_FOUND'
  | 'NETWORK';

interface RoleChangeModalProps {
  user: AdminUserListItem | null;
  onClose: () => void;
  onSubmit: (params: { uid: string; userType: UserRole }) => Promise<void>;
  submitting?: boolean;
  errorCode?: RoleChangeErrorCode | null;
}

const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  user,
  onClose,
  onSubmit,
  submitting = false,
  errorCode = null,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  // Reset pendingRole when the target user changes (open or switch).
  // NOT keyed on errorCode — that would wipe the user's selection on a 409 retry.
  useEffect(() => {
    setPendingRole(null);
  }, [user?.uid]);

  if (!user) return null;

  const currentRole: UserRole = user.userType;
  const hasName = !!(user.firstName || user.lastName);
  const displayName = hasName
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : user.email;
  // WR-01: when there's no first/last name, displayName already equals email,
  // so the "{displayName} — {email}" template would render the email twice.
  // Show just the email in that case to avoid the duplication.
  const targetIdentity = hasName
    ? t('admin.roles.modal.targetIdentity', { displayName, email: user.email })
    : user.email;

  const isSubmitEnabled = pendingRole !== null && pendingRole !== currentRole && !submitting;

  const handleSubmit = async () => {
    if (!isSubmitEnabled || !pendingRole) return;
    await onSubmit({ uid: user.uid, userType: pendingRole });
  };

  const errorMessage = errorCode
    ? errorCode === 'NETWORK'
      ? t('admin.roles.error.network')
      : errorCode === 'SELF_MUTATION'
        ? t('admin.roles.error.selfMutation')
        : errorCode === 'ROLE_ALREADY_CHANGED'
          ? t('admin.roles.error.roleAlreadyChanged')
          : errorCode === 'USER_NOT_FOUND'
            ? t('admin.roles.error.userNotFound')
            : ''
    : '';

  return (
    <Modal visible={!!user} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollWrap}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('admin.roles.modal.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {targetIdentity}
            </Text>

            <View style={styles.codesGroup}>
              {ROLE_TYPES.map((role) => {
                const selected = pendingRole === role;
                const isCurrent = role === currentRole;
                const selectedTextColor = isDark ? '#121212' : '#FFFFFF';
                const labelKey = `admin.roles.label.${role}` as const;
                const baseLabel = t(labelKey);
                const label = isCurrent
                  ? `${baseLabel} ${t('admin.roles.currentSuffix')}`
                  : baseLabel;
                return (
                  <TouchableOpacity
                    key={role}
                    onPress={() => setPendingRole(selected ? null : role)}
                    disabled={submitting}
                    style={[
                      styles.codeChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.inputBackground,
                        borderColor: selected ? colors.primary : colors.border,
                        opacity: isCurrent && !selected ? 0.6 : 1.0,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.codeChipText,
                        { color: selected ? selectedTextColor : colors.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {pendingRole !== null && pendingRole !== currentRole && (
              <Text style={[styles.confirmPrompt, { color: colors.textSecondary }]}>
                {t('admin.roles.modal.confirmPrompt', {
                  displayName,
                  fromRole: t(`admin.roles.label.${currentRole}` as const),
                  toRole: t(`admin.roles.label.${pendingRole}` as const),
                })}
              </Text>
            )}

            {errorCode && errorMessage ? (
              <Text style={[styles.errorRow, { color: colors.error }]}>
                {errorMessage}
              </Text>
            ) : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.inputBackground }]}
                onPress={onClose}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    opacity: isSubmitEnabled ? 1 : 0.5,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!isSubmitEnabled}
                activeOpacity={0.7}
              >
                {submitting ? (
                  <ActivityIndicator color={isDark ? '#121212' : '#FFFFFF'} size="small" />
                ) : (
                  <Text style={[styles.buttonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>
                    {t('admin.roles.modal.submit')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  scrollWrap: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: 14, padding: 20 },
  title: { fontSize: 18, fontWeight: '600', lineHeight: 24, marginBottom: 8 },
  subtitle: { fontSize: 13, fontWeight: '400', lineHeight: 18, marginBottom: 16 },
  codesGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  codeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  codeChipText: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  confirmPrompt: { fontSize: 14, fontWeight: '400', lineHeight: 20, marginVertical: 16 },
  errorRow: { fontSize: 13, fontWeight: '400', lineHeight: 18, marginBottom: 12 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
});

export default RoleChangeModal;
