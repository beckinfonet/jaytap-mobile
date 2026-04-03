import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import { parseOobCodeFromResetInput } from '../utils/parseOobCode';
import type { TranslationKeys } from '../locales';
import { KeyRound } from 'lucide-react-native';
import { AuthModalCloseButton } from '../components/AuthModalCloseButton';

type FirebaseRestError = { message?: string };
type TFn = (key: TranslationKeys, params?: Record<string, string>) => string;

function mapConfirmResetError(t: TFn, code: string): string {
  switch (code) {
    case 'INVALID_OOB_CODE':
    case 'EXPIRED_OOB_CODE':
      return t('auth.invalidOrExpiredReset');
    case 'WEAK_PASSWORD':
      return t('auth.passwordMinLength');
    default:
      return t('auth.resetConfirmFailed');
  }
}

export const ResetPasswordScreen = ({
  onClose,
  onBackToLogin,
  initialOobCode,
  onConsumedInitialOobCode,
}: {
  onClose?: () => void;
  onBackToLogin: () => void;
  initialOobCode?: string | null;
  onConsumedInitialOobCode?: () => void;
}) => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [linkOrCode, setLinkOrCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialOobCode) {
      setLinkOrCode(initialOobCode);
      onConsumedInitialOobCode?.();
    }
  }, [initialOobCode, onConsumedInitialOobCode]);

  const handleSave = async () => {
    setErrorMessage('');
    const oobCode = parseOobCodeFromResetInput(linkOrCode);
    if (!oobCode) {
      setErrorMessage(t('auth.couldNotParseResetLink'));
      return;
    }
    if (!password || !confirmPassword) {
      setErrorMessage(t('auth.pleaseFillAllFields'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordsDoNotMatch'));
      return;
    }
    if (password.length < 6) {
      setErrorMessage(t('auth.passwordMinLength'));
      return;
    }

    setLoading(true);
    try {
      await AuthService.confirmPasswordReset(oobCode, password);
      Alert.alert(t('auth.passwordChangedTitle'), t('auth.passwordChangedDesc'), [
        { text: t('auth.continueToSignIn'), onPress: onBackToLogin },
      ]);
    } catch (error: unknown) {
      const err = error as FirebaseRestError;
      const code = typeof err?.message === 'string' ? err.message : '';
      setErrorMessage(mapConfirmResetError(t, code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.setNewPasswordTitle')}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('auth.setNewPasswordDesc')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.keyIconWrap}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}22` }]}>
            <KeyRound size={30} color={colors.primary} />
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
              styles.linkInput,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={t('auth.resetLinkOrCodePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            value={linkOrCode}
            onChangeText={setLinkOrCode}
            editable={!loading}
          />
        </View>

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
            placeholder={t('auth.newPassword')}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
        </View>

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
            placeholder={t('auth.confirmPassword')}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={isDark ? '#000' : '#FFF'} />
          ) : (
            <Text style={[styles.buttonText, { color: isDark ? '#000' : '#FFF' }]}>{t('auth.saveNewPassword')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={onBackToLogin}>
          <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '600' }}>{t('auth.backToSignIn')}</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    gap: 0,
  },
  keyIconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 14,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  linkInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
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
    marginTop: 18,
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
