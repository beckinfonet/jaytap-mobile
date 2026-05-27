/**
 * HardDeleteConfirmModal — admin-only destructive confirm gate.
 *
 * Pre-condition: parent only opens this modal when listing.status === 'archived'.
 * AdminListingMenu gates this at the kebab level; PropertyDetailsScreen's
 * isHardDeleteModalOpen state is the local gate. Defense-in-depth: the
 * "Delete forever" button below stays disabled until the user types the
 * literal string "DELETE" (case-sensitive) in the input.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface HardDeleteConfirmModalProps {
  visible: boolean;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const REQUIRED_PHRASE = 'DELETE';

export const HardDeleteConfirmModal: React.FC<HardDeleteConfirmModalProps> = ({
  visible,
  submitting = false,
  onClose,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (visible) setTyped('');
  }, [visible]);

  const enabled = !submitting && typed === REQUIRED_PHRASE;

  const handleClose = () => {
    if (!submitting) onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.error }]}>
            {t('adminListing.delete.title')}
          </Text>
          <Text style={[styles.body, { color: colors.text }]}>
            {t('adminListing.delete.body')}
          </Text>

          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder={t('adminListing.delete.inputPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            editable={!submitting}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: typed && typed !== REQUIRED_PHRASE ? colors.error : colors.border,
                backgroundColor: colors.inputBackground,
              },
            ]}
            accessibilityLabel={t('adminListing.delete.inputPlaceholder')}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={submitting}
              style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: colors.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={enabled ? onConfirm : undefined}
              disabled={!enabled}
              style={[
                styles.btn,
                {
                  backgroundColor: enabled ? colors.error : colors.border,
                  opacity: enabled ? 1 : 0.6,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !enabled }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={[styles.btnText, { color: colors.onAccent }]}>
                  {t('adminListing.delete.confirm')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
    alignItems: 'center',
  },
  btnSecondary: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
