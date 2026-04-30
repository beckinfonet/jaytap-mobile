import React, { useState, useEffect } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../locales';

/**
 * RoleRefreshBanner (Phase 1 ROLE-10 / D-13)
 *
 * Sticky top-of-app banner that appears when the user's `backendProfile.userType`
 * has changed since the last value the user acknowledged. Tapping the banner
 * optimistically dismisses it and triggers a confirming refreshRole() call.
 *
 * Mounted in App.tsx ABOVE the OVERLAY_FLAGS-driven hideMainStackUnderOverlay
 * view, so it persists across screen changes (D-13).
 *
 * --- Stale-closure dismiss bug fix (W2 regression note in 01-VALIDATION.md) ---
 *
 * The naive shape `onPress={async () => { await refreshRole(); setLastSeenRole(currentRole); }}`
 * captures `currentRole` from the pre-refresh closure. After refreshRole settles
 * and updates the AuthContext user, the closure's captured `currentRole` is
 * stale — `setLastSeenRole(currentRole)` writes the OLD role into lastSeenRole,
 * leaving the banner stuck visible.
 *
 * Fix: optimistic-dismiss + useEffect rebase. The tap handler immediately sets
 * `lastSeenRole = undefined`, which makes `showBanner` evaluate to false (the
 * truthiness guard hides the banner instantly). Then refreshRole runs, mutates
 * the auth context's user, and the useEffect below — watching currentRole +
 * lastSeenRole — rebases lastSeenRole to the latest currentRole when
 * lastSeenRole is undefined. Banner stays hidden. No stale closure.
 */
export const RoleRefreshBanner: React.FC = () => {
  const { user, refreshRole } = useAuth();
  const { colors } = useTheme();
  const { language } = useLanguage();

  const currentRole = user?.backendProfile?.userType;
  const [lastSeenRole, setLastSeenRole] = useState<string | undefined>(currentRole);

  // Rebase: when lastSeenRole is undefined (post-tap optimistic dismiss OR
  // initial mount before currentRole is hydrated) and currentRole becomes
  // available, catch up so the banner doesn't re-show.
  useEffect(() => {
    if (lastSeenRole === undefined && currentRole) {
      setLastSeenRole(currentRole);
    }
  }, [currentRole, lastSeenRole]);

  const showBanner = !!lastSeenRole && !!currentRole && lastSeenRole !== currentRole;
  if (!showBanner) return null;

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: colors.warning }]}
      onPress={async () => {
        // Optimistic dismiss FIRST — banner hides immediately because
        // showBanner requires lastSeenRole truthy. The useEffect above
        // rebases lastSeenRole to currentRole once refreshRole settles.
        setLastSeenRole(undefined);
        await refreshRole();
      }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t(language, 'auth.roleChanged.banner')}
    >
      <Text style={[styles.text, { color: colors.onWarning }]}>
        {t(language, 'auth.roleChanged.banner')}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
