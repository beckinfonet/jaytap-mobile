import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userEmail?: string;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onConfirm,
  userEmail,
}) => {
  const { colors, isDark } = useTheme();
  const [step, setStep] = useState<'warning' | 'confirmation'>('warning');
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setStep('warning');
    setConfirmationText('');
    onClose();
  };

  const handleWarningConfirm = () => {
    setStep('confirmation');
  };

  const handleFinalConfirm = async () => {
    if (confirmationText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Invalid Confirmation', 'Please type "DELETE" exactly to confirm.');
      return;
    }

    setLoading(true);
    try {
      await onConfirm();
      // onConfirm will handle navigation/logout, so we just close the modal
      handleClose();
    } catch (error: any) {
      console.error('Delete account error:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to delete account. Please try again or contact support.';
      Alert.alert(
        'Error',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const themeStyles = {
    background: isDark ? '#000000' : '#F2F2F7',
    surface: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#3C3C4399',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
    danger: '#FF453A',
    dangerLight: isDark ? '#FF453A33' : '#FF453A1A',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: themeStyles.surface }]}>
          {step === 'warning' ? (
            <>
              <Text style={[styles.title, { color: themeStyles.danger }]}>
                ⚠️ Delete Account
              </Text>
              <Text style={[styles.warningText, { color: themeStyles.text }]}>
                This action cannot be undone. Deleting your account will:
              </Text>
              <View style={styles.warningList}>
                <Text style={[styles.warningItem, { color: themeStyles.textSecondary }]}>
                  • Lock your account and sign you out immediately
                </Text>
                <Text style={[styles.warningItem, { color: themeStyles.textSecondary }]}>
                  • Delete your favorites and saved searches
                </Text>
                <Text style={[styles.warningItem, { color: themeStyles.textSecondary }]}>
                  • Deactivate your listings (they will no longer be visible)
                </Text>
                <Text style={[styles.warningItem, { color: themeStyles.textSecondary }]}>
                  • Delete your personal data from our systems
                </Text>
                <Text style={[styles.warningItem, { color: themeStyles.textSecondary }]}>
                  • We may retain limited records as required by law or to prevent fraud/abuse
                </Text>
              </View>
              <Text style={[styles.emailText, { color: themeStyles.text }]}>
                Account: {userEmail}
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: themeStyles.border }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.cancelButtonText, { color: themeStyles.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.warningButton, { backgroundColor: themeStyles.danger }]}
                  onPress={handleWarningConfirm}
                >
                  <Text style={styles.warningButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: themeStyles.danger }]}>
                Final Confirmation
              </Text>
              <Text style={[styles.confirmationText, { color: themeStyles.text }]}>
                To confirm account deletion, please type{' '}
                <Text style={{ fontWeight: '700', color: themeStyles.danger }}>DELETE</Text> below:
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeStyles.background,
                    borderColor: themeStyles.border,
                    color: themeStyles.text,
                  },
                ]}
                value={confirmationText}
                onChangeText={setConfirmationText}
                placeholder="Type DELETE to confirm"
                placeholderTextColor={themeStyles.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: themeStyles.border }]}
                  onPress={() => setStep('warning')}
                  disabled={loading}
                >
                  <Text style={[styles.cancelButtonText, { color: themeStyles.text }]}>
                    Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    {
                      backgroundColor: themeStyles.danger,
                      opacity: confirmationText.trim().toUpperCase() === 'DELETE' ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleFinalConfirm}
                  disabled={loading || confirmationText.trim().toUpperCase() !== 'DELETE'}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 22,
  },
  warningList: {
    marginBottom: 20,
    paddingLeft: 8,
  },
  warningItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  confirmationText: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  warningButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

