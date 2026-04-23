import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthModalCloseButton } from '../components/AuthModalCloseButton';
import { PasswordTextInput } from '../components/PasswordTextInput';

export const LoginScreen = ({
  onNavigateToSignup,
  onNavigateToForgotPassword,
  onClose,
}: {
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  onClose?: () => void;
}) => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage(t('auth.pleaseFillAllFields'));
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Close modal on successful login
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      setErrorMessage(error.message || t('auth.loginFailed'));
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.welcomeBack')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('auth.signInToContinue')}</Text>
        </View>

        <View style={styles.content}>
          {errorMessage ? (
              <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
          ) : null}

          <View style={styles.inputContainer}>
              <TextInput
              style={[styles.input, {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border
              }]}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              />
          </View>

          <View style={styles.inputContainer}>
              <PasswordTextInput
              style={[styles.input, {
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border
              }]}
              placeholder={t('auth.password')}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              />
          </View>

          <TouchableOpacity style={styles.forgotRow} onPress={onNavigateToForgotPassword}>
            <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={loading}
          >
            {loading ? (
                <ActivityIndicator color={isDark ? '#000' : '#FFF'} />
            ) : (
                <Text style={[styles.buttonText, { color: isDark ? '#000' : '#FFF' }]}>{t('auth.signIn')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={onNavigateToSignup}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                {t('auth.dontHaveAccount')} <Text style={{ color: colors.accent, fontWeight: 'bold' }}>{t('auth.signUp')}</Text>
            </Text>
          </TouchableOpacity>
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
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  content: {
    gap: 16,
  },
  inputContainer: {
      marginBottom: 16,
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
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    fontSize: 14,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
});

