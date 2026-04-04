import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthModalCloseButton } from '../components/AuthModalCloseButton';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { PasswordTextInput } from '../components/PasswordTextInput';
import { passwordMeetsPolicy } from '../utils/passwordPolicy';

export const SignupScreen = ({ onNavigateToLogin, onClose }: { onNavigateToLogin: () => void; onClose?: () => void }) => {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignup = async () => {
    setErrorMessage('');
    if (!email || !password || !confirmPassword) {
      setErrorMessage(t('auth.pleaseFillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (!passwordMeetsPolicy(password)) {
      setErrorMessage(t('auth.passwordMinLength'));
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      // Close modal on successful signup
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      setErrorMessage(error.message || t('auth.signupFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.createAccountTitle')}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('auth.signUpToGetStarted')}</Text>
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
                borderColor:
                  password.length > 0 && !passwordMeetsPolicy(password)
                    ? colors.accent
                    : colors.border,
            }]}
            placeholder={t('auth.password')}
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            />
        </View>

        <PasswordRequirements password={password} />

        <View style={styles.inputContainer}>
            <PasswordTextInput
            style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                color: colors.text,
                borderColor: colors.border
            }]}
            placeholder={t('auth.confirmPassword')}
            placeholderTextColor={colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            />
        </View>

        <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]} 
            onPress={handleSignup} 
            disabled={loading}
        >
          {loading ? (
              <ActivityIndicator color={isDark ? '#000' : '#FFF'} />
          ) : (
              <Text style={[styles.buttonText, { color: isDark ? '#000' : '#FFF' }]}>{t('auth.signUp')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={onNavigateToLogin}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              {t('auth.alreadyHaveAccount')} <Text style={{ color: colors.accent, fontWeight: 'bold' }}>{t('auth.signIn')}</Text>
          </Text>
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

