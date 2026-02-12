import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

export const SignupScreen = ({ onNavigateToLogin, onClose }: { onNavigateToLogin: () => void; onClose?: () => void }) => {
  const { signup } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignup = async () => {
    setErrorMessage('');
    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
        setErrorMessage('Password should be at least 6 characters');
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
      setErrorMessage(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
        </TouchableOpacity>
      )}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Sign up to get started</Text>
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
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            />
        </View>
        
        <View style={styles.inputContainer}>
            <TextInput
            style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                color: colors.text,
                borderColor: colors.border
            }]}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            />
        </View>

        <View style={styles.inputContainer}>
            <TextInput
            style={[styles.input, { 
                backgroundColor: colors.inputBackground, 
                color: colors.text,
                borderColor: colors.border
            }]}
            placeholder="Confirm Password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
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
              <Text style={[styles.buttonText, { color: isDark ? '#000' : '#FFF' }]}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={onNavigateToLogin}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Already have an account? <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Sign In</Text>
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
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
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

