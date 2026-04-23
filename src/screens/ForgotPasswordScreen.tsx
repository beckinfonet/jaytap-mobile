import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import type { TranslationKeys } from '../locales';
import { CheckCircle, Mail } from 'lucide-react-native';
import { AuthModalCloseButton } from '../components/AuthModalCloseButton';

type FirebaseRestError = { message?: string };
type TFn = (key: TranslationKeys, params?: Record<string, string>) => string;

function mapSendResetError(t: TFn, code: string): string {
  switch (code) {
    case 'EMAIL_NOT_FOUND':
      return t('auth.emailNotFound');
    case 'INVALID_EMAIL':
      return t('auth.invalidEmailFormat');
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return t('auth.tooManyResetRequests');
    default:
      return t('auth.resetRequestFailed');
  }
}

export const ForgotPasswordScreen = ({
  onClose,
  onBackToLogin,
  onOpenSetNewPassword,
}: {
  onClose?: () => void;
  onBackToLogin: () => void;
  onOpenSetNewPassword: () => void;
}) => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleReset = async () => {
    setErrorMessage('');
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage(t('auth.pleaseFillAllFields'));
      return;
    }

    setLoading(true);
    try {
      await AuthService.sendPasswordResetEmail(trimmed);
      setSent(true);
    } catch (error: unknown) {
      const err = error as FirebaseRestError;
      const code = typeof err?.message === 'string' ? err.message : '';
      setErrorMessage(mapSendResetError(t, code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.resetPasswordTitle')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {sent ? t('auth.resetEmailSent') : t('auth.resetPasswordDesc')}
          </Text>
        </View>

        <View style={styles.content}>
          {sent ? (
            <>
              <View style={styles.successIconWrap}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}22` }]}>
                  <CheckCircle size={40} color="#10B981" />
                </View>
              </View>
              <Text style={[styles.successBody, { color: colors.textSecondary }]}>{t('auth.resetEmailSentDesc')}</Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={onOpenSetNewPassword}
              >
                <Text style={[styles.buttonText, { color: isDark ? '#000' : '#FFF' }]}>{t('auth.setNewPasswordAction')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={onBackToLogin}>
                <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '600' }}>{t('auth.backToSignIn')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.mailIconWrap}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}22` }]}>
                  <Mail size={32} color={colors.primary} />
                </View>
              </View>

              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder={t('auth.email')}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={isDark ? '#000' : '#FFF'} />
                ) : (
                  <Text style={[styles.buttonText, { color: isDark ? '#000' : '#FFF' }]}>{t('auth.sendResetLink')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkButton} onPress={onBackToLogin}>
                <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '600' }}>{t('auth.backToSignIn')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  content: {
    gap: 4,
  },
  mailIconWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
});
