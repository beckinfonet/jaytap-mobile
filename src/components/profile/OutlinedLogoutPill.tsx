/**
 * OutlinedLogoutPill — calm outlined log-out pill (centered, neutral tones).
 *
 * Phase 16 Plan 16-01 (PROF-01/02 / D-02). Consumed by ProfileScreen footer
 * in BOTH user and admin layouts. Replaces today's full-width destructive-red
 * button per CONTEXT D-02 (reduces accidental-tap regret).
 *
 * Pattern source: src/screens/AccountSettingsScreen.tsx outlined-button pattern
 * (lines 222-236 cancel-style) adapted to:
 *   - alignSelf: 'center' (not full-width)
 *   - borderRadius: 999 (full pill)
 *   - background: transparent (not surface2)
 *   - foreground: colors.textSecondary (calm, NOT destructive red)
 *
 * When `loading=true`, swaps icon+text for ActivityIndicator and disables press.
 * No co-located test (≤30 LOC pure presentational); behavior verified by
 * ProfileScreen-handlers.test.tsx in Plan 16-02.
 */
import React from 'react';
import { Text, Pressable, ActivityIndicator } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface OutlinedLogoutPillProps {
  label: string;
  loading?: boolean;
  onPress: () => void;
  testID?: string;
}

const OutlinedLogoutPill: React.FC<OutlinedLogoutPillProps> = ({
  label,
  loading,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!loading, busy: !!loading }}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        alignSelf: 'center',
        marginTop: 4,
        paddingVertical: 12,
        paddingHorizontal: 22,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.hair2,
        backgroundColor: 'transparent',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors.textSecondary} size="small" />
      ) : (
        <>
          <LogOut size={17} color={colors.textSecondary} strokeWidth={1.75} />
          <Text style={{ color: colors.textSecondary, fontSize: 14.5, fontWeight: '600' }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};

export default OutlinedLogoutPill;
