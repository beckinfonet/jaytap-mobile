import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../locales';

/**
 * EmailVerifyBanner (quick task 260515-iqi)
 *
 * Soft, dismissible top-of-app bar shown while the signed-in user's email is
 * unverified. Deliberately NOT a hard gate — the user is already in the app;
 * existing unverified accounts keep working.
 *
 * Mounted in App.tsx directly next to <RoleRefreshBanner /> in the top-level
 * slot ABOVE hideMainStackUnderOverlay. NOT an OVERLAY_FLAG.
 *
 * Visual contract mirrors RoleRefreshBanner: a single compact bar in the
 * warning palette, theme-tokenized (zero hex literals — dark/light parity),
 * `t(language, 'key')` string form.
 *
 * Actions:
 *  - Resend: re-sends the Firebase verification email; shows inline feedback.
 *  - Recheck ("I've verified — refresh"): re-derives verification state via
 *    AuthContext.recheckEmailVerified — the `emailVerified` guard hides the
 *    banner once it resolves verified, so the user never gets stuck.
 *  - Dismiss "X": hides the banner for the rest of the session (local state).
 */
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

export const EmailVerifyBanner: React.FC = () => {
  const { user, emailVerified, resendVerificationEmail, recheckEmailVerified } = useAuth();
  const { colors } = useTheme();
  const { language } = useLanguage();

  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<SendStatus>('idle');

  // Soft, non-blocking: only show while signed in AND not verified AND not
  // dismissed for this session. `emailVerified === undefined` (unknown) is
  // treated as unverified so the banner surfaces until a recheck resolves it.
  if (!user || emailVerified === true || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setStatus('sending');
    try {
      await resendVerificationEmail();
      setStatus('sent');
    } catch (_e) {
      setStatus('error');
    }
  };

  const handleRecheck = async () => {
    // The `emailVerified` guard above hides the banner if this resolves verified.
    await recheckEmailVerified();
  };

  const feedback =
    status === 'sent'
      ? t(language, 'auth.verifyEmail.sent')
      : status === 'error'
      ? t(language, 'auth.verifyEmail.error')
      : null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning }]}>
      <Text style={[styles.message, { color: colors.onWarning }]}>
        {feedback ?? t(language, 'auth.verifyEmail.banner')}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleResend}
          disabled={status === 'sending'}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t(language, 'auth.verifyEmail.resend')}
        >
          <Text style={[styles.action, { color: colors.onWarning }]}>
            {t(language, 'auth.verifyEmail.resend')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleRecheck}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t(language, 'auth.verifyEmail.recheck')}
        >
          <Text style={[styles.action, { color: colors.onWarning }]}>
            {t(language, 'auth.verifyEmail.recheck')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t(language, 'common.dismiss')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.dismiss, { color: colors.onWarning }]}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  message: {
    flex: 1,
    minWidth: 140,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginLeft: 14,
  },
  dismiss: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 14,
    lineHeight: 20,
  },
});
